import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { captureError, captureMessage } from '@/lib/observability/logger';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Le cookie de session hors-ligne n'est honoré que dans l'application desktop
  // (serveur Next embarqué par Electron, qui définit MBOASCHOOL_DESKTOP=1).
  // Sur le web, ce cookie est posé côté client et serait donc forgeable.
  const isDesktopRuntime = process.env.MBOASCHOOL_DESKTOP === '1';
  const offlineSession = isDesktopRuntime
    ? request.cookies.get('mboaschool_offline_session')
    : undefined;

  let user = null;
  if (!offlineSession) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        const supabase = createServerClient(supabaseUrl, supabaseKey, {
          cookies: {
            getAll() {
              return request.cookies.getAll().map((cookie) => ({
                name: cookie.name,
                value: cookie.value,
              }));
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) =>
                request.cookies.set(name, value)
              );
              response = NextResponse.next({
                request,
              });
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options)
              );
            },
          },
        });

        const {
          data: { user: supabaseUser },
        } = await supabase.auth.getUser();
        user = supabaseUser;
      }
    } catch (err) {
      captureError(err, { context: "Proxy Supabase auth error:" });
    }
  }

  const path = request.nextUrl.pathname;

  // Seule une session Supabase vérifiée (ou une session offline dans l'app
  // desktop) donne accès. La simple présence d'un cookie n'est jamais suffisante :
  // un cookie se forge librement depuis le navigateur.
  const hasAccess = user || offlineSession;

  // Protected routes check
  // Allow landing page (/), login (/login), SW/manifests, and static assets
  const isPublicRoute =
    path === '/' ||
    path === '/login' ||
    path.startsWith('/_next') ||
    path.startsWith('/favicon.ico') ||
    path.includes('.') || // static files with extensions like .png, .json, etc.
    path.startsWith('/sw') ||
    path.startsWith('/manifest');

  if (!hasAccess && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to dashboard if already logged in and hitting login page
  if (hasAccess && path === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - all other assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
