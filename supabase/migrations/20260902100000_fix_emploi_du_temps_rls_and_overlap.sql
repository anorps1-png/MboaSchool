-- ============================================================================
-- CORRECTIF : emploi_du_temps — écriture non scopée + aucune protection contre
-- le double-booking + lecture parent totalement bloquée
--
-- CE QUI ÉTAIT CASSÉ (posé par 20260726100000_fix_parent_eleves_leak_and_role_scoping)
--   La politique unique `emploi_du_temps_tenant` (FOR ALL) autorisait TOUT
--   compte non-parent du tenant (y compris un simple `enseignant`) à créer,
--   modifier ou supprimer N'IMPORTE QUEL créneau de N'IMPORTE QUELLE classe de
--   l'école, y compris ceux d'un collègue. Rien dans l'UI (emploi-du-temps/
--   page.tsx) ni dans la RLS ne restreint un enseignant à ses propres cours.
--   Par ailleurs le rôle 'parent' était exclu de TOUTE lecture (WITH CHECK/
--   USING excluent `role <> 'parent'`), alors que le menu de navigation
--   (DashboardLayout.tsx) donne pourtant accès à `/emploi-du-temps` aux
--   comptes parent : la page leur restait donc en permanence vide.
--   Enfin, aucune contrainte n'empêchait deux lignes de se chevaucher : un
--   même enseignant sur deux cours simultanés, ou une même classe avec deux
--   cours au même créneau.
--
-- CE QUE CETTE MIGRATION CORRIGE
--   1. Écriture (INSERT/UPDATE/DELETE) réservée à admin/directeur.
--   2. Lecture élargie à tout le personnel non-parent du tenant (inchangé
--      pour la consultation, un enseignant doit pouvoir voir la grille
--      complète de l'école, seule l'écriture est resserrée).
--   3. Lecture parent scopée aux classes des enfants qu'il a réellement
--      (via current_parent_eleve_ids(), même fonction que le reste du projet).
--   4. Contrainte d'exclusion GiST empêchant le chevauchement de créneaux
--      pour un même enseignant, et pour une même classe.
-- ============================================================================

DROP POLICY IF EXISTS emploi_du_temps_tenant ON public.emploi_du_temps;

CREATE POLICY emploi_du_temps_staff_write ON public.emploi_du_temps FOR ALL TO authenticated
  USING (
    etablissement_id = public.current_user_etablissement_id()
    AND (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) IN ('admin', 'directeur')
  )
  WITH CHECK (
    etablissement_id = public.current_user_etablissement_id()
    AND (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) IN ('admin', 'directeur')
  );

CREATE POLICY emploi_du_temps_staff_read ON public.emploi_du_temps FOR SELECT TO authenticated
  USING (
    etablissement_id = public.current_user_etablissement_id()
    AND (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) <> 'parent'
  );

CREATE POLICY emploi_du_temps_parent_read ON public.emploi_du_temps FOR SELECT TO authenticated
  USING (
    classe_id IN (
      SELECT e.classe_id FROM public.eleves e
      WHERE e.id IN (SELECT public.current_parent_eleve_ids())
        AND e.deleted_at IS NULL
    )
  );

-- ----------------------------------------------------------------------------
-- Anti-chevauchement : format horaire strict + exclusion GiST
-- ----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.emploi_du_temps
  ADD CONSTRAINT emploi_du_temps_heure_format
    CHECK (
      heure_debut ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      AND heure_fin ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      AND heure_fin > heure_debut
    );

-- Plage en minutes depuis minuit (int4range), pas de cast text->timestamp :
-- ce cast dépend du DateStyle de la session et Postgres refuse de le
-- considérer IMMUTABLE dans une colonne générée.
ALTER TABLE public.emploi_du_temps
  ADD COLUMN plage_horaire int4range GENERATED ALWAYS AS (
    int4range(
      split_part(heure_debut, ':', 1)::int * 60 + split_part(heure_debut, ':', 2)::int,
      split_part(heure_fin, ':', 1)::int * 60 + split_part(heure_fin, ':', 2)::int,
      '[)'
    )
  ) STORED;

ALTER TABLE public.emploi_du_temps
  ADD CONSTRAINT emploi_du_temps_no_overlap_enseignant
    EXCLUDE USING gist (
      enseignant_id WITH =,
      jour_semaine WITH =,
      plage_horaire WITH &&
    ) WHERE (enseignant_id IS NOT NULL);

ALTER TABLE public.emploi_du_temps
  ADD CONSTRAINT emploi_du_temps_no_overlap_classe
    EXCLUDE USING gist (
      classe_id WITH =,
      jour_semaine WITH =,
      plage_horaire WITH &&
    ) WHERE (classe_id IS NOT NULL);
