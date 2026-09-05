-- ============================================================================
-- Cerveau IA — configuration multi-fournisseurs par établissement
--
-- Une ligne par établissement, jamais partagée entre écoles (isolation
-- tenant identique au reste de l'application). Les clés API sont des
-- identifiants sensibles : lecture/écriture réservées à admin/directeur,
-- jamais lisibles par enseignant/parent, jamais exposées à un autre
-- établissement même via une policy mal écrite (RESTRICTIVE en filet, même
-- principe que 20260726100000_fix_parent_eleves_leak_and_role_scoping).
-- ============================================================================

CREATE TABLE public.ai_settings (
  etablissement_id UUID PRIMARY KEY REFERENCES public.etablissements(id) ON DELETE CASCADE,
  default_provider TEXT NOT NULL DEFAULT 'gemini' CHECK (default_provider IN ('gemini', 'openai', 'deepseek', 'anthropic')),

  gemini_api_key TEXT,
  gemini_model TEXT DEFAULT 'gemini-2.0-flash',

  openai_api_key TEXT,
  openai_model TEXT DEFAULT 'gpt-4o-mini',

  deepseek_api_key TEXT,
  deepseek_model TEXT DEFAULT 'deepseek-chat',

  anthropic_api_key TEXT,
  anthropic_model TEXT DEFAULT 'claude-sonnet-5',

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_settings_admin_only ON public.ai_settings FOR ALL TO authenticated
  USING (
    etablissement_id = public.current_user_etablissement_id()
    AND (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) IN ('admin', 'directeur')
  )
  WITH CHECK (
    etablissement_id = public.current_user_etablissement_id()
    AND (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) IN ('admin', 'directeur')
  );

-- Filet structurel : même en cas de policy PERMISSIVE mal écrite plus tard
-- sur cette table, aucune ligne d'un autre établissement ne doit jamais être
-- lisible (les policies PERMISSIVE se combinent par OR, une seule
-- RESTRICTIVE suffit à neutraliser cette classe de bug).
CREATE POLICY ai_settings_tenant_floor ON public.ai_settings AS RESTRICTIVE FOR ALL TO authenticated
  USING (etablissement_id = public.current_user_etablissement_id())
  WITH CHECK (etablissement_id = public.current_user_etablissement_id());
