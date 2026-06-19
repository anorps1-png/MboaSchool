'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
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
import { createClient } from '@/lib/supabase/client';
import { useEtablissement } from '@/contexts/etablissement-context';


export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<'bsc' | 'productivity' | 'ratios' | 'cash' | 'budget' | 'accounting'>('bsc');
  
  // State for accounting transactions
  const [ecritures, setEcritures] = useState<EcritureComptable[]>([]);
  const [planComptable, setPlanComptable] = useState<CompteOHADA[]>([]);
  
  // State for other domains
  const [students, setStudents] = useState<Eleve[]>([]);
  const [personnel, setPersonnel] = useState<MembrePersonnel[]>([]);
  const [formations, setFormations] = useState<FormationRH[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

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
  const [expPartenaire, setExpPartenaire] = useState('');

  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccNum, setNewAccNum] = useState('');
  const [newAccLibelle, setNewAccLibelle] = useState('');
  const [newAccClasse, setNewAccClasse] = useState('6');

  // Subtab for accounting
  const [accountingSubTab, setAccountingSubTab] = useState<'journal' | 'balance' | 'bilan' | 'dsf'>('journal');
  const [userRole, setUserRole] = useState<string>('directeur');
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

  const { etablissementId } = useEtablissement();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedSession = localStorage.getItem('mboaschool_offline_session');
      if (storedSession) {
        try {
          const parsed = JSON.parse(storedSession);
          if (parsed.role) {
            setUserRole(parsed.role);
          }
        } catch (e) {
          console.error("Error parsing offline session:", e);
        }
      }
    }

    if (!etablissementId) return;
    const loadData = async () => {
      const supabase = createClient();
      
      // 1. Fetch Plan Comptable
      try {
        const { data: storedPlan, error } = await supabase
          .from('comptes_ohada')
          .select('*')
          .eq('etablissement_id', etablissementId)
          .order('numero', { ascending: true });
        
        let loadedPlan = planComptableOHADA;
        if (!error && storedPlan && storedPlan.length > 0) {
          loadedPlan = storedPlan;
        } else {
          const stored = localStorage.getItem('mboaschool_plancomptable');
          if (stored) {
            try {
              loadedPlan = JSON.parse(stored);
            } catch (e) {}
          }
        }
        
        // Merge missing accounts from planComptableOHADA dynamically
        const mergedPlan = [...loadedPlan];
        planComptableOHADA.forEach(mockAcc => {
          if (!mergedPlan.some(p => p.numero === mockAcc.numero)) {
            mergedPlan.push(mockAcc);
          }
        });
        
        const sortedPlan = mergedPlan.sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true }));
        setPlanComptable(sortedPlan);
      } catch (err) {
        const stored = localStorage.getItem('mboaschool_plancomptable');
        let loadedPlan = planComptableOHADA;
        if (stored) {
          try {
            loadedPlan = JSON.parse(stored);
          } catch (e) {}
        }
        const mergedPlan = [...loadedPlan];
        planComptableOHADA.forEach(mockAcc => {
          if (!mergedPlan.some(p => p.numero === mockAcc.numero)) {
            mergedPlan.push(mockAcc);
          }
        });
        const sortedPlan = mergedPlan.sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true }));
        setPlanComptable(sortedPlan);
      }

      // 1.5 Fetch Classes first so we have access to class prices!
      let loadedClasses: any[] = [];
      try {
        const { data: classesData, error: classesErr } = await supabase
          .from('classes')
          .select('*')
          .eq('etablissement_id', etablissementId);
        if (!classesErr && classesData) {
          loadedClasses = classesData;
          setClasses(classesData);
        }
      } catch (err) {
        console.error('Error fetching classes in loadData:', err);
      }

      // 2. Fetch Students & Payments from Supabase
      let loadedStudents: Eleve[] = [];
      let loadedPersonnel: MembrePersonnel[] = [];
      let loadedFormations: FormationRH[] = [];
      try {
        const { data: elevesData, error } = await supabase
          .from('eleves')
          .select('*, paiements(*)')
          .eq('etablissement_id', etablissementId);
        
        if (!error && elevesData) {
          // Map to domain format
          loadedStudents = elevesData.map((e: any) => ({
            id: e.id,
            matricule: e.matricule,
            nom: e.nom,
            prenom: e.prenom,
            sexe: e.sexe,
            dateNaissance: e.date_naissance,
            lieuNaissance: e.lieu_naissance,
            classeId: e.classe_id,
            anneeScolaireId: e.annee_scolaire_id,
            telephoneParent: e.telephone_parent,
            nomParent: e.nom_parent,
            emailParent: e.email_parent,
            dateInscription: e.date_inscription,
            statut: e.statut,
            paiements: (e.paiements || []).map((p: any) => ({
              id: p.id,
              eleveId: p.eleve_id,
              montant: Number(p.montant),
              date: p.date,
              modePaiement: p.mode_paiement,
              typeFrais: p.type_frais,
              statut: p.statut,
              reference: p.reference
            }))
          }));
          setStudents(loadedStudents);
        } else {
          setStudents([]);
        }
      } catch (err) {
        setStudents([]);
      }

      // 3. Fetch Personnel (membres_personnel)
      try {
        const { data: persData, error } = await supabase
          .from('membres_personnel')
          .select('*')
          .eq('etablissement_id', etablissementId);
        if (!error && persData && persData.length > 0) {
          const mapped = persData.map((p: any) => ({
            id: p.id,
            nom: p.nom,
            prenom: p.prenom,
            email: p.email,
            telephone: p.telephone,
            sexe: p.sexe,
            categorie: p.categorie,
            typeContrat: p.type_contrat,
            salaireDeBase: Number(p.salaire_de_base),
            dateEmbauche: p.date_embauche,
            statut: p.statut
          }));
          loadedPersonnel = mapped;
          setPersonnel(mapped);
        } else {
          setPersonnel([]);
        }
      } catch (err) {
        setPersonnel([]);
      }

      // 4. Formations
      try {
        const { data: formsData, error } = await supabase
          .from('formations_rh')
          .select('*')
          .eq('etablissement_id', etablissementId);
        if (!error && formsData && formsData.length > 0) {
          const mapped = formsData.map((f: any) => ({
            id: f.id,
            theme: f.theme,
            dateDebut: f.date_debut,
            dateFin: f.date_fin,
            coutTotal: Number(f.cout_total),
            organisme: f.organisme,
            statut: f.statut,
            beneficiairesIds: []
          }));
          loadedFormations = mapped;
          setFormations(mapped);
        } else {
          setFormations([]);
        }
      } catch (err) {
        setFormations([]);
      }

      // 5. Fetch General Ledger entries
      let customEcritures: EcritureComptable[] = [];
      let loadedFromSupabase = false;
      try {
        const { data: ecrData, error } = await supabase
          .from('ecritures_comptables')
          .select('*, lignes_ecritures(*)')
          .eq('etablissement_id', etablissementId);
        
        if (!error && ecrData && ecrData.length > 0) {
          customEcritures = ecrData.map((e: any) => ({
            id: e.id,
            date: e.date,
            libelle: e.libelle,
            reference: e.reference,
            partenaire: e.partenaire,
            lignes: (e.lignes_ecritures || []).map((l: any) => ({
              compteNumero: l.compte_numero,
              debit: Number(l.debit || 0),
              credit: Number(l.credit || 0)
            }))
          }));
          loadedFromSupabase = true;
          // Sync to local storage for offline use
          localStorage.setItem('mboaschool_ecritures', JSON.stringify(customEcritures));
        }
      } catch (err) {
        console.error("Error loading ecritures:", err);
      }

      // Fallback to local storage if not loaded from Supabase (e.g. offline, empty database, or network error)
      if (!loadedFromSupabase && typeof window !== 'undefined') {
        const stored = localStorage.getItem('mboaschool_ecritures');
        if (stored) {
          try {
            customEcritures = JSON.parse(stored);
          } catch (e) {
            customEcritures = [];
          }
        } else {
          // Default mock data if no local storage cache is present
          customEcritures = mockEcrituresInitiales;
          localStorage.setItem('mboaschool_ecritures', JSON.stringify(mockEcrituresInitiales));
        }
      }

      // Auto-generate entries from student payments dynamically
      const paymentEcritures: EcritureComptable[] = [];
      loadedStudents.forEach((student: Eleve) => {
        if (!student) return;
        const matchedClass = loadedClasses.find((c: any) => c.id === student.classeId || c.nom === student.classeId);
        const classPrice = matchedClass ? Number(matchedClass.prix || 0) : 200000;
        
        if (classPrice > 0) {
          const dateConst = student.dateInscription ? student.dateInscription.split('T')[0] : '2025-09-01';
          paymentEcritures.push({
            id: `ecr-const-${student.id}`,
            date: dateConst,
            libelle: `Constatation Frais Scolaires - ${student.nom} ${student.prenom}`,
            reference: `FACT-${student.matricule}`,
            lignes: [
              { compteNumero: '411', debit: classPrice, credit: 0 },
              { compteNumero: '706', debit: 0, credit: classPrice }
            ]
          });
        }

        const paiements = student.paiements || [];
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
      });

      // Auto-generate salary entries dynamically
      const salaryEcritures: EcritureComptable[] = [];
      const personnelForEntries = loadedPersonnel.length > 0 ? loadedPersonnel : mockPersonnel;
      const activeStaff = personnelForEntries.filter(p => p.statut === 'actif');
      activeStaff.forEach(p => {
        // Generate salary for each month of 2026 from Jan to May (5 months)
        const months = ['2026-01-25', '2026-02-25', '2026-03-25', '2026-04-25', '2026-05-25'];
        months.forEach((dateStr, monthIdx) => {
          const amount = p.salaireDeBase;
          if (amount > 0) {
            // Constatation of salary
            salaryEcritures.push({
              id: `ecr-sal-const-${p.id}-${monthIdx}`,
              date: dateStr,
              libelle: `Paie constatée - ${p.prenom} ${p.nom}`,
              reference: `DEC-SAL-${(p.id || '').slice(-4)}-M${monthIdx + 1}`,
              lignes: [
                { compteNumero: '661', debit: amount, credit: 0 },
                { compteNumero: '421', debit: 0, credit: amount }
              ]
            });
            
            // Payment of salary (fully paid for Jan, Feb, Mar, Apr, but May is in suspens!)
            if (monthIdx < 4) {
              salaryEcritures.push({
                id: `ecr-sal-pay-${p.id}-${monthIdx}`,
                date: dateStr,
                libelle: `Règlement salaire - ${p.prenom} ${p.nom}`,
                reference: `PAY-SAL-${(p.id || '').slice(-4)}-M${monthIdx + 1}`,
                lignes: [
                  { compteNumero: '421', debit: amount, credit: 0 },
                  { compteNumero: '521', debit: 0, credit: amount }
                ]
              });
            }
          }
        });
      });

      // Auto-generate training entries dynamically
      const trainingEcritures: EcritureComptable[] = [];
      const formationsForEntries = loadedFormations.length > 0 ? loadedFormations : mockFormations;
      formationsForEntries.forEach((f: any) => {
        const amount = Number(f.cout_total || f.coutTotal || 0);
        if (amount > 0) {
          const dateConst = f.date_debut || f.dateDebut || '2026-03-01';
          const datePay = f.date_fin || f.dateFin || '2026-03-15';
          // Constatation
          trainingEcritures.push({
            id: `ecr-train-const-${f.id}`,
            date: typeof dateConst === 'string' ? dateConst.split('T')[0] : '2026-03-01',
            libelle: `Frais formation : ${f.theme}`,
            reference: `FOR-${(f.id || '').slice(-4)}`,
            partenaire: f.organisme || 'Organisme de formation',
            lignes: [
              { compteNumero: '601', debit: amount, credit: 0 },
              { compteNumero: '401', debit: 0, credit: amount }
            ]
          });
          // Règlement (paid) if status is Terminé
          if (f.statut === 'Terminé' || f.statut === 'termine') {
            trainingEcritures.push({
              id: `ecr-train-pay-${f.id}`,
              date: typeof datePay === 'string' ? datePay.split('T')[0] : '2026-03-15',
              libelle: `Règlement formation : ${f.theme}`,
              reference: `PAY-FOR-${(f.id || '').slice(-4)}`,
              partenaire: f.organisme || 'Organisme de formation',
              lignes: [
                { compteNumero: '401', debit: amount, credit: 0 },
                { compteNumero: '521', debit: 0, credit: amount }
              ]
            });
          }
        }
      });

      // Load registry of deleted entries (so admin deleted ones don't show up again)
      let deletedIds: string[] = [];
      const storedDeleted = localStorage.getItem('mboaschool_deleted_ecritures');
      if (storedDeleted) {
        try {
          deletedIds = JSON.parse(storedDeleted);
        } catch (e) {
          console.error("Error parsing deleted ecritures:", e);
        }
      }

      const combined = [...customEcritures, ...paymentEcritures, ...salaryEcritures, ...trainingEcritures]
        .filter(e => !deletedIds.includes(e.id))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEcritures(combined);

      // 6. BSC Years
      const storedBscYears = localStorage.getItem('mboaschool_bsc_years');
      if (storedBscYears) {
        try { setBscYears(JSON.parse(storedBscYears)); } catch (e) {}
      }

      // 7. Budget lines
      const storedBudget = localStorage.getItem('mboaschool_budget_lines');
      setBudgetLines(storedBudget ? JSON.parse(storedBudget) : []);

      // 8. Classes already fetched in step 1.5

      // Fetch Teachers
      try {
        const { data: teachersData, error: teachersErr } = await supabase
          .from('enseignants')
          .select('*')
          .eq('etablissement_id', etablissementId);
        if (!teachersErr && teachersData) {
          setTeachers(teachersData);
        }
      } catch (err) {
        console.error('Error fetching teachers:', err);
      }

      // 9. Fetch Sections
      try {
        const { data: sectionsData, error: sectionsErr } = await supabase
          .from('sections')
          .select('*')
          .eq('etablissement_id', etablissementId);
        if (!sectionsErr && sectionsData) {
          setSections(sectionsData);
        }
      } catch (err) {
        console.error('Error fetching sections:', err);
      }
    };

    loadData();
  }, [etablissementId]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Accounting balance computed first to feed financial metrics
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

  // --- Dynamic Financial Metrics for 2026 ---

  // Chiffre d'Affaires 2026 (credit balance of all Class 7 accounts in ledger)
  const totalCA2026 = planComptable
    .filter(c => c.numero.startsWith('7'))
    .reduce((sum, c) => sum + (accountBalances[c.numero]?.credit - accountBalances[c.numero]?.debit || 0), 0);

  // Trésorerie perçue (real cash collections from student payments)
  const totalTresoreriePercue = students.reduce((sum, student) => {
    return sum + (student.paiements || [])
      .filter(p => p.statut === 'paid')
      .reduce((s, p) => s + p.montant, 0);
  }, 0);

  // Masse salariale mensuelle et annuelle 2026 from ledger (account 661)
  const activeStaff = personnel.filter(p => p.statut === 'actif');
  const masseSalarialeMensuelle2026 = activeStaff.reduce((sum, p) => sum + p.salaireDeBase, 0);
  const masseSalarialeAnnuelle2026 = accountBalances['661']?.debit || 0;

  // Training expenditures
  const totalTrainingCosts2026 = formations.reduce((sum, f) => sum + f.coutTotal, 0);

  // Operating charges from OHADA journal (Class 6 except account 661, minus training costs to avoid double-counting)
  const totalChargesComptables2026Raw = planComptable
    .filter(c => c.numero.startsWith('6') && c.numero !== '661')
    .reduce((sum, c) => sum + (accountBalances[c.numero]?.debit - accountBalances[c.numero]?.credit || 0), 0);
  const totalChargesComptables2026 = Math.max(0, totalChargesComptables2026Raw - totalTrainingCosts2026);

  // Bénéfice Net 2026 (perfectly consistent with double entry ledger)
  const netProfit2026 = totalCA2026 - (masseSalarialeAnnuelle2026 + totalChargesComptables2026 + totalTrainingCosts2026);

  // Dynamic balance sheet data from ledger entries (ecritures)
  const dynamicInterestExpense = ecritures.reduce((sum, ecr) => {
    return sum + ecr.lignes.reduce((lSum, l) => {
      const isInterestAcc = l.compteNumero.startsWith('67') || l.compteNumero === '631';
      return isInterestAcc ? lSum + (l.debit - l.credit) : lSum;
    }, 0);
  }, 0);
  const simulatedInterestExpense = dynamicInterestExpense;

  const dynamicDebts = ecritures.reduce((sum, ecr) => {
    return sum + ecr.lignes.reduce((lSum, l) => {
      const num = l.compteNumero;
      const isDebtAcc = num.startsWith('40') || num.startsWith('42') || num.startsWith('43') || num.startsWith('44') || num.startsWith('16');
      return isDebtAcc ? lSum + (l.credit - l.debit) : lSum;
    }, 0);
  }, 0);
  const simulatedDebts = dynamicDebts;

  const dynamicEquity = ecritures.reduce((sum, ecr) => {
    return sum + ecr.lignes.reduce((lSum, l) => {
      const num = l.compteNumero;
      const isEquityAcc = num.startsWith('10');
      return isEquityAcc ? lSum + (l.credit - l.debit) : lSum;
    }, 0);
  }, 0);
  const simulatedEquity = dynamicEquity;

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

  // Mappings for section productivity (Dynamic calculation)
  const getSectionProductivity = (secId: 'sec-fr' | 'sec-en' | 'sec-bi') => {
    let secCA = 0;
    let secStaff = 0;

    // Resolve dynamic sections from DB if sections are populated
    const cleanSecId = secId.toLowerCase();
    const dbSection = sections.find(s => 
      s.id === secId || 
      s.nom.toLowerCase().includes(cleanSecId === 'sec-fr' ? 'fran' : cleanSecId === 'sec-en' ? 'angl' : 'bil')
    );

    if (dbSection) {
      // Find classes in this section
      const sectionClasses = classes.filter(c => c.section_id === dbSection.id || c.nom.toLowerCase().includes(dbSection.nom.toLowerCase()));
      const classIds = sectionClasses.map(c => c.id);
      const classNames = sectionClasses.map(c => c.nom);

      // Sum CA for this section
      secCA = students
        .filter(s => classIds.includes(s.classeId) || classNames.includes(s.classeId))
        .flatMap(s => s.paiements || [])
        .reduce((sum, p) => p.statut === 'paid' ? sum + p.montant : sum, 0);

      // Count unique teachers assigned to these classes
      const teachersSet = new Set<string>();
      sectionClasses.forEach(c => {
        if (c.enseignant_principal_id) teachersSet.add(c.enseignant_principal_id);
        if (c.enseignant_assistant_id) teachersSet.add(c.enseignant_assistant_id);
      });
      secStaff = teachersSet.size;

      // Add a share of other admin staff
      const otherStaffCount = activeStaff.filter(p => p.categorie !== 'Enseignant').length;
      const sectionsCount = sections.length > 0 ? sections.length : 3;
      secStaff += (otherStaffCount / sectionsCount);
    } else {
      // Fallback matching logic based on class names
      if (secId === 'sec-fr') {
        const classStudents = students.filter(s => 
          s.classeId === 'cls-term-d' || s.classeId === 'cls-sec-c' || 
          s.classeId === 'Terminale D' || s.classeId === '3ème' ||
          s.classeId.toLowerCase().includes('ème') || s.classeId.toLowerCase().includes('term')
        );
        secCA = classStudents.flatMap(s => s.paiements || []).reduce((sum, p) => p.statut === 'paid' ? sum + p.montant : sum, 0);
        secStaff = activeStaff.filter(p => p.id === 'teach-1' || p.id === 'teach-3' || p.categorie === 'Enseignant').length * 0.6;
      } else if (secId === 'sec-en') {
        const classStudents = students.filter(s => 
          s.classeId.toLowerCase().includes('form') || s.classeId.toLowerCase().includes('class') || s.classeId.toLowerCase().includes('en')
        );
        secCA = classStudents.flatMap(s => s.paiements || []).reduce((sum, p) => p.statut === 'paid' ? sum + p.montant : sum, 0);
        if (secCA === 0) secCA = totalCA2026 * 0.25; // standard fallback
        secStaff = activeStaff.filter(p => p.id === 'teach-2' || p.id === 'pers-9').length;
        if (secStaff === 0) secStaff = 2;
      } else {
        const classStudents = students.filter(s => 
          s.classeId === 'cls-mat-gs' || s.classeId === 'Maternelle' || s.classeId.toLowerCase().includes('mat')
        );
        secCA = classStudents.flatMap(s => s.paiements || []).reduce((sum, p) => p.statut === 'paid' ? sum + p.montant : sum, 0);
        if (secCA === 0) secCA = totalCA2026 * 0.15; // standard fallback
        secStaff = activeStaff.filter(p => p.categorie === 'Administration' || p.categorie === 'Technique').length * 0.5 + 1;
      }
    }

    return secStaff > 0 ? secCA / secStaff : 0;
  };

  // Format money helper
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(val);
  };

  const isAdmin = userRole && (userRole.toLowerCase() === 'admin' || userRole.toLowerCase() === 'administrateur');

  // Dynamic Class Productivity
  const getClassProductivity = (classIdOrName: string) => {
    const classStudents = students.filter(s => 
      s.classeId === classIdOrName || 
      (classIdOrName === 'Terminale D' && (s.classeId === 'cls-term-d' || s.classeId === 'Terminale D')) ||
      (classIdOrName === '3ème' && (s.classeId === 'cls-sec-c' || s.classeId === '3ème')) ||
      (classIdOrName === 'Maternelle' && (s.classeId === 'cls-mat-gs' || s.classeId === 'Maternelle'))
    );
    return classStudents.flatMap(s => s.paiements || []).reduce((sum, p) => p.statut === 'paid' ? sum + p.montant : sum, 0);
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
        .filter(p => p.date && p.date.split('T')[0] === dateStr && p.statut === 'paid')
        .reduce((sum, p) => sum + p.montant, 0);

      // Sum of all payments (both paid and unpaid/pending) due on this date
      const dailyCAConstated = students.flatMap(s => s.paiements || [])
        .filter(p => p.date && p.date.split('T')[0] === dateStr)
        .reduce((sum, p) => sum + p.montant, 0);

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
  const handleSaveExpense = async (e: React.FormEvent) => {
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
        partenaire: expPartenaire || undefined,
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
        partenaire: expPartenaire || undefined,
        lignes: [
          { compteNumero: expCompteTiers, debit: toPay, credit: 0 },
          { compteNumero: expCompteCredit, debit: 0, credit: toPay }
        ]
      });
    }

    if (newEcrituresList.length === 0) return;

    // Save to Supabase (attempt)
    const supabase = createClient();
    let savedToSupabase = false;

    try {
      for (const ecr of newEcrituresList) {
        // Insert ecriture
        const { data: ecrData, error: ecrErr } = await supabase
          .from('ecritures_comptables')
          .insert([{
            date: ecr.date,
            libelle: ecr.libelle,
            reference: ecr.reference,
            partenaire: ecr.partenaire || null,
            etablissement_id: etablissementId
          }])
          .select()
          .single();

        if (ecrErr) throw ecrErr;

        if (ecrData) {
          // Insert lines
          const linesToInsert = ecr.lignes.map(l => ({
            ecriture_id: ecrData.id,
            compte_numero: l.compteNumero,
            debit: l.debit,
            credit: l.credit
          }));

          const { error: linesErr } = await supabase
            .from('lignes_ecritures')
            .insert(linesToInsert);
          
          if (linesErr) throw linesErr;
        }
      }
      savedToSupabase = true;
    } catch (err) {
      console.warn("Failed to save transaction in Supabase, falling back to local storage:", err);
    }

    // Save to local storage (always do as local sync / fallback)
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
    setExpPartenaire('');
    setExpTva(false);
    triggerToast(savedToSupabase ? "Opération comptable enregistrée dans le cloud !" : "Opération comptable enregistrée !");
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccNum || !newAccLibelle) return;
    const newAcc: CompteOHADA = {
      numero: newAccNum,
      libelle: newAccLibelle,
      classe: Number(newAccClasse) as any
    };

    // Save to Supabase (attempt)
    const supabase = createClient();
    let savedToSupabase = false;
    try {
      const { error } = await supabase
        .from('comptes_ohada')
        .insert([{
          numero: newAcc.numero,
          libelle: newAcc.libelle,
          classe: newAcc.classe
        }]);
      if (!error) savedToSupabase = true;
    } catch (err) {
      console.warn("Failed to save account in Supabase:", err);
    }

    const updated = [...planComptable, newAcc].sort((a,b) => a.numero.localeCompare(b.numero));
    setPlanComptable(updated);
    localStorage.setItem('mboaschool_plancomptable', JSON.stringify(updated));
    setShowAddAccountModal(false);
    setNewAccNum('');
    setNewAccLibelle('');
    triggerToast(savedToSupabase ? "Compte comptable créé dans le cloud !" : "Compte comptable créé !");
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

  // accountBalances is already calculated at the top

  const getTiersForAccount = (compteNumero: string) => {
    const partners = new Set<string>();
    ecritures.forEach(ecr => {
      if (ecr.partenaire && ecr.lignes.some(l => l.compteNumero === compteNumero)) {
        partners.add(ecr.partenaire);
      }
    });
    return Array.from(partners).join(', ');
  };

  // handleDeleteEcriture: allowing admin accounts to delete ledger items
  const handleDeleteEcriture = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette écriture comptable ?')) return;

    const supabase = createClient();
    let deletedFromSupabase = false;
    try {
      // Delete lines first to satisfy foreign key constraint if ON DELETE CASCADE is not set
      await supabase.from('lignes_ecritures').delete().eq('ecriture_id', id);
      
      const { error } = await supabase.from('ecritures_comptables').delete().eq('id', id);
      if (!error) {
        deletedFromSupabase = true;
      }
    } catch (err) {
      console.warn("Failed to delete from Supabase, relying on local registry:", err);
    }

    // Register the deleted ID in local storage to prevent dynamic mock entries from showing
    let deletedIds: string[] = [];
    const deletedStored = localStorage.getItem('mboaschool_deleted_ecritures');
    if (deletedStored) {
      try {
        deletedIds = JSON.parse(deletedStored);
      } catch (e) {
        console.error(e);
      }
    }
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('mboaschool_deleted_ecritures', JSON.stringify(deletedIds));
    }

    // Update memory state
    setEcritures(prev => prev.filter(e => e.id !== id));

    // Update cached manual ecritures in localStorage
    const stored = localStorage.getItem('mboaschool_ecritures');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const filtered = parsed.filter((e: any) => e.id !== id);
        localStorage.setItem('mboaschool_ecritures', JSON.stringify(filtered));
      } catch (e) {
        console.error("Error updating cached ecritures:", e);
      }
    }

    triggerToast(deletedFromSupabase ? "Écriture supprimée dans le cloud !" : "Écriture supprimée !");
  };

  // Bilan OHADA Calculations
  const assetImmobilise = planComptable
    .filter(c => c.numero.startsWith('2'))
    .reduce((sum, c) => sum + (accountBalances[c.numero]?.debit - accountBalances[c.numero]?.credit || 0), 0);
    
  const assetCreances = planComptable
    .filter(c => c.numero.startsWith('41'))
    .reduce((sum, c) => sum + (accountBalances[c.numero]?.debit - accountBalances[c.numero]?.credit || 0), 0);
    
  const assetTresor = planComptable
    .filter(c => c.numero.startsWith('5'))
    .reduce((sum, c) => sum + (accountBalances[c.numero]?.debit - accountBalances[c.numero]?.credit || 0), 0);

  const totalActif = assetImmobilise + assetCreances + assetTresor;

  const passifEquity = planComptable
    .filter(c => c.numero.startsWith('1') && !c.numero.startsWith('16'))
    .reduce((sum, c) => sum + (accountBalances[c.numero]?.credit - accountBalances[c.numero]?.debit || 0), 0);

  const passifDebtsFin = planComptable
    .filter(c => c.numero.startsWith('16'))
    .reduce((sum, c) => sum + (accountBalances[c.numero]?.credit - accountBalances[c.numero]?.debit || 0), 0);

  const passifDebtsCirc = planComptable
    .filter(c => c.numero.startsWith('4') && !c.numero.startsWith('41'))
    .reduce((sum, c) => sum + (accountBalances[c.numero]?.credit - accountBalances[c.numero]?.debit || 0), 0);

  const totalPassif = passifEquity + netProfit2026 + passifDebtsFin + passifDebtsCirc;

  // DSF / Fiscal calculations
  const totalRevenuesDSF = totalCA2026;
  const totalChargesDSF = masseSalarialeAnnuelle2026 + totalChargesComptables2026 + totalTrainingCosts2026;
  const resultatComptableDSF = netProfit2026;
  
  // Tax adjustments
  const reintegrationsDSF = 0; // standard mock
  const deductionsDSF = 0;
  const resultatFiscalDSF = Math.max(0, resultatComptableDSF + reintegrationsDSF - deductionsDSF);
  
  // IS at 30.8% or Minimum Tax of 2.2% of CA
  const isSurResultat = resultatFiscalDSF * 0.308;
  const impotMinimum = totalRevenuesDSF * 0.022;
  const impotDufinal = Math.max(isSurResultat, impotMinimum);
  
  const netResultatApresImpot = resultatComptableDSF - impotDufinal;

  // TVA details
  const tvaCollectee = ecritures.reduce((sum, e) => {
    return sum + e.lignes.reduce((lSum, l) => l.compteNumero === '443' ? lSum + (l.credit - l.debit) : lSum, 0);
  }, 0);
  const tvaDeductible = ecritures.reduce((sum, e) => {
    return sum + e.lignes.reduce((lSum, l) => l.compteNumero === '445' ? lSum + (l.debit - l.credit) : lSum, 0);
  }, 0);
  const tvaNetReverser = Math.max(0, tvaCollectee - tvaDeductible);

  // exportDSFToExcel: generate and download the statistical & fiscal liasse
  const exportDSFToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Sheet 1: Résultat Fiscal
      const dataFiscal = [
        ["DÉCLARATION STATISTIQUE ET FISCALE (DSF) PROVISOIRE"],
        ["Établissement ID", etablissementId || "Non défini"],
        ["Date d'exportation", new Date().toLocaleDateString('fr-FR')],
        [],
        ["1. DÉTERMINATION DU RÉSULTAT FISCAL", "Montant (XAF)"],
        ["Résultat Comptable Net de l'exercice", resultatComptableDSF],
        ["+ Réintégrations Fiscales (Charges non déductibles)", reintegrationsDSF],
        ["- Déductions Fiscales (Produits exonérés)", deductionsDSF],
        ["Résultat Fiscal Imposable (Base IS)", resultatFiscalDSF],
        [],
        ["2. CALCUL DE L'IMPÔT DÛ", "Montant (XAF)"],
        ["Taux standard IS (28% + 10% CAC = 30.8%)", isSurResultat],
        ["Impôt Minimum Légal (2.2% du CA total)", impotMinimum],
        ["Impôt Définitif Dû (Le plus élevé)", impotDufinal],
        ["Résultat Net après impôt", netResultatApresImpot]
      ];
      
      const wsFiscal = XLSX.utils.aoa_to_sheet(dataFiscal);
      XLSX.utils.book_append_sheet(wb, wsFiscal, "Résultat Fiscal");

      // Sheet 2: Autres Taxes et Déclarations
      const dataTaxes = [
        ["AUTRES TAXES ET DÉCLARATIONS PÉRIODIQUES"],
        ["Date d'exportation", new Date().toLocaleDateString('fr-FR')],
        [],
        ["Taxe / Cotisation", "Montant (XAF)", "Détails / Base de calcul"],
        ["TVA Net à Reverser", tvaNetReverser, `TVA Collectée: ${tvaCollectee} • Déductible: ${tvaDeductible}`],
        ["IRPP / IRSA (Retenue Salaires)", masseSalarialeAnnuelle2026 * 0.1, `Estimation 10% de la masse salariale brute (${masseSalarialeAnnuelle2026})`],
        ["Cotisations Sociales CNPS", masseSalarialeAnnuelle2026 * 0.22, `Base de calcul CNPS 22% (Part employeur + salarié)`]
      ];

      const wsTaxes = XLSX.utils.aoa_to_sheet(dataTaxes);
      XLSX.utils.book_append_sheet(wb, wsTaxes, "Taxes & Déclarations");

      // Save the workbook
      XLSX.writeFile(wb, `liasse_dsf_${etablissementId || 'etab'}.xlsx`);
      triggerToast("Liasse DSF exportée avec succès !");
    } catch (error) {
      console.error("Failed to export Excel:", error);
      alert("Erreur lors de l'exportation de la liasse DSF.");
    }
  };

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
                  {classes.length > 0 ? (
                    classes.map((cls) => {
                      const classCA = getClassProductivity(cls.id);
                      const matchedTeacher = teachers.find(t => t.id === cls.enseignant_principal_id);
                      const teacherName = matchedTeacher 
                        ? `${matchedTeacher.prenom} ${matchedTeacher.nom}` 
                        : 'Non spécifié';
                      const percentage = totalCA2026 > 0 ? ((classCA / totalCA2026) * 100).toFixed(1) : '0.0';
                      return (
                        <tr key={cls.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-semibold">{cls.nom}</td>
                          <td className="px-6 py-4 text-slate-500">{teacherName}</td>
                          <td className="px-6 py-4 text-right font-mono font-bold">{formatMoney(classCA)}</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-indigo-600">{percentage}% du CA total</td>
                        </tr>
                      );
                    })
                  ) : (
                    <>
                      <tr className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-semibold">Terminale D</td>
                        <td className="px-6 py-4 text-slate-500">Dieudonné Atangana</td>
                        <td className="px-6 py-4 text-right font-mono font-bold">{formatMoney(getClassProductivity('Terminale D'))}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-indigo-600">{totalCA2026 > 0 ? ((getClassProductivity('Terminale D')/totalCA2026)*100).toFixed(1) : '0.0'}% du CA total</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-semibold">3ème Espagnol</td>
                        <td className="px-6 py-4 text-slate-500">Marthe Ngo</td>
                        <td className="px-6 py-4 text-right font-mono font-bold">{formatMoney(getClassProductivity('3ème'))}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-indigo-600">{totalCA2026 > 0 ? ((getClassProductivity('3ème')/totalCA2026)*100).toFixed(1) : '0.0'}% du CA total</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-semibold">Maternelle Grande Section</td>
                        <td className="px-6 py-4 text-slate-500">Chantal Bella</td>
                        <td className="px-6 py-4 text-right font-mono font-bold">{formatMoney(getClassProductivity('Maternelle'))}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-indigo-600">{totalCA2026 > 0 ? ((getClassProductivity('Maternelle')/totalCA2026)*100).toFixed(1) : '0.0'}% du CA total</td>
                      </tr>
                    </>
                  )}
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
              <span className="text-xs text-slate-400 font-semibold block mt-1.5">Enregistré en engagement (Total frais attendus)</span>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Trésorerie Perçue (Encaissements)</span>
              <h2 className="text-2xl font-black text-emerald-500">{formatMoney(totalTresoreriePercue)}</h2>
              <span className="text-xs text-slate-400 font-semibold block mt-1.5">
                {totalCA2026 > 0 ? ((totalTresoreriePercue / totalCA2026) * 100).toFixed(1) : 0}% encaissé réellement
              </span>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Écart de Rapprochement</span>
              <h2 className="text-2xl font-black text-slate-800 text-black">{formatMoney(totalCA2026 - totalTresoreriePercue)}</h2>
              {totalCA2026 === totalTresoreriePercue ? (
                <span className="text-xs text-emerald-500 font-bold block mt-1.5">✓ Livres parfaitement équilibrés</span>
              ) : (
                <span className="text-xs text-amber-500 font-bold block mt-1.5">
                  ⚠️ Reste à recouvrer ({totalCA2026 > 0 ? ((1 - totalTresoreriePercue / totalCA2026) * 100).toFixed(1) : 0}% en attente)
                </span>
              )}
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
              <button
                onClick={() => setAccountingSubTab('bilan')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  accountingSubTab === 'bilan' ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Bilan Actif/Passif
              </button>
              <button
                onClick={() => setAccountingSubTab('dsf')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  accountingSubTab === 'dsf' ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Déclaration DSF
              </button>
            </div>
            <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">
              {accountingSubTab === 'journal' && `${ecritures.length} écritures OHADA`}
              {accountingSubTab === 'balance' && `${planComptable.filter(c => accountBalances[c.numero]?.debit > 0 || accountBalances[c.numero]?.credit > 0).length} comptes mouvementés`}
              {accountingSubTab === 'bilan' && "Bilan Équilibré"}
              {accountingSubTab === 'dsf' && "Calcul IS & DSF"}
            </span>
          </div>

          {/* Subtab content: Journal */}
          {accountingSubTab === 'journal' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse text-black">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-black uppercase bg-slate-50/20">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Référence</th>
                    <th className="px-4 py-3">Compte</th>
                    <th className="px-4 py-3">Tiers</th>
                    <th className="px-4 py-3">Libellé</th>
                    <th className="px-4 py-3 text-right">Débit</th>
                    <th className="px-4 py-3 text-right">Crédit</th>
                    {isAdmin && <th className="px-4 py-3 text-center">Actions</th>}
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
                            <td className="px-4 py-3 text-slate-700 font-semibold">
                              {ligne.compteNumero.startsWith('4') && ecr.partenaire ? ecr.partenaire : ''}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-black flex items-center gap-2 flex-wrap">
                                <span>{ecr.libelle}</span>
                              </div>
                              <div className="text-xs text-slate-400">{compteDef?.libelle || 'Compte inconnu'}</div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-black font-bold">{ligne.debit > 0 ? formatMoney(ligne.debit) : ''}</td>
                            <td className="px-4 py-3 text-right font-mono text-black font-bold">{ligne.credit > 0 ? formatMoney(ligne.credit) : ''}</td>
                            {idx === 0 && isAdmin && (
                              <td className="px-4 py-3 text-center align-middle" rowSpan={ecr.lignes.length}>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEcriture(ecr.id)}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 rounded font-bold text-xs transition-all border border-rose-100"
                                >
                                  Supprimer
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Subtab content: Balance */}
          {accountingSubTab === 'balance' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse text-black">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-black uppercase bg-slate-50/20">
                    <th className="px-4 py-3 w-24">Compte</th>
                    <th className="px-4 py-3">Tiers</th>
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
                        <td className="px-4 py-3 text-slate-600 font-semibold">{getTiersForAccount(compte.numero)}</td>
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



          {/* Subtab content: Bilan */}
          {accountingSubTab === 'bilan' && (
            <div className="p-6 space-y-6">
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between text-black">
                <div>
                  <h4 className="font-bold text-slate-800 text-black text-sm">Bilan Comptable Système Minimal de Trésorerie (SMT) - OHADA</h4>
                  <p className="text-xs text-slate-500 font-medium">Bilan équilibré généré en temps réel basé sur les écritures comptables saisies et constatées.</p>
                </div>
                {Math.abs(totalActif - totalPassif) > 0.01 && (
                  <span className="bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1 rounded-full border border-rose-200">
                    ⚠️ Équilibre rompu (Écart: {formatMoney(Math.abs(totalActif - totalPassif))})
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-black">
                {/* Actif */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <h4 className="text-base font-bold text-indigo-700 border-b border-slate-100 pb-2 flex justify-between">
                    <span>ACTIF (Emplois)</span>
                    <span className="text-xs text-slate-400 font-medium">Valeurs Brutes</span>
                  </h4>
                  <div className="space-y-3.5 text-sm">
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="font-semibold text-slate-700">Actif Immobilisé (Classe 2)</span>
                      <span className="font-mono font-bold">{formatMoney(assetImmobilise)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2 pl-4 text-xs text-slate-400">
                      <span>Immobilisations corporelles & incorporelles</span>
                      <span>{formatMoney(assetImmobilise)}</span>
                    </div>
                    
                    <div className="flex justify-between border-b border-slate-50 pb-2 pt-2">
                      <span className="font-semibold text-slate-700">Actif Circulant (Créances - Classe 4)</span>
                      <span className="font-mono font-bold">{formatMoney(assetCreances)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2 pl-4 text-xs text-slate-400">
                      <span>Créances Clients & Scolarités (Compte 411...)</span>
                      <span>{formatMoney(assetCreances)}</span>
                    </div>

                    <div className="flex justify-between border-b border-slate-50 pb-2 pt-2">
                      <span className="font-semibold text-slate-700">Trésorerie Actif (Disponibilités - Classe 5)</span>
                      <span className="font-mono font-bold">{formatMoney(assetTresor)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2 pl-4 text-xs text-slate-400">
                      <span>Soldes Banques & Caisses (Comptes 52, 57...)</span>
                      <span>{formatMoney(assetTresor)}</span>
                    </div>

                    <div className="flex justify-between bg-indigo-600 text-white font-black p-4 rounded-xl text-base mt-6 shadow-md">
                      <span>TOTAL ACTIF</span>
                      <span className="font-mono">{formatMoney(totalActif)}</span>
                    </div>
                  </div>
                </div>

                {/* Passif */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <h4 className="text-base font-bold text-indigo-700 border-b border-slate-100 pb-2 flex justify-between">
                    <span>PASSIF (Ressources)</span>
                    <span className="text-xs text-slate-400 font-medium">Capitaux & Dettes</span>
                  </h4>
                  <div className="space-y-3.5 text-sm">
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="font-semibold text-slate-700">Capitaux Propres (Classe 1)</span>
                      <span className="font-mono font-bold">{formatMoney(passifEquity)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2 pl-4 text-xs text-slate-400">
                      <span>Capital Social & Réserves réglementaires</span>
                      <span>{formatMoney(passifEquity)}</span>
                    </div>

                    <div className="flex justify-between border-b border-slate-50 pb-2 pt-2">
                      <span className="font-semibold text-slate-700">Résultat net de l'exercice</span>
                      <span className={`font-mono font-bold ${netProfit2026 >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatMoney(netProfit2026)}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2 pl-4 text-xs text-slate-400">
                      <span>Bénéfice de l'exercice (Solde Créditeur)</span>
                      <span>{formatMoney(netProfit2026)}</span>
                    </div>

                    <div className="flex justify-between border-b border-slate-50 pb-2 pt-2">
                      <span className="font-semibold text-slate-700">Dettes Financières (Moyen/Long terme - Cl. 16)</span>
                      <span className="font-mono font-bold">{formatMoney(passifDebtsFin)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2 pl-4 text-xs text-slate-400">
                      <span>Emprunts et dettes financières assimilées</span>
                      <span>{formatMoney(passifDebtsFin)}</span>
                    </div>

                    <div className="flex justify-between border-b border-slate-50 pb-2 pt-2">
                      <span className="font-semibold text-slate-700">Dettes Circulantes (Tiers Passif - Classe 4)</span>
                      <span className="font-mono font-bold">{formatMoney(passifDebtsCirc)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2 pl-4 text-xs text-slate-400">
                      <span>Dettes Fournisseurs, CNPS, État (Comptes 40, 42, 44...)</span>
                      <span>{formatMoney(passifDebtsCirc)}</span>
                    </div>

                    <div className="flex justify-between bg-indigo-600 text-white font-black p-4 rounded-xl text-base mt-6 shadow-md">
                      <span>TOTAL PASSIF</span>
                      <span className="font-mono">{formatMoney(totalPassif)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subtab content: DSF */}
          {accountingSubTab === 'dsf' && (
            <div className="p-6 space-y-6 text-black">
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-800 text-black text-sm">Déclaration Statistique et Fiscale (DSF) Provisoire</h4>
                  <p className="text-xs text-slate-500 font-medium">Formulaires de synthèse fiscale et détermination de l'Impôt sur les Sociétés (IS) - Cameroun / CEMAC.</p>
                </div>
                <button
                  type="button"
                  onClick={exportDSFToExcel}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer animate-pulse"
                >
                  📥 Télécharger Liasse DSF
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Resultat Fiscal Box */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 md:col-span-2">
                  <h4 className="text-base font-bold text-indigo-700 border-b border-slate-100 pb-2">Détermination du Résultat Fiscal</h4>
                  <div className="space-y-3.5 text-sm">
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-600">Résultat Comptable Net de l'exercice</span>
                      <span className="font-mono font-bold">{formatMoney(resultatComptableDSF)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2 text-xs">
                      <span className="text-slate-500 pl-4">+ Réintégrations Fiscales (Charges non déductibles)</span>
                      <span className="font-mono text-slate-600">+{formatMoney(reintegrationsDSF)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2 text-xs">
                      <span className="text-slate-500 pl-4">- Déductions Fiscales (Produits exonérés)</span>
                      <span className="font-mono text-slate-600">-{formatMoney(deductionsDSF)}</span>
                    </div>
                    <div className="flex justify-between border-b-2 border-slate-200 pb-2 pt-2 text-base font-bold">
                      <span className="text-slate-800 text-black">Résultat Fiscal Imposable (Base IS)</span>
                      <span className="font-mono text-indigo-600">{formatMoney(resultatFiscalDSF)}</span>
                    </div>
                  </div>
                </div>

                {/* Impot du Box */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <h4 className="text-base font-bold text-indigo-700 border-b border-slate-100 pb-2">Calcul de l'Impôt Dû (Cameroun)</h4>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Taux standard IS (28% + 10% CAC = 30.8%)</span>
                      <span className="font-mono">{formatMoney(isSurResultat)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-semibold">Impôt Minimum Légal (2.2% du CA total)</span>
                      <span className="font-mono">{formatMoney(impotMinimum)}</span>
                    </div>
                    <div className="flex justify-between pt-2 text-sm font-bold text-rose-600">
                      <span>Impôt Définitif Dû (Le plus élevé)</span>
                      <span className="font-mono font-extrabold">{formatMoney(impotDufinal)}</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-slate-100 text-sm font-bold text-emerald-600">
                      <span>Résultat Net après impôt</span>
                      <span className="font-mono font-extrabold">{formatMoney(netResultatApresImpot)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Other fiscal declarations summary */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h4 className="text-base font-bold text-indigo-700 border-b border-slate-100 pb-2">Autres Taxes et Déclarations Périodiques</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">TVA Net à Reverser</span>
                    <h4 className="text-lg font-black text-rose-600">{formatMoney(tvaNetReverser)}</h4>
                    <span className="text-[9px] text-slate-400 font-medium block mt-1">Calculé sur TVA Collectée: {formatMoney(tvaCollectee)} • Déductible: {formatMoney(tvaDeductible)}</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">IRPP / IRSA (Retenue Salaires)</span>
                    <h4 className="text-lg font-black text-slate-800 text-black">{formatMoney(masseSalarialeAnnuelle2026 * 0.1)}</h4>
                    <span className="text-[9px] text-slate-400 font-medium block mt-1">Estimation 10% de la masse salariale brute ({formatMoney(masseSalarialeAnnuelle2026)})</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Cotisations Sociales CNPS</span>
                    <h4 className="text-lg font-black text-slate-800 text-black">{formatMoney(masseSalarialeAnnuelle2026 * 0.22)}</h4>
                    <span className="text-[9px] text-slate-400 font-medium block mt-1">Base de calcul CNPS 22% (Part employeur + salarié)</span>
                  </div>
                </div>
              </div>
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Libellé</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Facture électricité mensuelle" 
                    value={expLibelle} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setExpLibelle(val);
                      
                      // Auto-selection of accounts based on detailed OHADA keywords (OHADA Referentiel de mots-clés)
                      const clean = val.toLowerCase().trim();
                      if (!clean) return;

                      // 1. Personnel (Salaires, Avances, Primes, CNPS)
                      const isSal = clean.includes('salaire') || clean.includes('rémunération') || clean.includes('remuneration') || clean.includes('paie') || clean.includes('bulletin') || clean.includes('prime') || clean.includes('traitement') || clean.includes('paie constatée');
                      const isAvance = clean.includes('avance') || clean.includes('acompte');
                      const isCnps = clean.includes('cnps') || clean.includes('cotisation sociale') || clean.includes('charge sociale');

                      if (isSal) {
                        if (isAvance) {
                          setExpCompteDebit(planComptable.some(c => c.numero === '425') ? '425' : '661');
                          setExpCompteTiers('421');
                          setExpCompteCredit('521'); // Banque
                        } else {
                          setExpCompteDebit('661'); // Rémunérations directes
                          setExpCompteTiers('421'); // Personnel - Rémunérations dues
                          setExpCompteCredit('521'); // Banque
                        }
                        setExpTva(false);
                      } else if (isCnps) {
                        setExpCompteDebit('661'); // Fallback charges
                        setExpCompteTiers('431'); // Organismes sociaux
                        setExpCompteCredit('521');
                        setExpTva(false);
                      }
                      
                      // 2. Loyer & Crédit-bail
                      else if (clean.includes('loyer') || clean.includes('location') || clean.includes('bail') || clean.includes('leasing') || clean.includes('loa') || clean.includes('credit bail') || clean.includes('crédit-bail')) {
                        if (clean.includes('credit bail') || clean.includes('crédit-bail') || clean.includes('leasing') || clean.includes('loa')) {
                          setExpCompteDebit(planComptable.some(c => c.numero === '612') ? '612' : '622');
                        } else {
                          setExpCompteDebit('622'); // Locations
                        }
                        setExpCompteTiers('401');
                        setExpCompteCredit('521');
                        setExpTva(true);
                      }

                      // 3. Entretien & réparations
                      else if (clean.includes('entretien') || clean.includes('reparation') || clean.includes('réparation') || clean.includes('maintenance') || clean.includes('revision') || clean.includes('vidange')) {
                        setExpCompteDebit('624'); // Entretien et réparations
                        setExpCompteTiers('401');
                        setExpCompteCredit('571'); // Caisse
                        setExpTva(true);
                      }

                      // 4. Assurances
                      else if (clean.includes('assurance') || clean.includes('prime assurance') || clean.includes('cotisation assurance')) {
                        setExpCompteDebit(planComptable.some(c => c.numero === '616') ? '616' : '61');
                        setExpCompteTiers('401');
                        setExpCompteCredit('521');
                        setExpTva(false);
                      }

                      // 5. Publicité et communication
                      else if (clean.includes('publicite') || clean.includes('publicité') || clean.includes('communication') || clean.includes('marketing') || clean.includes('pub')) {
                        setExpCompteDebit(planComptable.some(c => c.numero === '623') ? '623' : '601');
                        setExpCompteTiers('401');
                        setExpCompteCredit('521');
                        setExpTva(true);
                      }

                      // 6. Transports, carburant et déplacements
                      else if (clean.includes('transport') || clean.includes('carburant') || clean.includes('essence') || clean.includes('gasoil') || clean.includes('deplacement') || clean.includes('déplacement') || clean.includes('mission')) {
                        if (clean.includes('carburant') || clean.includes('essence') || clean.includes('gasoil')) {
                          setExpCompteDebit('605'); // combustibles
                        } else {
                          setExpCompteDebit('61'); // Transports
                        }
                        setExpCompteTiers('401');
                        setExpCompteCredit('571');
                        setExpTva(true);
                      }

                      // 7. Électricité, eau (ENEO, Camwater, etc.)
                      else if (clean.includes('electricite') || clean.includes('électricité') || clean.includes('eau') || clean.includes('camwater') || clean.includes('eneo') || clean.includes('cde') || clean.includes('sonel') || clean.includes('élec')) {
                        setExpCompteDebit('605'); // Eau et Électricité
                        setExpCompteTiers('401');
                        setExpCompteCredit('571');
                        setExpTva(true);
                      }

                      // 8. Télécommunications
                      else if (clean.includes('telephone') || clean.includes('téléphone') || clean.includes('internet') || clean.includes('orange') || clean.includes('mtn')) {
                        setExpCompteDebit(planComptable.some(c => c.numero === '626') ? '626' : '622');
                        setExpCompteTiers('401');
                        setExpCompteCredit('521');
                        setExpTva(true);
                      }

                      // 9. Honoraires (avocat, expert-comptable, etc.)
                      else if (clean.includes('honoraire') || clean.includes('avocat') || clean.includes('expert-comptable') || clean.includes('notaire') || clean.includes('consultant')) {
                        setExpCompteDebit(planComptable.some(c => c.numero === '621') ? '621' : '622');
                        setExpCompteTiers('401');
                        setExpCompteCredit('521');
                        setExpTva(true);
                      }

                      // 10. Frais bancaires, agios et commissions
                      else if (clean.includes('bancaire') || clean.includes('agios') || clean.includes('tenue compte') || clean.includes('commission') || clean.includes('virement')) {
                        setExpCompteDebit('631'); // Frais bancaires
                        setExpCompteTiers('401');
                        setExpCompteCredit('521');
                        setExpTva(false);
                      }

                      // 11. Impôts, taxes et patente
                      else if (clean.includes('impot') || clean.includes('impôt') || clean.includes('taxe') || clean.includes('patente') || clean.includes('dgi') || clean.includes('minfi') || clean.includes('is ') || clean === 'is' || clean.includes('imf')) {
                        setExpCompteDebit('64'); // Impôts et taxes
                        setExpCompteTiers('441'); // État
                        setExpCompteCredit('521');
                        setExpTva(false);
                      }

                      // 12. Immobilisations (matériel, informatique, bureau, bâtiment, terrain)
                      else if (clean.includes('achat matériel') || clean.includes('achat materiel') || clean.includes('acquisition') || clean.includes('ordinateur') || clean.includes('pc') || clean.includes('table') || clean.includes('banc') || clean.includes('terrain') || clean.includes('bâtiment') || clean.includes('batiment')) {
                        if (clean.includes('ordinateur') || clean.includes('pc') || clean.includes('informatique')) {
                          setExpCompteDebit(planComptable.some(c => c.numero === '245') ? '245' : '24');
                        } else if (clean.includes('bureau') || clean.includes('scolaire') || clean.includes('table') || clean.includes('banc') || clean.includes('mobilier')) {
                          setExpCompteDebit(planComptable.some(c => c.numero === '244') ? '244' : '24');
                        } else if (clean.includes('terrain')) {
                          setExpCompteDebit(planComptable.some(c => c.numero === '22') ? '22' : '24');
                        } else if (clean.includes('bâtiment') || clean.includes('batiment')) {
                          setExpCompteDebit(planComptable.some(c => c.numero === '23') ? '23' : '24');
                        } else {
                          setExpCompteDebit('24');
                        }
                        setExpCompteTiers('401');
                        setExpCompteCredit('521');
                        setExpTva(true);
                      }

                      // 13. Achat de fournitures courantes / fournitures de bureau
                      else if (clean.includes('fourniture') || clean.includes('consommable') || clean.includes('papeterie') || clean.includes('toner') || clean.includes('cartouche')) {
                        setExpCompteDebit('601'); // Achats de fournitures
                        setExpCompteTiers('401');
                        setExpCompteCredit('571');
                        setExpTva(true);
                      }
                    }} 
                    required 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Nom du Tiers (Bénéficiaire / Client)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: ENEO, CNPS, Nom du tiers..." 
                    value={expPartenaire} 
                    onChange={(e) => setExpPartenaire(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-semibold" 
                  />
                </div>
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
