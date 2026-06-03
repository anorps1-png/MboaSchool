import { Enseignant } from '@/types/domain';

export const mockTeachers: Enseignant[] = [
  {
    id: 'teach-1',
    prenom: 'Dieudonné',
    nom: 'Atangana',
    email: 'd.atangana@ecole.cm',
    telephone: '+237 677 12 34 56',
    genre: 'M',
    matieresId: ['mat-maths'],
    classesId: ['cls-term-d', 'cls-sec-c'],
    statut: 'active',
    dateRecrutement: '2018-09-01',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'teach-2',
    prenom: 'Chantal',
    nom: 'Bella',
    email: 'c.bella@ecole.cm',
    telephone: '+237 699 23 45 67',
    genre: 'F',
    matieresId: ['mat-phys'],
    classesId: ['cls-term-d'],
    statut: 'active',
    dateRecrutement: '2020-09-01',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'teach-3',
    prenom: 'Marthe',
    nom: 'Ngo',
    email: 'm.ngo@ecole.cm',
    telephone: '+237 681 34 56 78',
    genre: 'F',
    matieresId: ['mat-fran'],
    classesId: ['cls-term-d', 'cls-sec-c'],
    statut: 'active',
    dateRecrutement: '2015-09-01',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80'
  }
];
