import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // Use placeholder values as fallbacks during build time to avoid crashes
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

  return createBrowserClient(supabaseUrl, supabaseKey);
}
