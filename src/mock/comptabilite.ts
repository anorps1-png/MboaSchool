import { CompteOHADA, EcritureComptable } from '@/types/domain';

export const planComptableOHADA: CompteOHADA[] = [
  // Classe 2 : Immobilisations
  { numero: '22', libelle: 'Terrains', classe: 2 },
  { numero: '23', libelle: 'Bâtiments', classe: 2 },
  { numero: '24', libelle: 'Matériel, mobilier et équipements', classe: 2 },
  { numero: '244', libelle: 'Matériel et mobilier de bureau/scolaire', classe: 2 },
  { numero: '245', libelle: 'Matériel informatique', classe: 2 },

  // Classe 4 : Tiers
  { numero: '401', libelle: 'Fournisseurs d\'exploitation', classe: 4 },
  { numero: '411', libelle: 'Clients (Parents d\'élèves)', classe: 4 },
  { numero: '421', libelle: 'Personnel - Rémunérations dues', classe: 4 },
  { numero: '431', libelle: 'Organismes Sociaux (CNPS)', classe: 4 },
  { numero: '441', libelle: 'État - Impôts et Taxes', classe: 4 },
  { numero: '443', libelle: 'État - TVA facturée', classe: 4 },
  { numero: '445', libelle: 'État - TVA récupérable', classe: 4 },
  { numero: '4472', libelle: 'État, IRPP retenu à la source', classe: 4 },

  // Classe 5 : Trésorerie
  { numero: '521', libelle: 'Banque - Compte Principal', classe: 5 },
  { numero: '571', libelle: 'Caisse Principale', classe: 5 },

  // Classe 6 : Charges
  { numero: '601', libelle: 'Achats de fournitures', classe: 6 },
  { numero: '605', libelle: 'Eau et Électricité', classe: 6 },
  { numero: '61', libelle: 'Transports', classe: 6 },
  { numero: '622', libelle: 'Locations et charges locatives', classe: 6 },
  { numero: '624', libelle: 'Entretien et réparations', classe: 6 },
  { numero: '631', libelle: 'Frais bancaires', classe: 6 },
  { numero: '64', libelle: 'Impôts et taxes', classe: 6 },
  { numero: '661', libelle: 'Rémunérations directes (Salaires)', classe: 6 },
  { numero: '6611', libelle: 'Appointements et salaires', classe: 6 },
  { numero: '6641', libelle: 'Charges sociales patronales', classe: 6 },

  // Classe 7 : Produits
  { numero: '706', libelle: 'Services vendus (Frais de scolarité)', classe: 7 },
  { numero: '707', libelle: 'Frais d\'inscription et divers', classe: 7 },
  { numero: '77', libelle: 'Revenus financiers', classe: 7 },
];

export const mockEcrituresInitiales: EcritureComptable[] = [
  // Achat matériel informatique (Constatation)
  {
    id: 'ecr-init-1a',
    date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    libelle: 'Constatation : Achat matériel informatique',
    reference: 'FACT-001',
    lignes: [
      { compteNumero: '245', debit: 1500000, credit: 0 },
      { compteNumero: '401', debit: 0, credit: 1500000 }
    ]
  },
  // Achat matériel informatique (Règlement)
  {
    id: 'ecr-init-1b',
    date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    libelle: 'Règlement : Achat matériel informatique',
    reference: 'PAY-FACT-001',
    lignes: [
      { compteNumero: '401', debit: 1500000, credit: 0 },
      { compteNumero: '521', debit: 0, credit: 1500000 }
    ]
  },
  // Paiement Loyer (Constatation)
  {
    id: 'ecr-init-2a',
    date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    libelle: 'Constatation : Loyer mensuel',
    reference: 'LOYER-M1',
    lignes: [
      { compteNumero: '622', debit: 300000, credit: 0 },
      { compteNumero: '401', debit: 0, credit: 300000 }
    ]
  },
  // Paiement Loyer (Règlement)
  {
    id: 'ecr-init-2b',
    date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    libelle: 'Règlement : Loyer mensuel',
    reference: 'PAY-LOYER-M1',
    lignes: [
      { compteNumero: '401', debit: 300000, credit: 0 },
      { compteNumero: '521', debit: 0, credit: 300000 }
    ]
  }
];
