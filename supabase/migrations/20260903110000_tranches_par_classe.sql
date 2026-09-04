-- ============================================================================
-- Tranches de scolarité paramétrables PAR CLASSE (au lieu de par établissement)
-- ============================================================================
-- Jusqu'ici, tranches_scolarite était scopée par (etablissement_id,
-- annee_scolaire_id) : un seul jeu de tranches partagé par TOUTES les
-- classes de l'école. Ça ne marche pas dès que deux classes ont des prix de
-- scolarité différents (classes.prix varie déjà par classe) : un montant de
-- tranche fixe n'a pas le même sens pour une classe à 100 000 FCFA et une
-- classe à 400 000 FCFA.
--
-- On ajoute classe_id (nullable pour compat avec d'éventuelles lignes
-- existantes non liées à une classe précise ; le code applicatif la
-- renseigne systématiquement pour toute nouvelle tranche).
-- ============================================================================

ALTER TABLE public.tranches_scolarite
  ADD COLUMN IF NOT EXISTS classe_id UUID REFERENCES public.classes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tranches_scolarite_classe ON public.tranches_scolarite(classe_id);

-- Cohérence tenant : classe_id doit appartenir au même établissement que la
-- ligne, même garde que enforce_annee_scolaire_same_tenant (20260726120000)
-- pour annee_scolaire_id sur cette même table.
CREATE OR REPLACE FUNCTION public.enforce_tranche_classe_same_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_classe_etab UUID;
  v_row_etab UUID;
BEGIN
  IF NEW.classe_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_row_etab := COALESCE(NEW.etablissement_id, public.current_user_etablissement_id());
  IF v_row_etab IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.etablissement_id INTO v_classe_etab
  FROM public.classes c
  WHERE c.id = NEW.classe_id;

  IF v_classe_etab IS NULL OR v_classe_etab IS DISTINCT FROM v_row_etab THEN
    RAISE EXCEPTION 'classe_id % n''appartient pas à l''établissement %',
      NEW.classe_id, v_row_etab
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_tranche_classe_same_tenant ON public.tranches_scolarite;
CREATE TRIGGER enforce_tranche_classe_same_tenant
  BEFORE INSERT OR UPDATE OF classe_id, etablissement_id ON public.tranches_scolarite
  FOR EACH ROW EXECUTE FUNCTION public.enforce_tranche_classe_same_tenant();
