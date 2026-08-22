-- ============================================================================
-- Correctif : un parent pouvait écrire dans `discipline`
-- MboaSchool / APON — 2026-08-22
--
-- CONTEXTE
-- La table réellement utilisée par le code pour les incidents disciplinaires
-- s'appelle `discipline` (pas `discipline_incidents`, qui est une table
-- orpheline créée par erreur et jamais lue/écrite par l'application — voir
-- le commentaire de 20260722100000_fix_parent_rls_cross_tenant_leak.sql).
--
-- Le durcissement du 22/07 puis du 26/07 a exclu le rôle 'parent' de
-- l'écriture sur `discipline_incidents`, `eleves`, `paiements`,
-- `tranches_scolarite`, `matieres`, `emploi_du_temps` — mais jamais sur
-- `discipline`, qui n'avait pas été identifiée comme la bonne cible.
--
-- CONSTATÉ EN BASE (2026-08-22) : les deux politiques de `discipline`
-- ('Etablissement access for ALL on discipline', PERMISSIVE, et
-- 'tenant_isolation_restrictive', RESTRICTIVE) ne vérifient que
-- etablissement_id = current_user_etablissement_id(), sans exclure le rôle
-- 'parent' ni restreindre à eleve_id appartenant au parent. Un compte parent
-- authentifié pouvait donc insérer/modifier/supprimer un incident
-- disciplinaire sur N'IMPORTE QUEL élève de son établissement — pas
-- seulement son propre enfant, la RLS ne filtrant que le tenant.
--
-- CORRECTIF : même pattern que paiements/eleves — lecture large (tous les
-- rôles non-parent gardent un accès ALL ; un parent ne doit voir que la
-- discipline de ses propres enfants, jamais écrire), écriture réservée aux
-- rôles non-parent.
-- ============================================================================

DROP POLICY IF EXISTS "Etablissement access for ALL on discipline" ON public.discipline;

CREATE POLICY "discipline_staff_all" ON public.discipline
  FOR ALL TO authenticated
  USING (
    etablissement_id = public.current_user_etablissement_id()
    AND (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) <> 'parent'
  )
  WITH CHECK (
    etablissement_id = public.current_user_etablissement_id()
    AND (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) <> 'parent'
  );

-- Lecture seule, limitée aux propres enfants du parent. Passe par
-- eleve_etablissement_id()/current_parent_eleve_ids() (SECURITY DEFINER),
-- posées par 20260726140000, pour ne pas rouvrir de récursion RLS.
CREATE POLICY "discipline_parent_read_own_children" ON public.discipline
  FOR SELECT TO authenticated
  USING (
    (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'parent'
    AND etablissement_id = public.current_user_etablissement_id()
    AND eleve_id IN (SELECT public.current_parent_eleve_ids())
  );
