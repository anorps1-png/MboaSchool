'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

  // Date range filter states
  const [dateFilterType, setDateFilterType] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

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
            dateInscription: d.date_inscription ? d.date_inscription.split('T')[0] : '',
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

  // Helper to parse dates locally without timezone shift issues (noon normalization)
  const parseLocalDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    const cleanStr = dateStr.split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day, 12, 0, 0, 0);
    }
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    return null;
  };

  // Helper to get start and end boundaries for the current local timezone
  const getDateRange = (type: string, start: string, end: string) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (type) {
      case 'today':
        return { start: startOfToday, end: endOfToday };
      case 'week': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
        return { start: monday, end: endOfToday };
      }
      case 'month': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        return { start: startOfMonth, end: endOfToday };
      }
      case 'quarter': {
        const currentQuarterMonth = Math.floor(now.getMonth() / 3) * 3;
        const startOfQuarter = new Date(now.getFullYear(), currentQuarterMonth, 1, 0, 0, 0, 0);
        return { start: startOfQuarter, end: endOfToday };
      }
      case 'year': {
        const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        return { start: startOfYear, end: endOfToday };
      }
      case 'custom': {
        let startDate = new Date(0);
        if (start) {
          const parts = start.split('-');
          startDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0);
        }
        let endDate = new Date(9999, 11, 31, 23, 59, 59, 999);
        if (end) {
          const parts = end.split('-');
          endDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 23, 59, 59, 999);
        }
        return { start: startDate, end: endDate };
      }
      case 'all':
      default:
        return { start: new Date(0), end: new Date(9999, 11, 31, 23, 59, 59, 999) };
    }
  };

  const dateRange = useMemo(() => {
    return getDateRange(dateFilterType, customStartDate, customEndDate);
  }, [dateFilterType, customStartDate, customEndDate]);

  // Filtered students (registrations) during the period
  const filteredStudentsForExpected = useMemo(() => {
    if (dateFilterType === 'all') {
      return students;
    }
    return students.filter(s => {
      const d = parseLocalDate(s.dateInscription);
      return d && d >= dateRange.start && d <= dateRange.end;
    });
  }, [students, dateRange, dateFilterType]);

  const newInscriptionsCount = useMemo(() => {
    return filteredStudentsForExpected.length;
  }, [filteredStudentsForExpected]);

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

  // Total expected (Frais attendus pour ces élèves)
  const totalExpected = useMemo(() => {
    const activeList = dateFilterType === 'all' ? students : filteredStudentsForExpected;
    return activeList.reduce((sum, student) => {
      const classObj = classesList.find(c => c.id === student.classeId);
      return sum + (classObj?.prix || 0);
    }, 0);
  }, [students, filteredStudentsForExpected, classesList, dateFilterType]);

  // Total paid in the selected period (all payments received during the period)
  const totalPaid = useMemo(() => {
    return students.reduce((sum, student) => {
      const studentPaid = (student.paiements || [])
        .filter(p => {
          if (p.statut !== 'paid') return false;
          if (dateFilterType === 'all') return true;
          const pd = parseLocalDate(p.date);
          return pd && pd >= dateRange.start && pd <= dateRange.end;
        })
        .reduce((s, p) => s + p.montant, 0);
      return sum + studentPaid;
    }, 0);
  }, [students, dateRange, dateFilterType]);

  // Payments made by the filtered (new) students in the period
  const totalPaidByFilteredStudents = useMemo(() => {
    return filteredStudentsForExpected.reduce((sum, student) => {
      const studentPaid = (student.paiements || [])
        .filter(p => {
          if (p.statut !== 'paid') return false;
          if (dateFilterType === 'all') return true;
          const pd = parseLocalDate(p.date);
          return pd && pd >= dateRange.start && pd <= dateRange.end;
        })
        .reduce((s, p) => s + p.montant, 0);
      return sum + studentPaid;
    }, 0);
  }, [filteredStudentsForExpected, dateRange, dateFilterType]);

  // Montant en attente
  const totalPending = useMemo(() => {
    if (dateFilterType === 'all') {
      const allPaid = students.reduce((sum, student) => {
        const studentPaid = (student.paiements || [])
          .filter(p => p.statut === 'paid')
          .reduce((s, p) => s + p.montant, 0);
        return sum + studentPaid;
      }, 0);
      const allExpected = students.reduce((sum, student) => {
        const classObj = classesList.find(c => c.id === student.classeId);
        return sum + (classObj?.prix || 0);
      }, 0);
      return Math.max(0, allExpected - allPaid);
    }
    return Math.max(0, totalExpected - totalPaidByFilteredStudents);
  }, [dateFilterType, students, classesList, totalExpected, totalPaidByFilteredStudents]);

  // Recovery Rate
  const recoveryRate = useMemo(() => {
    return totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;
  }, [totalPaid, totalExpected]);

  // Format currency helper
  const formatFCFA = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  // Group by class for charts
  const classStats = useMemo(() => {
    return classesList.map(c => {
      // Filter students in class by registration date if period active
      const studentsInClass = students.filter(s => {
        if (s.classeId !== c.id) return false;
        if (dateFilterType === 'all') return true;
        const d = parseLocalDate(s.dateInscription);
        return d && d >= dateRange.start && d <= dateRange.end;
      });

      const count = studentsInClass.length;
      const expected = count * (c.prix || 0);

      // Payments received in the period for all students in this class
      const studentsAllInClass = students.filter(s => s.classeId === c.id);
      const paid = studentsAllInClass.reduce((sum, s) => {
        const studentPaidInPeriod = (s.paiements || [])
          .filter(p => {
            if (p.statut !== 'paid') return false;
            if (dateFilterType === 'all') return true;
            const pd = parseLocalDate(p.date);
            return pd && pd >= dateRange.start && pd <= dateRange.end;
          })
          .reduce((ps, p) => ps + p.montant, 0);
        return sum + studentPaidInPeriod;
      }, 0);

      // Payments made by the new students in the period for pending calculation
      const paidByNewStudentsInPeriod = studentsInClass.reduce((sum, s) => {
        const studentPaidInPeriod = (s.paiements || [])
          .filter(p => {
            if (p.statut !== 'paid') return false;
            if (dateFilterType === 'all') return true;
            const pd = parseLocalDate(p.date);
            return pd && pd >= dateRange.start && pd <= dateRange.end;
          })
          .reduce((ps, p) => ps + p.montant, 0);
        return sum + studentPaidInPeriod;
      }, 0);

      const pending = dateFilterType === 'all' ? Math.max(0, expected - paid) : Math.max(0, expected - paidByNewStudentsInPeriod);

      return {
        classeName: c.nom,
        studentCount: count,
        expected,
        paid,
        pending,
        rate: expected > 0 ? (paid / expected) * 100 : 0
      };
    });
  }, [classesList, students, dateFilterType, dateRange]);

  const activeClassStats = useMemo(() => {
    return classStats.filter(c => c.expected > 0);
  }, [classStats]);

  const displayStats = useMemo(() => {
    return activeClassStats.length > 0 ? activeClassStats : classStats;
  }, [activeClassStats, classStats]);

  // Filtered transactions for active period
  const filteredTransactions = useMemo(() => {
    if (dateFilterType === 'all') return transactions;
    return transactions.filter(tx => {
      const d = parseLocalDate(tx.date);
      return d && d >= dateRange.start && d <= dateRange.end;
    });
  }, [transactions, dateFilterType, dateRange]);

  const recentTransactions = useMemo(() => {
    return filteredTransactions.slice(0, 5);
  }, [filteredTransactions]);

  // Denominator for student percentage distribution in level charts
  const totalStudentsInPeriod = useMemo(() => {
    if (dateFilterType === 'all') return students.length;
    return filteredStudentsForExpected.length;
  }, [students, filteredStudentsForExpected, dateFilterType]);

  // Gender statistics for the active period
  const genderStats = useMemo(() => {
    const activeList = dateFilterType === 'all' ? students : filteredStudentsForExpected;
    const total = activeList.length;
    const girls = activeList.filter(s => s.sexe === 'F').length;
    const boys = activeList.filter(s => s.sexe === 'M').length;
    return {
      girlsPct: total > 0 ? ((girls / total) * 100).toFixed(0) : '0',
      boysPct: total > 0 ? ((boys / total) * 100).toFixed(0) : '0'
    };
  }, [students, filteredStudentsForExpected, dateFilterType]);

  const handleExportTransactions = () => {
    const dataToExport = filteredTransactions.map(tx => ({
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
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight text-black">Vue d&apos;ensemble</h1>
          <p className="text-sm text-slate-500 mt-1">
            Statistiques clés et aperçu financier de l&apos;établissement en temps réel.
          </p>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Connecté à Supabase en direct</span>
          </div>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 p-1.5 bg-slate-50 rounded-lg">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
            <select
              value={dateFilterType}
              onChange={(e) => setDateFilterType(e.target.value)}
              className="text-sm font-semibold text-slate-700 bg-transparent border-0 focus:ring-0 focus:outline-none cursor-pointer pr-8"
            >
              <option value="all">Toutes les périodes</option>
              <option value="today">Aujourd&apos;hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois-ci</option>
              <option value="quarter">Ce trimestre</option>
              <option value="year">Cette année</option>
              <option value="custom">Période personnalisée</option>
            </select>
          </div>

          {dateFilterType === 'custom' && (
            <div className="flex items-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-xs font-medium text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
              />
              <span className="text-xs text-slate-400 font-bold">au</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-xs font-medium text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          )}
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
            <div className="text-xs text-slate-500 mt-1 flex flex-col gap-1.5">
              <span className="flex items-center gap-1">
                <span className="text-emerald-500 font-semibold">{activeStudents} actifs</span>
                <span>• {totalStudents - activeStudents} suspendus</span>
              </span>
              {dateFilterType !== 'all' && (
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50/70 border border-indigo-100/50 px-2.5 py-1 rounded-xl inline-flex items-center gap-1.5 w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  dont {newInscriptionsCount} nouveau{newInscriptionsCount !== 1 ? 'x' : ''} inscrit{newInscriptionsCount !== 1 ? 's' : ''}
                </span>
              )}
              <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded inline-flex w-fit mt-1">
                Taux de réussite : {globalSuccessRate !== '--' ? `${globalSuccessRate}%` : '--'}
              </span>
            </div>
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
                <span>Taux de recouvrement {dateFilterType !== 'all' ? 'sur la période' : ''}</span>
                <span className="font-semibold text-indigo-600">{recoveryRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, recoveryRate)}%` }}
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
                      strokeDashoffset={2 * Math.PI * 70 - (Math.min(100, recoveryRate) / 100) * (2 * Math.PI * 70)}
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
                            strokeDashoffset={2 * Math.PI * 13 - (Math.min(100, stat.rate) / 100) * (2 * Math.PI * 13)}
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
              const pct = totalStudentsInPeriod > 0 ? (stat.studentCount / totalStudentsInPeriod) * 100 : 0;
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
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Filles ({genderStats.girlsPct}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Garçons ({genderStats.boysPct}%)
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
