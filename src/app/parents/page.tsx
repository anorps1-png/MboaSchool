'use client';
import React, { useState, useEffect } from 'react';
import { Eleve } from '@/types/domain';
import { mockStudents } from '@/mock/students';

interface ParentProfile {
  id: string; // derived from phone or email
  nom: string;
  telephone: string;
  email: string;
  enfants: Eleve[];
}

export default function ParentsPage() {
  const [parentsList, setParentsList] = useState<ParentProfile[]>([]);
  const [selectedParents, setSelectedParents] = useState<string[]>([]);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [messageChannel, setMessageChannel] = useState('SMS');
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // For individual message vs group message
  const [targetParents, setTargetParents] = useState<ParentProfile[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedStudents = localStorage.getItem('mboaschool_students');
      let allStudents: Eleve[] = mockStudents;
      if (storedStudents) {
        try { allStudents = JSON.parse(storedStudents); } catch (e) { }
      }

      // Extract and deduplicate parents
      const parentsMap = new Map<string, ParentProfile>();

      allStudents.forEach(student => {
        // Use phone as primary identifier, or email, or a fallback
        const parentId = student.telephoneParent?.trim() || student.emailParent?.trim() || `parent-of-${student.id}`;
        
        if (parentsMap.has(parentId)) {
          const existing = parentsMap.get(parentId)!;
          existing.enfants.push(student);
          // Combine names if different, simple heuristic: just keep the longest one
          if (student.nomParent && student.nomParent.length > existing.nom.length) {
            existing.nom = student.nomParent;
          }
        } else {
          parentsMap.set(parentId, {
            id: parentId,
            nom: student.nomParent || 'Non renseigné',
            telephone: student.telephoneParent || '-',
            email: student.emailParent || '-',
            enfants: [student]
          });
        }
      });

      setParentsList(Array.from(parentsMap.values()));
    }
  }, []);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedParents(parentsList.map(p => p.id));
    } else {
      setSelectedParents([]);
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedParents.includes(id)) {
      setSelectedParents(prev => prev.filter(pId => pId !== id));
    } else {
      setSelectedParents(prev => [...prev, id]);
    }
  };

  const openGroupMessage = () => {
    const targets = parentsList.filter(p => selectedParents.includes(p.id));
    setTargetParents(targets);
    setShowModal(true);
  };

  const openIndividualMessage = (parent: ParentProfile) => {
    setTargetParents([parent]);
    setShowModal(true);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    
    setIsSending(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSending(false);
      setShowModal(false);
      setMessageText('');
      setTargetParents([]);
      setSelectedParents([]);
      triggerToast(`${targetParents.length} message(s) envoyé(s) avec succès via ${messageChannel} !`);
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl z-50 flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white">✓</div>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 text-black">Parents & Messagerie</h1>
          <p className="text-sm text-slate-500 mt-1">Gérez les contacts et envoyez des communications ciblées</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openGroupMessage}
            disabled={selectedParents.length === 0}
            className={`px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-colors flex items-center gap-2 ${
              selectedParents.length > 0 
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            Nouveau message groupé ({selectedParents.length})
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/20">
                <th className="px-6 py-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                    checked={selectedParents.length === parentsList.length && parentsList.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-6 py-4">Nom du Parent</th>
                <th className="px-6 py-4">Téléphone</th>
                <th className="px-6 py-4">Enfants Associés</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {parentsList.map(parent => (
                <tr key={parent.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                      checked={selectedParents.includes(parent.id)}
                      onChange={() => handleSelectOne(parent.id)}
                    />
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800 text-black">{parent.nom}</td>
                  <td className="px-6 py-4 text-slate-600 font-mono">
                    <div className="flex flex-col">
                      <span>{parent.telephone}</span>
                      {parent.email !== '-' && <span className="text-xs text-slate-400">{parent.email}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {parent.enfants.map(e => (
                        <span key={e.id} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md">
                          {e.nom} {e.prenom}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openIndividualMessage(parent)}
                      className="inline-flex items-center justify-center px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold transition-colors"
                    >
                      Message
                    </button>
                  </td>
                </tr>
              ))}
              {parentsList.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    Aucun parent trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-100 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 text-black">
                {targetParents.length === 1 ? 'Message Individuel' : 'Message Groupé'}
              </h3>
              <button 
                onClick={() => setShowModal(false)} 
                className="text-slate-400 hover:text-slate-600 text-xl font-bold px-2"
                disabled={isSending}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSendMessage} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Destinataires ({targetParents.length})</label>
                <div className="max-h-24 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-600 flex flex-wrap gap-1">
                  {targetParents.map(p => (
                    <span key={p.id} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold">
                      {p.nom}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Canal d'envoi</label>
                <div className="flex gap-3">
                  {['SMS', 'WhatsApp', 'Email'].map(channel => (
                    <label key={channel} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border cursor-pointer font-bold text-sm transition-colors ${messageChannel === channel ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      <input 
                        type="radio" 
                        name="channel" 
                        value={channel} 
                        checked={messageChannel === channel} 
                        onChange={(e) => setMessageChannel(e.target.value)}
                        className="sr-only"
                      />
                      {channel}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Message</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Tapez votre message ici..."
                  required
                  rows={5}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
                />
                <p className="text-xs text-slate-400 mt-1 text-right">{messageText.length} caractères</p>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  disabled={isSending}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={isSending || !messageText.trim()}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors shadow-md disabled:opacity-50 flex items-center justify-center min-w-[120px]"
                >
                  {isSending ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'Envoyer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
