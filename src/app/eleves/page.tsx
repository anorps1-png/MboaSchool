'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { mockStudents } from '@/mock/students';
import { mockClassFees } from '@/mock/fees';
import Link from 'next/link';
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@/components/icons';
import { Eleve } from '@/types/domain';

export default function ElevesPage() {
  const [students, setStudents] = useState<Eleve[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Form states for adding student
  const [showAddModal, setShowAddModal] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [className, setClassName] = useState('Terminale D');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [matricule, setMatricule] = useState('');

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('All');
  const [selectedGender, setSelectedGender] = useState('All');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Load from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mboaschool_students');
      if (stored) {
        try {
          setStudents(JSON.parse(stored));
        } catch (e) {
          setStudents(mockStudents);
        }
      } else {
        localStorage.setItem('mboaschool_students', JSON.stringify(mockStudents));
        setStudents(mockStudents);
      }
      setIsLoaded(true);
    }
  }, []);

  // Helper: Get student payment stats
  const getStudentPaymentStats = (student: Eleve) => {
    const classFeeConfig = mockClassFees.find(cf => cf.classe === student.classe);
    const totalDue = classFeeConfig ? classFeeConfig.total : 0;
    const totalPaid = student.paiements
      .filter(p => p.statut === 'paid')
      .reduce((sum, p) => sum + p.montant, 0);
    
    let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
    if (totalPaid >= totalDue && totalDue > 0) {
      status = 'paid';
    } else if (totalPaid > 0) {
      status = 'partial';
    }

    return { totalDue, totalPaid, status };
  };

  // Filter students
  const filteredStudents = useMemo(() => {
    if (!isLoaded) return [];
    return students.filter(student => {
      // 1. Search term (Name or Matricule)
      const fullName = `${student.nom} ${student.prenom}`.toLowerCase();
      const matriculeVal = student.matricule.toLowerCase();
      const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || matriculeVal.includes(searchTerm.toLowerCase());

      // 2. Class
      const matchesClass = selectedClass === 'All' || student.classe === selectedClass;

      // 3. Payment Status
      const stats = getStudentPaymentStats(student);
      const matchesPayment = selectedPaymentStatus === 'All' || stats.status === selectedPaymentStatus;

      // 4. Gender
      const matchesGender = selectedGender === 'All' || student.genre === selectedGender;

      return matchesSearch && matchesClass && matchesPayment && matchesGender;
    });
  }, [students, searchTerm, selectedClass, selectedPaymentStatus, selectedGender, isLoaded]);

  // Total counts for widgets
  const widgetStats = useMemo(() => {
    if (!isLoaded) return { paidCount: 0, partialCount: 0, unpaidCount: 0, total: 0 };
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;

    students.forEach(s => {
      const { status } = getStudentPaymentStats(s);
      if (status === 'paid') paidCount++;
      else if (status === 'partial') partialCount++;
      else unpaidCount++;
    });

    return { paidCount, partialCount, unpaidCount, total: students.length };
  }, [students, isLoaded]);

  // Pagination Logic
  const totalItems = filteredStudents.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);

  const paginatedStudents = useMemo(() => {
    const startIndex = (activePage - 1) * pageSize;
    return filteredStudents.slice(startIndex, startIndex + pageSize);
  }, [filteredStudents, activePage, pageSize]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !parentName || !parentPhone) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    // Auto-generate matricule if empty
    const generatedMatricule = matricule.trim() || `26YAE${Math.floor(100 + Math.random() * 900)}`;

    const newStudent: Eleve = {
      id: `stud-${Date.now()}`,
      matricule: generatedMatricule,
      prenom: firstName,
      nom: lastName,
      genre: gender,
      classe: className,
      nomParent: parentName,
      telephoneParent: parentPhone,
      emailParent: parentEmail || 'N/A',
      dateNaissance: dateOfBirth || '2012-01-01',
      lieuNaissance: birthPlace || 'Yaoundé',
      dateInscription: new Date().toISOString().split('T')[0],
      statut: 'actif',
      paiements: [], // starts with 0 payments
      notes: []    // starts with empty grades
    };

    const updatedList = [newStudent, ...students];
    setStudents(updatedList);
    localStorage.setItem('mboaschool_students', JSON.stringify(updatedList));

    // Reset fields
    setFirstName('');
    setLastName('');
    setGender('M');
    setClassName('Terminale D');
    setParentName('');
    setParentPhone('');
    setParentEmail('');
    setDateOfBirth('');
    setBirthPlace('');
    setMatricule('');

    setShowAddModal(false);
    triggerToast(`L'élève ${lastName} ${firstName} a été inscrit avec succès.`);
  };

  const formatFCFA = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' F';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-slate-800 text-white px-5 py-3.5 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-in slide-in-from-bottom-6 duration-300">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white">✓</div>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight text-black">Liste des Élèves</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gérez les fiches des élèves, filtrez par statut de scolarité ou niveau académique.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-md shadow-indigo-600/10 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <PlusIcon size={16} />
          Inscrire un élève
        </button>
      </div>

      {/* Stats Quick Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Effectif Total</span>
          <span className="text-2xl font-extrabold text-slate-800 mt-1 block text-black">{widgetStats.total}</span>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Scolarité Réglée</span>
          <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">{widgetStats.paidCount}</span>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tranche Partielle</span>
          <span className="text-2xl font-extrabold text-amber-500 mt-1 block">{widgetStats.partialCount}</span>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Non Payé / Attente</span>
          <span className="text-2xl font-extrabold text-red-500 mt-1 block">{widgetStats.unpaidCount}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full lg:w-96">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <SearchIcon size={16} />
            </span>
            <input
              type="text"
              placeholder="Rechercher par nom ou matricule..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-black"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-3 w-full lg:w-auto items-center justify-end">
            {/* Class Filter */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-400 hidden sm:inline">Classe:</span>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto appearance-none bg-slate-50 border border-slate-200 pl-3 pr-8 py-2 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-black"
              >
                <option value="All">Toutes les classes</option>
                {mockClassFees.map(c => (
                  <option key={c.classe} value={c.classe}>{c.classe}</option>
                ))}
              </select>
            </div>

            {/* Payment Status Filter */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-400 hidden sm:inline">Frais:</span>
              <select
                value={selectedPaymentStatus}
                onChange={(e) => {
                  setSelectedPaymentStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto appearance-none bg-slate-50 border border-slate-200 pl-3 pr-8 py-2 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-black"
              >
                <option value="All">Tous les statuts</option>
                <option value="paid">Payé</option>
                <option value="partial">Partiel</option>
                <option value="unpaid">Non Payé</option>
              </select>
            </div>

            {/* Gender Filter */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-400 hidden sm:inline">Genre:</span>
              <select
                value={selectedGender}
                onChange={(e) => {
                  setSelectedGender(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto appearance-none bg-slate-50 border border-slate-200 pl-3 pr-8 py-2 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-black"
              >
                <option value="All">Tous</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/20">
                <th className="px-6 py-4">Élève</th>
                <th className="px-6 py-4">Matricule</th>
                <th className="px-6 py-4">Classe</th>
                <th className="px-6 py-4 text-center">Genre</th>
                <th className="px-6 py-4">Scolarité (FCFA)</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {isLoaded && paginatedStudents.length > 0 ? (
                paginatedStudents.map((student) => {
                  const { totalDue, totalPaid, status } = getStudentPaymentStats(student);
                  const progressPct = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/40 transition-colors">
                      {/* Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center border shadow-inner ${
                            student.genre === 'F' 
                              ? 'bg-rose-50 text-rose-600 border-rose-100'
                              : 'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                            {student.prenom[0]}{student.nom[0]}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800 block hover:text-indigo-600 cursor-pointer text-black">
                              {student.nom} {student.prenom}
                            </span>
                            <span className="text-[10px] text-slate-400 block">Parent: {student.nomParent}</span>
                          </div>
                        </div>
                      </td>

                      {/* Matricule */}
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-500">
                        {student.matricule}
                      </td>

                      {/* Class */}
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {student.classe}
                      </td>

                      {/* Gender Badge */}
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          student.genre === 'F' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {student.genre}
                        </span>
                      </td>

                      {/* Progress bar */}
                      <td className="px-6 py-4">
                        <div className="w-48">
                          <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
                            <span>{formatFCFA(totalPaid)}</span>
                            <span>/ {formatFCFA(totalDue)}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                status === 'paid' ? 'bg-emerald-500' : status === 'partial' ? 'bg-amber-400' : 'bg-slate-300'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : status === 'partial'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-red-50 text-red-700 border-red-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            status === 'paid' ? 'bg-emerald-500' : status === 'partial' ? 'bg-amber-500' : 'bg-red-500'
                          }`}></span>
                          {status === 'paid' ? 'Payé' : status === 'partial' ? 'Partiel' : 'Non Payé'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/eleves/${student.id}`}
                          className="inline-flex items-center justify-center px-3 py-1.5 border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/20 hover:text-indigo-600 rounded-lg text-xs font-semibold text-slate-600 transition-all"
                        >
                          Fiche Élève
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                    {isLoaded ? "Aucun élève ne correspond aux critères de recherche." : "Chargement des élèves..."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/30">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Afficher</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 px-2 py-1 rounded focus:outline-none text-black"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
            <span>lignes</span>
            <span className="ml-2 font-medium">
              {totalItems > 0 ? (activePage - 1) * pageSize + 1 : 0} - {Math.min(activePage * pageSize, totalItems)} sur {totalItems} élèves
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(activePage - 1)}
              disabled={activePage === 1}
              className={`p-1.5 rounded-lg border text-slate-500 transition-all ${
                activePage === 1 ? 'opacity-40 cursor-not-allowed bg-slate-50' : 'bg-white hover:bg-slate-50 hover:text-indigo-600 border-slate-200'
              }`}
            >
              <ChevronLeftIcon size={16} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold border transition-all ${
                  activePage === page
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(activePage + 1)}
              disabled={activePage === totalPages}
              className={`p-1.5 rounded-lg border text-slate-500 transition-all ${
                activePage === totalPages ? 'opacity-40 cursor-not-allowed bg-slate-50' : 'bg-white hover:bg-slate-50 hover:text-indigo-600 border-slate-200'
              }`}
            >
              <ChevronRightIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Add Student Modal Form */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-100 shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 text-black">
              Inscrire un Nouvel Élève
            </h3>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                    placeholder="ex: Fouda"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                    placeholder="ex: Jean-Pierre"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Genre
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'M' | 'F')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Classe *
                  </label>
                  <select
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                  >
                    {mockClassFees.map(c => (
                      <option key={c.classe} value={c.classe}>{c.classe}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Matricule (laisser vide pour auto-générer)
                  </label>
                  <input
                    type="text"
                    value={matricule}
                    onChange={(e) => setMatricule(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-black"
                    placeholder="ex: 26YAE011"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Lieu de naissance
                </label>
                <input
                  type="text"
                  value={birthPlace}
                  onChange={(e) => setBirthPlace(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                  placeholder="ex: Yaoundé"
                />
              </div>

              <div className="border-t border-slate-100 pt-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Responsable Légal (Parent)</span>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Nom complet du Parent *
                    </label>
                    <input
                      type="text"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                      placeholder="ex: Emmanuel Fouda"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Téléphone *
                      </label>
                      <input
                        type="text"
                        value={parentPhone}
                        onChange={(e) => setParentPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                        placeholder="ex: +237 677 88 99 00"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Email du parent
                      </label>
                      <input
                        type="email"
                        value={parentEmail}
                        onChange={(e) => setParentEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                        placeholder="ex: parent.fouda@gmail.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-600/10 transition-colors"
                >
                  Inscrire
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
