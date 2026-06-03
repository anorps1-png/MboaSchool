import { ConfigurationFrais, TransactionPaiement } from '@/types/domain';

export const mockClassFees: ConfigurationFrais[] = [
  { niveauId: 'niv-term', fraisInscription: 50000, fraisScolarite: 250000, fraisExamen: 15000, total: 315000 },
  { niveauId: 'niv-sec', fraisInscription: 50000, fraisScolarite: 200000, fraisExamen: 10000, total: 260000 },
  { niveauId: 'niv-3eme', fraisInscription: 45000, fraisScolarite: 150000, fraisExamen: 10000, total: 205000 },
  { niveauId: 'niv-6eme', fraisInscription: 40000, fraisScolarite: 120000, fraisExamen: 5000, total: 165000 }
];

export const mockTransactions: TransactionPaiement[] = [
  {
    id: 'tx-001',
    eleveId: 'stud-1',
    matriculeEleve: '26YAE001',
    nomEleve: 'Jean-Pierre Fouda',
    classeNom: 'Terminale D',
    montant: 50000,
    date: '2025-09-01',
    typeFrais: 'Inscription',
    modePaiement: 'MTN Mobile Money',
    reference: 'REC-2025-001',
    statut: 'paid'
  },
  {
    id: 'tx-002',
    eleveId: 'stud-4',
    matriculeEleve: '26YAE004',
    nomEleve: 'Chloé Mvogo',
    classeNom: '6ème A',
    montant: 40000,
    date: '2025-09-01',
    typeFrais: 'Inscription',
    modePaiement: 'Espèces',
    reference: 'REC-2025-002',
    statut: 'paid'
  }
];
