-- ============================================================================
-- Soft-delete des paiements individuels
-- MboaSchool / APON — 2026-07-26
--
-- La fiche élève supprimait un paiement par DELETE physique alors que la
-- colonne deleted_at existe et que la suppression d'élève passe déjà par
-- soft_delete_eleve : le paiement était le seul objet financier détruit sans
-- trace ni restauration possible. Même modèle que soft_delete_eleve /
-- soft_delete_ecriture (20260714110000) : SECURITY DEFINER + search_path
-- vide + contrôle explicite du tenant en préambule.
--
-- Le rôle est vérifié en plus du tenant : l'annulation d'un encaissement est
-- un acte de caisse réservé à admin/directeur, aligné sur les politiques
-- paiements_tenant_* de 20260726100000.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.soft_delete_paiement(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_etab UUID := public.current_user_etablissement_id();
  v_role TEXT := (SELECT role FROM public.profiles WHERE id = auth.uid());
BEGIN
  IF v_role IS NULL OR v_role NOT IN ('admin', 'directeur') THEN
    RAISE EXCEPTION 'Seul un administrateur ou un directeur peut annuler un paiement.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.paiements WHERE id = p_id AND etablissement_id = v_etab) THEN
    RAISE EXCEPTION 'Paiement introuvable dans votre établissement.';
  END IF;
  UPDATE public.paiements SET deleted_at = NOW() WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_paiement(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_etab UUID := public.current_user_etablissement_id();
  v_role TEXT := (SELECT role FROM public.profiles WHERE id = auth.uid());
BEGIN
  IF v_role IS NULL OR v_role NOT IN ('admin', 'directeur') THEN
    RAISE EXCEPTION 'Seul un administrateur ou un directeur peut restaurer un paiement.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.paiements WHERE id = p_id AND etablissement_id = v_etab) THEN
    RAISE EXCEPTION 'Paiement introuvable dans votre établissement.';
  END IF;
  UPDATE public.paiements SET deleted_at = NULL WHERE id = p_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.soft_delete_paiement(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.restore_paiement(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_paiement(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_paiement(UUID) TO authenticated;
