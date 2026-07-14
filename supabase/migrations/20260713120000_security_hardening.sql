-- ============================================================================
-- MIGRATION DE SÉCURITÉ — Durcissement RLS multi-tenant (v2, schéma réel)
-- MboaSchool / APON — 2026-07-13
--
-- Écrite après inspection de la base de production : etablissement_id et la
-- RLS par tenant sont déjà en place sur la quasi-totalité des tables.
-- Cette migration corrige les failles restantes :
--   1. current_user_etablissement_id() : STABLE + search_path (perf + sécurité)
--   2. fiches_de_paie : politiques sans isolation tenant -> tenant strict
--   3. profiles : INSERT forgeable (prise de contrôle inter-tenant) supprimé,
--      et protection contre l'auto-escalade de rôle
--   4. etablissements : politique SELECT manquante, INSERT ouvert supprimé
--   5. Signup : le trigger faisait confiance aux métadonnées client
--      (etablissement_id + role) -> remplacé par une table d'invitations
--      contrôlée côté serveur
--   6. formations_beneficiaires : RLS active sans politique (table bloquée)
--   7. Doublons de politiques, unicités par tenant, contraintes CHECK, index
--
-- Ce script est IDEMPOTENT : il peut être rejoué sans danger.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Fonction helper durcie
--    - STABLE : évaluée une fois par requête au lieu d'une fois par ligne
--    - SET search_path = '' : bloque le détournement de schéma (SECURITY DEFINER)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_etablissement_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT etablissement_id FROM public.profiles WHERE id = auth.uid();
$$;


-- ----------------------------------------------------------------------------
-- 2. fiches_de_paie : remplacement des politiques "tout utilisateur
--    authentifié" (aucune isolation entre écoles) par un scope tenant strict
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.fiches_de_paie;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.fiches_de_paie;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.fiches_de_paie;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.fiches_de_paie;
DROP POLICY IF EXISTS fiches_de_paie_select ON public.fiches_de_paie;
DROP POLICY IF EXISTS fiches_de_paie_insert ON public.fiches_de_paie;
DROP POLICY IF EXISTS fiches_de_paie_update ON public.fiches_de_paie;
DROP POLICY IF EXISTS fiches_de_paie_delete ON public.fiches_de_paie;
DROP POLICY IF EXISTS tenant_all ON public.fiches_de_paie;
CREATE POLICY tenant_all ON public.fiches_de_paie TO authenticated
  USING (etablissement_id = public.current_user_etablissement_id())
  WITH CHECK (etablissement_id = public.current_user_etablissement_id());


-- ----------------------------------------------------------------------------
-- 3. profiles :
--    a) Suppression de la politique INSERT : un nouvel inscrit (sans profil,
--       donc current_user_etablissement_id() = NULL) pouvait s'insérer un
--       profil admin dans N'IMPORTE QUEL établissement. La création de profils
--       est réservée au trigger de signup (SECURITY DEFINER, hors RLS).
--    b) Trigger anti-escalade : seul un admin/directeur peut changer un rôle ;
--       personne ne peut déplacer un profil vers un autre établissement.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Profiles insert policy" ON public.profiles;

CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_role TEXT;
BEGIN
  -- auth.uid() IS NULL = service_role / opérations d'administration : libre.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.etablissement_id IS DISTINCT FROM OLD.etablissement_id THEN
    RAISE EXCEPTION 'Le rattachement d''un profil à un établissement ne peut pas être modifié.';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    SELECT role INTO actor_role FROM public.profiles WHERE id = auth.uid();
    IF actor_role IS NULL OR actor_role NOT IN ('admin', 'directeur') THEN
      RAISE EXCEPTION 'Seul un administrateur peut modifier le rôle d''un utilisateur.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileges ON public.profiles;
CREATE TRIGGER protect_profile_privileges
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();


-- ----------------------------------------------------------------------------
-- 4. etablissements : politique SELECT manquante (chacun voit le sien) et
--    suppression de l'INSERT ouvert (la création passe par le trigger signup)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS etab_select ON public.etablissements;
CREATE POLICY etab_select ON public.etablissements FOR SELECT TO authenticated
  USING (id = public.current_user_etablissement_id());
DROP POLICY IF EXISTS "Etablissement insert access" ON public.etablissements;


-- ----------------------------------------------------------------------------
-- 5. Invitations contrôlées côté serveur
--    Avant : supabase.auth.signUp({ data: { etablissement_id, role } }) —
--    métadonnées librement forgées par le client => n'importe qui pouvait
--    rejoindre n'importe quelle école comme admin.
--    Après : l'admin crée une ligne dans public.invitations ; le trigger de
--    signup n'accorde l'accès QUE si une invitation valide existe pour
--    l'email, et prend rôle/permissions/établissement DE L'INVITATION.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id UUID NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'enseignant',
  permissions JSONB DEFAULT '{}'::jsonb,
  nom_complet TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(lower(email));
CREATE INDEX IF NOT EXISTS idx_invitations_etablissement ON public.invitations(etablissement_id);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invitations_admin_manage ON public.invitations;
CREATE POLICY invitations_admin_manage ON public.invitations TO authenticated
  USING (
    etablissement_id = public.current_user_etablissement_id()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'directeur')
  )
  WITH CHECK (
    etablissement_id = public.current_user_etablissement_id()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'directeur')
  );

-- Trigger de signup réécrit : les métadonnées client ne déterminent plus
-- jamais l'établissement ni le rôle.
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  inv RECORD;
  new_etab_id UUID;
  new_annee_id UUID;
  meta_school_name TEXT;
  meta_school_year TEXT;
BEGIN
  -- 1) Invitation valide pour cet email ? => rejoint l'établissement inviteur
  --    avec le rôle défini PAR L'INVITATION (jamais par le client).
  SELECT * INTO inv
  FROM public.invitations
  WHERE lower(email) = lower(NEW.email)
    AND used_at IS NULL
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.profiles (id, email, role, etablissement_id, permissions, nom_complet, created_at)
    VALUES (
      NEW.id,
      NEW.email,
      inv.role,
      inv.etablissement_id,
      COALESCE(inv.permissions, '{}'::jsonb),
      COALESCE(inv.nom_complet, NEW.raw_user_meta_data->>'nom_complet'),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    UPDATE public.invitations SET used_at = NOW() WHERE id = inv.id;
    RETURN NEW;
  END IF;

  -- 2) Un client réclame un rattachement sans invitation valide : refus
  --    explicite (avant : accès direct à l'établissement demandé !).
  IF NEW.raw_user_meta_data->>'etablissement_id' IS NOT NULL THEN
    RAISE EXCEPTION 'Aucune invitation valide pour cet email. Demandez à votre administrateur de renouveler l''invitation.';
  END IF;

  -- 3) Sinon : nouvel administrateur, création de son propre établissement.
  meta_school_name := COALESCE(NEW.raw_user_meta_data->>'school_name', 'Mon Établissement');
  meta_school_year := COALESCE(NEW.raw_user_meta_data->>'school_year', '2025/2026');

  INSERT INTO public.etablissements (nom, seuil_reussite)
  VALUES (meta_school_name, 10)
  RETURNING id INTO new_etab_id;

  INSERT INTO public.annees_scolaires (nom, date_debut, date_fin, etablissement_id)
  VALUES (
    meta_school_year,
    (split_part(meta_school_year, '/', 1) || '-09-01')::DATE,
    (split_part(meta_school_year, '/', 2) || '-06-30')::DATE,
    new_etab_id
  )
  RETURNING id INTO new_annee_id;

  UPDATE public.etablissements
  SET annee_scolaire_active_id = new_annee_id
  WHERE id = new_etab_id;

  INSERT INTO public.profiles (id, email, role, etablissement_id, nom_complet, created_at)
  VALUES (NEW.id, NEW.email, 'admin', new_etab_id, NEW.raw_user_meta_data->>'nom_complet', NOW())
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;


-- ----------------------------------------------------------------------------
-- 6. formations_beneficiaires : RLS activée mais AUCUNE politique => la table
--    était totalement inaccessible. Scope hérité du membre du personnel.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS junction_tenant_all ON public.formations_beneficiaires;
CREATE POLICY junction_tenant_all ON public.formations_beneficiaires TO authenticated
  USING (personnel_id IN (
    SELECT id FROM public.membres_personnel
    WHERE etablissement_id = public.current_user_etablissement_id()
  ))
  WITH CHECK (personnel_id IN (
    SELECT id FROM public.membres_personnel
    WHERE etablissement_id = public.current_user_etablissement_id()
  ));


-- ----------------------------------------------------------------------------
-- 7. Nettoyage des politiques en double (permissives => redondantes)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Classes scope access" ON public.classes;
DROP POLICY IF EXISTS "Etablissement access for ALL on comptes_ohada" ON public.comptes_ohada;
DROP POLICY IF EXISTS "Ecritures comptables access for authenticated" ON public.ecritures_comptables;


-- ----------------------------------------------------------------------------
-- 8. Trigger : remplit automatiquement etablissement_id à l'insertion
--    (comptes_ohada exclu : ses lignes NULL forment le catalogue OHADA commun)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_etablissement_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.etablissement_id IS NULL THEN
    NEW.etablissement_id := public.current_user_etablissement_id();
  END IF;
  RETURN NEW;
END;
$$;

DO $migration$
DECLARE
  tenant_tables TEXT[] := ARRAY[
    'absences_personnel','annees_scolaires','bulletins','classes','discipline',
    'ecritures_comptables','eleves','enquetes','enquetes_historique','enseignants',
    'evaluations_rh','fiches_de_paie','formations_rh','matieres','membres_personnel',
    'mouvements_personnel','niveaux_classes','notes','paiements','qhse_depenses',
    'qhse_evaluations','qhse_incidents','qhse_reunions','sections'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS set_etablissement_id ON public.%I', t);
      EXECUTE format(
        'CREATE TRIGGER set_etablissement_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_etablissement_id()',
        t
      );
    END IF;
  END LOOP;
END;
$migration$;


-- ----------------------------------------------------------------------------
-- 9. Unicité PAR ÉTABLISSEMENT (eleves et paiements sont déjà corrects)
--    Doublons vérifiés au préalable : aucun. Chaque bloc est isolé pour ne pas
--    faire échouer la migration si l'état diffère.
-- ----------------------------------------------------------------------------
DO $migration$
BEGIN
  BEGIN
    ALTER TABLE public.enseignants DROP CONSTRAINT IF EXISTS enseignants_email_key;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_enseignants_email_par_etab
      ON public.enseignants(etablissement_id, email);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'enseignants.email par tenant ignoré: %', SQLERRM;
  END;

  BEGIN
    ALTER TABLE public.membres_personnel DROP CONSTRAINT IF EXISTS membres_personnel_email_key;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_membres_personnel_email_par_etab
      ON public.membres_personnel(etablissement_id, email);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'membres_personnel.email par tenant ignoré: %', SQLERRM;
  END;

  BEGIN
    ALTER TABLE public.ecritures_comptables DROP CONSTRAINT IF EXISTS ecritures_comptables_reference_key;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_ecritures_reference_par_etab
      ON public.ecritures_comptables(etablissement_id, reference);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ecritures.reference par tenant ignoré: %', SQLERRM;
  END;
END;
$migration$;


-- ----------------------------------------------------------------------------
-- 10. Contraintes CHECK métier (NOT VALID : n'invalide pas l'existant,
--     s'applique aux nouvelles écritures)
-- ----------------------------------------------------------------------------
DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'paiements_montant_positif') THEN
    ALTER TABLE public.paiements
      ADD CONSTRAINT paiements_montant_positif CHECK (montant > 0) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notes_valeur_positive') THEN
    ALTER TABLE public.notes
      ADD CONSTRAINT notes_valeur_positive CHECK (note IS NULL OR note >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lignes_montants_positifs') THEN
    ALTER TABLE public.lignes_ecritures
      ADD CONSTRAINT lignes_montants_positifs CHECK (debit >= 0 AND credit >= 0) NOT VALID;
  END IF;
END;
$migration$;


-- ----------------------------------------------------------------------------
-- 11. Index de performance : la RLS filtre chaque requête sur etablissement_id
-- ----------------------------------------------------------------------------
DO $migration$
DECLARE
  tenant_tables TEXT[] := ARRAY[
    'absences_personnel','annees_scolaires','bulletins','classes','discipline',
    'ecritures_comptables','eleves','enquetes','enquetes_historique','enseignants',
    'evaluations_rh','fiches_de_paie','formations_rh','matieres','membres_personnel',
    'mouvements_personnel','niveaux_classes','notes','paiements','qhse_depenses',
    'qhse_evaluations','qhse_incidents','qhse_reunions','sections','comptes_ohada'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_etablissement ON public.%I(etablissement_id)', t, t);
    END IF;
  END LOOP;
END;
$migration$;

CREATE INDEX IF NOT EXISTS idx_paiements_eleve ON public.paiements(eleve_id);
CREATE INDEX IF NOT EXISTS idx_notes_eleve ON public.notes(eleve_id);
CREATE INDEX IF NOT EXISTS idx_profiles_etablissement ON public.profiles(etablissement_id);

-- ============================================================================
-- FIN — Vérification : SELECT tablename, policyname, cmd FROM pg_policies
--       WHERE schemaname = 'public' ORDER BY tablename;
-- ============================================================================
