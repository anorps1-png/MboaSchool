'use client';

import { useEffect } from 'react';
import { captureError } from '@/lib/observability/logger';

/**
 * Error boundary du tableau de bord : capture les erreurs de rendu d'une page du
 * dashboard sans faire tomber toute l'application. L'erreur est reportée et
 * l'utilisateur peut relancer la section.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { boundary: 'dashboard', digest: error.digest });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center text-2xl mb-4">
        ⚠️
      </div>
      <h2 className="text-xl font-bold text-slate-800">Cette page a rencontré un problème</h2>
      <p className="text-sm text-slate-500 mt-2 max-w-md">
        L&apos;incident a été enregistré. Vous pouvez réessayer ou revenir plus tard.
      </p>
      <button
        onClick={() => reset()}
        className="mt-6 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors"
      >
        Réessayer
      </button>
    </div>
  );
}
