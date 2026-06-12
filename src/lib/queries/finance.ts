import { createClient } from '../supabase/client';

const supabase = createClient();

export async function getPlanComptable(etablissementId: string) {
  const { data, error } = await supabase
    .from('comptes_ohada')
    .select('*')
    .eq('etablissement_id', etablissementId)
    .order('numero', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getEcrituresComptables(etablissementId: string) {
  const { data, error } = await supabase
    .from('ecritures_comptables')
    .select('*, lignes_ecritures(*)')
    .eq('etablissement_id', etablissementId);

  if (error) throw error;
  return data || [];
}

export async function addEcritureComptable(ecriture: Record<string, any>, lignes: any[], etablissementId: string) {
  const { data, error } = await supabase
    .from('ecritures_comptables')
    .insert([{ ...ecriture, etablissement_id: etablissementId }])
    .select()
    .single();

  if (error) throw error;

  const lignesData = lignes.map(l => ({
    ecriture_id: data.id,
    compte_numero: l.compteNumero,
    debit: l.debit || 0,
    credit: l.credit || 0
  }));

  const { error: linesError } = await supabase
    .from('lignes_ecritures')
    .insert(lignesData);

  if (linesError) throw linesError;

  return data;
}
