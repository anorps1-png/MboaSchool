-- ============================================================================
-- RPC : résumé par section (nombre de classes, nombre d'élèves)
-- MboaSchool / APON — 2026-07-19
--
-- La page Sections chargeait TOUTES les colonnes de TOUS les élèves de
-- l'établissement (select('*, eleves(*)')) juste pour compter un effectif par
-- section. get_sections_summary fait ce comptage en base.
--
-- Même regroupement que get_moyennes_par_section (déjà en place) :
-- COALESCE(c.section, 'Francophone'), pour que les noms de section
-- correspondent exactement entre les deux RPC.
--
-- SECURITY INVOKER (défaut) : la RLS s'applique normalement.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_sections_summary(
  p_etablissement_id UUID
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
  GROUP BY COALESCE(c.section, 'Francophone');
$$;

GRANT EXECUTE ON FUNCTION public.get_sections_summary(UUID) TO authenticated;
