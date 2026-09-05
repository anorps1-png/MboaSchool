-- ============================================================================
-- get_dashboard_stats: total_paid comptait TOUS les types de frais (Inscription
-- + Scolarité), alors que total_expected (somme de classes.prix) ne couvre que
-- la scolarité et que recovery_rate compare les deux. La migration
-- 20260726110000_finance_rpcs_annee_scolaire_and_scolarite_filter.sql avait
-- déjà documenté et censé corriger exactement ce bug, mais la fonction
-- réellement déployée en production n'a jamais reçu ce filtre (constaté en
-- lisant sa définition live via pg_get_functiondef, qui ne contient pas
-- `AND pmt.type_frais = 'Scolarité'`) — écart concret observé par
-- l'utilisateur : Finance affichait 7 282 000 FCFA (tout confondu) contre
-- 4 817 000 FCFA sur le tableau de bord (Scolarité uniquement, calcul client
-- correct). Cette migration réapplique le correctif pour de bon.
-- ============================================================================

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
  SELECT
    count(*),
    count(*) FILTER (WHERE statut = 'actif'),
    count(*) FILTER (WHERE sexe = 'F'),
    count(*) FILTER (WHERE sexe = 'M')
  INTO v_total_students, v_active_students, v_filles, v_garcons
  FROM public.eleves
  WHERE etablissement_id = p_etablissement_id
    AND (p_annee_scolaire_id IS NULL OR annee_scolaire_id = p_annee_scolaire_id);

  SELECT count(*), count(*) FILTER (WHERE statut = 'actif')
  INTO v_total_teachers, v_active_teachers
  FROM public.enseignants
  WHERE etablissement_id = p_etablissement_id;

  SELECT count(*)
  INTO v_nb_classes
  FROM public.classes
  WHERE etablissement_id = p_etablissement_id
    AND (p_annee_scolaire_id IS NULL OR annee_scolaire_id = p_annee_scolaire_id);

  SELECT COALESCE(SUM(c.prix), 0)
  INTO v_total_expected
  FROM public.eleves e
  JOIN public.classes c ON c.id = e.classe_id
  WHERE e.etablissement_id = p_etablissement_id
    AND (p_annee_scolaire_id IS NULL OR e.annee_scolaire_id = p_annee_scolaire_id);

  -- Correctif : seule la scolarité compte, comme total_expected.
  SELECT COALESCE(SUM(pmt.montant), 0)
  INTO v_total_paid
  FROM public.paiements pmt
  JOIN public.eleves e ON e.id = pmt.eleve_id
  WHERE pmt.etablissement_id = p_etablissement_id
    AND pmt.statut = 'paid'
    AND pmt.type_frais = 'Scolarité'
    AND (p_annee_scolaire_id IS NULL OR e.annee_scolaire_id = p_annee_scolaire_id);

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
