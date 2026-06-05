import { createClient } from '../supabase/client';

const supabase = createClient();

export async function getClasses() {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
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

export async function getMatieresByNiveau(niveauId: string) {
  const { data, error } = await supabase
    .from('matieres')
    .select('*')
    .eq('niveau_id', niveauId);

  if (error) throw error;
  return data || [];
}
