/**
 * Module de calcul de paie — Conformité CNPS Cameroun
 * 
 * Calcule tous les éléments constitutifs d'un bulletin de paie camerounais :
 * - Cotisations sociales (CNPS, CFC)
 * - IRPP (Impôt sur le Revenu des Personnes Physiques) — barème progressif
 * - CAC (Centimes Additionnels Communaux)
 * - RAV (Redevance Audio Visuelle)
 * - Charges patronales (CNPS, CFC, FNE)
 * - Prime d'ancienneté automatique
 */

// ============================================================
// CONSTANTES RÉGLEMENTAIRES
// ============================================================

/** Plafond mensuel CNPS en FCFA (cotisations pension vieillesse) */
export const PLAFOND_CNPS = 750000;

/** Redevance Audio Visuelle annuelle en FCFA */
export const RAV_ANNUEL = 13000;

/** RAV mensuelle par défaut (13000 / 12) */
export const RAV_MENSUEL_DEFAULT = Math.round(RAV_ANNUEL / 12);

/**
 * Barème progressif IRPP camerounais (sur revenu net imposable annuel)
 * Applicable au Cameroun selon le Code Général des Impôts
 */
const BAREME_IRPP = [
  { limite: 2000000, taux: 0.10 },
  { limite: 3000000, taux: 0.15 },
  { limite: 5000000, taux: 0.25 },
  { limite: Infinity, taux: 0.35 },
];

/** Taux d'abattement forfaitaire pour frais professionnels */
const ABATTEMENT_FRAIS_PRO = 0.30;

/** Prime d'ancienneté : 2% par année de service à partir de la 3ème année */
const TAUX_ANCIENNETE_PAR_AN = 2;
/** Plafond de la prime d'ancienneté en pourcentage du salaire de base */
const PLAFOND_ANCIENNETE = 30;
/** Nombre minimum d'années pour bénéficier de l'ancienneté */
const SEUIL_ANCIENNETE_ANNEES = 2;

// ============================================================
// TYPES
// ============================================================

export interface TauxSociaux {
  cnpsEmployeeRate: number;     // Part salariale CNPS (défaut 4.2%)
  cnpsEmployerRate: number;     // Part patronale CNPS (défaut 16.2%)
  cfcEmployeeRate: number;      // Part salariale CFC (défaut 1.0%)
  cfcEmployerRate: number;      // Part patronale CFC (défaut 1.5%)
  fneRate: number;              // FNE patronal (défaut 1.0%)
  cacRate: number;              // CAC = % de l'IRPP (défaut 10%)
  ravMensuel: number;           // RAV mensuel en FCFA (défaut 1083)
  irppTaux1: number;            // IRPP 0-2M (défaut 10%)
  irppTaux2: number;            // IRPP 2M-3M (défaut 15%)
  irppTaux3: number;            // IRPP 3M-5M (défaut 25%)
  irppTaux4: number;            // IRPP >5M (défaut 35%)
}

export interface ResultatPaie {
  salaireBrut: number;
  cnpsSalariale: number;
  cfcSalariale: number;
  irpp: number;
  cac: number;
  rav: number;
  totalRetenues: number;
  cnpsPatronale: number;
  cfcPatronale: number;
  fne: number;
  totalChargesPatronales: number;
  netAPayer: number;
}

export interface LigneComptable {
  compteNumero: string;
  debit: number;
  credit: number;
}

// ============================================================
// LECTURE DES TAUX DEPUIS LE LOCALSTORAGE (Paramètres)
// ============================================================

export function getTauxFromLocalStorage(): TauxSociaux {
  if (typeof window === 'undefined') {
    return {
      cnpsEmployeeRate: 4.2,
      cnpsEmployerRate: 16.2,
      cfcEmployeeRate: 1.0,
      cfcEmployerRate: 1.5,
      fneRate: 1.0,
      cacRate: 10.0,
      ravMensuel: RAV_MENSUEL_DEFAULT,
      irppTaux1: 10.0,
      irppTaux2: 15.0,
      irppTaux3: 25.0,
      irppTaux4: 35.0,
    };
  }
  return {
    cnpsEmployeeRate: Number(localStorage.getItem('setting_cnps_employee_rate')) || 4.2,
    cnpsEmployerRate: Number(localStorage.getItem('setting_cnps_employer_rate')) || 16.2,
    cfcEmployeeRate: Number(localStorage.getItem('setting_cfc_employee_rate')) || 1.0,
    cfcEmployerRate: Number(localStorage.getItem('setting_cfc_employer_rate')) || 1.5,
    fneRate: Number(localStorage.getItem('setting_fne_rate')) || 1.0,
    cacRate: Number(localStorage.getItem('setting_cac_rate')) || 10.0,
    ravMensuel: Number(localStorage.getItem('setting_rav_mensuel')) || RAV_MENSUEL_DEFAULT,
    irppTaux1: Number(localStorage.getItem('setting_irpp_taux1')) || 10.0,
    irppTaux2: Number(localStorage.getItem('setting_irpp_taux2')) || 15.0,
    irppTaux3: Number(localStorage.getItem('setting_irpp_taux3')) || 25.0,
    irppTaux4: Number(localStorage.getItem('setting_irpp_taux4')) || 35.0,
  };
}

// ============================================================
// CALCUL IRPP — BARÈME PROGRESSIF CAMEROUNAIS
// ============================================================

/**
 * Calcule l'IRPP mensuel selon le barème progressif camerounais.
 * 
 * Étapes :
 * 1. Revenu brut imposable = Salaire brut − CNPS salariale
 * 2. Abattement de 30% pour frais professionnels
 * 3. Revenu Net Imposable (RNI) = Revenu brut imposable − Abattement
 * 4. Annualisation du RNI
 * 5. Application du barème progressif
 * 6. Mensualisation de l'IRPP annuel
 */
export function calculerIRPP(salaireBrutMensuel: number, cnpsSalariale: number, taux: TauxSociaux): number {
  // 1. Revenu brut imposable
  const revenuBrutImposable = Math.max(0, salaireBrutMensuel - cnpsSalariale);

  // 2. Abattement forfaitaire de 30% pour frais professionnels
  const abattement = revenuBrutImposable * ABATTEMENT_FRAIS_PRO;
  const revenuNetImposable = Math.max(0, revenuBrutImposable - abattement);

  // 3. Annualiser
  const revenuAnnuel = revenuNetImposable * 12;

  // 4. Appliquer le barème progressif (dynamique via les paramètres)
  const baremeDynamique = [
    { limite: 2000000, taux: taux.irppTaux1 / 100 },
    { limite: 3000000, taux: taux.irppTaux2 / 100 },
    { limite: 5000000, taux: taux.irppTaux3 / 100 },
    { limite: Infinity, taux: taux.irppTaux4 / 100 },
  ];

  let irppAnnuel = 0;
  let precedent = 0;

  for (const tranche of baremeDynamique) {
    if (revenuAnnuel <= precedent) break;
    const montantImposable = Math.min(revenuAnnuel, tranche.limite) - precedent;
    irppAnnuel += montantImposable * tranche.taux;
    precedent = tranche.limite;
  }

  // 5. Mensualiser
  return Math.round(irppAnnuel / 12);
}

// ============================================================
// CALCUL PRIME D'ANCIENNETÉ
// ============================================================

/**
 * Calcule la prime d'ancienneté d'un employé.
 * 
 * Règle camerounaise : 2% du salaire de base par année de service
 * à compter de la 3ème année, plafonné à 30%.
 */
export function calculerPrimeAnciennete(salaireDeBase: number, dateEmbauche: string): number {
  if (!dateEmbauche || !salaireDeBase) return 0;
  const embauche = new Date(dateEmbauche);
  if (isNaN(embauche.getTime())) return 0;
  const now = new Date();
  const anneesService = (now.getTime() - embauche.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

  if (anneesService < SEUIL_ANCIENNETE_ANNEES) return 0;

  const tauxAnciennete = Math.min(
    Math.floor(anneesService) * TAUX_ANCIENNETE_PAR_AN,
    PLAFOND_ANCIENNETE
  );
  return Math.round(salaireDeBase * tauxAnciennete / 100);
}

/**
 * Retourne le nombre d'années de service entières.
 */
export function getAnneesService(dateEmbauche: string): number {
  if (!dateEmbauche) return 0;
  const embauche = new Date(dateEmbauche);
  if (isNaN(embauche.getTime())) return 0;
  const now = new Date();
  return Math.floor((now.getTime() - embauche.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

// ============================================================
// CALCUL COMPLET D'UNE FICHE DE PAIE
// ============================================================

/**
 * Calcule tous les éléments d'un bulletin de paie camerounais.
 */
export function calculerFicheDePaie(params: {
  salaireDeBase: number;
  primeTransport: number;
  primeLogement: number;
  primeAnciennete: number;
  autresPrimes: number;
  taux: TauxSociaux;
}): ResultatPaie {
  const { salaireDeBase, primeTransport, primeLogement, primeAnciennete, autresPrimes, taux } = params;

  // ── Salaire brut ──
  const salaireBrut = salaireDeBase + primeTransport + primeLogement + primeAnciennete + autresPrimes;

  // ── Salaire cotisable CNPS (plafonné à 750 000 FCFA/mois) ──
  const salaireCotisableCNPS = Math.min(salaireBrut, PLAFOND_CNPS);

  // ── Retenues salariales ──
  const cnpsSalariale = Math.round(salaireCotisableCNPS * taux.cnpsEmployeeRate / 100);
  const cfcSalariale = Math.round(salaireBrut * taux.cfcEmployeeRate / 100);
  const irpp = calculerIRPP(salaireBrut, cnpsSalariale, taux);
  const cac = Math.round(irpp * taux.cacRate / 100);
  const rav = taux.ravMensuel;
  const totalRetenues = cnpsSalariale + cfcSalariale + irpp + cac + rav;

  // ── Charges patronales ──
  const cnpsPatronale = Math.round(salaireCotisableCNPS * taux.cnpsEmployerRate / 100);
  const cfcPatronale = Math.round(salaireBrut * taux.cfcEmployerRate / 100);
  const fne = Math.round(salaireBrut * taux.fneRate / 100);
  const totalChargesPatronales = cnpsPatronale + cfcPatronale + fne;

  // ── Net à payer ──
  const netAPayer = salaireBrut - totalRetenues;

  return {
    salaireBrut,
    cnpsSalariale,
    cfcSalariale,
    irpp,
    cac,
    rav,
    totalRetenues,
    cnpsPatronale,
    cfcPatronale,
    fne,
    totalChargesPatronales,
    netAPayer,
  };
}

// ============================================================
// GÉNÉRATION DES ÉCRITURES COMPTABLES OHADA
// ============================================================

/**
 * Génère les lignes comptables OHADA pour une série de fiches de paie.
 * 
 * Comptes utilisés (Plan Comptable OHADA) :
 * - 6611 : Appointements et salaires (Débit : salaire brut)
 * - 6641 : Charges sociales sur salaires (Débit : charges patronales)
 * - 421  : Personnel — Rémunérations dues (Crédit : net à payer)
 * - 431  : Sécurité sociale — CNPS (Crédit : cotisations salariales + patronales CNPS + CFC)
 * - 4472 : État, IRPP retenu à la source (Crédit : IRPP + CAC + RAV)
 * - 521/571 : Banque/Caisse (Crédit lors du décaissement)
 */
export function genererEcrituresComptablesPaie(
  fiches: Array<{
    salaireBrut: number;
    totalRetenues: number;
    netAPayer: number;
    cnpsSalariale: number;
    cfcSalariale: number;
    cnpsPatronale: number;
    cfcPatronale: number;
    fne: number;
    irpp: number;
    cac: number;
    rav: number;
    totalChargesPatronales: number;
    modePaiement?: 'Banque' | 'Caisse';
  }>,
  compteBanque: string = '521',
  compteCaisse: string = '571'
): { ecriture: { libelle: string; reference: string }; lignes: LigneComptable[] } {

  // Agrégation des totaux
  let totalBrut = 0;
  let totalNetBanque = 0;
  let totalNetCaisse = 0;
  let totalCNPSSalariale = 0;
  let totalCFCSalariale = 0;
  let totalCNPSPatronale = 0;
  let totalCFCPatronale = 0;
  let totalFNE = 0;
  let totalIRPP = 0;
  let totalCAC = 0;
  let totalRAV = 0;
  let totalChargesPatronales = 0;

  for (const f of fiches) {
    totalBrut += f.salaireBrut;
    if (f.modePaiement === 'Caisse') {
      totalNetCaisse += f.netAPayer;
    } else {
      totalNetBanque += f.netAPayer;
    }
    totalCNPSSalariale += f.cnpsSalariale;
    totalCFCSalariale += f.cfcSalariale;
    totalCNPSPatronale += f.cnpsPatronale;
    totalCFCPatronale += f.cfcPatronale;
    totalFNE += f.fne;
    totalIRPP += f.irpp;
    totalCAC += f.cac;
    totalRAV += f.rav;
    totalChargesPatronales += f.totalChargesPatronales;
  }

  const totalCotisationsSociales = totalCNPSSalariale + totalCFCSalariale + totalCNPSPatronale + totalCFCPatronale + totalFNE;
  const totalImpots = totalIRPP + totalCAC + totalRAV;

  const now = new Date();
  const reference = `PAIE-${now.toISOString().slice(0, 7)}-${Date.now().toString(36).toUpperCase()}`;

  const lignes: LigneComptable[] = [
    // DÉBITS
    { compteNumero: '6611', debit: totalBrut, credit: 0 },               // Appointements et salaires
    { compteNumero: '6641', debit: totalChargesPatronales, credit: 0 },   // Charges sociales patronales

    // CRÉDITS
    { compteNumero: '431', debit: 0, credit: totalCotisationsSociales },  // CNPS + CFC + FNE à reverser
    { compteNumero: '4472', debit: 0, credit: totalImpots },             // IRPP + CAC + RAV à reverser à l'État
  ];

  if (totalNetBanque > 0) {
    lignes.push({ compteNumero: compteBanque, debit: 0, credit: totalNetBanque });
  }
  if (totalNetCaisse > 0) {
    lignes.push({ compteNumero: compteCaisse, debit: 0, credit: totalNetCaisse });
  }

  return {
    ecriture: {
      libelle: `Paie du personnel — ${now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
      reference,
    },
    lignes,
  };
}
