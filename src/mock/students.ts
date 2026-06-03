import { Eleve } from '@/types/domain';

export const mockStudents: Eleve[] = [
  {
    id: 'stud-1',
    matricule: '26YAE001',
    prenom: 'Jean-Pierre',
    nom: 'Fouda',
    sexe: 'M',
    dateNaissance: '2010-04-12',
    lieuNaissance: 'Yaoundé',
    classeId: 'cls-term-d',
    anneeScolaireId: 'as-2025',
    nomParent: 'Emmanuel Fouda',
    telephoneParent: '+237 677 88 99 00',
    emailParent: 'emmanuel.fouda@gmail.com',
    statut: 'actif',
    dateInscription: '2025-09-01',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    paiements: [
      { id: 'pay-101', eleveId: 'stud-1', date: '2025-09-01', montant: 50000, typeFrais: 'Inscription', statut: 'paid', reference: 'REC-2025-001', modePaiement: 'MTN Mobile Money' }
    ],
    notes: [
      { id: 'note-101', eleveId: 'stud-1', matiereId: 'mat-maths', note: 14.5, trimestre: 'Trimestre 1', enseignantId: 'teach-1', dateSaisie: '2025-10-15' },
      { id: 'note-102', eleveId: 'stud-1', matiereId: 'mat-phys', note: 16, trimestre: 'Trimestre 1', enseignantId: 'teach-2', dateSaisie: '2025-10-15' }
    ],
    bulletins: [
      { id: 'bul-101', eleveId: 'stud-1', classeId: 'cls-term-d', anneeScolaireId: 'as-2025', trimestre: 'Trimestre 1', totalPoints: 122, moyenne: 15.25, rang: 1, mention: 'Très Bien', appreciationEnseignant: 'Excellent travail' }
    ]
  },
  {
    id: 'stud-2',
    matricule: '26YAE002',
    prenom: 'Marcelle',
    nom: 'Ngo Nsoga',
    sexe: 'F',
    dateNaissance: '2011-08-23',
    lieuNaissance: 'Douala',
    classeId: 'cls-sec-c',
    anneeScolaireId: 'as-2025',
    nomParent: 'Marie-Louise Nsoga',
    telephoneParent: '+237 699 11 22 33',
    emailParent: 'ml.nsoga@yahoo.fr',
    statut: 'actif',
    dateInscription: '2025-09-02',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    paiements: [
      { id: 'pay-201', eleveId: 'stud-2', date: '2025-09-02', montant: 50000, typeFrais: 'Inscription', statut: 'paid', reference: 'REC-2025-005', modePaiement: 'Orange Money' }
    ],
    notes: [
      { id: 'note-201', eleveId: 'stud-2', matiereId: 'mat-maths', note: 11, trimestre: 'Trimestre 1', enseignantId: 'teach-1', dateSaisie: '2025-10-15' },
      { id: 'note-202', eleveId: 'stud-2', matiereId: 'mat-fran', note: 15, trimestre: 'Trimestre 1', enseignantId: 'teach-3', dateSaisie: '2025-10-15' }
    ],
    bulletins: [
      { id: 'bul-201', eleveId: 'stud-2', classeId: 'cls-sec-c', anneeScolaireId: 'as-2025', trimestre: 'Trimestre 1', totalPoints: 104, moyenne: 13, rang: 5, mention: 'Assez Bien' }
    ]
  },
  // Exemple maternelle
  {
    id: 'stud-3',
    matricule: '26YAE003',
    prenom: 'Leo',
    nom: 'Messi',
    sexe: 'M',
    dateNaissance: '2020-04-12',
    lieuNaissance: 'Yaoundé',
    classeId: 'cls-mat-gs',
    anneeScolaireId: 'as-2025',
    nomParent: 'Jorge Messi',
    telephoneParent: '+237 677 88 99 00',
    emailParent: 'jorge@gmail.com',
    statut: 'actif',
    dateInscription: '2025-09-01',
    paiements: [],
    notes: [
      { id: 'note-301', eleveId: 'stud-3', matiereId: 'mat-graphisme', evaluationMaternelle: 'Acquis', trimestre: 'Trimestre 1', enseignantId: 'teach-4', dateSaisie: '2025-10-15' },
      { id: 'note-302', eleveId: 'stud-3', matiereId: 'mat-langage', evaluationMaternelle: 'En cours', trimestre: 'Trimestre 1', enseignantId: 'teach-4', dateSaisie: '2025-10-15' }
    ],
    bulletins: []
  }
];
