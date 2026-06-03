import { Cours } from '@/types/domain';

export const mockLessons: Cours[] = [
  // Terminale D
  { id: 'les-101', classeId: 'cls-term-d', matiereId: 'mat-maths', enseignantId: 'teach-1', jourSemaine: 1, heureDebut: '08:00', heureFin: '10:00', salle: 'Salle 12', couleur: 'indigo' },
  { id: 'les-102', classeId: 'cls-term-d', matiereId: 'mat-phys', enseignantId: 'teach-2', jourSemaine: 1, heureDebut: '10:15', heureFin: '12:15', salle: 'Labo Physique', couleur: 'red' },
  { id: 'les-103', classeId: 'cls-term-d', matiereId: 'mat-fran', enseignantId: 'teach-3', jourSemaine: 1, heureDebut: '13:00', heureFin: '15:00', salle: 'Salle 12', couleur: 'emerald' },

  // Seconde C
  { id: 'les-201', classeId: 'cls-sec-c', matiereId: 'mat-maths', enseignantId: 'teach-1', jourSemaine: 1, heureDebut: '10:15', heureFin: '12:15', salle: 'Salle 8', couleur: 'indigo' },
  { id: 'les-202', classeId: 'cls-sec-c', matiereId: 'mat-fran', enseignantId: 'teach-3', jourSemaine: 1, heureDebut: '08:00', heureFin: '10:00', salle: 'Salle 8', couleur: 'emerald' }
];
