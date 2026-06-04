-- ==========================================
-- SCHEMA SUPABASE - MBOASCHOOL
-- ==========================================

-- 1. Tables de base
CREATE TABLE etablissements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  seuil_reussite NUMERIC DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE annees_scolaires (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL
);

CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  niveau TEXT NOT NULL,
  section TEXT,
  prix NUMERIC
);

-- 2. Utilisateurs et Élèves
CREATE TABLE eleves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  matricule TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  sexe TEXT CHECK (sexe IN ('M', 'F')),
  date_naissance DATE,
  lieu_naissance TEXT,
  classe_id UUID REFERENCES classes(id),
  annee_scolaire_id UUID REFERENCES annees_scolaires(id),
  telephone_parent TEXT,
  nom_parent TEXT,
  email_parent TEXT,
  date_inscription DATE DEFAULT CURRENT_DATE,
  statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'suspendu', 'transfere')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE enseignants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  telephone TEXT,
  genre TEXT CHECK (genre IN ('M', 'F')),
  statut TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Finances & Notes
CREATE TABLE paiements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  eleve_id UUID REFERENCES eleves(id) ON DELETE CASCADE,
  montant NUMERIC NOT NULL,
  date DATE NOT NULL,
  mode_paiement TEXT CHECK (mode_paiement IN ('Orange Money', 'MTN Mobile Money', 'Espèces', 'Virement Bancaire')),
  type_frais TEXT CHECK (type_frais IN ('Scolarité', 'Inscription', 'Examen', 'Transport')),
  statut TEXT DEFAULT 'pending' CHECK (statut IN ('paid', 'pending', 'failed')),
  reference TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  eleve_id UUID REFERENCES eleves(id) ON DELETE CASCADE,
  matiere_id UUID,
  trimestre TEXT CHECK (trimestre IN ('Trimestre 1', 'Trimestre 2', 'Trimestre 3')),
  note NUMERIC,
  coefficient NUMERIC DEFAULT 1,
  evaluation_maternelle TEXT,
  enseignant_id UUID REFERENCES enseignants(id),
  date_saisie TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Module QHSE
CREATE TABLE qhse_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  lieu TEXT NOT NULL,
  gravite TEXT CHECK (gravite IN ('Faible', 'Moyenne', 'Grave')),
  description TEXT NOT NULL,
  statut TEXT DEFAULT 'En traitement' CHECK (statut IN ('Résolu', 'En traitement')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE qhse_reunions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  titre TEXT NOT NULL,
  participants INTEGER NOT NULL,
  duree TEXT NOT NULL
);

CREATE TABLE qhse_depenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  libelle TEXT NOT NULL,
  montant NUMERIC NOT NULL
);

CREATE TABLE qhse_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mois TEXT NOT NULL,
  score NUMERIC NOT NULL,
  remarques TEXT
);

-- 5. Module Enquêtes (Satisfaction)
CREATE TABLE enquetes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre TEXT NOT NULL,
  categorie TEXT CHECK (categorie IN ('Parents', 'Employés', 'Communauté')),
  sous_categorie TEXT NOT NULL,
  statut TEXT DEFAULT 'En cours' CHECK (statut IN ('En cours', 'Clôturée')),
  participants INTEGER DEFAULT 0,
  score_moyen NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE enquetes_historique (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enquete_id UUID REFERENCES enquetes(id) ON DELETE CASCADE,
  annee INTEGER NOT NULL,
  score NUMERIC NOT NULL
);
