'use client';

import React, { useState, useEffect } from 'react';
import { SearchIcon, PlusIcon, DownloadIcon } from '@/components/icons';
import { createClient } from '@/lib/supabase/client';
import { downloadExcel } from '@/lib/excel';
import SyncManager from '@/lib/syncManager';
import { useEtablissement } from '@/contexts/etablissement-context';

interface EnseignantDB {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  sexe: 'M' | 'F';
  telephone: string;
  email: string;
  matiere_principale: string;
  salaire_mensuel: number;
  date_embauche: string;
  statut: 'actif' | 'en_conge' | 'quitte';
  type_contrat?: string;
  categorie?: string;
}

export default function EnseignantsPage() {
  const [enseignants, setEnseignants] = useState<EnseignantDB[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Nouveaux champs pour formulaire
  const [newEns, setNewEns] = useState<Partial<EnseignantDB>>({
    sexe: 'M',
    statut: 'actif',
    salaire_mensuel: 0,
    categorie: 'Enseignant',
    type_contrat: 'CDI',
    date_embauche: new Date().toISOString().split('T')[0]
  });

  const { etablissementId } = useEtablissement();
  const supabase = createClient();

  useEffect(() => {
    if (etablissementId) fetchEnseignants();
  }, [etablissementId]);

  const fetchEnseignants = async () => {
    if (!etablissementId) return;
    const { data, error } = await supabase
      .from('enseignants')
      .select('*')
      .eq('etablissement_id', etablissementId)
      .order('nom');
    if (data) {
      setEnseignants(data as EnseignantDB[]);
    }
    setIsLoaded(true);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };
  const handleAddEnseignant = async (e: React.FormEvent) => {
    e.preventDefault();
    const matricule = `PROF-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    const enseignantData = {
      matricule,
      nom: newEns.nom,
      prenom: newEns.prenom,
      sexe: newEns.sexe,
      telephone: newEns.telephone,
      email: newEns.email,
      matiere_principale: newEns.matiere_principale,
      salaire_mensuel: newEns.salaire_mensuel || 0,
      statut: newEns.statut || 'actif',
      type_contrat: newEns.type_contrat || 'CDI',
      categorie: newEns.categorie || 'Enseignant',
      date_embauche: newEns.date_embauche || new Date().toISOString().split('T')[0],
      etablissement_id: etablissementId,
    };

    const { data, error } = await supabase.from('enseignants').insert([enseignantData]).select();

    if (error) {
      alert("Erreur lors de l'ajout : " + error.message);
      return;
    }

    // Link creation to headcount (membres_personnel) & contract
    const newEmpData = {
      nom: newEns.nom,
      prenom: newEns.prenom,
      email: newEns.email || '',
      telephone: newEns.telephone || '+237 600 00 00 00',
      sexe: newEns.sexe,
      categorie: newEns.categorie || 'Enseignant',
      type_contrat: newEns.type_contrat || 'CDI',
      salaire_de_base: Number(newEns.salaire_mensuel || 0),
      date_embauche: newEns.date_embauche || new Date().toISOString().split('T')[0],
      statut: 'actif',
      etablissement_id: etablissementId
    };

    try {
      const { data: empData, error: empErr } = await supabase
        .from('membres_personnel')
        .insert([newEmpData])
        .select();

      if (!empErr && empData && empData.length > 0) {
        const insertedEmp = empData[0];
        // Create recruitment movement log
        const newMouvData = {
          personnel_id: insertedEmp.id,
          nom_personnel: `${insertedEmp.nom} ${insertedEmp.prenom}`,
          type: 'embauche',
          date: insertedEmp.date_embauche,
          details: `Embauche en contrat ${insertedEmp.type_contrat} (${insertedEmp.categorie})`,
          etablissement_id: etablissementId
        };
        await supabase.from('mouvements_personnel').insert([newMouvData]);
      }
    } catch (err) {
      console.warn("Failed to link teacher creation to headcount/contracts in Supabase:", err);
    }

    if (data && data.length > 0) {
      setEnseignants([data[0] as EnseignantDB, ...enseignants]);
      setShowAddModal(false);
      setNewEns({ 
        sexe: 'M', 
        statut: 'actif', 
        salaire_mensuel: 0,
        categorie: 'Enseignant',
        type_contrat: 'CDI',
        date_embauche: new Date().toISOString().split('T')[0]
      });
      triggerToast(`L'enseignant ${data[0].nom} a été ajouté avec succès et enregistré dans l'effectif.`);
    }
  };
  const handleExportExcel = () => {
    const dataToExport = enseignants.map(e => ({
      Matricule: e.matricule,
      Nom: e.nom,
      Prénom: e.prenom,
      Sexe: e.sexe,
      Matière: e.matiere_principale,
      Téléphone: e.telephone,
      Email: e.email,
      Salaire: e.salaire_mensuel,
      Statut: e.statut
    }));
    downloadExcel(dataToExport, 'Liste_Enseignants');
    triggerToast('Export Excel généré avec succès !');
  };

  const filteredEnseignants = enseignants.filter(e => 
    `${e.nom} ${e.prenom} ${e.matricule} ${e.matiere_principale}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFCFA = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-sm font-semibold text-slate-400">Chargement de la liste des enseignants...</p>
      </div>
    );
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight text-black">Gestion des Enseignants</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gérez le personnel enseignant, les matières principales et les salaires.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-lg transition-colors cursor-pointer"
          >
            <DownloadIcon size={16} />
            Exporter
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-md transition-colors cursor-pointer"
          >
            <PlusIcon size={16} />
            Ajouter un enseignant
          </button>
        </div>
      </div>

      {/* Stats Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Effectif Total</span>
          <span className="text-2xl font-extrabold text-slate-800 mt-1 block text-black">{enseignants.length}</span>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Actifs</span>
          <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">{enseignants.filter(e => e.statut === 'actif').length}</span>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Masse Salariale Mensuelle</span>
          <span className="text-2xl font-extrabold text-indigo-600 mt-1 block">
            {formatFCFA(enseignants.filter(e => e.statut === 'actif').reduce((sum, e) => sum + Number(e.salaire_mensuel), 0))}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex items-center">
        <div className="relative w-full max-w-md">
          <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, prénom, matière..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-black"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                <th className="px-6 py-3">Enseignant</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">Matière Principale</th>
                <th className="px-6 py-3">Salaire Mensuel</th>
                <th className="px-6 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredEnseignants.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                        {e.prenom[0]}{e.nom[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-black">{e.nom} {e.prenom}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{e.matricule}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-600">{e.telephone || 'N/A'}</div>
                    <div className="text-[10px] text-slate-400">{e.email || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                      {e.matiere_principale || 'Général'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-800 text-black">
                    {formatFCFA(e.salaire_mensuel)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border ${
                      e.statut === 'actif' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                      e.statut === 'en_conge' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                      'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        e.statut === 'actif' ? 'bg-emerald-500' : 
                        e.statut === 'en_conge' ? 'bg-amber-500' : 
                        'bg-slate-400'
                      }`}></span>
                      {e.statut === 'actif' ? 'Actif' : e.statut === 'en_conge' ? 'En congé' : 'Quitté'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredEnseignants.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <p className="text-sm font-medium text-slate-400">Aucun enseignant trouvé.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 text-black">Ajouter un enseignant</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="add-ens-form" onSubmit={handleAddEnseignant} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Identité & Contact */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Identité & Contact</h4>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nom <span className="text-red-500">*</span></label>
                      <input required type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500" 
                        value={newEns.nom || ''} onChange={e => setNewEns({...newEns, nom: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Prénom <span className="text-red-500">*</span></label>
                      <input required type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500" 
                        value={newEns.prenom || ''} onChange={e => setNewEns({...newEns, prenom: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Genre <span className="text-red-500">*</span></label>
                        <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black font-semibold outline-none focus:border-indigo-500"
                          value={newEns.sexe} onChange={e => setNewEns({...newEns, sexe: e.target.value as 'M'|'F'})}>
                          <option value="M">Masculin</option>
                          <option value="F">Féminin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone</label>
                        <input type="text" placeholder="+237 6xx xx..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500" 
                          value={newEns.telephone || ''} onChange={e => setNewEns({...newEns, telephone: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                      <input type="email" placeholder="nom@ecole.cm" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500" 
                        value={newEns.email || ''} onChange={e => setNewEns({...newEns, email: e.target.value})} />
                    </div>
                  </div>

                  {/* Professionnel & Contrat */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Contrat & Poste</h4>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Matière principale</label>
                      <input type="text" placeholder="ex: Mathématiques" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500" 
                        value={newEns.matiere_principale || ''} onChange={e => setNewEns({...newEns, matiere_principale: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Catégorie Métier <span className="text-red-500">*</span></label>
                        <select required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black font-semibold outline-none focus:border-indigo-500"
                          value={newEns.categorie || 'Enseignant'} onChange={e => setNewEns({...newEns, categorie: e.target.value})}>
                          <option value="Enseignant">Enseignant</option>
                          <option value="Administration">Administration</option>
                          <option value="Technique">Technique</option>
                          <option value="Personnel d'appui">Personnel d'appui</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Type de Contrat <span className="text-red-500">*</span></label>
                        <select required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black font-semibold outline-none focus:border-indigo-500"
                          value={newEns.type_contrat || 'CDI'} onChange={e => setNewEns({...newEns, type_contrat: e.target.value})}>
                          <option value="CDI">CDI</option>
                          <option value="CDD">CDD</option>
                          <option value="Intérimaire">Intérimaire</option>
                          <option value="Stagiaire">Stagiaire</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Salaire Mensuel Brut (FCFA) <span className="text-red-500">*</span></label>
                      <input required type="number" min="0" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black font-mono outline-none focus:border-indigo-500" 
                        value={newEns.salaire_mensuel || 0} onChange={e => setNewEns({...newEns, salaire_mensuel: Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Date de Prise d'Effet <span className="text-red-500">*</span></label>
                      <input required type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black font-semibold outline-none focus:border-indigo-500" 
                        value={newEns.date_embauche || ''} onChange={e => setNewEns({...newEns, date_embauche: e.target.value})} />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer">
                Annuler
              </button>
              <button type="submit" form="add-ens-form" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-md transition-colors cursor-pointer">
                Enregistrer l'enseignant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
