import { Eleve, Paiement, Note } from '@/types/domain';

export const mockStudents: Eleve[] = [
  {
    id: 'stud-1',
    matricule: '26YAE001',
    prenom: 'Jean-Pierre',
    nom: 'Fouda',
    genre: 'M',
    dateNaissance: '2010-04-12',
    lieuNaissance: 'Yaoundé',
    classe: 'Terminale D',
    nomParent: 'Emmanuel Fouda',
    telephoneParent: '+237 677 88 99 00',
    emailParent: 'emmanuel.fouda@gmail.com',
    statut: 'actif',
    dateInscription: '2025-09-01',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    paiements: [
      { id: 'pay-101', eleveId: 'stud-1', date: '2025-09-01', montant: 50000, typeFrais: 'Inscription', statut: 'paid', reference: 'REC-2025-001', modePaiement: 'MTN Mobile Money' },
      { id: 'pay-102', eleveId: 'stud-1', date: '2025-11-15', montant: 150000, typeFrais: 'Scolarité', statut: 'paid', reference: 'REC-2025-084', modePaiement: 'Virement Bancaire' },
      { id: 'pay-103', eleveId: 'stud-1', date: '2026-02-10', montant: 100000, typeFrais: 'Scolarité', statut: 'paid', reference: 'REC-2026-142', modePaiement: 'Orange Money' }
    ],
    notes: [
      { id: 'note-101', eleveId: 'stud-1', matiere: 'Mathématiques', note: 14.5, coefficient: 4, trimestre: 'Trimestre 1', enseignantNom: 'M. Atangana' },
      { id: 'note-102', eleveId: 'stud-1', matiere: 'Physique-Chimie', note: 16, coefficient: 4, trimestre: 'Trimestre 1', enseignantNom: 'Mme Bella' },
      { id: 'note-103', eleveId: 'stud-1', matiere: 'SVT', note: 13, coefficient: 4, trimestre: 'Trimestre 1', enseignantNom: 'M. Kamdem' },
      { id: 'note-104', eleveId: 'stud-1', matiere: 'Français', note: 11, coefficient: 2, trimestre: 'Trimestre 1', enseignantNom: 'Mme Ngo' },
      { id: 'note-105', eleveId: 'stud-1', matiere: 'Anglais', note: 12.5, coefficient: 2, trimestre: 'Trimestre 1', enseignantNom: 'M. Ndzengue' },
      { id: 'note-106', eleveId: 'stud-1', matiere: 'Mathématiques', note: 15, coefficient: 4, trimestre: 'Trimestre 2', enseignantNom: 'M. Atangana' },
      { id: 'note-107', eleveId: 'stud-1', matiere: 'Physique-Chimie', note: 17.5, coefficient: 4, trimestre: 'Trimestre 2', enseignantNom: 'Mme Bella' }
    ]
  },
  {
    id: 'stud-2',
    matricule: '26YAE002',
    prenom: 'Marcelle',
    nom: 'Ngo Nsoga',
    genre: 'F',
    dateNaissance: '2011-08-23',
    lieuNaissance: 'Douala',
    classe: 'Seconde C',
    nomParent: 'Marie-Louise Nsoga',
    telephoneParent: '+237 699 11 22 33',
    emailParent: 'ml.nsoga@yahoo.fr',
    statut: 'actif',
    dateInscription: '2025-09-02',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    paiements: [
      { id: 'pay-201', eleveId: 'stud-2', date: '2025-09-02', montant: 50000, typeFrais: 'Inscription', statut: 'paid', reference: 'REC-2025-005', modePaiement: 'Orange Money' },
      { id: 'pay-202', eleveId: 'stud-2', date: '2025-10-05', montant: 100000, typeFrais: 'Scolarité', statut: 'paid', reference: 'REC-2025-021', modePaiement: 'Virement Bancaire' },
      { id: 'pay-203', eleveId: 'stud-2', date: '2026-01-20', montant: 50000, typeFrais: 'Scolarité', statut: 'pending', reference: 'REC-2026-099', modePaiement: 'MTN Mobile Money' }
    ],
    notes: [
      { id: 'note-201', eleveId: 'stud-2', matiere: 'Mathématiques', note: 11, coefficient: 5, trimestre: 'Trimestre 1', enseignantNom: 'M. Atangana' },
      { id: 'note-202', eleveId: 'stud-2', matiere: 'Physique-Chimie', note: 10.5, coefficient: 5, trimestre: 'Trimestre 1', enseignantNom: 'M. Tagne' },
      { id: 'note-203', eleveId: 'stud-2', matiere: 'SVT', note: 14, coefficient: 3, trimestre: 'Trimestre 1', enseignantNom: 'Mme Mballa' },
      { id: 'note-204', eleveId: 'stud-2', matiere: 'Français', note: 15, coefficient: 3, trimestre: 'Trimestre 1', enseignantNom: 'Mme Ngo' },
      { id: 'note-205', eleveId: 'stud-2', matiere: 'Anglais', note: 14, coefficient: 3, trimestre: 'Trimestre 1', enseignantNom: 'M. Ndzengue' }
    ]
  },
  {
    id: 'stud-3',
    matricule: '26YAE003',
    prenom: 'Amadou',
    nom: 'Ousmanou',
    genre: 'M',
    dateNaissance: '2012-01-05',
    lieuNaissance: 'Garoua',
    classe: '3ème M1',
    nomParent: 'Ousmanou Bello',
    telephoneParent: '+237 675 44 55 66',
    emailParent: 'ousmanoubello@gmail.com',
    statut: 'actif',
    dateInscription: '2025-09-03',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    paiements: [
      { id: 'pay-301', eleveId: 'stud-3', date: '2025-09-03', montant: 45000, typeFrais: 'Inscription', statut: 'paid', reference: 'REC-2025-009', modePaiement: 'Espèces' }
    ],
    notes: [
      { id: 'note-301', eleveId: 'stud-3', matiere: 'Mathématiques', note: 8, coefficient: 4, trimestre: 'Trimestre 1', enseignantNom: 'M. Eboa' },
      { id: 'note-302', eleveId: 'stud-3', matiere: 'Physique-Chimie', note: 9, coefficient: 2, trimestre: 'Trimestre 1', enseignantNom: 'M. Tagne' },
      { id: 'note-303', eleveId: 'stud-3', matiere: 'Français', note: 12, coefficient: 3, trimestre: 'Trimestre 1', enseignantNom: 'M. Ndi' },
      { id: 'note-304', eleveId: 'stud-3', matiere: 'Histoire-Géo-ECM', note: 14, coefficient: 3, trimestre: 'Trimestre 1', enseignantNom: 'Mme Ekotto' }
    ]
  },
  {
    id: 'stud-4',
    matricule: '26YAE004',
    prenom: 'Chloé',
    nom: 'Mvogo',
    genre: 'F',
    dateNaissance: '2014-06-15',
    lieuNaissance: 'Yaoundé',
    classe: '6ème A',
    nomParent: 'Sylvain Mvogo',
    telephoneParent: '+237 681 22 44 66',
    emailParent: 'sylvain.mvogo@gmail.com',
    statut: 'actif',
    dateInscription: '2025-09-01',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    paiements: [
      { id: 'pay-401', eleveId: 'stud-4', date: '2025-09-01', montant: 40000, typeFrais: 'Inscription', statut: 'paid', reference: 'REC-2025-002', modePaiement: 'Espèces' },
      { id: 'pay-402', eleveId: 'stud-4', date: '2025-10-10', montant: 80000, typeFrais: 'Scolarité', statut: 'paid', reference: 'REC-2025-032', modePaiement: 'Espèces' },
      { id: 'pay-403', eleveId: 'stud-4', date: '2026-01-15', montant: 80000, typeFrais: 'Scolarité', statut: 'paid', reference: 'REC-2026-081', modePaiement: 'Espèces' }
    ],
    notes: [
      { id: 'note-401', eleveId: 'stud-4', matiere: 'Mathématiques', note: 16.5, coefficient: 3, trimestre: 'Trimestre 1', enseignantNom: 'M. Eboa' },
      { id: 'note-402', eleveId: 'stud-4', matiere: 'Français', note: 17, coefficient: 4, trimestre: 'Trimestre 1', enseignantNom: 'M. Ndi' },
      { id: 'note-403', eleveId: 'stud-4', matiere: 'Sciences', note: 15, coefficient: 2, trimestre: 'Trimestre 1', enseignantNom: 'Mme Mballa' },
      { id: 'note-404', eleveId: 'stud-4', matiere: 'Anglais', note: 18, coefficient: 3, trimestre: 'Trimestre 1', enseignantNom: 'M. Ndzengue' }
    ]
  },
  {
    id: 'stud-5',
    matricule: '26YAE005',
    prenom: 'Daniel',
    nom: "Eto'o",
    genre: 'M',
    dateNaissance: '2009-11-30',
    lieuNaissance: 'Mbalmayo',
    classe: 'Terminale D',
    nomParent: "Samuel Eto'o Fils",
    telephoneParent: '+237 690 99 99 99',
    emailParent: 'samuel.eto@gmail.com',
    statut: 'actif',
    dateInscription: '2025-09-05',
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80',
    paiements: [
      { id: 'pay-501', eleveId: 'stud-5', date: '2025-09-05', montant: 50000, typeFrais: 'Inscription', statut: 'paid', reference: 'REC-2025-018', modePaiement: 'Orange Money' },
      { id: 'pay-502', eleveId: 'stud-5', date: '2025-11-20', montant: 150000, typeFrais: 'Scolarité', statut: 'paid', reference: 'REC-2025-092', modePaiement: 'MTN Mobile Money' }
    ],
    notes: [
      { id: 'note-501', eleveId: 'stud-5', matiere: 'Mathématiques', note: 10, coefficient: 4, trimestre: 'Trimestre 1', enseignantNom: 'M. Atangana' },
      { id: 'note-502', eleveId: 'stud-5', matiere: 'Physique-Chimie', note: 11.5, coefficient: 4, trimestre: 'Trimestre 1', enseignantNom: 'Mme Bella' },
      { id: 'note-503', eleveId: 'stud-5', matiere: 'SVT', note: 14, coefficient: 4, trimestre: 'Trimestre 1', enseignantNom: 'M. Kamdem' },
      { id: 'note-504', eleveId: 'stud-5', matiere: 'Français', note: 9, coefficient: 2, trimestre: 'Trimestre 1', enseignantNom: 'Mme Ngo' }
    ]
  },
  {
    id: 'stud-6',
    matricule: '26YAE006',
    prenom: 'Florence',
    nom: 'Abena',
    genre: 'F',
    dateNaissance: '2013-05-18',
    lieuNaissance: 'Ebolowa',
    classe: '6ème A',
    nomParent: 'Charles Abena',
    telephoneParent: '+237 671 00 11 22',
    emailParent: 'c.abena@gmail.com',
    statut: 'suspendu',
    dateInscription: '2025-09-08',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
    paiements: [
      { id: 'pay-601', eleveId: 'stud-6', date: '2025-09-08', montant: 40000, typeFrais: 'Inscription', statut: 'paid', reference: 'REC-2025-030', modePaiement: 'Espèces' }
    ],
    notes: [
      { id: 'note-601', eleveId: 'stud-6', matiere: 'Mathématiques', note: 9.5, coefficient: 3, trimestre: 'Trimestre 1', enseignantNom: 'M. Eboa' },
      { id: 'note-602', eleveId: 'stud-6', matiere: 'Français', note: 11, coefficient: 4, trimestre: 'Trimestre 1', enseignantNom: 'M. Ndi' }
    ]
  },
  {
    id: 'stud-7',
    matricule: '26YAE007',
    prenom: 'Guillaume',
    nom: 'Tchakounté',
    genre: 'M',
    dateNaissance: '2011-09-02',
    lieuNaissance: 'Bafoussam',
    classe: 'Seconde C',
    nomParent: 'Thierry Tchakounté',
    telephoneParent: '+237 672 55 66 77',
    emailParent: 'thierry.tcha@gmail.com',
    statut: 'actif',
    dateInscription: '2025-09-04',
    photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80',
    paiements: [
      { id: 'pay-701', eleveId: 'stud-7', date: '2025-09-04', montant: 50000, typeFrais: 'Inscription', statut: 'paid', reference: 'REC-2025-012', modePaiement: 'Virement Bancaire' },
      { id: 'pay-702', eleveId: 'stud-7', date: '2025-10-12', montant: 150000, typeFrais: 'Scolarité', statut: 'paid', reference: 'REC-2025-045', modePaiement: 'MTN Mobile Money' },
      { id: 'pay-703', eleveId: 'stud-7', date: '2026-01-10', montant: 100000, typeFrais: 'Scolarité', statut: 'paid', reference: 'REC-2026-072', modePaiement: 'Virement Bancaire' }
    ],
    notes: [
      { id: 'note-701', eleveId: 'stud-7', matiere: 'Mathématiques', note: 18.5, coefficient: 5, trimestre: 'Trimestre 1', enseignantNom: 'M. Atangana' },
      { id: 'note-702', eleveId: 'stud-7', matiere: 'Physique-Chimie', note: 19, coefficient: 5, trimestre: 'Trimestre 1', enseignantNom: 'M. Tagne' },
      { id: 'note-703', eleveId: 'stud-7', matiere: 'SVT', note: 15.5, coefficient: 3, trimestre: 'Trimestre 1', enseignantNom: 'Mme Mballa' },
      { id: 'note-704', eleveId: 'stud-7', matiere: 'Français', note: 12, coefficient: 3, trimestre: 'Trimestre 1', enseignantNom: 'Mme Ngo' }
    ]
  },
  {
    id: 'stud-8',
    matricule: '26YAE008',
    prenom: 'Hadja',
    nom: 'Halimatou',
    genre: 'F',
    dateNaissance: '2012-07-22',
    lieuNaissance: 'Ngaoundéré',
    classe: '3ème M1',
    nomParent: 'El Hadj Alim',
    telephoneParent: '+237 691 88 77 66',
    emailParent: 'hadj.alim@yahoo.fr',
    statut: 'actif',
    dateInscription: '2025-09-03',
    photoUrl: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=150&q=80',
    paiements: [
      { id: 'pay-801', eleveId: 'stud-8', date: '2025-09-03', montant: 45000, typeFrais: 'Inscription', statut: 'paid', reference: 'REC-2025-010', modePaiement: 'MTN Mobile Money' },
      { id: 'pay-802', eleveId: 'stud-8', date: '2025-11-05', montant: 100000, typeFrais: 'Scolarité', statut: 'paid', reference: 'REC-2025-075', modePaiement: 'Orange Money' }
    ],
    notes: [
      { id: 'note-801', eleveId: 'stud-8', matiere: 'Mathématiques', note: 13, coefficient: 4, trimestre: 'Trimestre 1', enseignantNom: 'M. Eboa' },
      { id: 'note-802', eleveId: 'stud-8', matiere: 'Physique-Chimie', note: 12.5, coefficient: 2, trimestre: 'Trimestre 1', enseignantNom: 'M. Tagne' },
      { id: 'note-803', eleveId: 'stud-8', matiere: 'Français', note: 14, coefficient: 3, trimestre: 'Trimestre 1', enseignantNom: 'M. Ndi' },
      { id: 'note-804', eleveId: 'stud-8', matiere: 'Histoire-Géo-ECM', note: 16.5, coefficient: 3, trimestre: 'Trimestre 1', enseignantNom: 'Mme Ekotto' }
    ]
  },
  {
    id: 'stud-9',
    matricule: '26YAE009',
    prenom: 'Christian',
    nom: 'Bassogog',
    genre: 'M',
    dateNaissance: '2010-10-18',
    lieuNaissance: 'Douala',
    classe: 'Seconde C',
    nomParent: 'Paul Bassogog',
    telephoneParent: '+237 670 12 34 56',
    emailParent: 'paul.bassogog@gmail.com',
    statut: 'actif',
    dateInscription: '2025-09-06',
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
    paiements: [
      { id: 'pay-901', eleveId: 'stud-9', date: '2025-09-06', montant: 50000, typeFrais: 'Inscription', statut: 'paid', reference: 'REC-2025-025', modePaiement: 'Orange Money' }
    ],
    notes: [
      { id: 'note-901', eleveId: 'stud-9', matiere: 'Mathématiques', note: 10, coefficient: 5, trimestre: 'Trimestre 1', enseignantNom: 'M. Atangana' },
      { id: 'note-902', eleveId: 'stud-9', matiere: 'Physique-Chimie', note: 8.5, coefficient: 5, trimestre: 'Trimestre 1', enseignantNom: 'M. Tagne' }
    ]
  },
  {
    id: 'stud-10',
    matricule: '26YAE010',
    prenom: 'Kenza',
    nom: 'Ngo Ndom',
    genre: 'F',
    dateNaissance: '2014-12-04',
    lieuNaissance: 'Kribi',
    classe: '6ème A',
    nomParent: 'Joseph Ndom',
    telephoneParent: '+237 693 77 66 55',
    emailParent: 'j.ngondom@gmail.com',
    statut: 'actif',
    dateInscription: '2025-09-01',
    photoUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=150&q=80',
    paiements: [
      { id: 'pay-1001', eleveId: 'stud-10', date: '2025-09-01', montant: 40000, typeFrais: 'Inscription', statut: 'paid', reference: 'REC-2025-003', modePaiement: 'Orange Money' },
      { id: 'pay-1002', eleveId: 'stud-10', date: '2025-10-15', montant: 80000, typeFrais: 'Scolarité', statut: 'paid', reference: 'REC-2025-039', modePaiement: 'Espèces' },
      { id: 'pay-1003', eleveId: 'stud-10', date: '2026-01-20', montant: 80000, typeFrais: 'Scolarité', statut: 'paid', reference: 'REC-2026-088', modePaiement: 'Espèces' }
    ],
    notes: [
      { id: 'note-1001', eleveId: 'stud-10', matiere: 'Mathématiques', note: 14, coefficient: 3, trimestre: 'Trimestre 1', enseignantNom: 'M. Eboa' },
      { id: 'note-1002', eleveId: 'stud-10', matiere: 'Français', note: 15.5, coefficient: 4, trimestre: 'Trimestre 1', enseignantNom: 'M. Ndi' }
    ]
  }
];
