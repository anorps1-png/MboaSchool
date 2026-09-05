import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getAuthedProfile } from '@/lib/supabase/server';
import { ALLOWED_TABLES } from '@/lib/ai/brain';
import { captureError, captureMessage } from '@/lib/observability/logger';

const ALLOWED_ROLES = new Set(['admin', 'directeur']);

// Exécute UNE proposition déjà validée par un humain dans l'UI. N'exécute
// jamais rien de sa propre initiative : cette route n'est appelée qu'au clic
// explicite sur "Approuver" côté client. Utilise le même client Supabase
// authentifié (RLS actives) qu'un admin utiliserait pour la même opération à
// la main — aucun canal d'écriture plus permissif n'est ouvert pour l'IA.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const profile = await getAuthedProfile(supabase);
    if (!profile) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }
    if (!ALLOWED_ROLES.has(profile.role)) {
      return NextResponse.json({ error: "Réservé aux comptes admin/directeur." }, { status: 403 });
    }

    const body = await req.json();
    const { table, action, payload, filters, reason } = body || {};

    if (!ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: `Table non autorisée : "${table}".` }, { status: 400 });
    }
    if (!['insert', 'update', 'delete', 'upsert'].includes(action)) {
      return NextResponse.json({ error: `Action non reconnue : "${action}".` }, { status: 400 });
    }

    let query: any = supabase.from(table);
    let result;

    if (action === 'insert') {
      result = await query.insert(payload).select();
    } else if (action === 'upsert') {
      result = await query.upsert(payload).select();
    } else if (action === 'update') {
      query = query.update(payload);
      for (const f of filters || []) query = query.eq(f.field, f.value);
      result = await query.select();
    } else if (action === 'delete') {
      query = query.delete();
      for (const f of filters || []) query = query.eq(f.field, f.value);
      result = await query.select();
    }

    if (result?.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    captureMessage('AI brain proposal applied', { table, action, reason, userId: profile.userId });
    return NextResponse.json({ success: true, data: result?.data });
  } catch (err: any) {
    captureError(err, { context: 'AI brain apply-proposal error' });
    return NextResponse.json({ error: err.message || "Erreur lors de l'exécution." }, { status: 500 });
  }
}
