import { Enseignant } from '@/types/domain';

export const mockTeachers: Enseignant[] = [
  {
    id: 'teach-1',
    prenom: 'Dieudonné',
    nom: 'Atangana',
    email: 'd.atangana@ecole.cm',
    telephone: '+237 677 12 34 56',
    genre: 'M',
    matieres: ['Mathématiques'],
    classes: ['Terminale D', 'Seconde C'],
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
    matieres: ['Physique-Chimie'],
    classes: ['Terminale D'],
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
    matieres: ['Français'],
    classes: ['Terminale D', 'Seconde C'],
    statut: 'active',
    dateRecrutement: '2015-09-01',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'teach-4',
    prenom: 'Samuel',
    nom: 'Eboa',
    email: 's.eboa@ecole.cm',
    telephone: '+237 675 45 67 89',
    genre: 'M',
    matieres: ['Mathématiques'],
    classes: ['3ème M1', '6ème A'],
    statut: 'active',
    dateRecrutement: '2021-09-01',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'teach-5',
    prenom: 'Jean',
    nom: 'Ndzengue',
    email: 'j.ndzengue@ecole.cm',
    telephone: '+237 691 56 78 90',
    genre: 'M',
    matieres: ['Anglais'],
    classes: ['Terminale D', 'Seconde C', '6ème A'],
    statut: 'active',
    dateRecrutement: '2019-09-01',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'teach-6',
    prenom: 'Rigobert',
    nom: 'Tagne',
    email: 'r.tagne@ecole.cm',
    telephone: '+237 670 67 89 01',
    genre: 'M',
    matieres: ['Physique-Chimie'],
    classes: ['Seconde C', '3ème M1'],
    statut: 'inactive',
    dateRecrutement: '2022-09-01',
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80'
  }
];
