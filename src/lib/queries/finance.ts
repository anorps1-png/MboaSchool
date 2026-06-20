import { createClient } from '../supabase/client';
import { planComptableOHADA } from '../../mock/comptabilite';

const supabase = createClient();

export async function getPlanComptable(etablissementId: string) {
  const { data, error } = await supabase
    .from('comptes_ohada')
    .select('*');

  if (error) throw error;
  const filtered = (data || []).filter((a: any) => !a.etablissement_id || a.etablissement_id === etablissementId);
  return filtered.sort((a: any, b: any) => a.numero.localeCompare(b.numero, undefined, { numeric: true }));
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
  // Ensure all accounts in 'lignes' exist in comptes_ohada to prevent foreign key errors
  try {
    const { data: existingAccounts } = await supabase
      .from('comptes_ohada')
      .select('numero, etablissement_id');
      
    const existingSet = new Set((existingAccounts || [])
      .filter((a: any) => !a.etablissement_id || a.etablissement_id === etablissementId)
      .map((a: any) => a.numero));
    const uniqueCompteNums = Array.from(new Set(lignes.map(l => l.compteNumero)));
    const missingAccounts = uniqueCompteNums.filter(num => num && !existingSet.has(num));
      
    if (missingAccounts.length > 0) {
      const toInsert = missingAccounts.map(num => {
        const mockAcc = planComptableOHADA.find(a => a.numero === num);
        return {
          numero: num,
          libelle: mockAcc ? mockAcc.libelle : `Compte ${num}`,
          classe: mockAcc ? mockAcc.classe : Number(num.charAt(0)),
          etablissement_id: mockAcc ? null : etablissementId
        };
      });
      await supabase.from('comptes_ohada').insert(toInsert);
    }
  } catch (err) {
    console.warn("Failed to self-heal comptes_ohada:", err);
  }

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
