-- ============================================================================
-- Correctif critique : la fuite RLS inter-tenant du 2026-07-22 n'avait été
-- fermée qu'à moitié.
-- MboaSchool / APON — 2026-07-26
--
-- CONTEXTE
-- 20260722100000 a retiré des tables `eleves` et `paiements` les branches
-- « role IN ('admin','directeur') » dépourvues de filtre etablissement_id.
-- Mais la table `parent_eleves`, créée par la même migration fautive
-- (20260721140000), porte exactement le même motif et n'a jamais été
-- corrigée :
--
--   CREATE POLICY "Parents see their children" ON public.parent_eleves
--     USING (parent_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles
--            WHERE id = auth.uid() AND role IN ('admin','directeur')));
--
-- Sans clause FOR, c'est un FOR ALL ; sans WITH CHECK, Postgres réutilise
-- l'expression USING en écriture. La branche admin est donc vraie pour tout
-- admin de n'importe quelle école, en lecture ET en écriture.
--
-- CHAÎNE D'EXPLOITATION COMPLÈTE (aucun privilège préalable requis)
--   1. S'inscrire normalement => admin de son propre établissement.
--   2. SELECT * FROM parent_eleves => tous les couples (parent, élève) de
--      TOUTES les écoles : moisson des UUID d'élèves des autres tenants.
--   3. Créer une invitation 'parent' dans sa propre école, s'y inscrire.
--   4. INSERT INTO parent_eleves (auth.uid(), <UUID élève école B>) : accepté.
--   5. Les politiques parent de 20260722100000 (lignes 82-92) ne vérifient
--      jamais etablissement_id : elles délèguent 100 % de l'isolation à
--      parent_eleves. Lecture de l'identité complète de l'élève de l'école B
--      et de tout son historique de paiements.
--
-- CE QUE CETTE MIGRATION CORRIGE
--   1. parent_eleves : SELECT et écriture séparés, tous deux scopés tenant,
--      écriture réservée à admin/directeur.
--   2. Politiques parent sur eleves/paiements : ajout du filtre tenant et de
--      « deleted_at IS NULL » (absent, alors que toutes les autres politiques
--      du projet l'ont : un parent voyait un élève ou un paiement que l'école
--      avait soft-supprimé).
--   3. tranches_scolarite / matieres / emploi_du_temps : exclusion du rôle
--      parent, qui pouvait supprimer la grille tarifaire de son école.
--   4. paiements : lecture large, écriture réservée à admin/directeur.
--   5. discipline_incidents : un parent pouvait effacer une sanction.
--   6. Filet structurel : politique RESTRICTIVE de tenant. Les politiques
--      PERMISSIVE se combinent par OR et ne peuvent donc qu'ajouter de la
--      visibilité. Une seule politique restrictive suffit à rendre TOUTE
--      future politique permissive mal écrite inoffensive. Elle aurait à elle
--      seule neutralisé la fuite ci-dessus et la policy tautologique du 23/07.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. parent_eleves : lecture scopée, écriture réservée à admin/directeur
--
--    La table n'a pas de colonne etablissement_id : le scope passe par
--    eleve_id. La sous-requête sur `eleves` est elle-même soumise à la RLS de
--    `eleves`, mais on répète le filtre etablissement_id explicitement (défense
--    en profondeur : si une politique de `eleves` régresse à nouveau, ce filtre
--    tient toujours).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parents see their children" ON public.parent_eleves;
DROP POLICY IF EXISTS parent_eleves_select ON public.parent_eleves;
DROP POLICY IF EXISTS parent_eleves_write ON public.parent_eleves;

CREATE POLICY parent_eleves_select ON public.parent_eleves FOR SELECT TO authenticated
  USING (
    eleve_id IN (
      SELECT e.id FROM public.eleves e
      WHERE e.etablissement_id = public.current_user_etablissement_id()
    )
    AND (
      parent_id = auth.uid()
      OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) IN ('admin', 'directeur')
    )
  );

-- Écriture : seuls admin/directeur rattachent un parent à un élève, et
-- uniquement à un élève de leur propre établissement. Un compte parent ne peut
-- plus se rattacher lui-même à un élève arbitraire (étape 4 de la chaîne).
CREATE POLICY parent_eleves_write ON public.parent_eleves FOR ALL TO authenticated
  USING (
    (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) IN ('admin', 'directeur')
    AND eleve_id IN (
      SELECT e.id FROM public.eleves e
      WHERE e.etablissement_id = public.current_user_etablissement_id()
    )
  )
  WITH CHECK (
    (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) IN ('admin', 'directeur')
    AND eleve_id IN (
      SELECT e.id FROM public.eleves e
      WHERE e.etablissement_id = public.current_user_etablissement_id()
    )
    -- Le parent rattaché doit lui aussi appartenir à l'établissement.
    AND parent_id IN (
      SELECT p.id FROM public.profiles p
      WHERE p.etablissement_id = public.current_user_etablissement_id()
    )
  );


-- ----------------------------------------------------------------------------
-- 2. Politiques parent sur eleves / paiements : garde tenant + soft-delete
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parents see only their children" ON public.eleves;
CREATE POLICY "Parents see only their children" ON public.eleves FOR SELECT TO authenticated
  USING (
    (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'parent'
    AND etablissement_id = public.current_user_etablissement_id()
    AND deleted_at IS NULL
    AND id IN (SELECT pe.eleve_id FROM public.parent_eleves pe WHERE pe.parent_id = auth.uid())
  );

DROP POLICY IF EXISTS "Parents see only their children payments" ON public.paiements;
CREATE POLICY "Parents see only their children payments" ON public.paiements FOR SELECT TO authenticated
  USING (
    (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'parent'
    AND etablissement_id = public.current_user_etablissement_id()
    AND deleted_at IS NULL
    AND eleve_id IN (SELECT pe.eleve_id FROM public.parent_eleves pe WHERE pe.parent_id = auth.uid())
  );


-- ----------------------------------------------------------------------------
-- 3. paiements : lecture large (tous rôles non-parent), écriture réservée
--
--    Avant : une seule politique FOR ALL n'excluant que 'parent'. Un enseignant
--    pouvait donc modifier ou supprimer n'importe quel paiement de l'école
--    depuis la console du navigateur, avec sa session légitime. Le seul
--    garde-fou était un rendu conditionnel côté React (finance/page.tsx), et
--    le rôle qui l'alimente vient du localStorage en mode hors-ligne.
--
--    Rôles existants (schema.sql:35) : admin, directeur, enseignant, parent.
--    L'encaissement est un acte de caisse : admin et directeur uniquement.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Etablissement access for ALL on paiements" ON public.paiements;

CREATE POLICY paiements_tenant_select ON public.paiements FOR SELECT TO authenticated
  USING (
    etablissement_id = public.current_user_etablissement_id()
    AND deleted_at IS NULL
    AND (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) <> 'parent'
  );

CREATE POLICY paiements_tenant_write ON public.paiements FOR INSERT TO authenticated
  WITH CHECK (
    etablissement_id = public.current_user_etablissement_id()
    AND (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) IN ('admin', 'directeur')
  );

CREATE POLICY paiements_tenant_update ON public.paiements FOR UPDATE TO authenticated
  USING (
    etablissement_id = public.current_user_etablissement_id()
    AND deleted_at IS NULL
    AND (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) IN ('admin', 'directeur')
  )
  WITH CHECK (
    etablissement_id = public.current_user_etablissement_id()
    AND (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) IN ('admin', 'directeur')
  );

CREATE POLICY paiements_tenant_delete ON public.paiements FOR DELETE TO authenticated
  USING (
    etablissement_id = public.current_user_etablissement_id()
    AND (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) IN ('admin', 'directeur')
  );


-- ----------------------------------------------------------------------------
-- 4. Exclusion du rôle parent des tables de configuration
--
--    Ces trois politiques scopent correctement le tenant mais n'excluent pas
--    'parent', contrairement au pattern retenu pour eleves/paiements. Or un
--    compte parent porte l'etablissement_id de l'école : il pouvait supprimer
--    la grille tarifaire (DELETE /rest/v1/tranches_scolarite), ce qui met
--    pct_echu à 0 dans get_students_paginated et vide le rapport de tranches.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Etablissement access for ALL on tranches_scolarite" ON public.tranches_scolarite;
CREATE POLICY "Etablissement access for ALL on tranches_scolarite"
ON public.tranches_scolarite FOR ALL TO authenticated
  USING (
    etablissement_id = public.current_user_etablissement_id()
    AND (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) <> 'parent'
  )
  WITH CHECK (
    etablissement_id = public.current_user_etablissement_id()
    AND (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) <> 'parent'
  );

DO $mig$
BEGIN
  IF to_regclass('public.matieres') IS NOT NULL THEN
    -- Deux politiques permissives coexistent en production sur cette table
    -- (constaté en base) : matieres_tenant_isolation posée par 20260720110000,
    -- et une "Etablissement access for ALL on matieres" antérieure. Comme les
    -- permissives se combinent par OR, n'en durcir qu'une seule laisserait
    -- l'autre accorder l'accès. On supprime les deux et on n'en garde qu'une.
    EXECUTE 'DROP POLICY IF EXISTS "Etablissement access for ALL on matieres" ON public.matieres';
    EXECUTE 'DROP POLICY IF EXISTS matieres_tenant_isolation ON public.matieres';
    EXECUTE $p$
      CREATE POLICY matieres_tenant_isolation ON public.matieres FOR ALL TO authenticated
        USING (
          etablissement_id = public.current_user_etablissement_id()
          AND (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) <> 'parent'
        )
        WITH CHECK (
          etablissement_id = public.current_user_etablissement_id()
          AND (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) <> 'parent'
        )
    $p$;
  END IF;

  -- emploi_du_temps : deux définitions concurrentes existent (schema.sql via
  -- classe_id -> niveau -> section, et 20260721100000 via etablissement_id).
  -- La seconde était posée dans un bloc dont l'exception duplicate_object est
  -- avalée, donc l'état effectif était indéterminé. On tranche ici.
  IF to_regclass('public.emploi_du_temps') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Emploi du temps scope access" ON public.emploi_du_temps';
    EXECUTE 'DROP POLICY IF EXISTS emploi_du_temps_tenant ON public.emploi_du_temps';
    EXECUTE $p$
      CREATE POLICY emploi_du_temps_tenant ON public.emploi_du_temps FOR ALL TO authenticated
        USING (
          etablissement_id = public.current_user_etablissement_id()
          AND (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) <> 'parent'
        )
        WITH CHECK (
          etablissement_id = public.current_user_etablissement_id()
          AND (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) <> 'parent'
        )
    $p$;
  END IF;
END;
$mig$;


-- ----------------------------------------------------------------------------
-- 5. discipline_incidents : le parent était en écriture
--
--    La politique de 20260722100000 est FOR ALL avec un WITH CHECK identique.
--    Les sous-requêtes d'une politique sont soumises à la RLS de la table
--    référencée : pour un parent, « SELECT id FROM eleves WHERE
--    etablissement_id = ... » renvoie ses propres enfants. Il pouvait donc
--    effacer une sanction ou injecter un faux incident sur son enfant.
-- ----------------------------------------------------------------------------
DO $mig$
BEGIN
  IF to_regclass('public.discipline_incidents') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.discipline_incidents ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS discipline_incidents_tenant ON public.discipline_incidents';
    EXECUTE 'DROP POLICY IF EXISTS discipline_incidents_select ON public.discipline_incidents';
    EXECUTE 'DROP POLICY IF EXISTS discipline_incidents_write ON public.discipline_incidents';

    EXECUTE $p$
      CREATE POLICY discipline_incidents_select ON public.discipline_incidents FOR SELECT TO authenticated
        USING (
          eleve_id IN (
            SELECT e.id FROM public.eleves e
            WHERE e.etablissement_id = public.current_user_etablissement_id()
          )
        )
    $p$;

    EXECUTE $p$
      CREATE POLICY discipline_incidents_write ON public.discipline_incidents FOR ALL TO authenticated
        USING (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) <> 'parent'
          AND eleve_id IN (
            SELECT e.id FROM public.eleves e
            WHERE e.etablissement_id = public.current_user_etablissement_id()
          )
        )
        WITH CHECK (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) <> 'parent'
          AND eleve_id IN (
            SELECT e.id FROM public.eleves e
            WHERE e.etablissement_id = public.current_user_etablissement_id()
          )
        )
    $p$;
  END IF;
END;
$mig$;


-- ----------------------------------------------------------------------------
-- 6. Filet structurel : politique RESTRICTIVE de tenant
--
--    Toutes les politiques du projet sont PERMISSIVE, donc combinées par OR :
--    chaque nouvelle politique ne peut qu'ÉLARGIR l'accès. C'est le mécanisme
--    exact des deux incidents (22/07 et 23/07). Une politique RESTRICTIVE est
--    combinée par AND : elle s'applique en plus de toutes les autres et ne
--    peut jamais être contournée par l'ajout d'une permissive.
--
--    Pose défensive : on ne l'applique qu'aux tables qui ont réellement la
--    colonne etablissement_id ET dont aucune ligne existante n'a cette colonne
--    à NULL. Sans cette précaution, des lignes historiques à NULL
--    deviendraient invisibles pour tout le monde, ce qui ressemblerait à une
--    perte de données en production. Les tables sautées sont signalées par un
--    NOTICE dans la sortie de migration.
--
--    profiles est volontairement exclue : current_user_etablissement_id() la
--    lit, et le trigger protect_profile_privileges garde déjà les mutations.
--    etablissements est exclue : son identifiant de tenant est `id`, pas
--    `etablissement_id`. comptes_ohada est exclue : ses lignes NULL forment le
--    catalogue OHADA commun à toutes les écoles.
-- ----------------------------------------------------------------------------
DO $mig$
DECLARE
  tenant_tables TEXT[] := ARRAY[
    'annees_scolaires','bulletins','classes','discipline','ecritures_comptables',
    'eleves','enseignants','fiches_de_paie','matieres','niveaux_classes','notes',
    'paiements','sections','tranches_scolarite'
  ];
  t TEXT;
  null_rows BIGINT;
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'RESTRICTIVE ignorée : table %.% absente', 'public', t;
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'etablissement_id'
    ) THEN
      RAISE NOTICE 'RESTRICTIVE ignorée : %.% sans colonne etablissement_id', 'public', t;
      CONTINUE;
    END IF;

    EXECUTE format('SELECT count(*) FROM public.%I WHERE etablissement_id IS NULL', t)
      INTO null_rows;

    IF null_rows > 0 THEN
      RAISE NOTICE 'RESTRICTIVE ignorée : %.% contient % ligne(s) à etablissement_id NULL (les masquer serait perçu comme une perte de données ; corriger ces lignes puis rejouer)', 'public', t, null_rows;
      CONTINUE;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_restrictive ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_restrictive ON public.%I AS RESTRICTIVE TO authenticated '
      'USING (etablissement_id = public.current_user_etablissement_id()) '
      'WITH CHECK (etablissement_id = public.current_user_etablissement_id())',
      t
    );
  END LOOP;
END;
$mig$;
