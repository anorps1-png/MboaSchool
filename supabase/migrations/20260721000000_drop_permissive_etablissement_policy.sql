-- Phase 0 — Fix RLS cross-tenant leak: remove stale permissive policy on etablissements
-- The old policy "Etablissement read access" with USING (TRUE) was never dropped
-- when the restrictive policy etab_select was added. Postgres combines permissive
-- policies with OR, so any authenticated user could read ALL tenants' data.

DROP POLICY IF EXISTS "Etablissement read access" ON public.etablissements;
