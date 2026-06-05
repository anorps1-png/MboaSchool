import { createClient } from '../supabase/client';

const supabase = createClient();

export async function getSections() {
  const { data, error } = await supabase
    .from('sections')
    .select('*, niveaux_classes(*, classes(*))');

  if (error) throw error;
  return data || [];
}
