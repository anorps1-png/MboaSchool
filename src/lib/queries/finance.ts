import { createClient } from '../supabase/client';
import { planComptableOHADA } from '../../mock/comptabilite';

const supabase = createClient();

export async function addEcritureComptable(ecriture: Record<string, any>, lignes: any[], etablissementId: string) {
  // Insertion atomique via une fonction Postgres (RPC) : en-tête + lignes dans
  // une seule transaction, avec vérification de l'équilibre débit = crédit et
  // création à la volée des comptes OHADA manquants. Fini les en-têtes orphelins.
  const lignesPayload = lignes.map((l) => {
    const mockAcc = planComptableOHADA.find((a) => a.numero === l.compteNumero);
    return {
      compte_numero: l.compteNumero,
      libelle: mockAcc ? mockAcc.libelle : `Compte ${l.compteNumero}`,
      classe: mockAcc ? mockAcc.classe : Number(String(l.compteNumero).charAt(0)),
      debit: l.debit || 0,
      credit: l.credit || 0,
    };
  });

  const { data: ecritureId, error } = await supabase.rpc('create_ecriture_comptable', {
    p_libelle: ecriture.libelle,
    p_reference: ecriture.reference,
    p_date: ecriture.date ?? null,
    p_partenaire: ecriture.partenaire ?? null,
    p_lignes: lignesPayload,
  });

  if (error) throw error;

  return { id: ecritureId as string, ...ecriture, etablissement_id: etablissementId };
}
