import { createClient } from '../supabase/client';

const supabase = createClient();

export async function getPersonnel() {
  const { data, error } = await supabase
    .from('membres_personnel')
    .select('*')
    .order('nom', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getAbsences() {
  const { data, error } = await supabase
    .from('absences_personnel')
    .select('*')
    .order('date_debut', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getMouvements() {
  const { data, error } = await supabase
    .from('mouvements_personnel')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getEvaluationsRH() {
  const { data, error } = await supabase
    .from('evaluations_rh')
    .select('*')
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

export async function insertAbsence(data: Record<string, any>) {
  const { data: inserted, error } = await supabase
    .from('absences_personnel')
    .insert([data])
    .select();

  if (error) throw error;
  return inserted;
}

export async function insertMouvement(data: Record<string, any>) {
  const { data: inserted, error } = await supabase
    .from('mouvements_personnel')
    .insert([data])
    .select();

  if (error) throw error;
  return inserted;
}

export async function insertPersonnel(data: Record<string, any>) {
  const { data: inserted, error } = await supabase
    .from('membres_personnel')
    .insert([data])
    .select()
    .single();

  if (error) throw error;
  return inserted;
}


export async function getFormations() {
  const { data, error } = await supabase
    .from('formations_rh')
    .select('*, formations_beneficiaires(*)');

  if (error) throw error;
  return data || [];
}
