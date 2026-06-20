import { createClient } from '../supabase/client';

const supabase = createClient();

export async function getStudents(etablissementId: string) {
  let allData: any[] = [];
  let from = 0;
  const step = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('eleves')
      .select('*, paiements(*)')
      .eq('etablissement_id', etablissementId)
      .order('nom', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + step - 1);

    if (error) throw error;
    if (data && data.length > 0) {
      allData = allData.concat(data);
      from += step;
      if (data.length < step) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }
  return allData;
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

export async function createStudent(studentData: Record<string, any>, etablissementId: string) {
  const { data, error } = await supabase
    .from('eleves')
    .insert([{ ...studentData, etablissement_id: etablissementId }])
    .select();

  if (error) throw error;
  return data;
}

export async function addPayment(paymentData: Record<string, any>, etablissementId: string) {
  const { data, error } = await supabase
    .from('paiements')
    .insert([{ ...paymentData, etablissement_id: etablissementId }])
    .select();

  if (error) throw error;
  return data;
}
