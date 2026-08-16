-- ============================================================================
-- Ajout de la colonne montant sur tranches_scolarite
-- MboaSchool / APON — 2026-08-16
-- ============================================================================

ALTER TABLE public.tranches_scolarite
  ADD COLUMN IF NOT EXISTS montant NUMERIC DEFAULT 0;

-- Assouplir la contrainte sur pourcentage pour autoriser la priorité au montant
ALTER TABLE public.tranches_scolarite
  DROP CONSTRAINT IF EXISTS tranches_scolarite_pourcentage_check;

ALTER TABLE public.tranches_scolarite
  ADD CONSTRAINT tranches_scolarite_pourcentage_check CHECK (pourcentage >= 0);
