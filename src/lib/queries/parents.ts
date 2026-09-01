import { createClient } from '../supabase/client';

const supabase = createClient();

export interface ParentListItem {
  id: string;
  nom: string;
  telephone: string;
  email: string;
  enfants: any[];
}

/**
 * Liste des parents dédupliqués depuis les élèves, calculée en base — évite
 * de charger tous les élèves de l'établissement juste pour les regrouper par
 * parent côté navigateur.
 */
export async function getParentsList(
  etablissementId: string,
  anneeScolaireId?: string | null
): Promise<ParentListItem[]> {
  const { data, error } = await supabase.rpc('get_parents_list', {
    p_etablissement_id: etablissementId,
    p_annee_scolaire_id: anneeScolaireId ?? null,
  });
  if (error) throw error;
  return ((data as Record<string, unknown>[]) ?? []).map((row) => ({
    id: row.parent_key as string,
    nom: row.nom as string,
    telephone: row.telephone as string,
    email: row.email as string,
    enfants: (row.enfants as any[]) ?? [],
  }));
}
