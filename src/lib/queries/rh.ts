import { createClient } from '../supabase/client';

const supabase = createClient();

export async function getPersonnel(etablissementId: string) {
  const { data, error } = await supabase
    .from('membres_personnel')
    .select('*')
    .eq('etablissement_id', etablissementId)
    .order('nom', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getAbsences(etablissementId: string, dateFrom?: string | null, dateTo?: string | null) {
  let query = supabase
    .from('absences_personnel')
    .select('*')
    .eq('etablissement_id', etablissementId);

  if (dateFrom) query = query.gte('date_debut', dateFrom);
  if (dateTo) query = query.lte('date_debut', dateTo);

  const { data, error } = await query.order('date_debut', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getMouvements(etablissementId: string, dateFrom?: string | null, dateTo?: string | null) {
  let query = supabase
    .from('mouvements_personnel')
    .select('*')
    .eq('etablissement_id', etablissementId);

  if (dateFrom) query = query.gte('date', dateFrom);
  if (dateTo) query = query.lte('date', dateTo);

  const { data, error } = await query.order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getEvaluationsRH(etablissementId: string, dateFrom?: string | null, dateTo?: string | null) {
  let query = supabase
    .from('evaluations_rh')
    .select('*')
    .eq('etablissement_id', etablissementId);

  if (dateFrom) query = query.gte('date_evaluation', dateFrom);
  if (dateTo) query = query.lte('date_evaluation', dateTo);

  const { data, error } = await query.order('date_evaluation', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updatePersonnel(id: string, data: Record<string, any>) {
  const { data: updated, error } = await supabase
    .from('membres_personnel')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updated;
}

export async function insertAbsence(data: Record<string, any>, etablissementId: string) {
  const { data: inserted, error } = await supabase
    .from('absences_personnel')
    .insert([{ ...data, etablissement_id: etablissementId }])
    .select();

  if (error) throw error;
  return inserted;
}

export async function insertMouvement(data: Record<string, any>, etablissementId: string) {
  const { data: inserted, error } = await supabase
    .from('mouvements_personnel')
    .insert([{ ...data, etablissement_id: etablissementId }])
    .select();

  if (error) throw error;
  return inserted;
}

export async function insertPersonnel(data: Record<string, any>, etablissementId: string) {
  const { data: inserted, error } = await supabase
    .from('membres_personnel')
    .insert([{ ...data, etablissement_id: etablissementId }])
    .select()
    .single();

  if (error) throw error;
  return inserted;
}

export async function getFormations(etablissementId: string, dateFrom?: string | null, dateTo?: string | null) {
  let query = supabase
    .from('formations_rh')
    .select('*, formations_beneficiaires(*)')
    .eq('etablissement_id', etablissementId)
    .limit(500);

  if (dateFrom) query = query.gte('date_debut', dateFrom);
  if (dateTo) query = query.lte('date_debut', dateTo);

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

// ============================================================
// FICHES DE PAIE (Bulletins de paie)
// ============================================================

export async function getFichesDePaie(etablissementId: string, periode?: string) {
  let query = supabase
    .from('fiches_de_paie')
    .select('*')
    .eq('etablissement_id', etablissementId)
    .order('date_paiement', { ascending: false });

  if (periode) {
    query = query.eq('periode', periode);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function insertFichesDePaie(fiches: Record<string, any>[], etablissementId: string) {
  const fichesWithEtab = fiches.map(f => ({ ...f, etablissement_id: etablissementId }));

  // Insert strict (pas upsert) : chaque fiche de paie payée est censée être
  // une création unique par (personnel_id, periode). Un upsert masquerait
  // une double validation concurrente en écrasant silencieusement la fiche
  // existante ; l'insert laisse la contrainte UNIQUE(personnel_id, periode)
  // rejeter la deuxième tentative (erreur Postgres 23505) au lieu de la
  // fusionner, ce que l'appelant peut détecter pour afficher un message
  // « déjà payé » fiable même en cas de course entre deux sessions.
  const { data, error } = await supabase
    .from('fiches_de_paie')
    .insert(fichesWithEtab)
    .select();

  if (error) throw error;
  return data || [];
}

export async function updateFichesDePaieStatut(ids: string[], statut: string) {
  const { data, error } = await supabase
    .from('fiches_de_paie')
    .update({ statut })
    .in('id', ids)
    .select();

  if (error) throw error;
  return data || [];
}

export interface MasseSalarialeHistoriquePoint {
  periode: string;
  valeurTotal: number;
  nombreSalaries: number;
  salaireMoyen: number;
  tauxCroissance: number | null;
}

/**
 * Historique mensuel de la masse salariale, calculé à partir des fiches de
 * paie réellement validées ou payées (statut brouillon exclu). Retourne un
 * tableau vide si aucun mois n'a encore de paie validée.
 */
export async function getMasseSalarialeHistorique(
  etablissementId: string,
  months = 6
): Promise<MasseSalarialeHistoriquePoint[]> {
  const { data, error } = await supabase.rpc('get_masse_salariale_historique', {
    p_etablissement_id: etablissementId,
    p_months: months,
  });
  if (error) throw error;
  return ((data as Record<string, unknown>[]) ?? []).map((row) => ({
    periode: row.periode as string,
    valeurTotal: Number(row.valeur_total),
    nombreSalaries: Number(row.nombre_salaries),
    salaireMoyen: Number(row.salaire_moyen),
    tauxCroissance: row.taux_croissance === null ? null : Number(row.taux_croissance),
  }));
}

