import { createBrowserClient } from '@supabase/ssr';
import { update } from 'idb-keyval';

// Interface for offline query queue
interface OfflineQueryChain {
  table: string;
  action: 'select' | 'insert' | 'update' | 'delete';
  payload: any;
  filters: { field: string; value: any }[];
  realBuilder: any;
  isSingle: boolean;
}

// Cache local select queries when online
function cacheOfflineData(table: string, filters: any[], data: any[]) {
  // We only cache the main list (with no filters or only etablissement_id filter) to keep local storage clean
  if (typeof window !== 'undefined') {
    if (filters.length === 0 || (filters.length === 1 && filters[0].field === 'etablissement_id')) {
      localStorage.setItem(`offline_cache_${table}`, JSON.stringify(data));
    }
  }
}

// Add task to IndexedDB sync queue
async function addToOfflineQueue(table: string, action: 'insert' | 'update' | 'delete', payload: any) {
  const task = {
    id: `task_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    table,
    action,
    payload,
    timestamp: Date.now()
  };

  try {
    await update('mboaschool_sync_queue', (val) => {
      const queue = (val as any[]) || [];
      return [...queue, task];
    });
    console.log(`[Offline Client] Queued offline sync task for table ${table}`);
  } catch (e) {
    console.error("Failed to update offline sync queue:", e);
  }
}

// Evaluate query locally when offline
async function handleOfflineQuery(target: OfflineQueryChain) {
  console.log(`[Supabase Offline Driver] Executing query locally on table: ${target.table}, action: ${target.action}`);
  const cacheKey = `offline_cache_${target.table}`;
  const stored = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
  let localData = stored ? JSON.parse(stored) : [];

  if (target.action === 'select') {
    let filtered = [...localData];
    for (const filter of target.filters) {
      filtered = filtered.filter(item => item[filter.field] === filter.value);
    }
    if (target.isSingle) {
      return { data: filtered[0] || null, error: filtered[0] ? null : { message: "Not found", code: "PGRST116" } };
    }
    return { data: filtered, error: null };
  }

  if (target.action === 'insert') {
    const payloadArray = Array.isArray(target.payload) ? target.payload : [target.payload];
    for (const item of payloadArray) {
      if (!item.id) {
        item.id = typeof crypto !== 'undefined' ? crypto.randomUUID() : `local_${Date.now()}_${Math.random()}`;
      }
      localData.push(item);
      await addToOfflineQueue(target.table, 'insert', item);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(cacheKey, JSON.stringify(localData));
    }
    return { data: target.isSingle ? payloadArray[0] : payloadArray, error: null };
  }

  if (target.action === 'update') {
    const updatedItems: any[] = [];
    localData = localData.map((item: any) => {
      let match = true;
      for (const filter of target.filters) {
        if (item[filter.field] !== filter.value) {
          match = false;
          break;
        }
      }
      if (match) {
        const updated = { ...item, ...target.payload };
        updatedItems.push(updated);
        return updated;
      }
      return item;
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem(cacheKey, JSON.stringify(localData));
    }

    for (const item of updatedItems) {
      await addToOfflineQueue(target.table, 'update', item);
    }

    return { data: target.isSingle ? updatedItems[0] || null : updatedItems, error: null };
  }

  if (target.action === 'delete') {
    const deletedItems: any[] = [];
    const keptItems = localData.filter((item: any) => {
      let match = true;
      for (const filter of target.filters) {
        if (item[filter.field] !== filter.value) {
          match = false;
          break;
        }
      }
      if (match) {
        deletedItems.push(item);
        return false;
      }
      return true;
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem(cacheKey, JSON.stringify(keptItems));
    }

    for (const item of deletedItems) {
      await addToOfflineQueue(target.table, 'delete', item);
    }

    return { data: target.isSingle ? deletedItems[0] || null : deletedItems, error: null };
  }

  return { data: null, error: { message: "Offline operation not supported" } };
}

function createOfflineBuilder(table: string, realBuilder: any): any {
  const chain: OfflineQueryChain = {
    table,
    action: 'select',
    payload: null,
    filters: [],
    realBuilder,
    isSingle: false
  };

  const proxy: any = new Proxy(chain, {
    get(target, prop) {
      // If it's a Promise thenable method
      if (prop === 'then') {
        return (onfulfilled: any, onrejected: any) => {
          const isOffline = typeof navigator !== 'undefined'
            ? (!navigator.onLine || (typeof window !== 'undefined' && (window as any).__forceOffline))
            : false;

          if (isOffline) {
            return handleOfflineQuery(target).then(onfulfilled, onrejected);
          }

          return target.realBuilder.then(
            async (result: any) => {
              // Even if isOffline was false, the request might fail due to sudden network loss
              if (result.error && (result.error.message?.includes('Failed to fetch') || result.error.status === 0)) {
                try {
                  const offlineResult = await handleOfflineQuery(target);
                  return onfulfilled ? onfulfilled(offlineResult) : offlineResult;
                } catch (e: any) {
                  return onrejected ? onrejected(e) : Promise.reject(e);
                }
              }
              
              if (!result.error && target.action === 'select' && Array.isArray(result.data)) {
                cacheOfflineData(target.table, target.filters, result.data);
              }
              
              return onfulfilled ? onfulfilled(result) : result;
            },
            async (error: any) => {
              if (error.message?.includes('Failed to fetch') || error.status === 0) {
                try {
                  const offlineResult = await handleOfflineQuery(target);
                  return onfulfilled ? onfulfilled(offlineResult) : offlineResult;
                } catch (e: any) {
                  return onrejected ? onrejected(e) : Promise.reject(e);
                }
              }
              return onrejected ? onrejected(error) : Promise.reject(error);
            }
          );
        };
      }

      // Intercept builder action methods
      if (prop === 'select') {
        return (columns?: string) => {
          target.action = 'select';
          target.realBuilder = target.realBuilder.select(columns);
          return proxy;
        };
      }
      if (prop === 'insert') {
        return (values: any) => {
          target.action = 'insert';
          target.payload = values;
          target.realBuilder = target.realBuilder.insert(values);
          return proxy;
        };
      }
      if (prop === 'update') {
        return (values: any) => {
          target.action = 'update';
          target.payload = values;
          target.realBuilder = target.realBuilder.update(values);
          return proxy;
        };
      }
      if (prop === 'delete') {
        return () => {
          target.action = 'delete';
          target.realBuilder = target.realBuilder.delete();
          return proxy;
        };
      }
      if (prop === 'single') {
        return () => {
          target.isSingle = true;
          target.realBuilder = target.realBuilder.single();
          return proxy;
        };
      }

      // Capture filters
      if (prop === 'eq') {
        return (column: string, value: any) => {
          target.filters.push({ field: column, value });
          target.realBuilder = target.realBuilder.eq(column, value);
          return proxy;
        };
      }

      // Delegate any other chaining methods
      if (typeof target.realBuilder[prop] === 'function') {
        return (...args: any[]) => {
          const res = target.realBuilder[prop](...args);
          if (res && (typeof res.then === 'function' || res.select)) {
            target.realBuilder = res;
            return proxy;
          }
          return res;
        };
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

  // Wrap the real client in a Proxy to intercept table queries
  return new Proxy(realClient, {
    get(target: any, prop: string | symbol) {
      if (prop === 'from') {
        return (table: string) => {
          const builder = target.from(table);
          return createOfflineBuilder(table, builder);
        };
      }
      return target[prop];
    }
  }) as typeof realClient;
}

