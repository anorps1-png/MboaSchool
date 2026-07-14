-- Table pour gérer le personnel / les enseignants
CREATE TABLE public.enseignants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  matricule TEXT UNIQUE NOT NULL,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  sexe TEXT CHECK (sexe IN ('M', 'F')),
  telephone TEXT,
  email TEXT,
  matiere_principale TEXT,
  salaire_mensuel NUMERIC DEFAULT 0,
  date_embauche DATE DEFAULT CURRENT_DATE,
  statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'en_conge', 'quitte')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Désactivation de la sécurité RLS pour éviter les blocages en mode développement
ALTER TABLE public.enseignants DISABLE ROW LEVEL SECURITY;
