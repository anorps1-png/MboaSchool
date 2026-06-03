'use client';
import React, { useState, useEffect } from 'react';
import { mockSections } from '@/mock/sections';
import { mockClasses } from '@/mock/classes';
import { mockStudents } from '@/mock/students';
import { Classe, Eleve } from '@/types/domain';

export default function SectionsPage() {
  const [classesList, setClassesList] = useState<Classe[]>([]);
  const [studentsList, setStudentsList] = useState<Eleve[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedClasses = localStorage.getItem('mboaschool_classes');
      if (storedClasses) {
        setClassesList(JSON.parse(storedClasses));
      } else {
        setClassesList(mockClasses);
      }

      const storedStudents = localStorage.getItem('mboaschool_students');
      if (storedStudents) {
        setStudentsList(JSON.parse(storedStudents));
      } else {
        setStudentsList(mockStudents);
      }
    }
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <h1 className="text-2xl font-bold text-slate-800 text-black">Sections & Sous-systèmes</h1>
      <p className="text-slate-500 text-sm">Vue consolidée par sous-système de l'établissement.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockSections.map(section => {
          // Filtrer les classes de cette section
          // (Si sectionId n'est pas défini, on fallback sur sec-fr par défaut pour l'existant)
          const sectionClasses = classesList.filter(c => (c.sectionId || 'sec-fr') === section.id);
          
          // Trouver tous les élèves dans ces classes
          const sectionStudents = studentsList.filter(s => 
            sectionClasses.some(c => s.classeId === c.id || s.classeId === c.nom || s.classeId === c.niveauId)
          );
          
          let sumAvg = 0;
          let countAvg = 0;
          sectionStudents.forEach(student => {
            const numericGrades = (student.notes || []).filter(g => g.note !== undefined);
            if (numericGrades.length > 0) {
              const totalPoints = numericGrades.reduce((sum, g) => sum + ((g.note || 0) * 1), 0);
              sumAvg += totalPoints / numericGrades.length;
              countAvg++;
            }
          });
          const avg = countAvg > 0 ? (sumAvg / countAvg).toFixed(2) : '--';

          return (
            <div key={section.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-indigo-700">{section.nom}</h2>
              <p className="text-sm text-slate-500 mt-1">{sectionClasses.length} classe(s) rattachée(s)</p>
              
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-bold text-slate-400 uppercase">Effectif Total</p>
                  <p className="text-2xl font-bold text-black">{sectionStudents.length}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-bold text-slate-400 uppercase">Moyenne Globale</p>
                  <p className="text-2xl font-bold text-black">{avg} / 20</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
