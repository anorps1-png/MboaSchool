import * as Sentry from '@sentry/nextjs';

/**
 * Point d'entrée d'instrumentation Next.js (serveur + edge).
 * Ne charge la config Sentry que si un DSN est présent : sans DSN, aucune
 * initialisation n'a lieu et l'application n'est pas impactée.
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Capture des erreurs de rendu serveur (App Router). Inerte si Sentry non initialisé.
export const onRequestError = Sentry.captureRequestError;
