import { createClient } from '../supabase/client';

const supabase = createClient();

export async function getStudents() {
  const { data, error } = await supabase
    .from('eleves')
    .select('*, paiements(*)')
    .order('nom', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getStudentById(id: string) {
  const { data, error } = await supabase
    .from('eleves')
    .select('*, paiements(*), notes(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createStudent(studentData: Record<string, any>) {
  const { data, error } = await supabase
    .from('eleves')
    .insert([studentData])
    .select();

  if (error) throw error;
  return data;
}

export async function addPayment(paymentData: Record<string, any>) {
  const { data, error } = await supabase
    .from('paiements')
    .insert([paymentData])
    .select();

  if (error) throw error;
  return data;
}
