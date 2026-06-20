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
    filters: [] as { field: string; value: any }[],
    isSingle: false,
    upsertOptions: null as any
  };

  const proxy: any = new Proxy(queryState, {
    get(target, prop) {
      if (prop === 'then') {
        return (onfulfilled: any, onrejected: any) => {
          if (target.action === 'select') {
            const filtersParam = encodeURIComponent(JSON.stringify(target.filters));
            const url = `/api/local-db?table=${target.table}&filters=${filtersParam}&isSingle=${target.isSingle}`;
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
          target.filters.push({ field: column, value });
          return proxy;
        };
      }
      if (prop === 'order') {
        return () => {
          return proxy;
        };
      }
      if (prop === 'limit') {
        return () => {
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

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

  const realClient = createBrowserClient(supabaseUrl, supabaseKey);

  return new Proxy(realClient, {
    get(target: any, prop: string | symbol) {
      if (prop === 'from') {
        const isOffline = () => {
          if (typeof window === 'undefined') return false;
          if (!isRunningInElectron()) return false; // Force online mode on standard web browsers
          const forceOffline = localStorage.getItem('mboaschool_force_offline') === 'true';
          const hasOfflineSession = !!localStorage.getItem('mboaschool_offline_session');
          return !navigator.onLine || forceOffline || hasOfflineSession;
        };

        if (isOffline()) {
          return (table: string) => {
            return createDesktopLocalBuilder(table);
          };
        }
      }
      return target[prop];
    }
  }) as typeof realClient;
}
