'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Eleve, Classe } from '@/types/domain';
import { getDashboardData } from '@/lib/queries/dashboard';
import { downloadExcel } from '@/lib/excel';
import { DownloadIcon } from '@/components/icons';
import { useEtablissement } from '@/contexts/etablissement-context';

export default function Dashboard() {
  const { etablissementId } = useEtablissement();
  const [students, setStudents] = useState<Eleve[]>([]);
  const [classesList, setClassesList] = useState<Classe[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && etablissementId) {
      const fetchData = async () => {
        try {
          const { classes, students: studentsData, teachers } = await getDashboardData(etablissementId);
          setClassesList(classes);
          setTeachersList(teachers);

          const mappedStudents = studentsData.map((d: any) => ({
            id: d.id,
            matricule: d.matricule,
            nom: d.nom,
            prenom: d.prenom,
            sexe: d.sexe,
            classeId: d.classe_id,
            statut: d.statut,
            paiements: d.paiements?.map((p: any) => ({
              id: p.id,
              eleveId: p.eleve_id,
              montant: Number(p.montant),
              date: p.date,
              typeFrais: p.type_frais,
              statut: p.statut,
              reference: p.reference,
              modePaiement: p.mode_paiement
            })) || [],
            notes: d.notes?.map((n: any) => ({
              id: n.id,
              note: Number(n.note)
            })) || []
          }));
          setStudents(mappedStudents as any);

          // Build transactions list from all payments
          const allTx: any[] = [];
          studentsData.forEach((student: any) => {
            if (student.paiements) {
              student.paiements.forEach((p: any) => {
                const classObj = classes.find(c => c.id === student.classe_id);
                allTx.push({
                  id: p.id,
                  eleveId: student.id,
                  nomEleve: `${student.nom} ${student.prenom}`,
                  matriculeEleve: student.matricule,
                  classeId: student.classe_id,
                  classeNom: classObj?.nom || student.classe_id,
                  montant: Number(p.montant),
                  date: p.date,
                  typeFrais: p.type_frais,
                  modePaiement: p.mode_paiement,
                  statut: p.statut,
                  reference: p.reference
                });
              });
            }
          });
          setTransactions(allTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } catch (error) {
          console.error("Dashboard fetch error:", error);
        } finally {
          setIsLoaded(true);
        }
      };

      fetchData();
    }
  }, [etablissementId]);

  // 1. Calculations
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.statut === 'actif').length;
  const totalTeachers = teachersList.length;
  const activeTeachers = teachersList.filter(t => t.statut === 'actif').length;

  // Calcul du Taux de Réussite Global
  const studentsWithGrades = students.filter(s => s.notes && (s.notes || []).length > 0);
  const studentsPassed = studentsWithGrades.filter(s => {
    const grades = (s.notes || []).filter(g => ((g.note || 0) || 0) !== undefined);
    if(grades.length === 0) return false;
    const avg = grades.reduce((sum, g) => sum + (((g.note || 0) || 0) || 0), 0) / grades.length;
    return avg >= 10;
  });
  const globalSuccessRate = studentsWithGrades.length > 0 ? ((studentsPassed.length / studentsWithGrades.length) * 100).toFixed(1) : '--';

  // Total paid
  const totalPaid = students.reduce((sum, student) => {
    const studentPaid = (((student.paiements || []) || []) || [])
      .filter(p => p.statut === 'paid')
      .reduce((s, p) => s + p.montant, 0);
    return sum + studentPaid;
  }, 0);

  // Total expected
  const totalExpected = students.reduce((sum, student) => {
    const classObj = classesList.find(c => c.id === student.classeId);
    return sum + (classObj?.prix || 0);
  }, 0);

  const totalPending = totalExpected - totalPaid;
  const recoveryRate = totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;

  // Format currency helper
  const formatFCFA = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  // Group by class for charts
  const classStats = classesList.map(c => {
    const studentsInClass = students.filter(s => s.classeId === c.id);
    const count = studentsInClass.length;
    const expected = count * (c.prix || 0);
    const paid = studentsInClass.reduce((sum, s) => {
      return sum + (((s.paiements || []) || []) || [])?.filter(p => p.statut === 'paid').reduce((ps, p) => ps + p.montant, 0);
    }, 0);
    const pending = expected - paid;
    return {
      classeName: c.nom,
      studentCount: count,
      expected,
      paid,
      pending,
      rate: expected > 0 ? (paid / expected) * 100 : 0
    };
  });

  const activeClassStats = classStats.filter(c => c.expected > 0);
  const displayStats = activeClassStats.length > 0 ? activeClassStats : classStats;

  const recentTransactions = transactions.slice(0, 5);

  const handleExportTransactions = () => {
    const dataToExport = transactions.map(tx => ({
      Référence: tx.reference,
      Date: tx.date,
      'Élève': tx.nomEleve,
      Matricule: tx.matriculeEleve,
      Classe: tx.classeNom,
      'Type de Frais': tx.typeFrais,
      'Montant (FCFA)': tx.montant,
      'Mode de Paiement': tx.modePaiement,
      Statut: tx.statut === 'paid' ? 'Payé' : tx.statut === 'pending' ? 'En attente' : 'Échoué'
    }));
    downloadExcel(dataToExport, 'Liste_Transactions');
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-sm font-semibold text-slate-400">Chargement du tableau de bord depuis Supabase...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight text-black">Vue d&apos;ensemble</h1>
          <p className="text-sm text-slate-500 mt-1">
            Statistiques clés et aperçu financier de l&apos;établissement en temps réel.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Connecté à Supabase en direct</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Students */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Élèves</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-800 text-black">{totalStudents}</h3>
            <p className="text-xs text-slate-500 mt-1 flex flex-col gap-1">
              <span className="flex items-center gap-1">
                <span className="text-emerald-500 font-semibold">{activeStudents} actifs</span>
                <span>• {totalStudents - activeStudents} suspendus</span>
              </span>
              <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded inline-flex w-fit mt-1">
                Taux de réussite : {globalSuccessRate !== '--' ? `${globalSuccessRate}%` : '--'}
              </span>
            </p>
          </div>
        </div>

        {/* Card 2: Total Teachers */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Enseignants</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 00-2-2v3m2-1V9a2 2 0 00-2-2v3m3 4h-3M9 8h.01M9 12h.01M9 16h.01" />
              </svg>
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-800 text-black">{totalTeachers}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-500 font-semibold">{activeTeachers} actifs</span>
              <span>• {totalTeachers - activeTeachers} inactifs</span>
            </p>
          </div>
        </div>

        {/* Card 3: Total Paid Fees */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Frais Payés</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-slate-800 truncate text-black">{formatFCFA(totalPaid)}</h3>
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                <span>Taux de recouvrement</span>
                <span className="font-semibold text-indigo-600">{recoveryRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${recoveryRate}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Total Expected / Pending */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Montant en Attente</span>
            <span className="p-2 bg-red-50 text-red-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-slate-800 truncate text-black">{formatFCFA(totalPending)}</h3>
            <p className="text-xs text-slate-500 mt-1">
              Sur un total attendu de <span className="font-medium">{formatFCFA(totalExpected)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Donut Chart of Recovery Status (Expected vs Paid) */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 text-black">Recouvrement Global & Par Classe</h3>
            <p className="text-xs text-slate-400">Comparaison entre les montants attendus (facturations) et réellement perçus (encaissements)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center py-4">
            {/* Left Column: Global Donut */}
            <div className="md:col-span-5 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-6">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                  {/* Background circle (En attente) */}
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    className="stroke-rose-100"
                    strokeWidth="14"
                    fill="transparent"
                  />
                  {/* Foreground circle (Perçu) */}
                  {recoveryRate > 0 && (
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      className="stroke-indigo-600 transition-all duration-1000 ease-out"
                      strokeWidth="14"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 70}
                      strokeDashoffset={2 * Math.PI * 70 - (recoveryRate / 100) * (2 * Math.PI * 70)}
                      strokeLinecap="round"
                    />
                  )}
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-extrabold text-slate-800 text-black">{recoveryRate.toFixed(1)}%</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Recouvré</span>
                </div>
              </div>

              {/* Global Legend under Donut */}
              <div className="w-full mt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-indigo-600"></span>Payé</span>
                  <span className="font-bold text-black">{formatFCFA(totalPaid)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500"></span>En Attente</span>
                  <span className="font-bold text-rose-600">{formatFCFA(totalPending)}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Class Breakdown */}
            <div className="md:col-span-7 flex flex-col h-full justify-center">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Taux de recouvrement par classe</h4>
              <div className="max-h-64 overflow-y-auto pr-2 space-y-2.5 scrollbar-thin scrollbar-thumb-slate-200">
                {displayStats.map((stat) => (
                  <div key={stat.classeName} className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl border border-slate-100/50 transition-colors">
                    <div className="flex-1 min-w-0 pr-3">
                      <span className="font-bold text-sm text-slate-800 block truncate text-black">{stat.classeName}</span>
                      <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                        Payé : <span className="font-semibold text-slate-600">{formatFCFA(stat.paid)}</span> / {formatFCFA(stat.expected)}
                      </span>
                    </div>

                    {/* Mini Circle Progress */}
                    <div className="relative flex items-center justify-center w-10 h-10 flex-shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 32 32">
                        <circle
                          cx="16"
                          cy="16"
                          r="13"
                          className="stroke-slate-100"
                          strokeWidth="3.5"
                          fill="transparent"
                        />
                        {stat.rate > 0 && (
                          <circle
                            cx="16"
                            cy="16"
                            r="13"
                            className="stroke-indigo-600"
                            strokeWidth="3.5"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 13}
                            strokeDashoffset={2 * Math.PI * 13 - (stat.rate / 100) * (2 * Math.PI * 13)}
                            strokeLinecap="round"
                          />
                        )}
                      </svg>
                      <div className="absolute text-[8px] font-black text-slate-800 text-black">
                        {stat.rate.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>


        {/* Chart 2: Distribution by Class */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 text-black">Élèves par niveau</h3>
            <p className="text-xs text-slate-400 mb-6">Répartition des effectifs d&apos;élèves</p>
          </div>

          <div className="space-y-4">
            {classStats.length > 0 ? classStats.map((stat) => {
              const maxStudents = Math.max(...classStats.map(s => s.studentCount));
              const pct = maxStudents > 0 ? (stat.studentCount / totalStudents) * 100 : 0;
              return (
                <div key={stat.classeName} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                    <span>{stat.classeName}</span>
                    <span className="font-bold text-black">{stat.studentCount} élèves ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-slate-50 border border-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            }) : (
                <div className="text-sm text-slate-400 text-center py-8">Aucun élève inscrit</div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4 mt-6 flex justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Filles ({totalStudents > 0 ? ((students.filter(s => s.sexe === 'F').length / totalStudents) * 100).toFixed(0) : 0}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Garçons ({totalStudents > 0 ? ((students.filter(s => s.sexe === 'M').length / totalStudents) * 100).toFixed(0) : 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent transactions */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800 text-black">Transactions Récentes</h3>
            <p className="text-xs text-slate-400">Derniers versements enregistrés dans l&apos;établissement</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleExportTransactions}
              className="text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 transition-colors bg-white border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-lg"
            >
              <DownloadIcon size={14} />
              Exporter
            </button>
            <Link
              href="/eleves"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 transition-all"
            >
              Voir tous les élèves
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/20">
                <th className="px-6 py-3">Élève</th>
                <th className="px-6 py-3">Classe</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Montant</th>
                <th className="px-6 py-3">Mode</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {recentTransactions.length > 0 ? recentTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-800 text-black">{tx.nomEleve}</span>
                    <span className="block text-[10px] text-slate-400 font-medium">{tx.matriculeEleve}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{tx.classeNom}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      tx.typeFrais === 'Inscription' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                    }`}>
                      {tx.typeFrais}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800 text-black">{formatFCFA(tx.montant)}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs">{tx.modePaiement}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs">{tx.date}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                      tx.statut === 'paid' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-amber-600 bg-amber-50 border-amber-100'
                    } px-2 py-0.5 rounded-full border`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        tx.statut === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}></span>
                      {tx.statut === 'paid' ? 'Payé' : 'En attente'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                    Aucune transaction récente enregistrée.
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
