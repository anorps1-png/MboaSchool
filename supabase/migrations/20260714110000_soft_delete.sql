-- ============================================================================
-- Soft-delete des données sensibles (financières & scolaires)
-- MboaSchool / APON — 2026-07-14
--
-- Objectif : les suppressions unitaires d'un élève, d'une écriture comptable ou
-- d'un enseignant ne détruisent plus la donnée mais la marquent supprimée
-- (deleted_at), pour l'audit et la récupération (litiges de paiement, notes,
-- comptabilité OHADA). La « suppression de compte » (wipe complet côté settings)
-- reste une destruction physique via le CASCADE sur etablissements.
--
-- Mécanique :
--   1. Colonne deleted_at sur les tables concernées.
--   2. Les politiques RLS (SELECT/UPDATE/DELETE) n'exposent QUE les lignes
--      non supprimées (deleted_at IS NULL). Comme les RPC d'agrégat s'exécutent
--      en SECURITY INVOKER, ils excluent aussi automatiquement les lignes
--      supprimées — aucune requête applicative à modifier pour les lectures.
--   3. RPC soft_delete_* : marquent la ligne ET ses enfants (paiements, notes,
--      bulletins pour un élève ; lignes pour une écriture), avec contrôle du
--      tenant. RPC restore_* pour annuler.
--
-- Idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Colonnes deleted_at
-- ----------------------------------------------------------------------------
DO $mig$
DECLARE
  t TEXT;
  tbls TEXT[] := ARRAY['eleves','paiements','notes','bulletins',
                       'ecritures_comptables','lignes_ecritures','enseignants'];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ', t);
      -- Index partiel : accélère les lectures filtrées sur les lignes vivantes.
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%s_not_deleted ON public.%I (id) WHERE deleted_at IS NULL', t, t);
    END IF;
  END LOOP;
END;
$mig$;

-- ----------------------------------------------------------------------------
-- 2. Politiques RLS : masquer les lignes supprimées
--    On recrée chaque politique « ALL » en ajoutant deleted_at IS NULL à USING.
--    WITH CHECK reste borné au tenant (pour autoriser l'UPDATE qui pose
--    deleted_at). Restaurer une ligne passe par un RPC SECURITY DEFINER.
-- ----------------------------------------------------------------------------

-- Tables portant etablissement_id
DROP POLICY IF EXISTS "Etablissement access for ALL on eleves" ON public.eleves;
CREATE POLICY "Etablissement access for ALL on eleves" ON public.eleves TO authenticated
  USING (etablissement_id = public.current_user_etablissement_id() AND deleted_at IS NULL)
  WITH CHECK (etablissement_id = public.current_user_etablissement_id());

DROP POLICY IF EXISTS "Etablissement access for ALL on paiements" ON public.paiements;
CREATE POLICY "Etablissement access for ALL on paiements" ON public.paiements TO authenticated
  USING (etablissement_id = public.current_user_etablissement_id() AND deleted_at IS NULL)
  WITH CHECK (etablissement_id = public.current_user_etablissement_id());

DROP POLICY IF EXISTS "Etablissement access for ALL on notes" ON public.notes;
CREATE POLICY "Etablissement access for ALL on notes" ON public.notes TO authenticated
  USING (etablissement_id = public.current_user_etablissement_id() AND deleted_at IS NULL)
  WITH CHECK (etablissement_id = public.current_user_etablissement_id());

DROP POLICY IF EXISTS "Etablissement access for ALL on bulletins" ON public.bulletins;
CREATE POLICY "Etablissement access for ALL on bulletins" ON public.bulletins TO authenticated
  USING (etablissement_id = public.current_user_etablissement_id() AND deleted_at IS NULL)
  WITH CHECK (etablissement_id = public.current_user_etablissement_id());

DROP POLICY IF EXISTS "Etablissement access for ALL on ecritures_comptables" ON public.ecritures_comptables;
CREATE POLICY "Etablissement access for ALL on ecritures_comptables" ON public.ecritures_comptables TO authenticated
  USING (etablissement_id = public.current_user_etablissement_id() AND deleted_at IS NULL)
  WITH CHECK (etablissement_id = public.current_user_etablissement_id());

DROP POLICY IF EXISTS "Etablissement access for ALL on enseignants" ON public.enseignants;
CREATE POLICY "Etablissement access for ALL on enseignants" ON public.enseignants TO authenticated
  USING (etablissement_id = public.current_user_etablissement_id() AND deleted_at IS NULL)
  WITH CHECK (etablissement_id = public.current_user_etablissement_id());

-- Lignes d'écriture : scope hérité de l'écriture parente
DROP POLICY IF EXISTS "Lignes ecritures access for authenticated" ON public.lignes_ecritures;
CREATE POLICY "Lignes ecritures access for authenticated" ON public.lignes_ecritures TO authenticated
  USING (
    deleted_at IS NULL
    AND ecriture_id IN (
      SELECT id FROM public.ecritures_comptables
      WHERE etablissement_id = public.current_user_etablissement_id()
    )
  )
  WITH CHECK (
    ecriture_id IN (
      SELECT id FROM public.ecritures_comptables
      WHERE etablissement_id = public.current_user_etablissement_id()
    )
  );

-- ----------------------------------------------------------------------------
-- 3. RPC de soft-delete (avec contrôle du tenant) et de restauration
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.soft_delete_eleve(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_etab UUID := public.current_user_etablissement_id();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.eleves WHERE id = p_id AND etablissement_id = v_etab) THEN
    RAISE EXCEPTION 'Élève introuvable dans votre établissement.';
  END IF;
  UPDATE public.eleves    SET deleted_at = NOW() WHERE id = p_id;
  UPDATE public.paiements SET deleted_at = NOW() WHERE eleve_id = p_id AND deleted_at IS NULL;
  UPDATE public.notes     SET deleted_at = NOW() WHERE eleve_id = p_id AND deleted_at IS NULL;
  UPDATE public.bulletins SET deleted_at = NOW() WHERE eleve_id = p_id AND deleted_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_eleve(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_etab UUID := public.current_user_etablissement_id();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.eleves WHERE id = p_id AND etablissement_id = v_etab) THEN
    RAISE EXCEPTION 'Élève introuvable dans votre établissement.';
  END IF;
  UPDATE public.eleves    SET deleted_at = NULL WHERE id = p_id;
  UPDATE public.paiements SET deleted_at = NULL WHERE eleve_id = p_id;
  UPDATE public.notes     SET deleted_at = NULL WHERE eleve_id = p_id;
  UPDATE public.bulletins SET deleted_at = NULL WHERE eleve_id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_ecriture(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_etab UUID := public.current_user_etablissement_id();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.ecritures_comptables WHERE id = p_id AND etablissement_id = v_etab) THEN
    RAISE EXCEPTION 'Écriture introuvable dans votre établissement.';
  END IF;
  UPDATE public.ecritures_comptables SET deleted_at = NOW() WHERE id = p_id;
  UPDATE public.lignes_ecritures     SET deleted_at = NOW() WHERE ecriture_id = p_id AND deleted_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_ecriture(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_etab UUID := public.current_user_etablissement_id();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.ecritures_comptables WHERE id = p_id AND etablissement_id = v_etab) THEN
    RAISE EXCEPTION 'Écriture introuvable dans votre établissement.';
  END IF;
  UPDATE public.ecritures_comptables SET deleted_at = NULL WHERE id = p_id;
  UPDATE public.lignes_ecritures     SET deleted_at = NULL WHERE ecriture_id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_enseignant(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_etab UUID := public.current_user_etablissement_id();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.enseignants WHERE id = p_id AND etablissement_id = v_etab) THEN
    RAISE EXCEPTION 'Enseignant introuvable dans votre établissement.';
  END IF;
  UPDATE public.enseignants SET deleted_at = NOW() WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_enseignant(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_etab UUID := public.current_user_etablissement_id();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.enseignants WHERE id = p_id AND etablissement_id = v_etab) THEN
    RAISE EXCEPTION 'Enseignant introuvable dans votre établissement.';
  END IF;
  UPDATE public.enseignants SET deleted_at = NULL WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_eleve(UUID)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_eleve(UUID)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_ecriture(UUID)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_ecriture(UUID)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_enseignant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_enseignant(UUID)     TO authenticated;
