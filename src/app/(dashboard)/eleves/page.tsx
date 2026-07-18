'use client';
import { captureError, captureMessage } from '@/lib/observability/logger';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { mockClassFees } from '@/mock/fees';
import Link from 'next/link';
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, DownloadIcon } from '@/components/icons';
import { Eleve, Classe } from '@/types/domain';
import { downloadExcel } from '@/lib/excel';
import SyncManager from '@/lib/syncManager';
import { getStudents, createStudent, addPayment, getStudentsWidgetStats, getStudentsPaginated, type StudentsWidgetStats, type StudentPage } from '@/lib/queries/eleves';
import { getClasses } from '@/lib/queries/classes';
import { useEtablissement } from '@/contexts/etablissement-context';
import { createClient, isRunningInElectron } from '@/lib/supabase/client';

export default function ElevesPage() {
  const isElectron = isRunningInElectron();
  const { etablissementId, academicYearId, setAcademicYearId } = useEtablissement();
  const [students, setStudents] = useState<Eleve[]>([]);
  const [classesList, setClassesList] = useState<Classe[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  // Cartes KPI : calculées en base via RPC (get_students_widget_stats) quand
  // disponible, sinon repli sur le calcul client (widgetStats plus bas) qui
  // reste toujours actif en parallèle. Ne remplace jamais students/setStudents,
  // utilisé nulle part ailleurs que dans les 4 cartes d'affichage.
  const [serverWidgetStats, setServerWidgetStats] = useState<StudentsWidgetStats | null>(null);

  // Tableau : recherche + filtres + pagination calculés en base (RPC
  // get_students_paginated) quand disponible. N'affecte QUE l'affichage du
  // tableau — students/setStudents (CRUD, export, bootstrap année scolaire)
  // reste la source de vérité inchangée pour tout le reste de la page.
  const [serverTableStudents, setServerTableStudents] = useState<StudentPage[] | null>(null);
  const [serverTableTotal, setServerTableTotal] = useState(0);
  const [serverModeAvailable, setServerModeAvailable] = useState<boolean | null>(null);

  // Filter students and classes by active academic year
  const studentsOfActiveYear = useMemo(() => {
    if (!academicYearId) return students;
    return students.filter(s => s.anneeScolaireId === academicYearId);
  }, [students, academicYearId]);

  const classesOfActiveYear = useMemo(() => {
    if (!academicYearId) return classesList;
    return classesList.filter(c => c.anneeScolaireId === academicYearId);
  }, [classesList, academicYearId]);

  // Form states for adding student
  const [showAddModal, setShowAddModal] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [className, setClassName] = useState(''); // This will store the UUID of the class
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [matricule, setMatricule] = useState('');
  const [initialPayment, setInitialPayment] = useState('');

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // File input ref for Excel import
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Load from Supabase
  useEffect(() => {
    if (typeof window !== 'undefined' && etablissementId) {
      const fetchClasses = async () => {
        try {
          const data = await getClasses(etablissementId);
          setClassesList(data);
          if (data.length > 0) {
            setClassName(data[0].id);
          }
        } catch (error) {
          captureError(error, { context: "Error fetching classes:" });
          setClassesList([]);
        }
      };

      fetchClasses();

      const fetchEleves = async () => {
        try {
          const data = await getStudents(etablissementId);
          const mapped = data.map(d => ({
            id: d.id,
            matricule: d.matricule,
            nom: d.nom,
            prenom: d.prenom,
            sexe: d.sexe,
            classeId: d.classe_id,
            anneeScolaireId: d.annee_scolaire_id,
            telephoneParent: d.telephone_parent,
            nomParent: d.nom_parent,
            emailParent: d.email_parent,
            dateNaissance: d.date_naissance,
            lieuNaissance: d.lieu_naissance,
            dateInscription: d.date_inscription,
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
            notes: []
          }));
          setStudents(mapped as any);
        } catch (error) {
          captureError(error, { context: "Error fetching students:" });
          setStudents([]);
        } finally {
          setIsLoaded(true);
        }
      };

      fetchEleves();
    }
  }, [etablissementId]);

  // Cartes KPI via RPC serveur (léger, pas de transfert des lignes). Échoue
  // silencieusement (migration non appliquée, hors-ligne...) : les cartes
  // retombent alors sur widgetStats calculé côté client, déjà présent.
  const fetchWidgetStats = useCallback(() => {
    if (typeof window !== 'undefined' && etablissementId) {
      getStudentsWidgetStats(etablissementId, academicYearId || null)
        .then(setServerWidgetStats)
        .catch(() => setServerWidgetStats(null));
    }
  }, [etablissementId, academicYearId]);

  useEffect(() => {
    fetchWidgetStats();
  }, [fetchWidgetStats]);

  // Recherche débouncée (300ms) pour ne pas déclencher un appel RPC à chaque frappe.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchTablePage = useCallback(async () => {
    if (typeof window === 'undefined' || !etablissementId) return;
    try {
      const { students: rows, totalCount } = await getStudentsPaginated({
        etablissementId,
        anneeScolaireId: academicYearId || null,
        search: debouncedSearch,
        classeId: selectedClass === 'All' ? null : selectedClass,
        statutPaiement: selectedPaymentStatus === 'All' ? null : (selectedPaymentStatus as 'paid' | 'partial' | 'unpaid'),
        sexe: selectedGender === 'All' ? null : (selectedGender as 'M' | 'F'),
        page: currentPage,
        pageSize,
      });
      setServerTableStudents(rows);
      setServerTableTotal(totalCount);
      setServerModeAvailable(true);
    } catch {
      // Migration RPC non appliquée, ou hors-ligne : repli sur le calcul
      // client existant (filteredStudents/paginatedStudents plus bas).
      setServerModeAvailable(false);
      setServerTableStudents(null);
    }
  }, [etablissementId, academicYearId, debouncedSearch, selectedClass, selectedPaymentStatus, selectedGender, currentPage, pageSize]);

  useEffect(() => {
    fetchTablePage();
  }, [fetchTablePage]);

  /** À appeler après toute mutation réussie (ajout/suppression/import) pour
   * garder le tableau serveur et les cartes KPI synchro avec students. */
  const refreshServerViews = useCallback(() => {
    fetchTablePage();
    fetchWidgetStats();
  }, [fetchTablePage, fetchWidgetStats]);

  // Helper: Get student payment stats
  const getStudentPaymentStats = useCallback((student: Eleve) => {
    if (!student) return { totalDue: 0, totalPaid: 0, status: 'unpaid' as const };
    const classFeeConfig = mockClassFees.find(cf => cf.niveauId === student.classeId);
    const classObj = classesList.find(c => c.nom === student.classeId || c.id === student.classeId);
    const totalDue = classObj && typeof classObj.prix !== 'undefined' ? classObj.prix : (classFeeConfig ? classFeeConfig.total : 200000);
    const totalPaid = (student.paiements || [])
      .filter(p => p.statut === 'paid')
      .reduce((sum, p) => sum + p.montant, 0);
    
    let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
    if (totalPaid >= totalDue && totalDue > 0) {
      status = 'paid';
    } else if (totalPaid > 0) {
      status = 'partial';
    }

    return { totalDue, totalPaid, status };
  }, [classesList]);

  // Filter students
  const filteredStudents = useMemo(() => {
    if (!isLoaded) return [];
    return studentsOfActiveYear.filter(student => {
      if (!student) return false;
      // 1. Search term (Name or Matricule)
      const fullName = `${student.nom || ''} ${student.prenom || ''}`.toLowerCase();
      const matriculeVal = (student.matricule || '').toLowerCase();
      const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || matriculeVal.includes(searchTerm.toLowerCase());

      // 2. Class
      const matchesClass = selectedClass === 'All' || student.classeId === selectedClass;

      // 3. Payment Status
      const stats = getStudentPaymentStats(student);
      const matchesPayment = selectedPaymentStatus === 'All' || stats.status === selectedPaymentStatus;

      // 4. Gender
      const matchesGender = selectedGender === 'All' || student.sexe === selectedGender;

      return matchesSearch && matchesClass && matchesPayment && matchesGender;
    });
  }, [studentsOfActiveYear, searchTerm, selectedClass, selectedPaymentStatus, selectedGender, isLoaded, getStudentPaymentStats]);

  // Total counts for widgets
  const widgetStats = useMemo(() => {
    if (!isLoaded) return { paidCount: 0, partialCount: 0, unpaidCount: 0, total: 0 };
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;

    studentsOfActiveYear.forEach(s => {
      if (!s) return;
      const { status } = getStudentPaymentStats(s);
      if (status === 'paid') paidCount++;
      else if (status === 'partial') partialCount++;
      else unpaidCount++;
    });

    return { paidCount, partialCount, unpaidCount, total: studentsOfActiveYear.length };
  }, [studentsOfActiveYear, isLoaded, getStudentPaymentStats]);


  // Pagination Logic (repli client — utilisé si la RPC serveur est indisponible)
  const legacyTotalItems = filteredStudents.length;
  const legacyTotalPages = Math.ceil(legacyTotalItems / pageSize) || 1;
  const legacyActivePage = Math.min(currentPage, legacyTotalPages);

  const legacyPaginatedStudents = useMemo(() => {
    const startIndex = (legacyActivePage - 1) * pageSize;
    return filteredStudents.slice(startIndex, startIndex + pageSize);
  }, [filteredStudents, legacyActivePage, pageSize]);

  // Source effective pour le tableau : serveur si disponible, sinon calcul
  // client ci-dessus. Ne change rien aux flux CRUD/export (students, inchangés).
  const useServerTable = serverModeAvailable === true && serverTableStudents !== null;
  const totalItems = useServerTable ? serverTableTotal : legacyTotalItems;
  const totalPages = useServerTable ? (Math.ceil(serverTableTotal / pageSize) || 1) : legacyTotalPages;
  const activePage = Math.min(currentPage, totalPages);

  interface DisplayRow {
    id: string;
    matricule: string;
    nom: string;
    prenom: string;
    sexe: string;
    classeId: string;
    nomParent: string | null | undefined;
    classeNomOverride: string | null;
    precomputedStats: { totalDue: number; totalPaid: number; status: 'paid' | 'partial' | 'unpaid' } | null;
  }

  const displayRows: DisplayRow[] = useMemo(() => {
    if (useServerTable) {
      return serverTableStudents!.map((s) => ({
        id: s.id,
        matricule: s.matricule,
        nom: s.nom,
        prenom: s.prenom,
        sexe: s.sexe,
        classeId: s.classe_id,
        nomParent: s.nom_parent,
        classeNomOverride: s.classe_nom,
        precomputedStats: { totalDue: Number(s.total_due), totalPaid: Number(s.total_paid), status: s.statut_paiement },
      }));
    }
    return legacyPaginatedStudents.map((s) => ({
      id: s.id,
      matricule: s.matricule,
      nom: s.nom,
      prenom: s.prenom,
      sexe: s.sexe,
      classeId: s.classeId,
      nomParent: s.nomParent,
      classeNomOverride: null,
      precomputedStats: getStudentPaymentStats(s),
    }));
  }, [useServerTable, serverTableStudents, legacyPaginatedStudents, getStudentPaymentStats]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !parentName || !parentPhone) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (!className) {
      alert("Veuillez d'abord configurer au moins une classe dans le menu 'Classes' avant de pouvoir inscrire un élève.");
      return;
    }

    // Resolve the active year UUID dynamically
    let resolvedAnneeScolaireId = null;

    // 1. Try to get it from the selected class in classesList (strongest source of truth for the student's year)
    const selectedClassObj = classesList.find(c => c.id === className);
    if (selectedClassObj) {
      resolvedAnneeScolaireId = (selectedClassObj as any).annee_scolaire_id || (selectedClassObj as any).anneeScolaireId;
    }

    // 2. Try online query if still not resolved
    const isOfflineMode = isElectron && (!navigator.onLine || (typeof window !== 'undefined' && (window as any).__forceOffline));
    if (!resolvedAnneeScolaireId && !isOfflineMode && etablissementId) {
      try {
        const supabase = createClient();
        const { data: etab } = await supabase
          .from('etablissements')
          .select('annee_scolaire_active_id')
          .eq('id', etablissementId)
          .single();

        if (etab?.annee_scolaire_active_id) {
          resolvedAnneeScolaireId = etab.annee_scolaire_active_id;
          if (setAcademicYearId) {
            setAcademicYearId(resolvedAnneeScolaireId);
          }
        } else {
          const { data: years } = await supabase
            .from('annees_scolaires')
            .select('id')
            .eq('etablissement_id', etablissementId)
            .limit(1);
          if (years && years.length > 0) {
            resolvedAnneeScolaireId = years[0].id;
          }
        }
      } catch (err) {
        captureError(err, { context: "Failed to dynamically fetch active year ID:" });
      }
    }

    // 3. Try to get it from localStorage cached ID
    if (!resolvedAnneeScolaireId && typeof window !== 'undefined') {
      const cachedYearId = localStorage.getItem('mboaschool_active_year_id');
      // Only use the cached year if we are offline or if it exists in years (i.e. not a random mock UUID)
      const isMockUuid = cachedYearId && (cachedYearId.startsWith('local_') || (cachedYearId.includes('-') && !isOfflineMode && classesList.length > 0 && !classesList.some(c => ((c as any).annee_scolaire_id || (c as any).anneeScolaireId) === cachedYearId)));
      if (!isMockUuid) {
        resolvedAnneeScolaireId = cachedYearId;
      }
    }

    // 4. Try to extract it from loaded students list if any exist
    if (!resolvedAnneeScolaireId && students.length > 0) {
      const studentWithYear = students.find(s => s && s.anneeScolaireId);
      if (studentWithYear) {
        resolvedAnneeScolaireId = studentWithYear.anneeScolaireId;
      }
    }

    // 5. Try offline cache for annees_scolaires if still missing
    if (!resolvedAnneeScolaireId && typeof window !== 'undefined') {
      const storedYears = localStorage.getItem('offline_cache_annees_scolaires');
      if (storedYears) {
        try {
          const parsed = JSON.parse(storedYears);
          if (Array.isArray(parsed) && parsed.length > 0) {
            resolvedAnneeScolaireId = parsed[0].id;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    if (!resolvedAnneeScolaireId) {
      alert("Erreur : Impossible de déterminer l'année scolaire active. Veuillez rafraîchir la page.");
      return;
    }

    const generatedMatricule = matricule.trim() || `26YAE${Math.floor(100 + Math.random() * 900)}`;

    const studentData = {
      matricule: generatedMatricule,
      nom: lastName.toUpperCase(),
      prenom: firstName,
      sexe: gender,
      classe_id: className || null,
      annee_scolaire_id: resolvedAnneeScolaireId,
      nom_parent: parentName,
      telephone_parent: parentPhone,
      email_parent: parentEmail || null,
      date_naissance: dateOfBirth || null,
      lieu_naissance: birthPlace || null,
      statut: 'actif'
    };

    if (!navigator.onLine || (typeof window !== 'undefined' && (window as any).__forceOffline)) {
      await SyncManager.addToQueue('eleves', 'insert', studentData);
      
      const localStudent = {
        id: `temp_${Date.now()}`,
        ...studentData,
        classeId: studentData.classe_id,
        anneeScolaireId: studentData.annee_scolaire_id,
        dateNaissance: studentData.date_naissance,
        lieuNaissance: studentData.lieu_naissance,
        nomParent: studentData.nom_parent,
        telephoneParent: studentData.telephone_parent,
        emailParent: studentData.email_parent,
        paiements: [],
        notes: []
      };
      
      setStudents([localStudent as any, ...students]);
      setShowAddModal(false);
      triggerToast(`Hors-ligne : L'élève ${lastName} a été mis en file d'attente de synchronisation.`);
      return;
    }

    try {
      const data = await createStudent(studentData, etablissementId!);

      if (data && data.length > 0) {
        const d = data[0];
        
        let newPaymentObj = null;
        const initialPayVal = Number(initialPayment);
        if (initialPayVal > 0) {
          const reference = `REC-INS-${Date.now()}`;
          const paymentData = {
            eleve_id: d.id,
            montant: initialPayVal,
            date: new Date().toISOString().split('T')[0],
            type_frais: 'Scolarité',
            mode_paiement: 'Espèces',
            statut: 'paid',
            reference: reference
          };

          if (!navigator.onLine || (typeof window !== 'undefined' && (window as any).__forceOffline)) {
             await SyncManager.addToQueue('paiements', 'insert', paymentData);
             newPaymentObj = {
               id: `temp_pay_${Date.now()}`,
               ...paymentData,
               eleveId: d.id,
               typeFrais: 'Scolarité',
               modePaiement: 'Espèces'
             };
          } else {
            const payData = await addPayment(paymentData, etablissementId!);
            
            if (payData && payData.length > 0) {
              const pd = payData[0];
              newPaymentObj = {
                id: pd.id,
                eleveId: pd.eleve_id,
                montant: Number(pd.montant),
                date: pd.date,
                typeFrais: pd.type_frais,
                statut: pd.statut,
                reference: pd.reference,
                modePaiement: pd.mode_paiement
              };
            }
          }
        }

        const newStudent: any = {
          id: d.id,
          matricule: d.matricule,
          prenom: d.prenom,
          nom: d.nom,
          sexe: d.sexe,
          classeId: className,
          nomParent: d.nom_parent,
          telephoneParent: d.telephone_parent,
          emailParent: d.email_parent || 'N/A',
          dateNaissance: d.date_naissance || '2012-01-01',
          lieuNaissance: d.lieu_naissance || 'Yaoundé',
          dateInscription: d.date_inscription,
          anneeScolaireId: d.annee_scolaire_id,
          statut: d.statut,
          paiements: newPaymentObj ? [newPaymentObj] : [],
          notes: []
        };

        setStudents([newStudent, ...students]);
        refreshServerViews();
      }
    } catch (error: any) {
      alert("Erreur lors de la création de l'élève : " + error.message);
      return;
    }

    setFirstName('');
    setLastName('');
    setGender('M');
    if (classesList.length > 0) setClassName(classesList[0].id);
    else setClassName('');
    setParentName('');
    setParentPhone('');
    setParentEmail('');
    setDateOfBirth('');
    setBirthPlace('');
    setMatricule('');
    setInitialPayment('');

    setShowAddModal(false);
    triggerToast(`L'élève ${lastName} ${firstName} a été inscrit avec succès dans Supabase.`);
  };

  const handleDeleteStudent = async (id: string, name: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (confirm(`Voulez-vous vraiment supprimer l'élève ${name} définitivement ? Cette action supprimera également ses paiements et ses notes.`)) {
      const isOffline = isElectron && (!navigator.onLine || (typeof window !== 'undefined' && (window as any).__forceOffline));
      const supabase = createClient();

      if (isOffline) {
        await SyncManager.addToQueue('eleves', 'delete', { id });
        setStudents(prev => prev.filter(s => s.id !== id));
        triggerToast("Élève supprimé localement !");
      } else {
        // Soft-delete : l'élève et ses paiements/notes/bulletins sont marqués
        // supprimés (récupérables) plutôt que détruits. Ils disparaissent des
        // lectures via la RLS.
        const { error } = await supabase.rpc('soft_delete_eleve', { p_id: id });
        if (error) {
          alert("Erreur lors de la suppression: " + error.message);
        } else {
          setStudents(prev => prev.filter(s => s.id !== id));
          refreshServerViews();
          triggerToast("Élève supprimé avec succès !");
        }
      }
    }
  };

  const handleTriggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleExportExcel = () => {
    const dataToExport = filteredStudents.map(s => {
      const { totalDue, totalPaid, status } = getStudentPaymentStats(s);
      return {
        Matricule: s.matricule,
        Nom: s.nom,
        Prénom: s.prenom,
        Genre: s.sexe,
        Classe: classesList.find(c => c.id === s.classeId)?.nom || s.classeId,
        'Parent / Tuteur': s.nomParent,
        Téléphone: s.telephoneParent,
        'Scolarité (FCFA)': totalDue,
        'Montant Payé': totalPaid,
        Statut: status === 'paid' ? 'Payé' : status === 'partial' ? 'Partiel' : 'Non Payé'
      };
    });
    downloadExcel(dataToExport, 'Liste_Eleves');
    triggerToast('Export Excel généré avec succès !');
  };

  const getOrCreateClass = async (
    classNameStr: string, 
    resolvedAnneeScolaireId: string, 
    sectionStr: string = 'Francophone', 
    localClassesRef?: Classe[]
  ) => {
    const listToSearch = localClassesRef || classesList;
    const existing = listToSearch.find(c => {
      const cNom = c.nom || '';
      const cId = c.id || '';
      return cNom.toLowerCase().trim() === classNameStr.toLowerCase().trim() || 
             cId.toLowerCase().trim() === classNameStr.toLowerCase().trim();
    });
    if (existing) return existing.id;

    const newClassData = {
      nom: classNameStr,
      niveau: classNameStr,
      prix: 200000,
      section: sectionStr
    };

    const isOffline = isElectron && (!navigator.onLine || (typeof window !== 'undefined' && (window as any).__forceOffline));

    if (isOffline) {
      const tempId = `temp_cls_${Date.now()}_${Math.floor(Math.random()*1000)}`;
      const newLocalClass: Classe = {
        id: tempId,
        nom: classNameStr,
        niveauId: classNameStr,
        anneeScolaireId: resolvedAnneeScolaireId,
        sectionId: sectionStr
      };
      await SyncManager.addToQueue('classes', 'insert', { ...newClassData, id: tempId });
      if (localClassesRef) {
        localClassesRef.push(newLocalClass);
      }
      setClassesList(prev => [...prev, newLocalClass]);
      return tempId;
    } else {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('classes')
          .insert([{ ...newClassData, etablissement_id: etablissementId }])
          .select();
        
        if (!error && data && data.length > 0) {
          const created = data[0];
          const newClassObj: Classe = {
            id: created.id,
            nom: created.nom,
            niveauId: created.niveau,
            anneeScolaireId: resolvedAnneeScolaireId,
            sectionId: created.section
          };
          if (localClassesRef) {
            localClassesRef.push(newClassObj);
          }
          setClassesList(prev => [...prev, newClassObj]);
          return created.id;
        } else if (error) {
          captureError(error, { context: "Supabase error creating class:" });
        }
      } catch (err) {
        captureError(err, { context: "Error creating class:" });
      }
    }
    return classNameStr;
  };

  const parseImportDate = (val: any): string | null => {
    if (!val) return null;
    if (typeof val === 'number') {
      try {
        const utc_days = Math.floor(val - 25569);
        const utc_value = utc_days * 86400;
        const date_info = new Date(utc_value * 1000);
        const year = date_info.getFullYear();
        const month = String(date_info.getMonth() + 1).padStart(2, '0');
        const day = String(date_info.getDate()).padStart(2, '0');
        const formatted = `${year}-${month}-${day}`;
        if (!isNaN(date_info.getTime())) return formatted;
      } catch (e) {
        // ignore
      }
    }
    const str = val.toString().trim();
    if (!str) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
    const parsedDate = new Date(str);
    if (!isNaN(parsedDate.getTime())) {
      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const day = String(parsedDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return null;
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isOffline = isElectron && (!navigator.onLine || (typeof window !== 'undefined' && (window as any).__forceOffline));
    const supabase = createClient();

    let resolvedAnneeScolaireId = null;

    if (!isOffline && etablissementId) {
      try {
        const { data: etab } = await supabase
          .from('etablissements')
          .select('annee_scolaire_active_id')
          .eq('id', etablissementId)
          .single();
        if (etab?.annee_scolaire_active_id) {
          resolvedAnneeScolaireId = etab.annee_scolaire_active_id;
        }
      } catch (err) {
        captureError(err, { context: "Failed to fetch active year from DB:" });
      }

      if (!resolvedAnneeScolaireId) {
        try {
          const { data: years } = await supabase
            .from('annees_scolaires')
            .select('id')
            .eq('etablissement_id', etablissementId)
            .limit(1);
          if (years && years.length > 0) {
            resolvedAnneeScolaireId = years[0].id;
          }
        } catch (err) {
          captureError(err, { context: "Failed to fetch fallback year from DB:" });
        }
      }
    }

    if (!resolvedAnneeScolaireId && typeof window !== 'undefined') {
      resolvedAnneeScolaireId = localStorage.getItem('mboaschool_active_year_id');
    }
    if (!resolvedAnneeScolaireId && students.length > 0) {
      const studentWithYear = students.find(s => s && s.anneeScolaireId);
      if (studentWithYear) resolvedAnneeScolaireId = studentWithYear.anneeScolaireId;
    }
    if (!resolvedAnneeScolaireId) {
      alert("Erreur : Impossible de déterminer l'année scolaire active. Créez d'abord au moins une classe ou une année scolaire.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (!data || data.length === 0) {
          alert("Le fichier Excel est vide ou invalide.");
          return;
        }

        let importedCount = 0;
        let errorsCount = 0;
        const localClasses = [...classesList]; // Local reference to track created classes during the loop synchronously

        const isOffline = isElectron && (!navigator.onLine || (typeof window !== 'undefined' && (window as any).__forceOffline));
        const supabase = createClient();

        for (const row of data) {
          const nom = (row.Nom || row.nom || row.NOM || '').toString().trim();
          const prenom = (row.Prénom || row.prenom || row.Prenom || row.PRENOM || '').toString().trim();

          // Skip completely empty rows
          if (!nom && !prenom) continue;

          const sexe = (row.Sexe || row.sexe || row.SEXE || 'M').toString().toUpperCase().trim() === 'F' ? 'F' : 'M';
          const classNameStr = (row.Classe || row.classe || row.CLASSE || 'Non classé').toString().trim();
          const sectionStr = (row.Section || row.section || row.SECTION || 'Francophone').toString().trim();
          const nomParent = (row["Nom Parent"] || row.nom_parent || row.Parent || row.parent || '').toString().trim();
          const telephoneParent = (row["Téléphone Parent"] || row.telephone_parent || row.Tel || row.tel || '').toString().trim();
          const emailParent = (row["Email Parent"] || row.email_parent || row.Email || row.email || '').toString().trim();
          const dateNaissance = parseImportDate(row["Date Naissance"] || row.date_naissance || row.Naissance || row.naissance);
          const lieuNaissance = (row["Lieu Naissance"] || row.lieu_naissance || row.Lieu || row.lieu || '').toString().trim();
          const dateInscriptionVal = parseImportDate(row["Date Inscription"] || row.date_inscription || row.inscription || row.Inscription) || new Date().toISOString().split('T')[0];
          
          // Generate a deterministic fallback matricule based on name/surname if missing, to prevent duplicates on re-import
          const rawMatricule = row.Matricule || row.matricule || row.MATRICULE || row["N° Matricule"];
          const cleanNom = nom.toUpperCase().replace(/[^A-Z0-9]/g, '');
          const cleanPrenom = prenom.toUpperCase().replace(/[^A-Z0-9]/g, '');
          const fallbackMatricule = `MBOA-${cleanNom}-${cleanPrenom}`.substring(0, 50);
          const matriculeVal = (rawMatricule ? rawMatricule.toString().trim() : fallbackMatricule);

          let classId = '';
          if (classNameStr) {
            classId = await getOrCreateClass(classNameStr, resolvedAnneeScolaireId, sectionStr, localClasses);
          } else if (localClasses.length > 0) {
            classId = localClasses[0].id;
          } else {
            classId = await getOrCreateClass('Non classé', resolvedAnneeScolaireId, sectionStr, localClasses);
          }

          const studentData = {
            matricule: matriculeVal,
            nom: nom.toUpperCase(),
            prenom: prenom,
            sexe,
            classe_id: classId,
            annee_scolaire_id: resolvedAnneeScolaireId,
            nom_parent: nomParent,
            telephone_parent: telephoneParent,
            email_parent: emailParent,
            date_naissance: dateNaissance,
            lieu_naissance: lieuNaissance,
            date_inscription: dateInscriptionVal,
            statut: 'actif'
          };

          let studentId = '';
          let finalStudentObj: any = null;

          try {
            if (isOffline) {
              studentId = `temp_stud_${Date.now()}_${Math.floor(Math.random()*1000)}`;
              await SyncManager.addToQueue('eleves', 'insert', { ...studentData, id: studentId });
              finalStudentObj = {
                id: studentId,
                ...studentData,
                classeId: classId,
                anneeScolaireId: resolvedAnneeScolaireId,
                dateNaissance,
                lieuNaissance,
                dateInscription: dateInscriptionVal,
                nomParent,
                telephoneParent,
                emailParent,
                paiements: [],
                notes: []
              };
            } else {
              const { data: createdData, error: createErr } = await supabase
                .from('eleves')
                .upsert([{ ...studentData, etablissement_id: etablissementId }], { onConflict: 'etablissement_id,matricule' })
                .select();
              if (!createErr && createdData && createdData.length > 0 && createdData[0]) {
                const createdStudent = createdData[0];
                studentId = createdStudent.id;
                finalStudentObj = {
                  id: studentId,
                  matricule: createdStudent.matricule || studentData.matricule || '',
                  nom: createdStudent.nom || studentData.nom || '',
                  prenom: createdStudent.prenom || studentData.prenom || '',
                  sexe: createdStudent.sexe || studentData.sexe || 'M',
                  classeId: classId,
                  nomParent: createdStudent.nom_parent || studentData.nom_parent || '',
                  telephoneParent: createdStudent.telephone_parent || studentData.telephone_parent || '',
                  emailParent: createdStudent.email_parent || studentData.email_parent || '',
                  dateNaissance: createdStudent.date_naissance || studentData.date_naissance || '',
                  lieuNaissance: createdStudent.lieu_naissance || studentData.lieu_naissance || '',
                  dateInscription: createdStudent.date_inscription || dateInscriptionVal,
                  anneeScolaireId: createdStudent.annee_scolaire_id || resolvedAnneeScolaireId,
                  statut: createdStudent.statut || 'actif',
                  paiements: [],
                  notes: []
                };
              } else {
                captureError(createErr || new Error("Empty selection returned from database. Check RLS or insert payload."), { context: "Error creating student in Excel import loop" });
                errorsCount++;
                continue;
              }
            }
          } catch (err) {
            captureError(err, { context: "Failed to create student in loop:" });
            errorsCount++;
            continue;
          }

          const amountPaidVal = Number(row["Frais Payes"] || row.frais_payes || row["Montant Payé"] || row.montant_paye || 0);
          if (amountPaidVal > 0 && studentId && finalStudentObj) {
            const mode = row["Mode Paiement"] || row.mode_paiement || 'Espèces';
            const reference = row.Reference || row.reference || row.REFERENCE || `REC-${matriculeVal}-SCOL`;
            const paymentData = {
              eleve_id: studentId,
              montant: amountPaidVal,
              date: new Date().toISOString().split('T')[0],
              type_frais: 'Scolarité',
              mode_paiement: mode,
              statut: 'paid',
              reference: reference
            };

            try {
              if (isOffline) {
                const localPayId = `temp_pay_${Date.now()}_${Math.floor(Math.random()*100)}`;
                await SyncManager.addToQueue('paiements', 'insert', { ...paymentData, id: localPayId });
                if (!finalStudentObj.paiements) finalStudentObj.paiements = [];
                finalStudentObj.paiements.push({
                  id: localPayId,
                  eleveId: studentId,
                  montant: amountPaidVal,
                  date: paymentData.date,
                  typeFrais: 'Scolarité',
                  modePaiement: mode,
                  statut: 'paid',
                  reference
                });
              } else {
                const { data: payCreated, error: payErr } = await supabase
                  .from('paiements')
                  .upsert([{ ...paymentData, etablissement_id: etablissementId }], { onConflict: 'etablissement_id,reference' })
                  .select();
                if (!payErr && payCreated && payCreated.length > 0 && payCreated[0]) {
                  if (!finalStudentObj.paiements) finalStudentObj.paiements = [];
                  // Ensure we don't add duplicate payments in local state representation
                  const pId = payCreated[0].id;
                  const payObj = {
                    id: pId,
                    eleveId: studentId,
                    montant: Number(payCreated[0].montant),
                    date: payCreated[0].date,
                    typeFrais: payCreated[0].type_frais,
                    modePaiement: payCreated[0].mode_paiement,
                    statut: payCreated[0].statut,
                    reference: payCreated[0].reference
                  };
                  const exists = finalStudentObj.paiements.some((p: any) => p.id === pId || p.reference === payObj.reference);
                  if (exists) {
                    finalStudentObj.paiements = finalStudentObj.paiements.map((p: any) => (p.id === pId || p.reference === payObj.reference) ? payObj : p);
                  } else {
                    finalStudentObj.paiements.push(payObj);
                  }
                } else {
                  captureError(payErr || new Error("Empty selection returned from database."), { context: "Error creating payment in Excel import loop" });
                }
              }
            } catch (pErr) {
              captureError(pErr, { context: "Failed to insert payment inside loop:" });
            }
          }

          if (finalStudentObj) {
            setStudents(prev => {
              const existingIndex = prev.findIndex(s => s.id === finalStudentObj.id);
              if (existingIndex > -1) {
                const existingStudent = prev[existingIndex];
                // Merge payments to preserve other historical payments
                const mergedPaiements = [...(existingStudent.paiements || [])];
                (finalStudentObj.paiements || []).forEach((newPay: any) => {
                  const payIndex = mergedPaiements.findIndex(p => p.id === newPay.id || p.reference === newPay.reference);
                  if (payIndex > -1) {
                    mergedPaiements[payIndex] = newPay;
                  } else {
                    mergedPaiements.push(newPay);
                  }
                });
                
                const updatedStudent = {
                  ...finalStudentObj,
                  paiements: mergedPaiements,
                  notes: existingStudent.notes || [] // Keep existing notes
                };
                
                const copy = [...prev];
                copy[existingIndex] = updatedStudent;
                return copy;
              } else {
                return [finalStudentObj, ...prev];
              }
            });
            importedCount++;
          }
        }

        if (importedCount > 0) refreshServerViews();
        triggerToast(`Importation réussie : ${importedCount} élèves importés. (${errorsCount} lignes ignorées)`);
      } catch (err) {
        captureError(err, { context: "Error parsing excel:" });
        alert("Erreur lors de l'analyse du fichier Excel.");
      }
    };
    reader.readAsBinaryString(file);
    if (e.target) e.target.value = '';
  };

  const downloadTemplate = () => {
    const headers = [
      {
        Matricule: '26YAE001',
        Nom: 'FOUDA',
        Prénom: 'Jean',
        Sexe: 'M',
        Classe: 'Terminale D',
        Section: 'Francophone',
        'Date Inscription': '2026-09-01',
        'Date Naissance': '2012-05-14',
        'Lieu Naissance': 'Yaoundé',
        'Nom Parent': 'Emmanuel Fouda',
        'Téléphone Parent': '+237 677 88 99 00',
        'Email Parent': 'parent.fouda@gmail.com',
        'Frais Payes': 150000,
        'Mode Paiement': 'Espèces',
        Reference: 'REC-INS-001'
      }
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(headers);
    XLSX.utils.book_append_sheet(wb, ws, "Gabarit");
    XLSX.writeFile(wb, "gabarit_importation_eleves.xlsx");
    triggerToast("Gabarit d'importation Excel téléchargé !");
  };

  const formatFCFA = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' F';
  };

  const effectiveWidgetStats = serverWidgetStats ?? widgetStats;

  return (
    <div className="flex flex-col gap-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-ink text-cream px-5 py-3.5 rounded-control shadow-login z-50 flex items-center gap-3 animate-fade-up">
          <div className="w-5 h-5 rounded-full bg-green flex items-center justify-center text-xs font-bold text-cream">✓</div>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[32px] lg:text-[40px] font-extrabold text-ink tracking-[-1.5px]">Liste des élèves</h1>
          <p className="text-[15px] text-ink-soft font-medium mt-2">
            Gérez les fiches, filtrez par statut de scolarité ou niveau académique.
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Champ fichier caché pour l'import Excel */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportExcel}
            accept=".xlsx, .xls"
            className="hidden"
          />
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-transparent border border-outline text-ink-soft hover:border-ink hover:text-ink text-[13px] font-bold rounded-control transition-colors cursor-pointer"
          >
            Gabarit
          </button>
          <button
            onClick={handleTriggerFileInput}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-transparent border border-outline text-ink-soft hover:border-ink hover:text-ink text-[13px] font-bold rounded-control transition-colors cursor-pointer"
          >
            Importer
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-transparent border border-outline text-ink-soft hover:border-ink hover:text-ink text-[13px] font-bold rounded-control transition-colors cursor-pointer"
          >
            <DownloadIcon size={14} />
            Exporter
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-accent hover:bg-accent-hover text-cream text-sm font-extrabold rounded-control shadow-cta transition-colors cursor-pointer"
          >
            <PlusIcon size={14} />
            Inscrire un élève
          </button>
        </div>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-surface border border-border p-6 rounded-card">
          <span className="text-[13px] font-bold text-ink-soft block">Effectif total</span>
          <span className="text-[38px] font-extrabold text-ink tracking-[-1.5px] mt-2 block">{effectiveWidgetStats.total}</span>
        </div>
        <div className="bg-surface border border-border p-6 rounded-card">
          <span className="text-[13px] font-bold text-ink-soft block">Scolarité réglée</span>
          <span className="text-[38px] font-extrabold text-green tracking-[-1.5px] mt-2 block">{effectiveWidgetStats.paidCount}</span>
        </div>
        <div className="bg-surface border border-border p-6 rounded-card">
          <span className="text-[13px] font-bold text-ink-soft block">Tranche partielle</span>
          <span className="text-[38px] font-extrabold text-ink tracking-[-1.5px] mt-2 block">{effectiveWidgetStats.partialCount}</span>
        </div>
        <div className="bg-surface border border-border p-6 rounded-card">
          <span className="text-[13px] font-bold text-ink-soft block">Non payé / attente</span>
          <span className="text-[38px] font-extrabold text-accent tracking-[-1.5px] mt-2 block">{effectiveWidgetStats.unpaidCount}</span>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-surface rounded-card border border-border px-6 py-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Recherche */}
          <div className="relative w-full lg:w-96">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-ink-faint pointer-events-none">
              <SearchIcon size={16} />
            </span>
            <input
              type="text"
              placeholder="Rechercher par nom ou matricule…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-control text-sm bg-bg text-ink placeholder:text-ink-faint outline-none focus:border-accent focus:bg-surface transition-colors"
            />
          </div>

          {/* Filtres rapides */}
          <div className="flex flex-wrap gap-2.5 w-full lg:w-auto items-center justify-end">
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto bg-bg border border-border px-3.5 py-2.5 rounded-control text-[13px] font-bold text-ink-soft outline-none focus:border-accent cursor-pointer"
            >
              <option value="All">Toutes les classes</option>
              {classesOfActiveYear.map(c => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>

            <select
              value={selectedPaymentStatus}
              onChange={(e) => {
                setSelectedPaymentStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto bg-bg border border-border px-3.5 py-2.5 rounded-control text-[13px] font-bold text-ink-soft outline-none focus:border-accent cursor-pointer"
            >
              <option value="All">Tous les statuts</option>
              <option value="paid">Payé</option>
              <option value="partial">Partiel</option>
              <option value="unpaid">Non payé</option>
            </select>

            <select
              value={selectedGender}
              onChange={(e) => {
                setSelectedGender(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto bg-bg border border-border px-3.5 py-2.5 rounded-control text-[13px] font-bold text-ink-soft outline-none focus:border-accent cursor-pointer"
            >
              <option value="All">Tous</option>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des élèves */}
      <div className="bg-surface rounded-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-bold text-ink-faint uppercase tracking-[1px] bg-bg">
                <th className="px-6 py-3.5">Élève</th>
                <th className="px-4 py-3.5">Matricule</th>
                <th className="px-4 py-3.5">Classe</th>
                <th className="px-4 py-3.5 text-center">Genre</th>
                <th className="px-4 py-3.5">Scolarité (FCFA)</th>
                <th className="px-4 py-3.5">Statut</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {(useServerTable || isLoaded) && displayRows.length > 0 ? (
                displayRows.map((student) => {
                  const { totalDue, totalPaid, status } = student.precomputedStats!;
                  const progressPct = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;

                  return (
                    <tr key={student.id} className="border-t border-border-row hover:bg-row-hover transition-colors">
                      {/* Nom */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-[38px] h-[38px] rounded-[12px] bg-chip text-ink-soft font-extrabold text-xs flex items-center justify-center shrink-0">
                            {(student.prenom || '')[0] || ''}{(student.nom || '')[0] || ''}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-ink block truncate">
                              {student.nom} {student.prenom}
                            </span>
                            <span className="text-[11px] text-ink-faint block truncate">Parent : {student.nomParent}</span>
                          </div>
                        </div>
                      </td>

                      {/* Matricule */}
                      <td className="px-4 py-3.5 text-[13px] font-semibold text-ink-faint">
                        {student.matricule}
                      </td>

                      {/* Classe */}
                      <td className="px-4 py-3.5 text-ink-soft font-semibold">
                        {student.classeNomOverride || classesList.find(c => c.id === student.classeId)?.nom || student.classeId}
                      </td>

                      {/* Genre */}
                      <td className="px-4 py-3.5 text-center text-[13px] font-bold text-ink-soft">
                        {student.sexe}
                      </td>

                      {/* Barre de scolarité */}
                      <td className="px-4 py-3.5">
                        <div className="w-48">
                          <div className="text-[12px] font-semibold text-ink-soft mb-1.5">
                            {formatFCFA(totalPaid)} / {formatFCFA(totalDue)}
                          </div>
                          <div className="w-full bg-chip h-2 rounded-pill overflow-hidden">
                            <div
                              className="h-full rounded-pill transition-all duration-300"
                              style={{
                                width: `${progressPct}%`,
                                background: status === 'paid' ? 'var(--color-green)' : status === 'partial' ? 'var(--color-ink)' : 'var(--color-accent)',
                              }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Statut */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-pill text-[12px] font-extrabold ${
                          status === 'paid'
                            ? 'bg-green-bg text-green'
                            : status === 'partial'
                            ? 'bg-chip text-ink-soft'
                            : 'bg-red-bg text-accent'
                        }`}>
                          {status === 'paid' ? 'Payé' : status === 'partial' ? 'Partiel' : 'Non payé'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <Link
                            href={`/eleves/${student.id}`}
                            className="text-[13px] font-bold text-accent hover:text-accent-hover transition-colors"
                          >
                            Voir fiche →
                          </Link>
                          <button
                            onClick={(e) => handleDeleteStudent(student.id, `${student.nom} ${student.prenom}`, e)}
                            className="inline-flex items-center justify-center p-1.5 border border-outline hover:border-accent text-ink-faint hover:text-accent rounded-control transition-colors cursor-pointer"
                            title="Supprimer l'élève"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-ink-faint text-sm">
                    {(useServerTable || isLoaded) ? "Aucun élève ne correspond aux critères de recherche." : "Chargement des élèves…"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-border-row flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[13px] text-ink-faint font-medium">
            <span>Afficher</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-bg border border-border px-2 py-1 rounded-control outline-none focus:border-accent text-ink font-semibold"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
            <span>lignes</span>
            <span className="ml-2 font-semibold text-ink-soft">
              {totalItems > 0 ? (activePage - 1) * pageSize + 1 : 0} - {Math.min(activePage * pageSize, totalItems)} sur {totalItems} élèves
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(activePage - 1)}
              disabled={activePage === 1}
              className={`p-2 rounded-control border transition-colors ${
                activePage === 1 ? 'opacity-40 cursor-not-allowed border-outline text-ink-faint' : 'border-outline text-ink-soft hover:border-ink hover:text-ink'
              }`}
            >
              <ChevronLeftIcon size={16} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`w-9 h-9 rounded-control text-[13px] font-bold border transition-colors ${
                  activePage === page
                    ? 'bg-ink border-ink text-cream'
                    : 'border-outline text-ink-soft hover:border-ink hover:text-ink'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(activePage + 1)}
              disabled={activePage === totalPages}
              className={`p-2 rounded-control border transition-colors ${
                activePage === totalPages ? 'opacity-40 cursor-not-allowed border-outline text-ink-faint' : 'border-outline text-ink-soft hover:border-ink hover:text-ink'
              }`}
            >
              <ChevronRightIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal : inscription d'un élève */}
      {showAddModal && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-up">
          <div className="bg-surface rounded-card-lg w-full max-w-lg border border-border shadow-login p-7 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-control text-ink-faint hover:text-ink hover:bg-chip transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-extrabold text-ink tracking-[-0.5px] border-b border-border-row pb-3 mb-5">
              Inscrire un nouvel élève
            </h3>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-soft mb-1.5">Nom *</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full box-border px-3.5 py-2.5 bg-bg border border-border rounded-control text-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent focus:bg-surface transition-colors"
                    placeholder="ex: Fouda"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-soft mb-1.5">Prénom *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full box-border px-3.5 py-2.5 bg-bg border border-border rounded-control text-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent focus:bg-surface transition-colors"
                    placeholder="ex: Jean-Pierre"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-soft mb-1.5">Genre</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'M' | 'F')}
                    className="w-full box-border px-3.5 py-2.5 bg-bg border border-border rounded-control text-sm font-semibold text-ink outline-none focus:border-accent focus:bg-surface transition-colors cursor-pointer"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-soft mb-1.5">Classe *</label>
                  <select
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full box-border px-3.5 py-2.5 bg-bg border border-border rounded-control text-sm font-semibold text-ink outline-none focus:border-accent focus:bg-surface transition-colors cursor-pointer"
                  >
                    {classesOfActiveYear.length === 0 && <option value="">Aucune classe disponible</option>}
                    {classesOfActiveYear.map(c => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-soft mb-1.5">Matricule (vide = auto-généré)</label>
                  <input
                    type="text"
                    value={matricule}
                    onChange={(e) => setMatricule(e.target.value)}
                    className="w-full box-border px-3.5 py-2.5 bg-bg border border-border rounded-control text-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent focus:bg-surface transition-colors"
                    placeholder="ex: 26YAE011"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-soft mb-1.5">Date de naissance</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full box-border px-3.5 py-2.5 bg-bg border border-border rounded-control text-sm text-ink outline-none focus:border-accent focus:bg-surface transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1.5">Lieu de naissance</label>
                <input
                  type="text"
                  value={birthPlace}
                  onChange={(e) => setBirthPlace(e.target.value)}
                  className="w-full box-border px-3.5 py-2.5 bg-bg border border-border rounded-control text-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent focus:bg-surface transition-colors"
                  placeholder="ex: Yaoundé"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1.5">Montant payé à l&apos;inscription (FCFA)</label>
                <input
                  type="number"
                  value={initialPayment}
                  onChange={(e) => setInitialPayment(e.target.value)}
                  className="w-full box-border px-3.5 py-2.5 bg-bg border border-border rounded-control text-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent focus:bg-surface transition-colors"
                  placeholder="ex: 150000"
                  min="0"
                />
              </div>

              <div className="border-t border-border-row pt-4">
                <span className="text-xs font-extrabold text-ink-faint uppercase tracking-[1px] block mb-3">Responsable légal (parent)</span>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-ink-soft mb-1.5">Nom complet du parent *</label>
                    <input
                      type="text"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      className="w-full box-border px-3.5 py-2.5 bg-bg border border-border rounded-control text-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent focus:bg-surface transition-colors"
                      placeholder="ex: Emmanuel Fouda"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-ink-soft mb-1.5">Téléphone *</label>
                      <input
                        type="text"
                        value={parentPhone}
                        onChange={(e) => setParentPhone(e.target.value)}
                        className="w-full box-border px-3.5 py-2.5 bg-bg border border-border rounded-control text-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent focus:bg-surface transition-colors"
                        placeholder="ex: +237 677 88 99 00"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink-soft mb-1.5">Email du parent</label>
                      <input
                        type="email"
                        value={parentEmail}
                        onChange={(e) => setParentEmail(e.target.value)}
                        className="w-full box-border px-3.5 py-2.5 bg-bg border border-border rounded-control text-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent focus:bg-surface transition-colors"
                        placeholder="ex: parent.fouda@gmail.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border-row">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 border border-outline text-ink-soft hover:border-ink hover:text-ink rounded-control text-[13px] font-bold transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent-hover text-cream rounded-control text-[13px] font-extrabold shadow-cta transition-colors"
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
