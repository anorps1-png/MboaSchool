import { createClient } from '../supabase/client';

const supabase = createClient();

export async function getClasses(etablissementId: string) {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('etablissement_id', etablissementId)
    .order('nom', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getClassById(id: string) {
  const { data, error } = await supabase
    .from('classes')
    .select('*, eleves(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createClass(classData: Record<string, any>, etablissementId: string) {
  const { data, error } = await supabase
    .from('classes')
    .insert([{ ...classData, etablissement_id: etablissementId }])
    .select();

  if (error) throw error;
  return data;
}

export async function deleteClass(id: string) {
  const { error } = await supabase.from('classes').delete().eq('id', id);
  if (error) throw error;
}

export async function getMatieresByNiveau(niveauId: string) {
  const { data, error } = await supabase
    .from('matieres')
    .select('*')
    .eq('niveau_id', niveauId);

  if (error) throw error;
  return data || [];
}
