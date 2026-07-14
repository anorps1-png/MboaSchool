import { describe, it, expect } from 'vitest';
import {
  calculerIRPP,
  calculerPrimeAnciennete,
  getAnneesService,
  calculerFicheDePaie,
  genererEcrituresComptablesPaie,
  PLAFOND_CNPS,
  type TauxSociaux,
} from './payroll';

// Taux réglementaires par défaut (identiques au fallback SSR de getTauxFromLocalStorage)
const TAUX: TauxSociaux = {
  cnpsEmployeeRate: 4.2,
  cnpsEmployerRate: 16.2,
  cfcEmployeeRate: 1.0,
  cfcEmployerRate: 1.5,
  fneRate: 1.0,
  cacRate: 10.0,
  ravMensuel: 1083,
  irppTaux1: 10.0,
  irppTaux2: 15.0,
  irppTaux3: 25.0,
  irppTaux4: 35.0,
};

const yearsAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - Math.round(n * 365.25) - 2); // marge pour garantir le plancher entier
  return d.toISOString().slice(0, 10);
};

describe('calculerIRPP', () => {
  it('applique le barème progressif sur le revenu net imposable annualisé', () => {
    // Base 300 000, CNPS salariale 12 600.
    // RBI = 287 400 ; abattement 30% ; RNI mensuel = 201 180 ; annuel = 2 414 160
    // Tranche 1 (0-2M @10%) = 200 000 ; tranche 2 (2M-2,414M @15%) = 62 124
    // IRPP annuel = 262 124 ; mensuel = round(262124/12) = 21 844
    expect(calculerIRPP(300000, 12600, TAUX)).toBe(21844);
  });

  it('renvoie 0 pour un revenu imposable nul', () => {
    expect(calculerIRPP(0, 0, TAUX)).toBe(0);
  });
});

describe('calculerPrimeAnciennete', () => {
  it('renvoie 0 en-dessous du seuil de 2 ans', () => {
    expect(calculerPrimeAnciennete(200000, yearsAgo(1))).toBe(0);
  });

  it('applique 2% par année de service', () => {
    // ~5 ans -> 10% de 200 000 = 20 000
    expect(calculerPrimeAnciennete(200000, yearsAgo(5))).toBe(20000);
  });

  it('plafonne la prime à 30% du salaire de base', () => {
    // 20 ans -> plafond 30% de 200 000 = 60 000
    expect(calculerPrimeAnciennete(200000, yearsAgo(20))).toBe(60000);
  });

  it('renvoie 0 pour une date invalide ou un salaire nul', () => {
    expect(calculerPrimeAnciennete(200000, '')).toBe(0);
    expect(calculerPrimeAnciennete(200000, 'pas-une-date')).toBe(0);
    expect(calculerPrimeAnciennete(0, yearsAgo(10))).toBe(0);
  });
});

describe('getAnneesService', () => {
  it('renvoie le nombre d\'années entières', () => {
    expect(getAnneesService(yearsAgo(5))).toBe(5);
    expect(getAnneesService('')).toBe(0);
  });
});

describe('calculerFicheDePaie', () => {
  const base = {
    salaireDeBase: 300000,
    primeTransport: 0,
    primeLogement: 0,
    primeAnciennete: 0,
    autresPrimes: 0,
    taux: TAUX,
  };

  it('calcule tous les éléments d\'un bulletin (cas de référence 300 000 FCFA)', () => {
    const r = calculerFicheDePaie(base);
    expect(r.salaireBrut).toBe(300000);
    expect(r.cnpsSalariale).toBe(12600);
    expect(r.cfcSalariale).toBe(3000);
    expect(r.irpp).toBe(21844);
    expect(r.cac).toBe(2184);
    expect(r.rav).toBe(1083);
    expect(r.totalRetenues).toBe(40711);
    expect(r.cnpsPatronale).toBe(48600);
    expect(r.cfcPatronale).toBe(4500);
    expect(r.fne).toBe(3000);
    expect(r.totalChargesPatronales).toBe(56100);
    expect(r.netAPayer).toBe(259289);
  });

  it('vérifie l\'identité net = brut - retenues', () => {
    const r = calculerFicheDePaie({ ...base, salaireDeBase: 450000, primeTransport: 25000 });
    expect(r.netAPayer).toBe(r.salaireBrut - r.totalRetenues);
  });

  it('plafonne l\'assiette CNPS à 750 000 FCFA', () => {
    const r = calculerFicheDePaie({ ...base, salaireDeBase: 1000000 });
    // cnps salariale calculée sur le plafond, pas sur le brut
    expect(r.cnpsSalariale).toBe(Math.round(PLAFOND_CNPS * 0.042));
    expect(r.cnpsPatronale).toBe(Math.round(PLAFOND_CNPS * 0.162));
  });

  it('intègre les primes dans le salaire brut', () => {
    const r = calculerFicheDePaie({
      ...base,
      primeTransport: 25000,
      primeLogement: 50000,
      primeAnciennete: 30000,
      autresPrimes: 5000,
    });
    expect(r.salaireBrut).toBe(410000);
  });
});

describe('genererEcrituresComptablesPaie', () => {
  const fiche = {
    salaireBrut: 300000,
    totalRetenues: 40711,
    netAPayer: 259289,
    cnpsSalariale: 12600,
    cfcSalariale: 3000,
    cnpsPatronale: 48600,
    cfcPatronale: 4500,
    fne: 3000,
    irpp: 21844,
    cac: 2184,
    rav: 1083,
    totalChargesPatronales: 56100,
  };

  const sumDebit = (lignes: { debit: number }[]) => lignes.reduce((s, l) => s + l.debit, 0);
  const sumCredit = (lignes: { credit: number }[]) => lignes.reduce((s, l) => s + l.credit, 0);

  it('produit une écriture équilibrée (débit = crédit) — invariant OHADA', () => {
    const { lignes } = genererEcrituresComptablesPaie([fiche]);
    expect(sumDebit(lignes)).toBe(sumCredit(lignes));
    expect(sumDebit(lignes)).toBeGreaterThan(0);
  });

  it('reste équilibrée pour un règlement en caisse', () => {
    const { lignes } = genererEcrituresComptablesPaie([{ ...fiche, modePaiement: 'Caisse' }]);
    expect(sumDebit(lignes)).toBe(sumCredit(lignes));
  });

  it('reste équilibrée en agrégeant plusieurs fiches (banque + caisse)', () => {
    const { lignes } = genererEcrituresComptablesPaie([
      { ...fiche, modePaiement: 'Banque' },
      { ...fiche, modePaiement: 'Caisse' },
      { ...fiche },
    ]);
    expect(sumDebit(lignes)).toBe(sumCredit(lignes));
  });

  it('impute le net à payer sur le compte 661 (salaires) au débit', () => {
    const { lignes } = genererEcrituresComptablesPaie([fiche]);
    const l661 = lignes.find((l) => l.compteNumero === '661');
    expect(l661?.debit).toBe(300000);
  });
});
