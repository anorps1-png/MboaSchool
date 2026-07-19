'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useEtablissement } from '@/contexts/etablissement-context';
import { captureError } from '@/lib/observability/logger';

interface ParentAccount {
  id: string;
  email: string;
  role: string;
  eleveIds: string[];
  createdAt: string;
}

interface Eleve {
  id: string;
  nom: string;
  prenom: string;
}

export default function AccountsPage() {
  const { etablissementId } = useEtablissement();
  const supabase = useMemo(() => createClient(), []);

  const [activeTab, setActiveTab] = useState<'parents' | 'staff' | 'admins'>('parents');
  const [parentAccounts, setParentAccounts] = useState<ParentAccount[]>([]);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newParentEmail, setNewParentEmail] = useState('');
  const [selectedEleveIds, setSelectedEleveIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load parents and students
  useEffect(() => {
    if (!etablissementId) return;
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Fetch parent accounts
        const { data: parentsData, error: parentsErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('etablissement_id', etablissementId)
          .eq('role', 'parent');

        if (parentsErr) throw parentsErr;

        // Fetch students for linking
        const { data: elevesData, error: elevesErr } = await supabase
          .from('eleves')
          .select('id, nom, prenom')
          .eq('etablissement_id', etablissementId)
          .order('nom', { ascending: true });

        if (elevesErr) throw elevesErr;

        setEleves(elevesData || []);

        if (parentsData) {
          const parentsWithKids = parentsData.map(p => ({
            id: p.id,
            email: p.email,
            role: p.role,
            eleveIds: [], // À charger depuis parent_eleves si la migration est appliquée
            createdAt: p.created_at
          }));
          setParentAccounts(parentsWithKids);
        }
      } catch (err) {
        captureError(err, { context: 'Error loading accounts data:' });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [etablissementId, supabase]);

  const handleCreateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParentEmail.trim() || selectedEleveIds.length === 0) {
      triggerToast('Email et au moins un enfant requis');
      return;
    }

    try {
      // Call backend function to create parent account
      // (This would typically be a custom RPC or API endpoint)
      triggerToast('Création du compte parent en cours...');

      // For now, show placeholder message
      // Real implementation would call an API endpoint to:
      // 1. Create auth user
      // 2. Create profile with role='parent'
      // 3. Link to eleves via parent_eleves table
      triggerToast('Fonctionnalité en cours de développement - nécessite migration appliquée');
      setShowModal(false);
      setNewParentEmail('');
      setSelectedEleveIds([]);
    } catch (err) {
      captureError(err, { context: 'Error creating parent account:' });
      triggerToast('Erreur lors de la création du compte');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface p-6 rounded-card border border-border shadow-sm">
        <h1 className="text-[44px] font-extrabold text-ink tracking-[-1.5px] leading-tight mb-6">
          Comptes & Habilitations
        </h1>

        <div className="flex gap-4 border-b border-border mb-6">
          {[
            { id: 'parents', label: 'Comptes Parents' },
            { id: 'staff', label: 'Enseignants & Personnel' },
            { id: 'admins', label: 'Administrateurs' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors px-2 ${
                activeTab === tab.id
                  ? 'border-accent text-ink'
                  : 'border-transparent text-ink-faint hover:text-ink-soft'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Parents Tab */}
      {activeTab === 'parents' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-accent hover:bg-accent-hover text-cream rounded-control text-sm font-bold shadow-md transition-colors"
            >
              + Créer un compte parent
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-ink-soft">Chargement...</div>
          ) : parentAccounts.length === 0 ? (
            <div className="bg-surface p-8 rounded-card border border-border text-center text-ink-soft">
              Aucun compte parent créé. Commencez à en ajouter.
            </div>
          ) : (
            <div className="bg-surface rounded-card border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border text-[12px] font-bold text-ink-faint uppercase tracking-[1px] bg-bg/20">
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Enfants Associés</th>
                      <th className="px-6 py-4">Date de Création</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-row">
                    {parentAccounts.map(parent => (
                      <tr key={parent.id} className="hover:bg-bg/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-ink">{parent.email}</td>
                        <td className="px-6 py-4">
                          {parent.eleveIds.length > 0 ? (
                            <span className="px-2 py-1 bg-chip text-ink-soft rounded text-xs font-semibold">
                              {parent.eleveIds.length} enfant(s)
                            </span>
                          ) : (
                            <span className="text-xs text-ink-faint italic">Non assigné</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-ink-soft text-xs">
                          {new Date(parent.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="px-3 py-1.5 bg-chip hover:bg-chip-hover text-ink rounded-control text-xs font-bold transition-colors">
                            Modifier
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Staff Tab */}
      {activeTab === 'staff' && (
        <div className="bg-surface p-8 rounded-card border border-border text-center text-ink-soft">
          Fonctionnalité à implémenter - gestion des enseignants et personnel
        </div>
      )}

      {/* Admins Tab */}
      {activeTab === 'admins' && (
        <div className="bg-surface p-8 rounded-card border border-border text-center text-ink-soft">
          Fonctionnalité à implémenter - gestion des administrateurs
        </div>
      )}

      {/* Modal: Create Parent */}
      {showModal && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-card w-full max-w-lg border border-border shadow-login overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center bg-bg">
              <h3 className="text-lg font-bold text-ink">Créer un Compte Parent</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-ink-faint hover:text-ink-soft text-xl font-bold px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateParent} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-ink-faint uppercase mb-2">Email du Parent</label>
                <input
                  type="email"
                  value={newParentEmail}
                  onChange={(e) => setNewParentEmail(e.target.value)}
                  placeholder="parent@example.com"
                  required
                  className="w-full px-4 py-3 border border-border rounded-control text-sm bg-bg focus:bg-surface focus:outline-none focus:ring-2 focus:border-accent font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-faint uppercase mb-2">
                  Enfants Associés ({selectedEleveIds.length})
                </label>
                <div className="max-h-48 overflow-y-auto border border-border rounded-control bg-bg p-3 space-y-2">
                  {eleves.length === 0 ? (
                    <p className="text-xs text-ink-faint italic">Aucun élève dans l'établissement</p>
                  ) : (
                    eleves.map(eleve => (
                      <label key={eleve.id} className="flex items-center gap-2 cursor-pointer hover:bg-surface/50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedEleveIds.includes(eleve.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEleveIds([...selectedEleveIds, eleve.id]);
                            } else {
                              setSelectedEleveIds(selectedEleveIds.filter(id => id !== eleve.id));
                            }
                          }}
                          className="rounded border-border text-ink"
                        />
                        <span className="text-sm text-ink font-medium">
                          {eleve.nom} {eleve.prenom}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-chip text-ink-soft rounded-control text-sm font-bold hover:bg-chip transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-accent hover:bg-accent-hover text-cream rounded-control text-sm font-bold transition-colors shadow-md"
                >
                  Créer le Compte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-ink text-cream px-6 py-3 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
