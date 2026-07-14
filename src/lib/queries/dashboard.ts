import { createClient } from '../supabase/client';

const supabase = createClient();

export interface DashboardStats {
  total_students: number;
  active_students: number;
  filles: number;
  garcons: number;
  total_teachers: number;
  active_teachers: number;
  nb_classes: number;
  total_expected: number;
  total_paid: number;
  students_with_grades: number;
  students_passed: number;
  success_rate: number | null;
  recovery_rate: number;
}

/**
 * Récupère les indicateurs globaux du tableau de bord, calculés en base
 * (agrégats SQL) plutôt que côté navigateur sur l'ensemble des lignes.
 */
export async function getDashboardStats(etablissementId: string): Promise<DashboardStats | null> {
  const { data, error } = await supabase.rpc('get_dashboard_stats', {
    p_etablissement_id: etablissementId,
  });
  if (error) throw error;
  return (data as DashboardStats) ?? null;
}

/**
 * Récupère les données brutes nécessaires pour le Dashboard,
 * filtrées par établissement.
 *
 * Note : les notes ne sont plus chargées ici — le taux de réussite est calculé
 * en base via getDashboardStats(), ce qui allège fortement le transfert.
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
      .select('*, paiements(*)')
      .eq('etablissement_id', etablissementId)
      .order('nom', { ascending: true })
      .order('id', { ascending: true })
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
