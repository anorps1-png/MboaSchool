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

export interface AccountBalance {
  debit: number;
  credit: number;
}

/**
 * Soldes débit/crédit par compte, calculés en base (vraies lignes_ecritures +
 * mêmes écritures synthétiques que le calcul client historique : constatation
 * frais scolaires, règlements, formations). Remplace le fetch complet
 * élèves+paiements+écritures pour alimenter les mêmes totaux (CA, charges,
 * TVA, bilan, DSF).
 */
export async function getFinanceAccountBalances(
  etablissementId: string
): Promise<Record<string, AccountBalance>> {
  const { data, error } = await supabase.rpc('get_finance_account_balances', {
    p_etablissement_id: etablissementId,
  });
  if (error) throw error;
  const balances: Record<string, AccountBalance> = {};
  ((data as Record<string, unknown>[]) ?? []).forEach((row) => {
    balances[row.compte_numero as string] = {
      debit: Number(row.debit),
      credit: Number(row.credit),
    };
  });
  return balances;
}

export interface CaParClasse {
  classeId: string;
  caCollecte: number;
}

/** CA (paiements statut='paid') collecté par classe, calculé en base. */
export async function getFinanceCaParClasse(etablissementId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('get_finance_ca_par_classe', {
    p_etablissement_id: etablissementId,
  });
  if (error) throw error;
  const map: Record<string, number> = {};
  ((data as Record<string, unknown>[]) ?? []).forEach((row) => {
    map[row.classe_id as string] = Number(row.ca_collecte);
  });
  return map;
}

export interface ReconciliationJour {
  jour: string;
  caConstate: number;
  encaisse: number;
}

/** Rapprochement de trésorerie quotidien (N derniers jours), calculé en base. */
export async function getFinanceReconciliationQuotidienne(
  etablissementId: string,
  jours = 7
): Promise<ReconciliationJour[]> {
  const { data, error } = await supabase.rpc('get_finance_reconciliation_quotidienne', {
    p_etablissement_id: etablissementId,
    p_jours: jours,
  });
  if (error) throw error;
  return ((data as Record<string, unknown>[]) ?? []).map((row) => ({
    jour: row.jour as string,
    caConstate: Number(row.ca_constate),
    encaisse: Number(row.encaisse),
  }));
}
