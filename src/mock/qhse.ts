export interface IncidentQHSE {
  id: string;
  date: string;
  lieu: string;
  gravite: 'Faible' | 'Moyenne' | 'Grave';
  description: string;
  statut: 'Résolu' | 'En traitement';
}

export interface ReunionQHSE {
  id: string;
  date: string;
  titre: string;
  participants: number;
  duree: string;
}

export interface DepenseQHSE {
  id: string;
  date: string;
  libelle: string;
  montant: number;
}

export interface EvaluationQHSE {
  id: string;
  mois: string;
  score: number; // /10
  remarques: string;
}

export const mockIncidentsQHSE: IncidentQHSE[] = [
  {
    id: 'i1',
    date: '2026-05-12',
    lieu: 'Cour de récréation primaire',
    gravite: 'Faible',
    description: 'Chute légère d\'un élève (écorchure genou). Soins infirmiers immédiats.',
    statut: 'Résolu'
  },
  {
    id: 'i2',
    date: '2026-04-28',
    lieu: 'Laboratoire de chimie',
    gravite: 'Moyenne',
    description: 'Bris de verrerie avec projection mineure. Protocole de nettoyage appliqué.',
    statut: 'Résolu'
  },
  {
    id: 'i3',
    date: '2026-06-01',
    lieu: 'Parking personnel',
    gravite: 'Faible',
    description: 'Accrochage entre deux véhicules à faible allure.',
    statut: 'En traitement'
  }
];

export const mockReunionsQHSE: ReunionQHSE[] = [
  { id: 'r1', date: '2026-05-02', titre: 'Comité CHSCT Mensuel', participants: 8, duree: '1h30' },
  { id: 'r2', date: '2026-06-03', titre: 'Sensibilisation Incendie (Personnel)', participants: 45, duree: '2h00' }
];

export const mockDepensesQHSE: DepenseQHSE[] = [
  { id: 'd1', date: '2026-05-10', libelle: 'Recharge extincteurs annuels', montant: 150000 },
  { id: 'd2', date: '2026-05-15', libelle: 'Renouvellement Boîtes à pharmacie', montant: 45000 },
  { id: 'd3', date: '2026-06-01', libelle: 'Achat de balises de signalisation cour', montant: 35000 }
];

export const mockEvaluationsQHSE: EvaluationQHSE[] = [
  { id: 'e1', mois: 'Mars 2026', score: 8.5, remarques: 'Bonne conformité générale. Prudence sur les stocks labo.' },
  { id: 'e2', mois: 'Avril 2026', score: 9.0, remarques: 'Excellent suivi des recommandations CHSCT.' },
  { id: 'e3', mois: 'Mai 2026', score: 8.8, remarques: 'Formation incendie complétée à 95%.' }
];
