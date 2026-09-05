-- ============================================================================
-- Décision produit : "Trésorerie Perçue (Encaissements)" est un montant de
-- caisse réel — elle doit inclure TOUS les encaissements (Inscription +
-- Scolarité), pas seulement la scolarité. La migration précédente
-- (20260905160000) avait restreint get_dashboard_stats.total_paid à la
-- scolarité pour l'aligner sur "Frais perçus" du tableau de bord, mais
-- l'utilisateur a précisé que la trésorerie perçue doit rester un total
-- global. Pour garder le rapprochement CA vs Trésorerie cohérent (les deux
-- côtés doivent couvrir le même périmètre), le CA Constaté (compte 706,
-- via get_finance_account_balances) est élargi en miroir avec une
-- constatation des frais d'inscription, en plus de celle déjà existante
-- pour la scolarité.
--
-- Le "Frais perçus" du tableau de bord n'est PAS concerné : c'est un calcul
-- 100% client (dashboard/page.tsx), volontairement scolarité-seule pour
-- rester comparable à totalExpected (somme de classes.prix, scolarité).
-- get_dashboard_stats.total_paid et .recovery_rate ne sont consommés que par
-- finance/page.tsx (totalTresoreriePercue) ; aucun autre appelant n'est
-- affecté par ce changement.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. get_dashboard_stats : total_paid redevient "tous types de frais".
-- ----------------------------------------------------------------------------
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

  -- Trésorerie perçue : tout encaissement réel (Inscription + Scolarité),
  -- pas seulement la scolarité.
  SELECT COALESCE(SUM(pmt.montant), 0)
  INTO v_total_paid
  FROM public.paiements pmt
  JOIN public.eleves e ON e.id = pmt.eleve_id
  WHERE pmt.etablissement_id = p_etablissement_id
    AND pmt.statut = 'paid'
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

-- ----------------------------------------------------------------------------
-- 2. get_finance_account_balances : ajoute la constatation des frais
--    d'inscription (compte 706, comme la scolarité) pour que le CA Constaté
--    couvre le même périmètre que la Trésorerie Perçue élargie.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_finance_account_balances(
  p_etablissement_id UUID,
  p_annee_scolaire_id UUID DEFAULT NULL
)
RETURNS TABLE (
  compte_numero TEXT,
  debit NUMERIC,
  credit NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  WITH bornes AS (
    SELECT a.date_debut, a.date_fin
    FROM public.annees_scolaires a
    WHERE a.id = p_annee_scolaire_id
  ),
  real_lignes AS (
    SELECT l.compte_numero, l.debit::NUMERIC AS debit, l.credit::NUMERIC AS credit
    FROM public.lignes_ecritures l
    JOIN public.ecritures_comptables e ON e.id = l.ecriture_id
    WHERE e.etablissement_id = p_etablissement_id
      AND (
        p_annee_scolaire_id IS NULL
        OR e.date BETWEEN (SELECT date_debut FROM bornes) AND (SELECT date_fin FROM bornes)
      )
  ),
  eleves_scope AS (
    SELECT el.id, COALESCE(c.prix, 0)::NUMERIC AS prix, COALESCE(c.frais_inscription, 0)::NUMERIC AS frais_inscription
    FROM public.eleves el
    LEFT JOIN public.classes c ON c.id = el.classe_id
    WHERE el.etablissement_id = p_etablissement_id
      AND (p_annee_scolaire_id IS NULL OR el.annee_scolaire_id = p_annee_scolaire_id)
  ),
  constatation_frais AS (
    SELECT '411'::TEXT AS compte_numero, prix AS debit, 0::NUMERIC AS credit
    FROM eleves_scope WHERE prix > 0
    UNION ALL
    SELECT '706'::TEXT, 0::NUMERIC, prix
    FROM eleves_scope WHERE prix > 0
    UNION ALL
    SELECT '411'::TEXT, frais_inscription, 0::NUMERIC
    FROM eleves_scope WHERE frais_inscription > 0
    UNION ALL
    SELECT '706'::TEXT, 0::NUMERIC, frais_inscription
    FROM eleves_scope WHERE frais_inscription > 0
  ),
  paiements_scope AS (
    SELECT p.mode_paiement, p.montant
    FROM public.paiements p
    JOIN eleves_scope es ON es.id = p.eleve_id
    WHERE p.statut = 'paid'
  ),
  reglement AS (
    SELECT
      (CASE WHEN mode_paiement = 'Virement Bancaire' THEN '521' ELSE '571' END)::TEXT AS compte_numero,
      montant::NUMERIC AS debit,
      0::NUMERIC AS credit
    FROM paiements_scope
    UNION ALL
    SELECT '411'::TEXT, 0::NUMERIC, montant::NUMERIC
    FROM paiements_scope
  ),
  formations_scope AS (
    SELECT f.cout_total::NUMERIC AS cout_total, f.statut
    FROM public.formations_rh f
    WHERE f.etablissement_id = p_etablissement_id
      AND f.cout_total > 0
      AND (
        p_annee_scolaire_id IS NULL
        OR f.date_debut BETWEEN (SELECT date_debut FROM bornes) AND (SELECT date_fin FROM bornes)
      )
  ),
  formation_const AS (
    SELECT '601'::TEXT AS compte_numero, cout_total AS debit, 0::NUMERIC AS credit
    FROM formations_scope
    UNION ALL
    SELECT '401'::TEXT, 0::NUMERIC, cout_total FROM formations_scope
  ),
  formation_reglement AS (
    SELECT '401'::TEXT AS compte_numero, cout_total AS debit, 0::NUMERIC AS credit
    FROM formations_scope WHERE statut IN ('Terminé', 'termine')
    UNION ALL
    SELECT '521'::TEXT, 0::NUMERIC, cout_total
    FROM formations_scope WHERE statut IN ('Terminé', 'termine')
  ),
  all_lignes AS (
    SELECT * FROM real_lignes
    UNION ALL SELECT * FROM constatation_frais
    UNION ALL SELECT * FROM reglement
    UNION ALL SELECT * FROM formation_const
    UNION ALL SELECT * FROM formation_reglement
  )
  SELECT compte_numero, SUM(debit)::NUMERIC AS debit, SUM(credit)::NUMERIC AS credit
  FROM all_lignes
  GROUP BY compte_numero;
$$;

GRANT EXECUTE ON FUNCTION public.get_finance_account_balances(UUID, UUID) TO authenticated;
