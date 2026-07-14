-- ============================================================================
-- Index de scalabilité multi-tenant
-- MboaSchool / APON — 2026-07-14
--
-- Sur un jeu de données mono-établissement dominant, PostgreSQL préfère les
-- Seq Scans (optimal quand presque toutes les lignes appartiennent au tenant).
-- Mais en multi-tenant réel (des dizaines/centaines d'établissements), chaque
-- requête filtrée par etablissement_id ne doit lire QUE les lignes du tenant.
-- Ces index composites/couvrants rendent ces accès sélectifs et évitent les
-- tris superflus.
--
-- CREATE INDEX CONCURRENTLY est impossible dans une transaction ; ces créations
-- verrouillent brièvement en écriture, ce qui est acceptable hors pointe.
-- Idempotent (IF NOT EXISTS).
-- ============================================================================

-- 1. Somme des paiements réglés par établissement (tableau de bord, finance).
--    Index couvrant : le seek se limite aux paiements 'paid' du tenant et lit
--    montant directement depuis l'index (index-only scan possible).
CREATE INDEX IF NOT EXISTS idx_paiements_etab_statut_montant
  ON public.paiements (etablissement_id, statut) INCLUDE (montant);

-- 2. Liste des élèves d'un établissement triée par nom (page Élèves, exports).
--    Sert à la fois le filtre par tenant et l'ordre, supprimant l'étape de tri.
CREATE INDEX IF NOT EXISTS idx_eleves_etab_nom
  ON public.eleves (etablissement_id, nom);

-- 3. Notes d'un élève par trimestre (classements, bulletins).
--    Index partiel sur les notes chiffrées : cible exactement les lignes
--    utilisées par get_class_rankings (note non nulle).
CREATE INDEX IF NOT EXISTS idx_notes_eleve_trimestre
  ON public.notes (eleve_id, trimestre) WHERE note IS NOT NULL;

-- 4. Paiements d'un élève par statut (statut de paiement par élève, page Élèves).
CREATE INDEX IF NOT EXISTS idx_paiements_eleve_statut
  ON public.paiements (eleve_id, statut) INCLUDE (montant);

-- Rafraîchit les statistiques du planificateur pour ces tables.
ANALYZE public.paiements;
ANALYZE public.eleves;
ANALYZE public.notes;
