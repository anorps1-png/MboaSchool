'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Eleve, Classe, NoteMatiere } from '@/types/domain';
import Link from 'next/link';
import { useEtablissement } from '@/contexts/etablissement-context';
import { getClassRankings, type ClassRanking } from '@/lib/queries/evaluations';
import { captureError, captureMessage } from '@/lib/observability/logger';

interface PageProps {
  params: Promise<{ classeId: string }>;
}

const defaultSubjects = ['Mathématiques', 'Français', 'Anglais', 'Physique-Chimie', 'Histoire-Géo', 'SVT', 'Philosophie'];

export default function EvaluationsClassePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const classeId = resolvedParams.classeId;
  const searchParams = useSearchParams();
  const term = searchParams.get('term') || 'Trimestre 1';
  const { etablissementId } = useEtablissement();
  
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [classInfo, setClassInfo] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'saisie' | 'synthese'>('saisie');
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedCoef, setSelectedCoef] = useState<number>(1);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [notesList, setNotesList] = useState<any[]>([]);
  const [rankings, setRankings] = useState<ClassRanking[]>([]);

  // Buffer for currently edited grades in Saisie
  const [gradesBuffer, setGradesBuffer] = useState<Record<string, string | number>>({});

  const supabase = createClient();

  useEffect(() => {
    if (!etablissementId) return;
    const loadData = async () => {
      try {
        // 1. Get class details
        const { data: clsData, error: clsErr } = await supabase
          .from('classes')
          .select('*')
          .eq('id', decodeURIComponent(classeId))
          .eq('etablissement_id', etablissementId)
          .single();

        if (clsErr) throw clsErr;
        setClassInfo(clsData);

        // 2. Get students in this class along with their notes
        const { data: studsData, error: studsErr } = await supabase
          .from('eleves')
          .select('*, notes(*)')
          .eq('classe_id', decodeURIComponent(classeId))
          .eq('etablissement_id', etablissementId);

        if (studsErr) throw studsErr;
        setStudentsList(studsData || []);

        // 3. Get all notes for these students for the current trimester
        const studsIds = (studsData || []).map(s => s.id);
        if (studsIds.length > 0) {
          const { data: notesData, error: notesErr } = await supabase
            .from('notes')
            .select('*')
            .in('eleve_id', studsIds)
            .eq('trimestre', term)
            .eq('etablissement_id', etablissementId);
          
          if (!notesErr && notesData) {
            setNotesList(notesData);
          }
        } else {
          setNotesList([]);
        }

        // Classement de la classe calculé en base (moyennes/rangs).
        // Repli silencieux sur le calcul client si indisponible (hors-ligne).
        try {
          const rk = await getClassRankings(decodeURIComponent(classeId), term);
          setRankings(rk);
        } catch (rkErr) {
          captureMessage('Classement serveur indisponible, repli client:', { detail: rkErr });
          setRankings([]);
        }

        // 4. Subjects
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

      } catch (err) {
        captureError(err, { context: "Error loading evaluations page:" });
      }
    };

    loadData();
  }, [classeId, term, selectedSubject, etablissementId]);

  useEffect(() => {
    if (studentsList.length > 0) {
      const buffer: Record<string, string | number> = {};
      let foundCoef = 1;
      let hasFoundCoef = false;

      studentsList.forEach(student => {
        const existingGrade = notesList.find(n => n.eleve_id === student.id && n.matiere === selectedSubject);
        if (existingGrade) {
          buffer[student.id] = existingGrade.evaluation_maternelle || (existingGrade.note !== null && existingGrade.note !== undefined ? existingGrade.note : '');
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
    }
  }, [studentsList, notesList, selectedSubject]);

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

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleBufferChange = (studentId: string, val: string) => {
    setGradesBuffer(prev => ({ ...prev, [studentId]: val }));
  };

  const saveAllNotes = async () => {
    if (!etablissementId) return;
    const isMaternelle = classInfo?.niveau?.toLowerCase().includes('maternelle') || classInfo?.niveau_id?.toLowerCase().includes('maternelle');

    const upsertData = studentsList.map(student => {
      const bufferVal = gradesBuffer[student.id];
      const existingNote = notesList.find(n => n.eleve_id === student.id && n.matiere === selectedSubject);

      const noteObj: any = {
        eleve_id: student.id,
        matiere: selectedSubject,
        trimestre: term,
        coefficient: selectedCoef,
        date_saisie: new Date().toISOString(),
        etablissement_id: etablissementId
      };

      if (existingNote) {
        noteObj.id = existingNote.id;
      }

      if (isMaternelle) {
        noteObj.evaluation_maternelle = bufferVal || null;
        noteObj.note = null;
      } else {
        noteObj.note = bufferVal !== '' ? Number(bufferVal) : null;
        noteObj.evaluation_maternelle = null;
      }

      return noteObj;
    }).filter(n => n.note !== null || n.evaluation_maternelle !== null || n.id !== undefined);

    if (upsertData.length === 0) return;

    try {
      const { error } = await supabase.from('notes').upsert(upsertData);
      if (error) throw error;
      
      triggerToast(`Les notes de ${selectedSubject} ont été sauvegardées avec succès.`);
      
      // Reload notes from DB
      const studsIds = studentsList.map(s => s.id);
      const { data: notesData } = await supabase
        .from('notes')
        .select('*')
        .in('eleve_id', studsIds)
        .eq('trimestre', term)
        .eq('etablissement_id', etablissementId);
      
      if (notesData) {
        setNotesList(notesData);
      }
    } catch (err: any) {
      alert("Erreur lors de la sauvegarde : " + err.message);
    }
  };

  // Helper for Synthese
  const calculateStudentAvg = (student: any) => {
    const termNotes = notesList.filter(n => n.eleve_id === student.id && n.note !== null && n.note !== undefined);
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

  // Lignes de synthèse : on privilégie le classement serveur (RPC) ; en repli
  // (hors-ligne), on recalcule côté client comme auparavant.
  const syntheseRows = React.useMemo(() => {
    if (rankings.length > 0) {
      return rankings.map(r => ({
        id: r.eleve_id,
        nom: r.nom,
        prenom: r.prenom,
        avg: Number(r.moyenne),
        rang: r.rang,
      }));
    }
    const computed = studentsList
      .map(s => ({ id: s.id, nom: s.nom, prenom: s.prenom, avg: calculateStudentAvg(s) }))
      .sort((a, b) => b.avg - a.avg);
    return computed.map((s, idx) => ({ ...s, rang: s.avg > 0 ? idx + 1 : null }));
  }, [rankings, studentsList, notesList]);

  if (!classInfo) {
    return <div className="p-8 text-center text-ink-soft">Chargement...</div>;
  }

  const isMaternelle = classInfo.niveau?.toLowerCase().includes('maternelle') || classInfo.niveau_id?.toLowerCase().includes('maternelle');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-ink text-cream px-5 py-3.5 rounded-control shadow-login z-50 flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-green flex items-center justify-center text-xs font-bold text-cream">✓</div>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-card border border-border shadow-sm">
        <div>
          <h1 className="text-[44px] font-extrabold text-ink tracking-[-1.5px] leading-tight">
            {classInfo.nom} <span className="text-ink-faint font-normal text-lg ml-2">| {term}</span>
          </h1>
          <p className="text-sm text-ink-soft mt-1">Gestion des évaluations et édition des bulletins</p>
        </div>
        <div className="flex gap-2 bg-chip p-1 rounded-control">
          <button
            onClick={() => setActiveTab('saisie')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'saisie' ? 'bg-surface shadow text-ink' : 'text-ink-soft hover:text-ink-soft'}`}
          >
            Saisie des Notes
          </button>
          <button
            onClick={() => setActiveTab('synthese')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'synthese' ? 'bg-surface shadow text-ink' : 'text-ink-soft hover:text-ink-soft'}`}
          >
            Synthèse & Bulletins
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'saisie' ? (
        <div className="bg-surface rounded-card border border-border shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end justify-between border-b border-border pb-6">
            <div className="w-full sm:w-auto flex flex-wrap sm:flex-nowrap gap-4 items-end">
              <div className="w-full sm:w-64">
                <label className="block text-[12px] font-bold text-ink-faint uppercase tracking-[1px] mb-2">Matière à évaluer</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-control text-sm bg-bg focus:bg-surface font-semibold"
                >
                  {subjectsList.map(subj => (
                    <option key={subj} value={subj}>{subj}</option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-24">
                <label className="block text-[12px] font-bold text-ink-faint uppercase tracking-[1px] mb-2">Coef.</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={selectedCoef}
                  onChange={(e) => setSelectedCoef(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-border rounded-control text-sm bg-bg focus:bg-surface font-semibold text-center"
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Nouvelle matière..."
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="w-full sm:w-40 px-3 py-2 border border-border rounded-control text-sm focus:ring-2 focus:border-accent focus:border-accent outline-none"
                />
                <button
                  onClick={handleAddSubject}
                  className="px-3 py-2 bg-chip hover:bg-chip text-ink-soft rounded-control text-sm font-bold transition-colors whitespace-nowrap"
                >
                  + Ajouter
                </button>
              </div>
            </div>
            <button
              onClick={saveAllNotes}
              className="px-6 py-2 bg-accent hover:bg-accent-hover text-cream rounded-control text-sm font-bold shadow-md shadow-cta transition-colors w-full sm:w-auto whitespace-nowrap"
            >
              Sauvegarder les notes
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[12px] font-bold text-ink-faint uppercase tracking-[1px] bg-bg/20">
                  <th className="px-6 py-3">Élève</th>
                  <th className="px-6 py-3">Matricule</th>
                  <th className="px-6 py-3 w-48 text-center">{isMaternelle ? 'Compétence' : 'Note / 20'}</th>
                  {!isMaternelle && <th className="px-6 py-3 w-32 text-center">Coef.</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-row text-sm">
                {studentsList.map(student => (
                  <tr key={student.id} className="hover:bg-bg/30">
                    <td className="px-6 py-4 font-semibold text-ink">{student.nom} {student.prenom}</td>
                    <td className="px-6 py-4 text-ink-soft font-mono text-xs">{student.matricule}</td>
                    <td className="px-6 py-4">
                      {isMaternelle ? (
                        <select
                          value={gradesBuffer[student.id] || ''}
                          onChange={(e) => handleBufferChange(student.id, e.target.value)}
                          className="w-full px-3 py-1.5 border border-border rounded text-sm"
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
                          className="w-full px-3 py-1.5 border border-border rounded text-sm text-center font-bold text-ink focus:ring-2 focus:border-accent focus:outline-none"
                        />
                      )}
                    </td>
                    {!isMaternelle && (
                      <td className="px-6 py-4 text-center text-ink-soft font-bold">
                        x {selectedCoef}
                      </td>
                    )}
                  </tr>
                ))}
                {studentsList.length === 0 && (
                  <tr><td colSpan={3} className="px-6 py-12 text-center text-ink-faint">Aucun élève dans cette classe.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-card border border-border shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-ink">Synthèse du {term}</h2>
            {/* Could add a bulk print button here */}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[12px] font-bold text-ink-faint uppercase tracking-[1px] bg-bg/20">
                  <th className="px-6 py-3">Rang</th>
                  <th className="px-6 py-3">Élève</th>
                  <th className="px-6 py-3 text-center">{isMaternelle ? 'Évaluation Globale' : 'Moyenne'}</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-row text-sm">
                {syntheseRows.map((student) => (
                  <tr key={student.id} className="hover:bg-bg/30">
                    <td className="px-6 py-4 font-bold text-ink-faint text-center w-16">
                      {isMaternelle ? '-' : (student.rang ?? '-')}
                    </td>
                    <td className="px-6 py-4 font-semibold text-ink">{student.nom} {student.prenom}</td>
                    <td className="px-6 py-4 text-center font-bold text-ink">
                      {isMaternelle ? 'Format Compétences' : (student.avg > 0 ? student.avg.toFixed(2) + ' / 20' : 'N/A')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/evaluations/${classeId}/bulletin/${student.id}?term=${encodeURIComponent(term)}`}
                        className="inline-flex items-center justify-center px-4 py-1.5 bg-chip hover:bg-chip-hover text-ink rounded-control text-xs font-bold transition-colors"
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
