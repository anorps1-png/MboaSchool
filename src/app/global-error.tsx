'use client';

import { useEffect } from 'react';
import { captureError } from '@/lib/observability/logger';

/**
 * Error boundary racine : capture les erreurs de rendu qui remontent jusqu'au
 * layout racine. Remonte l'erreur au reporting (Sentry si configuré) et affiche
 * un écran de secours plutôt qu'une page blanche.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { boundary: 'global', digest: error.digest });
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', textAlign: 'center', background: '#f8f4eb', color: '#2b2318' }}>
        <div style={{ maxWidth: 480, margin: '10vh auto' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.5px' }}>
            Une erreur inattendue s&apos;est produite
          </h1>
          <p style={{ color: '#6b5f4a', marginBottom: '1.5rem' }}>
            L&apos;incident a été enregistré. Vous pouvez réessayer.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: '0.6rem 1.4rem', background: '#b5502f', color: '#fdf3e3',
              border: 'none', borderRadius: 12, fontWeight: 800, cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
