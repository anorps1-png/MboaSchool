'use client';
import React, { useState, useEffect, use } from 'react';
import { mockClasses } from '@/mock/classes';
import { mockStudents } from '@/mock/students';
import { Classe, Eleve } from '@/types/domain';
import Link from 'next/link';

export default function ClasseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const classeId = decodeURIComponent(resolvedParams.id);
  
  const [classe, setClasse] = useState<Classe | null>(null);
  const [students, setStudents] = useState<Eleve[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedClasses = localStorage.getItem('mboaschool_classes');
      const classesList = storedClasses ? JSON.parse(storedClasses) : mockClasses;
      const foundClasse = classesList.find((c: Classe) => c.id === classeId);
      
      if (foundClasse) {
        setClasse(foundClasse);
        
        const storedStudents = localStorage.getItem('mboaschool_students');
        const allStudents = storedStudents ? JSON.parse(storedStudents) : mockStudents;
        
        const studentsInClass = allStudents.filter((s: Eleve) => 
          s.classeId === foundClasse.id || s.classeId === foundClasse.nom || s.classeId === foundClasse.niveauId
        );
        setStudents(studentsInClass);
      }
      setIsLoaded(true);
    }
  }, [classeId]);

  if (!isLoaded) return <div className="p-8 text-center text-slate-500">Chargement...</div>;
  if (!classe) return <div className="p-8 text-center text-red-500 font-bold">Classe introuvable</div>;

  const filles = students.filter(s => s.sexe === 'F').length;
  const garcons = students.filter(s => s.sexe === 'M').length;

  let sumAvg = 0;
  let countAvg = 0;
  let passed = 0;

  students.forEach(student => {
    const numericGrades = (student.notes || []).filter(g => g.note !== undefined);
    if (numericGrades.length > 0) {
      // Simplified average calculation for display
      const totalPoints = numericGrades.reduce((sum, g) => sum + ((g.note || 0) * (g.coefficient || 1)), 0);
      const totalCoefs = numericGrades.reduce((sum, g) => sum + (g.coefficient || 1), 0);
      const avg = totalCoefs > 0 ? totalPoints / totalCoefs : 0;
      
      sumAvg += avg;
      countAvg++;
      if (avg >= 10) passed++;
    }
  });

  const classAvg = countAvg > 0 ? (sumAvg / countAvg).toFixed(2) : '--';
  const successRate = countAvg > 0 ? ((passed / countAvg) * 100).toFixed(1) : '--';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Link href="/classes" className="text-indigo-600 text-sm font-semibold hover:underline">← Retour aux classes</Link>
      
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold text-slate-800 text-black">Classe : {classe.nom}</h1>
        <div className="text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-md">
          {classe.sectionId === 'sec-en' ? 'Section Anglophone' : 'Section Francophone'}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-black border-b pb-2 mb-4">Équipe Pédagogique</h2>
          <p className="text-sm text-slate-600"><span className="font-bold text-slate-800">Enseignant Principal:</span> {classe.enseignantPrincipalId}</p>
          <p className="text-sm text-slate-600 mt-2"><span className="font-bold text-slate-800">Assistant:</span> {classe.enseignantAssistantId || 'Aucun'}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-black border-b pb-2 mb-4">Effectif</h2>
          <div className="flex justify-between items-center">
            <span className="text-3xl font-extrabold text-indigo-600">{students.length}</span>
            <div className="text-sm text-slate-500 font-semibold text-right">
              <p>{filles} Filles ({students.length ? Math.round(filles/students.length*100) : 0}%)</p>
              <p>{garcons} Garçons ({students.length ? Math.round(garcons/students.length*100) : 0}%)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-black border-b pb-2 mb-4">Performances</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Moyenne de la classe</p>
            <p className="text-2xl font-extrabold text-black mt-1">{classAvg} / 20</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Taux de réussite</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{successRate}%</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Comparaison N-1</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">+2.4%</p>
            <p className="text-xs text-slate-400">Simulation par rapport à l'an dernier</p>
          </div>
        </div>
      </div>

      {/* Liste des Élèves */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between border-b pb-2 mb-4">
          <h2 className="text-lg font-bold text-black">Liste des Élèves</h2>
          <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded">{students.length} Inscrits</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/20">
                <th className="px-4 py-3">Matricule</th>
                <th className="px-4 py-3">Nom complet</th>
                <th className="px-4 py-3">Sexe</th>
                <th className="px-4 py-3">Date de Naissance</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {students.map(student => (
                <tr key={student.id} className="hover:bg-slate-50/30">
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{student.matricule}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800 text-black">{student.nom} {student.prenom}</td>
                  <td className="px-4 py-3">{student.sexe === 'M' ? 'Garçon' : 'Fille'}</td>
                  <td className="px-4 py-3 text-slate-500">{student.dateNaissance}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/eleves/${encodeURIComponent(student.id)}`} className="inline-block px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors">
                      Voir profil
                    </Link>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                    Aucun élève n'est encore inscrit dans cette classe.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
