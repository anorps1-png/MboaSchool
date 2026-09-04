-- ============================================================================
-- Correction de l'indépendance des années scolaires
-- ============================================================================
-- Trois bugs empêchaient le fonctionnement annoncé de l'isolation par année
-- scolaire :
--
-- 1. get_dashboard_stats(p_etablissement_id) n'acceptait pas le paramètre
--    p_annee_scolaire_id que le frontend envoie déjà (src/lib/queries/
--    dashboard.ts) — chaque appel échouait (fonction introuvable), rattrapé
--    silencieusement par un .catch() côté client. Le taux de réussite global
--    restait bloqué à '--' en permanence (seul indicateur qui dépendait
--    exclusivement de cette RPC, les autres ayant un repli client correct).
--
-- 2. get_students_per_class(p_etablissement_id) avait le même problème —
--    échec systématique, masqué par un repli client qui reste correct mais
--    gaspille un aller-retour réseau à chaque chargement de /classes.
--
-- 3. La réinscription (handleReenrollStudent, src/app/(dashboard)/eleves/
--    page.tsx) crée délibérément un NOUVEL enregistrement eleves pour la
--    nouvelle année scolaire en conservant le même matricule. Or la
--    contrainte UNIQUE(etablissement_id, matricule) en production interdit
--    ce doublon volontaire : chaque réinscription échoue avec une violation
--    de contrainte unique (23505). La fonctionnalité ne peut pas s'exécuter
--    en l'état.
-- ============================================================================

-- 1. get_dashboard_stats : ajoute le filtre par année scolaire (optionnel,
--    NULL = tout l'historique, pour compatibilité ascendante).
DROP FUNCTION IF EXISTS public.get_dashboard_stats(UUID);

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
  p_etablissement_id UUID,
  p_annee_scolaire_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_total_students   INT;
  v_active_students  INT;
  v_filles           INT;
  v_garcons          INT;
  v_total_teachers   INT;
  v_active_teachers  INT;
  v_nb_classes       INT;
  v_total_expected   NUMERIC;
  v_total_paid       NUMERIC;
  v_with_grades      INT;
  v_passed           INT;
  v_success_rate     NUMERIC;
  v_recovery_rate    NUMERIC;
BEGIN
  -- Effectifs et répartition (bornés à l'année scolaire active si fournie)
  SELECT
    count(*),
    count(*) FILTER (WHERE statut = 'actif'),
    count(*) FILTER (WHERE sexe = 'F'),
    count(*) FILTER (WHERE sexe = 'M')
  INTO v_total_students, v_active_students, v_filles, v_garcons
  FROM public.eleves
  WHERE etablissement_id = p_etablissement_id
    AND (p_annee_scolaire_id IS NULL OR annee_scolaire_id = p_annee_scolaire_id);

  -- Enseignants : pas rattachés à une année scolaire, inchangé.
  SELECT count(*), count(*) FILTER (WHERE statut = 'actif')
  INTO v_total_teachers, v_active_teachers
  FROM public.enseignants
  WHERE etablissement_id = p_etablissement_id;

  -- Classes
  SELECT count(*)
  INTO v_nb_classes
  FROM public.classes
  WHERE etablissement_id = p_etablissement_id
    AND (p_annee_scolaire_id IS NULL OR annee_scolaire_id = p_annee_scolaire_id);

  -- Frais attendus : somme du prix de la classe de chaque élève de l'année
  SELECT COALESCE(SUM(c.prix), 0)
  INTO v_total_expected
  FROM public.eleves e
  JOIN public.classes c ON c.id = e.classe_id
  WHERE e.etablissement_id = p_etablissement_id
    AND (p_annee_scolaire_id IS NULL OR e.annee_scolaire_id = p_annee_scolaire_id);

  -- Frais encaissés : paiements des élèves de l'année (paiements n'a pas sa
  -- propre colonne annee_scolaire_id, on passe par l'élève).
  SELECT COALESCE(SUM(pmt.montant), 0)
  INTO v_total_paid
  FROM public.paiements pmt
  JOIN public.eleves e ON e.id = pmt.eleve_id
  WHERE pmt.etablissement_id = p_etablissement_id
    AND pmt.statut = 'paid'
    AND (p_annee_scolaire_id IS NULL OR e.annee_scolaire_id = p_annee_scolaire_id);

  -- Taux de réussite : parmi les élèves de l'année ayant au moins une note.
  WITH moyennes AS (
    SELECT e.id, AVG(n.note) AS moyenne
    FROM public.eleves e
    JOIN public.notes n ON n.eleve_id = e.id
    WHERE e.etablissement_id = p_etablissement_id
      AND (p_annee_scolaire_id IS NULL OR e.annee_scolaire_id = p_annee_scolaire_id)
      AND n.note IS NOT NULL
    GROUP BY e.id
  )
  SELECT count(*), count(*) FILTER (WHERE moyenne >= 10)
  INTO v_with_grades, v_passed
  FROM moyennes;

  v_success_rate := CASE WHEN v_with_grades > 0
    THEN round((v_passed::NUMERIC / v_with_grades) * 100, 1) ELSE NULL END;
  v_recovery_rate := CASE WHEN v_total_expected > 0
    THEN round((v_total_paid / v_total_expected) * 100, 1) ELSE 0 END;

  RETURN jsonb_build_object(
    'total_students', v_total_students,
    'active_students', v_active_students,
    'filles', v_filles,
    'garcons', v_garcons,
    'total_teachers', v_total_teachers,
    'active_teachers', v_active_teachers,
    'nb_classes', v_nb_classes,
    'total_expected', v_total_expected,
    'total_paid', v_total_paid,
    'students_with_grades', v_with_grades,
    'students_passed', v_passed,
    'success_rate', v_success_rate,
    'recovery_rate', v_recovery_rate
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID, UUID) TO authenticated;

-- 2. get_students_per_class : ajoute le même filtre optionnel.
DROP FUNCTION IF EXISTS public.get_students_per_class(UUID);

CREATE OR REPLACE FUNCTION public.get_students_per_class(
  p_etablissement_id UUID,
  p_annee_scolaire_id UUID DEFAULT NULL
)
RETURNS TABLE (
  classe_id UUID,
  student_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT e.classe_id, COUNT(*) AS student_count
  FROM public.eleves e
  WHERE e.etablissement_id = p_etablissement_id
    AND e.classe_id IS NOT NULL
    AND (p_annee_scolaire_id IS NULL OR e.annee_scolaire_id = p_annee_scolaire_id)
  GROUP BY e.classe_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_students_per_class(UUID, UUID) TO authenticated;

-- 3. Un même matricule doit pouvoir se répéter d'une année scolaire à
--    l'autre (réinscription = nouvelle ligne eleves, même matricule), mais
--    rester unique au sein d'une même année pour un même établissement.
ALTER TABLE public.eleves
  DROP CONSTRAINT IF EXISTS eleves_etablissement_matricule_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'eleves_etablissement_matricule_annee_key'
  ) THEN
    ALTER TABLE public.eleves
      ADD CONSTRAINT eleves_etablissement_matricule_annee_key
      UNIQUE (etablissement_id, matricule, annee_scolaire_id);
  END IF;
END $$;
