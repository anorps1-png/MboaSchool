-- ============================================================================
-- RPC d'agrégats du tableau de bord
-- MboaSchool / APON — 2026-07-13
--
-- Problème corrigé : le tableau de bord chargeait TOUS les élèves d'un
-- établissement avec leurs paiements ET leurs notes imbriqués, puis calculait
-- les indicateurs côté navigateur. À plusieurs milliers d'élèves, le volume
-- transféré et le calcul client deviennent ingérables.
--
-- Cette fonction calcule tous les indicateurs « globaux » (sans filtre de date)
-- directement en base, en une seule requête agrégée :
--   effectifs, répartition par sexe, enseignants, nombre de classes,
--   frais attendus / encaissés, taux de recouvrement, taux de réussite.
--
-- SECURITY INVOKER (défaut) : la RLS s'applique, chaque tenant ne voit que son
-- établissement. Le paramètre p_etablissement_id doit être celui du tenant ;
-- la RLS empêche de toute façon de lire les données d'un autre établissement.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_etablissement_id UUID)
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
  -- Effectifs et répartition
  SELECT
    count(*),
    count(*) FILTER (WHERE statut = 'actif'),
    count(*) FILTER (WHERE sexe = 'F'),
    count(*) FILTER (WHERE sexe = 'M')
  INTO v_total_students, v_active_students, v_filles, v_garcons
  FROM public.eleves
  WHERE etablissement_id = p_etablissement_id;

  -- Enseignants
  SELECT count(*), count(*) FILTER (WHERE statut = 'actif')
  INTO v_total_teachers, v_active_teachers
  FROM public.enseignants
  WHERE etablissement_id = p_etablissement_id;

  -- Classes
  SELECT count(*)
  INTO v_nb_classes
  FROM public.classes
  WHERE etablissement_id = p_etablissement_id;

  -- Frais attendus : somme du prix de la classe de chaque élève
  SELECT COALESCE(SUM(c.prix), 0)
  INTO v_total_expected
  FROM public.eleves e
  JOIN public.classes c ON c.id = e.classe_id
  WHERE e.etablissement_id = p_etablissement_id;

  -- Frais encaissés : somme des paiements réglés
  SELECT COALESCE(SUM(montant), 0)
  INTO v_total_paid
  FROM public.paiements
  WHERE etablissement_id = p_etablissement_id
    AND statut = 'paid';

  -- Taux de réussite : parmi les élèves ayant au moins une note, part de ceux
  -- dont la moyenne (simple) des notes est >= 10.
  WITH moyennes AS (
    SELECT e.id, AVG(n.note) AS moyenne
    FROM public.eleves e
    JOIN public.notes n ON n.eleve_id = e.id
    WHERE e.etablissement_id = p_etablissement_id
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

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID) TO authenticated;
