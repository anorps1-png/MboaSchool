export interface SurveyHistoricalData {
  year: number;
  score: number; // /10
}

export interface Survey {
  id: string;
  titre: string;
  categorie: 'Parents' | 'Employés' | 'Communauté';
  sousCategorie: string;
  statut: 'En cours' | 'Clôturée';
  participants: number;
  scoreMoyen: number; // /10
  historique: SurveyHistoricalData[];
}

export const mockSurveys: Survey[] = [
  {
    id: 's1',
    titre: 'Satisfaction Globale Rentrée 2026',
    categorie: 'Parents',
    sousCategorie: 'Globale',
    statut: 'En cours',
    participants: 452,
    scoreMoyen: 8.2,
    historique: [
      { year: 2024, score: 7.1 },
      { year: 2025, score: 7.8 },
      { year: 2026, score: 8.2 },
    ]
  },
  {
    id: 's2',
    titre: 'Section Francophone - Bilan 1er Trimestre',
    categorie: 'Parents',
    sousCategorie: 'Francophone',
    statut: 'Clôturée',
    participants: 210,
    scoreMoyen: 7.5,
    historique: [
      { year: 2024, score: 6.9 },
      { year: 2025, score: 7.2 },
      { year: 2026, score: 7.5 },
    ]
  },
  {
    id: 's3',
    titre: 'Section Anglophone - Bilan 1er Trimestre',
    categorie: 'Parents',
    sousCategorie: 'Anglophone',
    statut: 'Clôturée',
    participants: 134,
    scoreMoyen: 8.8,
    historique: [
      { year: 2024, score: 8.0 },
      { year: 2025, score: 8.5 },
      { year: 2026, score: 8.8 },
    ]
  },
  {
    id: 's4',
    titre: 'Qualité des repas Crèche',
    categorie: 'Parents',
    sousCategorie: 'Crèche',
    statut: 'En cours',
    participants: 45,
    scoreMoyen: 9.1,
    historique: [
      { year: 2024, score: 8.5 },
      { year: 2025, score: 8.9 },
      { year: 2026, score: 9.1 },
    ]
  },
  {
    id: 's5',
    titre: 'QVT et Engagement des Enseignants',
    categorie: 'Employés',
    sousCategorie: 'Engagement',
    statut: 'En cours',
    participants: 58,
    scoreMoyen: 7.9,
    historique: [
      { year: 2024, score: 7.0 },
      { year: 2025, score: 7.4 },
      { year: 2026, score: 7.9 },
    ]
  },
  {
    id: 's6',
    titre: 'Besoins en formation continue',
    categorie: 'Employés',
    sousCategorie: 'Compétences',
    statut: 'Clôturée',
    participants: 62,
    scoreMoyen: 8.5,
    historique: [
      { year: 2024, score: 6.5 },
      { year: 2025, score: 7.5 },
      { year: 2026, score: 8.5 },
    ]
  },
  {
    id: 's7',
    titre: 'Impact environnemental et Voisinage',
    categorie: 'Communauté',
    sousCategorie: 'Environnement',
    statut: 'Clôturée',
    participants: 120,
    scoreMoyen: 9.4,
    historique: [
      { year: 2024, score: 8.1 },
      { year: 2025, score: 9.0 },
      { year: 2026, score: 9.4 },
    ]
  }
];
