export interface Paiement {
  id: string;
  eleveId: string;
  montant: number;
  date: string;
  modePaiement: 'Orange Money' | 'MTN Mobile Money' | 'Espèces' | 'Virement Bancaire';
  typeFrais: 'Scolarité' | 'Inscription' | 'Examen' | 'Transport';
  statut: 'paid' | 'pending' | 'failed';
  reference: string;
}

export interface Note {
  id: string;
  eleveId: string;
  matiere: string;
  note: number; // Note sur 20
  coefficient: number;
  trimestre: 'Trimestre 1' | 'Trimestre 2' | 'Trimestre 3';
  enseignantNom: string;
}

export interface Eleve {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  genre: 'M' | 'F';
  classe: string;
  telephoneParent: string;
  nomParent: string;
  emailParent: string;
  dateNaissance: string;
  lieuNaissance: string;
  dateInscription: string;
  statut: 'actif' | 'suspendu' | 'transfere';
  photoUrl?: string;
  // Attributs pour jointure locale/API
  statutPaiement?: 'paid' | 'partial' | 'unpaid';
  paiements: Paiement[];
  notes: Note[];
}

export interface Enseignant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  genre: 'M' | 'F';
  matieres: string[];
  classes: string[];
  statut: 'active' | 'inactive';
  dateRecrutement: string;
  photoUrl?: string;
}

export interface ConfigurationFrais {
  classe: string;
  fraisInscription: number;
  fraisScolarite: number;
  fraisExamen: number;
  total: number;
}

// Représente l'objet d'une transaction de paiement aplati avec jointure de l'élève
export interface TransactionPaiement extends Paiement {
  nomEleve: string;
  matriculeEleve: string;
  classe: string;
}

// Représente un cours de l'emploi du temps
export interface Cours {
  id: string;
  classe: string;
  matiere: string;
  enseignantNom: string;
  jourSemaine: number; // 1 = Lundi, 2 = Mardi, ..., 6 = Samedi
  heureDebut: string; // ex: '08:00'
  heureFin: string;   // ex: '10:00'
  salle: string;
  couleur: string;
}
