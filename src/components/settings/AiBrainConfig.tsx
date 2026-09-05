'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { captureError } from '@/lib/observability/logger';

interface Props {
  etablissementId: string;
}

type Provider = 'gemini' | 'openai' | 'deepseek' | 'anthropic';

const PROVIDERS: { key: Provider; label: string; keyLabel: string; modelPlaceholder: string }[] = [
  { key: 'gemini', label: 'Google Gemini', keyLabel: 'Clé API Gemini', modelPlaceholder: 'gemini-2.0-flash' },
  { key: 'openai', label: 'ChatGPT (OpenAI)', keyLabel: 'Clé API OpenAI', modelPlaceholder: 'gpt-4o-mini' },
  { key: 'deepseek', label: 'DeepSeek', keyLabel: 'Clé API DeepSeek', modelPlaceholder: 'deepseek-chat' },
  { key: 'anthropic', label: 'Claude (Anthropic)', keyLabel: 'Clé API Anthropic', modelPlaceholder: 'claude-sonnet-5' },
];

interface AiSettingsForm {
  default_provider: Provider;
  gemini_api_key: string; gemini_model: string;
  openai_api_key: string; openai_model: string;
  deepseek_api_key: string; deepseek_model: string;
  anthropic_api_key: string; anthropic_model: string;
}

const EMPTY_FORM: AiSettingsForm = {
  default_provider: 'gemini',
  gemini_api_key: '', gemini_model: '',
  openai_api_key: '', openai_model: '',
  deepseek_api_key: '', deepseek_model: '',
  anthropic_api_key: '', anthropic_model: '',
};

export default function AiBrainConfig({ etablissementId }: Props) {
  const [form, setForm] = useState<AiSettingsForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    if (!etablissementId) return;
    (async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('ai_settings')
          .select('*')
          .eq('etablissement_id', etablissementId)
          .maybeSingle();
        if (data) {
          setForm({
            default_provider: data.default_provider || 'gemini',
            gemini_api_key: data.gemini_api_key || '', gemini_model: data.gemini_model || '',
            openai_api_key: data.openai_api_key || '', openai_model: data.openai_model || '',
            deepseek_api_key: data.deepseek_api_key || '', deepseek_model: data.deepseek_model || '',
            anthropic_api_key: data.anthropic_api_key || '', anthropic_model: data.anthropic_model || '',
          });
        }
      } catch (err) {
        captureError(err, { context: 'Erreur chargement ai_settings' });
      } finally {
        setLoading(false);
      }
    })();
  }, [etablissementId]);

  const handleSave = async () => {
    setSaving(true);
    setSavedMsg('');
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('ai_settings')
        .upsert([{ etablissement_id: etablissementId, ...form }], { onConflict: 'etablissement_id' });
      if (error) throw error;
      setSavedMsg('Configuration enregistrée.');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err: any) {
      captureError(err, { context: 'Erreur sauvegarde ai_settings' });
      alert("Erreur lors de l'enregistrement : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface p-6 rounded-card border border-border shadow-sm space-y-4">
      <h3 className="text-base font-bold text-ink border-b border-border pb-3 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink"><path d="M12 2a4 4 0 0 0-4 4v1a4 4 0 0 0-2 3.5V13a4 4 0 0 0 2 3.46V18a4 4 0 0 0 8 0v-1.54A4 4 0 0 0 18 13v-2.5A4 4 0 0 0 16 7V6a4 4 0 0 0-4-4z"/></svg>
        Cerveau IA
      </h3>

      <p className="text-xs text-ink-soft leading-relaxed">
        Assistant IA scopé exclusivement aux données de <strong>cette école</strong>. Il peut consulter élèves, classes,
        finances, personnel et proposer des actions — mais aucune écriture n'est jamais exécutée automatiquement :
        chaque proposition doit être approuvée manuellement avant application. Renseignez au moins une clé API
        ci-dessous pour l'activer (menu flottant en bas à droite du tableau de bord, réservé aux comptes admin/directeur).
      </p>

      {loading ? (
        <div className="text-xs text-ink-soft animate-pulse">Chargement...</div>
      ) : (
        <>
          <div>
            <label className="block text-[11px] font-bold text-ink-soft uppercase tracking-wider mb-1.5">Fournisseur par défaut</label>
            <select
              value={form.default_provider}
              onChange={(e) => setForm({ ...form, default_provider: e.target.value as Provider })}
              className="w-full sm:w-64 px-3 py-2 bg-bg border border-border rounded-control text-sm text-ink font-semibold outline-none focus:border-accent"
            >
              {PROVIDERS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {PROVIDERS.map(p => (
              <div key={p.key} className="p-3.5 bg-bg border border-border rounded-control space-y-2">
                <div className="text-xs font-bold text-ink">{p.label}</div>
                <div>
                  <label className="block text-[10px] font-bold text-ink-faint uppercase tracking-wider mb-1">{p.keyLabel}</label>
                  <input
                    type="password"
                    value={(form as any)[`${p.key}_api_key`]}
                    onChange={(e) => setForm({ ...form, [`${p.key}_api_key`]: e.target.value } as AiSettingsForm)}
                    placeholder="sk-..."
                    autoComplete="off"
                    className="w-full px-2.5 py-1.5 border border-border rounded-control text-xs font-mono outline-none focus:border-accent bg-surface"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ink-faint uppercase tracking-wider mb-1">Modèle</label>
                  <input
                    type="text"
                    value={(form as any)[`${p.key}_model`]}
                    onChange={(e) => setForm({ ...form, [`${p.key}_model`]: e.target.value } as AiSettingsForm)}
                    placeholder={p.modelPlaceholder}
                    className="w-full px-2.5 py-1.5 border border-border rounded-control text-xs font-mono outline-none focus:border-accent bg-surface"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-cream rounded-control text-xs font-extrabold shadow-cta transition-colors disabled:opacity-60"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer la configuration'}
            </button>
            {savedMsg && <span className="text-xs font-semibold text-green">{savedMsg}</span>}
          </div>
        </>
      )}
    </div>
  );
}
