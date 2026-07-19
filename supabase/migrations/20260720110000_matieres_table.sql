-- ============================================================================
-- Table matieres : liste des matières évaluables, scoping etablissement_id
-- MboaSchool / APON — 2026-07-20
--
-- Bug corrigé : la liste des matières évaluables (evaluations/[classeId])
-- était stockée en localStorage ('mboaschool_subjects'), propre à un
-- poste/navigateur et pas à l'établissement. Deux enseignants du même
-- établissement sur deux postes différents pouvaient voir des listes de
-- matières différentes, et une matière ajoutée par l'un n'apparaissait
-- jamais chez l'autre.
--
-- CREATE TABLE IF NOT EXISTS : si une table matieres existe déjà (elle est
-- référencée dans la liste des tables tenant de 20260713120000_security_
-- hardening.sql et 20260713140000_updated_at_audit.sql, mais sans DDL
-- suivi dans les migrations trackées), cette instruction ne la modifie pas.
-- Si son schéma diverge des colonnes attendues ici (nom, coefficient_defaut),
-- le code applicatif qui consomme cette table devra être ajusté en
-- conséquence après vérification du schéma réel.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.matieres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id UUID NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  coefficient_defaut NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (etablissement_id, nom)
);

ALTER TABLE public.matieres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS matieres_tenant_isolation ON public.matieres;
CREATE POLICY matieres_tenant_isolation ON public.matieres
  FOR ALL
  USING (etablissement_id = public.current_user_etablissement_id())
  WITH CHECK (etablissement_id = public.current_user_etablissement_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.matieres TO authenticated;
