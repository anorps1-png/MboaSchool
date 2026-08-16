// Mocks complémentaires pour le module Finance (BSC et Budgets)

export interface BSCHistorique {
  annee: 2024 | 2025;
  // Finances
  chiffreAffaires: number;
  masseSalarialeMensuelle: number;
  beneficeNet: number;
  // Clients
  nombreEleves: number;
  tauxRecouvrement: number;
  satisfactionParents: number; // en %
  // Processus
  moyenneGenerale: number; // sur 20
  totalAbsences: number; // jours cumulés
  tailleMoyenneClasse: number;
  // Apprentissage
  ratioFormation: number; // en %
  adherenceJobRole: number; // en %
  noteMoyenneFormation: number; // sur 20
}

export const mockBSCHistorique: BSCHistorique[] = [
  {
    annee: 2024,
    chiffreAffaires: 12200000,
    masseSalarialeMensuelle: 2560000,
    beneficeNet: 2100000,
    nombreEleves: 145,
    tauxRecouvrement: 91,
    satisfactionParents: 85,
    moyenneGenerale: 11.5,
    totalAbsences: 180,
    tailleMoyenneClasse: 48,
    ratioFormation: 1.1,
    adherenceJobRole: 80,
    noteMoyenneFormation: 12.5
  },
  {
    annee: 2025,
    chiffreAffaires: 13500000,
    masseSalarialeMensuelle: 2700000,
    beneficeNet: 2800000,
    nombreEleves: 160,
    tauxRecouvrement: 94,
    satisfactionParents: 89,
    moyenneGenerale: 12.2,
    totalAbsences: 155,
    tailleMoyenneClasse: 53,
    ratioFormation: 1.8,
    adherenceJobRole: 84,
    noteMoyenneFormation: 14.2
  }
];

export interface BudgetPrevisionnel {
  poste: string;
  categorie: 'Revenu' | 'Charge';
  budgetPrevu: number;
  realiseReel?: number;
}

export const mockBudget2026: BudgetPrevisionnel[] = [
  {
    poste: 'Services vendus (Frais de scolarité & inscription)',
    categorie: 'Revenu',
    budgetPrevu: 15500000
  },
  {
    poste: 'Frais de dossier & divers',
    categorie: 'Revenu',
    budgetPrevu: 600000
  },
  {
    poste: 'Masse salariale annuelle (Enseignants & admin)',
    categorie: 'Charge',
    budgetPrevu: 33000000
  },
  {
    poste: 'Achats de fournitures & entretien scolaire',
    categorie: 'Charge',
    budgetPrevu: 1800000
  },
  {
    poste: 'Loyers et charges locatives',
    categorie: 'Charge',
    budgetPrevu: 3600000
  },
  {
    poste: 'Fluides (Eau, électricité, internet)',
    categorie: 'Charge',
    budgetPrevu: 1200000
  },
  {
    poste: 'Frais de formation et stages RH',
    categorie: 'Charge',
    budgetPrevu: 800000
  },
  {
    poste: 'Matériel, mobilier & équipements',
    categorie: 'Charge',
    budgetPrevu: 2000000
  }
];
