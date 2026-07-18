-- ============================================================================
-- RPC : moyenne générale par section (sous-système)
-- MboaSchool / APON — 2026-07-18
--
-- Alimente la carte "Moyenne" de chaque section sur la page Sections, qui
-- affichait une constante fabriquée (12.80/20) identique pour toutes les
-- sections de toutes les écoles.
--
-- Même sémantique que get_moyenne_generale (moyenne pondérée par élève =
-- SUM(note * coef) / SUM(coef), coef par défaut 1, puis moyenne simple de ces
-- moyennes), mais groupée par classes.section au lieu de tout l'établissement.
-- Une section sans élève noté n'apparaît simplement pas dans le résultat
-- (le client affiche "N/A" pour toute section absente).
--
-- SECURITY INVOKER (défaut) : la RLS s'applique (périmètre tenant + soft-delete).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_moyennes_par_section(
  p_etablissement_id UUID
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

GRANT EXECUTE ON FUNCTION public.get_moyennes_par_section(UUID) TO authenticated;
