import { createClient } from '../supabase/client';

const supabase = createClient();

export async function getLessons(classeId: string) {
  const { data, error } = await supabase
    .from('emploi_du_temps')
    .select('*')
    .eq('classe_id', classeId)
    .order('jour_semaine', { ascending: true })
    .order('heure_debut', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function addLesson(lessonData: Record<string, any>, etablissementId: string) {
  const { data, error } = await supabase
    .from('emploi_du_temps')
    .insert([{ ...lessonData, etablissement_id: etablissementId }])
    .select();

  if (error) throw error;
  return data;
}

export async function updateLesson(id: string, lessonData: Record<string, any>) {
  const { data, error } = await supabase
    .from('emploi_du_temps')
    .update(lessonData)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data;
}

export async function deleteLesson(id: string) {
  const { error } = await supabase
    .from('emploi_du_temps')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
