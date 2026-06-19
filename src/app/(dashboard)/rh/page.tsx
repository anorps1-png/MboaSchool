'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  MembrePersonnel, 
  MasseSalarialeHistorique, 
  AbsenceRecord, 
  MouvementPersonnel, 
  EvaluationRH, 
  FormationRH,
  FicheDePaie 
} from '@/types/domain';
import { 
  getPersonnel, 
  getAbsences, 
  getMouvements, 
  getEvaluationsRH, 
  getFormations,
  updatePersonnel,
  insertAbsence,
  insertMouvement,
  insertPersonnel,
  getFichesDePaie,
  insertFichesDePaie,
  updateFichesDePaieStatut
} from '@/lib/queries/rh';
import { addEcritureComptable } from '@/lib/queries/finance';
import { calculerFicheDePaie, calculerPrimeAnciennete, getAnneesService, getTauxFromLocalStorage, genererEcrituresComptablesPaie, PLAFOND_CNPS } from '@/lib/payroll';
import { useEtablissement } from '@/contexts/etablissement-context';
import { 
  mockPersonnel, 
  mockAbsences, 
  mockMouvements, 
  mockEvaluationsRH, 
  mockFormations 
} from '@/mock/rh';

const isPeriodInAcademicYear = (period: string, academicYearName: string): boolean => {
  if (!period) return false;
  if (!academicYearName || !academicYearName.includes('/')) return true;
  const [startYearStr, endYearStr] = academicYearName.split('/');
  const startYear = parseInt(startYearStr, 10);
  const endYear = parseInt(endYearStr, 10);
  
  const [pYearStr, pMonthStr] = period.split('-');
  const pYear = parseInt(pYearStr, 10);
  const pMonth = parseInt(pMonthStr, 10);
  
  if (pYear === startYear && pMonth >= 9) return true;
  if (pYear === endYear && pMonth <= 8) return true;
  return false;
};

const isDateInAcademicYear = (dateStr: string, academicYearName: string): boolean => {
  if (!dateStr) return false;
  if (!academicYearName || !academicYearName.includes('/')) return true;
  const period = dateStr.slice(0, 7); // "YYYY-MM"
  return isPeriodInAcademicYear(period, academicYearName);
};

export default function RHPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'personnel' | 'masse' | 'mouvements' | 'evals' | 'comptes'>('dashboard');

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
  const [newCategorie, setNewCategorie] = useState<'Administration' | 'Enseignant' | 'Personnel d\'appui' | 'Technique'>('Administration');
  const [newContrat, setNewContrat] = useState<'CDI' | 'CDD' | 'Intérimaire' | 'Stagiaire'>('CDI');
  const [newSalaire, setNewSalaire] = useState('');
  const [newModePaiement, setNewModePaiement] = useState<'Banque' | 'Caisse'>('Banque');
  const [newDateEmbauche, setNewDateEmbauche] = useState(new Date().toISOString().split('T')[0]);

  // Payroll (Paie) States
  const [payrollPeriod, setPayrollPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [selectedForPayroll, setSelectedForPayroll] = useState<Set<string>>(new Set());
  const [payrollPrimes, setPayrollPrimes] = useState<Record<string, { transport: number; logement: number; autres: number }>>({});
  const [fichesDePaieCalculees, setFichesDePaieCalculees] = useState<FicheDePaie[]>([]);
  const [fichesDePaieHistorique, setFichesDePaieHistorique] = useState<FicheDePaie[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<FicheDePaie | null>(null);
  const [payrollCalculated, setPayrollCalculated] = useState(false);
  const [payrollProcessing, setPayrollProcessing] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<string | null>(null);

  // States for Employee Profile Sheet Modal
  const [selectedEmployee, setSelectedEmployee] = useState<MembrePersonnel | null>(null);
  const [profileModalTab, setProfileModalTab] = useState<'profile' | 'absences' | 'mouvements'>('profile');

  // Edit employee profile states
  const [editEmpNom, setEditEmpNom] = useState('');
  const [editEmpPrenom, setEditEmpPrenom] = useState('');
  const [editEmpEmail, setEditEmpEmail] = useState('');
  const [editEmpTel, setEditEmpTel] = useState('');
  const [editEmpSexe, setEditEmpSexe] = useState<'M' | 'F'>('M');
  const [editEmpCategorie, setEditEmpCategorie] = useState<'Administration' | 'Enseignant' | 'Personnel d\'appui' | 'Technique'>('Administration');
  const [editEmpContrat, setEditEmpContrat] = useState<'CDI' | 'CDD' | 'Intérimaire' | 'Stagiaire'>('CDI');
  const [editEmpSalaire, setEditEmpSalaire] = useState(0);
  const [editEmpModePaiement, setEditEmpModePaiement] = useState<'Banque' | 'Caisse'>('Banque');
  const [editEmpDateEmbauche, setEditEmpDateEmbauche] = useState('');
  const [editEmpStatut, setEditEmpStatut] = useState<'actif' | 'suspendu' | 'quitte'>('actif');

  // Add absence form states
  const [newAbsDateDebut, setNewAbsDateDebut] = useState(new Date().toISOString().split('T')[0]);
  const [newAbsDateFin, setNewAbsDateFin] = useState(new Date().toISOString().split('T')[0]);
  const [newAbsMotif, setNewAbsMotif] = useState<'Maladie' | 'Maternité' | 'Congé' | 'Injustifié' | 'Autre'>('Congé');

  // Add movement form states
  const [newMouvType, setNewMouvType] = useState<'depart_volontaire' | 'mutation' | 'licenciement'>('depart_volontaire');
  const [newMouvDate, setNewMouvDate] = useState(new Date().toISOString().split('T')[0]);
  const [newMouvDetails, setNewMouvDetails] = useState('');

  // States for Staff Accounts Tab
  const [profiles, setProfiles] = useState<any[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [newAccNom, setNewAccNom] = useState('');
  const [newAccEmail, setNewAccEmail] = useState('');
  const [newAccPassword, setNewAccPassword] = useState('');
  const [newAccRole, setNewAccRole] = useState<'directeur' | 'enseignant' | 'parent'>('enseignant');
  const [newAccPermissions, setNewAccPermissions] = useState<Record<string, boolean>>({
    dashboard: true,
    sections: false,
    classes: true,
    eleves: true,
    parents: false,
    enseignants: false,
    evaluations: true,
    finance: false,
    rh: false
  });
  const [createAccLoading, setCreateAccLoading] = useState(false);

  // States for Editing User Permissions
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<Record<string, boolean>>({});
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false);

  const handleRoleChange = (role: 'directeur' | 'enseignant' | 'parent') => {
    setNewAccRole(role);
    if (role === 'directeur') {
      setNewAccPermissions({
        dashboard: true,
        sections: true,
        classes: true,
        eleves: true,
        parents: true,
        enseignants: true,
        evaluations: true,
        finance: true,
        rh: true
      });
    } else if (role === 'enseignant') {
      setNewAccPermissions({
        dashboard: true,
        sections: false,
        classes: true,
        eleves: true,
        parents: false,
        enseignants: false,
        evaluations: true,
        finance: false,
        rh: false
      });
    } else if (role === 'parent') {
      setNewAccPermissions({
        dashboard: true,
        sections: false,
        classes: false,
        eleves: true,
        parents: true,
        enseignants: false,
        evaluations: false,
        finance: false,
        rh: false
      });
    }
  };

  const { etablissementId, academicYear } = useEtablissement();

  // Synchroniser la période de paie et le mois de mouvement avec l'année scolaire sélectionnée
  useEffect(() => {
    if (academicYear && academicYear.includes('/')) {
      const [startYear, endYear] = academicYear.split('/');
      const currentPeriod = new Date().toISOString().slice(0, 7); // "YYYY-MM"
      if (isPeriodInAcademicYear(currentPeriod, academicYear)) {
        setPayrollPeriod(currentPeriod);
        setMouvMonth(currentPeriod);
      } else {
        // Fallback à la fin de l'année scolaire
        setPayrollPeriod(`${endYear}-06`);
        setMouvMonth(`${endYear}-05`);
      }
      setPayrollCalculated(false);
      setFichesDePaieCalculees([]);
    }
  }, [academicYear]);

  // Filtrer les formations par année académique
  const filteredFormations = React.useMemo(() => {
    return formations.filter(f => isDateInAcademicYear(f.dateDebut, academicYear));
  }, [formations, academicYear]);

  // Filtrer les évaluations par année académique
  const filteredEvaluations = React.useMemo(() => {
    return evaluations.filter(e => isDateInAcademicYear(e.dateEvaluation, academicYear));
  }, [evaluations, academicYear]);

  // Filtrer l'historique des fiches de paie par année académique
  const filteredFichesDePaieHistorique = React.useMemo(() => {
    return fichesDePaieHistorique.filter(fiche => isPeriodInAcademicYear(fiche.periode, academicYear));
  }, [fichesDePaieHistorique, academicYear]);


  const loadProfiles = async () => {
    setProfilesLoading(true);
    try {
      const supabase = createClient();
      
      // Get current user email to filter out the administrator
      let currentUserEmail = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) currentUserEmail = user.email;
      } catch (e) {
        console.warn("Could not get auth user email:", e);
      }
      
      if (!currentUserEmail && typeof window !== 'undefined') {
        const offline = localStorage.getItem('mboaschool_offline_session');
        if (offline) {
          try {
            const parsed = JSON.parse(offline);
            if (parsed.email) currentUserEmail = parsed.email;
          } catch (e) {}
        }
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('etablissement_id', etablissementId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const filtered = (data || []).filter(p => p.email !== currentUserEmail);
      setProfiles(filtered);
    } catch (err) {
      console.warn("Failed to fetch profiles from Supabase, loading from localStorage fallback:", err);
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('mboaschool_profiles');
        if (stored) {
          const all = JSON.parse(stored);
          const filtered = all.filter((p: any) => p.etablissement_id === etablissementId || !p.etablissement_id);
          
          let currentUserEmail = null;
          const offline = localStorage.getItem('mboaschool_offline_session');
          if (offline) {
            try {
              const parsed = JSON.parse(offline);
              if (parsed.email) currentUserEmail = parsed.email;
            } catch (e) {}
          }
          
          const finalProfiles = currentUserEmail ? filtered.filter((p: any) => p.email !== currentUserEmail) : filtered;
          setProfiles(finalProfiles);
        } else {
          setProfiles([]);
        }
      }
    } finally {
      setProfilesLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccNom || !newAccEmail || !newAccPassword || newAccPassword.length < 6) {
      triggerToast("Veuillez renseigner un nom complet, un email valide et un mot de passe d'au moins 6 caractères.");
      return;
    }
    setCreateAccLoading(true);

    try {
      const supabase = createClient();
      const adminEtabId = etablissementId;

      // Create browser client with persistSession: false so it doesn't overwrite admin session
      const { createBrowserClient } = await import('@supabase/ssr');
      const tempSupabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: false
          }
        }
      );

      // Sign up the new user
      const { data: signUpData, error: authError } = await tempSupabase.auth.signUp({
        email: newAccEmail,
        password: newAccPassword,
        options: {
          data: {
            role: newAccRole,
            permissions: newAccPermissions,
            etablissement_id: adminEtabId,
            nom_complet: newAccNom
          }
        }
      });

      if (authError) throw authError;

      if (signUpData?.user) {
        // Fetch the profile created automatically by the database trigger
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', signUpData.user.id)
          .single();

        if (profileError) throw profileError;

        triggerToast(`Compte créé avec succès pour ${newAccEmail} !`);
        setProfiles([newProfile, ...profiles]);
      } else {
        throw new Error("La création d'utilisateur auth n'a pas retourné de données.");
      }

      setNewAccNom('');
      setNewAccEmail('');
      setNewAccPassword('');
    } catch (err: any) {
      console.warn("Supabase account creation failed, checking error type:", err);
      
      // If it's a real API auth error from Supabase, show the error toast instead of falling back to offline mode.
      if (err.status || err.code || (err.message && !err.message.includes('fetch') && !err.message.includes('network') && !err.message.includes('Failed to fetch'))) {
        let displayMsg = err.message;
        if (err.code === 'over_email_send_rate_limit' || (err.message && err.message.toLowerCase().includes('rate limit'))) {
          displayMsg = "Limite d'envoi d'emails dépassée par Supabase. Veuillez réessayer plus tard.";
        } else if (err.code === 'user_already_exists' || (err.message && err.message.toLowerCase().includes('already registered'))) {
          displayMsg = "Cette adresse email est déjà enregistrée.";
        } else if (err.code === 'weak_password') {
          displayMsg = "Le mot de passe choisi est trop faible.";
        } else if (err.code === 'email_address_invalid') {
          displayMsg = "L'adresse email saisie est invalide ou non autorisée.";
        }
        triggerToast(`Erreur lors de la création : ${displayMsg}`);
        setCreateAccLoading(false);
        return;
      }
      
      // Fallback local storage (completely offline or network unreachable)
      const newMockProfile = {
        id: `mock-${Date.now()}`,
        email: newAccEmail,
        password: newAccPassword, // Store password for fallback verification
        role: newAccRole,
        permissions: newAccPermissions,
        etablissement_id: etablissementId,
        created_at: new Date().toISOString(),
        nom_complet: newAccNom
      };
      
      const stored = localStorage.getItem('mboaschool_profiles');
      let currentProfiles = [];
      if (stored) {
        try {
          currentProfiles = JSON.parse(stored);
        } catch (e) {
          currentProfiles = [];
        }
      }
      const updatedProfiles = [newMockProfile, ...currentProfiles];
      localStorage.setItem('mboaschool_profiles', JSON.stringify(updatedProfiles));
      setProfiles(updatedProfiles.filter((p: any) => p.etablissement_id === etablissementId || !p.etablissement_id));
      
      triggerToast(`Compte (Local/Simulé) créé pour ${newAccEmail} !`);
      setNewAccNom('');
      setNewAccEmail('');
      setNewAccPassword('');
    } finally {
      setCreateAccLoading(false);
    }
  };

  const handleDeleteAccount = async (profileId: string, email: string) => {
    const profileToDelete = profiles.find(p => p.id === profileId);
    const isAdmin = profileToDelete?.role === 'admin';
    const profileEtabId = profileToDelete?.etablissement_id;

    const confirmMsg = isAdmin 
      ? `Êtes-vous sûr de vouloir supprimer définitivement le compte de ${email} ? ATTENTION : Cela supprimera TOUS les sous-comptes associés à cet établissement.`
      : `Êtes-vous sûr de vouloir supprimer définitivement le compte de ${email} ?`;

    if (!confirm(confirmMsg)) return;
    
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);
        
      if (error) throw error;
      
      triggerToast(`Compte de ${email} supprimé avec succès.`);
      
      if (isAdmin && profileEtabId) {
        // If an admin is deleted, all other profiles of the same establishment are deleted by the DB trigger.
        // We refresh the profile list.
        loadProfiles();
      } else {
        setProfiles(prev => prev.filter(p => p.id !== profileId));
      }
    } catch (err: any) {
      console.warn("Failed to delete account on Supabase, attempting local delete:", err);
      // Fallback local storage delete
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('mboaschool_profiles');
        if (stored) {
          const all = JSON.parse(stored);
          let updated = all;
          if (isAdmin && profileEtabId) {
            // Delete admin and all other profiles of the same establishment
            updated = all.filter((p: any) => p.id !== profileId && p.etablissement_id !== profileEtabId);
            triggerToast(`Compte administrateur et tous les sous-comptes associés (Locaux/Simulés) supprimés.`);
          } else {
            updated = all.filter((p: any) => p.id !== profileId);
            triggerToast(`Compte (Local/Simulé) de ${email} supprimé.`);
          }
          localStorage.setItem('mboaschool_profiles', JSON.stringify(updated));
          setProfiles(updated.filter((p: any) => p.etablissement_id === etablissementId || !p.etablissement_id));
        }
      }
    }
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    setIsUpdatingPermissions(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({ permissions: editingPermissions })
        .eq('id', editingProfile.id);

      if (error) throw error;

      triggerToast(`Habilitations de ${editingProfile.email} mises à jour avec succès.`);
      
      // Update in local state list
      setProfiles(prev => prev.map(p => p.id === editingProfile.id ? { ...p, permissions: editingPermissions } : p));
      setEditingProfile(null);
    } catch (err: any) {
      console.warn("Database permission update failed, updating locally:", err);

      // Offline fallback
      const stored = localStorage.getItem('mboaschool_profiles');
      if (stored) {
        try {
          const all = JSON.parse(stored);
          const updated = all.map((p: any) => p.id === editingProfile.id ? { ...p, permissions: editingPermissions } : p);
          localStorage.setItem('mboaschool_profiles', JSON.stringify(updated));
          
          setProfiles(updated.filter((p: any) => p.etablissement_id === etablissementId || !p.etablissement_id));
          triggerToast(`Habilitations (Local/Hors-ligne) de ${editingProfile.email} mises à jour.`);
        } catch (e) {
          console.error("Failed offline permissions update", e);
        }
      }
      setEditingProfile(null);
    } finally {
      setIsUpdatingPermissions(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && etablissementId) {
      const loadData = async () => {
        try {
          const pers = await getPersonnel(etablissementId);
          const mapped = (pers || []).map((p: any) => ({
            id: p.id,
            nom: p.nom,
            prenom: p.prenom,
            email: p.email,
            telephone: p.telephone,
            sexe: p.sexe,
            categorie: p.categorie,
            typeContrat: p.type_contrat,
            salaireDeBase: Number(p.salaire_de_base || 0),
            dateEmbauche: p.date_embauche,
            statut: p.statut,
            modePaiementPreferentiel: p.mode_paiement_preferentiel || 'Banque'
          }));
          setPersonnelList(mapped);
        } catch (error) {
          console.error("Error loading personnel:", error);
          setPersonnelList([]);
        }

        // 2. Absences
        try {
          const abs = await getAbsences(etablissementId);
          setAbsences(abs || []);
        } catch (error) {
          console.error("Error loading absences:", error);
          setAbsences([]);
        }

        // 3. Mouvements
        try {
          const mouvs = await getMouvements(etablissementId);
          setMouvements(mouvs || []);
        } catch (error) {
          console.error("Error loading movements:", error);
          setMouvements([]);
        }

        // 4. Evaluations
        try {
          const evs = await getEvaluationsRH(etablissementId);
          setEvaluations(evs || []);
        } catch (error) {
          console.error("Error loading evaluations:", error);
          setEvaluations([]);
        }

        // 5. Formations
        try {
          const forms = await getFormations(etablissementId);
          setFormations(forms || []);
        } catch (error) {
          console.error("Error loading formations:", error);
          setFormations([]);
        }

        // 6. Profiles
        try {
          await loadProfiles();
        } catch (error) {
          console.error("Error loading profiles:", error);
        }

        // Mocks for masseHistorique until DB is expanded for payroll charts
        const mockHist = [
          { periode: '2026-01', valeurTotal: 2640000, nombreSalaries: 12, salaireMoyen: 220000, interessement: 0, tauxCroissance: 0.5 },
          { periode: '2026-02', valeurTotal: 2640000, nombreSalaries: 12, salaireMoyen: 220000, interessement: 0, tauxCroissance: 0.0 },
          { periode: '2026-03', valeurTotal: 2640000, nombreSalaries: 12, salaireMoyen: 220000, interessement: 200000, tauxCroissance: 0.0 },
          { periode: '2026-04', valeurTotal: 2750000, nombreSalaries: 12, salaireMoyen: 229166, interessement: 0, tauxCroissance: 4.1 },
          { periode: '2026-05', valeurTotal: 2750000, nombreSalaries: 12, salaireMoyen: 229166, interessement: 0, tauxCroissance: 0.0 }
        ];
        setMasseHistorique(mockHist);
      };
      
      loadData();
    }
  }, [etablissementId]);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenProfile = (emp: MembrePersonnel) => {
    setSelectedEmployee(emp);
    setProfileModalTab('profile');
    setEditEmpNom(emp.nom);
    setEditEmpPrenom(emp.prenom);
    setEditEmpEmail(emp.email);
    setEditEmpTel(emp.telephone);
    setEditEmpSexe(emp.sexe);
    setEditEmpCategorie(emp.categorie);
    setEditEmpContrat(emp.typeContrat);
    setEditEmpSalaire(emp.salaireDeBase);
    setEditEmpModePaiement(emp.modePaiementPreferentiel || 'Banque');
    setEditEmpDateEmbauche(emp.dateEmbauche);
    setEditEmpStatut(emp.statut);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const updatedEmp = {
      nom: editEmpNom,
      prenom: editEmpPrenom,
      email: editEmpEmail,
      telephone: editEmpTel,
      sexe: editEmpSexe,
      categorie: editEmpCategorie,
      type_contrat: editEmpContrat,
      salaire_de_base: Number(editEmpSalaire) || 0,
      mode_paiement_preferentiel: editEmpModePaiement,
      date_embauche: editEmpDateEmbauche,
      statut: editEmpStatut,
    };

    try {
      const updated = await updatePersonnel(selectedEmployee.id, updatedEmp);
      const mapped: MembrePersonnel = {
        id: updated.id,
        nom: updated.nom,
        prenom: updated.prenom,
        email: updated.email,
        telephone: updated.telephone,
        sexe: updated.sexe,
        categorie: updated.categorie,
        typeContrat: updated.type_contrat,
        salaireDeBase: Number(updated.salaire_de_base),
        modePaiementPreferentiel: updated.mode_paiement_preferentiel || editEmpModePaiement,
        dateEmbauche: updated.date_embauche,
        statut: updated.statut
      };
      const updatedList = personnelList.map(p => p.id === selectedEmployee.id ? mapped : p);
      setPersonnelList(updatedList);
      setSelectedEmployee(mapped);

      // Sync with enseignants table
      if (editEmpCategorie === 'Enseignant') {
        const supabaseClient = createClient();
        const { data: existingEns } = await supabaseClient
          .from('enseignants')
          .select('id')
          .eq('email', selectedEmployee.email)
          .maybeSingle();

        const ensData = {
          nom: editEmpNom,
          prenom: editEmpPrenom,
          email: editEmpEmail,
          telephone: editEmpTel,
          sexe: editEmpSexe,
          statut: editEmpStatut === 'suspendu' ? 'en_conge' : editEmpStatut,
          type_contrat: editEmpContrat,
          categorie: 'Enseignant',
          salaire_mensuel: Number(editEmpSalaire) || 0,
          date_embauche: editEmpDateEmbauche,
          etablissement_id: etablissementId
        };

        if (existingEns) {
          await supabaseClient
            .from('enseignants')
            .update(ensData)
            .eq('id', existingEns.id);
        } else {
          const matricule = `PROF-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
          await supabaseClient
            .from('enseignants')
            .insert([{ ...ensData, matricule, matiere_principale: 'Général' }]);
        }
      } else if (selectedEmployee.categorie === 'Enseignant') {
        const supabaseClient = createClient();
        await supabaseClient
          .from('enseignants')
          .delete()
          .eq('email', selectedEmployee.email);
      }

      triggerToast(`Fiche de ${mapped.prenom} ${mapped.nom} mise à jour !`);
    } catch (err: any) {
      alert("Erreur lors de la mise à jour : " + err.message);
    }
  };

  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = e.getTime() - s.getTime();
    if (diffTime < 0) return 0;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleAddAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const duration = calculateDays(newAbsDateDebut, newAbsDateFin);
    if (duration <= 0) {
      triggerToast("La date de fin doit être après ou égale à la date de début.");
      return;
    }

    const newAbsData = {
      personnel_id: selectedEmployee.id,
      nom_personnel: `${selectedEmployee.nom} ${selectedEmployee.prenom}`,
      date_debut: newAbsDateDebut,
      date_fin: newAbsDateFin,
      motif: newAbsMotif,
      duree_jours: duration,
    };

    try {
      const data = await insertAbsence(newAbsData, etablissementId!);
      if (data && data.length > 0) {
        const a = data[0];
        const newAbs: AbsenceRecord = {
          id: a.id,
          personnelId: a.personnel_id,
          nomPersonnel: a.nom_personnel,
          dateDebut: a.date_debut,
          dateFin: a.date_fin,
          motif: a.motif,
          dureeJours: a.duree_jours
        };
        setAbsences([newAbs, ...absences]);
        triggerToast("Absence enregistrée avec succès !");
      }
    } catch (err: any) {
      alert("Erreur lors de l'enregistrement de l'absence : " + err.message);
    }

    setNewAbsDateDebut(new Date().toISOString().split('T')[0]);
    setNewAbsDateFin(new Date().toISOString().split('T')[0]);
    setNewAbsMotif('Congé');
  };

  const handleAddMouvement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    if (!newMouvDetails) {
      triggerToast("Veuillez saisir les détails du mouvement.");
      return;
    }

    let updatedStatut = editEmpStatut;
    if (newMouvType === 'depart_volontaire' || newMouvType === 'licenciement') {
      updatedStatut = 'quitte';
      setEditEmpStatut('quitte');
    }

    const newMouvData = {
      personnel_id: selectedEmployee.id,
      nom_personnel: `${selectedEmployee.nom} ${selectedEmployee.prenom}`,
      type: newMouvType,
      date: newMouvDate,
      details: newMouvDetails,
    };

    try {
      // Met à jour le statut du personnel
      await updatePersonnel(selectedEmployee.id, { statut: updatedStatut });
      const data = await insertMouvement(newMouvData, etablissementId!);
      
      if (data && data.length > 0) {
        const m = data[0];
        const newMouv: MouvementPersonnel = {
          id: m.id,
          personnelId: m.personnel_id,
          nomPersonnel: m.nom_personnel,
          type: m.type,
          date: m.date,
          details: m.details
        };
        setMouvements([newMouv, ...mouvements]);
        
        // Mettre à jour la fiche en local
        const updatedEmp = { ...selectedEmployee, statut: updatedStatut };
        setSelectedEmployee(updatedEmp);
        setPersonnelList(personnelList.map(p => p.id === selectedEmployee.id ? updatedEmp : p));
        triggerToast(`Mouvement ${newMouvType} enregistré.`);
      }
    } catch (err: any) {
      alert("Erreur lors du mouvement : " + err.message);
    }

    setNewMouvType('depart_volontaire');
    setNewMouvDate(new Date().toISOString().split('T')[0]);
    setNewMouvDetails('');
  };

  // Add a personnel
  const handleAddPersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNom || !newPrenom || !newEmail || !newSalaire) {
      triggerToast("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    const newEmpData = {
      nom: newNom,
      prenom: newPrenom,
      email: newEmail,
      telephone: newTel || '+237 600 00 00 00',
      sexe: newSexe,
      categorie: newCategorie,
      type_contrat: newContrat,
      salaire_de_base: Number(newSalaire),
      mode_paiement_preferentiel: newModePaiement,
      date_embauche: newDateEmbauche,
      statut: 'actif'
    };

    try {
      const p = await insertPersonnel(newEmpData, etablissementId!);
      const newEmp: MembrePersonnel = {
        id: p.id,
        nom: p.nom,
        prenom: p.prenom,
        email: p.email,
        telephone: p.telephone,
        sexe: p.sexe,
        categorie: p.categorie,
        typeContrat: p.type_contrat,
        salaireDeBase: Number(p.salaire_de_base),
        modePaiementPreferentiel: p.mode_paiement_preferentiel || newModePaiement,
        dateEmbauche: p.date_embauche,
        statut: p.statut
      };
      
      setPersonnelList([...personnelList, newEmp]);

      // If category is 'Enseignant', also insert into enseignants table
      if (newCategorie === 'Enseignant') {
        const supabaseClient = createClient();
        const matricule = `PROF-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        const newEnsData = {
          matricule,
          nom: newNom,
          prenom: newPrenom,
          sexe: newSexe,
          telephone: newTel || '+237 600 00 00 00',
          email: newEmail,
          matiere_principale: 'Général',
          salaire_mensuel: Number(newSalaire),
          statut: 'actif',
          type_contrat: newContrat,
          categorie: 'Enseignant',
          date_embauche: newDateEmbauche,
          etablissement_id: etablissementId
        };
        await supabaseClient.from('enseignants').insert([newEnsData]);
      }

      // Ajouter mouvement de recrutement
      const newMouvData = {
        personnel_id: newEmp.id,
        nom_personnel: `${newEmp.nom} ${newEmp.prenom}`,
        type: 'embauche',
        date: newEmp.dateEmbauche,
        details: `Embauche en contrat ${newEmp.typeContrat} (${newEmp.categorie})`
      };
      const dataMouv = await insertMouvement(newMouvData, etablissementId!);
      if (dataMouv && dataMouv.length > 0) {
        const m = dataMouv[0];
        const newMouv: MouvementPersonnel = {
          id: m.id,
          personnelId: m.personnel_id,
          nomPersonnel: m.nom_personnel,
          type: m.type,
          date: m.date,
          details: m.details
        };
        setMouvements([newMouv, ...mouvements]);
      }

      setNewNom('');
      setNewPrenom('');
      setNewEmail('');
      setNewTel('');
      setNewSexe('M');
      setNewCategorie('Administration');
      setNewContrat('CDI');
      setNewSalaire('');
      setNewModePaiement('Banque');
      setNewDateEmbauche(new Date().toISOString().split('T')[0]);
      setShowAddModal(false);
      triggerToast(`Personnel ${newPrenom} ${newNom} ajouté avec succès !`);
    } catch (err: any) {
      alert("Erreur lors du recrutement : " + err.message);
    }
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
  const totalTrainingCosts = filteredFormations.reduce((sum, f) => sum + f.coutTotal, 0);
  const trainingPayrollRatio = totalMonthlyPayroll > 0 ? (totalTrainingCosts / (totalMonthlyPayroll * 12)) * 100 : 0; // Cost vs estimated annual payroll

  // Teacher evaluation averages
  const avgTeacherScore = filteredEvaluations.length > 0 ? filteredEvaluations.reduce((sum, ev) => sum + ev.noteMoyenne, 0) / filteredEvaluations.length : 0;
  const avgTeacherAdherenceJob = filteredEvaluations.length > 0 ? filteredEvaluations.reduce((sum, ev) => sum + ev.adherenceJobRole, 0) / filteredEvaluations.length : 0;
  const avgTeacherAdherenceVal = filteredEvaluations.length > 0 ? filteredEvaluations.reduce((sum, ev) => sum + ev.adherenceValeurs, 0) / filteredEvaluations.length : 0;


  // Salariés non encore payés pour la période courante
  const unpaidStaff = React.useMemo(() => {
    return activeStaff.filter(emp => !fichesDePaieHistorique.some(f => f.personnelId === emp.id && f.periode === payrollPeriod));
  }, [activeStaff, fichesDePaieHistorique, payrollPeriod]);

  // Si on a au moins une fiche de paie historique payée sur la période courante, ou si on a cliqué sur Calculer
  const showCalculatedCols = React.useMemo(() => {
    const hasAnyPaid = activeStaff.some(emp => fichesDePaieHistorique.some(f => f.personnelId === emp.id && f.periode === payrollPeriod));
    return payrollCalculated || hasAnyPaid;
  }, [payrollCalculated, activeStaff, fichesDePaieHistorique, payrollPeriod]);

  // ============================================================
  // PAYROLL HANDLERS
  // ============================================================

  const toggleEmployeeSelection = (id: string) => {
    setSelectedForPayroll(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setPayrollCalculated(false);
  };

  const toggleSelectAllPayroll = () => {
    if (selectedForPayroll.size === unpaidStaff.length) {
      setSelectedForPayroll(new Set());
    } else {
      setSelectedForPayroll(new Set(unpaidStaff.map(e => e.id)));
    }
    setPayrollCalculated(false);
  };

  const updatePrime = (empId: string, field: 'transport' | 'logement' | 'autres', value: number) => {
    setPayrollPrimes(prev => ({
      ...prev,
      [empId]: { ...(prev[empId] || { transport: 0, logement: 0, autres: 0 }), [field]: value }
    }));
    setPayrollCalculated(false);
  };

  const handleCalculerPaie = () => {
    if (selectedForPayroll.size === 0) {
      triggerToast("Veuillez sélectionner au moins un employé.");
      return;
    }

    const taux = getTauxFromLocalStorage();
    const fiches: FicheDePaie[] = [];

    unpaidStaff.filter(e => selectedForPayroll.has(e.id)).forEach(emp => {
      const primes = payrollPrimes[emp.id] || { transport: 0, logement: 0, autres: 0 };
      const primeAnc = calculerPrimeAnciennete(emp.salaireDeBase, emp.dateEmbauche);

      const resultat = calculerFicheDePaie({
        salaireDeBase: emp.salaireDeBase,
        primeTransport: primes.transport,
        primeLogement: primes.logement,
        primeAnciennete: primeAnc,
        autresPrimes: primes.autres,
        taux,
      });

      fiches.push({
        id: `paie-${emp.id}-${payrollPeriod}`,
        personnelId: emp.id,
        nomPersonnel: `${emp.prenom} ${emp.nom}`,
        periode: payrollPeriod,
        datePaiement: new Date().toISOString().split('T')[0],
        salaireDeBase: emp.salaireDeBase,
        primeTransport: primes.transport,
        primeLogement: primes.logement,
        primeAnciennete: primeAnc,
        autresPrimes: primes.autres,
        modePaiement: emp.modePaiementPreferentiel || 'Banque',
        ...resultat,
        statut: 'brouillon',
      });
    });

    setFichesDePaieCalculees(fiches);
    setPayrollCalculated(true);
    triggerToast(`Paie calculée pour ${fiches.length} employé(s) !`);
  };

  const handleValiderPaie = async () => {
    if (fichesDePaieCalculees.length === 0) {
      triggerToast("Veuillez d'abord calculer la paie.");
      return;
    }
    if (!confirm(`Confirmez-vous le paiement de ${fichesDePaieCalculees.length} employé(s) pour la période ${payrollPeriod} ?`)) return;

    setPayrollProcessing(true);
    try {
      const fichesPaye = fichesDePaieCalculees.map(f => ({ ...f, statut: 'paye' as const }));

      // 1. Sauvegarder les fiches de paie en base
      try {
        const fichesDB = fichesPaye.map(f => ({
          personnel_id: f.personnelId,
          nom_personnel: f.nomPersonnel,
          periode: f.periode,
          date_paiement: f.datePaiement,
          salaire_de_base: f.salaireDeBase,
          prime_transport: f.primeTransport,
          prime_logement: f.primeLogement,
          prime_anciennete: f.primeAnciennete,
          autres_primes: f.autresPrimes,
          salaire_brut: f.salaireBrut,
          cnps_salariale: f.cnpsSalariale,
          cfc_salariale: f.cfcSalariale,
          irpp: f.irpp,
          cac: f.cac,
          rav: f.rav,
          total_retenues: f.totalRetenues,
          cnps_patronale: f.cnpsPatronale,
          cfc_patronale: f.cfcPatronale,
          fne: f.fne,
          total_charges_patronales: f.totalChargesPatronales,
          net_a_payer: f.netAPayer,
          mode_paiement: f.modePaiement,
          statut: 'paye',
        }));
        await insertFichesDePaie(fichesDB, etablissementId!);
      } catch (dbErr) {
        console.warn('Sauvegarde DB fiches de paie échouée, fallback localStorage:', dbErr);
      }

      // 2. Sauvegarder en localStorage (fallback + historique local)
      const storageKey = `mboaschool_fiches_paie_${etablissementId}`;
      const stored = localStorage.getItem(storageKey);
      const existingFiches: FicheDePaie[] = stored ? JSON.parse(stored) : [];
      const updatedFiches = [...fichesPaye, ...existingFiches.filter(f => !fichesPaye.some(fp => fp.personnelId === f.personnelId && fp.periode === f.periode))];
      localStorage.setItem(storageKey, JSON.stringify(updatedFiches));

      // 3. Générer les écritures comptables OHADA
      try {
        const compteBanque = localStorage.getItem('setting_default_bank_acc') || '521';
        const compteCaisse = localStorage.getItem('setting_default_cash_acc') || '571';
        const { ecriture, lignes } = genererEcrituresComptablesPaie(fichesPaye, compteBanque, compteCaisse);
        await addEcritureComptable(
          { date: new Date().toISOString().split('T')[0], ...ecriture, partenaire: 'Personnel' },
          lignes.map(l => ({ compteNumero: l.compteNumero, debit: l.debit, credit: l.credit })),
          etablissementId!
        );
        triggerToast(`✅ ${fichesPaye.length} bulletin(s) validé(s) et comptabilité mouvementée !`);
      } catch (comptaErr: any) {
        console.warn('Écriture comptable échouée (les comptes OHADA existent-ils ?):', comptaErr);
        const errMsg = comptaErr?.message || (typeof comptaErr === 'object' ? JSON.stringify(comptaErr) : String(comptaErr));
        triggerToast(`${fichesPaye.length} bulletin(s) validé(s). ⚠️ Écriture comptable non créée : ${errMsg}`);
      }

      setFichesDePaieHistorique(updatedFiches);
      setFichesDePaieCalculees([]);
      setSelectedForPayroll(new Set());
      setPayrollCalculated(false);
    } catch (err: any) {
      alert('Erreur lors de la validation : ' + err.message);
    } finally {
      setPayrollProcessing(false);
    }
  };

  const handlePrintPayslip = (fiche: FicheDePaie) => {
    const schoolName = localStorage.getItem('mboaschool_current_school') || 'Établissement';
    const schoolAddress = localStorage.getItem('setting_school_address') || '';
    const schoolPhone = localStorage.getItem('setting_school_phone') || '';
    const emp = personnelList.find(e => e.id === fiche.personnelId);
    const taux = getTauxFromLocalStorage();
    const anneesServ = emp ? getAnneesService(emp.dateEmbauche) : 0;
    const periodeLabel = new Date(fiche.periode + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const fmt = (v: number) => new Intl.NumberFormat('fr-FR').format(v);

    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bulletin de Paie - ${fiche.nomPersonnel}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1e293b; font-size: 11px; }
      .header { display: flex; justify-content: space-between; border-bottom: 3px solid #4f46e5; padding-bottom: 15px; margin-bottom: 15px; }
      .header-left, .header-right { max-width: 48%; }
      .header h1 { font-size: 18px; color: #4f46e5; margin-bottom: 2px; }
      .header h2 { font-size: 14px; color: #1e293b; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
      .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; }
      .info-box h3 { font-size: 9px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 6px; font-weight: 700; }
      .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
      .info-label { color: #64748b; }
      .info-value { font-weight: 700; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
      th { background: #4f46e5; color: white; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
      th:last-child { text-align: right; }
      td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
      td:last-child { text-align: right; font-family: 'Courier New', monospace; font-weight: 600; }
      .section-title { background: #f1f5f9; font-weight: 700; color: #334155; }
      .total-row { background: #eef2ff; font-weight: 800; font-size: 12px; }
      .net-row { background: #4f46e5; color: white; font-weight: 800; font-size: 14px; }
      .net-row td { border: none; padding: 8px; }
      .charges-section { margin-top: 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 10px; }
      .charges-section h3 { font-size: 10px; color: #92400e; text-transform: uppercase; margin-bottom: 6px; font-weight: 700; }
      .footer { margin-top: 20px; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      .signature-zone { margin-top: 30px; display: flex; justify-content: space-between; }
      .signature-box { width: 45%; text-align: center; }
      .signature-box p { font-size: 10px; color: #64748b; margin-bottom: 40px; }
      .signature-box .line { border-top: 1px solid #94a3b8; padding-top: 4px; font-size: 9px; color: #94a3b8; }
      @media print { body { padding: 15px; } }
    </style></head><body>
    <div class="header">
      <div class="header-left">
        <h1>${schoolName}</h1>
        <p>${schoolAddress}</p>
        <p>${schoolPhone}</p>
      </div>
      <div class="header-right" style="text-align:right">
        <h2>BULLETIN DE PAIE</h2>
        <p style="font-weight:700;color:#4f46e5;font-size:13px">${periodeLabel.charAt(0).toUpperCase() + periodeLabel.slice(1)}</p>
        <p>Date d'émission : ${new Date(fiche.datePaiement).toLocaleDateString('fr-FR')}</p>
      </div>
    </div>
    <div class="info-grid">
      <div class="info-box">
        <h3>Informations Employeur</h3>
        <div class="info-row"><span class="info-label">Raison sociale</span><span class="info-value">${schoolName}</span></div>
        <div class="info-row"><span class="info-label">Adresse</span><span class="info-value">${schoolAddress}</span></div>
      </div>
      <div class="info-box">
        <h3>Informations Employé</h3>
        <div class="info-row"><span class="info-label">Nom complet</span><span class="info-value">${fiche.nomPersonnel}</span></div>
        <div class="info-row"><span class="info-label">Catégorie</span><span class="info-value">${emp?.categorie || '—'}</span></div>
        <div class="info-row"><span class="info-label">Contrat</span><span class="info-value">${emp?.typeContrat || '—'}</span></div>
        <div class="info-row"><span class="info-label">Date d'embauche</span><span class="info-value">${emp ? new Date(emp.dateEmbauche).toLocaleDateString('fr-FR') : '—'}</span></div>
        <div class="info-row"><span class="info-label">Ancienneté</span><span class="info-value">${anneesServ} an(s)</span></div>
      </div>
    </div>
    <table>
      <thead><tr><th colspan="2">Éléments de rémunération</th><th>Montant (FCFA)</th></tr></thead>
      <tbody>
        <tr><td colspan="2">Salaire de base</td><td>${fmt(fiche.salaireDeBase)}</td></tr>
        <tr><td colspan="2">Prime de transport</td><td>${fmt(fiche.primeTransport)}</td></tr>
        <tr><td colspan="2">Prime de logement</td><td>${fmt(fiche.primeLogement)}</td></tr>
        <tr><td colspan="2">Prime d'ancienneté (${anneesServ >= 2 ? Math.min(anneesServ * 2, 30) : 0}%)</td><td>${fmt(fiche.primeAnciennete)}</td></tr>
        <tr><td colspan="2">Autres primes et indemnités</td><td>${fmt(fiche.autresPrimes)}</td></tr>
        <tr class="total-row"><td colspan="2">SALAIRE BRUT</td><td>${fmt(fiche.salaireBrut)}</td></tr>
      </tbody>
    </table>
    <table>
      <thead><tr><th>Retenues salariales</th><th>Base</th><th>Taux</th><th>Montant (FCFA)</th></tr></thead>
      <tbody>
        <tr><td>CNPS — Pension Vieillesse</td><td>${fmt(Math.min(fiche.salaireBrut, PLAFOND_CNPS))}</td><td>${taux.cnpsEmployeeRate}%</td><td>${fmt(fiche.cnpsSalariale)}</td></tr>
        <tr><td>CFC — Crédit Foncier</td><td>${fmt(fiche.salaireBrut)}</td><td>${taux.cfcEmployeeRate}%</td><td>${fmt(fiche.cfcSalariale)}</td></tr>
        <tr><td>IRPP — Impôt sur le Revenu</td><td colspan="2">Barème progressif</td><td>${fmt(fiche.irpp)}</td></tr>
        <tr><td>CAC — Centimes Add. Communaux</td><td>${fmt(fiche.irpp)}</td><td>${taux.cacRate}%</td><td>${fmt(fiche.cac)}</td></tr>
        <tr><td>RAV — Redevance Audio Visuelle</td><td colspan="2">Forfait mensuel</td><td>${fmt(fiche.rav)}</td></tr>
        <tr class="total-row"><td colspan="3">TOTAL RETENUES</td><td>${fmt(fiche.totalRetenues)}</td></tr>
      </tbody>
    </table>
    <table>
      <tbody>
        <tr class="net-row"><td colspan="3">NET À PAYER</td><td>${fmt(fiche.netAPayer)} FCFA</td></tr>
      </tbody>
    </table>
    <div class="charges-section">
      <h3>Charges patronales (pour information)</h3>
      <table style="margin:0">
        <tr><td>CNPS Patronale</td><td style="text-align:right">${fmt(Math.min(fiche.salaireBrut, PLAFOND_CNPS))}</td><td style="text-align:right">${taux.cnpsEmployerRate}%</td><td style="text-align:right;font-family:monospace;font-weight:600">${fmt(fiche.cnpsPatronale)}</td></tr>
        <tr><td>CFC Patronale</td><td style="text-align:right">${fmt(fiche.salaireBrut)}</td><td style="text-align:right">${taux.cfcEmployerRate}%</td><td style="text-align:right;font-family:monospace;font-weight:600">${fmt(fiche.cfcPatronale)}</td></tr>
        <tr><td>FNE — Fonds National Emploi</td><td style="text-align:right">${fmt(fiche.salaireBrut)}</td><td style="text-align:right">${taux.fneRate}%</td><td style="text-align:right;font-family:monospace;font-weight:600">${fmt(fiche.fne)}</td></tr>
        <tr class="total-row"><td colspan="3">TOTAL CHARGES PATRONALES</td><td style="text-align:right">${fmt(fiche.totalChargesPatronales)}</td></tr>
      </table>
    </div>
    <div class="signature-zone">
      <div class="signature-box"><p>L'Employeur</p><div class="line">Cachet et signature</div></div>
      <div class="signature-box"><p>L'Employé</p><div class="line">Signature (Lu et approuvé)</div></div>
    </div>
    <div class="footer">
      <span>Document confidentiel — Bulletin de paie conforme aux normes CNPS Cameroun</span>
      <span>${schoolName} — ${periodeLabel}</span>
    </div>
    </body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  // Load payroll history on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && etablissementId) {
      const storageKey = `mboaschool_fiches_paie_${etablissementId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try { setFichesDePaieHistorique(JSON.parse(stored)); } catch (e) {}
      }
      // Also try to load from DB
      getFichesDePaie(etablissementId).then(data => {
        if (data && data.length > 0) {
          const mapped: FicheDePaie[] = data.map((d: any) => ({
            id: d.id, personnelId: d.personnel_id, nomPersonnel: d.nom_personnel,
            periode: d.periode, datePaiement: d.date_paiement,
            salaireDeBase: Number(d.salaire_de_base), primeTransport: Number(d.prime_transport),
            primeLogement: Number(d.prime_logement), primeAnciennete: Number(d.prime_anciennete),
            autresPrimes: Number(d.autres_primes), salaireBrut: Number(d.salaire_brut),
            cnpsSalariale: Number(d.cnps_salariale), cfcSalariale: Number(d.cfc_salariale),
            irpp: Number(d.irpp), cac: Number(d.cac), rav: Number(d.rav),
            totalRetenues: Number(d.total_retenues), cnpsPatronale: Number(d.cnps_patronale),
            cfcPatronale: Number(d.cfc_patronale), fne: Number(d.fne),
            totalChargesPatronales: Number(d.total_charges_patronales),
            netAPayer: Number(d.net_a_payer), statut: d.statut,
          }));
          setFichesDePaieHistorique(mapped);
        }
      }).catch(() => {});
    }
  }, [etablissementId]);

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

  const totalGross = fichesDePaieCalculees.reduce((sum, f) => sum + (f.salaireBrut || 0), 0);
  const totalRetenues = fichesDePaieCalculees.reduce((sum, f) => sum + (f.totalRetenues || 0), 0);
  const totalEmployerTaxes = fichesDePaieCalculees.reduce((sum, f) => sum + (f.totalChargesPatronales || 0), 0);
  const totalNet = fichesDePaieCalculees.reduce((sum, f) => sum + (f.netAPayer || 0), 0);

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
          { id: 'masse', label: 'Paie & Rémunérations' },
          { id: 'mouvements', label: 'Absences & Mouvements' },
          { id: 'evals', label: 'Évaluations & Formations' },
          { id: 'comptes', label: 'Comptes & Habilitations' }
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
                {filteredFormations.map(f => (
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
                {filteredFormations.length === 0 && (
                  <div className="text-center text-slate-400 py-6 text-xs">Aucune formation enregistrée.</div>
                )}
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
                  <th className="px-6 py-4 text-right">Actions</th>
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
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        emp.statut === 'actif' ? 'bg-emerald-50 text-emerald-700' :
                        emp.statut === 'quitte' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {emp.statut === 'actif' ? 'Actif' : emp.statut === 'quitte' ? 'Quitté' : emp.statut || 'Suspendu'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenProfile(emp)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
                      >
                        Fiche Employé
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredPersonnel.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">Aucun membre du personnel trouvé.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------- TAB: PAIE & RÉMUNÉRATIONS -------------------- */}
      {activeTab === 'masse' && (
        <div className="space-y-6">
          {/* Period Selector + Actions Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-600"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span className="text-xs font-bold text-slate-500 uppercase">Période de paie :</span>
              </div>
              <input
                type="month"
                value={payrollPeriod}
                onChange={(e) => { setPayrollPeriod(e.target.value); setPayrollCalculated(false); setFichesDePaieCalculees([]); }}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-black font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectAllPayroll}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                {selectedForPayroll.size === unpaidStaff.length ? 'Tout désélectionner' : 'Sélectionner tous'}
              </button>
              <button
                onClick={handleCalculerPaie}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                Calculer la paie
              </button>
              {payrollCalculated && (
                <>
                  <button
                    onClick={handleValiderPaie}
                    disabled={payrollProcessing}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    {payrollProcessing ? 'Traitement...' : 'Valider & Payer'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Payroll Table (3 cols) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-3">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-black">Traitement des Salaires</h3>
                  <p className="text-xs text-slate-500">{selectedForPayroll.size} employé(s) sélectionné(s) sur {unpaidStaff.length} à payer</p>
                </div>
                {payrollCalculated && (
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Paie calculée
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase bg-slate-50/20">
                      <th className="px-3 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedForPayroll.size === unpaidStaff.length && unpaidStaff.length > 0}
                          onChange={toggleSelectAllPayroll}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="px-3 py-3">Employé</th>
                      <th className="px-3 py-3 text-right">Salaire Base</th>
                      <th className="px-3 py-3 text-right">P. Transport</th>
                      <th className="px-3 py-3 text-right">P. Logement</th>
                      <th className="px-3 py-3 text-right">Autres</th>
                      {showCalculatedCols && (
                        <>
                          <th className="px-3 py-3 text-right">Brut</th>
                          <th className="px-3 py-3 text-right">Retenues</th>
                          <th className="px-3 py-3 text-right text-indigo-600">Net à Payer</th>
                        </>
                      )}
                      {showCalculatedCols && <th className="px-3 py-3 text-center">Fiche</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeStaff.map(emp => {
                      // Chercher d'abord si une fiche de paie a déjà été validée et enregistrée pour cet employé et ce mois
                      const ficheHistorique = fichesDePaieHistorique.find(
                        f => f.personnelId === emp.id && f.periode === payrollPeriod
                      );
                      const estPaye = !!ficheHistorique;
                      const fiche = estPaye ? ficheHistorique : fichesDePaieCalculees.find(f => f.personnelId === emp.id);
                      
                      const primes = payrollPrimes[emp.id] || { transport: 0, logement: 0, autres: 0 };
                      const isSelected = selectedForPayroll.has(emp.id);
                      return (
                        <tr key={emp.id} className={`transition-colors ${estPaye ? 'bg-emerald-50/10' : (isSelected ? 'bg-indigo-50/30' : 'hover:bg-slate-50/30')}`}>
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={estPaye ? true : isSelected}
                              disabled={estPaye}
                              onChange={() => !estPaye && toggleEmployeeSelection(emp.id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 w-4 h-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-semibold text-slate-800 text-black text-xs">{emp.nom} {emp.prenom}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                emp.categorie === 'Enseignant' ? 'bg-indigo-50 text-indigo-700' :
                                emp.categorie === 'Administration' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                              }`}>{emp.categorie}</span>
                              <span>{emp.typeContrat}</span>
                              {getAnneesService(emp.dateEmbauche) >= 2 && (
                                <span className="text-emerald-600 font-bold">+{Math.min(getAnneesService(emp.dateEmbauche) * 2, 30)}% anc.</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-black font-semibold text-xs">{formatMoney(emp.salaireDeBase)}</td>
                          <td className="px-3 py-2">
                            {estPaye ? (
                              <div className="w-20 px-2 py-1 text-xs text-slate-500 text-right font-mono font-semibold">
                                {formatMoney(fiche?.primeTransport || 0)}
                              </div>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                value={primes.transport || ''}
                                onChange={(e) => updatePrime(emp.id, 'transport', Number(e.target.value) || 0)}
                                placeholder="0"
                                className="w-20 px-2 py-1 border border-slate-200 rounded text-xs text-black text-right font-mono outline-none focus:border-indigo-500"
                              />
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {estPaye ? (
                              <div className="w-20 px-2 py-1 text-xs text-slate-500 text-right font-mono font-semibold">
                                {formatMoney(fiche?.primeLogement || 0)}
                              </div>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                value={primes.logement || ''}
                                onChange={(e) => updatePrime(emp.id, 'logement', Number(e.target.value) || 0)}
                                placeholder="0"
                                className="w-20 px-2 py-1 border border-slate-200 rounded text-xs text-black text-right font-mono outline-none focus:border-indigo-500"
                              />
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {estPaye ? (
                              <div className="w-20 px-2 py-1 text-xs text-slate-500 text-right font-mono font-semibold">
                                {formatMoney(fiche?.autresPrimes || 0)}
                              </div>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                value={primes.autres || ''}
                                onChange={(e) => updatePrime(emp.id, 'autres', Number(e.target.value) || 0)}
                                placeholder="0"
                                className="w-20 px-2 py-1 border border-slate-200 rounded text-xs text-black text-right font-mono outline-none focus:border-indigo-500"
                              />
                            )}
                          </td>
                          {showCalculatedCols && fiche && (
                            <>
                              <td className="px-3 py-3 text-right font-mono text-xs font-semibold text-slate-700">{formatMoney(fiche.salaireBrut)}</td>
                              <td className="px-3 py-3 text-right font-mono text-xs font-semibold text-rose-600">-{formatMoney(fiche.totalRetenues)}</td>
                              <td className="px-3 py-3 text-right font-mono text-xs font-black text-indigo-700">
                                <div className="flex flex-col items-end">
                                  <span>{formatMoney(fiche.netAPayer)}</span>
                                  {estPaye && (
                                    <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded font-bold uppercase mt-0.5">Payé</span>
                                  )}
                                </div>
                              </td>
                            </>
                          )}
                          {showCalculatedCols && fiche && (
                            <td className="px-3 py-3 text-center flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedPayslip(fiche)}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold transition-colors cursor-pointer"
                              >
                                Voir
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePrintPayslip(fiche)}
                                className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-bold transition-colors cursor-pointer"
                              >
                                Imprimer
                              </button>
                            </td>
                          )}
                          {showCalculatedCols && !fiche && (
                            <>
                              <td className="px-3 py-3 text-center text-slate-300 text-xs" colSpan={4}>—</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Résumé de la Paie Sidebar */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-fit">
              <div>
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-bold text-slate-800 text-black">Résumé de la Paie</h3>
                  <p className="text-xs text-slate-500">Période: {payrollPeriod}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                    <span className="text-slate-500 font-semibold">Employés sélectionnés</span>
                    <span className="font-bold text-slate-800 text-black">{selectedForPayroll.size}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                    <span className="text-slate-500 font-semibold">Masse Brute Totale</span>
                    <span className="font-mono font-bold text-slate-800 text-black">{formatMoney(totalGross)}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                    <span className="text-slate-500 font-semibold">Retenues Salariales</span>
                    <span className="font-mono font-bold text-rose-600">-{formatMoney(totalRetenues)}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                    <span className="text-slate-500 font-semibold">Charges Patronales</span>
                    <span className="font-mono font-bold text-slate-800 text-black">{formatMoney(totalEmployerTaxes)}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                    <span className="text-slate-500 font-semibold">Coût Total Employeur</span>
                    <span className="font-mono font-bold text-slate-800 text-black">{formatMoney(totalGross + totalEmployerTaxes)}</span>
                  </div>

                  <div className="flex justify-between items-center text-base pt-2 font-black border-t border-slate-100">
                    <span className="text-indigo-600">Net Total à Payer</span>
                    <span className="font-mono text-indigo-700">{formatMoney(totalNet)}</span>
                  </div>
                </div>
              </div>

              {payrollCalculated && fichesDePaieCalculees.length > 0 && (
                <div className="pt-6 mt-4 border-t border-slate-100">
                  <button
                    onClick={() => {
                      fichesDePaieCalculees.forEach(f => handlePrintPayslip(f));
                    }}
                    className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    Imprimer les fiches de paie
                  </button>
                </div>
              )}
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
              {filteredEvaluations.map(ev => (
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
              {filteredEvaluations.length === 0 && (
                <div className="text-center text-slate-400 py-12">Aucune évaluation enregistrée pour cette année scolaire.</div>
              )}
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
              {filteredFormations.map(f => (
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
              {filteredFormations.length === 0 && (
                <div className="text-center text-slate-400 py-12">Aucune formation enregistrée pour cette année scolaire.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB: COMPTES & HABILITATIONS -------------------- */}
      {activeTab === 'comptes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Accounts List Pane */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-6">
            <h3 className="font-bold text-slate-800 text-black flex items-center gap-2 border-b border-slate-100 pb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-600"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Comptes Utilisateurs & Habilitations
            </h3>

            {profilesLoading ? (
              <div className="text-center py-12 text-slate-500 font-semibold">Chargement des comptes...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase bg-slate-50/30">
                      <th className="px-4 py-3">Collaborateur</th>
                      <th className="px-4 py-3">Rôle / Habilitation</th>
                      <th className="px-4 py-3">Créé le</th>
                      <th className="px-4 py-3 text-center">Statut</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {profiles.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/30">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800 text-black">{p.nom_complet || 'Non renseigné'}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{p.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                            p.role === 'admin' ? 'bg-indigo-50 text-indigo-700' :
                            p.role === 'directeur' ? 'bg-amber-50 text-amber-700' :
                            p.role === 'enseignant' ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-50 text-purple-700'
                          }`}>
                            {p.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                            Actif
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => {
                              setEditingProfile(p);
                              const defaultPerms: Record<string, boolean> = p.role === 'directeur' ? {
                                dashboard: true, sections: true, classes: true, eleves: true, parents: true, enseignants: true, evaluations: true, finance: true, rh: true
                              } : p.role === 'enseignant' ? {
                                dashboard: true, sections: false, classes: true, eleves: true, parents: false, enseignants: false, evaluations: true, finance: false, rh: false
                              } : {
                                dashboard: true, sections: false, classes: false, eleves: true, parents: true, enseignants: false, evaluations: false, finance: false, rh: false
                              };
                              setEditingPermissions({ ...defaultPerms, ...(p.permissions || {}) });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors"
                          >
                            Habilitations
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(p.id, p.email)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg text-xs transition-colors"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                    {profiles.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-slate-400">Aucun compte trouvé.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Create Staff Account Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <form onSubmit={handleCreateAccount} className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 text-black">Créer un Compte Personnel</h3>
                <p className="text-xs text-slate-500">Ajouter un accès avec rôle spécifique pour vos collaborateurs</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nom Complet du collaborateur *</label>
                <input
                  type="text"
                  required
                  value={newAccNom}
                  onChange={(e) => setNewAccNom(e.target.value)}
                  placeholder="ex: Jean Dupont"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Adresse Email *</label>
                <input
                  type="email"
                  required
                  value={newAccEmail}
                  onChange={(e) => setNewAccEmail(e.target.value)}
                  placeholder="collaborateur@mboaschool.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mot de passe provisoire *</label>
                <input
                  type="password"
                  required
                  value={newAccPassword}
                  onChange={(e) => setNewAccPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Niveau d'habilitation / Rôle *</label>
                <select
                  value={newAccRole}
                  onChange={(e) => handleRoleChange(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black bg-slate-50 font-semibold outline-none"
                >
                  <option value="directeur">Directeur</option>
                  <option value="enseignant">Enseignant</option>
                  <option value="parent">Parent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Modules autorisés (Habilitations)</label>
                <div className="grid grid-cols-2 gap-3 mt-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {Object.entries({
                    dashboard: 'Tableau de bord',
                    sections: 'Sections',
                    classes: 'Classes',
                    eleves: 'Élèves',
                    parents: 'Communauté & QHSE',
                    enseignants: 'Enseignants',
                    evaluations: 'Évaluations',
                    finance: 'Finance',
                    rh: 'Ressources Humaines'
                  }).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer hover:text-indigo-600">
                      <input
                        type="checkbox"
                        checked={newAccPermissions[key] || false}
                        onChange={(e) => setNewAccPermissions(prev => ({ ...prev, [key]: e.target.checked }))}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 w-4 h-4 cursor-pointer"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={createAccLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-md transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {createAccLoading ? "Création du compte..." : "Créer le compte"}
              </button>
            </form>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Mode de Paiement Préféré</label>
                  <select
                    value={newModePaiement}
                    onChange={(e) => setNewModePaiement(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-semibold"
                  >
                    <option value="Banque">Virement Bancaire</option>
                    <option value="Caisse">Espèces (Caisse)</option>
                  </select>
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

      {/* -------------------- EMPLOYEE PROFILE SHEET MODAL ("FICHE EMPLOYÉ") -------------------- */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl border border-slate-100 shadow-2xl p-6 relative flex flex-col max-h-[90vh]">
            <button
              onClick={() => setSelectedEmployee(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
            
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-xl font-extrabold text-slate-800 text-black">
                Fiche Employé : {selectedEmployee.prenom} {selectedEmployee.nom}
              </h3>
              <p className="text-xs text-slate-400 font-medium">Consulter et modifier les informations de l'employé, ses absences et ses mouvements de carrière.</p>
            </div>

            {/* Modal Tabs */}
            <div className="flex gap-2 border-b border-slate-100 pb-3 mb-4">
              <button
                onClick={() => setProfileModalTab('profile')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                  profileModalTab === 'profile' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                Informations Profil
              </button>
              <button
                onClick={() => setProfileModalTab('absences')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                  profileModalTab === 'absences' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                Suivi des Absences ({absences.filter(a => a.personnelId === selectedEmployee.id).length})
              </button>
              <button
                onClick={() => setProfileModalTab('mouvements')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                  profileModalTab === 'mouvements' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                Mouvements & Carrière ({mouvements.filter(m => m.personnelId === selectedEmployee.id).length})
              </button>
            </div>

            {/* Modal Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              
              {/* TAB CONTENT: PROFILE */}
              {profileModalTab === 'profile' && (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Nom *</label>
                      <input
                        type="text"
                        required
                        value={editEmpNom}
                        onChange={(e) => setEditEmpNom(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Prénom *</label>
                      <input
                        type="text"
                        required
                        value={editEmpPrenom}
                        onChange={(e) => setEditEmpPrenom(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Sexe *</label>
                      <select
                        value={editEmpSexe}
                        onChange={(e) => setEditEmpSexe(e.target.value as any)}
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
                        value={editEmpTel}
                        onChange={(e) => setEditEmpTel(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Adresse Email *</label>
                    <input
                      type="email"
                      required
                      value={editEmpEmail}
                      onChange={(e) => setEditEmpEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Catégorie Métier *</label>
                      <select
                        value={editEmpCategorie}
                        onChange={(e) => setEditEmpCategorie(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-semibold"
                      >
                        <option value="Administration">Administration</option>
                        <option value="Enseignant">Enseignant</option>
                        <option value="Technique">Technique</option>
                        <option value="Personnel d'appui">Personnel d'appui</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Type de Contrat *</label>
                      <select
                        value={editEmpContrat}
                        onChange={(e) => setEditEmpContrat(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-semibold"
                      >
                        <option value="CDI">CDI</option>
                        <option value="CDD">CDD</option>
                        <option value="Intérimaire">Intérimaire</option>
                        <option value="Stagiaire">Stagiaire</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Salaire Mensuel Brut (FCFA) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={editEmpSalaire}
                        onChange={(e) => setEditEmpSalaire(Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Date de Prise d'Effet *</label>
                      <input
                        type="date"
                        required
                        value={editEmpDateEmbauche}
                        onChange={(e) => setEditEmpDateEmbauche(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Statut *</label>
                      <select
                        value={editEmpStatut}
                        onChange={(e) => setEditEmpStatut(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-semibold"
                      >
                        <option value="actif">Actif</option>
                        <option value="suspendu">Suspendu</option>
                        <option value="quitte">Quitté</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Mode de Paiement Préféré</label>
                      <select
                        value={editEmpModePaiement}
                        onChange={(e) => setEditEmpModePaiement(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-semibold"
                      >
                        <option value="Banque">Virement Bancaire</option>
                        <option value="Caisse">Espèces (Caisse)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-md transition-colors"
                    >
                      Enregistrer les Modifications
                    </button>
                  </div>
                </form>
              )}

              {/* TAB CONTENT: ABSENCES */}
              {profileModalTab === 'absences' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* List of absences */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Absences enregistrées</h4>
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {absences.filter(a => a.personnelId === selectedEmployee.id).map(a => (
                        <div key={a.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                          <div>
                            <span className="text-xs font-bold text-slate-800 text-black block">Motif: {a.motif}</span>
                            <span className="text-[10px] text-slate-400 mt-0.5 block">Du {new Date(a.dateDebut).toLocaleDateString('fr-FR')} au {new Date(a.dateFin).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <span className="text-xs font-black bg-rose-50 text-rose-600 px-2 py-1 rounded-lg font-mono">
                            {a.dureeJours} jour(s)
                          </span>
                        </div>
                      ))}
                      {absences.filter(a => a.personnelId === selectedEmployee.id).length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-8">Aucune absence enregistrée pour cet employé.</p>
                      )}
                    </div>
                  </div>

                  {/* Form to add absence */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase">Déclarer une absence</h4>
                    <form onSubmit={handleAddAbsence} className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Motif *</label>
                        <select
                          value={newAbsMotif}
                          onChange={(e) => setNewAbsMotif(e.target.value as any)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-semibold"
                        >
                          <option value="Congé">Congé</option>
                          <option value="Maladie">Maladie</option>
                          <option value="Maternité">Maternité</option>
                          <option value="Injustifié">Injustifié</option>
                          <option value="Autre">Autre</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Date début *</label>
                          <input
                            type="date"
                            required
                            value={newAbsDateDebut}
                            onChange={(e) => setNewAbsDateDebut(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Date fin *</label>
                          <input
                            type="date"
                            required
                            value={newAbsDateFin}
                            onChange={(e) => setNewAbsDateFin(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-md transition-colors"
                        >
                          Valider l'Absence
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: MOVEMENTS */}
              {profileModalTab === 'mouvements' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* List of movements */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Historique de mouvements</h4>
                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 pl-2 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                      {mouvements.filter(m => m.personnelId === selectedEmployee.id).map(m => {
                        const isEmbauche = m.type === 'embauche';
                        const isDepart = m.type === 'depart_volontaire';
                        const isLicenciement = m.type === 'licenciement';

                        return (
                          <div key={m.id} className="relative pl-8">
                            <span className={`absolute left-2 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center -translate-x-1/2 ${
                              isEmbauche ? 'bg-emerald-500 shadow shadow-emerald-500/20' :
                              isDepart ? 'bg-amber-500 shadow shadow-amber-500/20' :
                              isLicenciement ? 'bg-rose-500 shadow shadow-rose-500/20' : 'bg-blue-500 shadow shadow-blue-500/20'
                            }`}></span>
                            <div>
                              <span className="text-[10px] text-slate-400 font-mono font-bold block">{new Date(m.date).toLocaleDateString('fr-FR')}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                isEmbauche ? 'bg-emerald-50 text-emerald-700' :
                                isDepart ? 'bg-amber-50 text-amber-700' :
                                isLicenciement ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'
                              }`}>
                                {m.type.toUpperCase().replace('_', ' ')}
                              </span>
                              <p className="text-xs font-medium text-slate-600 mt-1 italic">"{m.details}"</p>
                            </div>
                          </div>
                        );
                      })}
                      {mouvements.filter(m => m.personnelId === selectedEmployee.id).length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-8 before:hidden pl-0">Aucun mouvement enregistré pour cet employé.</p>
                      )}
                    </div>
                  </div>

                  {/* Form to add movement */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase">Enregistrer un mouvement de carrière</h4>
                    <form onSubmit={handleAddMouvement} className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Type de Mouvement *</label>
                        <select
                          value={newMouvType}
                          onChange={(e) => setNewMouvType(e.target.value as any)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-semibold"
                        >
                          <option value="depart_volontaire">Départ volontaire (Statut → Quitté)</option>
                          <option value="mutation">Mutation / Changement de rôle</option>
                          <option value="licenciement">Licenciement (Statut → Quitté)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Date d'effet *</label>
                        <input
                          type="date"
                          required
                          value={newMouvDate}
                          onChange={(e) => setNewMouvDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Détails / Justification *</label>
                        <textarea
                          required
                          rows={3}
                          value={newMouvDetails}
                          onChange={(e) => setNewMouvDetails(e.target.value)}
                          placeholder="Saisissez les détails (ex: motif de rupture, nouveau département, etc.)"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-md transition-colors"
                        >
                          Enregistrer le Mouvement
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* -------------------- EDIT USER PERMISSIONS MODAL -------------------- */}
      {editingProfile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-100 shadow-2xl p-6 relative animate-in fade-in duration-200">
            <button
              onClick={() => setEditingProfile(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2 text-black">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-600"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Gérer les Habilitations
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Modifier les accès de l'utilisateur <strong className="text-indigo-600">{editingProfile.email}</strong> (Rôle actuel : <strong className="uppercase text-slate-800">{editingProfile.role}</strong>)
            </p>

            <form onSubmit={handleSavePermissions} className="space-y-6">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                {Object.entries({
                  dashboard: 'Tableau de bord',
                  sections: 'Sections',
                  classes: 'Classes',
                  eleves: 'Élèves',
                  parents: 'Communauté & QHSE',
                  enseignants: 'Enseignants',
                  evaluations: 'Évaluations',
                  finance: 'Finance',
                  rh: 'Ressources Humaines'
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer hover:text-indigo-600">
                    <input
                      type="checkbox"
                      checked={editingPermissions[key] || false}
                      onChange={(e) => setEditingPermissions(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 w-4 h-4 cursor-pointer"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPermissions}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-md transition-colors disabled:opacity-50"
                >
                  {isUpdatingPermissions ? "Enregistrement..." : "Enregistrer les modifications"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Payslip Detail Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto print:p-0 print:bg-white print:static print:h-screen print:w-screen">
          <div className="bg-white rounded-2xl w-full max-w-2xl border border-slate-100 shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 print:shadow-none print:border-none print:p-0 print:w-full">
            
            {/* Modal Controls (Hide during print) */}
            <div className="absolute right-4 top-4 flex gap-2 print:hidden">
              <button
                type="button"
                onClick={() => handlePrintPayslip(selectedPayslip)}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Imprimer
              </button>
              <button
                type="button"
                onClick={() => setSelectedPayslip(null)}
                className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold transition-all text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="border-b border-slate-200 pb-4 mb-4 text-center">
              <span className="text-3xl">🏫</span>
              <h2 className="text-xl font-black text-slate-800 text-black mt-1 uppercase">Bulletin de Paie Individuel</h2>
              <p className="text-xs text-slate-500 font-bold mt-1">Période : {selectedPayslip.periode} • Date de paiement : {new Date(selectedPayslip.datePaiement).toLocaleDateString('fr-FR')}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 print:bg-white print:border-none print:p-2">
              <div>
                <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Employeur</span>
                <strong className="text-slate-800 text-black text-sm">{localStorage.getItem('mboaschool_current_school') || 'Mon Établissement'}</strong>
                <span className="block mt-1 text-[10px] text-slate-500">Yaoundé, Cameroun</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Salarié</span>
                <strong className="text-slate-800 text-black text-sm">{selectedPayslip.nomPersonnel}</strong>
                <span className="block mt-1 text-[10px] text-slate-500">ID Salarié: {selectedPayslip.personnelId.slice(0, 8)}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse border border-slate-200 text-slate-700 print:text-black print:border-slate-400">
                <thead>
                  <tr className="bg-slate-50 font-bold uppercase tracking-wider text-[9px] border-b border-slate-200 print:bg-white print:border-slate-400">
                    <th className="px-3 py-2 border-r border-slate-200">Rubrique / Désignation</th>
                    <th className="px-3 py-2 text-right border-r border-slate-200">Base</th>
                    <th className="px-3 py-2 text-right border-r border-slate-200">Retenues Employé</th>
                    <th className="px-3 py-2 text-right">Charges Patronales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                  <tr>
                    <td className="px-3 py-2 font-semibold border-r border-slate-200">Salaire de Base</td>
                    <td className="px-3 py-2 text-right font-mono border-r border-slate-200">{formatMoney(selectedPayslip.salaireDeBase)}</td>
                    <td className="px-3 py-2 text-right font-mono border-r border-slate-200">—</td>
                    <td className="px-3 py-2 text-right font-mono">—</td>
                  </tr>
                  {(selectedPayslip.primeTransport > 0) && (
                    <tr>
                      <td className="px-3 py-2 border-r border-slate-200">Prime de Transport</td>
                      <td className="px-3 py-2 text-right font-mono border-r border-slate-200">{formatMoney(selectedPayslip.primeTransport)}</td>
                      <td className="px-3 py-2 text-right font-mono border-r border-slate-200">—</td>
                      <td className="px-3 py-2 text-right font-mono">—</td>
                    </tr>
                  )}
                  {(selectedPayslip.primeLogement > 0) && (
                    <tr>
                      <td className="px-3 py-2 border-r border-slate-200">Prime de Logement</td>
                      <td className="px-3 py-2 text-right font-mono border-r border-slate-200">{formatMoney(selectedPayslip.primeLogement)}</td>
                      <td className="px-3 py-2 text-right font-mono border-r border-slate-200">—</td>
                      <td className="px-3 py-2 text-right font-mono">—</td>
                    </tr>
                  )}
                  {(selectedPayslip.primeAnciennete > 0) && (
                    <tr>
                      <td className="px-3 py-2 border-r border-slate-200">Prime d'Ancienneté</td>
                      <td className="px-3 py-2 text-right font-mono border-r border-slate-200">{formatMoney(selectedPayslip.primeAnciennete)}</td>
                      <td className="px-3 py-2 text-right font-mono border-r border-slate-200">—</td>
                      <td className="px-3 py-2 text-right font-mono">—</td>
                    </tr>
                  )}
                  {(selectedPayslip.autresPrimes > 0) && (
                    <tr>
                      <td className="px-3 py-2 border-r border-slate-200">Autres Primes</td>
                      <td className="px-3 py-2 text-right font-mono border-r border-slate-200">{formatMoney(selectedPayslip.autresPrimes)}</td>
                      <td className="px-3 py-2 text-right font-mono border-r border-slate-200">—</td>
                      <td className="px-3 py-2 text-right font-mono">—</td>
                    </tr>
                  )}
                  <tr className="bg-slate-50 font-semibold print:bg-white">
                    <td className="px-3 py-2 border-r border-slate-200 uppercase">Salaire Brut</td>
                    <td className="px-3 py-2 text-right font-mono border-r border-slate-200">{formatMoney(selectedPayslip.salaireBrut)}</td>
                    <td className="px-3 py-2 text-right font-mono border-r border-slate-200">—</td>
                    <td className="px-3 py-2 text-right font-mono">—</td>
                  </tr>
                  
                  {/* CNPS */}
                  <tr>
                    <td className="px-3 py-2 border-r border-slate-200">CNPS (Sociale)</td>
                    <td className="px-3 py-2 text-right font-mono border-r border-slate-200">{formatMoney(selectedPayslip.salaireBrut)}</td>
                    <td className="px-3 py-2 text-right font-mono border-r border-slate-200 text-rose-600">-{formatMoney(selectedPayslip.cnpsSalariale)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatMoney(selectedPayslip.cnpsPatronale)}</td>
                  </tr>

                  {/* CFC */}
                  <tr>
                    <td className="px-3 py-2 border-r border-slate-200">CFC (Crédit Foncier)</td>
                    <td className="px-3 py-2 text-right font-mono border-r border-slate-200">{formatMoney(selectedPayslip.salaireBrut)}</td>
                    <td className="px-3 py-2 text-right font-mono border-r border-slate-200 text-rose-600">-{formatMoney(selectedPayslip.cfcSalariale)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatMoney(selectedPayslip.cfcPatronale)}</td>
                  </tr>

                  {/* FNE */}
                  <tr>
                    <td className="px-3 py-2 border-r border-slate-200">FNE (Fonds National Emploi)</td>
                    <td className="px-3 py-2 text-right font-mono border-r border-slate-200">—</td>
                    <td className="px-3 py-2 text-right font-mono border-r border-slate-200">—</td>
                    <td className="px-3 py-2 text-right font-mono">{formatMoney(selectedPayslip.fne)}</td>
                  </tr>

                  {/* Impôts (IRPP + CAC) */}
                  {(selectedPayslip.irpp > 0) && (
                    <tr>
                      <td className="px-3 py-2 border-r border-slate-200">IRPP (Impôt sur le Revenu)</td>
                      <td className="px-3 py-2 text-right font-mono border-r border-slate-200">—</td>
                      <td className="px-3 py-2 text-right font-mono border-r border-slate-200 text-rose-600">-{formatMoney(selectedPayslip.irpp)}</td>
                      <td className="px-3 py-2 text-right font-mono">—</td>
                    </tr>
                  )}
                  {(selectedPayslip.cac > 0) && (
                    <tr>
                      <td className="px-3 py-2 border-r border-slate-200">CAC (Centimes Add. Communaux)</td>
                      <td className="px-3 py-2 text-right font-mono border-r border-slate-200">—</td>
                      <td className="px-3 py-2 text-right font-mono border-r border-slate-200 text-rose-600">-{formatMoney(selectedPayslip.cac)}</td>
                      <td className="px-3 py-2 text-right font-mono">—</td>
                    </tr>
                  )}
                  {(selectedPayslip.rav > 0) && (
                    <tr>
                      <td className="px-3 py-2 border-r border-slate-200">RAV (Redevance Audio-Visuelle)</td>
                      <td className="px-3 py-2 text-right font-mono border-r border-slate-200">—</td>
                      <td className="px-3 py-2 text-right font-mono border-r border-slate-200 text-rose-600">-{formatMoney(selectedPayslip.rav)}</td>
                      <td className="px-3 py-2 text-right font-mono">—</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-700">
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span>Total Retenues Salariales :</span>
                  <span className="font-mono font-bold text-rose-600">-{formatMoney(selectedPayslip.totalRetenues)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Charges Patronales :</span>
                  <span className="font-mono font-bold">{formatMoney(selectedPayslip.totalChargesPatronales)}</span>
                </div>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex flex-col justify-center items-center text-center print:bg-white print:border-none">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Net à payer</span>
                <span className="text-lg font-black text-indigo-700 font-mono mt-0.5">{formatMoney(selectedPayslip.netAPayer)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-6 pt-4 border-t border-slate-100 print:text-black">
              <span>MboaSchool Cameroon - Gestion Scolaire</span>
              <span>Signature Employé & Cachet Établissement</span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
