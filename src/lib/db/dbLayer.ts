import { createClient } from '../supabase/client';
import { captureError } from '../observability/logger';

const supabase = createClient();

/**
 * Récupère plusieurs enregistrements d'une table avec filtres optionnels.
 */
export async function selectMany<T>(
  table: string,
  query?: Record<string, any>,
  options?: { order?: string; ascending?: boolean; limit?: number }
): Promise<T[]> {
  let builder = supabase.from(table).select('*');
  
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        builder = builder.eq(key, value);
      }
    }
  }
  
  if (options?.order) {
    builder = builder.order(options.order, { ascending: options.ascending ?? true });
  }
  
  if (options?.limit) {
    builder = builder.limit(options.limit);
  }
  
  const { data, error } = await builder;
  if (error) {
    captureError(error, { layer: 'db', op: 'selectMany', table });
    throw error;
  }
  return (data || []) as T[];
}

/**
 * Récupère un enregistrement unique d'une table par filtre.
 */
export async function selectOne<T>(table: string, query: Record<string, any>): Promise<T | null> {
  let builder = supabase.from(table).select('*');
  
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      builder = builder.eq(key, value);
    }
  }
  
  const { data, error } = await builder.maybeSingle();
  if (error) {
    captureError(error, { layer: 'db', op: 'selectOne', table });
    throw error;
  }
  return data as T | null;
}

/**
 * Insère un nouvel enregistrement dans une table et retourne l'élément inséré.
 */
export async function insertOne<T>(table: string, data: Record<string, any>): Promise<T> {
  const { data: inserted, error } = await supabase.from(table).insert([data]).select().single();
  if (error) {
    captureError(error, { layer: 'db', op: 'insertOne', table });
    throw error;
  }
  return inserted as T;
}

/**
 * Met à jour un enregistrement existant dans une table par son ID.
 */
export async function updateOne<T>(table: string, id: string | number, data: Record<string, any>): Promise<T> {
  const { data: updated, error } = await supabase.from(table).update(data).eq('id', id).select().single();
  if (error) {
    captureError(error, { layer: 'db', op: 'updateOne', table });
    throw error;
  }
  return updated as T;
}

/**
 * Supprime un enregistrement d'une table par son ID.
 */
export async function deleteOne(table: string, id: string | number): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) {
    captureError(error, { layer: 'db', op: 'deleteOne', table });
    throw error;
  }
}
