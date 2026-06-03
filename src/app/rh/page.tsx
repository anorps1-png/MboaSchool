'use client';

import React, { useState, useEffect } from 'react';
import { 
  MembrePersonnel, 
  MasseSalarialeHistorique, 
  AbsenceRecord, 
  MouvementPersonnel, 
  EvaluationRH, 
  FormationRH 
} from '@/types/domain';
import { 
  mockPersonnel, 
  mockMasseSalarialeHistorique, 
  mockAbsences, 
  mockMouvements, 
  mockEvaluationsRH, 
  mockFormations 
} from '@/mock/rh';

export default function RHPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'personnel' | 'masse' | 'mouvements' | 'evals'>('dashboard');

  // State loaded from localStorage or mock
  const [personnelList, setPersonnelList] = useState<MembrePersonnel[]>([]);
  const [masseHistorique, setMasseHistorique] = useState<MasseSalarialeHistorique[]>([]);
  const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
  const [mouvements, setMouvements] = useState<MouvementPersonnel[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationRH[]>([]);
  const [formations, setFormations] = useState<FormationRH[]>([]);

  // Filter states
  const [contratFilter, setContratFilter] = useState<string>('all');
  const [categorieFilter, setCategorieFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Period filter for Absences & Movements
  const [mouvPeriod, setMouvPeriod] = useState<'all' | 'mensuel' | 'annuel'>('all');
  const [mouvMonth, setMouvMonth] = useState<string>('2026-05'); // For monthly filtering

  // Modal State for adding personnel
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNom, setNewNom] = useState('');
  const [newPrenom, setNewPrenom] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTel, setNewTel] = useState('');
  const [newSexe, setNewSexe] = useState<'M' | 'F'>('M');
  const [newCategorie, setNewCategorie] = useState<'Administration' | 'Enseignant' | 'Personnel d\'appui' | 'Technique'>('Enseignant');
  const [newContrat, setNewContrat] = useState<'CDI' | 'CDD' | 'Intérimaire' | 'Stagiaire'>('CDI');
  const [newSalaire, setNewSalaire] = useState('');
  const [newDateEmbauche, setNewDateEmbauche] = useState(new Date().toISOString().split('T')[0]);

  // Incentive Simulator State (Simulation d'intéressement)
  const [interessementEnveloppe, setInteressementEnveloppe] = useState('1000000'); // 1,000,000 FCFA
  const [simulationType, setSimulationType] = useState<'paritaire' | 'performance' | 'anciennete'>('paritaire');
  const [simulatedPayouts, setSimulatedPayouts] = useState<Record<string, number>>({});

  // Toast notification
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load or initialize personnel
      const storedPers = localStorage.getItem('mboaschool_rh_personnel');
      if (storedPers) {
        setPersonnelList(JSON.parse(storedPers));
      } else {
        setPersonnelList(mockPersonnel);
        localStorage.setItem('mboaschool_rh_personnel', JSON.stringify(mockPersonnel));
      }

      // Load histories
      setMasseHistorique(mockMasseSalarialeHistorique);
      setAbsences(mockAbsences);
      setMouvements(mockMouvements);
      setEvaluations(mockEvaluationsRH);
      setFormations(mockFormations);
    }
  }, []);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Add a personnel
  const handleAddPersonnel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNom || !newPrenom || !newEmail || !newSalaire) {
      triggerToast("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    const newEmp: MembrePersonnel = {
      id: `pers-${Date.now()}`,
      nom: newNom,
      prenom: newPrenom,
      email: newEmail,
      telephone: newTel || '+237 600 00 00 00',
      sexe: newSexe,
      categorie: newCategorie,
      typeContrat: newContrat,
      salaireDeBase: Number(newSalaire),
      dateEmbauche: newDateEmbauche,
      statut: 'actif'
    };

    const updatedList = [...personnelList, newEmp];
    setPersonnelList(updatedList);
    localStorage.setItem('mboaschool_rh_personnel', JSON.stringify(updatedList));

    // Also add an recruitment movement automatically!
    const newMouv: MouvementPersonnel = {
      id: `mov-${Date.now()}`,
      personnelId: newEmp.id,
      nomPersonnel: `${newEmp.nom} ${newEmp.prenom}`,
      type: 'embauche',
      date: newEmp.dateEmbauche,
      details: `Embauche en contrat ${newEmp.typeContrat} (${newEmp.categorie})`
    };
    const updatedMouvements = [newMouv, ...mouvements];
    setMouvements(updatedMouvements);

    // Reset fields
    setNewNom('');
    setNewPrenom('');
    setNewEmail('');
    setNewTel('');
    setNewSexe('M');
    setNewCategorie('Enseignant');
    setNewContrat('CDI');
    setNewSalaire('');
    setNewDateEmbauche(new Date().toISOString().split('T')[0]);
    setShowAddModal(false);

    triggerToast(`Personnel ${newPrenom} ${newNom} ajouté avec succès !`);
  };

  // Filtered personnel list
  const filteredPersonnel = personnelList.filter(emp => {
    const matchesSearch = 
      emp.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.prenom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesContrat = contratFilter === 'all' || emp.typeContrat === contratFilter;
    const matchesCategorie = categorieFilter === 'all' || emp.categorie === categorieFilter;

    return matchesSearch && matchesContrat && matchesCategorie;
  });

  // Calculate stats based on current personnel list
  const activeStaff = personnelList.filter(e => e.statut === 'actif');
  const countCDI = activeStaff.filter(e => e.typeContrat === 'CDI').length;
  const countCDD = activeStaff.filter(e => e.typeContrat === 'CDD').length;
  const countInterim = activeStaff.filter(e => e.typeContrat === 'Intérimaire').length;
  const countStage = activeStaff.filter(e => e.typeContrat === 'Stagiaire').length;

  const totalMonthlyPayroll = activeStaff.reduce((sum, e) => sum + e.salaireDeBase, 0);
  const avgMonthlySalary = activeStaff.length > 0 ? totalMonthlyPayroll / activeStaff.length : 0;

  // Training metrics
  const totalTrainingCosts = formations.reduce((sum, f) => sum + f.coutTotal, 0);
  const trainingPayrollRatio = totalMonthlyPayroll > 0 ? (totalTrainingCosts / (totalMonthlyPayroll * 12)) * 100 : 0; // Cost vs estimated annual payroll

  // Teacher evaluation averages
  const avgTeacherScore = evaluations.length > 0 ? evaluations.reduce((sum, ev) => sum + ev.noteMoyenne, 0) / evaluations.length : 0;
  const avgTeacherAdherenceJob = evaluations.length > 0 ? evaluations.reduce((sum, ev) => sum + ev.adherenceJobRole, 0) / evaluations.length : 0;
  const avgTeacherAdherenceVal = evaluations.length > 0 ? evaluations.reduce((sum, ev) => sum + ev.adherenceValeurs, 0) / evaluations.length : 0;

  // Simulate Incentive distribution
  const handleSimulateIncentive = () => {
    const envValue = Number(interessementEnveloppe);
    if (isNaN(envValue) || envValue <= 0) {
      triggerToast("Veuillez saisir une enveloppe valide.");
      return;
    }

    const payouts: Record<string, number> = {};

    if (simulationType === 'paritaire') {
      const share = envValue / activeStaff.length;
      activeStaff.forEach(emp => {
        payouts[emp.id] = Math.round(share);
      });
    } else if (simulationType === 'performance') {
      // Find evaluation or use default score (80)
      let totalWeights = 0;
      const weights: Record<string, number> = {};

      activeStaff.forEach(emp => {
        let score = 80; // default
        if (emp.categorie === 'Enseignant') {
          const teacherEval = evaluations.find(ev => ev.enseignantId === emp.id);
          if (teacherEval) score = teacherEval.noteMoyenne;
        } else {
          // Admin/Tech evaluation approximation
          score = emp.id === 'pers-1' || emp.id === 'pers-5' ? 90 : 85;
        }
        weights[emp.id] = score;
        totalWeights += score;
      });

      activeStaff.forEach(emp => {
        payouts[emp.id] = Math.round((weights[emp.id] / totalWeights) * envValue);
      });
    } else if (simulationType === 'anciennete') {
      // Calculate years of service
      let totalYears = 0;
      const weights: Record<string, number> = {};

      activeStaff.forEach(emp => {
        const hireDate = new Date(emp.dateEmbauche);
        const diffMs = Date.now() - hireDate.getTime();
        const diffYears = Math.max(0.5, diffMs / (1000 * 60 * 60 * 24 * 365.25)); // minimum weight of 0.5
        weights[emp.id] = diffYears;
        totalYears += diffYears;
      });

      activeStaff.forEach(emp => {
        payouts[emp.id] = Math.round((weights[emp.id] / totalYears) * envValue);
      });
    }

    setSimulatedPayouts(payouts);
    triggerToast("Simulation d'intéressement calculée !");
  };

  // Run initial simulation
  useEffect(() => {
    if (activeStaff.length > 0) {
      handleSimulateIncentive();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personnelList, simulationType]);

  // Format money helper
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(val);
  };

  // Absences & Movements filtered lists based on period toggles
  const getFilteredAbsences = () => {
    if (mouvPeriod === 'mensuel') {
      return absences.filter(a => a.dateDebut.startsWith(mouvMonth));
    }
    // Annual/all
    return absences;
  };

  const getFilteredMouvements = () => {
    if (mouvPeriod === 'mensuel') {
      return mouvements.filter(m => m.date.startsWith(mouvMonth));
    }
    return mouvements;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl z-50 flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white">✓</div>
          <span className="text-sm font-semibold">{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 text-black">Gestion des Ressources Humaines</h1>
          <p className="text-sm text-slate-500 mt-1">Supervision du personnel, masse salariale, absences, formations & évaluations</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/10 transition-colors flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          <span>Recruter un employé</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white p-2 rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
        {[
          { id: 'dashboard', label: 'Tableau de bord RH' },
          { id: 'personnel', label: 'Effectifs & Contrats' },
          { id: 'masse', label: 'Rémunérations & Masse salariale' },
          { id: 'mouvements', label: 'Absences & Mouvements' },
          { id: 'evals', label: 'Évaluations & Formations' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* -------------------- TAB: DASHBOARD -------------------- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Membres du Personnel</p>
                <h2 className="text-3xl font-extrabold text-slate-800 text-black">{activeStaff.length}</h2>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">{countCDI} CDI</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">{countCDD} CDD</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Masse Salariale Mensuelle</p>
                <h2 className="text-2xl font-extrabold text-indigo-600">{formatMoney(totalMonthlyPayroll)}</h2>
                <p className="text-xs text-slate-500 mt-2 font-medium flex items-center gap-1">
                  <span className="text-emerald-500 font-bold">↑ +5.2%</span> par rapport à 2025
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8"/><line x1="12" y1="6" x2="12" y2="18"/></svg>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Salaire Moyen</p>
                <h2 className="text-2xl font-extrabold text-slate-800 text-black">{formatMoney(avgMonthlySalary)}</h2>
                <p className="text-xs text-slate-400 mt-2 font-medium">Calculé sur {activeStaff.length} titulaires</p>
              </div>
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ratio Formation / MS</p>
                <h2 className="text-2xl font-extrabold text-violet-600">{trainingPayrollRatio.toFixed(2)} %</h2>
                <p className="text-xs text-slate-500 mt-2 font-medium">Recommandé &gt; 1.5%</p>
              </div>
              <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Evolutionary Path Chart - SVG */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="font-bold text-slate-800 text-black">Masse Salariale Mensuelle</h3>
                  <p className="text-xs text-slate-500">Évolution de la masse salariale brute (5 derniers mois)</p>
                </div>
                <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                  ↑ +4.1% croissance max
                </span>
              </div>

              {/* Interactive SVG Line Graph */}
              <div className="w-full h-64 relative">
                <svg viewBox="0 0 500 200" className="w-full h-full">
                  {/* Grid Lines */}
                  <line x1="40" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="60" x2="480" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="100" x2="480" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="140" x2="480" y2="140" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="180" x2="480" y2="180" stroke="#cbd5e1" strokeWidth="1.5" />

                  {/* Y-axis Labels */}
                  <text x="35" y="24" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="end">2,8M XAF</text>
                  <text x="35" y="104" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="end">2,6M XAF</text>
                  <text x="35" y="184" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="end">2,4M XAF</text>

                  {/* Monthly points: Jan: 2.64M, Feb: 2.64M, Mar: 2.64M, Apr: 2.75M, May: 2.75M */}
                  {/* Map values to coordinates: (40, 100) -> (140, 100) -> (240, 100) -> (340, 45) -> (440, 45) */}
                  <path 
                    d="M 40 100 L 140 100 L 240 100 L 340 45 L 440 45" 
                    fill="none" 
                    stroke="rgb(79, 70, 229)" 
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Gradient Area under line */}
                  <path
                    d="M 40 180 L 40 100 L 140 100 L 240 100 L 340 45 L 440 45 L 440 180 Z"
                    fill="url(#grad)"
                    opacity="0.15"
                  />

                  {/* Definitions for gradient */}
                  <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgb(79, 70, 229)" />
                      <stop offset="100%" stopColor="rgb(79, 70, 229)" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Points */}
                  <circle cx="40" cy="100" r="5.5" fill="rgb(79, 70, 229)" stroke="white" strokeWidth="2" className="cursor-pointer hover:r-8 transition-all" />
                  <circle cx="140" cy="100" r="5.5" fill="rgb(79, 70, 229)" stroke="white" strokeWidth="2" />
                  <circle cx="240" cy="100" r="5.5" fill="rgb(79, 70, 229)" stroke="white" strokeWidth="2" />
                  <circle cx="340" cy="45" r="5.5" fill="rgb(79, 70, 229)" stroke="white" strokeWidth="2" />
                  <circle cx="440" cy="45" r="5.5" fill="rgb(79, 70, 229)" stroke="white" strokeWidth="2" />

                  {/* X-axis Labels */}
                  <text x="40" y="195" fill="#64748b" fontSize="8" fontWeight="bold" textAnchor="middle">Janv</text>
                  <text x="140" y="195" fill="#64748b" fontSize="8" fontWeight="bold" textAnchor="middle">Févr</text>
                  <text x="240" y="195" fill="#64748b" fontSize="8" fontWeight="bold" textAnchor="middle">Mars</text>
                  <text x="340" y="195" fill="#64748b" fontSize="8" fontWeight="bold" textAnchor="middle">Avril</text>
                  <text x="440" y="195" fill="#64748b" fontSize="8" fontWeight="bold" textAnchor="middle">Mai</text>
                </svg>
              </div>
            </div>

            {/* Contract Types Distribution Pie/Donut Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h3 className="font-bold text-slate-800 text-black">Contrats & Effectifs</h3>
                <p className="text-xs text-slate-500">Répartition par type de contrat</p>
              </div>

              {/* Simple beautiful SVG representation of donut chart */}
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="relative w-36 h-36">
                  {/* SVG Circle sectors representing percentages */}
                  {/* CDI: 7/12 = 58.3% , CDD: 2/12 = 16.7% , Interim: 2/12 = 16.7% , Stage: 1/12 = 8.3% */}
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#e2e8f0" strokeWidth="3" />
                    
                    {/* CDI: Blue - Stroke-dasharray: 58.3 41.7, Offset: 0 */}
                    <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="rgb(79, 70, 229)" strokeWidth="3.5" strokeDasharray="58.3 41.7" strokeDashoffset="0" />
                    
                    {/* CDD: Emerald - Stroke-dasharray: 16.7 83.3, Offset: -58.3 */}
                    <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="rgb(16, 185, 129)" strokeWidth="3.5" strokeDasharray="16.7 83.3" strokeDashoffset="-58.3" />

                    {/* Interim: Amber - Stroke-dasharray: 16.7 83.3, Offset: -75 */}
                    <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="rgb(245, 158, 11)" strokeWidth="3.5" strokeDasharray="16.7 83.3" strokeDashoffset="-75" />

                    {/* Stage: Violet - Stroke-dasharray: 8.3 91.7, Offset: -91.7 */}
                    <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="rgb(139, 92, 246)" strokeWidth="3.5" strokeDasharray="8.3 91.7" strokeDashoffset="-91.7" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-800 text-black">{activeStaff.length}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Actifs</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="grid grid-cols-2 gap-4 w-full text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 block"></span>
                    <div>
                      <span className="font-bold text-slate-800 text-black">CDI</span>
                      <span className="text-slate-400 block text-[10px]">{countCDI} salariés ({Math.round(countCDI/activeStaff.length*100)}%)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
                    <div>
                      <span className="font-bold text-slate-800 text-black">CDD</span>
                      <span className="text-slate-400 block text-[10px]">{countCDD} salariés ({Math.round(countCDD/activeStaff.length*100)}%)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block"></span>
                    <div>
                      <span className="font-bold text-slate-800 text-black">Intérim</span>
                      <span className="text-slate-400 block text-[10px]">{countInterim} salariés ({Math.round(countInterim/activeStaff.length*100)}%)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-500 block"></span>
                    <div>
                      <span className="font-bold text-slate-800 text-black">Stagiaire</span>
                      <span className="text-slate-400 block text-[10px]">{countStage} salariés ({Math.round(countStage/activeStaff.length*100)}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Evaluations / Formations mini panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 text-black mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-600"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                Indicateurs Enseignants
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-500">Note d'Évaluation Moyenne</span>
                    <span className="text-indigo-600 font-extrabold">{avgTeacherScore.toFixed(1)} / 100</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${avgTeacherScore}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-500">Adhérence au Job Role</span>
                    <span className="text-emerald-500 font-extrabold">{avgTeacherAdherenceJob.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${avgTeacherAdherenceJob}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-500">Adhérence aux Valeurs</span>
                    <span className="text-violet-500 font-extrabold">{avgTeacherAdherenceVal.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-violet-500 h-full rounded-full" style={{ width: `${avgTeacherAdherenceVal}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 text-black mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-600"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                Dernières Formations
              </h3>
              <div className="space-y-3">
                {formations.map(f => (
                  <div key={f.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 text-black truncate">{f.theme}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{f.organisme} • {f.beneficiairesIds.length} bénéficiaire(s)</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-slate-800 text-black block">{formatMoney(f.coutTotal)}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${f.statut === 'terminé' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {f.statut}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB: PERSONNEL / EFFECTIFS -------------------- */}
      {activeTab === 'personnel' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-slate-100 pb-6">
            <div className="w-full md:w-auto flex flex-wrap gap-4 items-center">
              {/* Search */}
              <div className="relative w-full md:w-64">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </span>
                <input
                  type="text"
                  placeholder="Nom, prénom, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 pl-9 pr-4 py-2 rounded-lg text-sm text-black outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Contract filter */}
              <select
                value={contratFilter}
                onChange={(e) => setContratFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-black bg-slate-50 font-semibold"
              >
                <option value="all">Tous contrats</option>
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="Intérimaire">Intérimaire</option>
                <option value="Stagiaire">Stagiaire</option>
              </select>

              {/* Category filter */}
              <select
                value={categorieFilter}
                onChange={(e) => setCategorieFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-black bg-slate-50 font-semibold"
              >
                <option value="all">Toutes catégories</option>
                <option value="Administration">Administration</option>
                <option value="Enseignant">Enseignant</option>
                <option value="Technique">Technique</option>
                <option value="Personnel d'appui">Personnel d'appui</option>
              </select>
            </div>
            <div className="text-xs font-bold text-slate-400">
              {filteredPersonnel.length} membre(s) trouvé(s)
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase bg-slate-50/30">
                  <th className="px-6 py-4">Nom complet</th>
                  <th className="px-6 py-4">Catégorie</th>
                  <th className="px-6 py-4">Contrat</th>
                  <th className="px-6 py-4">Date d'embauche</th>
                  <th className="px-6 py-4 text-right">Salaire de Base</th>
                  <th className="px-6 py-4 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredPersonnel.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 text-black">{emp.nom} {emp.prenom}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{emp.email} • {emp.telephone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        emp.categorie === 'Enseignant' ? 'bg-indigo-50 text-indigo-700' :
                        emp.categorie === 'Administration' ? 'bg-amber-50 text-amber-700' :
                        emp.categorie === 'Technique' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {emp.categorie}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-600">{emp.typeContrat}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{new Date(emp.dateEmbauche).toLocaleDateString('fr-FR')}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-black">{formatMoney(emp.salaireDeBase)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow shadow-emerald-500/20"></span>
                    </td>
                  </tr>
                ))}
                {filteredPersonnel.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">Aucun membre de personnel ne correspond aux critères.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------- TAB: MASSE SALARIALE & REMUNERATIONS -------------------- */}
      {activeTab === 'masse' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Salaries List Table */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
              <h3 className="font-bold text-slate-800 text-black mb-4">Grille des Rémunérations</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase bg-slate-50/20">
                      <th className="px-4 py-3">Employé</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3 text-right">Salaire Base</th>
                      <th className="px-4 py-3 text-right">Prime (Simulée)</th>
                      <th className="px-4 py-3 text-right">Net à payer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeStaff.map(emp => {
                      const prime = simulatedPayouts[emp.id] || 0;
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/30">
                          <td className="px-4 py-3 font-semibold text-slate-800 text-black">{emp.nom} {emp.prenom}</td>
                          <td className="px-4 py-3 text-xs text-slate-400 font-bold">{emp.typeContrat}</td>
                          <td className="px-4 py-3 text-right font-mono text-black font-semibold">{formatMoney(emp.salaireDeBase)}</td>
                          <td className="px-4 py-3 text-right font-mono text-indigo-600 font-semibold">+ {formatMoney(prime)}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-black">{formatMoney(emp.salaireDeBase + prime)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Incentive profit sharing Simulator (Intéressement) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-bold text-slate-800 text-black">Simulateur d'Intéressement</h3>
                  <p className="text-xs text-slate-500">Distribuez dynamiquement une enveloppe de primes au personnel</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Enveloppe à partager (FCFA)</label>
                    <input
                      type="number"
                      value={interessementEnveloppe}
                      onChange={(e) => setInteressementEnveloppe(e.target.value)}
                      placeholder="Ex: 1000000"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Règle de Répartition</label>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-100 text-slate-700 text-sm font-semibold select-none">
                        <input
                          type="radio"
                          name="rule"
                          checked={simulationType === 'paritaire'}
                          onChange={() => setSimulationType('paritaire')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <span>Répartition Paritaire</span>
                          <span className="block text-[10px] text-slate-400 font-normal">Part égale pour tous ({formatMoney(Math.round(Number(interessementEnveloppe) / activeStaff.length))} par personne)</span>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-100 text-slate-700 text-sm font-semibold select-none">
                        <input
                          type="radio"
                          name="rule"
                          checked={simulationType === 'performance'}
                          onChange={() => setSimulationType('performance')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <span>Selon Note d'Évaluation</span>
                          <span className="block text-[10px] text-slate-400 font-normal">Favorise les enseignants avec de meilleurs résultats</span>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-100 text-slate-700 text-sm font-semibold select-none">
                        <input
                          type="radio"
                          name="rule"
                          checked={simulationType === 'anciennete'}
                          onChange={() => setSimulationType('anciennete')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <span>Selon l'Ancienneté</span>
                          <span className="block text-[10px] text-slate-400 font-normal">Favorise le personnel fidèle avec plus d'années de service</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 mt-4">
                <button
                  onClick={handleSimulateIncentive}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-md transition-colors"
                >
                  Recalculer les primes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB: ABSENCES & MOUVEMENTS -------------------- */}
      {activeTab === 'mouvements' && (
        <div className="space-y-6">
          {/* Periodic Filter Banner */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setMouvPeriod('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${mouvPeriod === 'all' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
              >
                Tout l'historique
              </button>
              <button
                onClick={() => setMouvPeriod('mensuel')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${mouvPeriod === 'mensuel' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
              >
                Mensuel
              </button>
            </div>

            {mouvPeriod === 'mensuel' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-bold">Mois :</span>
                <select
                  value={mouvMonth}
                  onChange={(e) => setMouvMonth(e.target.value)}
                  className="px-2 py-1 border border-slate-200 rounded text-xs text-black font-semibold"
                >
                  <option value="2026-05">Mai 2026</option>
                  <option value="2026-04">Avril 2026</option>
                  <option value="2026-03">Mars 2026</option>
                  <option value="2026-02">Février 2026</option>
                  <option value="2026-01">Janvier 2026</option>
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Absences Panel */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 text-black mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-500"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Registre des Absences ({getFilteredAbsences().length})
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {getFilteredAbsences().map(a => (
                  <div key={a.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div>
                      <div className="font-bold text-slate-800 text-black">{a.nomPersonnel}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Motif: {a.motif} • du {new Date(a.dateDebut).toLocaleDateString('fr-FR')} au {new Date(a.dateFin).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <span className="text-xs font-black bg-rose-50 text-rose-600 px-2 py-1 rounded-lg">
                      {a.dureeJours} jour(s)
                    </span>
                  </div>
                ))}
                {getFilteredAbsences().length === 0 && (
                  <div className="text-center text-slate-400 py-12">Aucune absence enregistrée sur cette période.</div>
                )}
              </div>
            </div>

            {/* Movements Timeline */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 text-black mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                Mouvements de Personnel ({getFilteredMouvements().length})
              </h3>
              <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 max-h-96 overflow-y-auto pr-1 pl-2">
                {getFilteredMouvements().map(m => {
                  const isEmbauche = m.type === 'embauche';
                  const isDepart = m.type === 'depart_volontaire';
                  const isLicenciement = m.type === 'licenciement';
                  const isMutation = m.type === 'mutation';

                  return (
                    <div key={m.id} className="relative pl-8">
                      {/* Timeline Dot */}
                      <span className={`absolute left-2 top-1.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center -translate-x-1/2 ${
                        isEmbauche ? 'bg-emerald-500 shadow shadow-emerald-500/20' :
                        isDepart ? 'bg-amber-500' :
                        isLicenciement ? 'bg-rose-500' : 'bg-blue-500'
                      }`}></span>
                      
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono font-bold block">{new Date(m.date).toLocaleDateString('fr-FR')}</span>
                        <div className="font-bold text-slate-800 text-black mt-0.5">{m.nomPersonnel}</div>
                        <div className="text-xs text-slate-500 mt-1 font-semibold flex items-center gap-1.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            isEmbauche ? 'bg-emerald-50 text-emerald-700' :
                            isDepart ? 'bg-amber-50 text-amber-700' :
                            isLicenciement ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'
                          }`}>
                            {m.type.toUpperCase().replace('_', ' ')}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="font-normal text-slate-500 italic">{m.details}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {getFilteredMouvements().length === 0 && (
                  <div className="text-center text-slate-400 py-12 pl-0 before:hidden">Aucun mouvement de personnel enregistré sur cette période.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB: EVALUATIONS & FORMATIONS -------------------- */}
      {activeTab === 'evals' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Teacher Evaluations */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-800 text-black flex items-center gap-2 border-b border-slate-100 pb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-600"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              Évaluations Professionnelles
            </h3>

            <div className="space-y-6">
              {evaluations.map(ev => (
                <div key={ev.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800 text-black">{ev.nomEnseignant}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Évalué par {ev.evaluateur} le {new Date(ev.dateEvaluation).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <span className="text-sm font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                      {ev.noteMoyenne} / 100
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Job Role</span>
                      <span className="text-lg font-black text-slate-800 text-black mt-1 block">{ev.adherenceJobRole}%</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Valeurs</span>
                      <span className="text-lg font-black text-emerald-500 mt-1 block">{ev.adherenceValeurs}%</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Notes Formations</span>
                      <span className="text-lg font-black text-violet-500 mt-1 block">{ev.noteFormationMoyenne} <span className="text-[10px] font-semibold text-slate-400">/20</span></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Formations list & analysis */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-800 text-black flex items-center gap-2 border-b border-slate-100 pb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-600"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              Suivi des Formations
            </h3>

            <div className="bg-violet-50/50 p-4 rounded-xl border border-violet-100 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-violet-700 block">Total Dépenses Formation</span>
                <span className="text-2xl font-black text-violet-900 mt-1 block">{formatMoney(totalTrainingCosts)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Impact masse salariale</span>
                <span className="text-sm font-extrabold text-slate-700 block mt-1">{trainingPayrollRatio.toFixed(2)} %</span>
              </div>
            </div>

            <div className="space-y-4">
              {formations.map(f => (
                <div key={f.id} className="p-4 rounded-xl border border-slate-100 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800 text-black text-sm leading-snug">{f.theme}</h4>
                      <span className="text-xs text-slate-400 font-bold block mt-1">{f.organisme} • du {new Date(f.dateDebut).toLocaleDateString('fr-FR')} au {new Date(f.dateFin).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800 text-black text-sm">{formatMoney(f.coutTotal)}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      <span className="text-xs text-slate-500 font-semibold">{f.beneficiairesIds.length} bénéficiaire(s)</span>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.statut === 'terminé' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>
                      {f.statut}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -------------------- RECRUITMENT FORM MODAL -------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-100 shadow-2xl p-6 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Recruter un Nouveau Collaborateur</h3>
            
            <form onSubmit={handleAddPersonnel} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Nom *</label>
                  <input
                    type="text"
                    required
                    value={newNom}
                    onChange={(e) => setNewNom(e.target.value)}
                    placeholder="Nom de famille"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={newPrenom}
                    onChange={(e) => setNewPrenom(e.target.value)}
                    placeholder="Prénoms"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Sexe *</label>
                  <select
                    value={newSexe}
                    onChange={(e) => setNewSexe(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-semibold"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Téléphone</label>
                  <input
                    type="text"
                    value={newTel}
                    onChange={(e) => setNewTel(e.target.value)}
                    placeholder="+237 6xx xx xx xx"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Adresse Email *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nom@ecole.cm"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Catégorie Métier *</label>
                  <select
                    value={newCategorie}
                    onChange={(e) => setNewCategorie(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-semibold"
                  >
                    <option value="Enseignant">Enseignant</option>
                    <option value="Administration">Administration</option>
                    <option value="Technique">Technique</option>
                    <option value="Personnel d'appui">Personnel d'appui</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Type de Contrat *</label>
                  <select
                    value={newContrat}
                    onChange={(e) => setNewContrat(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-semibold"
                  >
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                    <option value="Intérimaire">Intérimaire</option>
                    <option value="Stagiaire">Stagiaire</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Salaire Mensuel Brut (FCFA) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newSalaire}
                    onChange={(e) => setNewSalaire(e.target.value)}
                    placeholder="Ex: 250000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Date de Prise d'Effet *</label>
                  <input
                    type="date"
                    required
                    value={newDateEmbauche}
                    onChange={(e) => setNewDateEmbauche(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md shadow-indigo-600/10 hover:bg-indigo-700"
                >
                  Valider l'embauche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
