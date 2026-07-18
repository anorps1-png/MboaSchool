'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Classe } from '@/types/domain';
import { useEtablissement } from '@/contexts/etablissement-context';
import { captureError, captureMessage } from '@/lib/observability/logger';

export default function EvaluationsHome() {
  const router = useRouter();
  const [classesList, setClassesList] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Trimestre 1');
  const [isLoading, setIsLoading] = useState(true);

  const { etablissementId } = useEtablissement();
  const supabase = createClient();

  useEffect(() => {
    if (!etablissementId) return;
    const fetchClasses = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('etablissement_id', etablissementId)
          .order('nom', { ascending: true });
        
        if (data) {
          setClassesList(data);
          if (data.length > 0) {
            setSelectedClass(data[0].id);
          }
        }
      } catch (err) {
        captureError(err, { context: "Error fetching classes for evaluations:" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchClasses();
  }, [etablissementId]);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) {
      alert('Veuillez sélectionner une classe.');
      return;
    }
    router.push(`/evaluations/${selectedClass}?term=${encodeURIComponent(selectedTerm)}`);
  };

  return (
    <div className="max-w-2xl mx-auto mt-12 space-y-6 animate-in fade-in duration-300">
      <div className="bg-surface p-8 rounded-card border border-border shadow-sm">
        <div className="mb-6">
          <h1 className="text-[44px] font-extrabold text-ink tracking-[-1.5px] leading-tight">Module Évaluations & Bulletins</h1>
          <p className="text-sm text-ink-soft mt-2">
            Sélectionnez une classe et un trimestre pour saisir les notes en masse ou générer les bulletins.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <svg className="animate-spin h-8 w-8 text-ink" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : classesList.length === 0 ? (
          <div className="text-center py-6 text-ink-soft font-semibold">
            ⚠️ Aucune classe configurée dans la base de données.
          </div>
        ) : (
          <form onSubmit={handleStart} className="space-y-6">
            <div>
              <label className="block text-[12px] font-bold text-ink-faint uppercase tracking-[1px] mb-2">
                Sélectionnez la Classe
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-control text-sm bg-bg focus:bg-surface focus:outline-none focus:ring-2 focus:border-accent focus:border-accent font-medium"
                required
              >
                {classesList.map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-ink-faint uppercase tracking-[1px] mb-2">
                Trimestre / Séquence
              </label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-control text-sm bg-bg focus:bg-surface focus:outline-none focus:ring-2 focus:border-accent focus:border-accent font-medium"
                required
              >
                <option value="Trimestre 1">Trimestre 1</option>
                <option value="Trimestre 2">Trimestre 2</option>
                <option value="Trimestre 3">Trimestre 3</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-accent hover:bg-accent-hover text-cream rounded-control text-sm font-bold shadow-md shadow-cta transition-colors"
            >
              Gérer les notes et bulletins →
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
