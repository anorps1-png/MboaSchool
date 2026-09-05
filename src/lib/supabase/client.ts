import { createBrowserClient } from '@supabase/ssr';

// Helper to check if the application is running inside Electron (Desktop)
export const isRunningInElectron = (): boolean => {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return userAgent.includes('electron') || !!(window as any).process?.versions?.electron;
};

// Builder for desktop local database operations via API route
function createDesktopLocalBuilder(table: string): any {
  const queryState = {
    table,
    action: 'select',
    payload: null,
    filters: [] as { field: string; op: string; value: any }[],
    isSingle: false,
    upsertOptions: null as any,
    orderBy: null as string | null,
    orderDirection: 'asc' as 'asc' | 'desc',
    limitCount: null as number | null,
    rangeStart: 0,
    rangeEnd: null as number | null
  };

  const proxy: any = new Proxy(queryState, {
    get(target, prop) {
      if (prop === 'then') {
        return (onfulfilled: any, onrejected: any) => {
          if (target.action === 'select') {
            const params = new URLSearchParams();
            params.append('table', target.table);
            params.append('filters', JSON.stringify(target.filters));
            params.append('isSingle', String(target.isSingle));
            if (target.orderBy) {
              params.append('orderBy', target.orderBy);
              params.append('orderDirection', target.orderDirection);
            }
            if (target.limitCount !== null) {
              params.append('limitCount', String(target.limitCount));
            }
            if (target.rangeEnd !== null) {
              params.append('rangeStart', String(target.rangeStart));
              params.append('rangeEnd', String(target.rangeEnd));
            }
            const url = `/api/local-db?${params.toString()}`;
            return fetch(url)
              .then(res => res.json())
              .then(onfulfilled)
              .catch(onrejected);
          } else {
            const body = {
              action: target.action,
              table: target.table,
              payload: target.payload,
              filters: target.filters,
              isSingle: target.isSingle,
              upsertOptions: target.upsertOptions
            };
            return fetch('/api/local-db', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
            })
              .then(res => {
                const json = res.json();
                return json.then((data: any) => {
                  if (target.isSingle && data.data && Array.isArray(data.data)) {
                    data.data = data.data[0] || null;
                  }
                  return onfulfilled(data);
                });
              })
              .catch(onrejected);
          }
        };
      }

      if (prop === 'select') {
        return () => {
          if (target.action !== 'insert' && target.action !== 'update' && target.action !== 'upsert') {
            target.action = 'select';
          }
          return proxy;
        };
      }
      if (prop === 'insert') {
        return (values: any) => {
          target.action = 'insert';
          target.payload = values;
          return proxy;
        };
      }
      if (prop === 'upsert') {
        return (values: any, options?: any) => {
          target.action = 'upsert';
          target.payload = values;
          target.upsertOptions = options;
          return proxy;
        };
      }
      if (prop === 'update') {
        return (values: any) => {
          target.action = 'update';
          target.payload = values;
          return proxy;
        };
      }

      if (prop === 'delete') {
        return () => {
          target.action = 'delete';
          return proxy;
        };
      }
      if (prop === 'single') {
        return () => {
          target.isSingle = true;
          return proxy;
        };
      }
      if (prop === 'eq') {
        return (column: string, value: any) => {
          target.filters.push({ field: column, op: 'eq', value });
          return proxy;
        };
      }
      if (prop === 'gte') {
        return (column: string, value: any) => {
          target.filters.push({ field: column, op: 'gte', value });
          return proxy;
        };
      }
      if (prop === 'lte') {
        return (column: string, value: any) => {
          target.filters.push({ field: column, op: 'lte', value });
          return proxy;
        };
      }
      if (prop === 'in') {
        return (column: string, values: any[]) => {
          target.filters.push({ field: column, op: 'in', value: values });
          return proxy;
        };
      }
      if (prop === 'order') {
        return (column: string, options?: { ascending?: boolean }) => {
          target.orderBy = column;
          target.orderDirection = options?.ascending === false ? 'desc' : 'asc';
          return proxy;
        };
      }
      if (prop === 'limit') {
        return (n: number) => {
          target.limitCount = n;
          return proxy;
        };
      }
      if (prop === 'range') {
        return (from: number, to: number) => {
          target.rangeStart = from;
          target.rangeEnd = to;
          return proxy;
        };
      }

      // Delegate any other chaining methods by returning the proxy itself
      if (typeof prop === 'string') {
        return () => proxy;
      }

      return (target as any)[prop];
    }
  });

  return proxy;
}

// En Electron, TOUTE lecture/écriture passe désormais par le miroir SQLite
// local, que le réseau soit disponible ou non : il n'existe plus qu'un seul
// circuit de données (fini le flag forceOffline/hasOfflineSession qui
// laissait l'app "se croire en ligne" tout en lisant un miroir local vide
// ou périmé). Supabase n'est touché que par les actions manuelles Push/Pull
// (src/lib/localDbSync.ts, via getOnlineClient() qui contourne ce Proxy).
// Sur le web (hors Electron), ce Proxy est un no-op : tout va toujours à
// Supabase, comme avant.
const isLocalOnlyRuntime = () => typeof window !== 'undefined' && isRunningInElectron();

// profiles/etablissements/invitations ne sont JAMAIS mirroées en local (même
// exclusion que SYNCABLE_TABLES dans src/lib/localDbSync.ts : identité/compte,
// pas des données de travail hors-ligne). Sans cette exception, router .from()
// vers le miroir local pour ces 3 tables romprait la résolution du profil/rôle
// et de l'établissement dans DashboardLayout, puisque le miroir ne les
// contient jamais — elles doivent toujours atteindre le vrai Supabase (le
// code appelant gère déjà l'échec réseau via ses propres repli localStorage).
const ACCOUNT_TABLES = new Set(['profiles', 'etablissements', 'invitations']);

// Suppression en cascade de tout un établissement (Paramètres) : action
// destructive et rare qui n'a aucun équivalent local (voir
// src/lib/db/localAggregates.ts) et ne doit de toute façon jamais être
// exécutable sans une vraie connexion Supabase — toujours envoyée en ligne,
// jamais interceptée par callLocalRpc, même en Electron.
const ONLINE_ONLY_RPCS = new Set(['delete_etablissement_child_data']);

// Appelle l'équivalent local d'une fonction RPC Postgres (voir
// src/lib/db/localAggregates.ts côté serveur) et renvoie la même forme
// { data, error } que le vrai client Supabase, pour que les appelants dans
// src/lib/queries/*.ts n'aient rien à changer.
function callLocalRpc(fn: string, params: any) {
  // Les RPC réelles dérivent l'établissement/le rôle de l'appelant via
  // auth.uid() côté Postgres (SECURITY INVOKER) ; l'API locale n'a aucune
  // session serveur pour ça. On les injecte donc ici, jamais dans les
  // fonctions appelantes de src/lib/queries/*.ts (qui restent inchangées et
  // continuent d'appeler la vraie RPC telle quelle sur le web) : callLocalRpc
  // n'est jamais invoquée hors du chemin "toujours local" en Electron.
  const callerEtablissementId = typeof window !== 'undefined' ? localStorage.getItem('mboaschool_etablissement_id') : null;
  const callerRole = typeof window !== 'undefined' ? localStorage.getItem('mboaschool_current_role') : null;

  return fetch('/api/local-db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'rpc',
      fn,
      params,
      callerEtablissementId,
      callerRole
    })
  })
    .then(res => res.json())
    .catch(err => ({ data: null, error: { message: err?.message || String(err) } }));
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

  const realClient = createBrowserClient(supabaseUrl, supabaseKey);

  return new Proxy(realClient, {
    get(target: any, prop: string | symbol) {
      if (prop === 'from' && isLocalOnlyRuntime()) {
        return (table: string) => {
          if (ACCOUNT_TABLES.has(table)) return target.from(table);
          return createDesktopLocalBuilder(table);
        };
      }
      if (prop === 'rpc' && isLocalOnlyRuntime()) {
        return (fn: string, params: any) => {
          if (ONLINE_ONLY_RPCS.has(fn)) return target.rpc(fn, params);
          return callLocalRpc(fn, params);
        };
      }
      return target[prop];
    }
  }) as typeof realClient;
}
