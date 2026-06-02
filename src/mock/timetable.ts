import { Cours } from '@/types/domain';

export const mockLessons: Cours[] = [
  // Terminale D
  { id: 'les-101', classe: 'Terminale D', matiere: 'Mathématiques', enseignantNom: 'M. Atangana', jourSemaine: 1, heureDebut: '08:00', heureFin: '10:00', salle: 'Salle 12', couleur: 'indigo' },
  { id: 'les-102', classe: 'Terminale D', matiere: 'Physique-Chimie', enseignantNom: 'Chantal Bella', jourSemaine: 1, heureDebut: '10:15', heureFin: '12:15', salle: 'Labo Physique', couleur: 'red' },
  { id: 'les-103', classe: 'Terminale D', matiere: 'Français', enseignantNom: 'Marthe Ngo', jourSemaine: 1, heureDebut: '13:00', heureFin: '15:00', salle: 'Salle 12', couleur: 'emerald' },

  { id: 'les-104', classe: 'Terminale D', matiere: 'SVT', enseignantNom: 'M. Kamdem', jourSemaine: 2, heureDebut: '08:00', heureFin: '10:00', salle: 'Labo SVT', couleur: 'amber' },
  { id: 'les-105', classe: 'Terminale D', matiere: 'Anglais', enseignantNom: 'Jean Ndzengue', jourSemaine: 2, heureDebut: '10:15', heureFin: '12:15', salle: 'Salle 12', couleur: 'sky' },
  { id: 'les-106', classe: 'Terminale D', matiere: 'Mathématiques', enseignantNom: 'M. Atangana', jourSemaine: 2, heureDebut: '13:00', heureFin: '15:00', salle: 'Salle 12', couleur: 'indigo' },

  { id: 'les-107', classe: 'Terminale D', matiere: 'Physique-Chimie', enseignantNom: 'Chantal Bella', jourSemaine: 3, heureDebut: '08:00', heureFin: '10:00', salle: 'Labo Physique', couleur: 'red' },
  { id: 'les-108', classe: 'Terminale D', matiere: 'Philosophie', enseignantNom: 'M. Tene', jourSemaine: 3, heureDebut: '10:15', heureFin: '12:15', salle: 'Salle 12', couleur: 'purple' },

  { id: 'les-109', classe: 'Terminale D', matiere: 'SVT', enseignantNom: 'M. Kamdem', jourSemaine: 4, heureDebut: '08:00', heureFin: '10:00', salle: 'Labo SVT', couleur: 'amber' },
  { id: 'les-110', classe: 'Terminale D', matiere: 'Histoire-Géo', enseignantNom: 'Mme Ekotto', jourSemaine: 4, heureDebut: '10:15', heureFin: '12:15', salle: 'Salle 12', couleur: 'pink' },
  { id: 'les-111', classe: 'Terminale D', matiere: 'EPS', enseignantNom: 'M. Song', jourSemaine: 4, heureDebut: '13:00', heureFin: '15:00', salle: 'Terrain', couleur: 'orange' },

  { id: 'les-112', classe: 'Terminale D', matiere: 'Mathématiques', enseignantNom: 'M. Atangana', jourSemaine: 5, heureDebut: '08:00', heureFin: '10:00', salle: 'Salle 12', couleur: 'indigo' },
  { id: 'les-113', classe: 'Terminale D', matiere: 'Anglais', enseignantNom: 'Jean Ndzengue', jourSemaine: 5, heureDebut: '10:15', heureFin: '12:15', salle: 'Salle 12', couleur: 'sky' },
  { id: 'les-114', classe: 'Terminale D', matiere: 'TPE / Club', enseignantNom: 'M. Kamdem', jourSemaine: 6, heureDebut: '08:00', heureFin: '11:00', salle: 'Salle 12', couleur: 'teal' },

  // Seconde C
  { id: 'les-201', classe: 'Seconde C', matiere: 'Mathématiques', enseignantNom: 'M. Atangana', jourSemaine: 1, heureDebut: '10:15', heureFin: '12:15', salle: 'Salle 8', couleur: 'indigo' },
  { id: 'les-202', classe: 'Seconde C', matiere: 'Français', enseignantNom: 'Marthe Ngo', jourSemaine: 1, heureDebut: '08:00', heureFin: '10:00', salle: 'Salle 8', couleur: 'emerald' },
  { id: 'les-203', classe: 'Seconde C', matiere: 'Physique-Chimie', enseignantNom: 'M. Tagne', jourSemaine: 2, heureDebut: '08:00', heureFin: '10:00', salle: 'Salle 8', couleur: 'red' },
  { id: 'les-204', classe: 'Seconde C', matiere: 'Anglais', enseignantNom: 'Jean Ndzengue', jourSemaine: 2, heureDebut: '13:00', heureFin: '15:00', salle: 'Salle 8', couleur: 'sky' },
  { id: 'les-205', classe: 'Seconde C', matiere: 'SVT', enseignantNom: 'Mme Mballa', jourSemaine: 3, heureDebut: '10:15', heureFin: '12:15', salle: 'Salle 8', couleur: 'amber' },
  { id: 'les-206', classe: 'Seconde C', matiere: 'Mathématiques', enseignantNom: 'M. Atangana', jourSemaine: 4, heureDebut: '08:00', heureFin: '10:00', salle: 'Salle 8', couleur: 'indigo' },
  { id: 'les-207', classe: 'Seconde C', matiere: 'Physique-Chimie', enseignantNom: 'M. Tagne', jourSemaine: 5, heureDebut: '10:15', heureFin: '12:15', salle: 'Salle 8', couleur: 'red' },

  // 3ème M1
  { id: 'les-301', classe: '3ème M1', matiere: 'Mathématiques', enseignantNom: 'M. Eboa', jourSemaine: 1, heureDebut: '08:00', heureFin: '10:00', salle: 'Salle 5', couleur: 'indigo' },
  { id: 'les-302', classe: '3ème M1', matiere: 'Français', enseignantNom: 'M. Ndi', jourSemaine: 1, heureDebut: '10:15', heureFin: '12:15', salle: 'Salle 5', couleur: 'emerald' },
  { id: 'les-303', classe: '3ème M1', matiere: 'Histoire-Géo-ECM', enseignantNom: 'Mme Ekotto', jourSemaine: 2, heureDebut: '10:15', heureFin: '12:15', salle: 'Salle 5', couleur: 'pink' },
  { id: 'les-304', classe: '3ème M1', matiere: 'Physique-Chimie', enseignantNom: 'M. Tagne', jourSemaine: 3, heureDebut: '08:00', heureFin: '10:00', salle: 'Salle 5', couleur: 'red' },
  { id: 'les-305', classe: '3ème M1', matiere: 'Mathématiques', enseignantNom: 'M. Eboa', jourSemaine: 4, heureDebut: '10:15', heureFin: '12:15', salle: 'Salle 5', couleur: 'indigo' },

  // 6ème A
  { id: 'les-601', classe: '6ème A', matiere: 'Français', enseignantNom: 'M. Ndi', jourSemaine: 1, heureDebut: '08:00', heureFin: '10:00', salle: 'Salle 1', couleur: 'emerald' },
  { id: 'les-602', classe: '6ème A', matiere: 'Mathématiques', enseignantNom: 'M. Eboa', jourSemaine: 2, heureDebut: '08:00', heureFin: '10:00', salle: 'Salle 1', couleur: 'indigo' },
  { id: 'les-603', classe: '6ème A', matiere: 'Sciences', enseignantNom: 'Mme Mballa', jourSemaine: 3, heureDebut: '08:00', heureFin: '10:00', salle: 'Salle 1', couleur: 'amber' },
  { id: 'les-604', classe: '6ème A', matiere: 'Anglais', enseignantNom: 'Jean Ndzengue', jourSemaine: 4, heureDebut: '10:15', heureFin: '12:15', salle: 'Salle 1', couleur: 'sky' }
];
