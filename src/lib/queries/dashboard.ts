import { createClient } from '../supabase/client';

const supabase = createClient();

/**
 * Récupère les données brutes nécessaires pour le Dashboard,
 * filtrées par établissement.
 */
export async function getDashboardData(etablissementId: string) {
  const { data: classes, error: classesError } = await supabase
    .from('classes')
    .select('*')
    .eq('etablissement_id', etablissementId)
    .order('nom', { ascending: true });

  if (classesError) throw classesError;

  const { data: students, error: studentsError } = await supabase
    .from('eleves')
    .select('*, paiements(*), notes(*)')
    .eq('etablissement_id', etablissementId);

  if (studentsError) throw studentsError;

  const { data: teachers, error: teachersError } = await supabase
    .from('enseignants')
    .select('*')
    .eq('etablissement_id', etablissementId);

  if (teachersError) throw teachersError;

  return {
    classes: classes || [],
    students: students || [],
    teachers: teachers || []
  };
}
