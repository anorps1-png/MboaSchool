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
