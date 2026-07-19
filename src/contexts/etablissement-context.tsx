'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface EtablissementContextType {
  etablissementId: string | null;
  setEtablissementId: (id: string | null) => void;
  academicYear: string;
  setAcademicYear: (year: string) => void;
  academicYearId: string | null;
  setAcademicYearId: (id: string | null) => void;
}

const EtablissementContext = createContext<EtablissementContextType>({
  etablissementId: null,
  setEtablissementId: () => {},
  academicYear: '',
  setAcademicYear: () => {},
  academicYearId: null,
  setAcademicYearId: () => {},
});

export function useEtablissement() {
  return useContext(EtablissementContext);
}

export function EtablissementProvider({ children }: { children: React.ReactNode }) {
  const [etablissementId, setEtablissementIdState] = useState<string | null>(null);
  const [academicYear, setAcademicYearState] = useState<string>('');
  const [academicYearId, setAcademicYearIdState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let stored = localStorage.getItem('mboaschool_etablissement_id');
      if (!stored) {
        const offlineSession = localStorage.getItem('mboaschool_offline_session');
        if (offlineSession) {
          try {
            const parsed = JSON.parse(offlineSession);
            stored = parsed.etablissement_id || null;
            if (stored) {
              localStorage.setItem('mboaschool_etablissement_id', stored);
            }
          } catch (e) {
            // ignore
          }
        }
      }
      setEtablissementIdState(stored);

      const storedYear = localStorage.getItem('mboaschool_current_year') || '';
      const storedYearId = localStorage.getItem('mboaschool_active_year_id');
      setAcademicYearState(storedYear);
      setAcademicYearIdState(storedYearId);
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

  const setAcademicYear = (year: string) => {
    setAcademicYearState(year);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mboaschool_current_year', year);
      window.dispatchEvent(new Event('academic_year_changed'));
    }
  };

  const setAcademicYearId = (id: string | null) => {
    setAcademicYearIdState(id);
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem('mboaschool_active_year_id', id);
      } else {
        localStorage.removeItem('mboaschool_active_year_id');
      }
      window.dispatchEvent(new Event('academic_year_changed'));
    }
  };

  return (
    <EtablissementContext.Provider value={{
      etablissementId,
      setEtablissementId,
      academicYear,
      setAcademicYear,
      academicYearId,
      setAcademicYearId
    }}>
      {children}
    </EtablissementContext.Provider>
  );
}

