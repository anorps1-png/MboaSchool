import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getAuthedProfile } from '@/lib/supabase/server';
import { ALLOWED_TABLES } from '@/lib/ai/brain';
import { captureError, captureMessage } from '@/lib/observability/logger';

const ALLOWED_ROLES = new Set(['admin', 'directeur']);

const ACTION_VERB: Record<string, string> = { insert: 'créer', update: 'modifier', delete: 'supprimer', upsert: 'créer/mettre à jour' };

// Traduit les erreurs Postgres brutes (codes SQLSTATE) en messages compréhensibles
// par un admin d'école non technicien, plutôt que de renvoyer tel quel un message
// du type `update or delete on table "x" violates foreign key constraint "..." on
// table "y"` — ce que voyait l'utilisateur avant ce correctif.
function friendlyDbError(error: { message?: string; details?: string; code?: string } | null | undefined, table: string, action: string): string {
  const raw = error?.message || 'Erreur inconnue.';
  const details = error?.details || '';
  const code = error?.code;
  const verb = ACTION_VERB[action] || action;

  if (code === '23503') {
    const blockedBy = details.match(/is still referenced from table "([^"]+)"/)?.[1];
    if (blockedBy) {
      return `Impossible de ${verb} cet enregistrement dans « ${table} » : il est encore utilisé par des données existantes dans « ${blockedBy} ». Retirez ou réaffectez ces liens avant de réessayer.`;
    }
    const missingIn = details.match(/is not present in table "([^"]+)"/)?.[1];
    if (missingIn) {
      return `Impossible de ${verb} dans « ${table} » : une valeur référencée n'existe pas dans « ${missingIn} ». Vérifiez l'identifiant utilisé.`;
    }
    return `Impossible de ${verb} dans « ${table} » : cette opération viole un lien avec une autre table.`;
  }
  if (code === '23505') {
    return `Impossible de ${verb} dans « ${table} » : une valeur en double existe déjà (contrainte d'unicité).`;
  }
  if (code === '23502') {
    const col = details.match(/column "([^"]+)"/)?.[1] || raw.match(/column "([^"]+)"/)?.[1];
    return `Impossible de ${verb} dans « ${table} » : le champ${col ? ` « ${col} »` : ''} est obligatoire et n'a pas été renseigné.`;
  }
  if (code === '23514') {
    return `Impossible de ${verb} dans « ${table} » : une valeur ne respecte pas une règle de validation.`;
  }
  if (code === '42501') {
    return `Action refusée par les règles de sécurité : vous n'avez pas le droit de ${verb} ces données.`;
  }
  return `Échec de l'opération sur « ${table} » : ${raw}`;
}

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
      captureError(result.error, { context: 'AI brain apply-proposal db error', table, action });
      return NextResponse.json({ error: friendlyDbError(result.error, table, action) }, { status: 400 });
    }

    captureMessage('AI brain proposal applied', { table, action, reason, userId: profile.userId });
    return NextResponse.json({ success: true, data: result?.data });
  } catch (err: any) {
    captureError(err, { context: 'AI brain apply-proposal error' });
    return NextResponse.json({ error: err.message || "Erreur lors de l'exécution." }, { status: 500 });
  }
}
