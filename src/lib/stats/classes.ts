import { createClient } from '../supabase/client';
import { computeWeightedAverage, computeQuartiles } from './calculations';

const supabase = createClient();

export interface ClassStats {
  classeId: string;
  trimestre: string;
  effectifTotal: number;
  moyenneClasse: number;
  tauxReussite: number;
  minMoyenne: number;
  maxMoyenne: number;
  quartiles: {
    q1: number;
    median: number;
    q3: number;
  };
  elevesFragiles: string[]; // IDs des élèves avec moyenne < seuil
  elevesExcellents: string[]; // IDs des élèves dans le quartile supérieur (>= q3)
}

/**
 * Calcule les statistiques d'une classe pour un trimestre donné.
 */
export async function computeClassStats(
  classeId: string,
  anneeScolaireId: string,
  trimestre: string
): Promise<ClassStats | null> {
  // 1. Récupérer l'établissement pour avoir le seuil de réussite
  // On récupère d'abord l'établissement lié à cette classe via le niveau -> section -> etablissement
  const { data: classObj } = await supabase
    .from('classes')
    .select(`
      id,
      niveau_id,
      niveau:niveaux_classes(
        section:sections(
          etablissement:etablissements(seuil_reussite)
        )
      )
    `)
    .eq('id', classeId)
    .single();

  const rawSeuil = (classObj as any)?.niveau?.section?.etablissement?.seuil_reussite;
  const seuilReussite = rawSeuil ? Number(rawSeuil) : 10;

  // 2. Récupérer les élèves de la classe
  const { data: students, error: studentsError } = await supabase
    .from('eleves')
    .select('id, nom, prenom')
    .eq('classe_id', classeId);

  if (studentsError || !students || students.length === 0) {
    return {
      classeId,
      trimestre,
      effectifTotal: 0,
      moyenneClasse: 0,
      tauxReussite: 0,
      minMoyenne: 0,
      maxMoyenne: 0,
      quartiles: { q1: 0, median: 0, q3: 0 },
      elevesFragiles: [],
      elevesExcellents: []
    };
  }

  if (!classObj) {
    return null;
  }

  // 3. Récupérer les matières
  const { data: matieres } = await supabase
    .from('matieres')
    .select('*')
    .eq('niveau_id', classObj.niveau_id);

  if (!matieres || matieres.length === 0) {
    return null;
  }

  // 4. Récupérer les notes de tous les élèves de la classe
  const { data: allNotes } = await supabase
    .from('notes')
    .select('*')
    .in('eleve_id', students.map(s => s.id))
    .eq('trimestre', trimestre);

  if (!allNotes) return null;

  // 5. Calculer la moyenne générale pour CHAQUE élève
  const averagesList: number[] = [];
  const studentsAveragesMap: { id: string; name: string; average: number }[] = [];

  students.forEach(student => {
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
    averagesList.push(average);
    studentsAveragesMap.push({
      id: student.id,
      name: `${student.nom} ${student.prenom}`,
      average
    });
  });

  // Calculs collectifs
  const count = averagesList.length;
  const sum = averagesList.reduce((s, val) => s + val, 0);
  const moyenneClasse = count > 0 ? parseFloat((sum / count).toFixed(2)) : 0;

  const passedCount = averagesList.filter(avg => avg >= seuilReussite).length;
  const tauxReussite = count > 0 ? parseFloat(((passedCount / count) * 100).toFixed(1)) : 0;

  const quartilesResult = computeQuartiles(averagesList);

  const elevesFragiles = studentsAveragesMap
    .filter(s => s.average < seuilReussite)
    .map(s => s.id);

  const elevesExcellents = studentsAveragesMap
    .filter(s => s.average >= quartilesResult.q3 && s.average > 0)
    .map(s => s.id);

  return {
    classeId,
    trimestre,
    effectifTotal: count,
    moyenneClasse,
    tauxReussite,
    minMoyenne: quartilesResult.min,
    maxMoyenne: quartilesResult.max,
    quartiles: {
      q1: quartilesResult.q1,
      median: quartilesResult.median,
      q3: quartilesResult.q3
    },
    elevesFragiles,
    elevesExcellents
  };
}
