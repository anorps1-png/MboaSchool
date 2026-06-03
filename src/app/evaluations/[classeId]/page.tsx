'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eleve, Classe, NoteMatiere } from '@/types/domain';
import { mockStudents } from '@/mock/students';
import { mockClasses } from '@/mock/classes';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ classeId: string }>;
}

const defaultSubjects = ['Mathématiques', 'Français', 'Anglais', 'Physique-Chimie', 'Histoire-Géo', 'SVT', 'Philosophie'];

export default function EvaluationsClassePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const classeId = resolvedParams.classeId;
  const searchParams = useSearchParams();
  const term = searchParams.get('term') || 'Trimestre 1';
  
  const [studentsList, setStudentsList] = useState<Eleve[]>([]);
  const [classInfo, setClassInfo] = useState<Classe | null>(null);
  const [activeTab, setActiveTab] = useState<'saisie' | 'synthese'>('saisie');
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedCoef, setSelectedCoef] = useState<number>(1);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Buffer for currently edited grades in Saisie
  const [gradesBuffer, setGradesBuffer] = useState<Record<string, string | number>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. Get classes
      const storedClasses = localStorage.getItem('mboaschool_classes');
      let classes: Classe[] = mockClasses;
      if (storedClasses) {
        try { classes = JSON.parse(storedClasses); } catch (e) { }
      }
      const cls = classes.find(c => c.id === decodeURIComponent(classeId));
      if (cls) setClassInfo(cls);

      // 2. Get students
      const storedStudents = localStorage.getItem('mboaschool_students');
      let allStudents: Eleve[] = mockStudents;
      if (storedStudents) {
        try { allStudents = JSON.parse(storedStudents); } catch (e) { }
      }
      
      const filtered = allStudents.filter(s => 
        cls && (s.classeId === cls.id || s.classeId === cls.nom || s.classeId === cls.niveauId)
      );
      setStudentsList(filtered);

      // 3. Get Subjects
      const storedSubjects = localStorage.getItem('mboaschool_subjects');
      let subjects = defaultSubjects;
      if (storedSubjects) {
        try { subjects = JSON.parse(storedSubjects); } catch (e) { }
      } else {
        localStorage.setItem('mboaschool_subjects', JSON.stringify(defaultSubjects));
      }
      setSubjectsList(subjects);
      
      const subjToUse = selectedSubject || subjects[0] || 'Mathématiques';
      if (!selectedSubject) setSelectedSubject(subjToUse);

      // 4. Initialize buffer for selected subject
      initBuffer(filtered, subjToUse, term);
    }
  }, [classeId, term, selectedSubject]);

  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;
    const newSubj = newSubjectName.trim();
    if (subjectsList.includes(newSubj)) {
      triggerToast(`La matière "${newSubj}" existe déjà.`);
      return;
    }
    const newList = [...subjectsList, newSubj];
    setSubjectsList(newList);
    localStorage.setItem('mboaschool_subjects', JSON.stringify(newList));
    setSelectedSubject(newSubj);
    setNewSubjectName('');
    triggerToast(`Matière "${newSubj}" ajoutée.`);
  };

  const initBuffer = (studs: Eleve[], subject: string, currentTerm: string) => {
    const buffer: Record<string, string | number> = {};
    let foundCoef = 1;
    let hasFoundCoef = false;

    studs.forEach(student => {
      const existingGrade = (student.notes || []).find(n => n.trimestre === currentTerm && n.matiereId === subject);
      if (existingGrade) {
        buffer[student.id] = existingGrade.evaluationMaternelle || existingGrade.note || '';
        if (!hasFoundCoef && existingGrade.coefficient) {
          foundCoef = existingGrade.coefficient;
          hasFoundCoef = true;
        }
      } else {
        buffer[student.id] = '';
      }
    });
    setGradesBuffer(buffer);
    setSelectedCoef(foundCoef);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleBufferChange = (studentId: string, val: string) => {
    setGradesBuffer(prev => ({ ...prev, [studentId]: val }));
  };

  const saveAllNotes = () => {
    // 1. Fetch all current students from localStorage to preserve other edits
    const storedStudents = localStorage.getItem('mboaschool_students');
    let allStudents: Eleve[] = mockStudents;
    if (storedStudents) {
      try { allStudents = JSON.parse(storedStudents); } catch (e) { }
    }

    // 2. Update the grades
    const isMaternelle = classInfo?.niveauId?.toLowerCase().includes('maternelle');

    const updatedStudentsList = allStudents.map(student => {
      // Is this student in our current filtered class?
      if (!studentsList.find(s => s.id === student.id)) return student;

      const bufferVal = gradesBuffer[student.id];
      if (bufferVal === '' || bufferVal === undefined) return student; // No change

      const notes = [...(student.notes || [])];
      const existingIndex = notes.findIndex(n => n.trimestre === term && n.matiereId === selectedSubject);

      const newNoteObj: NoteMatiere = {
        id: existingIndex !== -1 ? notes[existingIndex].id : `note-${Date.now()}-${student.id}`,
        eleveId: student.id,
        matiereId: selectedSubject,
        enseignantId: classInfo?.enseignantPrincipalId || 'ens-1', // Fallback
        dateSaisie: new Date().toISOString().split('T')[0],
        trimestre: term as any,
        coefficient: selectedCoef,
      };

      if (isMaternelle) {
        newNoteObj.evaluationMaternelle = bufferVal as any;
      } else {
        newNoteObj.note = Number(bufferVal);
      }

      if (existingIndex !== -1) {
        notes[existingIndex] = newNoteObj;
      } else {
        notes.push(newNoteObj);
      }

      return { ...student, notes };
    });

    // 3. Save back
    localStorage.setItem('mboaschool_students', JSON.stringify(updatedStudentsList));
    setStudentsList(updatedStudentsList.filter(s => studentsList.find(sl => sl.id === s.id)));
    triggerToast(`Les notes de ${selectedSubject} ont été sauvegardées avec succès.`);
  };

  // Helper for Synthese
  const calculateStudentAvg = (student: Eleve) => {
    const termNotes = (student.notes || []).filter(n => n.trimestre === term && n.note !== undefined);
    if (termNotes.length === 0) return 0;
    
    let totalPoints = 0;
    let totalCoefs = 0;
    
    termNotes.forEach(n => {
      const coef = n.coefficient || 1;
      totalPoints += (n.note || 0) * coef;
      totalCoefs += coef;
    });
    
    return totalCoefs > 0 ? totalPoints / totalCoefs : 0;
  };

  const sortedStudents = [...studentsList].map(s => ({
    ...s,
    avg: calculateStudentAvg(s)
  })).sort((a, b) => b.avg - a.avg);

  if (!classInfo) {
    return <div className="p-8 text-center text-slate-500">Chargement...</div>;
  }

  const isMaternelle = classInfo.niveauId.toLowerCase().includes('maternelle');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl z-50 flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white">✓</div>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 text-black">
            {classInfo.nom} <span className="text-slate-400 font-normal text-lg ml-2">| {term}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gestion des évaluations et édition des bulletins</p>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('saisie')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'saisie' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Saisie des Notes
          </button>
          <button
            onClick={() => setActiveTab('synthese')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'synthese' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Synthèse & Bulletins
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'saisie' ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end justify-between border-b border-slate-100 pb-6">
            <div className="w-full sm:w-auto flex flex-wrap sm:flex-nowrap gap-4 items-end">
              <div className="w-full sm:w-64">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Matière à évaluer</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white text-black font-semibold"
                >
                  {subjectsList.map(subj => (
                    <option key={subj} value={subj}>{subj}</option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-24">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Coef.</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={selectedCoef}
                  onChange={(e) => setSelectedCoef(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white text-black font-semibold text-center"
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Nouvelle matière..."
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="w-full sm:w-40 px-3 py-2 border border-slate-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
                <button
                  onClick={handleAddSubject}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors whitespace-nowrap"
                >
                  + Ajouter
                </button>
              </div>
            </div>
            <button
              onClick={saveAllNotes}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-md shadow-indigo-600/10 transition-colors w-full sm:w-auto whitespace-nowrap"
            >
              Sauvegarder les notes
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/20">
                  <th className="px-6 py-3">Élève</th>
                  <th className="px-6 py-3">Matricule</th>
                  <th className="px-6 py-3 w-48 text-center">{isMaternelle ? 'Compétence' : 'Note / 20'}</th>
                  {!isMaternelle && <th className="px-6 py-3 w-32 text-center">Coef.</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {studentsList.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/30">
                    <td className="px-6 py-4 font-semibold text-slate-800 text-black">{student.nom} {student.prenom}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{student.matricule}</td>
                    <td className="px-6 py-4">
                      {isMaternelle ? (
                        <select
                          value={gradesBuffer[student.id] || ''}
                          onChange={(e) => handleBufferChange(student.id, e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm text-black"
                        >
                          <option value="">-- Choisir --</option>
                          <option value="Acquis">Acquis</option>
                          <option value="En cours">En cours</option>
                          <option value="Non acquis">Non acquis</option>
                        </select>
                      ) : (
                        <input
                          type="number"
                          min="0" max="20" step="0.25"
                          placeholder="-"
                          value={gradesBuffer[student.id] || ''}
                          onChange={(e) => handleBufferChange(student.id, e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm text-center font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                        />
                      )}
                    </td>
                    {!isMaternelle && (
                      <td className="px-6 py-4 text-center text-slate-500 font-bold">
                        x {selectedCoef}
                      </td>
                    )}
                  </tr>
                ))}
                {studentsList.length === 0 && (
                  <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400">Aucun élève dans cette classe.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800">Synthèse du {term}</h2>
            {/* Could add a bulk print button here */}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/20">
                  <th className="px-6 py-3">Rang</th>
                  <th className="px-6 py-3">Élève</th>
                  <th className="px-6 py-3 text-center">{isMaternelle ? 'Évaluation Globale' : 'Moyenne'}</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {sortedStudents.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-slate-50/30">
                    <td className="px-6 py-4 font-bold text-slate-400 text-center w-16">
                      {isMaternelle ? '-' : (student.avg > 0 ? idx + 1 : '-')}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800 text-black">{student.nom} {student.prenom}</td>
                    <td className="px-6 py-4 text-center font-bold text-indigo-600">
                      {isMaternelle ? 'Format Compétences' : (student.avg > 0 ? student.avg.toFixed(2) + ' / 20' : 'N/A')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/evaluations/${classeId}/bulletin/${student.id}?term=${encodeURIComponent(term)}`}
                        className="inline-flex items-center justify-center px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold transition-colors"
                        target="_blank"
                      >
                        Tirer le bulletin
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
