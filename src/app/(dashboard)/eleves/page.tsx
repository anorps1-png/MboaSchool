'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { mockClassFees } from '@/mock/fees';
import Link from 'next/link';
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, DownloadIcon } from '@/components/icons';
import { Eleve, Classe } from '@/types/domain';
import { downloadExcel } from '@/lib/excel';
import SyncManager from '@/lib/syncManager';
import { getStudents, createStudent, addPayment } from '@/lib/queries/eleves';
import { getClasses } from '@/lib/queries/classes';
import { useEtablissement } from '@/contexts/etablissement-context';
import { createClient } from '@/lib/supabase/client';

export default function ElevesPage() {
  const { etablissementId } = useEtablissement();
  const [students, setStudents] = useState<Eleve[]>([]);
  const [classesList, setClassesList] = useState<Classe[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

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
          console.error("Error fetching classes:", error);
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
          console.error("Error fetching students:", error);
          setStudents([]);
        } finally {
          setIsLoaded(true);
        }
      };

      fetchEleves();
    }
  }, [etablissementId]);

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
    return students.filter(student => {
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
  }, [students, searchTerm, selectedClass, selectedPaymentStatus, selectedGender, isLoaded, getStudentPaymentStats]);

  // Total counts for widgets
  const widgetStats = useMemo(() => {
    if (!isLoaded) return { paidCount: 0, partialCount: 0, unpaidCount: 0, total: 0 };
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;

    students.forEach(s => {
      if (!s) return;
      const { status } = getStudentPaymentStats(s);
      if (status === 'paid') paidCount++;
      else if (status === 'partial') partialCount++;
      else unpaidCount++;
    });

    return { paidCount, partialCount, unpaidCount, total: students.length };
  }, [students, isLoaded, getStudentPaymentStats]);

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

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !parentName || !parentPhone) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    // Resolve the active year UUID dynamically
    let resolvedAnneeScolaireId = null;

    // 1. Try to get it from the selected class in classesList
    const selectedClassObj = classesList.find(c => c.id === className);
    if (selectedClassObj) {
      resolvedAnneeScolaireId = (selectedClassObj as any).annee_scolaire_id || (selectedClassObj as any).anneeScolaireId;
    }

    // 2. Try to get it from localStorage cached ID
    if (!resolvedAnneeScolaireId && typeof window !== 'undefined') {
      resolvedAnneeScolaireId = localStorage.getItem('mboaschool_active_year_id');
    }

    // 3. Try to extract it from loaded students list if any exist
    if (!resolvedAnneeScolaireId && students.length > 0) {
      const studentWithYear = students.find(s => s && s.anneeScolaireId);
      if (studentWithYear) {
        resolvedAnneeScolaireId = studentWithYear.anneeScolaireId;
      }
    }

    // 4. Try online query fallback if we are online
    const isOfflineMode = !navigator.onLine || (typeof window !== 'undefined' && (window as any).__forceOffline);
    if (!resolvedAnneeScolaireId && !isOfflineMode && etablissementId) {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: etab } = await supabase
          .from('etablissements')
          .select('annee_scolaire_active_id')
          .eq('id', etablissementId)
          .single();

        if (etab?.annee_scolaire_active_id) {
          resolvedAnneeScolaireId = etab.annee_scolaire_active_id;
          if (typeof window !== 'undefined') {
            localStorage.setItem('mboaschool_active_year_id', resolvedAnneeScolaireId);
          }
        } else {
          const { data: years } = await supabase
            .from('annees_scolaires')
            .select('id')
            .order('created_at', { ascending: false })
            .limit(1);
          if (years && years.length > 0) {
            resolvedAnneeScolaireId = years[0].id;
          }
        }
      } catch (err) {
        console.error("Failed to dynamically fetch active year ID:", err);
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
      classe_id: className,
      annee_scolaire_id: resolvedAnneeScolaireId,
      nom_parent: parentName,
      telephone_parent: parentPhone,
      email_parent: parentEmail,
      date_naissance: dateOfBirth,
      lieu_naissance: birthPlace,
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

  const getOrCreateClass = async (classNameStr: string, resolvedAnneeScolaireId: string) => {
    const existing = classesList.find(c => c.nom.toLowerCase().trim() === classNameStr.toLowerCase().trim() || c.id.toLowerCase().trim() === classNameStr.toLowerCase().trim());
    if (existing) return existing.id;

    const newClassData = {
      nom: classNameStr,
      niveau_id: classNameStr,
      annee_scolaire_id: resolvedAnneeScolaireId,
      prix: 200000
    };

    const isOffline = !navigator.onLine || (typeof window !== 'undefined' && (window as any).__forceOffline);

    if (isOffline) {
      const tempId = `temp_cls_${Date.now()}_${Math.floor(Math.random()*1000)}`;
      const newLocalClass: Classe = {
        id: tempId,
        nom: classNameStr,
        niveauId: classNameStr,
        anneeScolaireId: resolvedAnneeScolaireId
      };
      await SyncManager.addToQueue('classes', 'insert', { ...newClassData, id: tempId });
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
            niveauId: created.niveau_id,
            anneeScolaireId: created.annee_scolaire_id
          };
          setClassesList(prev => [...prev, newClassObj]);
          return created.id;
        }
      } catch (err) {
        console.error("Error creating class:", err);
      }
    }
    return classNameStr;
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let resolvedAnneeScolaireId = null;
    if (typeof window !== 'undefined') {
      resolvedAnneeScolaireId = localStorage.getItem('mboaschool_active_year_id');
    }
    if (!resolvedAnneeScolaireId && students.length > 0) {
      const studentWithYear = students.find(s => s && s.anneeScolaireId);
      if (studentWithYear) resolvedAnneeScolaireId = studentWithYear.anneeScolaireId;
    }
    if (!resolvedAnneeScolaireId && classesList.length > 0) {
      resolvedAnneeScolaireId = (classesList[0] as any).annee_scolaire_id || (classesList[0] as any).anneeScolaireId;
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

        const isOffline = !navigator.onLine || (typeof window !== 'undefined' && (window as any).__forceOffline);
        const supabase = createClient();

        for (const row of data) {
          const nom = row.Nom || row.nom || row.NOM || '';
          const prenom = row.Prénom || row.prenom || row.Prenom || row.PRENOM || '';
          if (!nom || !prenom) {
            errorsCount++;
            continue;
          }

          const sexe = (row.Sexe || row.sexe || row.SEXE || 'M').toUpperCase().trim() === 'F' ? 'F' : 'M';
          const classNameStr = row.Classe || row.classe || row.CLASSE || '';
          const nomParent = row["Nom Parent"] || row.nom_parent || row.Parent || row.parent || 'Parent Divers';
          const telephoneParent = row["Téléphone Parent"] || row.telephone_parent || row.Tel || row.tel || '+237 600 00 00 00';
          const emailParent = row["Email Parent"] || row.email_parent || row.Email || row.email || '';
          const dateNaissance = row["Date Naissance"] || row.date_naissance || row.Naissance || row.naissance || '2012-01-01';
          const lieuNaissance = row["Lieu Naissance"] || row.lieu_naissance || row.Lieu || row.lieu || 'Yaoundé';
          const matriculeVal = row.Matricule || row.matricule || row.MATRICULE || `26YAE${Math.floor(100 + Math.random() * 900)}`;

          let classId = '';
          if (classNameStr) {
            classId = await getOrCreateClass(classNameStr, resolvedAnneeScolaireId);
          } else if (classesList.length > 0) {
            classId = classesList[0].id;
          } else {
            errorsCount++;
            continue;
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
            statut: 'actif'
          };

          let studentId = '';
          let finalStudentObj: any = null;

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
              nomParent,
              telephoneParent,
              emailParent,
              paiements: [],
              notes: []
            };
          } else {
            const { data: createdData, error: createErr } = await supabase
              .from('eleves')
              .insert([{ ...studentData, etablissement_id: etablissementId }])
              .select();
            if (!createErr && createdData && createdData.length > 0) {
              studentId = createdData[0].id;
              finalStudentObj = {
                id: studentId,
                matricule: createdData[0].matricule,
                nom: createdData[0].nom,
                prenom: createdData[0].prenom,
                sexe: createdData[0].sexe,
                classeId: classId,
                nomParent: createdData[0].nom_parent,
                telephoneParent: createdData[0].telephone_parent,
                emailParent: createdData[0].email_parent || 'N/A',
                dateNaissance: createdData[0].date_naissance || '2012-01-01',
                lieuNaissance: createdData[0].lieu_naissance || 'Yaoundé',
                dateInscription: createdData[0].date_inscription,
                anneeScolaireId: createdData[0].annee_scolaire_id,
                statut: createdData[0].statut,
                paiements: [],
                notes: []
              };
            } else {
              errorsCount++;
              continue;
            }
          }

          const amountPaidVal = Number(row["Frais Payes"] || row.frais_payes || row["Montant Payé"] || row.montant_paye || 0);
          if (amountPaidVal > 0 && studentId) {
            const mode = row["Mode Paiement"] || row.mode_paiement || 'Espèces';
            const reference = row.Reference || row.reference || `REC-INS-${Date.now()}-${Math.floor(Math.random()*100)}`;
            const paymentData = {
              eleve_id: studentId,
              montant: amountPaidVal,
              date: new Date().toISOString().split('T')[0],
              type_frais: 'Scolarité',
              mode_paiement: mode,
              statut: 'paid',
              reference: reference
            };

            if (isOffline) {
              const localPayId = `temp_pay_${Date.now()}_${Math.floor(Math.random()*100)}`;
              await SyncManager.addToQueue('paiements', 'insert', { ...paymentData, id: localPayId });
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
                .insert([{ ...paymentData, etablissement_id: etablissementId }])
                .select();
              if (!payErr && payCreated && payCreated.length > 0) {
                finalStudentObj.paiements.push({
                  id: payCreated[0].id,
                  eleveId: studentId,
                  montant: Number(payCreated[0].montant),
                  date: payCreated[0].date,
                  typeFrais: payCreated[0].type_frais,
                  modePaiement: payCreated[0].mode_paiement,
                  statut: payCreated[0].statut,
                  reference: payCreated[0].reference
                });
              }
            }
          }

          if (finalStudentObj) {
            setStudents(prev => [finalStudentObj, ...prev]);
            importedCount++;
          }
        }

        triggerToast(`Importation réussie : ${importedCount} élèves importés. (${errorsCount} lignes ignorées)`);
      } catch (err) {
        console.error("Error parsing excel:", err);
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
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Hidden file input for Excel import */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportExcel} 
            accept=".xlsx, .xls" 
            className="hidden" 
          />
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            📋 Gabarit
          </button>
          <button
            onClick={handleTriggerFileInput}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            📥 Importer
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            <DownloadIcon size={14} />
            Exporter
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-md shadow-indigo-600/10 transition-colors cursor-pointer"
          >
            <PlusIcon size={14} />
            Inscrire un élève
          </button>
        </div>
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
                {classesList.map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
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
                            student.sexe === 'F' 
                              ? 'bg-rose-50 text-rose-600 border-rose-100'
                              : 'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                            {(student.prenom || '')[0] || ''}{(student.nom || '')[0] || ''}
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
                        {classesList.find(c => c.id === student.classeId)?.nom || student.classeId}
                      </td>

                      {/* Gender Badge */}
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          student.sexe === 'F' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {student.sexe}
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
                    {classesList.length === 0 && <option value="">Aucune classe disponible</option>}
                    {classesList.map(c => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
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

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Montant payé à l'inscription (FCFA)
                </label>
                <input
                  type="number"
                  value={initialPayment}
                  onChange={(e) => setInitialPayment(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-black"
                  placeholder="ex: 150000"
                  min="0"
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
