-- Migration pour ajouter les tables manquantes qui sont dans schema.sql
-- mais qui n'ont jamais fait l'objet d'un fichier de migration.
-- L'utilisation de IF NOT EXISTS permet de s'assurer que ça ne plante pas
-- si certaines tables ont déjà été créées manuellement.

-- 6. Discipline et QHSE
CREATE TABLE IF NOT EXISTS public.discipline_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  eleve_id UUID NOT NULL REFERENCES public.eleves(id) ON DELETE CASCADE,
  date_incident DATE NOT NULL,
  type_incident TEXT NOT NULL,
  motif TEXT NOT NULL,
  sanction TEXT,
  statut TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.qhse_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  lieu TEXT NOT NULL,
  gravite TEXT CHECK (gravite IN ('Faible', 'Moyenne', 'Grave')),
  description TEXT NOT NULL,
  statut TEXT DEFAULT 'En traitement' CHECK (statut IN ('Résolu', 'En traitement')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.qhse_reunions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  titre TEXT NOT NULL,
  participants INTEGER NOT NULL,
  duree TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.qhse_depenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  libelle TEXT NOT NULL,
  montant NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS public.qhse_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mois TEXT NOT NULL,
  score NUMERIC NOT NULL,
  remarques TEXT
);

-- 7. Satisfaction et Enquêtes
CREATE TABLE IF NOT EXISTS public.enquetes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre TEXT NOT NULL,
  categorie TEXT CHECK (categorie IN ('Parents', 'Employés', 'Communauté')),
  sous_categorie TEXT NOT NULL,
  statut TEXT DEFAULT 'En cours' CHECK (statut IN ('En cours', 'Clôturée')),
  participants INTEGER DEFAULT 0,
  score_moyen NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.enquetes_historique (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enquete_id UUID REFERENCES public.enquetes(id) ON DELETE CASCADE,
  annee INTEGER NOT NULL,
  score NUMERIC NOT NULL
);

-- 9. Ressources Humaines (RH) et Personnel
CREATE TABLE IF NOT EXISTS public.membres_personnel (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  telephone TEXT,
  sexe TEXT CHECK (sexe IN ('M', 'F')),
  categorie TEXT CHECK (categorie IN ('Administration', 'Enseignant', 'Personnel d''appui', 'Technique')),
  type_contrat TEXT CHECK (type_contrat IN ('CDI', 'CDD', 'Intérimaire', 'Stagiaire')),
  salaire_de_base NUMERIC DEFAULT 0,
  date_embauche DATE DEFAULT CURRENT_DATE,
  statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'suspendu', 'quitte')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.absences_personnel (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  personnel_id UUID NOT NULL REFERENCES public.membres_personnel(id) ON DELETE CASCADE,
  nom_personnel TEXT NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  motif TEXT CHECK (motif IN ('Maladie', 'Maternité', 'Congé', 'Injustifié', 'Autre')),
  duree_jours INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mouvements_personnel (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  personnel_id UUID NOT NULL REFERENCES public.membres_personnel(id) ON DELETE CASCADE,
  nom_personnel TEXT NOT NULL,
  type TEXT CHECK (type IN ('embauche', 'depart_volontaire', 'mutation', 'licenciement')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  details TEXT
);

CREATE TABLE IF NOT EXISTS public.evaluations_rh (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enseignant_id UUID NOT NULL REFERENCES public.enseignants(id) ON DELETE CASCADE,
  nom_enseignant TEXT NOT NULL,
  note_moyenne NUMERIC DEFAULT 0,
  adherence_job_role NUMERIC DEFAULT 0,
  adherence_valeurs NUMERIC DEFAULT 0,
  note_formation_moyenne NUMERIC DEFAULT 0,
  date_evaluation DATE NOT NULL DEFAULT CURRENT_DATE,
  evaluateur TEXT
);

CREATE TABLE IF NOT EXISTS public.formations_rh (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme TEXT NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  cout_total NUMERIC DEFAULT 0,
  organisme TEXT,
  statut TEXT CHECK (statut IN ('planifié', 'en_cours', 'terminé'))
);

CREATE TABLE IF NOT EXISTS public.formations_beneficiaires (
  formation_id UUID REFERENCES public.formations_rh(id) ON DELETE CASCADE,
  personnel_id UUID REFERENCES public.membres_personnel(id) ON DELETE CASCADE,
  PRIMARY KEY (formation_id, personnel_id)
);

-- 12. EMPLOI DU TEMPS
CREATE TABLE IF NOT EXISTS public.emploi_du_temps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etablissement_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE,
  classe_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  jour_semaine INTEGER NOT NULL CHECK (jour_semaine BETWEEN 1 AND 6),
  heure_debut TEXT NOT NULL,
  heure_fin TEXT NOT NULL,
  matiere_id UUID REFERENCES public.matieres(id) ON DELETE CASCADE,
  enseignant_id UUID REFERENCES public.enseignants(id) ON DELETE CASCADE,
  salle TEXT,
  couleur TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.emploi_du_temps ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Emploi du temps scope access" ON public.emploi_du_temps TO authenticated
      USING (
        classe_id IN (
          SELECT id FROM public.classes WHERE niveau_id IN (
            SELECT id FROM public.niveaux_classes WHERE section_id IN (
              SELECT id FROM public.sections WHERE etablissement_id = public.current_user_etablissement_id()
            )
          )
        )
      );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
