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

export async function getAbsences(etablissementId: string) {
  const { data, error } = await supabase
    .from('absences_personnel')
    .select('*')
    .eq('etablissement_id', etablissementId)
    .order('date_debut', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getMouvements(etablissementId: string) {
  const { data, error } = await supabase
    .from('mouvements_personnel')
    .select('*')
    .eq('etablissement_id', etablissementId)
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getEvaluationsRH(etablissementId: string) {
  const { data, error } = await supabase
    .from('evaluations_rh')
    .select('*')
    .eq('etablissement_id', etablissementId)
    .order('date_evaluation', { ascending: false });

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

export async function getFormations(etablissementId: string) {
  const { data, error } = await supabase
    .from('formations_rh')
    .select('*, formations_beneficiaires(*)')
    .eq('etablissement_id', etablissementId);

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

  const { data, error } = await supabase
    .from('fiches_de_paie')
    .upsert(fichesWithEtab, { onConflict: 'personnel_id,periode' })
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

