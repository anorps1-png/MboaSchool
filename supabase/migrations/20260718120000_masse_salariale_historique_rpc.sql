-- ============================================================================
-- RPC : historique de la masse salariale (paie validée uniquement)
-- MboaSchool / APON — 2026-07-18
--
-- Remplace le graphique "Évolution de la masse salariale (5 derniers mois)"
-- du tableau de bord RH, qui affichait des points, labels de mois et un badge
-- de croissance entièrement écrits en dur dans le SVG (aucune donnée réelle).
--
-- Agrège les fiches_de_paie par période (mois), en ne comptant que les
-- bulletins validés ou payés (statut IN ('valide', 'paye')) — les brouillons
-- ne représentent pas une masse salariale réellement engagée. Le taux de
-- croissance compare chaque période à la précédente disponible dans
-- l'historique complet (pas seulement la fenêtre retournée), donc n'est NULL
-- que pour la toute première période jamais validée pour cet établissement.
--
-- SECURITY INVOKER (défaut) : la RLS sur fiches_de_paie s'applique normalement
-- (périmètre tenant via profiles.etablissement_id).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_masse_salariale_historique(
  p_etablissement_id UUID,
  p_months INT DEFAULT 6
)
RETURNS TABLE (
  periode TEXT,
  valeur_total NUMERIC,
  nombre_salaries INT,
  salaire_moyen NUMERIC,
  taux_croissance NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  WITH agg AS (
    SELECT
      f.periode,
      SUM(f.salaire_brut)::NUMERIC AS valeur_total,
      COUNT(DISTINCT f.personnel_id)::INT AS nombre_salaries
    FROM public.fiches_de_paie f
    WHERE f.etablissement_id = p_etablissement_id
      AND f.statut IN ('valide', 'paye')
    GROUP BY f.periode
  ),
  scored AS (
    SELECT
      a.periode,
      a.valeur_total,
      a.nombre_salaries,
      CASE WHEN a.nombre_salaries > 0
        THEN round(a.valeur_total / a.nombre_salaries)
        ELSE 0
      END AS salaire_moyen,
      LAG(a.valeur_total) OVER (ORDER BY a.periode) AS valeur_precedente
    FROM agg a
  ),
  recent AS (
    SELECT
      s.periode,
      s.valeur_total,
      s.nombre_salaries,
      s.salaire_moyen,
      CASE
        WHEN s.valeur_precedente IS NULL OR s.valeur_precedente = 0 THEN NULL
        ELSE round(((s.valeur_total - s.valeur_precedente) / s.valeur_precedente) * 100, 1)
      END AS taux_croissance
    FROM scored s
    ORDER BY s.periode DESC
    LIMIT GREATEST(p_months, 1)
  )
  SELECT * FROM recent
  ORDER BY periode ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_masse_salariale_historique(UUID, INT) TO authenticated;
