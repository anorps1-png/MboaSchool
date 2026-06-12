'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useEtablissement } from '@/contexts/etablissement-context';

export default function SectionsPage() {
  const [sectionsList, setSectionsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { etablissementId } = useEtablissement();

  const supabase = createClient();

  useEffect(() => {
    if (etablissementId) fetchSectionsData();
  }, [etablissementId]);

  const fetchSectionsData = async () => {
    if (!etablissementId) return;
    setIsLoading(true);
    try {
      const { data: classesData, error } = await supabase
        .from('classes')
        .select('*, eleves(*)')
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
      console.error("Error loading sections:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <h1 className="text-2xl font-bold text-slate-800 text-black">Sections &amp; Sous-systèmes</h1>
      <p className="text-slate-500 text-sm">Vue consolidée par sous-système de l'établissement.</p>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : sectionsList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">🏫</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Aucune section détectée</h3>
          <p className="text-slate-500 text-sm max-w-md">Créez d'abord des classes avec des sections définies pour les voir apparaître ici.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sectionsList.map(section => (
            <div key={section.name} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-indigo-700">{section.name}</h2>
              <p className="text-sm text-slate-500 mt-1">{section.classes.length} classe(s) rattachée(s)</p>
              
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-bold text-slate-400 uppercase">Effectif Total</p>
                  <p className="text-2xl font-bold text-black">{section.studentsCount}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-bold text-slate-400 uppercase">Moyenne Estimée</p>
                  <p className="text-2xl font-bold text-black">12.80 / 20</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
