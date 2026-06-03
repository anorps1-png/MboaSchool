'use client';
import React, { useState, useEffect } from 'react';
import { mockClasses } from '@/mock/classes';
import { mockStudents } from '@/mock/students';
import { Classe } from '@/types/domain';
import Link from 'next/link';

export default function ClassesPage() {
  const [classesList, setClassesList] = useState<Classe[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [nom, setNom] = useState('');
  const [niveauId, setNiveauId] = useState('');
  const [sectionId, setSectionId] = useState('sec-fr');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mboaschool_classes');
      if (stored) {
        setClassesList(JSON.parse(stored));
      } else {
        localStorage.setItem('mboaschool_classes', JSON.stringify(mockClasses));
        setClassesList(mockClasses);
      }
    }
  }, []);

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    const newClass: Classe = {
      id: `class-${Date.now()}`,
      nom,
      niveauId,
      anneeScolaireId: 'as-2025',
      enseignantPrincipalId: 'ens-1', // Default mock
      sectionId,
    };
    const updated = [newClass, ...classesList];
    setClassesList(updated);
    localStorage.setItem('mboaschool_classes', JSON.stringify(updated));
    setShowAddModal(false);
    setNom('');
    setNiveauId('');
    setSectionId('sec-fr');
  };

  const handleDeleteClass = (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer cette classe ?')) {
      const updated = classesList.filter(c => c.id !== id);
      setClassesList(updated);
      localStorage.setItem('mboaschool_classes', JSON.stringify(updated));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800 text-black">Classes</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-md transition-colors"
        >
          Créer une classe
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classesList.map(cls => {
          // Pour les élèves, il est possible qu'ils utilisent niveauId ou l'ID de la classe dans classeId, 
          // on vérifie les deux pour plus de compatibilité.
          const studentsInClass = mockStudents.filter(s => s.classeId === cls.id || s.classeId === cls.nom || s.classeId === cls.niveauId);
          return (
            <Link key={cls.id} href={`/classes/${encodeURIComponent(cls.id)}`} className="block relative bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDeleteClass(cls.id);
                }}
                className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors p-1"
                title="Supprimer la classe"
              >
                ✕
              </button>
              <h2 className="text-xl font-bold text-black pr-8">{cls.nom}</h2>
              <p className="text-sm text-slate-500 mt-2">Niveau: {cls.niveauId}</p>
              <p className="text-xs font-semibold text-indigo-600 bg-indigo-50 inline-block px-2 py-1 rounded mt-2">
                {cls.sectionId === 'sec-en' ? 'Anglophone' : 'Francophone'}
              </p>
              <div className="mt-4 flex justify-between items-center text-sm">
                <span className="text-slate-600 font-semibold">{studentsInClass.length} Élèves</span>
                <span className="text-indigo-600 font-bold">Voir détails →</span>
              </div>
            </Link>
          );
        })}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-100 shadow-2xl p-6 relative">
            <button onClick={() => setShowAddModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              ✕
            </button>
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 text-black">Créer une Classe</h3>
            <form onSubmit={handleAddClass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Nom de la classe</label>
                <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} required placeholder="Ex: 6ème A" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Niveau</label>
                <input type="text" value={niveauId} onChange={(e) => setNiveauId(e.target.value)} required placeholder="Ex: 6ème" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Section</label>
                <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black">
                  <option value="sec-fr">Francophone</option>
                  <option value="sec-en">Anglophone</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end">
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
