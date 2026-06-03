'use client';

import React, { useState, useEffect } from 'react';
import { 
  EcritureComptable, 
  CompteOHADA, 
  Eleve, 
  MembrePersonnel, 
  FormationRH 
} from '@/types/domain';
import { planComptableOHADA, mockEcrituresInitiales } from '@/mock/comptabilite';
import { mockStudents } from '@/mock/students';
import { mockPersonnel, mockFormations } from '@/mock/rh';
import { mockBSCHistorique, mockBudget2026, BudgetPrevisionnel } from '@/mock/finance';

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<'bsc' | 'productivity' | 'ratios' | 'cash' | 'budget' | 'accounting'>('bsc');
  
  // State for accounting transactions
  const [ecritures, setEcritures] = useState<EcritureComptable[]>([]);
  const [planComptable, setPlanComptable] = useState<CompteOHADA[]>([]);
  
  // State for other domains
  const [students, setStudents] = useState<Eleve[]>([]);
  const [personnel, setPersonnel] = useState<MembrePersonnel[]>([]);
  const [formations, setFormations] = useState<FormationRH[]>([]);

  // Modals for accounting
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expTypeSaisie, setExpTypeSaisie] = useState<'immediat' | 'credit' | 'reglement'>('immediat');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expLibelle, setExpLibelle] = useState('');
  const [expReference, setExpReference] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expAmountPaye, setExpAmountPaye] = useState('');
  const [expCompteDebit, setExpCompteDebit] = useState('601');
  const [expCompteTiers, setExpCompteTiers] = useState('401');
  const [expCompteCredit, setExpCompteCredit] = useState('571');
  const [expTva, setExpTva] = useState(false);

  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccNum, setNewAccNum] = useState('');
  const [newAccLibelle, setNewAccLibelle] = useState('');
  const [newAccClasse, setNewAccClasse] = useState('6');

  // Subtab for accounting
  const [accountingSubTab, setAccountingSubTab] = useState<'journal' | 'balance'>('journal');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // BSC years state
  const [bscYears, setBscYears] = useState({ year1: 2024, year2: 2025, year3: 2026 });

  // Budget states
  const [budgetLines, setBudgetLines] = useState<BudgetPrevisionnel[]>([]);
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [newBudgetPoste, setNewBudgetPoste] = useState('');
  const [newBudgetCategorie, setNewBudgetCategorie] = useState<'Revenu' | 'Charge'>('Charge');
  const [newBudgetPrevu, setNewBudgetPrevu] = useState('');

  // Editing budget lines
  const [editingBudgetIndex, setEditingBudgetIndex] = useState<number | null>(null);
  const [editBudgetPoste, setEditBudgetPoste] = useState('');
  const [editBudgetCategorie, setEditBudgetCategorie] = useState<'Revenu' | 'Charge'>('Charge');
  const [editBudgetPrevu, setEditBudgetPrevu] = useState('');

  // Budget report state
  const [showBudgetReportModal, setShowBudgetReportModal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. Plan comptable
      const storedPlan = localStorage.getItem('mboaschool_plancomptable');
      const loadedPlan = storedPlan ? JSON.parse(storedPlan) : planComptableOHADA;
      setPlanComptable(loadedPlan);
      if (!storedPlan) localStorage.setItem('mboaschool_plancomptable', JSON.stringify(planComptableOHADA));

      // 2. Students
      const storedStudents = localStorage.getItem('mboaschool_students');
      let loadedStudents = mockStudents;
      if (storedStudents) {
        try {
          const parsed = JSON.parse(storedStudents);
          if (Array.isArray(parsed)) loadedStudents = parsed;
        } catch (e) {}
      }
      const cleanStudents = (loadedStudents || []).filter(Boolean);
      setStudents(cleanStudents);

      // 3. Personnel
      const storedPers = localStorage.getItem('mboaschool_rh_personnel');
      let loadedPers = mockPersonnel;
      if (storedPers) {
        try {
          const parsed = JSON.parse(storedPers);
          if (Array.isArray(parsed)) loadedPers = parsed;
        } catch (e) {}
      }
      const cleanPers = (loadedPers || []).filter(Boolean);
      setPersonnel(cleanPers);

      // 4. Formations
      setFormations(mockFormations);

      // 5. General Ledger entries
      const storedEcritures = localStorage.getItem('mboaschool_ecritures');
      const customEcritures = storedEcritures ? JSON.parse(storedEcritures) : mockEcrituresInitiales;
      
      // Auto-generate entries from student payments dynamically
      const paymentEcritures: EcritureComptable[] = [];
      cleanStudents.forEach((student: Eleve) => {
        if (!student) return;
        const paiements = student.paiements || [];
        const totalScolarite = paiements.reduce((sum, p) => sum + p.montant, 0);
        
        if (totalScolarite > 0) {
          // Constatation entry
          const dateConst = student.dateInscription ? student.dateInscription.split('T')[0] : '2025-09-01';
          paymentEcritures.push({
            id: `ecr-const-${student.id}`,
            date: dateConst,
            libelle: `Constatation Frais Scolaires - ${student.nom} ${student.prenom}`,
            reference: `FACT-${student.matricule}`,
            lignes: [
              { compteNumero: '411', debit: totalScolarite, credit: 0 },
              { compteNumero: '706', debit: 0, credit: totalScolarite }
            ]
          });

          // Règlements entries
          paiements.forEach(p => {
            if (p.statut === 'paid') {
              const compTres = p.modePaiement === 'Virement Bancaire' ? '521' : '571';
              paymentEcritures.push({
                id: `ecr-pay-${p.id}`,
                date: p.date.split('T')[0],
                libelle: `Règlement ${p.typeFrais} - ${student.nom} ${student.prenom}`,
                reference: p.reference,
                lignes: [
                  { compteNumero: compTres, debit: p.montant, credit: 0 },
                  { compteNumero: '411', debit: 0, credit: p.montant }
                ]
              });
            }
          });
        }
      });

      const combined = [...customEcritures, ...paymentEcritures].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setEcritures(combined);
      if (!storedEcritures) localStorage.setItem('mboaschool_ecritures', JSON.stringify(customEcritures));

      // 6. BSC Years
      const storedBscYears = localStorage.getItem('mboaschool_bsc_years');
      if (storedBscYears) {
        try {
          setBscYears(JSON.parse(storedBscYears));
        } catch (e) {}
      } else {
        localStorage.setItem('mboaschool_bsc_years', JSON.stringify({ year1: 2024, year2: 2025, year3: 2026 }));
      }

      // 7. Budget lines
      const storedBudget = localStorage.getItem('mboaschool_budget_lines');
      if (storedBudget) {
        try {
          setBudgetLines(JSON.parse(storedBudget));
        } catch (e) {
          setBudgetLines(mockBudget2026);
        }
      } else {
        localStorage.setItem('mboaschool_budget_lines', JSON.stringify(mockBudget2026));
        setBudgetLines(mockBudget2026);
      }
    }
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // --- Dynamic Financial Metrics for 2026 ---

  // Chiffre d'Affaires 2026 (recognized from all student payments)
  const totalCA2026 = students.reduce((sum, s) => {
    const studentPays = s.paiements || [];
    return sum + studentPays.reduce((sSum, p) => p.statut === 'paid' ? sSum + p.montant : sSum, 0);
  }, 0);

  // Masse salariale mensuelle et annuelle 2026
  const activeStaff = personnel.filter(p => p.statut === 'actif');
  const masseSalarialeMensuelle2026 = activeStaff.reduce((sum, p) => sum + p.salaireDeBase, 0);
  const masseSalarialeAnnuelle2026 = masseSalarialeMensuelle2026 * 12;

  // Operating charges from OHADA journal (Class 6 except account 661 - Salaries)
  const totalChargesComptables2026 = ecritures.reduce((sum, ecr) => {
    return sum + ecr.lignes.reduce((lSum, l) => {
      const isClass6 = l.compteNumero.startsWith('6');
      const isNotSalaries = l.compteNumero !== '661';
      return isClass6 && isNotSalaries ? lSum + (l.debit - l.credit) : lSum;
    }, 0);
  }, 0);

  // Training expenditures
  const totalTrainingCosts2026 = formations.reduce((sum, f) => sum + f.coutTotal, 0);

  // Bénéfice Net 2026
  const netProfit2026 = totalCA2026 - (masseSalarialeAnnuelle2026 + totalChargesComptables2026 + totalTrainingCosts2026);

  // Ratios balance sheet constants (simulated)
  const simulatedInterestExpense = 240000; // Intérêts financiers
  const simulatedDebts = 3800000; // Dettes totales
  const simulatedEquity = 15000000; // Fonds propres
  const totalAssets = simulatedEquity + simulatedDebts; // Total Actifs

  // Ratios calculations
  const ratioMargin = totalCA2026 > 0 ? (netProfit2026 / totalCA2026) * 100 : 0; // Rendement ventes
  const ratioROA = simulatedEquity > 0 ? (netProfit2026 / simulatedEquity) * 100 : 0; // RCI / Rentabilité des capitaux
  const ratioAssetTurnover = totalAssets > 0 ? totalCA2026 / totalAssets : 0; // Rotation des actifs
  const ratioLeverage = simulatedEquity > 0 ? totalAssets / simulatedEquity : 1; // Levier financier
  const ratioDebt = totalAssets > 0 ? (simulatedDebts / totalAssets) * 100 : 0; // Ratio d'endettement

  // --- Clients/Students Perspective ---
  const totalStudents2026 = students.length;
  // Recovery Rate: Total cash collected / Total scolarité due (mock: 120,000 per student average)
  const totalFeesDue2026 = students.length * 110000; 
  const totalRecoveryRate2026 = totalFeesDue2026 > 0 ? (totalCA2026 / totalFeesDue2026) * 100 : 0;

  // --- Internal Process Perspective ---
  const studentBulletins = students.flatMap(s => s.bulletins || []);
  const avgMoyenneGenerale2026 = studentBulletins.length > 0 
    ? studentBulletins.reduce((sum, b) => sum + b.moyenne, 0) / studentBulletins.length 
    : 12.5; // fallback
  const totalAbsences2026 = activeStaff.length > 0 ? 42 : 0; // standard mock days or sum from rh
  const avgClassSize2026 = 36; // 36 per class or calculated

  // --- Learning & Growth Perspective ---
  const trainingPayrollRatio2026 = masseSalarialeAnnuelle2026 > 0 
    ? (totalTrainingCosts2026 / masseSalarialeAnnuelle2026) * 100 
    : 0;
  const avgTeacherJobRoleAdherence2026 = 89.2; // in %
  const avgTeacherTrainingScore2026 = 15.6; // out of 20

  // Historical data index for BSC
  const hist2024 = mockBSCHistorique.find(h => h.annee === 2024)!;
  const hist2025 = mockBSCHistorique.find(h => h.annee === 2025)!;

  // Trend arrows helper
  const getTrendIndicator = (val2026: number, val2025: number, higherIsBetter = true) => {
    const isHigher = val2026 > val2025;
    if (val2026 === val2025) return <span className="text-slate-400 font-bold ml-1.5">→</span>;
    const isFavorable = higherIsBetter ? isHigher : !isHigher;
    return (
      <span className={`font-extrabold ml-1.5 ${isFavorable ? 'text-emerald-500' : 'text-rose-500'}`}>
        {isHigher ? '▲' : '▼'}
      </span>
    );
  };

  // --- Segment Productivity calculations ---

  // Global CA / Employee
  const activeEmployeeCount = activeStaff.length;
  const globalProductivity = activeEmployeeCount > 0 ? totalCA2026 / activeEmployeeCount : 0;

  // Mappings for section productivity
  // F (Francophone): Terminale D, 3ème
  // A (Anglophone): classes in Anglophone subsystem
  // B (Bilingue): Maternelle
  const getSectionProductivity = (secId: 'sec-fr' | 'sec-en' | 'sec-bi') => {
    let secCA = 0;
    let secStaff = 0;

    if (secId === 'sec-fr') {
      secCA = students
        .filter(s => s.classeId === 'cls-term-d' || s.classeId === 'cls-sec-c' || s.classeId === 'Terminale D' || s.classeId === '3ème')
        .flatMap(s => s.paiements || [])
        .reduce((sum, p) => p.statut === 'paid' ? sum + p.montant : sum, 0);
      secStaff = activeStaff.filter(p => p.id === 'teach-1' || p.id === 'teach-3' || p.id === 'pers-6' || p.id === 'pers-11').length;
    } else if (secId === 'sec-en') {
      // Simulate Anglophone Subsystem
      secCA = totalCA2026 * 0.25; // 25% of revenues
      secStaff = activeStaff.filter(p => p.id === 'teach-2' || p.id === 'pers-9').length;
    } else {
      // Bilingue / Maternelle / Communs
      secCA = students
        .filter(s => s.classeId === 'cls-mat-gs' || s.classeId === 'Maternelle')
        .flatMap(s => s.paiements || [])
        .reduce((sum, p) => p.statut === 'paid' ? sum + p.montant : sum, 0);
      if (secCA === 0) secCA = totalCA2026 * 0.15; // default fallback 15%
      secStaff = activeStaff.filter(p => p.id === 'pers-1' || p.id === 'pers-5' || p.id === 'pers-7' || p.id === 'pers-8' || p.id === 'pers-10' || p.id === 'pers-12').length;
    }

    return secStaff > 0 ? secCA / secStaff : 0;
  };

  // Format money helper
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(val);
  };

  // Class productivity
  // Total payments of students in class / principal teacher salary
  const getClassProductivity = (className: string) => {
    const classStudents = students.filter(s => 
      s.classeId === className || 
      (className === 'Terminale D' && s.classeId === 'cls-term-d') ||
      (className === '3ème' && s.classeId === 'cls-sec-c') ||
      (className === 'Maternelle' && s.classeId === 'cls-mat-gs')
    );
    const classCA = classStudents.flatMap(s => s.paiements || []).reduce((sum, p) => p.statut === 'paid' ? sum + p.montant : sum, 0);
    return classCA;
  };

  // --- Daily cash reconciliation (7 last days) ---
  const getDailyReconciliation = () => {
    const days = [];
    const today = new Date();
    
    // We generate last 7 days starting from 2026-06-03 (the current date in context)
    const currentBaseDate = new Date('2026-06-03');

    for (let i = 6; i >= 0; i--) {
      const d = new Date(currentBaseDate);
      d.setDate(currentBaseDate.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      // Sum actual payments received on this date
      const cashReceived = students.flatMap(s => s.paiements || [])
        .filter(p => p.date === dateStr && p.statut === 'paid')
        .reduce((sum, p) => sum + p.montant, 0);

      // Recognized daily Revenue (equal distribution of monthly scolarité: total monthly scol / 25 working days)
      const dailyCAConstated = activeStaff.length > 0 ? Math.round(totalCA2026 / 180) : 60000; // average scolarité amortization

      days.push({
        date: dateStr,
        caConstated: dailyCAConstated,
        cashReceived: cashReceived,
        gap: cashReceived - dailyCAConstated
      });
    }
    return days;
  };

  const dailyData = getDailyReconciliation();

  // --- Budget Variance ---
  const getBudgetVariance = () => {
    return budgetLines.map(item => {
      let realized = 0;
      const lowerPoste = item.poste.toLowerCase();
      if (item.categorie === 'Revenu') {
        if (lowerPoste.includes('scolarité') || lowerPoste.includes('inscription') || lowerPoste.includes('revenu')) {
          realized = totalCA2026;
        } else {
          realized = 150000; // divers
        }
      } else {
        if (lowerPoste.includes('salariale') || lowerPoste.includes('salaire')) {
          realized = masseSalarialeAnnuelle2026;
        } else if (lowerPoste.includes('formation') || lowerPoste.includes('stage')) {
          realized = totalTrainingCosts2026;
        } else if (lowerPoste.includes('fourniture') || lowerPoste.includes('entretien')) {
          realized = totalChargesComptables2026 * 0.4;
        } else if (lowerPoste.includes('loyer') || lowerPoste.includes('locat')) {
          realized = totalChargesComptables2026 * 0.3;
        } else if (lowerPoste.includes('fluid') || lowerPoste.includes('eau') || lowerPoste.includes('élec') || lowerPoste.includes('internet')) {
          realized = totalChargesComptables2026 * 0.15;
        } else {
          realized = totalChargesComptables2026 * 0.15; // equipement/divers
        }
      }

      const diff = item.categorie === 'Revenu' ? realized - item.budgetPrevu : item.budgetPrevu - realized;
      const pctDiff = item.budgetPrevu > 0 ? (diff / item.budgetPrevu) * 100 : 0;

      return {
        ...item,
        realise: realized,
        diff: realized - item.budgetPrevu,
        pct: pctDiff,
        isFavorable: diff >= 0
      };
    });
  };

  const budgetVariances = getBudgetVariance();

  // --- Accounting Ledger functions ---
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const ts = Date.now();
    const ref = expReference || `OP-${ts.toString().slice(-6)}`;
    const newEcrituresList: EcritureComptable[] = [];

    if (expTypeSaisie === 'immediat' || expTypeSaisie === 'credit') {
      const amountTTC = Number(expAmount);
      if (!amountTTC || amountTTC <= 0) return;

      let ht = amountTTC;
      let tva = 0;
      if (expTva) {
        ht = Math.round(amountTTC / 1.1925);
        tva = amountTTC - ht;
      }

      const lines = [
        { compteNumero: expCompteDebit, debit: ht, credit: 0 }
      ];
      if (expTva) lines.push({ compteNumero: '445', debit: tva, credit: 0 });
      lines.push({ compteNumero: expCompteTiers, debit: 0, credit: amountTTC });

      newEcrituresList.push({
        id: `ecr-cst-${ts}`,
        date: expDate,
        libelle: `Constatation : ${expLibelle}`,
        reference: ref,
        lignes: lines
      });
    }

    let toPay = 0;
    if (expTypeSaisie === 'immediat') toPay = Number(expAmount);
    else if (expTypeSaisie === 'credit' || expTypeSaisie === 'reglement') toPay = Number(expAmountPaye);

    if (toPay > 0) {
      newEcrituresList.push({
        id: `ecr-reg-${ts}`,
        date: expDate,
        libelle: `Règlement : ${expLibelle}`,
        reference: `PAY-${ref}`,
        lignes: [
          { compteNumero: expCompteTiers, debit: toPay, credit: 0 },
          { compteNumero: expCompteCredit, debit: 0, credit: toPay }
        ]
      });
    }

    if (newEcrituresList.length === 0) return;

    const stored = localStorage.getItem('mboaschool_ecritures');
    const existing = stored ? JSON.parse(stored) : mockEcrituresInitiales;
    const updated = [...newEcrituresList, ...existing];
    localStorage.setItem('mboaschool_ecritures', JSON.stringify(updated));
    
    setEcritures([...ecritures, ...newEcrituresList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setShowExpenseModal(false);
    setExpLibelle('');
    setExpReference('');
    setExpAmount('');
    setExpAmountPaye('');
    setExpTva(false);
    triggerToast("Opération comptable enregistrée !");
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccNum || !newAccLibelle) return;
    const newAcc: CompteOHADA = {
      numero: newAccNum,
      libelle: newAccLibelle,
      classe: Number(newAccClasse) as any
    };
    const updated = [...planComptable, newAcc].sort((a,b) => a.numero.localeCompare(b.numero));
    setPlanComptable(updated);
    localStorage.setItem('mboaschool_plancomptable', JSON.stringify(updated));
    setShowAddAccountModal(false);
    setNewAccNum('');
    setNewAccLibelle('');
    triggerToast("Compte comptable créé !");
  };

  const handleAddBudgetLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudgetPoste || !newBudgetPrevu) return;
    const newLine: BudgetPrevisionnel = {
      poste: newBudgetPoste,
      categorie: newBudgetCategorie,
      budgetPrevu: Number(newBudgetPrevu) || 0
    };
    const updated = [...budgetLines, newLine];
    setBudgetLines(updated);
    localStorage.setItem('mboaschool_budget_lines', JSON.stringify(updated));
    setShowAddBudgetModal(false);
    setNewBudgetPoste('');
    setNewBudgetPrevu('');
    triggerToast("Ligne budgétaire ajoutée !");
  };

  const handleEditBudgetLine = (index: number) => {
    const line = budgetLines[index];
    if (!line) return;
    setEditingBudgetIndex(index);
    setEditBudgetPoste(line.poste);
    setEditBudgetCategorie(line.categorie);
    setEditBudgetPrevu(String(line.budgetPrevu));
  };

  const handleSaveBudgetLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBudgetIndex === null || !editBudgetPoste || !editBudgetPrevu) return;
    const updated = [...budgetLines];
    updated[editingBudgetIndex] = {
      poste: editBudgetPoste,
      categorie: editBudgetCategorie,
      budgetPrevu: Number(editBudgetPrevu) || 0
    };
    setBudgetLines(updated);
    localStorage.setItem('mboaschool_budget_lines', JSON.stringify(updated));
    setEditingBudgetIndex(null);
    triggerToast("Ligne budgétaire modifiée !");
  };

  const handleDeleteBudgetLine = (index: number) => {
    if (confirm('Voulez-vous vraiment supprimer cette ligne budgétaire ?')) {
      const updated = budgetLines.filter((_, idx) => idx !== index);
      setBudgetLines(updated);
      localStorage.setItem('mboaschool_budget_lines', JSON.stringify(updated));
      triggerToast("Ligne budgétaire supprimée !");
    }
  };

  // Accounting balance
  const accountBalances: Record<string, { debit: number, credit: number, solde: number }> = {};
  planComptable.forEach(c => {
    accountBalances[c.numero] = { debit: 0, credit: 0, solde: 0 };
  });

  ecritures.forEach(ecr => {
    ecr.lignes.forEach(ligne => {
      if (!accountBalances[ligne.compteNumero]) {
        accountBalances[ligne.compteNumero] = { debit: 0, credit: 0, solde: 0 };
      }
      accountBalances[ligne.compteNumero].debit += ligne.debit;
      accountBalances[ligne.compteNumero].credit += ligne.credit;
    });
  });

  Object.keys(accountBalances).forEach(num => {
    const b = accountBalances[num];
    b.solde = b.debit - b.credit;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl z-50 flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white">✓</div>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 text-black">Direction Financière</h1>
          <p className="text-sm text-slate-500 mt-1">Balanced Scorecard (BSC), rentabilité par segment, ratios financiers, budget & trésorerie</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddAccountModal(true)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors"
          >
            + Créer Compte
          </button>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-md transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8"/><line x1="12" y1="6" x2="12" y2="18"/></svg>
            Saisir opération
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white p-2 rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
        {[
          { id: 'bsc', label: 'Balanced Scorecard (BSC)' },
          { id: 'productivity', label: 'Productivité par Segment' },
          { id: 'ratios', label: 'Compte de Résultat & Ratios' },
          { id: 'cash', label: 'CA vs Trésorerie' },
          { id: 'budget', label: 'Écart Budgétaire' },
          { id: 'accounting', label: 'Journal & Balance' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
              activeTab === tab.id ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* -------------------- TAB: BALANCED SCORECARD -------------------- */}
      {activeTab === 'bsc' && (
        <div className="space-y-6">
          {/* Configuration of BSC Years */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
            <div>
              <h4 className="font-bold text-slate-800 text-black text-sm">Périodes d'Analyse Balanced Scorecard</h4>
              <p className="text-xs text-slate-500 font-medium">Modifiez les dates des indicateurs du BSC pour réaligner les colonnes</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-semibold">Année 1:</span>
                <input
                  type="number"
                  value={bscYears.year1}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 2024;
                    const updated = { ...bscYears, year1: val };
                    setBscYears(updated);
                    localStorage.setItem('mboaschool_bsc_years', JSON.stringify(updated));
                  }}
                  className="w-20 px-2 py-1 border border-slate-200 rounded text-xs text-black font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-semibold">Année 2:</span>
                <input
                  type="number"
                  value={bscYears.year2}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 2025;
                    const updated = { ...bscYears, year2: val };
                    setBscYears(updated);
                    localStorage.setItem('mboaschool_bsc_years', JSON.stringify(updated));
                  }}
                  className="w-20 px-2 py-1 border border-slate-200 rounded text-xs text-black font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-semibold">Année 3:</span>
                <input
                  type="number"
                  value={bscYears.year3}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 2026;
                    const updated = { ...bscYears, year3: val };
                    setBscYears(updated);
                    localStorage.setItem('mboaschool_bsc_years', JSON.stringify(updated));
                  }}
                  className="w-20 px-2 py-1 border border-slate-200 rounded text-xs text-black font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Perspective: Finances */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-800 text-black border-b border-slate-100 pb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-600 block"></span>
                Perspective Financière
              </h3>
              <table className="w-full text-left text-xs text-black">
                <thead>
                  <tr className="text-slate-400 font-bold border-b border-slate-100">
                    <th className="pb-2">Indicateur (KPI)</th>
                    <th className="pb-2 text-right">{bscYears.year1}</th>
                    <th className="pb-2 text-right">{bscYears.year2}</th>
                    <th className="pb-2 text-right">{bscYears.year3}</th>
                    <th className="pb-2 text-center">Tendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  <tr>
                    <td className="py-3 font-semibold">Chiffre d'Affaires</td>
                    <td className="text-right text-slate-500">{formatMoney(hist2024.chiffreAffaires)}</td>
                    <td className="text-right text-slate-500">{formatMoney(hist2025.chiffreAffaires)}</td>
                    <td className="text-right font-bold text-indigo-600">{formatMoney(totalCA2026)}</td>
                    <td className="text-center">{getTrendIndicator(totalCA2026, hist2025.chiffreAffaires)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-semibold">Bénéfice Net</td>
                    <td className="text-right text-slate-500">{formatMoney(hist2024.beneficeNet)}</td>
                    <td className="text-right text-slate-500">{formatMoney(hist2025.beneficeNet)}</td>
                    <td className="text-right font-bold text-indigo-600">{formatMoney(netProfit2026)}</td>
                    <td className="text-center">{getTrendIndicator(netProfit2026, hist2025.beneficeNet)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-semibold">Masse Salariale / mois</td>
                    <td className="text-right text-slate-500">{formatMoney(hist2024.masseSalarialeMensuelle)}</td>
                    <td className="text-right text-slate-500">{formatMoney(hist2025.masseSalarialeMensuelle)}</td>
                    <td className="text-right font-bold text-indigo-600">{formatMoney(masseSalarialeMensuelle2026)}</td>
                    <td className="text-center">{getTrendIndicator(masseSalarialeMensuelle2026, hist2025.masseSalarialeMensuelle, false)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Perspective: Clients */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-800 text-black border-b border-slate-100 pb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 block"></span>
                Perspective Clientèle (Parents & Élèves)
              </h3>
              <table className="w-full text-left text-xs text-black">
                <thead>
                  <tr className="text-slate-400 font-bold border-b border-slate-100">
                    <th className="pb-2">Indicateur (KPI)</th>
                    <th className="pb-2 text-right">{bscYears.year1}</th>
                    <th className="pb-2 text-right">{bscYears.year2}</th>
                    <th className="pb-2 text-right">{bscYears.year3}</th>
                    <th className="pb-2 text-center">Tendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  <tr>
                    <td className="py-3 font-semibold">Effectif Élèves</td>
                    <td className="text-right text-slate-500">{hist2024.nombreEleves}</td>
                    <td className="text-right text-slate-500">{hist2025.nombreEleves}</td>
                    <td className="text-right font-bold text-emerald-600">{totalStudents2026}</td>
                    <td className="text-center">{getTrendIndicator(totalStudents2026, hist2025.nombreEleves)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-semibold">Recouvrement Scolarités</td>
                    <td className="text-right text-slate-500">{hist2024.tauxRecouvrement}%</td>
                    <td className="text-right text-slate-500">{hist2025.tauxRecouvrement}%</td>
                    <td className="text-right font-bold text-emerald-600">{totalRecoveryRate2026.toFixed(1)}%</td>
                    <td className="text-center">{getTrendIndicator(totalRecoveryRate2026, hist2025.tauxRecouvrement)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-semibold">Satisfaction Parents</td>
                    <td className="text-right text-slate-500">{hist2024.satisfactionParents}%</td>
                    <td className="text-right text-slate-500">{hist2025.satisfactionParents}%</td>
                    <td className="text-right font-bold text-emerald-600">92%</td>
                    <td className="text-center">{getTrendIndicator(92, hist2025.satisfactionParents)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Perspective: Processus */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-800 text-black border-b border-slate-100 pb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 block"></span>
                Perspective Processus Internes
              </h3>
              <table className="w-full text-left text-xs text-black">
                <thead>
                  <tr className="text-slate-400 font-bold border-b border-slate-100">
                    <th className="pb-2">Indicateur (KPI)</th>
                    <th className="pb-2 text-right">{bscYears.year1}</th>
                    <th className="pb-2 text-right">{bscYears.year2}</th>
                    <th className="pb-2 text-right">{bscYears.year3}</th>
                    <th className="pb-2 text-center">Tendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  <tr>
                    <td className="py-3 font-semibold">Moyenne Générale</td>
                    <td className="text-right text-slate-500">{hist2024.moyenneGenerale.toFixed(1)}/20</td>
                    <td className="text-right text-slate-500">{hist2025.moyenneGenerale.toFixed(1)}/20</td>
                    <td className="text-right font-bold text-amber-600">{avgMoyenneGenerale2026.toFixed(2)}/20</td>
                    <td className="text-center">{getTrendIndicator(avgMoyenneGenerale2026, hist2025.moyenneGenerale)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-semibold">Jours Absences Staff</td>
                    <td className="text-right text-slate-500">{hist2024.totalAbsences} j</td>
                    <td className="text-right text-slate-500">{hist2025.totalAbsences} j</td>
                    <td className="text-right font-bold text-amber-600">{totalAbsences2026} j</td>
                    <td className="text-center">{getTrendIndicator(totalAbsences2026, hist2025.totalAbsences, false)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-semibold">Classe Moyenne (élèves)</td>
                    <td className="text-right text-slate-500">{hist2024.tailleMoyenneClasse}</td>
                    <td className="text-right text-slate-500">{hist2025.tailleMoyenneClasse}</td>
                    <td className="text-right font-bold text-amber-600">{avgClassSize2026}</td>
                    <td className="text-center">{getTrendIndicator(avgClassSize2026, hist2025.tailleMoyenneClasse, false)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Perspective: Apprendre */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-800 text-black border-b border-slate-100 pb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-violet-500 block"></span>
                Perspective Apprentissage & Croissance
              </h3>
              <table className="w-full text-left text-xs text-black">
                <thead>
                  <tr className="text-slate-400 font-bold border-b border-slate-100">
                    <th className="pb-2">Indicateur (KPI)</th>
                    <th className="pb-2 text-right">{bscYears.year1}</th>
                    <th className="pb-2 text-right">{bscYears.year2}</th>
                    <th className="pb-2 text-right">{bscYears.year3}</th>
                    <th className="pb-2 text-center">Tendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  <tr>
                    <td className="py-3 font-semibold">Investissement Formations</td>
                    <td className="text-right text-slate-500">{hist2024.ratioFormation}%</td>
                    <td className="text-right text-slate-500">{hist2025.ratioFormation}%</td>
                    <td className="text-right font-bold text-violet-600">{trainingPayrollRatio2026.toFixed(2)}%</td>
                    <td className="text-center">{getTrendIndicator(trainingPayrollRatio2026, hist2025.ratioFormation)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-semibold">Adhérence Job Role Staff</td>
                    <td className="text-right text-slate-500">{hist2024.adherenceJobRole}%</td>
                    <td className="text-right text-slate-500">{hist2025.adherenceJobRole}%</td>
                    <td className="text-right font-bold text-violet-600">{avgTeacherJobRoleAdherence2026}%</td>
                    <td className="text-center">{getTrendIndicator(avgTeacherJobRoleAdherence2026, hist2025.adherenceJobRole)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-semibold">Note d'évaluation stages</td>
                    <td className="text-right text-slate-500">{hist2024.noteMoyenneFormation.toFixed(1)}/20</td>
                    <td className="text-right text-slate-500">{hist2025.noteMoyenneFormation.toFixed(1)}/20</td>
                    <td className="text-right font-bold text-violet-600">{avgTeacherTrainingScore2026.toFixed(1)}/20</td>
                    <td className="text-center">{getTrendIndicator(avgTeacherTrainingScore2026, hist2025.noteMoyenneFormation)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* -------------------- TAB: PRODUCTIVITE PAR SEGMENT -------------------- */}
      {activeTab === 'productivity' && (
        <div className="space-y-6">
          {/* Global & Section Productivity Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Rendement Global CA / Employé</span>
              <h2 className="text-2xl font-black text-indigo-600">{formatMoney(globalProductivity)}</h2>
              <span className="text-xs text-slate-400 font-semibold block mt-1.5">Calculé sur {activeEmployeeCount} actifs</span>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-emerald-500">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">CA / Employé Section Francophone (F)</span>
              <h2 className="text-2xl font-black text-slate-800 text-black">{formatMoney(getSectionProductivity('sec-fr'))}</h2>
              <span className="text-xs text-slate-400 font-semibold block mt-1.5">4 salariés dédiés</span>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-amber-500">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">CA / Employé Section Anglophone (A)</span>
              <h2 className="text-2xl font-black text-slate-800 text-black">{formatMoney(getSectionProductivity('sec-en'))}</h2>
              <span className="text-xs text-slate-400 font-semibold block mt-1.5">2 salariés dédiés</span>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-violet-500">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">CA / Employé Section Bilingue & Communs (B)</span>
              <h2 className="text-2xl font-black text-slate-800 text-black">{formatMoney(getSectionProductivity('sec-bi'))}</h2>
              <span className="text-xs text-slate-400 font-semibold block mt-1.5">6 salariés dédiés / communs</span>
            </div>
          </div>

          {/* Class productivity table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 text-black mb-4">Productivité du Chiffre d'Affaires par Classe</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase bg-slate-50/20">
                    <th className="px-6 py-4">Classe</th>
                    <th className="px-6 py-4">Enseignant Principal</th>
                    <th className="px-6 py-4 text-right">CA Collecté de la classe</th>
                    <th className="px-6 py-4 text-right">Ratio CA / Classe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-black">
                  {/* Terminale D */}
                  <tr>
                    <td className="px-6 py-4 font-semibold">Terminale D</td>
                    <td className="px-6 py-4 text-slate-500">Dieudonné Atangana</td>
                    <td className="px-6 py-4 text-right font-mono font-bold">{formatMoney(getClassProductivity('Terminale D'))}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-indigo-600">{((getClassProductivity('Terminale D')/totalCA2026)*100).toFixed(1)}% du CA total</td>
                  </tr>
                  {/* 3ème */}
                  <tr>
                    <td className="px-6 py-4 font-semibold">3ème Espagnol</td>
                    <td className="px-6 py-4 text-slate-500">Marthe Ngo</td>
                    <td className="px-6 py-4 text-right font-mono font-bold">{formatMoney(getClassProductivity('3ème'))}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-indigo-600">{((getClassProductivity('3ème')/totalCA2026)*100).toFixed(1)}% du CA total</td>
                  </tr>
                  {/* Maternelle */}
                  <tr>
                    <td className="px-6 py-4 font-semibold">Maternelle Grande Section</td>
                    <td className="px-6 py-4 text-slate-500">Chantal Bella</td>
                    <td className="px-6 py-4 text-right font-mono font-bold">{formatMoney(getClassProductivity('Maternelle'))}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-indigo-600">{((getClassProductivity('Maternelle')/totalCA2026)*100).toFixed(1)}% du CA total</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB: COMPTE DE RESULTAT & RATIOS -------------------- */}
      {activeTab === 'ratios' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Income statement simplified */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
              <h3 className="font-bold text-slate-800 text-black border-b border-slate-100 pb-3">Compte de Résultat Simplifié (Annuel)</h3>
              
              <div className="space-y-3 text-sm text-black">
                <div className="flex justify-between font-semibold border-b border-slate-50 pb-2">
                  <span>Revenus (Chiffre d'Affaires constaté)</span>
                  <span className="font-mono font-bold text-emerald-600">{formatMoney(totalCA2026)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2 pl-4 text-xs text-slate-500">
                  <span>Masse Salariale annuelle brute</span>
                  <span className="font-mono font-semibold">- {formatMoney(masseSalarialeAnnuelle2026)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2 pl-4 text-xs text-slate-500">
                  <span>Charges de fonctionnement opérationnelles</span>
                  <span className="font-mono font-semibold">- {formatMoney(totalChargesComptables2026)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2 pl-4 text-xs text-slate-500">
                  <span>Frais de formation du personnel</span>
                  <span className="font-mono font-semibold">- {formatMoney(totalTrainingCosts2026)}</span>
                </div>
                <div className="flex justify-between font-bold border-b-2 border-slate-200 py-3 text-base">
                  <span>Bénéfice Net</span>
                  <span className={`font-mono ${netProfit2026 >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatMoney(netProfit2026)}
                  </span>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Intérêts financiers (emprunts bancaires)</span>
                    <span className="font-mono font-bold">{formatMoney(simulatedInterestExpense)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Dettes globales d'exploitation & bancaires</span>
                    <span className="font-mono font-bold">{formatMoney(simulatedDebts)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Fonds Propres (Capital social)</span>
                    <span className="font-mono font-bold">{formatMoney(simulatedEquity)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Ratios */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
              <h3 className="font-bold text-slate-800 text-black border-b border-slate-100 pb-3">Ratios Financiers Clés</h3>
              
              <div className="space-y-4">
                {/* Margin */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-500">Rendement Ventes (Marge nette)</span>
                    <span className="text-indigo-600 font-extrabold">{ratioMargin.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, ratioMargin))}%` }}></div>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Capacité à transformer le CA en bénéfice</span>
                </div>

                {/* ROA / RCI */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-500">RCI (Rentabilité Capitaux Investis)</span>
                    <span className="text-emerald-500 font-extrabold">{ratioROA.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, ratioROA))}%` }}></div>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Performance des fonds propres engagés</span>
                </div>

                {/* Asset turnover */}
                <div className="flex justify-between items-center text-xs font-bold p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Rotation des Actifs</span>
                  <span className="text-slate-800 font-extrabold text-sm">{ratioAssetTurnover.toFixed(2)} x</span>
                </div>

                {/* Leverage */}
                <div className="flex justify-between items-center text-xs font-bold p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Levier Financier</span>
                  <span className="text-slate-800 font-extrabold text-sm">{ratioLeverage.toFixed(2)} x</span>
                </div>

                {/* Debt ratio */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-500">Ratio d'Endettement</span>
                    <span className="text-rose-500 font-extrabold">{ratioDebt.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, ratioDebt))}%` }}></div>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Part des dettes dans le total bilan (seuil max : 50%)</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* -------------------- TAB: RAPPROCHEMENT & TRESORERIE -------------------- */}
      {activeTab === 'cash' && (
        <div className="space-y-6">
          {/* Summary reconciliation metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Facturation Globale (CA Constaté)</span>
              <h2 className="text-2xl font-black text-indigo-600">{formatMoney(totalCA2026)}</h2>
              <span className="text-xs text-slate-400 font-semibold block mt-1.5">Enregistré en engagement</span>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Trésorerie Perçue (Encaissements)</span>
              <h2 className="text-2xl font-black text-emerald-500">{formatMoney(totalCA2026)}</h2>
              <span className="text-xs text-slate-400 font-semibold block mt-1.5">100% encaissé</span>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Écart de Rapprochement</span>
              <h2 className="text-2xl font-black text-slate-800 text-black">0 FCFA</h2>
              <span className="text-xs text-emerald-500 font-bold block mt-1.5">✓ Livres parfaitement équilibrés</span>
            </div>
          </div>

          {/* Daily logs (7 last days) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-black">Rapprochement CA vs Trésorerie Journalier</h3>
                <p className="text-xs text-slate-500">Comparaison quotidienne entre amortissement scolarité (CA) et encaissements réels</p>
              </div>
              <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">Encaissements en direct</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase bg-slate-50/20">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">CA Constaté (Théorique)</th>
                    <th className="px-4 py-3 text-right">Trésorerie Encaissements (Réel)</th>
                    <th className="px-4 py-3 text-right">Écart quotidien</th>
                    <th className="px-4 py-3 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-black font-medium">
                  {dailyData.map((d, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/30">
                      <td className="px-4 py-3 font-mono text-xs">{new Date(d.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatMoney(d.caConstated)}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600">+{formatMoney(d.cashReceived)}</td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${d.gap >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {d.gap > 0 ? '+' : ''}{formatMoney(d.gap)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.gap >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {d.gap >= 0 ? 'Surplus' : 'Manque'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB: BUDGET VARIANCE -------------------- */}
      {activeTab === 'budget' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h3 className="font-bold text-slate-800 text-black">Analyse des Écarts Budgétaires</h3>
              <p className="text-xs text-slate-500">Comparaison entre prévisions budgétaires et dépenses/revenus réels</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddBudgetModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors"
              >
                + Ajouter une ligne
              </button>
              <button
                onClick={() => setShowBudgetReportModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors"
              >
                📊 Rapport d'écart
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase bg-slate-50/20">
                  <th className="px-4 py-3">Poste Budgétaire</th>
                  <th className="px-4 py-3">Catégorie</th>
                  <th className="px-4 py-3 text-right">Budget Prévu</th>
                  <th className="px-4 py-3 text-right">Réalisé Réel</th>
                  <th className="px-4 py-3 text-right">Écart (FCFA)</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-black font-medium">
                {budgetVariances.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/30">
                    <td className="px-4 py-3 font-semibold">
                      {editingBudgetIndex === idx ? (
                        <input
                          type="text"
                          value={editBudgetPoste}
                          onChange={(e) => setEditBudgetPoste(e.target.value)}
                          className="px-2 py-1 border border-indigo-200 rounded text-sm text-black w-full focus:outline-none"
                          required
                        />
                      ) : (
                        item.poste
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingBudgetIndex === idx ? (
                        <select
                          value={editBudgetCategorie}
                          onChange={(e) => setEditBudgetCategorie(e.target.value as any)}
                          className="px-2 py-1 border border-indigo-200 rounded text-sm text-black bg-white focus:outline-none"
                        >
                          <option value="Revenu">Revenu</option>
                          <option value="Charge">Charge</option>
                        </select>
                      ) : (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.categorie === 'Revenu' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {item.categorie}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {editingBudgetIndex === idx ? (
                        <input
                          type="number"
                          value={editBudgetPrevu}
                          onChange={(e) => setEditBudgetPrevu(e.target.value)}
                          className="px-2 py-1 border border-indigo-200 rounded text-sm text-black w-28 text-right font-mono focus:outline-none"
                          required
                          min="0"
                        />
                      ) : (
                        formatMoney(item.budgetPrevu)
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatMoney(item.realise)}</td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${item.isFavorable ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {item.diff > 0 ? '+' : ''}{formatMoney(item.diff)} ({item.pct.toFixed(1)}%)
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.isFavorable ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {item.isFavorable ? 'Favorable' : 'Défavorable'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {editingBudgetIndex === idx ? (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={handleSaveBudgetLine}
                            className="text-emerald-600 hover:text-emerald-700 font-bold text-xs"
                          >
                            Sauver
                          </button>
                          <button
                            onClick={() => setEditingBudgetIndex(null)}
                            className="text-slate-400 hover:text-slate-600 text-xs"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleEditBudgetLine(idx)}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDeleteBudgetLine(idx)}
                            className="text-rose-600 hover:text-rose-800 text-xs font-semibold"
                          >
                            Supprimer
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------- TAB: JOURNAL & BALANCE (OLD ACCOUNTING VIEW) -------------------- */}
      {activeTab === 'accounting' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={() => setAccountingSubTab('journal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  accountingSubTab === 'journal' ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Journal Comptable
              </button>
              <button
                onClick={() => setAccountingSubTab('balance')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  accountingSubTab === 'balance' ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Balance des Comptes
              </button>
            </div>
            <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">
              {ecritures.length} écritures OHADA
            </span>
          </div>

          {/* Subtab content: Journal */}
          {accountingSubTab === 'journal' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse text-black">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-black uppercase bg-slate-50/20">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Référence</th>
                    <th className="px-4 py-3">Compte</th>
                    <th className="px-4 py-3">Libellé</th>
                    <th className="px-4 py-3 text-right">Débit</th>
                    <th className="px-4 py-3 text-right">Crédit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ecritures.map(ecr => (
                    <React.Fragment key={ecr.id}>
                      {ecr.lignes.map((ligne, idx) => {
                        const compteDef = planComptable.find(c => c.numero === ligne.compteNumero);
                        return (
                          <tr key={`${ecr.id}-${idx}`} className="hover:bg-slate-50/50">
                            {idx === 0 && (
                              <>
                                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap align-top text-black font-semibold" rowSpan={ecr.lignes.length}>{new Date(ecr.date).toLocaleDateString('fr-FR')}</td>
                                <td className="px-4 py-3 font-mono text-xs text-black font-semibold align-top" rowSpan={ecr.lignes.length}>{ecr.reference}</td>
                              </>
                            )}
                            <td className="px-4 py-3 font-bold text-indigo-600">{ligne.compteNumero}</td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-black">{ecr.libelle}</div>
                              <div className="text-xs text-black">{compteDef?.libelle || 'Compte inconnu'}</div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-black font-bold">{ligne.debit > 0 ? formatMoney(ligne.debit) : ''}</td>
                            <td className="px-4 py-3 text-right font-mono text-black font-bold">{ligne.credit > 0 ? formatMoney(ligne.credit) : ''}</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Subtab content: Balance */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse text-black">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-black uppercase bg-slate-50/20">
                    <th className="px-4 py-3 w-24">Compte</th>
                    <th className="px-4 py-3">Intitulé</th>
                    <th className="px-4 py-3 text-right">Mouvement Débit</th>
                    <th className="px-4 py-3 text-right">Mouvement Crédit</th>
                    <th className="px-4 py-3 text-right">Solde Débiteur</th>
                    <th className="px-4 py-3 text-right">Solde Créditeur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {planComptable.filter(c => accountBalances[c.numero]?.debit > 0 || accountBalances[c.numero]?.credit > 0).map(compte => {
                    const b = accountBalances[compte.numero];
                    return (
                      <tr key={compte.numero} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-indigo-600">{compte.numero}</td>
                        <td className="px-4 py-3 font-bold text-black">{compte.libelle}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs font-bold text-black">{formatMoney(b.debit)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs font-bold text-black">{formatMoney(b.credit)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs font-bold text-black">{b.solde > 0 ? formatMoney(b.solde) : ''}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs font-bold text-black">{b.solde < 0 ? formatMoney(Math.abs(b.solde)) : ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* -------------------- MODAL: COMPTE COPTABLE -------------------- */}
      {showAddAccountModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-100 shadow-2xl p-6 relative">
            <button onClick={() => setShowAddAccountModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 font-bold">✕</button>
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Créer un Compte Plan OHADA</h3>
            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Numéro de Compte</label>
                <input type="text" placeholder="Ex: 602" value={newAccNum} onChange={(e) => setNewAccNum(e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Libellé</label>
                <input type="text" placeholder="Ex: Fourniture papeterie" value={newAccLibelle} onChange={(e) => setNewAccLibelle(e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Classe OHADA</label>
                <select value={newAccClasse} onChange={(e) => setNewAccClasse(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-semibold">
                  <option value="2">Classe 2 - Immobilisations</option>
                  <option value="4">Classe 4 - Tiers</option>
                  <option value="5">Classe 5 - Trésorerie</option>
                  <option value="6">Classe 6 - Charges</option>
                  <option value="7">Classe 7 - Produits</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddAccountModal(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold">Annuler</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: SAISIE ECRITURE -------------------- */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-100 shadow-2xl p-6 relative">
            <button onClick={() => setShowExpenseModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 font-bold">✕</button>
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Saisir une Opération financière</h3>
            <form onSubmit={handleSaveExpense} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Type d'opération</label>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button type="button" onClick={() => setExpTypeSaisie('immediat')} className={`flex-1 text-xs py-2 px-2 rounded-md font-bold transition-colors ${expTypeSaisie === 'immediat' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>Paiement Immédiat</button>
                  <button type="button" onClick={() => setExpTypeSaisie('credit')} className={`flex-1 text-xs py-2 px-2 rounded-md font-bold transition-colors ${expTypeSaisie === 'credit' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>Facture à Crédit</button>
                  <button type="button" onClick={() => setExpTypeSaisie('reglement')} className={`flex-1 text-xs py-2 px-2 rounded-md font-bold transition-colors ${expTypeSaisie === 'reglement' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>Règlement Tiers</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Date</label>
                  <input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Référence Pièce</label>
                  <input type="text" placeholder="Ex: CHQ-882" value={expReference} onChange={(e) => setExpReference(e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-mono" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Libellé</label>
                <input type="text" placeholder="Ex: Facture électricité mensuelle" value={expLibelle} onChange={(e) => setExpLibelle(e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {(expTypeSaisie === 'immediat' || expTypeSaisie === 'credit') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Compte Débit (Charge)</label>
                    <select value={expCompteDebit} onChange={(e) => setExpCompteDebit(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-semibold">
                      {planComptable.filter(c => c.classe === 6 || c.classe === 2 || c.classe === 4).map(c => (
                        <option key={c.numero} value={c.numero}>{c.numero} - {c.libelle}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className={expTypeSaisie === 'reglement' ? 'col-span-2' : ''}>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Compte Tiers</label>
                  <select value={expCompteTiers} onChange={(e) => setExpCompteTiers(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-semibold">
                    {planComptable.filter(c => c.classe === 4).map(c => (
                      <option key={c.numero} value={c.numero}>{c.numero} - {c.libelle}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(expTypeSaisie === 'immediat' || expTypeSaisie === 'credit') && (
                <div className="grid grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Montant Facture TTC</label>
                    <input type="number" min="1" placeholder="Ex: 120000" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-mono" />
                  </div>
                  <div className="pb-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700 select-none">
                      <input type="checkbox" checked={expTva} onChange={(e) => setExpTva(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                      Soumis à TVA (19.25%)
                    </label>
                  </div>
                </div>
              )}

              {(expTypeSaisie === 'credit' || expTypeSaisie === 'reglement') && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Montant Payé</label>
                  <input type="number" min="0" placeholder="Ex: 50000" value={expAmountPaye} onChange={(e) => setExpAmountPaye(e.target.value)} required={expTypeSaisie === 'reglement'} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-mono" />
                </div>
              )}

              {(expTypeSaisie === 'immediat' || (expTypeSaisie === 'credit' && Number(expAmountPaye) > 0) || expTypeSaisie === 'reglement') && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Compte Crédit (Trésorerie)</label>
                  <select value={expCompteCredit} onChange={(e) => setExpCompteCredit(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-semibold bg-indigo-50">
                    {planComptable.filter(c => c.classe === 5).map(c => (
                      <option key={c.numero} value={c.numero}>{c.numero} - {c.libelle}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold">Annuler</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md">Valider</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* -------------------- MODAL: AJOUTER LIGNE BUDGETAIRE -------------------- */}
      {showAddBudgetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-100 shadow-2xl p-6 relative">
            <button onClick={() => setShowAddBudgetModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 font-bold">✕</button>
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 text-black">Ajouter un Poste Budgétaire</h3>
            <form onSubmit={handleAddBudgetLine} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Poste Budgétaire / Intitulé</label>
                <input
                  type="text"
                  placeholder="Ex: Achat fournitures de bureau"
                  value={newBudgetPoste}
                  onChange={(e) => setNewBudgetPoste(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Catégorie</label>
                <select
                  value={newBudgetCategorie}
                  onChange={(e) => setNewBudgetCategorie(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-semibold"
                >
                  <option value="Charge">Charge (Dépense)</option>
                  <option value="Revenu">Revenu (Recette)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Montant Budgétisé (FCFA)</label>
                <input
                  type="number"
                  placeholder="Ex: 1500000"
                  value={newBudgetPrevu}
                  onChange={(e) => setNewBudgetPrevu(e.target.value)}
                  required
                  min="0"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddBudgetModal(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold">Annuler</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: RAPPORT D'ANALYSE DES ECARTS -------------------- */}
      {showBudgetReportModal && (() => {
        const variances = getBudgetVariance();
        const totRevenuPrevu = variances.filter(v => v.categorie === 'Revenu').reduce((sum, v) => sum + v.budgetPrevu, 0);
        const totRevenuRealise = variances.filter(v => v.categorie === 'Revenu').reduce((sum, v) => sum + v.realise, 0);
        const diffRevenu = totRevenuRealise - totRevenuPrevu;

        const totChargePrevu = variances.filter(v => v.categorie === 'Charge').reduce((sum, v) => sum + v.budgetPrevu, 0);
        const totChargeRealise = variances.filter(v => v.categorie === 'Charge').reduce((sum, v) => sum + v.realise, 0);
        const diffCharge = totChargePrevu - totChargeRealise; // Positive if spent less than budgeted

        const profitPrevu = totRevenuPrevu - totChargePrevu;
        const profitRealise = totRevenuRealise - totChargeRealise;
        const diffProfit = profitRealise - profitPrevu;

        const favorableLines = variances.filter(v => v.isFavorable);
        const unfavorableLines = variances.filter(v => !v.isFavorable);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-2xl border border-slate-100 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowBudgetReportModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 font-bold">✕</button>
              
              <div className="border-b border-slate-100 pb-3 mb-6">
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider animate-pulse">Génération Automatique</span>
                <h3 className="text-xl font-bold text-slate-800 text-black mt-2">Rapport d'Analyse des Écarts Budgétaires</h3>
                <p className="text-xs text-slate-400">Date d'analyse : {new Date().toLocaleDateString('fr-FR')} • Année Académique Active : 2025/2026</p>
              </div>

              <div className="space-y-6 text-sm text-slate-700">
                {/* Executive Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Écart Recettes</span>
                    <span className={`text-lg font-black block mt-1 ${diffRevenu >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {diffRevenu > 0 ? '+' : ''}{formatMoney(diffRevenu)}
                    </span>
                    <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Budget réalisé à {totRevenuPrevu > 0 ? ((totRevenuRealise/totRevenuPrevu)*100).toFixed(0) : 0}%</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Écart Dépenses</span>
                    <span className={`text-lg font-black block mt-1 ${diffCharge >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {diffCharge >= 0 ? 'Sous-consommé' : 'Sur-consommé'}
                    </span>
                    <span className={`text-[9px] font-semibold block mt-0.5 ${diffCharge >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatMoney(Math.abs(totChargeRealise - totChargePrevu))}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Écart Résultat Net</span>
                    <span className={`text-lg font-black block mt-1 ${diffProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {diffProfit > 0 ? '+' : ''}{formatMoney(diffProfit)}
                    </span>
                    <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Performance globale</span>
                  </div>
                </div>

                {/* Analysis section */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 text-black text-base">Faits Marquants & Éléments Favorables</h4>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs">
                    {favorableLines.length > 0 ? (
                      favorableLines.map((line, idx) => (
                        <li key={idx}>
                          <span className="font-semibold text-slate-800 text-black">{line.poste}</span> : 
                          Écart positif de <span className="text-emerald-600 font-bold">+{formatMoney(Math.abs(line.diff))}</span>. Le réalisé ({formatMoney(line.realise)}) s'établit de manière favorable par rapport aux prévisions budgétaires ({formatMoney(line.budgetPrevu)}).
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-400 italic">Aucun écart favorable constaté sur cette période.</li>
                    )}
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 text-black text-base">Points de Vigilance (Écarts Défavorables)</h4>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs">
                    {unfavorableLines.length > 0 ? (
                      unfavorableLines.map((line, idx) => (
                        <li key={idx}>
                          <span className="font-semibold text-slate-800 text-black">{line.poste}</span> : 
                          Écart négatif de <span className="text-rose-600 font-bold">{formatMoney(line.diff)}</span>. Le réalisé ({formatMoney(line.realise)}) dépasse ou n'atteint pas l'objectif budgétaire initial ({formatMoney(line.budgetPrevu)}).
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-400 italic">Excellent! Aucun point de vigilance ou écart négatif constaté.</li>
                    )}
                  </ul>
                </div>

                {/* Strategic Advice */}
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-2">
                  <h4 className="font-bold text-indigo-900 text-sm flex items-center gap-1.5">
                    💡 Recommandations Stratégiques
                  </h4>
                  <p className="text-xs text-indigo-700 leading-relaxed">
                    {diffProfit >= 0 
                      ? "La situation financière globale est satisfaisante. Le résultat net est supérieur aux prévisions. Il est recommandé de maintenir la discipline sur les charges fixes d'exploitation et de flécher l'excédent vers l'investissement dans les infrastructures numériques scolaires."
                      : "Un écart négatif global est observé sur le résultat net. Il convient de revoir en priorité les postes ayant subi des surconsommations (vérifier les charges de fluides et loyers) et d'intensifier le recouvrement des tranches de scolarité restantes auprès des familles d'élèves pour rétablir la balance."
                    }
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowBudgetReportModal(false)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
