-- ============================================================================
-- Correctif critique : fuite RLS inter-tenant introduite par le système de
-- comptes parents (20260721140000_parent_accounts_system.sql)
-- MboaSchool / APON — 2026-07-22
--
-- Deux bugs distincts, trouvés par revue statique (Postgres combine les
-- politiques RLS PERMISSIVE par OR — ce comportement est déterministe, pas
-- besoin d'accès à la base pour le confirmer) :
--
-- 1) FUITE INTER-TENANT SÉVÈRE (la plus grave) :
--    Les politiques "Parents see only their children" (eleves) et
--    "Parents see only their children payments" (paiements) contiennent des
--    branches OR pour les rôles admin/directeur/enseignant SANS AUCUN filtre
--    etablissement_id :
--      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','directeur')
--    Combinée par OR avec la politique tenant existante, cette branche à elle
--    seule donnait à TOUT admin/directeur (et TOUT enseignant, pour la table
--    eleves) de N'IMPORTE QUELLE école un accès en lecture à TOUS les élèves
--    et TOUS les paiements de TOUTES les écoles de la plateforme. Ces rôles
--    disposaient déjà d'un accès correctement scopé via la politique tenant
--    existante ("Etablissement access for ALL on ...") : ces branches
--    n'ajoutaient donc rien de légitime, seulement la fuite.
--    Correctif : suppression de ces politiques, remplacées par des politiques
--    strictement scopées au rôle 'parent' + à la liaison parent_eleves.
--
-- 2) RESTRICTION PARENT INEFFECTIVE :
--    Même corrigées, ces politiques additionnelles ne pouvaient de toute
--    façon jamais RESTREINDRE un parent à ses seuls enfants : la politique de
--    base "Etablissement access for ALL on eleves/paiements" (FOR ALL, sans
--    filtre de rôle) accorde déjà à tout profil dont l'etablissement_id
--    correspond — y compris un profil de rôle 'parent', créé avec le même
--    etablissement_id que l'école via le flux d'invitation — un accès
--    LECTURE ET ÉCRITURE à TOUS les élèves/paiements de cette école. Une
--    politique RLS permissive ne peut qu'ADDITIONNER de la visibilité,
--    jamais en retirer : ajouter une politique "restrictive" en apparence
--    n'a aucun effet tant que la politique de base ne exclut pas elle-même
--    le rôle parent.
--    Correctif : la politique de base exclut désormais explicitement le rôle
--    'parent' (lecture ET écriture) ; seule la politique dédiée
--    parent_eleves gouverne alors la visibilité d'un compte parent, en
--    lecture seule (aucune politique d'écriture pour ce rôle = refus par
--    défaut, conforme à l'intention documentée « Parents ne voient que leurs
--    enfants »). Aucun usage d'écriture parent->eleves/paiements n'existe
--    dans le code applicatif actuel (RH crée les comptes parents côté admin) :
--    ce retrait d'accès en écriture ne change aucun comportement utilisateur
--    existant.
-- ============================================================================

-- 1. Retrait des politiques dangereuses (fuite inter-tenant)
DROP POLICY IF EXISTS "Parents see only their children" ON public.eleves;
DROP POLICY IF EXISTS "Parents see only their children payments" ON public.paiements;

-- 2. Politique de base : exclut désormais le rôle 'parent' (lecture + écriture)
DROP POLICY IF EXISTS "Etablissement access for ALL on eleves" ON public.eleves;
CREATE POLICY "Etablissement access for ALL on eleves" ON public.eleves TO authenticated
  USING (
    etablissement_id = public.current_user_etablissement_id()
    AND deleted_at IS NULL
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) <> 'parent'
  )
  WITH CHECK (
    etablissement_id = public.current_user_etablissement_id()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) <> 'parent'
  );

DROP POLICY IF EXISTS "Etablissement access for ALL on paiements" ON public.paiements;
CREATE POLICY "Etablissement access for ALL on paiements" ON public.paiements TO authenticated
  USING (
    etablissement_id = public.current_user_etablissement_id()
    AND deleted_at IS NULL
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) <> 'parent'
  )
  WITH CHECK (
    etablissement_id = public.current_user_etablissement_id()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) <> 'parent'
  );

-- 3. Politiques parent : lecture seule, strictement scopées à parent_eleves.
--    Pas de WITH CHECK => aucune écriture possible pour ce rôle sur ces
--    politiques (et la politique de base l'exclut désormais aussi) : un
--    parent est en lecture seule sur ses propres enfants, par construction.
CREATE POLICY "Parents see only their children" ON public.eleves FOR SELECT TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'parent'
    AND id IN (SELECT eleve_id FROM public.parent_eleves WHERE parent_id = auth.uid())
  );

CREATE POLICY "Parents see only their children payments" ON public.paiements FOR SELECT TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'parent'
    AND eleve_id IN (SELECT eleve_id FROM public.parent_eleves WHERE parent_id = auth.uid())
  );

-- ============================================================================
-- 4. Défense en profondeur : discipline_incidents (trouvaille annexe du même
--    audit, sans rapport avec les points 1-3 ci-dessus)
--
-- schema.sql et 20260721100000_add_missing_tables.sql référencent une table
-- `discipline_incidents`, mais le code applicatif écrit en réalité dans une
-- table `discipline` (src/app/(dashboard)/eleves/[id]/page.tsx). Si
-- `discipline_incidents` a été créée par cette dernière migration (table
-- absente sous ce nom exact avant), elle l'a été SANS RLS. Elle est vide en
-- pratique (rien n'y écrit), mais par hygiène et prévention d'un futur trou
-- si du code venait un jour à l'utiliser, on la protège comme les autres
-- tables tenant. La lecture erronée côté bulletin (bulletin/[eleveId]/page.tsx)
-- est corrigée séparément côté application pour pointer vers `discipline`.
-- ============================================================================
DO $mig$
BEGIN
  IF to_regclass('public.discipline_incidents') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.discipline_incidents ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS discipline_incidents_tenant ON public.discipline_incidents';
    EXECUTE $p$
      CREATE POLICY discipline_incidents_tenant ON public.discipline_incidents TO authenticated
        USING (
          eleve_id IN (SELECT id FROM public.eleves WHERE etablissement_id = public.current_user_etablissement_id())
        )
        WITH CHECK (
          eleve_id IN (SELECT id FROM public.eleves WHERE etablissement_id = public.current_user_etablissement_id())
        )
    $p$;
  END IF;
END;
$mig$;
