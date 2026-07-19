import { createClient } from '../supabase/client';

const supabase = createClient();

export interface EnseignantDB {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  sexe: 'M' | 'F';
  telephone: string;
  email: string;
  matiere_principale: string;
  salaire_mensuel: number;
  date_embauche: string;
  statut: 'actif' | 'en_conge' | 'quitte';
  type_contrat?: string;
  categorie?: string;
}

/**
 * Crée un enseignant + son dossier RH (membres_personnel) + le mouvement de
 * personnel (embauche) associé, dans une seule transaction côté serveur
 * (voir supabase/migrations/20260720120000_*). Le matricule est généré
 * côté serveur avec vérification d'unicité par établissement.
 */
export async function createEnseignantWithPersonnel(params: {
  etablissementId: string;
  nom: string;
  prenom: string;
  sexe: 'M' | 'F';
  telephone?: string | null;
  email?: string | null;
  matierePrincipale?: string | null;
  salaireMensuel?: number;
  statut?: string;
  typeContrat?: string;
  categorie?: string;
  dateEmbauche?: string;
}): Promise<EnseignantDB> {
  const { data, error } = await supabase.rpc('create_enseignant_with_personnel', {
    p_etablissement_id: params.etablissementId,
    p_nom: params.nom,
    p_prenom: params.prenom,
    p_sexe: params.sexe,
    p_telephone: params.telephone ?? null,
    p_email: params.email ?? null,
    p_matiere_principale: params.matierePrincipale ?? null,
    p_salaire_mensuel: params.salaireMensuel ?? 0,
    p_statut: params.statut ?? 'actif',
    p_type_contrat: params.typeContrat ?? 'CDI',
    p_categorie: params.categorie ?? 'Enseignant',
    p_date_embauche: params.dateEmbauche ?? new Date().toISOString().split('T')[0],
  });

  if (error) throw error;
  return data as EnseignantDB;
}
