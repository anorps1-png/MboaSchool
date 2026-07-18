-- ============================================================================
-- RPC : liste des parents (dédupliqués depuis les élèves)
-- MboaSchool / APON — 2026-07-19
--
-- La page Communauté/Parents chargeait TOUTES les colonnes de TOUS les élèves
-- de l'établissement (boucle non bornée, par lots de 1000) juste pour les
-- dédupliquer en liste de parents côté navigateur. get_parents_list fait
-- cette déduplication en base.
--
-- Reproduit exactement la logique client historique :
--   - clé de regroupement = telephone_parent (si non vide), sinon
--     email_parent (si non vide), sinon 'parent-of-<id_eleve>'
--   - téléphone/email affichés = ceux du premier élève rencontré pour ce
--     parent, dans l'ordre (nom ASC, id ASC) — même ordre que le fetch
--     client historique (.order('nom').order('id'))
--   - nom affiché = le nom_parent le plus long parmi tous les élèves du
--     groupe (le client gardait `existing.nom` si un nom_parent plus long
--     apparaissait), 'Non renseigné' si aucun élève du groupe n'a de
--     nom_parent renseigné
--
-- SECURITY INVOKER (défaut) : la RLS s'applique normalement.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_parents_list(
  p_etablissement_id UUID
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

GRANT EXECUTE ON FUNCTION public.get_parents_list(UUID) TO authenticated;
