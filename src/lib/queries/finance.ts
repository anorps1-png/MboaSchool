import { createClient } from '../supabase/client';

const supabase = createClient();

export async function getPlanComptable() {
  const { data, error } = await supabase
    .from('comptes_ohada')
    .select('*')
    .order('numero', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getEcrituresComptables() {
  const { data, error } = await supabase
    .from('ecritures_comptables')
    .select('*, lignes_ecritures(*)');

  if (error) throw error;
  return data || [];
}

export async function addEcritureComptable(ecriture: Record<string, any>, lignes: any[]) {
  // Commencer une transaction (dans Supabase, on peut utiliser rpc ou insérer en cascade si configuré)
  // Pour la simplicité, on insère d'abord l'écriture puis les lignes
  const { data, error } = await supabase
    .from('ecritures_comptables')
    .insert([ecriture])
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
