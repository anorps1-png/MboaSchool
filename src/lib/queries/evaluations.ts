import { createClient } from '../supabase/client';

const supabase = createClient();

export interface ClassRanking {
  eleve_id: string;
  nom: string;
  prenom: string;
  matricule: string;
  moyenne: number;
  total_points: number;
  rang: number | null;
  mention: string;
  effectif: number;
}

/**
 * Classement d'une classe pour un trimestre : moyenne, rang, mention par élève,
 * calculés en base (agrégat SQL) plutôt que côté navigateur sur toutes les notes.
 * La sémantique reproduit fidèlement le calcul des pages d'évaluation.
 */
export async function getClassRankings(
  classeId: string,
  trimestre: string
): Promise<ClassRanking[]> {
  const { data, error } = await supabase.rpc('get_class_rankings', {
    p_classe_id: classeId,
    p_trimestre: trimestre,
  });
  if (error) throw error;
  return (data as ClassRanking[]) ?? [];
}

/**
 * Moyenne générale de l'établissement (moyenne des moyennes pondérées par
 * élève, élèves sans note exclus). p_trimestre optionnel : NULL agrège toutes
 * les notes, quel que soit le trimestre. Retourne null si aucun élève n'a de note.
 */
export async function getMoyenneGenerale(
  etablissementId: string,
  trimestre?: string | null
): Promise<number | null> {
  const { data, error } = await supabase.rpc('get_moyenne_generale', {
    p_etablissement_id: etablissementId,
    p_trimestre: trimestre ?? null,
  });
  if (error) throw error;
  return data === null || data === undefined ? null : Number(data);
}
