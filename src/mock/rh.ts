import { MembrePersonnel, MasseSalarialeHistorique, AbsenceRecord, MouvementPersonnel, EvaluationRH, FormationRH } from '../types/domain';

export const mockPersonnel: MembrePersonnel[] = [
  {
    id: 'pers-1',
    nom: 'Mvogo',
    prenom: 'Marc',
    email: 'm.mvogo@ecole.cm',
    telephone: '+237 675 44 88 12',
    sexe: 'M',
    categorie: 'Administration',
    typeContrat: 'CDI',
    salaireDeBase: 350000,
    dateEmbauche: '2012-04-10',
    statut: 'actif'
  },
  {
    id: 'teach-1', // correspond à teach-1 de teachers.ts
    nom: 'Atangana',
    prenom: 'Dieudonné',
    email: 'd.atangana@ecole.cm',
    telephone: '+237 677 12 34 56',
    sexe: 'M',
    categorie: 'Enseignant',
    typeContrat: 'CDI',
    salaireDeBase: 250000,
    dateEmbauche: '2018-09-01',
    statut: 'actif'
  },
  {
    id: 'teach-2', // correspond à teach-2 de teachers.ts
    nom: 'Bella',
    prenom: 'Chantal',
    email: 'c.bella@ecole.cm',
    telephone: '+237 699 23 45 67',
    sexe: 'F',
    categorie: 'Enseignant',
    typeContrat: 'CDI',
    salaireDeBase: 240000,
    dateEmbauche: '2020-09-01',
    statut: 'actif'
  },
  {
    id: 'teach-3', // correspond à teach-3 de teachers.ts
    nom: 'Ngo',
    prenom: 'Marthe',
    email: 'm.ngo@ecole.cm',
    telephone: '+237 681 34 56 78',
    sexe: 'F',
    categorie: 'Enseignant',
    typeContrat: 'CDI',
    salaireDeBase: 260000,
    dateEmbauche: '2015-09-01',
    statut: 'actif'
  },
  {
    id: 'pers-5',
    nom: 'Nlate',
    prenom: 'Honoré',
    email: 'h.nlate@ecole.cm',
    telephone: '+237 670 11 22 33',
    sexe: 'M',
    categorie: 'Administration',
    typeContrat: 'CDI',
    salaireDeBase: 450000,
    dateEmbauche: '2010-09-01',
    statut: 'actif'
  },
  {
    id: 'pers-6',
    nom: 'Ndzana',
    prenom: 'Carine',
    email: 'c.ndzana@ecole.cm',
    telephone: '+237 690 99 88 77',
    sexe: 'F',
    categorie: 'Administration',
    typeContrat: 'CDD',
    salaireDeBase: 150000,
    dateEmbauche: '2024-09-01',
    statut: 'actif'
  },
  {
    id: 'pers-7',
    nom: 'Tchakounté',
    prenom: 'Joseph',
    email: 'j.tchakounte@ecole.cm',
    telephone: '+237 655 45 67 89',
    sexe: 'M',
    categorie: 'Technique',
    typeContrat: 'CDI',
    salaireDeBase: 220000,
    dateEmbauche: '2021-11-15',
    statut: 'actif'
  },
  {
    id: 'pers-8',
    nom: 'Ondoua',
    prenom: 'Jean-Baptiste',
    email: 'jb.ondoua@ecole.cm',
    telephone: '+237 678 90 12 34',
    sexe: 'M',
    categorie: 'Personnel d\'appui',
    typeContrat: 'CDI',
    salaireDeBase: 180000,
    dateEmbauche: '2017-02-01',
    statut: 'actif'
  },
  {
    id: 'pers-9',
    nom: 'Kamga',
    prenom: 'Pauline',
    email: 'p.kamga@ecole.cm',
    telephone: '+237 693 87 65 43',
    sexe: 'F',
    categorie: 'Personnel d\'appui',
    typeContrat: 'CDD',
    salaireDeBase: 160000,
    dateEmbauche: '2024-01-10',
    statut: 'actif'
  },
  {
    id: 'pers-10',
    nom: 'Eto\'o',
    prenom: 'Samuel',
    email: 's.etoo@ecole.cm',
    telephone: '+237 651 22 33 44',
    sexe: 'M',
    categorie: 'Personnel d\'appui',
    typeContrat: 'Intérimaire',
    salaireDeBase: 120000,
    dateEmbauche: '2025-10-12',
    statut: 'actif'
  },
  {
    id: 'pers-11',
    nom: 'Mengue',
    prenom: 'Suzanne',
    email: 's.mengue@ecole.cm',
    telephone: '+237 680 77 66 55',
    sexe: 'F',
    categorie: 'Personnel d\'appui',
    typeContrat: 'Stagiaire',
    salaireDeBase: 80000,
    dateEmbauche: '2026-01-05',
    statut: 'actif'
  },
  {
    id: 'pers-12',
    nom: 'Noah',
    prenom: 'Yves',
    email: 'y.noah@ecole.cm',
    telephone: '+237 671 00 99 88',
    sexe: 'M',
    categorie: 'Technique',
    typeContrat: 'Intérimaire',
    salaireDeBase: 130000,
    dateEmbauche: '2025-05-10',
    statut: 'actif'
  }
];

export const mockMasseSalarialeHistorique: MasseSalarialeHistorique[] = [
  // Mensuel (5 derniers mois de l'année scolaire en cours)
  {
    periode: '2026-01',
    valeurTotal: 2640000,
    nombreSalaries: 12,
    salaireMoyen: 220000,
    interessement: 0,
    tauxCroissance: 0.5
  },
  {
    periode: '2026-02',
    valeurTotal: 2640000,
    nombreSalaries: 12,
    salaireMoyen: 220000,
    interessement: 0,
    tauxCroissance: 0.0
  },
  {
    periode: '2026-03',
    valeurTotal: 2640000,
    nombreSalaries: 12,
    salaireMoyen: 220000,
    interessement: 200000, // Prime versée en mars
    tauxCroissance: 0.0
  },
  {
    periode: '2026-04',
    valeurTotal: 2750000, // Augmentation d'effectif ou de salaire
    nombreSalaries: 12,
    salaireMoyen: 229166,
    interessement: 0,
    tauxCroissance: 4.1
  },
  {
    periode: '2026-05',
    valeurTotal: 2750000,
    nombreSalaries: 12,
    salaireMoyen: 229166,
    interessement: 0,
    tauxCroissance: 0.0
  },

  // Annuel (3 dernières années scolaires complètes)
  {
    periode: 'Année 2023',
    valeurTotal: 28500000,
    nombreSalaries: 10,
    salaireMoyen: 237500,
    interessement: 500000,
    tauxCroissance: 8.2
  },
  {
    periode: 'Année 2024',
    valeurTotal: 30800000,
    nombreSalaries: 11,
    salaireMoyen: 233333,
    interessement: 600000,
    tauxCroissance: 8.0
  },
  {
    periode: 'Année 2025',
    valeurTotal: 32400000,
    nombreSalaries: 12,
    salaireMoyen: 225000,
    interessement: 800000,
    tauxCroissance: 5.2
  }
];

export const mockAbsences: AbsenceRecord[] = [
  {
    id: 'abs-1',
    personnelId: 'pers-1',
    nomPersonnel: 'Mvogo Marc',
    dateDebut: '2026-02-10',
    dateFin: '2026-02-13',
    motif: 'Maladie',
    dureeJours: 3
  },
  {
    id: 'abs-2',
    personnelId: 'teach-1',
    nomPersonnel: 'Atangana Dieudonné',
    dateDebut: '2026-03-05',
    dateFin: '2026-03-10',
    motif: 'Congé',
    dureeJours: 5
  },
  {
    id: 'abs-3',
    personnelId: 'pers-6',
    nomPersonnel: 'Ndzana Carine',
    dateDebut: '2026-04-01',
    dateFin: '2026-05-15',
    motif: 'Maternité',
    dureeJours: 45
  },
  {
    id: 'abs-4',
    personnelId: 'pers-11',
    nomPersonnel: 'Mengue Suzanne',
    dateDebut: '2026-05-12',
    dateFin: '2026-05-14',
    motif: 'Maladie',
    dureeJours: 2
  },
  {
    id: 'abs-5',
    personnelId: 'pers-8',
    nomPersonnel: 'Ondoua Jean-Baptiste',
    dateDebut: '2026-01-20',
    dateFin: '2026-01-21',
    motif: 'Injustifié',
    dureeJours: 1
  },
  {
    id: 'abs-6',
    personnelId: 'pers-9',
    nomPersonnel: 'Kamga Pauline',
    dateDebut: '2026-05-02',
    dateFin: '2026-05-06',
    motif: 'Congé',
    dureeJours: 4
  },
  {
    id: 'abs-7',
    personnelId: 'pers-7',
    nomPersonnel: 'Tchakounté Joseph',
    dateDebut: '2026-03-18',
    dateFin: '2026-03-20',
    motif: 'Autre',
    dureeJours: 2
  }
];

export const mockMouvements: MouvementPersonnel[] = [
  {
    id: 'mov-1',
    personnelId: 'pers-11',
    nomPersonnel: 'Mengue Suzanne',
    type: 'embauche',
    date: '2026-01-05',
    details: 'Embauche en tant que stagiaire aide-maternelle'
  },
  {
    id: 'mov-2',
    personnelId: 'pers-10',
    nomPersonnel: 'Eto\'o Samuel',
    type: 'embauche',
    date: '2025-10-12',
    details: 'Recrutement chauffeur intérimaire'
  },
  {
    id: 'mov-3',
    personnelId: 'pers-old-1',
    nomPersonnel: 'Abogo Pierre',
    type: 'depart_volontaire',
    date: '2025-12-15',
    details: 'Départ volontaire vers l\'enseignement supérieur (ancien prof d\'histoire)'
  },
  {
    id: 'mov-4',
    personnelId: 'pers-old-2',
    nomPersonnel: 'Tagne Michel',
    type: 'licenciement',
    date: '2025-11-30',
    details: 'Licenciement pour retards répétés et manquement au règlement'
  },
  {
    id: 'mov-5',
    personnelId: 'teach-2',
    nomPersonnel: 'Bella Chantal',
    type: 'mutation',
    date: '2025-09-05',
    details: 'Mutation du campus annexe vers le campus principal Vogt'
  }
];

export const mockEvaluationsRH: EvaluationRH[] = [
  {
    id: 'eval-1',
    enseignantId: 'teach-1',
    nomEnseignant: 'Atangana Dieudonné',
    noteMoyenne: 88,
    adherenceJobRole: 90,
    adherenceValeurs: 95,
    noteFormationMoyenne: 16.5,
    dateEvaluation: '2026-04-15',
    evaluateur: 'Nlate Honoré (Principal)'
  },
  {
    id: 'eval-2',
    enseignantId: 'teach-2',
    nomEnseignant: 'Bella Chantal',
    noteMoyenne: 82,
    adherenceJobRole: 85,
    adherenceValeurs: 88,
    noteFormationMoyenne: 14.0,
    dateEvaluation: '2026-04-16',
    evaluateur: 'Nlate Honoré (Principal)'
  },
  {
    id: 'eval-3',
    enseignantId: 'teach-3',
    nomEnseignant: 'Ngo Marthe',
    noteMoyenne: 91,
    adherenceJobRole: 95,
    adherenceValeurs: 92,
    noteFormationMoyenne: 18.0,
    dateEvaluation: '2026-04-17',
    evaluateur: 'Nlate Honoré (Principal)'
  }
];

export const mockFormations: FormationRH[] = [
  {
    id: 'form-1',
    theme: 'Nouvelles approches de la pédagogie des sciences physiques',
    dateDebut: '2025-10-10',
    dateFin: '2025-10-12',
    coutTotal: 250000,
    organisme: 'ENS Yaoundé',
    statut: 'terminé',
    beneficiairesIds: ['teach-2']
  },
  {
    id: 'form-2',
    theme: 'Sécurité informatique et protection des données académiques',
    dateDebut: '2026-02-15',
    dateFin: '2026-02-16',
    coutTotal: 180000,
    organisme: 'IAI Cameroun',
    statut: 'terminé',
    beneficiairesIds: ['pers-7', 'pers-1']
  },
  {
    id: 'form-3',
    theme: 'Sensibilisation aux gestes de premiers secours en établissement',
    dateDebut: '2026-06-20',
    dateFin: '2026-06-22',
    coutTotal: 300000,
    organisme: 'Croix-Rouge Camerounaise',
    statut: 'planifié',
    beneficiairesIds: ['pers-9', 'pers-8', 'pers-11']
  }
];
