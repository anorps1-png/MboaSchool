'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useEtablissement } from '@/contexts/etablissement-context';

interface SupabaseClasse {
  id: string;
  nom: string;
  niveau: string;
  section: string | null;
  prix: number | null;
}

export default function ClassesPage() {
  const [classesList, setClassesList] = useState<SupabaseClasse[]>([]);
  const [elevesCount, setElevesCount] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [nom, setNom] = useState('');
  const [niveau, setNiveau] = useState('');
  const [section, setSection] = useState('Francophone');
  const [prix, setPrix] = useState('');

  // Edit form states
  const [editingClass, setEditingClass] = useState<SupabaseClasse | null>(null);
  const [editNom, setEditNom] = useState('');
  const [editNiveau, setEditNiveau] = useState('');
  const [editSection, setEditSection] = useState('Francophone');
  const [editPrix, setEditPrix] = useState('');

  const { etablissementId } = useEtablissement();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (etablissementId) fetchData();
  }, [etablissementId]);

  const fetchData = async () => {
    if (!etablissementId) return;
    setIsLoading(true);
    
    // Fetch classes filtered by etablissement
    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select('*')
      .eq('etablissement_id', etablissementId)
      .order('niveau', { ascending: true })
      .order('nom', { ascending: true });

    if (classesData) {
      setClassesList(classesData);
    }

    // Fetch eleves to count them per class (filtered by etablissement) with pagination
    let allElevesData: any[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;
    while (hasMore) {
      const { data } = await supabase
        .from('eleves')
        .select('classe_id')
        .eq('etablissement_id', etablissementId)
        .range(from, from + step - 1);
      if (data && data.length > 0) {
        allElevesData = allElevesData.concat(data);
        from += step;
        if (data.length < step) hasMore = false;
      } else {
        hasMore = false;
      }
    }
    
    const counts: Record<string, number> = {};
    allElevesData.forEach(e => {
      if (e.classe_id) {
        counts[e.classe_id] = (counts[e.classe_id] || 0) + 1;
      }
    });
    setElevesCount(counts);

    setIsLoading(false);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data, error } = await supabase
      .from('classes')
      .insert([
        {
          nom,
          niveau,
          section,
          prix: Number(prix) || 0,
          etablissement_id: etablissementId,
        }
      ])
      .select();

    if (error) {
      alert("Erreur lors de l'ajout de la classe: " + error.message);
    } else if (data) {
      setClassesList([...classesList, ...data]);
      setShowAddModal(false);
      setNom('');
      setNiveau('');
      setSection('Francophone');
      setPrix('');
      triggerToast('Classe créée avec succès !');
    }
    
    setIsSubmitting(false);
  };

  const handleStartEdit = (cls: SupabaseClasse, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setEditingClass(cls);
    setEditNom(cls.nom || '');
    setEditNiveau(cls.niveau || '');
    setEditSection(cls.section || 'Francophone');
    setEditPrix(cls.prix ? cls.prix.toString() : '');
  };

  const handleEditClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    setIsSubmitting(true);

    const { data, error } = await supabase
      .from('classes')
      .update({
        nom: editNom,
        niveau: editNiveau,
        section: editSection,
        prix: Number(editPrix) || 0
      })
      .eq('id', editingClass.id)
      .select();

    if (error) {
      alert("Erreur lors de la modification de la classe: " + error.message);
    } else if (data && data.length > 0) {
      setClassesList(classesList.map(c => c.id === editingClass.id ? data[0] : c));
      setEditingClass(null);
      triggerToast('Classe modifiée avec succès !');
    }
    
    setIsSubmitting(false);
  };

  const handleDeleteClass = async (id: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Check if there are students in this class
    if (elevesCount[id] > 0) {
      alert("Impossible de supprimer cette classe car elle contient des élèves. Réaffectez les élèves d'abord.");
      return;
    }

    if (confirm('Voulez-vous vraiment supprimer cette classe définitivement ?')) {
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (error) {
        alert("Erreur lors de la suppression: " + error.message);
      } else {
        setClassesList(classesList.filter(c => c.id !== id));
        triggerToast('Classe supprimée !');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl z-50 flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white">✓</div>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Configuration des Classes</h1>
          <p className="text-sm text-slate-500 mt-1">Gérez les niveaux, les sections et les frais de scolarité</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95"
        >
          + Nouvelle Classe
        </button>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : classesList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">🏫</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Aucune classe configurée</h3>
          <p className="text-slate-500 text-sm max-w-md mb-6">Créez votre première classe pour commencer à y inscrire des élèves et définir les frais de scolarité associés.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold transition-colors"
          >
            Créer ma première classe
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {classesList.map(cls => (
            <Link key={cls.id} href={`/classes/${encodeURIComponent(cls.id)}`} className="group block relative bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              {/* Bouton de modification (visible au hover) */}
              <button
                onClick={(e) => handleStartEdit(cls, e)}
                className="absolute top-4 right-14 w-8 h-8 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-100"
                title="Modifier la classe"
              >
                ✏️
              </button>
              {/* Bouton de suppression (visible au hover) */}
              <button
                onClick={(e) => handleDeleteClass(cls.id, e)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-100"
                title="Supprimer la classe"
              >
                ✕
              </button>
              
              <div className="flex justify-between items-start mb-4">
                <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                  cls.section === 'Anglophone' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {cls.section || 'Francophone'}
                </span>
              </div>
              
              <h2 className="text-2xl font-extrabold text-slate-800 mb-1">{cls.nom}</h2>
              <p className="text-sm font-medium text-slate-500 mb-4">{cls.niveau}</p>
              
              <div className="bg-slate-50 rounded-xl p-3 mb-4">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Scolarité Annuelle</p>
                <p className="text-lg font-extrabold text-indigo-600">
                  {cls.prix ? `${new Intl.NumberFormat('fr-FR').format(cls.prix)} FCFA` : '0 FCFA'}
                </p>
              </div>
              
              <div className="flex justify-between items-center text-sm border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-600 font-semibold">{elevesCount[cls.id] || 0} Élèves</span>
                </div>
                <span className="text-slate-400 font-bold group-hover:text-indigo-600 transition-colors">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal de modification */}
      {editingClass && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md border border-slate-100 shadow-2xl overflow-hidden">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-extrabold text-slate-800">Modifier la Classe</h3>
                <p className="text-xs text-slate-500 mt-1">Modifiez les détails de la classe</p>
              </div>
              <button onClick={() => setEditingClass(null)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleEditClass} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Nom exact de la classe *</label>
                  <input type="text" value={editNom} onChange={(e) => setEditNom(e.target.value)} required placeholder="Ex: 6ème A" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Niveau *</label>
                  <input type="text" value={editNiveau} onChange={(e) => setEditNiveau(e.target.value)} required placeholder="Ex: 6ème" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Sous-système</label>
                  <select value={editSection} onChange={(e) => setEditSection(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                    <option value="Francophone">Francophone</option>
                    <option value="Anglophone">Anglophone</option>
                    <option value="Bilingue">Bilingue</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Scolarité Globale (FCFA) *</label>
                <div className="relative">
                  <input type="number" value={editPrix} onChange={(e) => setEditPrix(e.target.value)} required placeholder="Ex: 250000" min="0" className="w-full px-4 py-3 pl-12 bg-slate-50 border border-slate-200 rounded-xl text-lg text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">💰</span>
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <button type="button" onClick={() => setEditingClass(null)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-200 transition-all disabled:opacity-50">
                  {isSubmitting ? 'Modification...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal d'ajout */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md border border-slate-100 shadow-2xl overflow-hidden">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-extrabold text-slate-800">Nouvelle Classe</h3>
                <p className="text-xs text-slate-500 mt-1">Configurez une classe et son tarif</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddClass} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Nom exact de la classe *</label>
                  <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} required placeholder="Ex: 6ème A" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Niveau *</label>
                  <input type="text" value={niveau} onChange={(e) => setNiveau(e.target.value)} required placeholder="Ex: 6ème" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Sous-système</label>
                  <select value={section} onChange={(e) => setSection(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                    <option value="Francophone">Francophone</option>
                    <option value="Anglophone">Anglophone</option>
                    <option value="Bilingue">Bilingue</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Scolarité Globale (FCFA) *</label>
                <div className="relative">
                  <input type="number" value={prix} onChange={(e) => setPrix(e.target.value)} required placeholder="Ex: 250000" min="0" className="w-full px-4 py-3 pl-12 bg-slate-50 border border-slate-200 rounded-xl text-lg text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">💰</span>
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-200 transition-all disabled:opacity-50">
                  {isSubmitting ? 'Création...' : 'Créer la classe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
