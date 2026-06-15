'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Eleve, Classe } from '@/types/domain';
import Link from 'next/link';
import { useEtablissement } from '@/contexts/etablissement-context';

interface PageProps {
  params: Promise<{ classeId: string; eleveId: string }>;
}

export default function BulletinImpressionPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const term = searchParams.get('term') || 'Trimestre 1';
  const { etablissementId } = useEtablissement();
  
  const [student, setStudent] = useState<any | null>(null);
  const [classInfo, setClassInfo] = useState<any | null>(null);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [notesList, setNotesList] = useState<any[]>([]);
  const [etabInfo, setEtabInfo] = useState<any | null>(null);
  const [yearName, setYearName] = useState('2025/2026');
  const [isLoaded, setIsLoaded] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!etablissementId) return;
    const loadData = async () => {
      try {
        const classeId = decodeURIComponent(resolvedParams.classeId);
        const eleveId = decodeURIComponent(resolvedParams.eleveId);

        // 1. Fetch class details
        const { data: clsData } = await supabase
          .from('classes')
          .select('*')
          .eq('id', classeId)
          .eq('etablissement_id', etablissementId)
          .single();
        
        if (clsData) {
          setClassInfo(clsData);
          // Fetch year details
          const { data: yrData } = await supabase
            .from('annees_scolaires')
            .select('nom')
            .eq('id', clsData.annee_scolaire_id)
            .single();
          if (yrData) setYearName(yrData.nom);
        }

        // 2. Fetch all students in this class
        const { data: studsData } = await supabase
          .from('eleves')
          .select('*')
          .eq('classe_id', classeId)
          .eq('etablissement_id', etablissementId);
        
        if (studsData) {
          setAllStudents(studsData);
          const foundStudent = studsData.find(s => s.id === eleveId);
          if (foundStudent) setStudent(foundStudent);
        }

        // 3. Fetch notes for all students in this class for the current trimester
        const studsIds = (studsData || []).map(s => s.id);
        if (studsIds.length > 0) {
          const { data: notesData } = await supabase
            .from('notes')
            .select('*')
            .in('eleve_id', studsIds)
            .eq('trimestre', term)
            .eq('etablissement_id', etablissementId);
          if (notesData) setNotesList(notesData);
        }

        // 4. Fetch establishment details
        const { data: etabData } = await supabase
          .from('etablissements')
          .select('*')
          .eq('id', etablissementId)
          .single();
        if (etabData) setEtabInfo(etabData);

      } catch (err) {
        console.error("Error fetching bulletin data:", err);
      } finally {
        setIsLoaded(true);
        // Trigger print after a short delay to allow rendering
        setTimeout(() => {
          window.print();
        }, 800);
      }
    };
    loadData();
  }, [resolvedParams.classeId, resolvedParams.eleveId, term, etablissementId]);

  if (!isLoaded || !student || !classInfo || !etabInfo) {
    return <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center">Préparation du bulletin...</div>;
  }

  const logoUrl = etabInfo.logo_url || '';
  const bulletinTemplate = etabInfo.bulletin_template || 'classic';
  const bulletinSlogan = etabInfo.bulletin_slogan || 'Excellence & Mérite';
  const bulletinHeaderLeft = etabInfo.bulletin_header_left || 'Ministère des Enseignements Secondaires';
  const bulletinHeaderRight = etabInfo.bulletin_header_right || 'Ministry of Secondary Education';
  const schoolNameLabel = etabInfo.nom || 'MBOASCHOOL';
  const passingScore = etabInfo.seuil_reussite || 10;

  const isMaternelle = classInfo.niveau?.toLowerCase().includes('maternelle') || classInfo.niveau_id?.toLowerCase().includes('maternelle');

  // Calculations
  const termNotes = notesList.filter(n => n.eleve_id === student.id);
  
  // Calculate Avg for rank
  const calculateAvg = (stud: any) => {
    const tNotes = notesList.filter(n => n.eleve_id === stud.id && n.note !== null && n.note !== undefined);
    if (tNotes.length === 0) return 0;
    
    let totalPoints = 0;
    let totalCoefs = 0;
    tNotes.forEach(n => {
      const coef = n.coefficient || 1;
      totalPoints += (n.note || 0) * coef;
      totalCoefs += coef;
    });
    return totalCoefs > 0 ? totalPoints / totalCoefs : 0;
  };

  const myAvg = calculateAvg(student);
  const allAvgs = allStudents.map(calculateAvg).sort((a,b) => b - a);
  const myRank = myAvg > 0 ? allAvgs.indexOf(myAvg) + 1 : '-';
  const totalPoints = termNotes.reduce((sum, n) => sum + ((n.note || 0) * (n.coefficient || 1)), 0);

  const getMention = (avg: number) => {
    if (avg >= 16) return 'Très Bien';
    if (avg >= 14) return 'Bien';
    if (avg >= 12) return 'Assez Bien';
    if (avg >= passingScore) return 'Passable';
    return 'Insuffisant';
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white overflow-y-auto text-black print:overflow-visible">
      {/* Back button (hidden on print) */}
      <div className="absolute top-4 left-4 print:hidden">
        <Link href={`/evaluations/${resolvedParams.classeId}?term=${encodeURIComponent(term)}`} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200">
          ← Retour à la classe
        </Link>
      </div>

      {/* Printable Area */}
      <div className={`max-w-[210mm] min-h-[297mm] mx-auto bg-white font-sans ${bulletinTemplate === 'minimal' ? 'p-6 text-xs' : 'p-8 sm:p-12 text-sm'}`}>
        
        {/* Header - Classic */}
        {bulletinTemplate === 'classic' && (
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
            <div className="text-center w-1/3">
              <h2 className="font-bold text-xs uppercase leading-tight">République du Cameroun</h2>
              <p className="text-[10px]">Paix - Travail - Patrie</p>
              <p className="text-[10px] mt-1.5 italic leading-tight">{bulletinHeaderLeft}</p>
            </div>
            <div className="flex flex-col items-center justify-center w-1/3">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-12 w-12 object-contain mb-1" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
              ) : (
                <div className="flex h-5 w-7 border border-slate-300">
                  <div className="bg-emerald-600 w-1/3 h-full"></div>
                  <div className="bg-red-600 w-1/3 h-full flex items-center justify-center relative"><span className="text-[5px] text-yellow-400">★</span></div>
                  <div className="bg-yellow-400 w-1/3 h-full"></div>
                </div>
              )}
              <h1 className="font-black text-lg mt-1 tracking-widest text-indigo-900 uppercase leading-none">{schoolNameLabel}</h1>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{bulletinSlogan}</p>
            </div>
            <div className="text-center w-1/3">
              <h2 className="font-bold text-xs uppercase leading-tight">Republic of Cameroon</h2>
              <p className="text-[10px]">Peace - Work - Fatherland</p>
              <p className="text-[10px] mt-1.5 italic leading-tight">{bulletinHeaderRight}</p>
            </div>
          </div>
        )}

        {/* Header - Modern */}
        {bulletinTemplate === 'modern' && (
          <div className="flex flex-col items-center text-center border-b-2 border-indigo-600 pb-5 mb-8">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-16 w-16 object-contain rounded-xl shadow-md border border-slate-100 p-1 bg-white mb-2" />
            ) : (
              <span className="text-3xl mb-1">🏫</span>
            )}
            <h1 className="font-extrabold text-2xl tracking-tight text-indigo-950 uppercase leading-tight">{schoolNameLabel}</h1>
            <p className="text-xs font-bold text-indigo-600 tracking-wider uppercase mt-1">{bulletinSlogan}</p>
            <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-3 font-semibold">
              <span>{bulletinHeaderLeft}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span>{bulletinHeaderRight}</span>
            </div>
          </div>
        )}

        {/* Header - Minimal */}
        {bulletinTemplate === 'minimal' && (
          <div className="flex justify-between items-center border-b border-slate-400 pb-2 mb-6 text-xs">
            <div className="flex items-center gap-2.5">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-9 w-9 object-contain" />
              ) : (
                <span className="text-xl">🏫</span>
              )}
              <div>
                <h1 className="font-black text-sm uppercase leading-none">{schoolNameLabel}</h1>
                <p className="text-[9px] font-semibold text-slate-500 italic mt-0.5">{bulletinSlogan}</p>
              </div>
            </div>
            <div className="text-right text-[9px] text-slate-500 leading-tight">
              <div>{bulletinHeaderLeft}</div>
              <div>{bulletinHeaderRight}</div>
            </div>
          </div>
        )}

        {/* Title */}
        <div className={`text-center ${bulletinTemplate === 'minimal' ? 'mb-4' : 'mb-8'}`}>
          <h2 className={`font-black uppercase tracking-widest border-2 border-slate-800 inline-block bg-slate-50 ${bulletinTemplate === 'minimal' ? 'text-lg px-6 py-1.5' : 'text-2xl px-8 py-2'}`}>
            BULLETIN DE NOTES - {term.toUpperCase()}
          </h2>
          <p className="text-xs font-bold mt-1.5">Année Scolaire : {yearName}</p>
        </div>

        {/* Identity Box */}
        <div className={`flex border-2 border-slate-800 ${bulletinTemplate === 'minimal' ? 'mb-4 p-3 gap-3' : 'mb-8 p-4'}`}>
          <div className="flex-1 border-r-2 border-slate-800 pr-4">
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <span className="font-bold uppercase text-slate-500 text-[10px]">Nom de l'élève :</span>
              <span className="col-span-2 font-black uppercase text-sm">{student.nom} {student.prenom}</span>
              
              <span className="font-bold uppercase text-slate-500 text-[10px]">Né(e) le :</span>
              <span className="col-span-2 font-bold">{student.dateNaissance || 'N/A'} à {student.lieuNaissance || 'N/A'}</span>
              
              <span className="font-bold uppercase text-slate-500 text-[10px]">Matricule :</span>
              <span className="col-span-2 font-mono font-bold text-slate-700">{student.matricule}</span>
            </div>
          </div>
          <div className="flex-1 pl-4">
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <span className="font-bold uppercase text-slate-500 text-[10px]">Classe :</span>
              <span className="font-black uppercase">{classInfo.nom}</span>
              
              <span className="font-bold uppercase text-slate-500 text-[10px]">Effectif :</span>
              <span className="font-bold">{allStudents.length} élèves</span>
              
              <span className="font-bold uppercase text-slate-500 text-[10px]">Professeur Principal :</span>
              <span className="font-bold">M. L'Enseignant</span>
            </div>
          </div>
        </div>

        {/* Grades Table */}
        <table className={`w-full text-left border-collapse border-2 border-slate-800 ${bulletinTemplate === 'minimal' ? 'mb-4' : 'mb-8'}`}>
          <thead>
            <tr className="bg-slate-200">
              <th className="border border-slate-800 px-3 py-1.5 text-xs font-bold uppercase w-1/3">Matière</th>
              <th className="border border-slate-800 px-2 py-1.5 text-xs font-bold uppercase text-center w-12">Coef</th>
              <th className="border border-slate-800 px-3 py-1.5 text-xs font-bold uppercase text-center w-24">{isMaternelle ? 'Acquisition' : 'Note/20'}</th>
              <th className="border border-slate-800 px-3 py-1.5 text-xs font-bold uppercase w-1/4">Appréciation</th>
              <th className="border border-slate-800 px-3 py-1.5 text-xs font-bold uppercase text-center">Visa Prof</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {termNotes.map(note => {
              const coef = note.coefficient || 1;
              return (
                <tr key={note.id}>
                  <td className="border border-slate-800 px-3 py-2 font-bold uppercase text-[11px]">{note.matiere}</td>
                  <td className="border border-slate-800 px-2 py-2 text-center">{isMaternelle ? '-' : coef}</td>
                  <td className="border border-slate-800 px-3 py-2 text-center font-black">
                    {isMaternelle ? note.evaluation_maternelle : (note.note !== null && note.note !== undefined ? note.note.toFixed(2) : '-')}
                  </td>
                  <td className="border border-slate-800 px-3 py-2 text-[10px] italic">
                    {isMaternelle ? (
                      note.evaluation_maternelle === 'Acquis' ? 'Excellent' : note.evaluation_maternelle === 'En cours' ? 'Doit poursuivre' : 'Attention requise'
                    ) : (
                      getMention(note.note || 0)
                    )}
                  </td>
                  <td className="border border-slate-800 px-3 py-2 text-center"></td>
                </tr>
              )
            })}
            {termNotes.length === 0 && (
              <tr><td colSpan={5} className="border border-slate-800 px-4 py-8 text-center text-slate-500 italic">Aucune note enregistrée pour ce trimestre.</td></tr>
            )}
          </tbody>
        </table>

        {/* Summary Footer */}
        <div className={`grid grid-cols-2 gap-6 ${bulletinTemplate === 'minimal' ? 'mb-4' : 'mb-8'}`}>
          <div className="border-2 border-slate-800">
            <div className="bg-slate-800 text-white font-bold uppercase text-[10px] py-1.5 text-center">Travail de l'élève</div>
            <div className="p-3.5 grid grid-cols-2 gap-2 text-xs">
              <div className="font-bold text-slate-500 uppercase text-[10px]">Total Points :</div>
              <div className="font-black text-right">{isMaternelle ? 'N/A' : totalPoints.toFixed(2)}</div>
              
              <div className="font-bold text-slate-500 uppercase text-[10px]">Moyenne Générale :</div>
              <div className="font-black text-right text-sm">{isMaternelle ? 'N/A' : (myAvg > 0 ? myAvg.toFixed(2) + ' / 20' : '-')}</div>
              
              <div className="font-bold text-slate-500 uppercase text-[10px]">Rang :</div>
              <div className="font-black text-right">{isMaternelle ? '-' : myRank + ' / ' + allStudents.length}</div>
              
              <div className="font-bold text-slate-500 uppercase text-[10px]">Appréciation Globale :</div>
              <div className="font-black text-right text-[11px]">{isMaternelle ? 'EN PROGRESSION' : getMention(myAvg).toUpperCase()}</div>
            </div>
          </div>
          <div className="border-2 border-slate-800 relative">
            <div className="bg-slate-800 text-white font-bold uppercase text-[10px] py-1.5 text-center">Décision du Conseil & Signatures</div>
            <div className={`p-3 flex justify-between ${bulletinTemplate === 'minimal' ? 'h-24' : 'h-32'}`}>
              <div className="text-[10px] font-bold uppercase text-slate-400">Le Professeur Principal</div>
              <div className="text-[10px] font-bold uppercase text-slate-400 text-right">Le Chef d'Établissement</div>
            </div>
          </div>
        </div>

        <div className="text-center text-[9px] text-slate-400 italic mt-8 border-t border-slate-200 pt-3">
          Bulletin généré par MboaSchool - Le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
        </div>

      </div>
    </div>
  );
}
