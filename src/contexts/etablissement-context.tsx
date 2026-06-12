'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface EtablissementContextType {
  etablissementId: string | null;
  setEtablissementId: (id: string | null) => void;
}

const EtablissementContext = createContext<EtablissementContextType>({
  etablissementId: null,
  setEtablissementId: () => {},
});

export function useEtablissement() {
  return useContext(EtablissementContext);
}

export function EtablissementProvider({ children }: { children: React.ReactNode }) {
  const [etablissementId, setEtablissementIdState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let stored = localStorage.getItem('mboaschool_etablissement_id');
      if (!stored) {
        let defaultId = 'd3b07384-d113-4ee7-a496-c67b8a74e50d';
        const offlineSession = localStorage.getItem('mboaschool_offline_session');
        if (offlineSession) {
          try {
            const parsed = JSON.parse(offlineSession);
            defaultId = parsed.etablissement_id || defaultId;
          } catch (e) {
            // ignore
          }
        }
        stored = defaultId;
        localStorage.setItem('mboaschool_etablissement_id', defaultId);
      }
      setEtablissementIdState(stored);
    }
  }, []);

  const setEtablissementId = (id: string | null) => {
    setEtablissementIdState(id);
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem('mboaschool_etablissement_id', id);
      } else {
        localStorage.removeItem('mboaschool_etablissement_id');
      }
    }
  };

  return (
    <EtablissementContext.Provider value={{ etablissementId, setEtablissementId }}>
      {children}
    </EtablissementContext.Provider>
  );
}
