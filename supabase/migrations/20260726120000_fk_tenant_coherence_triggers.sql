-- ============================================================================
-- Cohérence tenant/année des clés étrangères
-- MboaSchool / APON — 2026-07-26
--
-- La vérification d'une clé étrangère s'exécute par le moteur, HORS RLS : une
-- ligne peut donc référencer une ligne d'un autre établissement même si
-- l'appelant ne peut pas la voir. Trois FK sont concernées :
--
--   - classes.annee_scolaire_id  (ON DELETE CASCADE) : une classe de l'école A
--     pointant vers une année de l'école B est DÉTRUITE quand B supprime son
--     année ou son établissement — primitive de destruction inter-tenant.
--   - tranches_scolarite.annee_scolaire_id (ON DELETE CASCADE) : idem.
--   - paiements.tranche_id (ON DELETE SET NULL) : un paiement rattachable à la
--     tranche d'une autre école (oracle d'existence d'UUID + montant qui
--     disparaît du rapport de tranches sans être compté « non rattaché »).
--
-- Correctif : triggers BEFORE INSERT OR UPDATE qui vérifient que la ligne
-- référencée appartient au même établissement. SECURITY DEFINER + search_path
-- vide, car la vérification doit lire la ligne référencée même quand la RLS la
-- masque à l'appelant (c'est précisément le cas d'attaque).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_annee_scolaire_same_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_annee_etab UUID;
  v_row_etab UUID;
BEGIN
  IF NEW.annee_scolaire_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Ce trigger se déclenche AVANT set_etablissement_id (ordre alphabétique des
  -- triggers BEFORE) : la colonne peut donc être encore NULL sur un payload
  -- hors-ligne incomplet. On résout le tenant effectif comme le fera
  -- set_etablissement_id juste après.
  v_row_etab := COALESCE(NEW.etablissement_id, public.current_user_etablissement_id());

  -- Tenant irrésolu = contexte service_role/migration (auth.uid() NULL) :
  -- on laisse passer, ces contextes sont de confiance et hors RLS de toute
  -- façon. Pour un utilisateur authentifié, current_user_etablissement_id()
  -- n'est jamais NULL (profil obligatoire, comportement fail-closed ailleurs).
  IF v_row_etab IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT a.etablissement_id INTO v_annee_etab
  FROM public.annees_scolaires a
  WHERE a.id = NEW.annee_scolaire_id;

  IF v_annee_etab IS NULL OR v_annee_etab IS DISTINCT FROM v_row_etab THEN
    RAISE EXCEPTION 'annee_scolaire_id % n''appartient pas à l''établissement %',
      NEW.annee_scolaire_id, v_row_etab
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_annee_same_tenant ON public.classes;
CREATE TRIGGER enforce_annee_same_tenant
  BEFORE INSERT OR UPDATE OF annee_scolaire_id, etablissement_id ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_annee_scolaire_same_tenant();

DROP TRIGGER IF EXISTS enforce_annee_same_tenant ON public.tranches_scolarite;
CREATE TRIGGER enforce_annee_same_tenant
  BEFORE INSERT OR UPDATE OF annee_scolaire_id, etablissement_id ON public.tranches_scolarite
  FOR EACH ROW EXECUTE FUNCTION public.enforce_annee_scolaire_same_tenant();

-- eleves.annee_scolaire_id partage la même exigence (FK sans garde tenant).
DROP TRIGGER IF EXISTS enforce_annee_same_tenant ON public.eleves;
CREATE TRIGGER enforce_annee_same_tenant
  BEFORE INSERT OR UPDATE OF annee_scolaire_id, etablissement_id ON public.eleves
  FOR EACH ROW EXECUTE FUNCTION public.enforce_annee_scolaire_same_tenant();


CREATE OR REPLACE FUNCTION public.enforce_paiement_tranche_same_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tranche_etab UUID;
  v_row_etab UUID;
BEGIN
  IF NEW.tranche_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Même précaution d'ordre de déclenchement que
  -- enforce_annee_scolaire_same_tenant (voir ci-dessus).
  v_row_etab := COALESCE(NEW.etablissement_id, public.current_user_etablissement_id());
  IF v_row_etab IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT t.etablissement_id INTO v_tranche_etab
  FROM public.tranches_scolarite t
  WHERE t.id = NEW.tranche_id;

  IF v_tranche_etab IS NULL OR v_tranche_etab IS DISTINCT FROM v_row_etab THEN
    RAISE EXCEPTION 'tranche_id % n''appartient pas à l''établissement %',
      NEW.tranche_id, v_row_etab
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_tranche_same_tenant ON public.paiements;
CREATE TRIGGER enforce_tranche_same_tenant
  BEFORE INSERT OR UPDATE OF tranche_id, etablissement_id ON public.paiements
  FOR EACH ROW EXECUTE FUNCTION public.enforce_paiement_tranche_same_tenant();

-- Aucun GRANT : les fonctions trigger ne sont pas appelables directement, et
-- SECURITY DEFINER + search_path vide suivent le pattern des autres triggers
-- du projet (set_etablissement_id, protect_profile_privileges).
