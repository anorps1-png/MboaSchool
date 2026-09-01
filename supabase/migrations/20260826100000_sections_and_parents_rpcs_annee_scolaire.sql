-- ============================================================================
-- Correctif : get_sections_summary, get_moyennes_par_section et
-- get_parents_list agrègent toutes les années scolaires confondues
-- MboaSchool / APON — 2026-08-26
--
-- Même défaut que celui corrigé sur les 3 RPC finance par
-- 20260726110000_finance_rpcs_annee_scolaire_and_scolarite_filter.sql :
-- classes.annee_scolaire_id est NOT NULL depuis 20260725120000, et la
-- réinscription crée une NOUVELLE ligne eleves par année
-- (20260725110000, contrainte UNIQUE(etablissement_id, matricule,
-- annee_scolaire_id)). Ces 3 RPC n'ont jamais reçu p_annee_scolaire_id,
-- contrairement à get_dashboard_stats/get_students_paginated corrigées à la
-- même période :
--
--   - get_sections_summary / get_moyennes_par_section : la page Sections
--     cumule élèves et notes de toutes les années sous un même nom de
--     section, sans rapport avec l'année active sélectionnée.
--   - get_parents_list : un enfant réinscrit sur plusieurs années crée une
--     "carte enfant" par année (nouvel eleve_id à chaque réinscription), y
--     compris pour des enfants ayant quitté l'école ; le téléphone/email
--     affichés peuvent provenir d'une ancienne année si le contact a changé.
--
-- p_annee_scolaire_id NULL conserve le comportement historique (toutes
-- années), ce qui garde tout appelant non encore câblé fonctionnel.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. get_sections_summary
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_sections_summary(UUID);

CREATE OR REPLACE FUNCTION public.get_sections_summary(
  p_etablissement_id UUID,
  p_annee_scolaire_id UUID DEFAULT NULL
)
RETURNS TABLE (
  section TEXT,
  classes_count BIGINT,
  students_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(c.section, 'Francophone') AS section,
    COUNT(DISTINCT c.id) AS classes_count,
    COUNT(e.id) AS students_count
  FROM public.classes c
  LEFT JOIN public.eleves e ON e.classe_id = c.id
  WHERE c.etablissement_id = p_etablissement_id
    AND (p_annee_scolaire_id IS NULL OR c.annee_scolaire_id = p_annee_scolaire_id)
  GROUP BY COALESCE(c.section, 'Francophone');
$$;

GRANT EXECUTE ON FUNCTION public.get_sections_summary(UUID, UUID) TO authenticated;


-- ----------------------------------------------------------------------------
-- 2. get_moyennes_par_section
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_moyennes_par_section(UUID);

CREATE OR REPLACE FUNCTION public.get_moyennes_par_section(
  p_etablissement_id UUID,
  p_annee_scolaire_id UUID DEFAULT NULL
)
RETURNS TABLE (
  section TEXT,
  moyenne NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  WITH notes_agg AS (
    SELECT
      n.eleve_id,
      COALESCE(c.section, 'Francophone') AS section,
      SUM(n.note * COALESCE(NULLIF(n.coefficient, 0), 1)) AS total_points,
      SUM(COALESCE(NULLIF(n.coefficient, 0), 1))          AS total_coefs
    FROM public.notes n
    JOIN public.eleves e ON e.id = n.eleve_id
    JOIN public.classes c ON c.id = e.classe_id
    WHERE e.etablissement_id = p_etablissement_id
      AND (p_annee_scolaire_id IS NULL OR e.annee_scolaire_id = p_annee_scolaire_id)
      AND n.note IS NOT NULL
    GROUP BY n.eleve_id, COALESCE(c.section, 'Francophone')
  ),
  per_student AS (
    SELECT section, total_points / total_coefs AS moyenne
    FROM notes_agg
    WHERE total_coefs > 0
  )
  SELECT section, round(AVG(moyenne), 2) AS moyenne
  FROM per_student
  GROUP BY section;
$$;

GRANT EXECUTE ON FUNCTION public.get_moyennes_par_section(UUID, UUID) TO authenticated;


-- ----------------------------------------------------------------------------
-- 3. get_parents_list
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_parents_list(UUID);

CREATE OR REPLACE FUNCTION public.get_parents_list(
  p_etablissement_id UUID,
  p_annee_scolaire_id UUID DEFAULT NULL
)
RETURNS TABLE (
  parent_key TEXT,
  nom TEXT,
  telephone TEXT,
  email TEXT,
  enfants JSONB
)
LANGUAGE sql
STABLE
AS $$
  WITH base AS (
    SELECT
      e.id, e.nom, e.prenom, e.telephone_parent, e.email_parent, e.nom_parent,
      COALESCE(
        NULLIF(TRIM(e.telephone_parent), ''),
        NULLIF(TRIM(e.email_parent), ''),
        'parent-of-' || e.id::text
      ) AS pkey
    FROM public.eleves e
    WHERE e.etablissement_id = p_etablissement_id
      AND (p_annee_scolaire_id IS NULL OR e.annee_scolaire_id = p_annee_scolaire_id)
  ),
  first_per_parent AS (
    SELECT DISTINCT ON (pkey) pkey, telephone_parent, email_parent
    FROM base
    ORDER BY pkey, nom ASC, id ASC
  ),
  longest_nom AS (
    SELECT DISTINCT ON (pkey) pkey, nom_parent
    FROM base
    WHERE nom_parent IS NOT NULL AND nom_parent <> ''
    ORDER BY pkey, length(nom_parent) DESC, nom ASC, id ASC
  ),
  enfants_agg AS (
    SELECT
      pkey,
      jsonb_agg(
        jsonb_build_object(
          'id', id, 'nom', nom, 'prenom', prenom,
          'telephoneParent', telephone_parent, 'emailParent', email_parent, 'nomParent', nom_parent
        )
        ORDER BY nom ASC, id ASC
      ) AS enfants
    FROM base
    GROUP BY pkey
  )
  SELECT
    fp.pkey AS parent_key,
    COALESCE(ln.nom_parent, 'Non renseigné') AS nom,
    COALESCE(NULLIF(fp.telephone_parent, ''), '-') AS telephone,
    COALESCE(NULLIF(fp.email_parent, ''), '-') AS email,
    ea.enfants
  FROM first_per_parent fp
  LEFT JOIN longest_nom ln ON ln.pkey = fp.pkey
  JOIN enfants_agg ea ON ea.pkey = fp.pkey;
$$;

GRANT EXECUTE ON FUNCTION public.get_parents_list(UUID, UUID) TO authenticated;
