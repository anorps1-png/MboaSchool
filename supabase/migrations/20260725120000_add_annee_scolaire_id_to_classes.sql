-- ============================================================================
-- Ajout de la colonne classes.annee_scolaire_id (manquante en production)
-- ============================================================================
-- schema.sql décrivait déjà classes.annee_scolaire_id comme UUID NOT NULL,
-- et tout le frontend (src/app/(dashboard)/classes/page.tsx,
-- src/lib/queries/classes.ts, dashboard.ts, evaluations, emploi-du-temps)
-- filtre/insère déjà sur cette colonne — mais elle n'a jamais existé en
-- production (aucune migration ne la créait). Conséquence : tout filtrage
-- de classes par année scolaire échouait silencieusement ou avec une
-- erreur Postgres brute, et la création de classe échouait dès que le
-- code tentait d'assigner annee_scolaire_id.
--
-- On l'ajoute nullable, on backfille les classes existantes avec l'année
-- scolaire la plus probable (déduite des élèves déjà rattachés à la
-- classe, sinon l'année scolaire la plus récente de l'établissement), puis
-- on la passe NOT NULL une fois toutes les lignes couvertes.
-- ============================================================================

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS annee_scolaire_id UUID REFERENCES public.annees_scolaires(id) ON DELETE CASCADE;

-- Backfill : année majoritaire parmi les élèves déjà rattachés à la classe.
WITH majorite AS (
  SELECT DISTINCT ON (e.classe_id)
    e.classe_id,
    e.annee_scolaire_id,
    COUNT(*) AS n
  FROM public.eleves e
  WHERE e.classe_id IS NOT NULL AND e.annee_scolaire_id IS NOT NULL
  GROUP BY e.classe_id, e.annee_scolaire_id
  ORDER BY e.classe_id, COUNT(*) DESC
)
UPDATE public.classes c
SET annee_scolaire_id = m.annee_scolaire_id
FROM majorite m
WHERE m.classe_id = c.id
  AND c.annee_scolaire_id IS NULL;

-- Backfill de secours : classes sans élève (ou sans élève rattaché à une
-- année), on prend l'année scolaire la plus récente de l'établissement.
WITH derniere_annee AS (
  SELECT DISTINCT ON (etablissement_id)
    etablissement_id, id AS annee_scolaire_id
  FROM public.annees_scolaires
  ORDER BY etablissement_id, date_fin DESC NULLS LAST, date_debut DESC NULLS LAST
)
UPDATE public.classes c
SET annee_scolaire_id = da.annee_scolaire_id
FROM derniere_annee da
WHERE da.etablissement_id = c.etablissement_id
  AND c.annee_scolaire_id IS NULL;

-- Toutes les classes restantes sans annee_scolaire_id à ce stade appartiennent
-- à un établissement qui n'a encore aucune année scolaire configurée ; on ne
-- peut pas deviner, donc on ne force pas NOT NULL s'il en reste.
DO $$
DECLARE
  v_orphelines INT;
BEGIN
  SELECT COUNT(*) INTO v_orphelines FROM public.classes WHERE annee_scolaire_id IS NULL;
  IF v_orphelines = 0 THEN
    ALTER TABLE public.classes ALTER COLUMN annee_scolaire_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_classes_annee_scolaire ON public.classes(annee_scolaire_id);
