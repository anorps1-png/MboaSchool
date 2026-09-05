-- ============================================================================
-- Ajout de classes.frais_inscription
--
-- Nécessaire pour que l'import Excel des élèves puisse répartir les montants
-- payés dans l'ordre "Inscription d'abord, puis tranches de scolarité" au
-- lieu de tout taguer 'Scolarité' sans jamais distinguer l'inscription.
-- Scopé par classe (comme classes.prix et tranches_scolarite.classe_id) car
-- les frais varient par classe dans cette application.
-- ============================================================================

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS frais_inscription NUMERIC DEFAULT 0;
