-- ============================================================================
-- RPC de classement par classe : moyennes + rangs + mentions
-- MboaSchool / APON — 2026-07-13
--
-- Remplace le calcul côté client des pages d'évaluation (synthèse de classe et
-- bulletin), qui chargeaient tous les élèves de la classe ET toutes leurs notes
-- pour calculer moyennes et rangs dans le navigateur.
--
-- La sémantique reproduit FIDÈLEMENT celle des pages actuelles pour ne rien
-- changer aux valeurs affichées :
--   - Moyenne = SUM(note * coef) / SUM(coef), coef = coefficient DE LA NOTE
--     (0 ou NULL => 1). Pas de normalisation de barème (notes saisies sur /20).
--   - Seules les notes non nulles du trimestre comptent ; un élève sans note a
--     une moyenne de 0 et n'est pas classé (rang NULL).
--   - Rang « competition » (ex-æquo au même rang, rangs suivants sautés),
--     équivalent au indexOf(moyenne) sur les moyennes triées côté client.
--   - Mention selon le seuil de réussite de l'établissement (défaut 10).
--
-- SECURITY INVOKER (défaut) : la RLS s'applique (périmètre tenant respecté).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_class_rankings(
  p_classe_id  UUID,
  p_trimestre  TEXT
)
RETURNS TABLE (
  eleve_id     UUID,
  nom          TEXT,
  prenom       TEXT,
  matricule    TEXT,
  moyenne      NUMERIC,
  total_points NUMERIC,
  rang         INT,
  mention      TEXT,
  effectif     INT
)
LANGUAGE sql
STABLE
AS $$
  WITH seuil AS (
    SELECT COALESCE(e.seuil_reussite, 10) AS valeur
    FROM public.classes c
    LEFT JOIN public.etablissements e ON e.id = c.etablissement_id
    WHERE c.id = p_classe_id
  ),
  notes_agg AS (
    SELECT
      n.eleve_id,
      SUM(n.note * COALESCE(NULLIF(n.coefficient, 0), 1)) AS total_points,
      SUM(COALESCE(NULLIF(n.coefficient, 0), 1))          AS total_coefs
    FROM public.notes n
    JOIN public.eleves el ON el.id = n.eleve_id
    WHERE el.classe_id = p_classe_id
      AND n.trimestre = p_trimestre
      AND n.note IS NOT NULL
    GROUP BY n.eleve_id
  ),
  per_student AS (
    SELECT
      s.id AS eleve_id,
      s.nom,
      s.prenom,
      s.matricule,
      CASE WHEN COALESCE(na.total_coefs, 0) > 0
        THEN na.total_points / na.total_coefs ELSE 0 END AS moyenne_raw,
      COALESCE(na.total_points, 0) AS total_points
    FROM public.eleves s
    LEFT JOIN notes_agg na ON na.eleve_id = s.id
    WHERE s.classe_id = p_classe_id
  ),
  ranked AS (
    SELECT
      ps.*,
      CASE WHEN ps.moyenne_raw > 0
        THEN RANK() OVER (ORDER BY ps.moyenne_raw DESC)
        ELSE NULL END AS rang
    FROM per_student ps
  )
  SELECT
    r.eleve_id,
    r.nom,
    r.prenom,
    r.matricule,
    round(r.moyenne_raw, 2) AS moyenne,
    round(r.total_points, 2) AS total_points,
    r.rang::INT,
    CASE
      WHEN r.moyenne_raw >= 16 THEN 'Très Bien'
      WHEN r.moyenne_raw >= 14 THEN 'Bien'
      WHEN r.moyenne_raw >= 12 THEN 'Assez Bien'
      WHEN r.moyenne_raw >= (SELECT valeur FROM seuil) THEN 'Passable'
      ELSE 'Insuffisant'
    END AS mention,
    (SELECT count(*)::INT FROM public.eleves WHERE classe_id = p_classe_id) AS effectif
  FROM ranked r
  ORDER BY (r.rang IS NULL), r.rang, r.nom, r.prenom;
$$;

GRANT EXECUTE ON FUNCTION public.get_class_rankings(UUID, TEXT) TO authenticated;
