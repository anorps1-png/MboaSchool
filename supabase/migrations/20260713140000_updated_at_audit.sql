-- ============================================================================
-- Colonnes updated_at + trigger de mise à jour automatique
-- MboaSchool / APON — 2026-07-13
--
-- Ajoute un horodatage de dernière modification sur les tables mutables clés.
-- Utilité :
--   - Audit / traçabilité des modifications (notes, paiements, élèves, paie…)
--   - Fondation pour la résolution de conflits de la synchronisation hors-ligne
--     (comparer les updated_at plutôt qu'un "dernier arrivé gagne" aveugle)
--
-- Non destructif et idempotent. La colonne est renseignée par un trigger, donc
-- aucun code applicatif n'a besoin de la gérer.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DO $migration$
DECLARE
  mutable_tables TEXT[] := ARRAY[
    'eleves','paiements','notes','bulletins','classes','matieres',
    'enseignants','membres_personnel','ecritures_comptables','etablissements',
    'annees_scolaires','sections','niveaux_classes','discipline','profiles'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY mutable_tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      -- 1. Colonne (défaut NOW() pour les lignes existantes et les insertions)
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
        t
      );
      -- 2. Trigger de rafraîchissement à chaque UPDATE
      EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
      EXECUTE format(
        'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
        t
      );
    END IF;
  END LOOP;
END;
$migration$;
