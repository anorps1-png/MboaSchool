import { createClient } from '../supabase/client';

const supabase = createClient();

/**
 * Récupère les données brutes nécessaires pour le Dashboard.
 */
export async function getDashboardData() {
  const { data: classes, error: classesError } = await supabase
    .from('classes')
    .select('*')
    .order('nom', { ascending: true });

  if (classesError) throw classesError;

  const { data: students, error: studentsError } = await supabase
    .from('eleves')
    .select('*, paiements(*), notes(*)');

  if (studentsError) throw studentsError;

  const { data: teachers, error: teachersError } = await supabase
    .from('enseignants')
    .select('*');

  if (teachersError) throw teachersError;

  return {
    classes: classes || [],
    students: students || [],
    teachers: teachers || []
  };
}
