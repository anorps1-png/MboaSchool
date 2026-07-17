-- ============================================================================
-- Durcissement des fonctions SECURITY DEFINER préexistantes
-- MboaSchool / APON — 2026-07-14
--
-- Issu d'un second audit. Deux corrections :
--
-- 1) search_path mutable sur 4 fonctions SECURITY DEFINER
--    Une fonction SECURITY DEFINER s'exécute avec les droits de son
--    propriétaire. Sans search_path fixé, la résolution des noms non qualifiés
--    dépend du search_path de l'appelant : un objet malveillant placé dans un
--    schéma prioritaire peut détourner l'exécution (escalade de privilèges).
--    C'est aussi ce que remonte le linter Supabase (function_search_path_mutable).
--
--    Ces 4 fonctions qualifient déjà toutes leurs références (public.*, auth.*)
--    et n'utilisent que des primitives de pg_catalog (NOW(), COALESCE,
--    pg_trigger_depth(), CURRENT_DATE), toujours résolues quel que soit le
--    search_path. Les pincer à '' est donc sans effet sur leur comportement.
--
-- 2) Retrait des RPC de soft-delete des enseignants
--    Le trigger trg_sync_enseignant (AFTER INSERT/UPDATE/DELETE sur enseignants)
--    réplique l'enseignant dans membres_personnel. Or soft_delete_enseignant
--    procédait par UPDATE (pose de deleted_at) : le trigger ré-injectait donc
--    l'enregistrement dans membres_personnel, qui ne porte pas de deleted_at.
--    Résultat : l'enseignant serait resté visible côté RH. Ces RPC n'étaient
--    câblées nulle part ; on les retire plutôt que de laisser un piège.
--    Un vrai soft-delete des enseignants suppose d'abord de traiter le miroir
--    enseignants <-> membres_personnel (deleted_at des deux côtés + synchro).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Pincer le search_path des fonctions SECURITY DEFINER restantes
-- ----------------------------------------------------------------------------
ALTER FUNCTION public.handle_before_user_signup()     SET search_path = '';
ALTER FUNCTION public.handle_delete_profile()          SET search_path = '';
ALTER FUNCTION public.sync_enseignant_to_personnel()   SET search_path = '';
ALTER FUNCTION public.sync_personnel_to_enseignant()   SET search_path = '';

-- ----------------------------------------------------------------------------
-- 2. Retrait des RPC de soft-delete enseignants (incompatibles avec le miroir)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.soft_delete_enseignant(UUID);
DROP FUNCTION IF EXISTS public.restore_enseignant(UUID);

-- Note : la colonne enseignants.deleted_at et son filtre RLS sont conservés
-- (inertes tant que rien ne pose deleted_at) — ils constituent la base d'un
-- futur soft-delete des enseignants une fois le miroir traité.
