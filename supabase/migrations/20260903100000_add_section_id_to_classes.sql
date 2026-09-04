-- ============================================================================
-- Ajout de la colonne classes.section_id (manquante en production)
-- ============================================================================
-- Même situation que classes.annee_scolaire_id avant la migration
-- 20260725120000 : schema.sql décrit déjà classes.section_id comme une
-- colonne réelle (référence vers public.sections), et
-- src/app/(dashboard)/finance/page.tsx la lit déjà (getSectionProductivity,
-- comparaison c.section_id === dbSection.id) — mais aucune migration ne
-- l'avait jamais créée en production. Résultat : cette comparaison échouait
-- silencieusement (colonne absente ⇒ undefined côté client), et le calcul de
-- productivité par section retombait systématiquement sur `null`.
--
-- On l'ajoute nullable (pas de backfill obligatoire : le texte libre
-- classes.section reste la source de vérité pour l'affichage existant,
-- section_id ne fait que lier optionnellement vers la table sections pour
-- les calculs qui en ont besoin).
-- ============================================================================

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_classes_section_id ON public.classes(section_id);
