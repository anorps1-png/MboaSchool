import { createBrowserClient } from '@supabase/ssr';
import { captureError } from '@/lib/observability/logger';

// Tables tenant-scopées synchronisées entre la base SQLite locale (desktop
// Electron, cf. src/lib/db/sqlite.ts) et Supabase. Le PULL ne filtre pas
// explicitement par etablissement_id : la RLS de chaque table le fait déjà
// (vérifié dans les audits de cette session), donc `select('*')` ne renvoie
// que les lignes de l'école de l'utilisateur connecté. `profiles`,
// `etablissements` et `invitations` sont volontairement exclues : identité/
// compte, déjà gérées par le flux de connexion, pas des données de travail
// hors-ligne.
const SYNCABLE_TABLES = [
  'annees_scolaires',
  'sections',
  'niveaux_classes',
  'classes',
  'matieres',
  'eleves',
  'enseignants',
  'membres_personnel',
  'notes',
  'bulletins',
  'paiements',
  'tranches_scolarite',
  'fiches_de_paie',
  'ecritures_comptables',
  'lignes_ecritures',
  'comptes_ohada',
  'emploi_du_temps',
  'discipline',
  'absences_personnel',
  'mouvements_personnel',
  'evaluations_rh',
  'formations_rh',
  'formations_beneficiaires',
  'qhse_incidents',
  'qhse_reunions',
  'qhse_depenses',
  'qhse_evaluations',
  'enquetes',
  'enquetes_historique',
  'parent_eleves',
] as const;

// Client Supabase "réel", en dehors du proxy offline-aware de
// @/lib/supabase/client (qui redirige .from() vers la base SQLite locale
// quand forceOffline est actif) : le PULL a justement besoin de toujours
// atteindre le vrai Supabase, quel que soit ce réglage.
function getOnlineClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
  return createBrowserClient(supabaseUrl, supabaseKey);
}

// Repris du même principe que l'app comptable Agent OHADA (Le-DAF) : une
// coupure réseau passagère en plein milieu d'un PUSH/PULL déclenché
// manuellement ne doit pas obliger l'utilisateur à tout relancer dès que la
// connexion revient.
async function withNetworkRetry<T>(fn: () => PromiseLike<T>, retries = 3, baseDelayMs = 1500): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      const delay = Math.min(10000, baseDelayMs * 2 ** attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

export interface PushResult {
  pushed: number;
  failed: number;
  errors: string[];
}

export interface PullResult {
  pulled: Record<string, number>;
  errors: string[];
}

// PUSH : rejoue la file locale (sync_queue en SQLite, alimentée à chaque
// insert/update/delete offline via /api/local-db) vers Supabase.
export async function pushLocalQueue(): Promise<PushResult> {
  const res = await fetch('/api/local-db?action=get-queue');
  const data = await res.json();
  const queue = data.queue || [];
  if (queue.length === 0) return { pushed: 0, failed: 0, errors: [] };

  const client = getOnlineClient();
  let pushed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const task of queue) {
    const { id, table, action, payload, filters } = task;
    try {
      let result: any;
      if (action === 'insert') {
        result = await withNetworkRetry(() => client.from(table).insert(payload));
      } else if (action === 'update') {
        result = await withNetworkRetry(() => {
          let builder: any = client.from(table).update(payload);
          (filters || []).forEach((f: any) => { builder = builder.eq(f.field, f.value); });
          return builder;
        });
      } else if (action === 'delete') {
        result = await withNetworkRetry(() => {
          let builder: any = client.from(table).delete();
          (filters || []).forEach((f: any) => { builder = builder.eq(f.field, f.value); });
          return builder;
        });
      }

      if (result?.error) {
        failed++;
        errors.push(`${table} (${action}): ${result.error.message}`);
        captureError(result.error, { context: 'Push sync error on table', table });
      } else {
        pushed++;
        await fetch('/api/local-db', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: id }),
        });
      }
    } catch (err: any) {
      failed++;
      errors.push(`${table} (${action}): ${err.message}`);
      captureError(err, { context: 'Push sync network error on table', table });
    }
  }

  return { pushed, failed, errors };
}

// PULL : télécharge chaque table syncable depuis Supabase (RLS = tenant
// courant déjà appliqué) et remplace le miroir SQLite local. Le serveur
// (`sync-pull-table`) ignore les lignes qui ont une tâche encore en attente
// dans la file locale, pour ne pas écraser une modif pas encore poussée par
// une version distante plus ancienne.
export async function pullFromRemote(): Promise<PullResult> {
  const client = getOnlineClient();
  const pulled: Record<string, number> = {};
  const errors: string[] = [];

  for (const table of SYNCABLE_TABLES) {
    try {
      const { data, error } = await withNetworkRetry(() => client.from(table).select('*'));
      if (error) {
        errors.push(`${table}: ${error.message}`);
        captureError(error, { context: 'Pull sync error on table', table });
        continue;
      }

      const records = data || [];
      const res = await fetch('/api/local-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync-pull-table', table, records }),
      });
      const body = await res.json();
      pulled[table] = body.count ?? records.length;
    } catch (err: any) {
      errors.push(`${table}: ${err.message}`);
      captureError(err, { context: 'Pull sync network error on table', table });
    }
  }

  return { pulled, errors };
}
