'use client';

import React, { useState, useEffect, use } from 'react';
import { mockStudents } from '@/mock/students';
import { mockClassFees, mockTransactions } from '@/mock/fees';
import Link from 'next/link';
import {
  ChevronLeftIcon,
  DownloadIcon,
  PhoneIcon,
  MailIcon
} from '@/components/icons';
import { Eleve, Paiement, NoteMatiere, TransactionPaiement, Classe, DisciplineIncident } from '@/types/domain';
import { createClient } from '@/lib/supabase/client';
import { useEtablissement } from '@/contexts/etablissement-context';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function FicheElevePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.id;
  const { etablissementId } = useEtablissement();

  const [students, setStudents] = useState<Eleve[]>([]);
  const [classesList, setClassesList] = useState<Classe[]>([]);
  const [student, setStudent] = useState<Eleve | undefined>(undefined);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'finance' | 'grades' | 'discipline'>('info');

  useEffect(() => {
    if (!etablissementId) return;
    const fetchData = async () => {
      const supabase = createClient();
      
      // Fetch classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('*')
        .eq('etablissement_id', etablissementId);
      if (classesData) setClassesList(classesData);

      // Fetch student with payments, notes, and discipline
      const { data: studentData } = await supabase
        .from('eleves')
        .select('*, paiements(*), notes(*), discipline(*)')
        .eq('id', studentId)
        .eq('etablissement_id', etablissementId)
        .single();

      if (studentData) {
        // Fetch all students in the same class to calculate rank
        const { data: classmatesData } = await supabase
          .from('eleves')
          .select('id, notes(*)')
          .eq('classe_id', studentData.classe_id)
          .eq('etablissement_id', etablissementId);
          
        if (classmatesData) {
          // Transform notes if needed to match interface
          const mappedClassmates = classmatesData.map(c => ({
            id: c.id,
            classeId: studentData.classe_id,
            notes: c.notes?.map((n: any) => ({
              id: n.id,
              note: Number(n.note),
              trimestre: n.trimestre,
              matiereId: n.matiere || n.matiere_id,
              evaluationMaternelle: n.evaluation_maternelle
            })) || []
          }));
          setStudents(mappedClassmates as any);
        }

        const mappedStudent = {
          id: studentData.id,
          matricule: studentData.matricule,
          nom: studentData.nom,
          prenom: studentData.prenom,
          sexe: studentData.sexe,
          classeId: studentData.classe_id,
          nomParent: studentData.nom_parent,
          telephoneParent: studentData.telephone_parent,
          emailParent: studentData.email_parent || 'N/A',
          dateNaissance: studentData.date_naissance || '2012-01-01',
          lieuNaissance: studentData.lieu_naissance || 'Yaoundé',
          dateInscription: studentData.date_inscription,
          statut: studentData.statut,
          paiements: studentData.paiements?.map((p: any) => ({
            id: p.id,
            eleveId: p.eleve_id,
            montant: Number(p.montant),
            date: p.date,
            typeFrais: p.type_frais,
            statut: p.statut,
            reference: p.reference,
            modePaiement: p.mode_paiement
          })) || [],
          notes: studentData.notes?.map((n: any) => ({
            id: n.id,
            note: Number(n.note),
            trimestre: n.trimestre,
            matiereId: n.matiere || n.matiere_id,
            evaluationMaternelle: n.evaluation_maternelle,
            enseignantId: n.enseignant_id
          })) || [],
          discipline: studentData.discipline?.map((d: any) => ({
            id: d.id,
            eleveId: d.eleve_id,
            dateIncident: d.date_incident,
            typeIncident: d.type_incident,
            motif: d.motif,
            sanction: d.sanction,
            statut: d.statut
          })) || []
        };
        setStudent(mappedStudent as any);
      }
      setIsLoaded(true);
    };

    if (typeof window !== 'undefined') {
      fetchData();
    }
  }, [studentId, etablissementId]);

  // Form states for adding payment
  const [payAmount, setPayAmount] = useState('');
  const [payType, setPayType] = useState<Paiement['typeFrais']>('Scolarité');
  const [payMethod, setPayMethod] = useState('Orange Money');
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);

  // Form states for editing/adding grades
  const [showAddGradeModal, setShowAddGradeModal] = useState(false);
  const [newGradeMatiere, setNewGradeMatiere] = useState('');
  const [newGradeValue, setNewGradeValue] = useState('');
  const [newGradeCoef, setNewGradeCoef] = useState('1');
  const [newGradeType, setNewGradeType] = useState('Classique'); // Classique ou Maternelle
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [editingGradeValue, setEditingGradeValue] = useState<number | string>('');

  // Form states for adding discipline
  const [showAddDisciplineModal, setShowAddDisciplineModal] = useState(false);
  const [newDisciplineType, setNewDisciplineType] = useState('Absence');
  const [newDisciplineMotif, setNewDisciplineMotif] = useState('');
  const [newDisciplineSanction, setNewDisciplineSanction] = useState('');
  const [newDisciplineStatut, setNewDisciplineStatut] = useState('Non notifié');

  const handleSaveGrade = async (gradeId: string, isMaternelle: boolean) => {
    if (!student) return;

    const updatedNotes = [...(student.notes || [])];
    const gradeIndex = updatedNotes.findIndex(g => g.id === gradeId);
    
    if (gradeIndex !== -1) {
      const updatePayload: any = {};

      if (isMaternelle) {
        updatePayload.evaluation_maternelle = editingGradeValue;
        updatedNotes[gradeIndex] = { ...updatedNotes[gradeIndex], evaluationMaternelle: editingGradeValue as any };
      } else {
        const numVal = Number(editingGradeValue);
        if (numVal >= 0 && numVal <= 20) {
          updatePayload.note = numVal;
          updatedNotes[gradeIndex] = { ...updatedNotes[gradeIndex], note: numVal };
        } else {
          alert('La note doit être comprise entre 0 et 20.');
          return;
        }
      }
      
      const supabase = createClient();
      const { error } = await supabase.from('notes').update(updatePayload).eq('id', gradeId);
      
      if (error) {
        alert("Erreur lors de la mise à jour de la note : " + error.message);
        return;
      }

      const updatedStudent = { ...student, notes: updatedNotes };
      setStudent(updatedStudent);
      triggerToast("Note mise à jour avec succès");
    }
    setEditingGradeId(null);
  };

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  if (!isLoaded) {
    return (
      <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl shadow-sm">
        <p className="text-slate-500">Chargement de la fiche élève...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Élève introuvable</h2>
        <p className="text-slate-500">L&apos;identifiant fourni ne correspond à aucun élève de notre base.</p>
        <Link
          href="/eleves"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          Retourner à la liste
        </Link>
      </div>
    );
  }

  // Financial calculations
  const classFeeConfig = mockClassFees.find(cf => cf.niveauId === student.classeId);
  const classObj = classesList.find(c => c.nom === student.classeId || c.id === student.classeId);
  const totalDue = classObj && typeof classObj.prix !== 'undefined' ? classObj.prix : (classFeeConfig ? classFeeConfig.total : 200000);
  const totalPaid = ((student.paiements || []) || [])
    .filter(p => p.statut === 'paid')
    .reduce((sum, p) => sum + p.montant, 0);
  const pendingAmount = totalDue - totalPaid;
  const paymentProgressPct = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;

  // Grade calculations
  const firstTermGrades = (student.notes || []).filter(g => g.trimestre === 'Trimestre 1');
  const secondTermGrades = (student.notes || []).filter(g => g.trimestre === 'Trimestre 2');

  const calculateWeightedAverage = (gradesList: NoteMatiere[]) => {
    if (gradesList.length === 0) return 0;
    const totalPoints = gradesList.reduce((sum, g) => sum + (((g.note || 0) || 0) * 1), 0);
    const totalCoefs = gradesList.reduce((sum, g) => sum + 1, 0);
    return totalPoints / totalCoefs;
  };

  const avgTrim1 = calculateWeightedAverage(firstTermGrades);
  const avgTrim2 = calculateWeightedAverage(secondTermGrades);

  // NOUVEAUX CALCULS (Rang, Points, Mention)
  const classmates = students.filter(s => s.classeId === student.classeId);
  const getStudentAvg = (s: Eleve) => calculateWeightedAverage((s.notes || []).filter(g => g.trimestre === 'Trimestre 1'));
  const allAvgs = classmates.map(getStudentAvg).sort((a,b) => b - a);
  const myRank = avgTrim1 > 0 ? allAvgs.indexOf(avgTrim1) + 1 : '--';
  const totalPointsTrim1 = firstTermGrades.filter(g => ((g.note || 0) || 0) !== undefined).reduce((sum, g) => sum + ((((g.note || 0) || 0) || 0) * 1), 0);
  const mentionTrim1 = avgTrim1 >= 16 ? 'Très Bien' : avgTrim1 >= 14 ? 'Bien' : avgTrim1 >= 12 ? 'Assez Bien' : avgTrim1 >= 10 ? 'Passable' : 'Insuffisant';

  // Handle report card download (print page)
  const handleDownloadBulletin = () => {
    if (student?.classeId) {
      window.open(`/evaluations/${student.classeId}/bulletin/${student.id}?term=Trimestre 1`, '_blank');
    } else {
      triggerToast("Classe de l'élève introuvable.");
    }
  };

  // Handle adding payment
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    const amountVal = Number(payAmount);
    if (!amountVal || amountVal <= 0) {
      alert("Veuillez saisir un montant valide.");
      return;
    }

    const reference = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const supabase = createClient();
    const { data: payData, error } = await supabase.from('paiements').insert([{
      eleve_id: student.id,
      montant: amountVal,
      date: new Date().toISOString().split('T')[0],
      type_frais: payType,
      statut: 'paid',
      reference: reference,
      mode_paiement: payMethod,
      etablissement_id: etablissementId
    }]).select();

    if (error) {
      alert("Erreur lors de l'enregistrement du paiement: " + error.message);
      return;
    }

    if (payData && payData.length > 0) {
      const p = payData[0];
      const newPaymentObj: Paiement = {
        id: p.id,
        eleveId: p.eleve_id,
        montant: Number(p.montant),
        date: p.date,
        typeFrais: p.type_frais as any,
        statut: p.statut as any,
        reference: p.reference,
        modePaiement: p.mode_paiement as any
      };

      const updatedStudent: Eleve = {
        ...student,
        paiements: [newPaymentObj, ...(student.paiements || [])]
      };
      setStudent(updatedStudent);
    }

    // Cleanup form and close modal
    setPayAmount('');
    setShowAddPaymentModal(false);
    triggerToast(`Paiement de ${new Intl.NumberFormat('fr-FR').format(amountVal)} FCFA validé.`);
  };

  // Handle adding grade
  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    if (!newGradeMatiere.trim()) {
      alert("Veuillez saisir le nom de la matière.");
      return;
    }

    const supabase = createClient();
    const payload: any = {
      eleve_id: student.id,
      matiere: newGradeMatiere, // Necessite ALTER TABLE notes RENAME COLUMN matiere_id TO matiere; ALTER TABLE notes ALTER COLUMN matiere TYPE TEXT;
      trimestre: 'Trimestre 1',
      coefficient: Number(newGradeCoef) || 1,
      etablissement_id: etablissementId
    };

    if (newGradeType === 'Maternelle') {
      payload.evaluation_maternelle = newGradeValue;
    } else {
      const n = Number(newGradeValue);
      if (n < 0 || n > 20) {
        alert("La note doit être entre 0 et 20");
        return;
      }
      payload.note = n;
    }

    const { data: gradeData, error } = await supabase.from('notes').insert([payload]).select();

    if (error) {
      alert("Erreur lors de l'ajout de la note: " + error.message);
      return;
    }

    if (gradeData && gradeData.length > 0) {
      const g = gradeData[0];
      const newGradeObj = {
        id: g.id,
        note: Number(g.note),
        trimestre: g.trimestre,
        matiereId: g.matiere || g.matiere_id,
        evaluationMaternelle: g.evaluation_maternelle,
        enseignantId: g.enseignant_id
      };

      const updatedStudent = {
        ...student,
        notes: [...(student.notes || []), newGradeObj]
      };
      setStudent(updatedStudent as any);
    }

    setNewGradeMatiere('');
    setNewGradeValue('');
    setShowAddGradeModal(false);
    triggerToast(`Note ajoutée avec succès !`);
  };

  // Handle adding discipline incident
  const handleAddDiscipline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    if (!newDisciplineMotif.trim()) {
      alert("Veuillez saisir un motif.");
      return;
    }

    const supabase = createClient();
    const payload = {
      eleve_id: student.id,
      date_incident: new Date().toISOString().split('T')[0],
      type_incident: newDisciplineType,
      motif: newDisciplineMotif,
      sanction: newDisciplineSanction,
      statut: newDisciplineStatut,
      etablissement_id: etablissementId
    };

    const { data: discData, error } = await supabase.from('discipline').insert([payload]).select();

    if (error) {
      alert("Erreur lors de l'ajout de l'incident: " + error.message);
      return;
    }

    if (discData && discData.length > 0) {
      const d = discData[0];
      const newDiscObj: DisciplineIncident = {
        id: d.id,
        eleveId: d.eleve_id,
        dateIncident: d.date_incident,
        typeIncident: d.type_incident,
        motif: d.motif,
        sanction: d.sanction,
        statut: d.statut
      };

      const updatedStudent = {
        ...student,
        discipline: [newDiscObj, ...(student.discipline || [])]
      };
      setStudent(updatedStudent as any);
    }

    setNewDisciplineMotif('');
    setNewDisciplineSanction('');
    setNewDisciplineStatut('Non notifié');
    setShowAddDisciplineModal(false);
    triggerToast(`Incident ajouté avec succès !`);
  };

  const formatFCFA = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const displayClasse = classesList.find(c => c.id === student.classeId)?.nom || student.classeId;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-slate-800 text-white px-5 py-3.5 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-in slide-in-from-bottom-6 duration-300">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white">✓</div>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Back button and title */}
      <div className="flex items-center gap-4">
        <Link
          href="/eleves"
          className="p-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-600 transition-colors"
        >
          <ChevronLeftIcon size={20} />
        </Link>
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800 tracking-tight text-black">
            Fiche Élève : {student.nom} {student.prenom}
          </h1>
          <p className="text-xs text-slate-500">
            Matricule : <span className="font-mono font-semibold">{student.matricule}</span> • Classe : <span className="font-semibold">{displayClasse}</span>
          </p>
        </div>
      </div>

      {/* Main Student Header Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full font-black text-2xl flex items-center justify-center border shadow-inner ${
            student.sexe === 'F' 
              ? 'bg-rose-50 text-rose-600 border-rose-100'
              : 'bg-blue-50 text-blue-600 border-blue-100'
          }`}>
            {(student.prenom || '')[0] || ''}{(student.nom || '')[0] || ''}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 text-black">{student.nom} {student.prenom}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500 font-medium">
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                student.sexe === 'F' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {student.sexe}
              </span>
              <span>• Né(e) le {student.dateNaissance} à {student.lieuNaissance}</span>
              <span>• Inscrit(e) le {student.dateInscription}</span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold border ${
          student.statut === 'actif'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
            : student.statut === 'suspendu'
            ? 'bg-red-50 text-red-700 border-red-100'
            : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            student.statut === 'actif' ? 'bg-emerald-500' : 'bg-red-500'
          }`}></span>
          {student.statut === 'actif' ? 'Inscrit / Actif' : 'Suspendu'}
        </span>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('info')}
          className={`px-5 py-3.5 text-sm font-bold border-b-2 transition-all -mb-px ${
            activeTab === 'info'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          Informations Générales
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          className={`px-5 py-3.5 text-sm font-bold border-b-2 transition-all -mb-px ${
            activeTab === 'finance'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          Scolarité & Finance
        </button>
        <button
          onClick={() => setActiveTab('grades')}
          className={`px-5 py-3.5 text-sm font-bold border-b-2 transition-all -mb-px ${
            activeTab === 'grades'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          Notes & Bulletins
        </button>
        <button
          onClick={() => setActiveTab('discipline')}
          className={`px-5 py-3.5 text-sm font-bold border-b-2 transition-all -mb-px ${
            activeTab === 'discipline'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          Discipline & Absences
        </button>
      </div>

      {/* Tab Panels */}
      <div className="min-h-96">
        {/* Tab 1: Informations Panel */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
            {/* Identity Info Card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                Fiche d&apos;Identité de l&apos;élève
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm leading-relaxed">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Nom complet</span>
                  <span className="font-semibold text-slate-800 text-black">{student.nom} {student.prenom}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Matricule</span>
                  <span className="font-mono font-bold text-indigo-600">{student.matricule}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Genre</span>
                  <span className="font-semibold text-slate-800 text-black">{student.sexe === 'M' ? 'Masculin' : 'Féminin'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Classe</span>
                  <span className="font-semibold text-slate-800 text-black">{displayClasse}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Date de naissance</span>
                  <span className="font-semibold text-slate-800 text-black">{student.dateNaissance}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Lieu de naissance</span>
                  <span className="font-semibold text-slate-800 text-black">{student.lieuNaissance}</span>
                </div>
              </div>
            </div>

            {/* Parent contact card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                Responsable Légal (Parent)
              </h3>
              
              <div className="space-y-3.5">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Nom du parent</span>
                  <span className="font-semibold text-slate-800 text-black">{student.nomParent}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <PhoneIcon size={14} className="text-slate-400" />
                  <span>Téléphone : </span>
                  <a href={`tel:${student.telephoneParent}`} className="font-semibold text-indigo-600 hover:underline">
                    {student.telephoneParent}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MailIcon size={14} className="text-slate-400" />
                  <span>Email : </span>
                  {student.emailParent !== 'N/A' ? (
                    <a href={`mailto:${student.emailParent}`} className="font-semibold text-indigo-600 hover:underline">
                      {student.emailParent}
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">Non communiqué</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Finance Panel */}
        {activeTab === 'finance' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Financial indicators card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Frais Totaux Annuel</span>
                <span className="text-xl font-extrabold text-slate-800 block mt-1 text-black">{formatFCFA(totalDue)}</span>
                <span className="text-[10px] text-slate-400 mt-1 block">Classe : {displayClasse}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Montant Payé</span>
                <span className="text-xl font-extrabold text-emerald-600 block mt-1">{formatFCFA(totalPaid)}</span>
                
                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2 max-w-[200px]">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${paymentProgressPct}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex justify-between items-center sm:block">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reste à recouvrer</span>
                  <span className={`text-xl font-extrabold block mt-1 ${pendingAmount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                    {formatFCFA(pendingAmount)}
                  </span>
                </div>
                {pendingAmount > 0 && (
                  <button
                    onClick={() => setShowAddPaymentModal(true)}
                    className="mt-3.5 px-4.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-md shadow-indigo-600/10 transition-colors"
                  >
                    Enregistrer un paiement
                  </button>
                )}
              </div>
            </div>

            {/* Payments history table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Historique des versements</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/20">
                      <th className="px-6 py-3">Réf / Reçu</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Montant</th>
                      <th className="px-6 py-3">Mode</th>
                      <th className="px-6 py-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {((student.paiements || []) || [])?.length > 0 ? (
                      ((student.paiements || []) || [])?.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-500">{pay.reference}</td>
                          <td className="px-6 py-4 text-slate-500 text-xs">{pay.date}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              pay.typeFrais === 'Inscription' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                            }`}>
                              {pay.typeFrais}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800 text-black">{formatFCFA(pay.montant)}</td>
                          <td className="px-6 py-4 text-slate-500 text-xs">{pay.modePaiement}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                              pay.statut === 'paid' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-amber-600 bg-amber-50 border-amber-100'
                            } px-2 py-0.5 rounded-full border`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                pay.statut === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}></span>
                              {pay.statut === 'paid' ? 'Validé' : 'En attente'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                          Aucun paiement enregistré pour le moment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Grades Panel */}
        {activeTab === 'grades' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Average summaries card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap gap-8 w-full">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Moyenne Trimestre 1</span>
                  <span className={`text-3xl font-extrabold block ${avgTrim1 >= 10 ? 'text-indigo-600' : 'text-rose-600'}`}>
                    {avgTrim1 > 0 ? avgTrim1.toFixed(2) : '--'} <span className="text-sm text-slate-500 font-semibold">/ 20</span>
                  </span>
                  {avgTrim1 > 0 && <span className="text-xs font-bold text-slate-500 mt-1 block">Mention: {mentionTrim1}</span>}
                </div>
                
                <div className="border-l border-slate-100 pl-8">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rang / Effectif</span>
                  <span className="text-3xl font-extrabold block text-slate-800 text-black">
                    {myRank} <span className="text-sm text-slate-500 font-semibold">/ {classmates.length}</span>
                  </span>
                  <span className="text-xs font-bold text-slate-500 mt-1 block">Dans la classe {displayClasse}</span>
                </div>

                <div className="border-l border-slate-100 pl-8">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total des points</span>
                  <span className="text-3xl font-extrabold block text-slate-800 text-black">
                    {totalPointsTrim1}
                  </span>
                </div>
              </div>
              <button
                onClick={handleDownloadBulletin}
                className="px-4 py-2 border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/20 hover:text-indigo-600 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <DownloadIcon size={14} />
                Télécharger bulletin
              </button>
            </div>

            {/* Grades list by Term */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block text-black">Détails des notes par matière</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-400">Trimestre 1</span>
                  <button
                    onClick={() => setShowAddGradeModal(true)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-lg transition-colors"
                  >
                    + Ajouter une note
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/20">
                      <th className="px-6 py-3">Matière</th>
                      <th className="px-6 py-3 text-center">Coefficient</th>
                      <th className="px-6 py-3 text-center">Évaluation / Note</th>
                      <th className="px-6 py-3">Enseignant</th>
                      <th className="px-6 py-3">Appréciation</th>
                      <th className="px-6 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {firstTermGrades.length > 0 ? (
                      firstTermGrades.map((g, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-800 text-black">{g.matiereId}</td>
                          <td className="px-6 py-4 text-center text-slate-600 font-medium">{g.evaluationMaternelle ? '-' : 1}</td>
                          <td className={`px-6 py-4 text-center font-bold ${editingGradeId === g.id ? '' : (g.evaluationMaternelle ? (g.evaluationMaternelle === 'Acquis' ? 'text-emerald-600' : g.evaluationMaternelle === 'En cours' ? 'text-amber-500' : 'text-rose-600') : (((g.note || 0)) >= 12 ? 'text-emerald-600' : ((g.note || 0)) >= 10 ? 'text-indigo-600' : 'text-rose-600'))}`}>
                            {editingGradeId === g.id ? (
                              g.evaluationMaternelle ? (
                                <select 
                                  value={editingGradeValue} 
                                  onChange={(e) => setEditingGradeValue(e.target.value)}
                                  className="border border-indigo-200 rounded px-2 py-1 text-xs text-black w-full"
                                >
                                  <option value="Acquis">Acquis</option>
                                  <option value="En cours">En cours</option>
                                  <option value="Non acquis">Non acquis</option>
                                </select>
                              ) : (
                                <input 
                                  type="number" 
                                  min="0" max="20" step="0.25"
                                  value={editingGradeValue} 
                                  onChange={(e) => setEditingGradeValue(e.target.value)}
                                  className="border border-indigo-200 rounded px-2 py-1 text-xs text-black w-20 text-center"
                                />
                              )
                            ) : (
                              g.evaluationMaternelle ? g.evaluationMaternelle : `${((g.note || 0))} / 20`
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-medium">{g.enseignantId}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              g.evaluationMaternelle ? (g.evaluationMaternelle === 'Acquis' ? 'bg-emerald-50 text-emerald-700' : g.evaluationMaternelle === 'En cours' ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700') : (((g.note || 0)) >= 14 ? 'bg-emerald-50 text-emerald-700' : ((g.note || 0)) >= 10 ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700')
                            }`}>
                              {g.evaluationMaternelle ? (g.evaluationMaternelle === 'Acquis' ? 'Très Bien' : g.evaluationMaternelle === 'En cours' ? 'En Progression' : 'A Renforcer') : (((g.note || 0)) >= 16 ? 'Très Bien' : ((g.note || 0)) >= 14 ? 'Bien' : ((g.note || 0)) >= 12 ? 'Assez Bien' : ((g.note || 0)) >= 10 ? 'Passable' : 'Insuffisant')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {editingGradeId === g.id ? (
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => handleSaveGrade(g.id, !!g.evaluationMaternelle)} className="text-emerald-600 hover:text-emerald-700 font-bold text-xs">Enregistrer</button>
                                <button onClick={() => setEditingGradeId(null)} className="text-slate-400 hover:text-slate-600 text-xs">Annuler</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingGradeId(g.id);
                                  setEditingGradeValue(g.evaluationMaternelle || g.note || 0);
                                }}
                                className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold"
                              >
                                Modifier
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                          Aucune note enregistrée pour ce trimestre.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {firstTermGrades.length > 0 && (
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-black">
                      <tr>
                        <td colSpan={2} className="px-6 py-4 text-right uppercase text-xs tracking-wider">Bilan du Trimestre :</td>
                        <td className="px-6 py-4 text-center text-indigo-600 text-base">
                          {firstTermGrades.some(g => g.evaluationMaternelle) ? 'N/A' : (firstTermGrades.reduce((sum, g) => sum + (g.note || 0), 0) / firstTermGrades.length).toFixed(2) + ' / 20'}
                        </td>
                        <td colSpan={3} className="px-6 py-4 text-sm text-slate-500">
                          {firstTermGrades.some(g => g.evaluationMaternelle) ? (
                            <span className="text-emerald-600 font-medium">Évaluation par compétences (Maternelle)</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <span>Total des points: {firstTermGrades.reduce((sum, g) => sum + (g.note || 0), 0)}</span>
                              <span>Rang estimé: {student.id === 'stud-1' ? '1er' : '3ème'} / 45</span>
                              <span className="text-xs font-semibold text-indigo-500">Mention: {(firstTermGrades.reduce((sum, g) => sum + (g.note || 0), 0) / firstTermGrades.length) >= 12 ? 'Tableau d\'Honneur' : 'Encouragements'}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Discipline Panel */}
        {activeTab === 'discipline' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Summary cards */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Absences</span>
                <span className="text-2xl font-extrabold text-amber-500 block mt-1">{(student.discipline || []).filter(d => d.typeIncident === 'Absence').length}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Retards</span>
                <span className="text-2xl font-extrabold text-amber-500 block mt-1">{(student.discipline || []).filter(d => d.typeIncident === 'Retard').length}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avertissements</span>
                <span className="text-2xl font-extrabold text-rose-500 block mt-1">{(student.discipline || []).filter(d => d.typeIncident === 'Avertissement').length}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Exclusions</span>
                <span className="text-2xl font-extrabold text-rose-700 block mt-1">{(student.discipline || []).filter(d => d.typeIncident === 'Exclusion').length}</span>
              </div>
            </div>

            {/* Discipline History List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block text-black">Historique Disciplinaire</span>
                <button
                  onClick={() => setShowAddDisciplineModal(true)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg transition-colors"
                >
                  + Signaler un incident
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/20">
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Motif détaillé</th>
                      <th className="px-6 py-3">Sanction</th>
                      <th className="px-6 py-3">Statut Parent</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {student.discipline && student.discipline.length > 0 ? (
                      student.discipline.map((disc, idx) => (
                        <tr key={disc.id || idx} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4 text-slate-600 font-medium whitespace-nowrap">{disc.dateIncident}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ['Avertissement', 'Blâme', 'Exclusion'].includes(disc.typeIncident) ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                              {disc.typeIncident}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-800 text-black font-medium">{disc.motif}</td>
                          <td className="px-6 py-4 text-slate-500 italic">{disc.sanction || '-'}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                              disc.statut === 'Notifié au parent' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 
                              disc.statut === 'Convoqué' ? 'text-rose-600 bg-rose-50 border-rose-100' : 
                              disc.statut === 'Clos' ? 'text-slate-600 bg-slate-50 border-slate-200' : 
                              'text-amber-600 bg-amber-50 border-amber-100'
                            } px-2 py-0.5 rounded-full border`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                disc.statut === 'Notifié au parent' ? 'bg-emerald-500' : 
                                disc.statut === 'Convoqué' ? 'bg-rose-500' : 
                                disc.statut === 'Clos' ? 'bg-slate-500' : 
                                'bg-amber-500'
                              }`}></span>
                              {disc.statut}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                          Aucun incident disciplinaire ni absence à signaler.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Simulated Add Payment Modal */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-100 shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowAddPaymentModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 text-black">
              Enregistrer un paiement
            </h3>

            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Montant (FCFA)
                </label>
                <input
                  type="number"
                  placeholder="Saisissez le montant"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Type de frais
                </label>
                <select
                  value={payType}
                  onChange={(e) => setPayType(e.target.value as Paiement['typeFrais'])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                >
                  <option value="Scolarité">Frais de Scolarité</option>
                  <option value="Inscription">Frais d&apos;Inscription</option>
                  <option value="Examen">Frais d&apos;Examen</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Mode de règlement
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                >
                  <option value="Orange Money">Orange Money</option>
                  <option value="MTN Mobile Money">MTN Mobile Money</option>
                  <option value="Espèces">Espèces (Guichet)</option>
                  <option value="Virement Bancaire">Virement Bancaire</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddPaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-600/10 transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Grade Modal */}
      {showAddGradeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-100 shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowAddGradeModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 text-black">
              Ajouter une note (Trimestre 1)
            </h3>

            <form onSubmit={handleAddGrade} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Matière
                </label>
                <input
                  type="text"
                  placeholder="ex: Mathématiques"
                  value={newGradeMatiere}
                  onChange={(e) => setNewGradeMatiere(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Type d'évaluation
                </label>
                <select
                  value={newGradeType}
                  onChange={(e) => {
                    setNewGradeType(e.target.value);
                    setNewGradeValue('');
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                >
                  <option value="Classique">Note sur 20 (Classique)</option>
                  <option value="Maternelle">Compétence (Maternelle)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Évaluation / Note
                </label>
                {newGradeType === 'Maternelle' ? (
                  <select
                    value={newGradeValue}
                    onChange={(e) => setNewGradeValue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                    required
                  >
                    <option value="">Sélectionnez...</option>
                    <option value="Acquis">Acquis</option>
                    <option value="En cours">En cours de cycle</option>
                    <option value="Non acquis">Non acquis</option>
                  </select>
                ) : (
                  <input
                    type="number"
                    min="0" max="20" step="0.25"
                    placeholder="Note sur 20"
                    value={newGradeValue}
                    onChange={(e) => setNewGradeValue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                    required
                  />
                )}
              </div>

              {newGradeType === 'Classique' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Coefficient
                  </label>
                  <input
                    type="number"
                    min="1" max="10"
                    value={newGradeCoef}
                    onChange={(e) => setNewGradeCoef(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                    required
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddGradeModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-600/10 transition-colors"
                >
                  Ajouter la note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Discipline Modal */}
      {showAddDisciplineModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-100 shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowAddDisciplineModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-bold text-rose-700 border-b border-slate-100 pb-3 mb-4">
              Signaler un incident / Absence
            </h3>

            <form onSubmit={handleAddDiscipline} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Type d'incident *
                </label>
                <select
                  value={newDisciplineType}
                  onChange={(e) => setNewDisciplineType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-black"
                >
                  <option value="Absence">Absence</option>
                  <option value="Retard">Retard</option>
                  <option value="Avertissement">Avertissement</option>
                  <option value="Blâme">Blâme</option>
                  <option value="Exclusion">Exclusion temporaire</option>
                  <option value="Autre">Autre incident</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Motif détaillé *
                </label>
                <textarea
                  placeholder="Expliquez la situation..."
                  value={newDisciplineMotif}
                  onChange={(e) => setNewDisciplineMotif(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-black resize-none"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Sanction (Optionnelle)
                </label>
                <input
                  type="text"
                  placeholder="ex: 2h de colle, Mise à pied de 2 jours..."
                  value={newDisciplineSanction}
                  onChange={(e) => setNewDisciplineSanction(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Statut vis-à-vis des parents
                </label>
                <select
                  value={newDisciplineStatut}
                  onChange={(e) => setNewDisciplineStatut(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-black"
                >
                  <option value="Non notifié">Non notifié au parent</option>
                  <option value="Notifié au parent">Notifié (SMS/Email/Carnet)</option>
                  <option value="Convoqué">Parent convoqué</option>
                  <option value="Clos">Dossier clos</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDisciplineModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-md shadow-rose-600/10 transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
