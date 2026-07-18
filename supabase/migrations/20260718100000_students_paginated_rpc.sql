-- ============================================================================
-- RPC de pagination serveur — liste des élèves
-- MboaSchool / APON — 2026-07-18
--
-- Problème corrigé : la page Élèves charge TOUS les élèves de l'établissement
-- (par lots de 1000, mais in fine l'intégralité) avec leurs paiements imbriqués,
-- puis fait la recherche, les filtres, le calcul du statut de paiement et la
-- pagination côté navigateur. Fonctionne aujourd'hui (~3000 élèves testés),
-- se dégradera au-delà.
--
-- get_students_paginated : recherche + filtres (classe, statut de paiement,
-- sexe) + pagination calculés en base. Le statut de paiement (payé / partiel /
-- non payé) reproduit exactement la logique client de eleves/page.tsx
-- (getStudentPaymentStats) : total dû = classes.prix (200000 si NULL, comme le
-- fallback client — le fallback mockClassFees du front est un jeu de données de
-- démo dont les identifiants ne correspondent à aucun UUID réel, donc jamais
-- atteint en production), total payé = somme des paiements statut='paid'.
--
-- get_students_widget_stats : mêmes agrégats (payé/partiel/non payé/total)
-- pour les cartes de résumé en haut de page, sans transférer les lignes.
--
-- SECURITY INVOKER (défaut) : la RLS s'applique normalement, y compris le
-- filtre deleted_at IS NULL du soft-delete (politique déjà en place sur
-- eleves/paiements). p_etablissement_id doit être celui du tenant courant ;
-- la RLS empêche de toute façon de lire un autre établissement.
--
-- Ce script est IDEMPOTENT (CREATE OR REPLACE). Non appelé par le code tant
-- que la couche client n'est pas branchée dessus — sans effet sur le
-- fonctionnement actuel de l'application.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_students_paginated(
  p_etablissement_id UUID,
  p_annee_scolaire_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_classe_id UUID DEFAULT NULL,
  p_statut_paiement TEXT DEFAULT NULL, -- 'paid' | 'partial' | 'unpaid' | NULL (tous)
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
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_offset INT := GREATEST(p_page - 1, 0) * GREATEST(p_page_size, 1);
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT
      e.id, e.matricule, e.nom, e.prenom, e.sexe, e.classe_id, c.nom AS classe_nom,
      e.annee_scolaire_id, e.nom_parent, e.telephone_parent, e.email_parent,
      e.date_naissance, e.lieu_naissance, e.date_inscription, e.statut,
      COALESCE(c.prix, 200000)::NUMERIC AS total_due,
      COALESCE((
        SELECT SUM(pmt.montant) FROM public.paiements pmt
        WHERE pmt.eleve_id = e.id AND pmt.statut = 'paid'
      ), 0)::NUMERIC AS total_paid
    FROM public.eleves e
    LEFT JOIN public.classes c ON c.id = e.classe_id
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
        WHEN base.total_paid > 0 THEN 'partial'
        ELSE 'unpaid'
      END AS statut_paiement
    FROM base
  ),
  filtered AS (
    -- Qualification explicite obligatoire : "statut_paiement" est aussi le nom
    -- d'une colonne de sortie (RETURNS TABLE), donc une variable PL/pgSQL
    -- implicite dans tout le corps de la fonction. Sans le préfixe "s.", la
    -- référence est ambiguë (erreur Postgres 42702).
    SELECT * FROM scored s
    WHERE p_statut_paiement IS NULL OR s.statut_paiement = p_statut_paiement
  )
  SELECT f.*, count(*) OVER()::BIGINT AS total_count
  FROM filtered f
  ORDER BY f.nom ASC, f.id ASC
  LIMIT GREATEST(p_page_size, 1)
  OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_students_paginated(UUID, UUID, TEXT, UUID, TEXT, TEXT, INT, INT) TO authenticated;


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
  v_unpaid  INT;
BEGIN
  WITH base AS (
    SELECT
      e.id,
      COALESCE(c.prix, 200000)::NUMERIC AS total_due,
      COALESCE((
        SELECT SUM(pmt.montant) FROM public.paiements pmt
        WHERE pmt.eleve_id = e.id AND pmt.statut = 'paid'
      ), 0)::NUMERIC AS total_paid
    FROM public.eleves e
    LEFT JOIN public.classes c ON c.id = e.classe_id
    WHERE e.etablissement_id = p_etablissement_id
      AND (p_annee_scolaire_id IS NULL OR e.annee_scolaire_id = p_annee_scolaire_id)
  ),
  scored AS (
    SELECT CASE
      WHEN total_due > 0 AND total_paid >= total_due THEN 'paid'
      WHEN total_paid > 0 THEN 'partial'
      ELSE 'unpaid'
    END AS statut_paiement
    FROM base
  )
  SELECT
    count(*),
    count(*) FILTER (WHERE statut_paiement = 'paid'),
    count(*) FILTER (WHERE statut_paiement = 'partial'),
    count(*) FILTER (WHERE statut_paiement = 'unpaid')
  INTO v_total, v_paid, v_partial, v_unpaid
  FROM scored;

  RETURN jsonb_build_object(
    'total', v_total,
    'paidCount', v_paid,
    'partialCount', v_partial,
    'unpaidCount', v_unpaid
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_students_widget_stats(UUID, UUID) TO authenticated;
