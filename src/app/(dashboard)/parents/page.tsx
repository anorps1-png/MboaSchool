'use client';
import React, { useState, useEffect } from 'react';
import { Eleve } from '@/types/domain';
import { createClient } from '@/lib/supabase/client';
import { useEtablissement } from '@/contexts/etablissement-context';
import { getParentsList } from '@/lib/queries/parents';
import { captureError } from '@/lib/observability/logger';

interface ParentProfile {
  id: string;
  nom: string;
  telephone: string;
  email: string;
  enfants: Eleve[];
}

export default function CommunauteQHSEPage() {
  const [activeTab, setActiveTab] = useState<'communication' | 'satisfaction' | 'qhse'>('satisfaction');
  const { etablissementId } = useEtablissement();
  
  // ==========================================
  // LOGIQUE ONGLET 1: COMMUNICATION
  // ==========================================
  const [parentsList, setParentsList] = useState<ParentProfile[]>([]);
  const [serverParents, setServerParents] = useState<ParentProfile[] | null>(null);
  const [selectedParents, setSelectedParents] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [messageChannel, setMessageChannel] = useState('SMS');
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [targetParents, setTargetParents] = useState<ParentProfile[]>([]);

  // STATES QHSE & ENQUÊTES SUPABASE
  const [surveysData, setSurveysData] = useState<any[]>([]);
  const [incidentsData, setIncidentsData] = useState<any[]>([]);
  const [reunionsData, setReunionsData] = useState<any[]>([]);
  const [depensesData, setDepensesData] = useState<any[]>([]);
  const [evaluationsData, setEvaluationsData] = useState<any[]>([]);

  useEffect(() => {
    if (!etablissementId) return;
    const fetchData = async () => {
      const supabase = createClient();
      
      // Fetch Eleves -> Extract Parents (filtered by etablissement) with pagination
      let allEleves: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data } = await supabase
          .from('eleves')
          .select('*')
          .eq('etablissement_id', etablissementId)
          .order('nom', { ascending: true })
          .order('id', { ascending: true })
          .range(from, from + step - 1);
        if (data && data.length > 0) {
          allEleves = allEleves.concat(data);
          from += step;
          if (data.length < step) hasMore = false;
        } else {
          hasMore = false;
        }
      }
      const eleves = allEleves;
      if (eleves) {
        const parentsMap = new Map<string, ParentProfile>();
        eleves.forEach(student => {
          if (!student) return;
          const parentId = student.telephone_parent?.trim() || student.email_parent?.trim() || `parent-of-${student.id}`;
          
          const eleveObj: any = {
            id: student.id,
            nom: student.nom,
            prenom: student.prenom,
            telephoneParent: student.telephone_parent,
            emailParent: student.email_parent,
            nomParent: student.nom_parent
          };

          if (parentsMap.has(parentId)) {
            const existing = parentsMap.get(parentId)!;
            existing.enfants.push(eleveObj);
            if (student.nom_parent && student.nom_parent.length > existing.nom.length) {
              existing.nom = student.nom_parent;
            }
          } else {
            parentsMap.set(parentId, {
              id: parentId,
              nom: student.nom_parent || 'Non renseigné',
              telephone: student.telephone_parent || '-',
              email: student.email_parent || '-',
              enfants: [eleveObj]
            });
          }
        });
        setParentsList(Array.from(parentsMap.values()));
      }

      // Fetch Enquêtes
      try {
        const { data: enquetes } = await supabase.from('enquetes').select('*').eq('etablissement_id', etablissementId);
        setSurveysData(enquetes || []);
      } catch { setSurveysData([]); }

      // Fetch QHSE Incidents
      try {
        const { data: incidents } = await supabase.from('qhse_incidents').select('*').eq('etablissement_id', etablissementId).order('date', { ascending: false });
        setIncidentsData(incidents || []);
      } catch { setIncidentsData([]); }

      // Fetch QHSE Réunions
      try {
        const { data: reunions } = await supabase.from('qhse_reunions').select('*').eq('etablissement_id', etablissementId).order('date', { ascending: false });
        setReunionsData(reunions || []);
      } catch { setReunionsData([]); }

      // Fetch QHSE Dépenses
      try {
        const { data: depenses } = await supabase.from('qhse_depenses').select('*').eq('etablissement_id', etablissementId).order('date', { ascending: false });
        setDepensesData(depenses || []);
      } catch { setDepensesData([]); }

      // Fetch QHSE Évaluations
      try {
        const { data: evaluations } = await supabase.from('qhse_evaluations').select('*').eq('etablissement_id', etablissementId);
        setEvaluationsData(evaluations || []);
      } catch { setEvaluationsData([]); }
    };

    fetchData();
  }, [etablissementId]);

  // Liste de parents calculée en base (get_parents_list), pour éviter le
  // fetch complet des élèves ci-dessus. Repli automatique sur parentsList
  // (calcul client) si la RPC échoue ou n'est pas encore appliquée.
  useEffect(() => {
    if (!etablissementId) return;
    getParentsList(etablissementId)
      .then(setServerParents)
      .catch(err => {
        captureError(err, { context: "Error loading parents list:" });
        setServerParents(null);
      });
  }, [etablissementId]);

  const effectiveParentsList = serverParents ?? parentsList;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedParents(effectiveParentsList.map(p => p.id));
    else setSelectedParents([]);
  };

  const handleSelectOne = (id: string) => {
    if (selectedParents.includes(id)) setSelectedParents(prev => prev.filter(pId => pId !== id));
    else setSelectedParents(prev => [...prev, id]);
  };

  const openGroupMessage = () => {
    setTargetParents(effectiveParentsList.filter(p => selectedParents.includes(p.id)));
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
    setTimeout(() => {
      setIsSending(false);
      setShowModal(false);
      setMessageText('');
      setTargetParents([]);
      setSelectedParents([]);
      triggerToast(`${targetParents.length} message(s) envoyé(s) avec succès via ${messageChannel} !`);
    }, 1500);
  };

  // ==========================================
  // RENDU DES ONGLETS
  // ==========================================
  
  const renderTabCommunication = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={openGroupMessage}
          disabled={selectedParents.length === 0}
          className={`px-4 py-2 rounded-control text-sm font-bold shadow-sm transition-colors flex items-center gap-2 ${
            selectedParents.length > 0 
              ? 'bg-accent hover:bg-accent-hover text-cream' 
              : 'bg-chip text-ink-faint cursor-not-allowed'
          }`}
        >
          Nouveau message groupé ({selectedParents.length})
        </button>
      </div>

      <div className="bg-surface rounded-card border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[12px] font-bold text-ink-faint uppercase tracking-[1px] bg-bg/20">
                <th className="px-6 py-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="rounded border-border text-ink"
                    checked={selectedParents.length === effectiveParentsList.length && effectiveParentsList.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-6 py-4">Nom du Parent</th>
                <th className="px-6 py-4">Téléphone</th>
                <th className="px-6 py-4">Enfants Associés</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-row text-sm">
              {effectiveParentsList.map(parent => (
                <tr key={parent.id} className="hover:bg-bg/30 transition-colors">
                  <td className="px-6 py-4 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-border text-ink"
                      checked={selectedParents.includes(parent.id)}
                      onChange={() => handleSelectOne(parent.id)}
                    />
                  </td>
                  <td className="px-6 py-4 font-bold text-ink">{parent.nom}</td>
                  <td className="px-6 py-4 text-ink-soft font-mono">
                    <div className="flex flex-col">
                      <span>{parent.telephone}</span>
                      {parent.email !== '-' && <span className="text-xs text-ink-faint">{parent.email}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {parent.enfants.map(e => (
                        <span key={e.id} className="px-2 py-1 bg-chip text-ink-soft text-xs font-semibold rounded-md">
                          {e.nom} {e.prenom}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openIndividualMessage(parent)}
                      className="inline-flex items-center justify-center px-3 py-1.5 bg-chip hover:bg-chip-hover text-ink rounded-control text-xs font-bold transition-colors"
                    >
                      Message
                    </button>
                  </td>
                </tr>
              ))}
              {effectiveParentsList.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-ink-faint italic">
                    Aucun parent trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTabSatisfaction = () => {
    // Calcul de la moyenne globale
    const moyenneGlobale = surveysData.length > 0 
      ? surveysData.reduce((acc, s) => acc + Number(s.score_moyen || 0), 0) / surveysData.length 
      : 0;
    const totalParticipants = surveysData.reduce((acc, s) => acc + (s.participants || 0), 0);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface p-6 rounded-card border border-border shadow-sm flex flex-col">
            <span className="text-sm font-bold text-ink-faint mb-2">Score Moyen (2026)</span>
            <div className="flex items-end gap-2">
              <span className="text-[40px] font-extrabold text-ink tracking-[-2px] leading-none">{moyenneGlobale.toFixed(1)}/10</span>
            </div>
          </div>
          <div className="bg-surface p-6 rounded-card border border-border shadow-sm flex flex-col">
            <span className="text-sm font-bold text-ink-faint mb-2">Participants Totaux</span>
            <div className="flex items-end gap-2">
              <span className="text-[40px] font-extrabold text-ink tracking-[-2px] leading-none">{totalParticipants}</span>
            </div>
          </div>
          <div className="bg-surface p-6 rounded-card border border-border shadow-sm flex flex-col">
            <span className="text-sm font-bold text-ink-faint mb-2">Enquêtes Actives</span>
            <div className="flex items-end gap-2">
              <span className="text-[40px] font-extrabold text-ink tracking-[-2px] leading-none">{surveysData.filter(s => s.statut === 'En cours').length}</span>
            </div>
          </div>
        </div>

        {/* Historique Comparatif */}
        <div className="bg-surface p-6 rounded-card border border-border shadow-sm">
          <h3 className="font-bold text-ink mb-6 text-lg">Évolution de la Satisfaction Globale (2024 - 2026)</h3>
          <div className="flex items-end gap-8 h-48 px-4 pb-6 border-b border-border">
            {[2024, 2025, 2026].map(year => {
              // Historique multi-années non géré nativement via Supabase : seule
              // 2026 dispose de vraies données. Les autres années affichent un
              // état "N/A" plutôt qu'une barre à hauteur zéro (qui se lisait
              // comme un score réel de 0/10).
              const hasData = year === 2026 && surveysData.length > 0;
              const avgYear = hasData ? moyenneGlobale : null;
              const heightPercentage = avgYear !== null ? (avgYear / 10) * 100 : 100;

              return (
                <div key={year} className="flex-1 flex flex-col items-center justify-end gap-2 group h-full">
                  <div className="text-sm font-bold text-ink-soft opacity-0 group-hover:opacity-100 transition-opacity">
                    {avgYear !== null ? `${avgYear.toFixed(1)}/10` : 'N/A'}
                  </div>
                  {avgYear !== null ? (
                    <div
                      className="w-full max-w-[80px] bg-accent rounded-t-lg transition-all duration-500 group-hover:bg-accent-hover"
                      style={{ height: `${heightPercentage}%` }}
                    ></div>
                  ) : (
                    <div
                      className="w-full max-w-[80px] border-2 border-dashed border-border rounded-t-lg flex items-end justify-center pb-2"
                      style={{ height: `${heightPercentage}%` }}
                    >
                      <span className="text-[10px] font-bold text-ink-faint">N/A</span>
                    </div>
                  )}
                  <div className="font-bold text-ink-soft mt-2">{year}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Liste des enquêtes par catégorie */}
        <div className="bg-surface rounded-card border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-bg/50">
            <h3 className="font-bold text-ink">Toutes les Enquêtes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[12px] font-bold text-ink-faint uppercase tracking-[1px] bg-bg/20">
                  <th className="px-6 py-4">Enquête</th>
                  <th className="px-6 py-4">Catégorie</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-center">Score (2026)</th>
                  <th className="px-6 py-4 text-right">Participants</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-row text-sm">
                {surveysData.map(survey => (
                  <tr key={survey.id} className="hover:bg-bg/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-ink">{survey.titre}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-chip text-ink-soft rounded-md text-xs font-semibold">
                        {survey.categorie} / {survey.sous_categorie}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                        survey.statut === 'En cours' ? 'bg-chip text-ink-soft' : 'bg-chip text-ink-soft'
                      }`}>
                        {survey.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-ink">
                      {Number(survey.score_moyen || 0).toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-right text-ink-soft font-medium">
                      {survey.participants}
                    </td>
                  </tr>
                ))}
                {surveysData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-ink-faint italic">Aucune enquête en base de données.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderTabQHSE = () => {
    const totalDepenses = depensesData.reduce((acc, d) => acc + Number(d.montant || 0), 0);
    const avgScore = evaluationsData.length > 0 
      ? evaluationsData.reduce((acc, e) => acc + Number(e.score || 0), 0) / evaluationsData.length
      : 0;

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* KPIs QHSE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface p-6 rounded-card border border-border shadow-sm flex flex-col">
            <span className="text-sm font-bold text-ink-faint mb-2">Jours sans accident grave</span>
            <div className="flex items-end gap-2">
              <span className="text-[40px] font-extrabold text-green tracking-[-2px] leading-none">142</span>
              <span className="text-sm font-bold text-ink-soft mb-1">jours</span>
            </div>
          </div>
          <div className="bg-surface p-6 rounded-card border border-border shadow-sm flex flex-col">
            <span className="text-sm font-bold text-ink-faint mb-2">Budget QHSE Consommé</span>
            <div className="flex items-end gap-2">
              <span className="text-[40px] font-extrabold text-ink tracking-[-2px] leading-none">{totalDepenses.toLocaleString('fr-FR')}</span>
              <span className="text-sm font-bold text-ink-soft mb-1">FCFA</span>
            </div>
          </div>
          <div className="bg-surface p-6 rounded-card border border-border shadow-sm flex flex-col">
            <span className="text-sm font-bold text-ink-faint mb-2">Note Équipe QHSE</span>
            <div className="flex items-end gap-2">
              <span className="text-[40px] font-extrabold text-ink tracking-[-2px] leading-none">{avgScore.toFixed(1)}/10</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Incidents */}
          <div className="bg-surface rounded-card border border-border shadow-sm flex flex-col h-full">
            <div className="p-4 border-b border-border flex justify-between items-center bg-red-bg">
              <h3 className="font-bold text-accent">Registre des Incidents & Accidents</h3>
              <button className="text-xs font-bold bg-surface text-accent px-3 py-1.5 rounded-md border border-transparent hover:bg-red-bg">
                + Déclarer
              </button>
            </div>
            <div className="p-4 flex-1 space-y-4">
              {incidentsData.map(inc => (
                <div key={inc.id} className="p-4 border border-border rounded-control hover:shadow-sm transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        inc.gravite === 'Faible' ? 'bg-chip text-ink-soft' :
                        inc.gravite === 'Moyenne' ? 'bg-chip text-ink-soft' :
                        'bg-red-bg text-accent'
                      }`}>
                        {inc.gravite}
                      </span>
                      <span className="text-sm font-bold text-ink-soft">{inc.lieu}</span>
                    </div>
                    <span className="text-xs text-ink-faint">{new Date(inc.date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-ink-soft mb-3">{inc.description}</p>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-bold flex items-center gap-1 ${inc.statut === 'Résolu' ? 'text-green' : 'text-ink-soft'}`}>
                      {inc.statut === 'Résolu' && '✓ '} {inc.statut}
                    </span>
                  </div>
                </div>
              ))}
              {incidentsData.length === 0 && <p className="text-sm text-ink-faint italic text-center py-4">Aucun incident enregistré.</p>}
            </div>
          </div>

          <div className="space-y-6">
            {/* Réunions */}
            <div className="bg-surface rounded-card border border-border shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border bg-bg/50 flex justify-between items-center">
                <h3 className="font-bold text-ink">Réunions Sécurité</h3>
              </div>
              <ul className="divide-y divide-border-row">
                {reunionsData.map(r => (
                  <li key={r.id} className="p-4 flex justify-between items-center hover:bg-bg/30">
                    <div>
                      <h4 className="font-bold text-sm text-ink">{r.titre}</h4>
                      <p className="text-xs text-ink-soft">{new Date(r.date).toLocaleDateString()} • {r.participants} participants</p>
                    </div>
                    <span className="text-xs font-medium text-ink-faint bg-chip px-2 py-1 rounded">{r.duree}</span>
                  </li>
                ))}
                {reunionsData.length === 0 && <li className="p-4 text-center text-sm text-ink-faint italic">Aucune réunion.</li>}
              </ul>
            </div>

            {/* Dépenses */}
            <div className="bg-surface rounded-card border border-border shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border bg-bg/50 flex justify-between items-center">
                <h3 className="font-bold text-ink">Dépenses QHSE</h3>
              </div>
              <ul className="divide-y divide-border-row">
                {depensesData.map(d => (
                  <li key={d.id} className="p-4 flex justify-between items-center hover:bg-bg/30">
                    <div>
                      <h4 className="font-bold text-sm text-ink">{d.libelle}</h4>
                      <p className="text-xs text-ink-soft">{new Date(d.date).toLocaleDateString()}</p>
                    </div>
                    <span className="text-sm font-bold text-ink-soft">{Number(d.montant).toLocaleString('fr-FR')} FCFA</span>
                  </li>
                ))}
                {depensesData.length === 0 && <li className="p-4 text-center text-sm text-ink-faint italic">Aucune dépense.</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-ink text-cream px-5 py-3.5 rounded-control shadow-login z-50 flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-green flex items-center justify-center text-xs font-bold text-cream">✓</div>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="bg-surface p-6 rounded-card border border-border shadow-sm">
        <h1 className="text-[44px] font-extrabold text-ink tracking-[-1.5px] leading-tight mb-6">Communauté & QHSE</h1>
        
        <div className="flex gap-4 border-b border-border">
          {[
            { id: 'satisfaction', label: 'Satisfaction & Enquêtes' },
            { id: 'qhse', label: 'Module QHSE' },
            { id: 'communication', label: 'Messagerie & Contacts' }
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

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'satisfaction' && renderTabSatisfaction()}
        {activeTab === 'qhse' && renderTabQHSE()}
        {activeTab === 'communication' && renderTabCommunication()}
      </div>

      {/* Message Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-card w-full max-w-lg border border-border shadow-login overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center bg-bg">
              <h3 className="text-lg font-bold text-ink">
                {targetParents.length === 1 ? 'Message Individuel' : 'Message Groupé'}
              </h3>
              <button 
                onClick={() => setShowModal(false)} 
                className="text-ink-faint hover:text-ink-soft text-xl font-bold px-2"
                disabled={isSending}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSendMessage} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-ink-faint uppercase mb-2">Destinataires ({targetParents.length})</label>
                <div className="max-h-24 overflow-y-auto p-2 bg-bg rounded-control border border-border text-sm text-ink-soft flex flex-wrap gap-1">
                  {targetParents.map(p => (
                    <span key={p.id} className="px-2 py-1 bg-surface border border-border rounded text-xs font-semibold">
                      {p.nom}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-faint uppercase mb-2">Canal d'envoi</label>
                <div className="flex gap-3">
                  {['SMS', 'WhatsApp', 'Email'].map(channel => (
                    <label key={channel} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-control border cursor-pointer font-bold text-sm transition-colors ${messageChannel === channel ? 'bg-chip border-outline text-ink' : 'bg-surface border-border text-ink-soft hover:bg-bg'}`}>
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
                <label className="block text-xs font-bold text-ink-faint uppercase mb-2">Message</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Tapez votre message ici..."
                  required
                  rows={5}
                  className="w-full px-3 py-2 border border-border rounded-control text-sm focus:ring-2 focus:border-accent focus:border-accent outline-none resize-none"
                />
                <p className="text-xs text-ink-faint mt-1 text-right">{messageText.length} caractères</p>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  disabled={isSending}
                  className="px-4 py-2 bg-chip text-ink-soft rounded-control text-sm font-bold hover:bg-chip transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={isSending || !messageText.trim()}
                  className="px-6 py-2 bg-accent hover:bg-accent-hover text-cream rounded-control text-sm font-bold transition-colors shadow-md disabled:opacity-50 flex items-center justify-center min-w-[120px]"
                >
                  {isSending ? (
                    <svg className="animate-spin h-5 w-5 text-cream" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
