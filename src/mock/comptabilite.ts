import { CompteOHADA, EcritureComptable } from '@/types/domain';

export const planComptableOHADA: CompteOHADA[] = [
  // Classe 1 : Ressources Stables
  { numero: '101', libelle: 'Capital social', classe: 1 },
  { numero: '102', libelle: 'Fonds social', classe: 1 },
  { numero: '111', libelle: 'Réserve légale', classe: 1 },
  { numero: '112', libelle: 'Réserves statutaires', classe: 1 },
  { numero: '121', libelle: 'Report à nouveau créditeur', classe: 1 },
  { numero: '129', libelle: 'Report à nouveau débiteur', classe: 1 },
  { numero: '131', libelle: 'Résultat net de l\'exercice (Bénéfice)', classe: 1 },
  { numero: '139', libelle: 'Résultat net de l\'exercice (Perte)', classe: 1 },
  { numero: '162', libelle: 'Emprunts d\'établissements de crédit', classe: 1 },
  { numero: '165', libelle: 'Dépôts et cautionnements reçus', classe: 1 },

  // Classe 2 : Actif Immobilisé
  { numero: '211', libelle: 'Frais de recherche et développement', classe: 2 },
  { numero: '212', libelle: 'Brevets, licences, marques', classe: 2 },
  { numero: '213', libelle: 'Logiciels informatiques', classe: 2 },
  { numero: '22', libelle: 'Terrains', classe: 2 },
  { numero: '221', libelle: 'Terrains nus', classe: 2 },
  { numero: '222', libelle: 'Terrains aménagés', classe: 2 },
  { numero: '23', libelle: 'Bâtiments', classe: 2 },
  { numero: '231', libelle: 'Bâtiments administratifs', classe: 2 },
  { numero: '232', libelle: 'Bâtiments scolaires (Salles de classe)', classe: 2 },
  { numero: '238', libelle: 'Autres constructions', classe: 2 },
  { numero: '24', libelle: 'Matériel, mobilier et équipements', classe: 2 },
  { numero: '241', libelle: 'Matériel industriel', classe: 2 },
  { numero: '242', libelle: 'Matériel de transport (Véhicules scolaires)', classe: 2 },
  { numero: '244', libelle: 'Matériel et mobilier de bureau/scolaire', classe: 2 },
  { numero: '245', libelle: 'Matériel informatique', classe: 2 },
  { numero: '247', libelle: 'Agencements et installations', classe: 2 },
  { numero: '271', libelle: 'Prêts au personnel', classe: 2 },
  { numero: '275', libelle: 'Dépôts et cautionnements versés', classe: 2 },

  // Classe 3 : Stocks
  { numero: '311', libelle: 'Stocks de fournitures scolaires', classe: 3 },
  { numero: '321', libelle: 'Stocks de consommables', classe: 3 },
  { numero: '335', libelle: 'Travaux en cours', classe: 3 },

  // Classe 4 : Tiers
  { numero: '401', libelle: 'Fournisseurs d\'exploitation', classe: 4 },
  { numero: '4011', libelle: 'Fournisseurs - Achats de biens', classe: 4 },
  { numero: '4012', libelle: 'Fournisseurs - Prestations de services', classe: 4 },
  { numero: '402', libelle: 'Fournisseurs d\'investissements', classe: 4 },
  { numero: '411', libelle: 'Clients (Parents d\'élèves)', classe: 4 },
  { numero: '4111', libelle: 'Scolarité courante à percevoir', classe: 4 },
  { numero: '4112', libelle: 'Activités parascolaires à percevoir', classe: 4 },
  { numero: '419', libelle: 'Clients créditeurs (Avances reçues)', classe: 4 },
  { numero: '421', libelle: 'Personnel - Rémunérations dues', classe: 4 },
  { numero: '422', libelle: 'Personnel - Avances et acomptes', classe: 4 },
  { numero: '425', libelle: 'Personnel - Prêts accordés', classe: 4 },
  { numero: '431', libelle: 'Organismes Sociaux (CNPS)', classe: 4 },
  { numero: '4311', libelle: 'CNPS - Part salariale', classe: 4 },
  { numero: '4312', libelle: 'CNPS - Part patronale', classe: 4 },
  { numero: '433', libelle: 'Organismes Sociaux (Assurances maladie)', classe: 4 },
  { numero: '441', libelle: 'État - Impôts et Taxes', classe: 4 },
  { numero: '442', libelle: 'État - Impôts retenus à la source', classe: 4 },
  { numero: '443', libelle: 'État - TVA facturée', classe: 4 },
  { numero: '445', libelle: 'État - TVA récupérable', classe: 4 },
  { numero: '447', libelle: 'État - Autres impôts et taxes', classe: 4 },
  { numero: '4472', libelle: 'État, IRPP retenu à la source', classe: 4 },
  { numero: '4473', libelle: 'État, Taxes sur salaires (FNE, CFC)', classe: 4 },
  { numero: '481', libelle: 'Charges à répartir', classe: 4 },
  { numero: '485', libelle: 'Produits constatés d\'avance', classe: 4 },

  // Classe 5 : Trésorerie
  { numero: '521', libelle: 'Banque - Compte Principal', classe: 5 },
  { numero: '5212', libelle: 'Banque - Compte d\'épargne / projet', classe: 5 },
  { numero: '561', libelle: 'Banques de microfinance (MC2, CamCCUL)', classe: 5 },
  { numero: '571', libelle: 'Caisse Principale', classe: 5 },
  { numero: '5712', libelle: 'Caisse Menues Dépenses', classe: 5 },
  { numero: '572', libelle: 'Comptes Mobile Money (MTN / Orange)', classe: 5 },
  { numero: '585', libelle: 'Virements de fonds (Liaison interne)', classe: 5 },

  // Classe 6 : Charges
  { numero: '601', libelle: 'Achats de fournitures de bureau', classe: 6 },
  { numero: '6011', libelle: 'Achats de manuels scolaires et guides', classe: 6 },
  { numero: '6015', libelle: 'Achats de matériel didactique (craies, etc.)', classe: 6 },
  { numero: '602', libelle: 'Achats de matières et fournitures liées', classe: 6 },
  { numero: '604', libelle: 'Achats d\'études et prestations de services', classe: 6 },
  { numero: '605', libelle: 'Eau et Électricité (Fluides ENEO / Camwater)', classe: 6 },
  { numero: '6052', libelle: 'Carburant et lubrifiants (Transport scolaire)', classe: 6 },
  { numero: '61', libelle: 'Transports', classe: 6 },
  { numero: '611', libelle: 'Transports de marchandises/matériel', classe: 6 },
  { numero: '612', libelle: 'Redevances de crédit-bail / leasing', classe: 6 },
  { numero: '616', libelle: 'Primes d\'assurances (Bâtiments, Élèves)', classe: 6 },
  { numero: '621', libelle: 'Personnel extérieur (Vacataires, Intervenants)', classe: 6 },
  { numero: '622', libelle: 'Locations et charges locatives', classe: 6 },
  { numero: '623', libelle: 'Publicité, publications et relations publiques', classe: 6 },
  { numero: '624', libelle: 'Entretien, réparations et maintenance scolaires', classe: 6 },
  { numero: '625', libelle: 'Déplacements, missions et réceptions', classe: 6 },
  { numero: '626', libelle: 'Frais postaux et télécommunications', classe: 6 },
  { numero: '627', libelle: 'Services bancaires (Agios, tenue compte)', classe: 6 },
  { numero: '628', libelle: 'Divers services extérieurs', classe: 6 },
  { numero: '631', libelle: 'Frais bancaires et agios sur découverts', classe: 6 },
  { numero: '632', libelle: 'Honoraires (Avocats, Experts-comptables)', classe: 6 },
  { numero: '64', libelle: 'Impôts et taxes', classe: 6 },
  { numero: '641', libelle: 'Impôts et taxes directs', classe: 6 },
  { numero: '644', libelle: 'Taxes sur salaires (FNE patronal, CFC patronal)', classe: 6 },
  { numero: '661', libelle: 'Rémunérations directes (Salaires)', classe: 6 },
  { numero: '6611', libelle: 'Appointements et salaires du personnel permanent', classe: 6 },
  { numero: '6612', libelle: 'Indemnités et primes (Transport, logement)', classe: 6 },
  { numero: '6613', libelle: 'Heures supplémentaires enseignées', classe: 6 },
  { numero: '664', libelle: 'Charges sociales', classe: 6 },
  { numero: '6641', libelle: 'Charges sociales patronales (CNPS)', classe: 6 },
  { numero: '671', libelle: 'Intérêts des emprunts bancaires', classe: 6 },
  { numero: '681', libelle: 'Dotations aux amortissements', classe: 6 },

  // Classe 7 : Produits
  { numero: '706', libelle: 'Services vendus (Frais de scolarité)', classe: 7 },
  { numero: '7061', libelle: 'Pension / Scolarité de base', classe: 7 },
  { numero: '7062', libelle: 'Frais d\'activités sportives et culturelles', classe: 7 },
  { numero: '7063', libelle: 'Cantine scolaire et restauration', classe: 7 },
  { numero: '7064', libelle: 'Transport scolaire des élèves', classe: 7 },
  { numero: '707', libelle: 'Frais d\'inscription et divers', classe: 7 },
  { numero: '7071', libelle: 'Frais d\'inscription (nouveaux et anciens)', classe: 7 },
  { numero: '7072', libelle: 'Frais de dossiers et examens blancs', classe: 7 },
  { numero: '7075', libelle: 'Vente d\'uniformes et écussons', classe: 7 },
  { numero: '751', libelle: 'Produits des activités annexes', classe: 7 },
  { numero: '77', libelle: 'Revenus financiers', classe: 7 },
  { numero: '771', libelle: 'Intérêts créditeurs et produits financiers', classe: 7 },
  { numero: '781', libelle: 'Reprises d\'amortissements et provisions', classe: 7 },
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
