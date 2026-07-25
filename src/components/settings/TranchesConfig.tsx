'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { captureError } from '@/lib/observability/logger';

interface Tranche {
  id: string;
  nom: string;
  date_limite: string;
  pourcentage: number;
  ordre: number;
}

interface Props {
  etablissementId: string;
  anneeScolaireId: string;
}

export default function TranchesConfig({ etablissementId, anneeScolaireId }: Props) {
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Nouveaux champs
  const [nom, setNom] = useState('');
  const [dateLimite, setDateLimite] = useState('');
  const [pourcentage, setPourcentage] = useState('');

  const fetchTranches = async () => {
    if (!etablissementId || !anneeScolaireId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tranches_scolarite')
        .select('*')
        .eq('etablissement_id', etablissementId)
        .eq('annee_scolaire_id', anneeScolaireId)
        .order('ordre', { ascending: true });

      if (error) throw error;
      setTranches(data || []);
    } catch (err) {
      captureError(err, { context: 'Erreur lors du chargement des tranches' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTranches();
  }, [etablissementId, anneeScolaireId]);

  const handleAdd = async () => {
    if (!nom || !dateLimite || !pourcentage) return;
    
    setSaving(true);
    try {
      const supabase = createClient();
      const pct = parseFloat(pourcentage);
      const nextOrdre = tranches.length > 0 ? Math.max(...tranches.map(t => t.ordre)) + 1 : 1;

      const { error } = await supabase
        .from('tranches_scolarite')
        .insert([{
          etablissement_id: etablissementId,
          annee_scolaire_id: anneeScolaireId,
          nom,
          date_limite: dateLimite,
          pourcentage: pct,
          ordre: nextOrdre
        }]);

      if (error) throw error;

      setNom('');
      setDateLimite('');
      setPourcentage('');
      await fetchTranches();
    } catch (err) {
      captureError(err, { context: 'Erreur lors de l\'ajout de la tranche' });
      alert("Erreur lors de l'ajout.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      const supabase = createClient();

      // La FK paiements.tranche_id est en ON DELETE SET NULL : supprimer une
      // tranche détagge silencieusement tous les paiements qui y sont
      // rattachés, et le rapport de tranches les réaffecte ensuite dans
      // l'ordre — des familles à jour repassent « en retard ». On bloque donc
      // la suppression d'une tranche référencée.
      const { count, error: countError } = await supabase
        .from('paiements')
        .select('id', { count: 'exact', head: true })
        .eq('tranche_id', id);
      if (countError) throw countError;

      if ((count ?? 0) > 0) {
        alert(
          `Impossible de supprimer cette tranche : ${count} paiement(s) y sont rattachés. ` +
          `Modifiez la tranche (nom, pourcentage, date limite) au lieu de la supprimer, ` +
          `ou réaffectez d'abord ces paiements depuis les fiches élèves.`
        );
        return;
      }

      if (!confirm('Voulez-vous vraiment supprimer cette tranche ?')) return;

      const { error } = await supabase.from('tranches_scolarite').delete().eq('id', id);
      if (error) throw error;
      await fetchTranches();
    } catch (err) {
      captureError(err, { context: 'Erreur lors de la suppression de la tranche' });
      alert("Erreur de suppression.");
    } finally {
      setSaving(false);
    }
  };

  const totalPct = tranches.reduce((sum, t) => sum + Number(t.pourcentage), 0);

  if (!anneeScolaireId) {
    return (
      <div className="text-sm text-ink-soft p-4 border border-dashed border-border rounded-control text-center">
        Sélectionnez d'abord une année scolaire active.
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Tranches de Scolarité</h4>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${totalPct === 100 ? 'bg-green/10 text-green' : totalPct > 100 ? 'bg-red-500/10 text-red-500' : 'bg-warning/10 text-warning-dark'}`}>
          Total : {totalPct}% / 100%
        </span>
      </div>

      {loading ? (
        <div className="text-xs text-ink-soft animate-pulse">Chargement...</div>
      ) : (
        <div className="space-y-2">
          {tranches.length === 0 ? (
            <div className="text-xs text-ink-soft italic">Aucune tranche configurée pour cette année.</div>
          ) : (
            tranches.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-2 bg-bg border border-border rounded-control text-sm">
                <div>
                  <span className="font-bold text-ink">{t.nom}</span>
                  <span className="text-ink-soft ml-2 text-xs">({t.pourcentage}%)</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono text-ink-soft">{new Date(t.date_limite).toLocaleDateString('fr-FR')}</span>
                  <button onClick={() => handleDelete(t.id)} disabled={saving} className="text-red-500 hover:text-red-600 font-bold text-xs">
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add new */}
      <div className="pt-3 border-t border-border grid grid-cols-12 gap-2">
        <div className="col-span-4">
          <input
            type="text"
            placeholder="Nom (ex: Tranche 1)"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="w-full px-2 py-1.5 border border-border rounded-control text-xs outline-none focus:border-accent"
          />
        </div>
        <div className="col-span-3 relative">
          <input
            type="number"
            placeholder="Pct"
            value={pourcentage}
            onChange={(e) => setPourcentage(e.target.value)}
            className="w-full px-2 py-1.5 border border-border rounded-control text-xs outline-none focus:border-accent pr-6"
          />
          <span className="absolute right-2 top-1.5 text-[10px] text-ink-soft font-bold">%</span>
        </div>
        <div className="col-span-3">
          <input
            type="date"
            value={dateLimite}
            onChange={(e) => setDateLimite(e.target.value)}
            className="w-full px-2 py-1.5 border border-border rounded-control text-[10px] outline-none focus:border-accent"
          />
        </div>
        <div className="col-span-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || totalPct >= 100 || !nom || !pourcentage || !dateLimite}
            className="w-full h-full bg-ink hover:bg-ink/90 text-cream text-[10px] font-bold rounded-control disabled:opacity-50 transition-colors cursor-pointer"
          >
            + Ajout
          </button>
        </div>
      </div>
    </div>
  );
}
