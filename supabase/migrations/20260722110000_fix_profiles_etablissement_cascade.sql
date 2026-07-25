-- ============================================================================
-- Correctif : Ajout de ON DELETE CASCADE sur la contrainte de clé étrangère
-- profiles_etablissement_id_fkey dans la table profiles.
-- MboaSchool / APON — 2026-07-20
--
-- Bug résolu : Lors de la suppression d'un établissement, la base de données
-- renvoie l'erreur suivante car le profil de l'administrateur appelant est
-- toujours présent et la contrainte de clé étrangère n'a pas de clause de cascade :
-- "update or delete on table "etablissements" violates foreign key constraint
-- "profiles_etablissement_id_fkey" on table "profiles""
--
-- Solution : Recréer la contrainte avec ON DELETE CASCADE pour que la suppression
-- de l'établissement entraîne automatiquement la suppression en cascade des profils
-- restants rattachés à celui-ci (notamment l'administrateur courant).
-- ============================================================================

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_etablissement_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_etablissement_id_fkey
  FOREIGN KEY (etablissement_id)
  REFERENCES public.etablissements(id)
  ON DELETE CASCADE;
