-- ============================================================================
-- RPC : moyenne générale de l'établissement
-- MboaSchool / APON — 2026-07-18
--
-- Alimente la carte "Moyenne Générale" du tableau de bord financier (BSC),
-- qui affichait auparavant une constante fabriquée (12,5) car le champ
-- `bulletins` référencé n'existe pas sur Eleve.
--
-- Sémantique alignée sur get_class_rankings (même formule que les pages
-- d'évaluation) : moyenne pondérée par élève = SUM(note * coef) / SUM(coef),
-- coef par défaut 1 si nul/manquant ; puis moyenne simple de ces moyennes
-- pondérées sur tous les élèves ayant au moins une note (les élèves sans note
-- ne sont pas comptés, comme dans get_class_rankings). p_trimestre optionnel :
-- NULL agrège toutes les notes de l'élève, quel que soit le trimestre.
--
-- SECURITY INVOKER (défaut) : la RLS s'applique (périmètre tenant + soft-delete).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_moyenne_generale(
  p_etablissement_id UUID,
  p_trimestre TEXT DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  WITH notes_agg AS (
    SELECT
      n.eleve_id,
      SUM(n.note * COALESCE(NULLIF(n.coefficient, 0), 1)) AS total_points,
      SUM(COALESCE(NULLIF(n.coefficient, 0), 1))          AS total_coefs
    FROM public.notes n
    JOIN public.eleves e ON e.id = n.eleve_id
    WHERE e.etablissement_id = p_etablissement_id
      AND n.note IS NOT NULL
      AND (p_trimestre IS NULL OR n.trimestre = p_trimestre)
    GROUP BY n.eleve_id
  ),
  per_student AS (
    SELECT total_points / total_coefs AS moyenne
    FROM notes_agg
    WHERE total_coefs > 0
  )
  SELECT round(AVG(moyenne), 2) FROM per_student;
$$;

GRANT EXECUTE ON FUNCTION public.get_moyenne_generale(UUID, TEXT) TO authenticated;
