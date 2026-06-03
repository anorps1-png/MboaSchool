export interface Etablissement {
  id: string;
  nom: string;
  seuilReussite: number; // Configurable: ex. 10
  anneeScolaireActiveId: string;
}

export interface AnneeScolaire {
  id: string;
  nom: string; // ex: "2024-2025"
  dateDebut: string;
  dateFin: string;
}

export interface Section {
  id: string;
  etablissementId: string;
  nom: 'Francophone' | 'Anglophone' | string;
}

export interface NiveauClasse {
  id: string;
  sectionId: string;
  nom: string; // ex: "CM2", "Form 1", "Maternelle Grande Section"
  cycle: 'Maternelle' | 'Primaire' | 'Secondaire';
}

export interface Classe {
  id: string;
  niveauId: string;
  anneeScolaireId: string;
  nom: string; // ex: "CM2 A"
  enseignantPrincipalId: string;
  enseignantAssistantId?: string;
  sectionId?: string; // ex: 'sec-fr' ou 'sec-en'
  // Agrégations pré-calculées
  effectifTotal?: number;
  effectifFilles?: number;
  effectifGarcons?: number;
  moyenneClasse?: number;
  tauxReussite?: number;
}

export interface Matiere {
  id: string;
  niveauId: string;
  nom: string;
  coefficient: number;
  bareme: number; // ex: 20, 30, 50
  examenOfficiel: boolean;
}

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

export interface Eleve {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  sexe: 'M' | 'F';
  dateNaissance: string;
  lieuNaissance: string;
  
  // Affectation
  classeId: string;
  anneeScolaireId: string;

  // Contact
  telephoneParent: string;
  nomParent: string;
  emailParent: string;
  
  dateInscription: string;
  statut: 'actif' | 'suspendu' | 'transfere';
  photoUrl?: string;

  // Attributs pour jointure locale/API
  statutPaiement?: 'paid' | 'partial' | 'unpaid';
  paiements?: Paiement[];
  notes?: NoteMatiere[];
  bulletins?: Bulletin[];
}

export interface Enseignant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  genre: 'M' | 'F';
  matieresId: string[]; // Liste des IDs des matières enseignées
  classesId: string[];  // Liste des IDs des classes
  statut: 'active' | 'inactive';
  dateRecrutement: string;
  photoUrl?: string;
}

export interface NoteMatiere {
  id: string;
  eleveId: string;
  matiereId: string;
  trimestre: 'Trimestre 1' | 'Trimestre 2' | 'Trimestre 3';
  
  // Évaluation classique
  note?: number; // La note obtenue sur le barème de la matière
  coefficient?: number; // Le coefficient appliqué à cette note
  
  // Évaluation maternelle
  evaluationMaternelle?: 'Acquis' | 'En cours' | 'Non acquis';
  
  enseignantId: string;
  dateSaisie: string;
}

export interface Bulletin {
  id: string;
  eleveId: string;
  classeId: string;
  trimestre: 'Trimestre 1' | 'Trimestre 2' | 'Trimestre 3';
  anneeScolaireId: string;
  
  totalPoints: number;
  moyenne: number;
  rang: number;
  mention: string;
  
  // Remarques et signatures
  appreciationEnseignant?: string;
}

export interface ConfigurationFrais {
  niveauId: string;
  fraisInscription: number;
  fraisScolarite: number;
  fraisExamen: number;
  total: number;
}

// Représente l'objet d'une transaction de paiement aplati avec jointure de l'élève
export interface TransactionPaiement extends Paiement {
  nomEleve: string;
  matriculeEleve: string;
  classeNom: string;
}

// Représente un cours de l'emploi du temps
export interface Cours {
  id: string;
  classeId: string;
  matiereId: string;
  enseignantId: string;
  jourSemaine: number; // 1 = Lundi, 2 = Mardi, ..., 6 = Samedi
  heureDebut: string; // ex: '08:00'
  heureFin: string;   // ex: '10:00'
  salle: string;
  couleur: string;
}

// Module Comptabilité OHADA
export interface CompteOHADA {
  numero: string;
  libelle: string;
  classe: 2 | 4 | 5 | 6 | 7;
}

export interface LigneEcriture {
  compteNumero: string;
  debit: number;
  credit: number;
}

export interface EcritureComptable {
  id: string;
  date: string;
  libelle: string;
  reference: string;
  lignes: LigneEcriture[];
}
