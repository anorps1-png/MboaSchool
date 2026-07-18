-- ============================================================================
-- RPC de scalabilité pour la page Finance (BSC, ratios, bilan, DSF)
-- MboaSchool / APON — 2026-07-19
--
-- Problème corrigé : finance/page.tsx chargeait TOUS les élèves+paiements de
-- l'établissement (boucle non bornée, par lots de 1000) ET TOUTES les
-- écritures comptables (aucune pagination), puis recalculait des dizaines de
-- totaux (CA, charges, TVA, bilan, DSF) côté navigateur à CHAQUE rendu.
-- ecritures_comptables (le grand livre) s'accumule indéfiniment (chaque
-- écriture, chaque exercice, pour toujours) — c'est la table la moins bornée
-- du schéma.
--
-- get_finance_account_balances reproduit exactement la logique de
-- fabrication déjà présente côté client (finance/page.tsx, ~lignes 384-465) :
-- en plus des vraies lignes_ecritures, elle génère les mêmes écritures
-- synthétiques (jamais persistées en base) que le front calcule aujourd'hui :
--   - constatation frais scolaires (411 débit / 706 crédit) par élève, au prix
--     réel de sa classe (200000 par défaut si non défini)
--   - règlement (521 si Virement Bancaire sinon 571, débit / 411 crédit) par
--     paiement statut='paid'
--   - formation : constatation (601/401) si cout_total > 0, règlement
--     (401/521) si statut IN ('Terminé','termine') — valeurs identiques à la
--     comparaison actuellement faite côté client (accent variable inclus,
--     volontairement reproduit à l'identique).
--
-- ⚠️ Non reproduit : le registre local `mboaschool_deleted_ecritures`
-- (localStorage) qui permet à un directeur de masquer une écriture
-- synthétique donnée depuis l'onglet Journal — ce registre est propre au
-- navigateur et n'existe pas côté serveur. Le code appelant (finance/page.tsx)
-- doit donc n'utiliser cette RPC comme source préférée QUE si ce registre
-- local est vide pour l'établissement courant ; sinon conserver le calcul
-- client existant (qui respecte ce registre) pour ne pas faire réapparaître
-- des écritures que l'utilisateur a explicitement masquées.
--
-- get_finance_ca_par_classe et get_finance_reconciliation_quotidienne ne
-- dépendent pas de ce registre (elles s'appuient directement sur `paiements`,
-- jamais sur `ecritures`) — aucune réserve équivalente pour elles.
--
-- SECURITY INVOKER (défaut) : la RLS s'applique normalement, y compris le
-- filtre deleted_at IS NULL du soft-delete déjà en place sur
-- ecritures_comptables/lignes_ecritures/eleves/paiements.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_finance_account_balances(
  p_etablissement_id UUID
)
RETURNS TABLE (
  compte_numero TEXT,
  debit NUMERIC,
  credit NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  WITH real_lignes AS (
    SELECT l.compte_numero, l.debit::NUMERIC AS debit, l.credit::NUMERIC AS credit
    FROM public.lignes_ecritures l
    JOIN public.ecritures_comptables e ON e.id = l.ecriture_id
    WHERE e.etablissement_id = p_etablissement_id
  ),
  constatation_frais AS (
    SELECT '411'::TEXT AS compte_numero, COALESCE(c.prix, 200000)::NUMERIC AS debit, 0::NUMERIC AS credit
    FROM public.eleves el
    LEFT JOIN public.classes c ON c.id = el.classe_id
    WHERE el.etablissement_id = p_etablissement_id
      AND COALESCE(c.prix, 200000) > 0
    UNION ALL
    SELECT '706'::TEXT, 0::NUMERIC, COALESCE(c.prix, 200000)::NUMERIC
    FROM public.eleves el
    LEFT JOIN public.classes c ON c.id = el.classe_id
    WHERE el.etablissement_id = p_etablissement_id
      AND COALESCE(c.prix, 200000) > 0
  ),
  reglement AS (
    SELECT
      (CASE WHEN p.mode_paiement = 'Virement Bancaire' THEN '521' ELSE '571' END)::TEXT AS compte_numero,
      p.montant::NUMERIC AS debit,
      0::NUMERIC AS credit
    FROM public.paiements p
    JOIN public.eleves el ON el.id = p.eleve_id
    WHERE el.etablissement_id = p_etablissement_id
      AND p.statut = 'paid'
    UNION ALL
    SELECT '411'::TEXT, 0::NUMERIC, p.montant::NUMERIC
    FROM public.paiements p
    JOIN public.eleves el ON el.id = p.eleve_id
    WHERE el.etablissement_id = p_etablissement_id
      AND p.statut = 'paid'
  ),
  formation_const AS (
    SELECT '601'::TEXT AS compte_numero, f.cout_total::NUMERIC AS debit, 0::NUMERIC AS credit
    FROM public.formations_rh f
    WHERE f.etablissement_id = p_etablissement_id
      AND f.cout_total > 0
    UNION ALL
    SELECT '401'::TEXT, 0::NUMERIC, f.cout_total::NUMERIC
    FROM public.formations_rh f
    WHERE f.etablissement_id = p_etablissement_id
      AND f.cout_total > 0
  ),
  formation_reglement AS (
    SELECT '401'::TEXT AS compte_numero, f.cout_total::NUMERIC AS debit, 0::NUMERIC AS credit
    FROM public.formations_rh f
    WHERE f.etablissement_id = p_etablissement_id
      AND f.cout_total > 0
      AND f.statut IN ('Terminé', 'termine')
    UNION ALL
    SELECT '521'::TEXT, 0::NUMERIC, f.cout_total::NUMERIC
    FROM public.formations_rh f
    WHERE f.etablissement_id = p_etablissement_id
      AND f.cout_total > 0
      AND f.statut IN ('Terminé', 'termine')
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

GRANT EXECUTE ON FUNCTION public.get_finance_account_balances(UUID) TO authenticated;


-- CA collecté par classe (remplace le flatMap côté client dans
-- getClassProductivity/getSectionProductivity).
CREATE OR REPLACE FUNCTION public.get_finance_ca_par_classe(
  p_etablissement_id UUID
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
  GROUP BY e.classe_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_finance_ca_par_classe(UUID) TO authenticated;


-- Rapprochement de trésorerie quotidien (7 derniers jours par défaut),
-- remplace getDailyReconciliation.
CREATE OR REPLACE FUNCTION public.get_finance_reconciliation_quotidienne(
  p_etablissement_id UUID,
  p_jours INT DEFAULT 7
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

GRANT EXECUTE ON FUNCTION public.get_finance_reconciliation_quotidienne(UUID, INT) TO authenticated;
