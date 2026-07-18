-- ============================================================================
-- RPC : nombre d'élèves par classe
-- MboaSchool / APON — 2026-07-19
--
-- La page Classes chargeait la colonne classe_id de TOUS les élèves de
-- l'établissement (boucle non bornée, par lots de 1000) juste pour compter
-- un effectif par classe côté navigateur. get_students_per_class fait ce
-- comptage en base.
--
-- SECURITY INVOKER (défaut) : la RLS s'applique normalement.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_students_per_class(
  p_etablissement_id UUID
)
RETURNS TABLE (
  classe_id UUID,
  student_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT e.classe_id, COUNT(*) AS student_count
  FROM public.eleves e
  WHERE e.etablissement_id = p_etablissement_id
    AND e.classe_id IS NOT NULL
  GROUP BY e.classe_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_students_per_class(UUID) TO authenticated;
