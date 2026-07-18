import { captureError, captureMessage } from '@/lib/observability/logger';
import { createClient } from '../supabase/client';
import { computeWeightedAverage, getMention, computeRanks } from './calculations';

const supabase = createClient();

export interface StudentReport {
  eleveId: string;
  classeId: string;
  trimestre: string;
  anneeScolaireId: string;
  moyenneGenerale: number;
  totalPoints: number;
  totalCoefficients: number;
  rang: number;
  mention: string;
  notesParMatiere: {
    matiereId: string;
    nomMatiere: string;
    note: number;
    bareme: number;
    coefficient: number;
    noteSur20: number;
  }[];
}

/**
 * Calcule le bulletin d'un élève pour un trimestre donné.
 */
export async function computeStudentReport(
  eleveId: string,
  classeId: string,
  anneeScolaireId: string,
  trimestre: string
): Promise<StudentReport | null> {
  // 1. Récupérer tous les élèves de la classe
  const { data: students, error: studentsError } = await supabase
    .from('eleves')
    .select('id, nom, prenom')
    .eq('classe_id', classeId);

  if (studentsError || !students || students.length === 0) {
    captureError(studentsError, { context: '[Stats Eleves] Error fetching students:' });
    return null;
  }

  // 2. Récupérer les matières du niveau de la classe
  // Pour cela, on a d'abord besoin du niveau_id de la classe
  const { data: classObj } = await supabase
    .from('classes')
    .select('niveau_id')
    .eq('id', classeId)
    .single();

  if (!classObj) return null;

  const { data: matieres } = await supabase
    .from('matieres')
    .select('*')
    .eq('niveau_id', classObj.niveau_id);

  if (!matieres || matieres.length === 0) return null;

  // 3. Récupérer toutes les notes de la classe pour ce trimestre et cette année
  const { data: allNotes } = await supabase
    .from('notes')
    .select('*')
    .in('eleve_id', students.map(s => s.id))
    .eq('trimestre', trimestre);

  if (!allNotes) return null;

  // 4. Calculer la moyenne générale pour CHAQUE élève de la classe pour établir le rang
  const studentsAverages = students.map(student => {
    const studentNotes = allNotes.filter(n => n.eleve_id === student.id);
    
    const grades = studentNotes.map(n => {
      const mat = matieres.find(m => m.id === n.matiere_id);
      return {
        note: Number(n.note),
        bareme: mat ? Number(mat.bareme) : 20,
        coefficient: mat ? Number(mat.coefficient) : 1
      };
    });

    const { average } = computeWeightedAverage(grades);
    return { id: student.id, average };
  });

  // Calculer les rangs de la classe
  const ranksMap = computeRanks(studentsAverages);

  // 5. Calculer le détail du bulletin de l'élève ciblé
  const targetStudentNotes = allNotes.filter(n => n.eleve_id === eleveId);
  const notesParMatiere = targetStudentNotes.map(n => {
    const mat = matieres.find(m => m.id === n.matiere_id);
    const bareme = mat ? Number(mat.bareme) : 20;
    return {
      matiereId: n.matiere_id,
      nomMatiere: mat ? mat.nom : 'Matière Inconnue',
      note: Number(n.note),
      bareme,
      coefficient: mat ? Number(mat.coefficient) : 1,
      noteSur20: parseFloat(((Number(n.note) / bareme) * 20).toFixed(2))
    };
  });

  const targetGrades = notesParMatiere.map(n => ({
    note: n.note,
    bareme: n.bareme,
    coefficient: n.coefficient
  }));

  const { average: moyenneGenerale, totalPoints, totalCoefficients } = computeWeightedAverage(targetGrades);

  return {
    eleveId,
    classeId,
    trimestre,
    anneeScolaireId,
    moyenneGenerale,
    totalPoints,
    totalCoefficients,
    rang: ranksMap[eleveId] || 0,
    mention: getMention(moyenneGenerale),
    notesParMatiere
  };
}
