'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Classe } from '@/types/domain';
import { mockClasses } from '@/mock/classes';

export default function EvaluationsHome() {
  const router = useRouter();
  const [classesList, setClassesList] = useState<Classe[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Trimestre 1');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedClasses = localStorage.getItem('mboaschool_classes');
      if (storedClasses) {
        try {
          const parsed = JSON.parse(storedClasses);
          setClassesList(parsed);
          if (parsed.length > 0) setSelectedClass(parsed[0].id);
        } catch (e) {
          setClassesList(mockClasses);
          setSelectedClass(mockClasses[0]?.id || '');
        }
      } else {
        localStorage.setItem('mboaschool_classes', JSON.stringify(mockClasses));
        setClassesList(mockClasses);
        setSelectedClass(mockClasses[0]?.id || '');
      }
    }
  }, []);

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
      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 text-black">Module Évaluations & Bulletins</h1>
          <p className="text-sm text-slate-500 mt-2">
            Sélectionnez une classe et un trimestre pour saisir les notes en masse ou générer les bulletins.
          </p>
        </div>

        <form onSubmit={handleStart} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Sélectionnez la Classe
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black font-medium"
              required
            >
              {classesList.map(c => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Trimestre / Séquence
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black font-medium"
              required
            >
              <option value="Trimestre 1">Trimestre 1</option>
              <option value="Trimestre 2">Trimestre 2</option>
              <option value="Trimestre 3">Trimestre 3</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/10 transition-colors"
          >
            Gérer les notes et bulletins →
          </button>
        </form>
      </div>
    </div>
  );
}
