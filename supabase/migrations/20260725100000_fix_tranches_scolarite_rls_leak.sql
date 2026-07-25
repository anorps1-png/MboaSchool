-- La policy RLS créée par 20260723100000_tranches_scolarite.sql était
-- tautologique : elle comparait etablissement_id à lui-même via une
-- sous-requête qui se filtre sur ce même etablissement_id, sans jamais
-- vérifier l'identité de l'appelant. Résultat : USING/WITH CHECK valaient
-- toujours vrai, pour n'importe quel utilisateur authentifié, quel que
-- soit son établissement — accès en lecture/écriture/suppression à la
-- configuration des tranches de scolarité de tous les établissements.
--
-- Corrige en alignant sur le pattern standard utilisé partout ailleurs
-- dans ce projet (voir 20260713120000_security_hardening.sql) :
-- current_user_etablissement_id() résout l'établissement du CALLER via
-- profiles/auth.uid(), pas via la ligne elle-même.

DROP POLICY IF EXISTS "Etablissement access for ALL on tranches_scolarite" ON public.tranches_scolarite;

CREATE POLICY "Etablissement access for ALL on tranches_scolarite"
ON public.tranches_scolarite
FOR ALL
TO authenticated
USING (etablissement_id = public.current_user_etablissement_id())
WITH CHECK (etablissement_id = public.current_user_etablissement_id());
