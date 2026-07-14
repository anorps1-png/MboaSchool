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
