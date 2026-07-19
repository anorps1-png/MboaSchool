'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useEtablissement } from '@/contexts/etablissement-context';
import { captureError, captureMessage } from '@/lib/observability/logger';
import { getMoyennesParSection, getSectionsSummary, type SectionSummary } from '@/lib/queries/evaluations';

export default function SectionsPage() {
  const [sectionsList, setSectionsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [moyennesParSection, setMoyennesParSection] = useState<Record<string, number>>({});
  const [serverSectionsSummary, setServerSectionsSummary] = useState<Record<string, SectionSummary> | null>(null);
  const { etablissementId } = useEtablissement();

  const supabase = useMemo(() => createClient(), []);

  const fetchSectionsData = useCallback(async () => {
    if (!etablissementId) return;
    setIsLoading(true);
    try {
      // eleves(id) seulement : seul .length est lu plus bas, pas besoin des
      // autres colonnes. get_sections_summary (ci-dessous) remplace ce
      // comptage par une agrégation en base quand elle est disponible.
      const { data: classesData, error } = await supabase
        .from('classes')
        .select('*, eleves(id)')
        .eq('etablissement_id', etablissementId);

      if (classesData) {
        const sectionsMap: Record<string, { name: string; classes: any[]; studentsCount: number }> = {};

        classesData.forEach(cls => {
          const sectionName = cls.section || 'Francophone';
          if (!sectionsMap[sectionName]) {
            sectionsMap[sectionName] = {
              name: sectionName,
              classes: [],
              studentsCount: 0
            };
          }
          sectionsMap[sectionName].classes.push(cls);
          sectionsMap[sectionName].studentsCount += (cls.eleves || []).length;
        });

        setSectionsList(Object.values(sectionsMap));
      }
    } catch (err) {
      captureError(err, { context: "Error loading sections:" });
    } finally {
      setIsLoading(false);
    }
    // supabase volontairement exclu : createClient() renvoie un nouveau Proxy
    // à chaque rendu, donc l'inclure ici recrée fetchSectionsData en boucle et
    // redéclenche le useEffect ci-dessous indéfiniment (boucle infinie de fetch).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etablissementId]);

  useEffect(() => {
    if (etablissementId) fetchSectionsData();
  }, [etablissementId, fetchSectionsData]);

  useEffect(() => {
    if (!etablissementId) return;
    getMoyennesParSection(etablissementId)
      .then(rows => {
        const map: Record<string, number> = {};
        rows.forEach(r => { map[r.section] = r.moyenne; });
        setMoyennesParSection(map);
      })
      .catch(err => {
        captureError(err, { context: "Error loading moyennes par section:" });
        setMoyennesParSection({});
      });
  }, [etablissementId]);

  useEffect(() => {
    if (!etablissementId) return;
    getSectionsSummary(etablissementId)
      .then(rows => {
        const map: Record<string, SectionSummary> = {};
        rows.forEach(r => { map[r.section] = r; });
        setServerSectionsSummary(map);
      })
      .catch(err => {
        captureError(err, { context: "Error loading sections summary:" });
        setServerSectionsSummary(null);
      });
  }, [etablissementId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <h1 className="text-[44px] font-extrabold text-ink tracking-[-1.5px] leading-tight">Sections &amp; Sous-systèmes</h1>
      <p className="text-ink-soft text-sm">Vue consolidée par sous-système de l'établissement.</p>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <svg className="animate-spin h-8 w-8 text-ink" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : sectionsList.length === 0 ? (
        <div className="bg-surface rounded-card border border-dashed border-border p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-chip rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">🏫</span>
          </div>
          <h3 className="text-lg font-bold text-ink mb-2">Aucune section détectée</h3>
          <p className="text-ink-soft text-sm max-w-md">Créez d'abord des classes avec des sections définies pour les voir apparaître ici.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sectionsList.map(section => (
            <div key={section.name} className="bg-surface p-6 rounded-card shadow-sm border border-border">
              <h2 className="text-xl font-bold text-ink">{section.name}</h2>
              <p className="text-sm text-ink-soft mt-1">
                {serverSectionsSummary?.[section.name]?.classesCount ?? section.classes.length} classe(s) rattachée(s)
              </p>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-4 bg-bg rounded-control">
                  <p className="text-xs font-bold text-ink-faint uppercase">Effectif Total</p>
                  <p className="text-2xl font-bold">
                    {serverSectionsSummary?.[section.name]?.studentsCount ?? section.studentsCount}
                  </p>
                </div>
                <div className="p-4 bg-bg rounded-control">
                  <p className="text-xs font-bold text-ink-faint uppercase">Moyenne Générale</p>
                  <p className="text-2xl font-bold">
                    {moyennesParSection[section.name] !== undefined
                      ? `${moyennesParSection[section.name].toFixed(2)} / 20`
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
