import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getAuthedProfile } from '@/lib/supabase/server';
import { askBrain, type AiSettings, type ChatMessage } from '@/lib/ai/brain';
import { captureError } from '@/lib/observability/logger';

// Le Cerveau IA est réservé à admin/directeur : il peut lire l'ensemble des
// données pédagogiques/financières de l'école (via RLS, donc jamais au-delà
// de ce que ce rôle pourrait déjà consulter à la main) et proposer des
// écritures — une portée qu'on ne donne pas à enseignant/parent pour l'instant.
const ALLOWED_ROLES = new Set(['admin', 'directeur']);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const profile = await getAuthedProfile(supabase);
    if (!profile) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }
    if (!ALLOWED_ROLES.has(profile.role)) {
      return NextResponse.json({ error: "Le Cerveau IA est réservé aux comptes admin/directeur." }, { status: 403 });
    }

    const body = await req.json();
    const prompt = String(body?.prompt || '').trim();
    if (!prompt) {
      return NextResponse.json({ error: 'Message vide.' }, { status: 400 });
    }
    const history: ChatMessage[] = Array.isArray(body?.history) ? body.history : [];
    const fileContext: string | undefined = typeof body?.fileContext === 'string' ? body.fileContext : undefined;
    const providerOverride: string | undefined = typeof body?.provider === 'string' ? body.provider : undefined;

    const { data: settingsRow, error: settingsErr } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('etablissement_id', profile.etablissementId)
      .maybeSingle();

    if (settingsErr) {
      return NextResponse.json({ error: settingsErr.message }, { status: 500 });
    }
    if (!settingsRow) {
      return NextResponse.json({ error: "Aucun fournisseur IA configuré. Rendez-vous dans Paramètres > Cerveau IA." }, { status: 400 });
    }

    const response = await askBrain(supabase, settingsRow as AiSettings, history, prompt, fileContext, providerOverride);
    return NextResponse.json(response);
  } catch (err: any) {
    captureError(err, { context: 'AI brain chat error' });
    return NextResponse.json({ error: err.message || 'Erreur du Cerveau IA.' }, { status: 500 });
  }
}
