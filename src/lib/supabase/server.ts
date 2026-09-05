import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

// Client Supabase pour les Route Handlers (src/app/api/**/route.ts), authentifié
// avec la session du cookie de l'utilisateur appelant — les RLS s'appliquent
// donc normalement, jamais de clé service-role qui les contournerait.
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // setAll appelé depuis un Server Component : ignorable, le rafraîchissement
          // de session est de toute façon géré par proxy.ts sur la requête suivante.
        }
      },
    },
  });
}

// Vérifie la session de l'appelant et renvoie son rôle/établissement — jamais
// fait confiance à un etablissement_id fourni par le client, toujours résolu
// depuis le profil serveur de l'utilisateur authentifié.
export async function getAuthedProfile(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, etablissement_id')
    .eq('id', user.id)
    .single();

  if (!profile?.etablissement_id) return null;
  return { userId: user.id, role: profile.role as string, etablissementId: profile.etablissement_id as string };
}
