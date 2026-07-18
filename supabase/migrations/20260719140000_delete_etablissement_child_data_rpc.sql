-- ============================================================================
-- RPC : suppression en cascade des données d'un établissement (compte admin)
-- MboaSchool / APON — 2026-07-19
--
-- Bug corrigé : la suppression de compte récupérait les ids élèves/écritures
-- via .select('id') SANS pagination (plafond Supabase à 1000 lignes), puis
-- cascade-supprimait notes/bulletins/discipline_incidents/lignes_ecritures
-- via ces listes d'ids. Toute école dépassant 1000 élèves ou 1000 écritures
-- laissait silencieusement des lignes orphelines en base après suppression
-- de compte. Le tout se faisait aussi en 14 appels réseau séquentiels sans
-- transaction : un échec en cours de route laissait le compte à moitié
-- supprimé.
--
-- Cette RPC fait les mêmes suppressions directement en base (aucun
-- aller-retour d'ids via le client), dans le même ordre que le code
-- historique (enfants avant parents, même périmètre exact). Un seul appel
-- plpgsql = une seule transaction, ce qui corrige aussi l'atomicité.
--
-- ⚠️ Volontairement NON inclus (périmètre inchangé par rapport au code
-- historique) :
--   - La suppression de la ligne `etablissements` elle-même (reste côté
--     client, cascade déjà le profil de l'appelant).
--   - Toute donnée déjà soft-deletée (deleted_at IS NOT NULL) : en
--     SECURITY INVOKER, la RLS s'applique normalement et ces lignes restent
--     invisibles à cette RPC, exactement comme au code client actuel. Cette
--     RPC ne garantit donc pas un effacement complet façon RGPD de
--     l'historique soft-deleted — même limite que l'existant, pas une
--     régression, mais pas non plus une résolution.
--
-- SECURITY INVOKER (défaut) : la RLS s'applique normalement, y compris pour
-- la suppression des profils d'autres utilisateurs (déjà permise par la
-- politique RLS existante, utilisée par le code client actuel).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_etablissement_child_data(
  p_etablissement_id UUID,
  p_current_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Notes, bulletins, incidents disciplinaires (via la liste d'élèves)
  DELETE FROM public.notes
    WHERE eleve_id IN (SELECT id FROM public.eleves WHERE etablissement_id = p_etablissement_id);
  DELETE FROM public.bulletins
    WHERE eleve_id IN (SELECT id FROM public.eleves WHERE etablissement_id = p_etablissement_id);
  DELETE FROM public.discipline_incidents
    WHERE eleve_id IN (SELECT id FROM public.eleves WHERE etablissement_id = p_etablissement_id);

  -- 2. Paiements, élèves
  DELETE FROM public.paiements WHERE etablissement_id = p_etablissement_id;
  DELETE FROM public.eleves WHERE etablissement_id = p_etablissement_id;

  -- 3. Lignes d'écritures, écritures comptables, plan comptable
  DELETE FROM public.lignes_ecritures
    WHERE ecriture_id IN (SELECT id FROM public.ecritures_comptables WHERE etablissement_id = p_etablissement_id);
  DELETE FROM public.ecritures_comptables WHERE etablissement_id = p_etablissement_id;
  DELETE FROM public.comptes_ohada WHERE etablissement_id = p_etablissement_id;

  -- 4. Classes, sections, années scolaires
  DELETE FROM public.classes WHERE etablissement_id = p_etablissement_id;
  DELETE FROM public.sections WHERE etablissement_id = p_etablissement_id;
  DELETE FROM public.annees_scolaires WHERE etablissement_id = p_etablissement_id;

  -- 5. Enseignants, personnel, formations
  DELETE FROM public.enseignants WHERE etablissement_id = p_etablissement_id;
  DELETE FROM public.membres_personnel WHERE etablissement_id = p_etablissement_id;
  DELETE FROM public.formations_rh WHERE etablissement_id = p_etablissement_id;

  -- 6. Autres profils de l'établissement (pas celui de l'appelant)
  DELETE FROM public.profiles
    WHERE etablissement_id = p_etablissement_id AND id != p_current_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_etablissement_child_data(UUID, UUID) TO authenticated;
