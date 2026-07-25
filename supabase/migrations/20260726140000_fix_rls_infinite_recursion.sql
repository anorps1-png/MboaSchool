-- ============================================================================
-- Correctif urgent : récursion infinie entre les politiques eleves et
-- parent_eleves, introduite par 20260726100000.
-- MboaSchool / APON — 2026-07-26
--
-- CAUSE
-- 20260726100000 a scopé les politiques de parent_eleves via une sous-requête
-- sur `eleves`. Or la politique "Parents see only their children" de `eleves`
-- interroge `parent_eleves`. Les expressions de politique étant elles-mêmes
-- soumises à la RLS de la table référencée, cela crée un cycle :
--     eleves -> parent_eleves -> eleves -> ...
-- Postgres le détecte et fait échouer TOUTE lecture de `eleves` avec
-- « infinite recursion detected in policy for relation "eleves" » (42P17),
-- pour tous les rôles, pas seulement les parents.
--
-- CORRECTIF
-- Les deux côtés du cycle passent désormais par des fonctions SECURITY
-- DEFINER, qui s'exécutent hors RLS et coupent donc la récursion. C'est le
-- même mécanisme que current_user_etablissement_id(), déjà utilisé partout
-- dans ce projet pour lire `profiles` depuis une politique sans boucler.
--
-- Le durcissement du 20260726100000 est intégralement préservé : mêmes
-- conditions d'accès, exprimées sans cycle.
-- ============================================================================

-- Établissement propriétaire d'un élève, lu hors RLS.
CREATE OR REPLACE FUNCTION public.eleve_etablissement_id(p_eleve_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT e.etablissement_id FROM public.eleves e WHERE e.id = p_eleve_id;
$$;

-- Enfants rattachés au compte parent courant, lus hors RLS.
CREATE OR REPLACE FUNCTION public.current_parent_eleve_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT pe.eleve_id FROM public.parent_eleves pe WHERE pe.parent_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.eleve_etablissement_id(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_parent_eleve_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eleve_etablissement_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_parent_eleve_ids() TO authenticated;


-- ----------------------------------------------------------------------------
-- 1. parent_eleves : mêmes règles qu'en 20260726100000, sans sous-requête sur
--    `eleves` (c'était la branche montante du cycle).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS parent_eleves_select ON public.parent_eleves;
DROP POLICY IF EXISTS parent_eleves_write ON public.parent_eleves;

CREATE POLICY parent_eleves_select ON public.parent_eleves FOR SELECT TO authenticated
  USING (
    public.eleve_etablissement_id(eleve_id) = public.current_user_etablissement_id()
    AND (
      parent_id = auth.uid()
      OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) IN ('admin', 'directeur')
    )
  );

CREATE POLICY parent_eleves_write ON public.parent_eleves FOR ALL TO authenticated
  USING (
    (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) IN ('admin', 'directeur')
    AND public.eleve_etablissement_id(eleve_id) = public.current_user_etablissement_id()
  )
  WITH CHECK (
    (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) IN ('admin', 'directeur')
    AND public.eleve_etablissement_id(eleve_id) = public.current_user_etablissement_id()
    AND parent_id IN (
      SELECT p.id FROM public.profiles p
      WHERE p.etablissement_id = public.current_user_etablissement_id()
    )
  );


-- ----------------------------------------------------------------------------
-- 2. eleves / paiements : la branche descendante du cycle passe elle aussi par
--    une fonction SECURITY DEFINER (défense en profondeur : même si une future
--    politique de parent_eleves réintroduisait une référence à `eleves`, il n'y
--    aurait plus de cycle).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parents see only their children" ON public.eleves;
CREATE POLICY "Parents see only their children" ON public.eleves FOR SELECT TO authenticated
  USING (
    (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'parent'
    AND etablissement_id = public.current_user_etablissement_id()
    AND deleted_at IS NULL
    AND id IN (SELECT public.current_parent_eleve_ids())
  );

DROP POLICY IF EXISTS "Parents see only their children payments" ON public.paiements;
CREATE POLICY "Parents see only their children payments" ON public.paiements FOR SELECT TO authenticated
  USING (
    (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'parent'
    AND etablissement_id = public.current_user_etablissement_id()
    AND deleted_at IS NULL
    AND eleve_id IN (SELECT public.current_parent_eleve_ids())
  );


-- ----------------------------------------------------------------------------
-- 3. discipline_incidents : même traitement. Cette table n'était pas dans le
--    cycle, mais ses politiques interrogent `eleves` sous RLS, ce qui la
--    rendrait vulnérable au même problème si un cycle réapparaissait ailleurs.
-- ----------------------------------------------------------------------------
DO $mig$
BEGIN
  IF to_regclass('public.discipline_incidents') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS discipline_incidents_select ON public.discipline_incidents';
    EXECUTE 'DROP POLICY IF EXISTS discipline_incidents_write ON public.discipline_incidents';

    EXECUTE $p$
      CREATE POLICY discipline_incidents_select ON public.discipline_incidents FOR SELECT TO authenticated
        USING (
          public.eleve_etablissement_id(eleve_id) = public.current_user_etablissement_id()
        )
    $p$;

    EXECUTE $p$
      CREATE POLICY discipline_incidents_write ON public.discipline_incidents FOR ALL TO authenticated
        USING (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) <> 'parent'
          AND public.eleve_etablissement_id(eleve_id) = public.current_user_etablissement_id()
        )
        WITH CHECK (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) <> 'parent'
          AND public.eleve_etablissement_id(eleve_id) = public.current_user_etablissement_id()
        )
    $p$;
  END IF;
END;
$mig$;
