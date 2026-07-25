-- ============================================================================
-- Correctif : montants faux affichés comme justes
-- MboaSchool / APON — 2026-07-26
--
-- BUG 1 — Le taux de recouvrement divise une année par toutes les années.
-- finance/page.tsx:730-731 calcule
--     totalRecoveryRate2026 = totalTresoreriePercue / totalFeesDue2026
-- où le numérateur vient de get_dashboard_stats, qui prend bien
-- p_annee_scolaire_id depuis 20260725110000, tandis que le dénominateur vient
-- de get_finance_account_balances, qui n'a jamais reçu ce paramètre : sa CTE
-- constatation_frais agrège TOUS les élèves de TOUTES les années.
-- Sur une école de 3 années à volume constant, le taux affiché est 33 % au
-- lieu de 100 %, et l'écart grandit à chaque rentrée. Le défaut contamine
-- netProfit2026, les ratios, le bilan et le DSF.
-- get_finance_ca_par_classe et get_finance_reconciliation_quotidienne ont le
-- même défaut.
--
-- BUG 2 — Le serveur et le client ne calculent pas le même total_paid.
-- Le commit 4fc589a a restreint totalPaid aux paiements de type 'Scolarité'
-- côté client (eleves/page.tsx:257, eleves/[id]/page.tsx:262,
-- rapport-tranches/page.tsx:124) mais pas côté SQL. Un élève à 200 000 F qui
-- paie 50 000 F d'inscription et 150 000 F de scolarité apparaît « Payé »
-- dans le tableau serveur et « Partiel » sur sa propre fiche. C'est la donnée
-- sur laquelle l'école relance les familles.
--
-- BUG 3 — Frais de scolarité par défaut inventé.
-- COALESCE(c.prix, 200000) fabrique une dette de 200 000 F pour un élève dont
-- la classe n'a pas de prix configuré, ce que le front affiche ensuite comme
-- un montant réel. Le client, lui, utilise 150 000 (rapport-tranches), 0
-- (finance, dashboard) ou « Non configuré » (fiche élève). On supprime le
-- chiffre inventé : prix non configuré => 0 dû, et l'élève sort des agrégats
-- de recouvrement au lieu d'y entrer avec une dette fictive.
--
-- CONVENTION D'ANNÉE
-- paiements et ecritures_comptables n'ont pas de colonne annee_scolaire_id.
--   - Les paiements dérivent leur année de eleves.annee_scolaire_id.
--   - Les écritures réelles et les formations sont filtrées par leur date,
--     bornée par annees_scolaires.date_debut / date_fin.
-- p_annee_scolaire_id NULL conserve le comportement historique (toutes
-- années), ce qui garde les appelants non encore câblés fonctionnels.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. get_finance_account_balances : ajout du paramètre année
--    DROP nécessaire : ajouter un paramètre change la signature, un simple
--    CREATE OR REPLACE créerait une surcharge et l'appel resterait ambigu.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_finance_account_balances(UUID);

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
    SELECT el.id, COALESCE(c.prix, 0)::NUMERIC AS prix
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


-- ----------------------------------------------------------------------------
-- 2. get_finance_ca_par_classe : ajout du paramètre année
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_finance_ca_par_classe(UUID);

CREATE OR REPLACE FUNCTION public.get_finance_ca_par_classe(
  p_etablissement_id UUID,
  p_annee_scolaire_id UUID DEFAULT NULL
)
RETURNS TABLE (
  classe_id UUID,
  ca_collecte NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT e.classe_id, SUM(p.montant)::NUMERIC AS ca_collecte
  FROM public.paiements p
  JOIN public.eleves e ON e.id = p.eleve_id
  WHERE e.etablissement_id = p_etablissement_id
    AND p.statut = 'paid'
    AND e.classe_id IS NOT NULL
    AND (p_annee_scolaire_id IS NULL OR e.annee_scolaire_id = p_annee_scolaire_id)
  GROUP BY e.classe_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_finance_ca_par_classe(UUID, UUID) TO authenticated;


-- ----------------------------------------------------------------------------
-- 3. get_finance_reconciliation_quotidienne : ajout du paramètre année
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_finance_reconciliation_quotidienne(UUID, INT);

CREATE OR REPLACE FUNCTION public.get_finance_reconciliation_quotidienne(
  p_etablissement_id UUID,
  p_jours INT DEFAULT 7,
  p_annee_scolaire_id UUID DEFAULT NULL
)
RETURNS TABLE (
  jour DATE,
  ca_constate NUMERIC,
  encaisse NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  WITH jours AS (
    SELECT generate_series(
      CURRENT_DATE - (GREATEST(p_jours, 1) - 1),
      CURRENT_DATE,
      INTERVAL '1 day'
    )::DATE AS jour
  ),
  pay AS (
    SELECT p.date, p.montant, p.statut
    FROM public.paiements p
    JOIN public.eleves e ON e.id = p.eleve_id
    WHERE e.etablissement_id = p_etablissement_id
      AND p.date >= CURRENT_DATE - (GREATEST(p_jours, 1) - 1)
      AND p.date <= CURRENT_DATE
      AND (p_annee_scolaire_id IS NULL OR e.annee_scolaire_id = p_annee_scolaire_id)
  )
  SELECT
    j.jour,
    COALESCE(SUM(pay.montant), 0)::NUMERIC AS ca_constate,
    COALESCE(SUM(pay.montant) FILTER (WHERE pay.statut = 'paid'), 0)::NUMERIC AS encaisse
  FROM jours j
  LEFT JOIN pay ON pay.date = j.jour
  GROUP BY j.jour
  ORDER BY j.jour ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_finance_reconciliation_quotidienne(UUID, INT, UUID) TO authenticated;


-- ----------------------------------------------------------------------------
-- 4. get_students_paginated : total_paid limité aux paiements de scolarité,
--    et suppression du prix par défaut inventé (200 000).
--    Signature inchangée : simple CREATE OR REPLACE.
-- ----------------------------------------------------------------------------
-- L'ordre des paramètres reproduit exactement celui de 20260723100000 :
-- toute permutation créerait une surcharge au lieu de remplacer la fonction,
-- et l'appel PostgREST deviendrait ambigu.
CREATE OR REPLACE FUNCTION public.get_students_paginated(
  p_etablissement_id UUID,
  p_annee_scolaire_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_classe_id UUID DEFAULT NULL,
  p_statut_paiement TEXT DEFAULT NULL,
  p_sexe TEXT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  matricule TEXT,
  nom TEXT,
  prenom TEXT,
  sexe TEXT,
  classe_id UUID,
  classe_nom TEXT,
  annee_scolaire_id UUID,
  nom_parent TEXT,
  telephone_parent TEXT,
  email_parent TEXT,
  date_naissance DATE,
  lieu_naissance TEXT,
  date_inscription DATE,
  statut TEXT,
  total_due NUMERIC,
  total_paid NUMERIC,
  statut_paiement TEXT,
  reste_a_payer_echu NUMERIC,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_offset INT := GREATEST(p_page - 1, 0) * GREATEST(p_page_size, 1);
BEGIN
  RETURN QUERY
  WITH tranches_sum AS (
    SELECT ts.annee_scolaire_id, SUM(ts.pourcentage) / 100.0 AS pct_echu
    FROM public.tranches_scolarite ts
    WHERE ts.etablissement_id = p_etablissement_id
      AND ts.date_limite < CURRENT_DATE
    GROUP BY ts.annee_scolaire_id
  ),
  base AS (
    SELECT
      e.id, e.matricule, e.nom, e.prenom, e.sexe, e.classe_id, c.nom AS classe_nom,
      e.annee_scolaire_id, e.nom_parent, e.telephone_parent, e.email_parent,
      e.date_naissance, e.lieu_naissance, e.date_inscription, e.statut,
      -- Prix non configuré => 0, jamais un montant inventé : le front affiche
      -- « Non configuré » plutôt qu'une dette fictive de 200 000 F.
      COALESCE(c.prix, 0)::NUMERIC AS total_due,
      COALESCE((
        SELECT SUM(pmt.montant) FROM public.paiements pmt
        WHERE pmt.eleve_id = e.id
          AND pmt.statut = 'paid'
          -- Aligné sur le calcul client (commit 4fc589a) : seuls les paiements
          -- de scolarité amortissent la scolarité. L'inscription, l'examen et
          -- le transport sont des frais distincts.
          AND pmt.type_frais = 'Scolarité'
      ), 0)::NUMERIC AS total_paid,
      COALESCE(ts.pct_echu, 0)::NUMERIC AS pct_echu
    FROM public.eleves e
    LEFT JOIN public.classes c ON c.id = e.classe_id
    LEFT JOIN tranches_sum ts ON ts.annee_scolaire_id = e.annee_scolaire_id
    WHERE e.etablissement_id = p_etablissement_id
      AND (p_annee_scolaire_id IS NULL OR e.annee_scolaire_id = p_annee_scolaire_id)
      AND (p_classe_id IS NULL OR e.classe_id = p_classe_id)
      AND (p_sexe IS NULL OR e.sexe = p_sexe)
      AND (
        p_search IS NULL OR p_search = '' OR
        (e.nom || ' ' || e.prenom) ILIKE '%' || p_search || '%' OR
        e.matricule ILIKE '%' || p_search || '%'
      )
  ),
  scored AS (
    SELECT base.*,
      CASE
        WHEN base.total_due > 0 AND base.total_paid >= base.total_due THEN 'paid'
        WHEN base.total_due > 0 AND base.total_paid < (base.total_due * base.pct_echu) THEN 'late'
        WHEN base.total_paid > 0 THEN 'partial'
        ELSE 'unpaid'
      END AS statut_paiement,
      GREATEST(0, (base.total_due * base.pct_echu) - base.total_paid)::NUMERIC AS reste_a_payer_echu
    FROM base
  ),
  filtered AS (
    SELECT * FROM scored s
    WHERE p_statut_paiement IS NULL
       OR s.statut_paiement = p_statut_paiement
       OR (p_statut_paiement = 'late' AND s.statut_paiement = 'late')
       OR (p_statut_paiement = 'partial' AND s.statut_paiement IN ('partial', 'late'))
  )
  SELECT f.id, f.matricule, f.nom, f.prenom, f.sexe, f.classe_id, f.classe_nom,
         f.annee_scolaire_id, f.nom_parent, f.telephone_parent, f.email_parent,
         f.date_naissance, f.lieu_naissance, f.date_inscription, f.statut,
         f.total_due, f.total_paid, f.statut_paiement, f.reste_a_payer_echu,
         count(*) OVER()::BIGINT AS total_count
  FROM filtered f
  ORDER BY f.nom ASC, f.id ASC
  LIMIT GREATEST(p_page_size, 1)
  OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_students_paginated(UUID, UUID, TEXT, UUID, TEXT, TEXT, INT, INT) TO authenticated;


-- ----------------------------------------------------------------------------
-- 5. get_students_widget_stats : mêmes deux corrections, plus l'ajout du
--    statut 'late' qui manquait (la RPC n'en produisait que 3, si bien que la
--    carte KPI et le filtre du tableau affichaient deux chiffres différents
--    pour « Partiel »).
-- ----------------------------------------------------------------------------
--    Le type de retour reste JSONB (contrat de getStudentsWidgetStats dans
--    lib/queries/eleves.ts) : on ajoute lateCount aux clés existantes plutôt
--    que de basculer en TABLE, ce qui aurait exigé un DROP et cassé l'appelant.
CREATE OR REPLACE FUNCTION public.get_students_widget_stats(
  p_etablissement_id UUID,
  p_annee_scolaire_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_total   INT;
  v_paid    INT;
  v_partial INT;
  v_late    INT;
  v_unpaid  INT;
BEGIN
  WITH tranches_sum AS (
    SELECT ts.annee_scolaire_id, SUM(ts.pourcentage) / 100.0 AS pct_echu
    FROM public.tranches_scolarite ts
    WHERE ts.etablissement_id = p_etablissement_id
      AND ts.date_limite < CURRENT_DATE
    GROUP BY ts.annee_scolaire_id
  ),
  base AS (
    SELECT
      COALESCE(c.prix, 0)::NUMERIC AS total_due,
      COALESCE((
        SELECT SUM(pmt.montant) FROM public.paiements pmt
        WHERE pmt.eleve_id = e.id
          AND pmt.statut = 'paid'
          AND pmt.type_frais = 'Scolarité'
      ), 0)::NUMERIC AS total_paid,
      COALESCE(ts.pct_echu, 0)::NUMERIC AS pct_echu
    FROM public.eleves e
    LEFT JOIN public.classes c ON c.id = e.classe_id
    LEFT JOIN tranches_sum ts ON ts.annee_scolaire_id = e.annee_scolaire_id
    WHERE e.etablissement_id = p_etablissement_id
      AND (p_annee_scolaire_id IS NULL OR e.annee_scolaire_id = p_annee_scolaire_id)
  ),
  scored AS (
    SELECT
      CASE
        WHEN total_due > 0 AND total_paid >= total_due THEN 'paid'
        WHEN total_due > 0 AND total_paid < (total_due * pct_echu) THEN 'late'
        WHEN total_paid > 0 THEN 'partial'
        ELSE 'unpaid'
      END AS statut_paiement
    FROM base
  )
  SELECT
    count(*),
    count(*) FILTER (WHERE statut_paiement = 'paid'),
    count(*) FILTER (WHERE statut_paiement = 'partial'),
    count(*) FILTER (WHERE statut_paiement = 'late'),
    count(*) FILTER (WHERE statut_paiement = 'unpaid')
  INTO v_total, v_paid, v_partial, v_late, v_unpaid
  FROM scored;

  RETURN jsonb_build_object(
    'total', v_total,
    'paidCount', v_paid,
    'partialCount', v_partial,
    'lateCount', v_late,
    'unpaidCount', v_unpaid
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_students_widget_stats(UUID, UUID) TO authenticated;


-- ----------------------------------------------------------------------------
-- 6. get_dashboard_stats : total_paid limité aux paiements de scolarité.
--    Le total_expected de cette RPC (somme des prix de classe) ne couvre que
--    la scolarité ; total_paid sommait pourtant tous les types de frais, et
--    recovery_rate comparait les deux. Même incohérence que le point 4/5,
--    même correction. Signature et clés JSONB inchangées.
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

  -- Frais de scolarité encaissés : paiements des élèves de l'année (paiements
  -- n'a pas sa propre colonne annee_scolaire_id, on passe par l'élève). Seule
  -- la scolarité compte : total_expected ne couvre qu'elle.
  SELECT COALESCE(SUM(pmt.montant), 0)
  INTO v_total_paid
  FROM public.paiements pmt
  JOIN public.eleves e ON e.id = pmt.eleve_id
  WHERE pmt.etablissement_id = p_etablissement_id
    AND pmt.statut = 'paid'
    AND pmt.type_frais = 'Scolarité'
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
