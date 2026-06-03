const fs = require('fs');
const path = require('path');

const classesPage = `'use client';
import React from 'react';
import { mockClasses } from '@/mock/classes';
import { mockStudents } from '@/mock/students';
import Link from 'next/link';

export default function ClassesPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <h1 className="text-2xl font-bold text-slate-800 text-black">Classes</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockClasses.map(cls => {
          const studentsInClass = mockStudents.filter(s => s.classeId === cls.id);
          return (
            <Link key={cls.id} href={\`/classes/\${encodeURIComponent(cls.id)}\`} className="block bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
              <h2 className="text-xl font-bold text-black">{cls.nom}</h2>
              <p className="text-sm text-slate-500 mt-2">Niveau: {cls.niveauId}</p>
              <div className="mt-4 flex justify-between items-center text-sm">
                <span className="text-slate-600 font-semibold">{studentsInClass.length} Élèves</span>
                <span className="text-indigo-600 font-bold">Voir détails →</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
`;

const classeDetailPage = `'use client';
import React, { use } from 'react';
import { mockClasses } from '@/mock/classes';
import { mockStudents } from '@/mock/students';
import Link from 'next/link';

export default function ClasseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const classeId = decodeURIComponent(resolvedParams.id);
  const classe = mockClasses.find(c => c.id === classeId);
  
  if (!classe) return <div>Classe introuvable</div>;

  const students = mockStudents.filter(s => s.classeId === classe.id);
  const filles = students.filter(s => s.sexe === 'F').length;
  const garcons = students.filter(s => s.sexe === 'M').length;

  let sumAvg = 0;
  let countAvg = 0;
  let passed = 0;

  students.forEach(student => {
    const numericGrades = (student.notes || []).filter(g => g.note !== undefined);
    if (numericGrades.length > 0) {
      const totalPoints = numericGrades.reduce((sum, g) => sum + ((g.note || 0) * 1), 0);
      const avg = totalPoints / numericGrades.length;
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
      <h1 className="text-2xl font-bold text-slate-800 text-black">Classe : {classe.nom}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-black border-b pb-2 mb-4">Équipe Pédagogique</h2>
          <p className="text-sm text-slate-600"><span className="font-bold text-slate-800">Enseignant Principal:</span> {classe.enseignantPrincipalId}</p>
          <p className="text-sm text-slate-600 mt-2"><span className="font-bold text-slate-800">Assistant:</span> {classe.assistantId || 'Aucun'}</p>
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
    </div>
  );
}
`;

const sectionsPage = `'use client';
import React from 'react';
import { mockSections } from '@/mock/sections';
import { mockClasses } from '@/mock/classes';
import { mockStudents } from '@/mock/students';

export default function SectionsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <h1 className="text-2xl font-bold text-slate-800 text-black">Sections & Sous-systèmes</h1>
      <p className="text-slate-500 text-sm">Vue consolidée par sous-système de l'établissement.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockSections.map(section => {
          // Simulation simple: si ID=sec-fr, toutes les classes sont FR sinon EN
          const sectionClasses = mockClasses; // Pour le proto, on regroupe ou simule
          const sectionStudents = mockStudents;
          
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
              <p className="text-sm text-slate-500">{section.description}</p>
              
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-bold text-slate-400 uppercase">Effectif</p>
                  <p className="text-2xl font-bold text-black">{section.id === 'sec-fr' ? mockStudents.length : 0}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-bold text-slate-400 uppercase">Moyenne Globale</p>
                  <p className="text-2xl font-bold text-black">{section.id === 'sec-fr' ? avg : '--'} / 20</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
`;

fs.mkdirSync('src/app/classes/[id]', { recursive: true });
fs.writeFileSync('src/app/classes/page.tsx', classesPage, 'utf8');
fs.writeFileSync('src/app/classes/[id]/page.tsx', classeDetailPage, 'utf8');

fs.mkdirSync('src/app/sections', { recursive: true });
fs.writeFileSync('src/app/sections/page.tsx', sectionsPage, 'utf8');

console.log('Pages Classes and Sections created.');
