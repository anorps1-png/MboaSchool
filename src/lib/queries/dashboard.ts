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

  let allStudents: any[] = [];
  let from = 0;
  const step = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: students, error: studentsError } = await supabase
      .from('eleves')
      .select('*, paiements(*), notes(*)')
      .eq('etablissement_id', etablissementId)
      .range(from, from + step - 1);

    if (studentsError) throw studentsError;

    if (students && students.length > 0) {
      allStudents = allStudents.concat(students);
      from += step;
      if (students.length < step) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  const { data: teachers, error: teachersError } = await supabase
    .from('enseignants')
    .select('*')
    .eq('etablissement_id', etablissementId);

  if (teachersError) throw teachersError;

  return {
    classes: classes || [],
    students: allStudents,
    teachers: teachers || []
  };
}
