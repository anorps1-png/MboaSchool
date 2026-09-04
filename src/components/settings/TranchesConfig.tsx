'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { captureError } from '@/lib/observability/logger';

interface Tranche {
  id: string;
  nom: string;
  date_limite: string;
  montant: number;
  pourcentage?: number;
  ordre: number;
}

interface Props {
  etablissementId: string;
  anneeScolaireId: string;
  /** Classe pour laquelle configurer les tranches. Les tranches sont
   * propres à chaque classe (des classes différentes ont des prix de
   * scolarité différents, donc des montants de tranche différents). */
  classeId: string;
  /** Prix annuel de la classe (classes.prix), pour comparer au total
   * configuré et alerter en cas d'écart. */
  classePrix?: number;
}

export default function TranchesConfig({ etablissementId, anneeScolaireId, classeId, classePrix }: Props) {
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Nouveaux champs
  const [nom, setNom] = useState('');
  const [dateLimite, setDateLimite] = useState('');
  const [montant, setMontant] = useState('');

  const fetchTranches = async () => {
    if (!etablissementId || !anneeScolaireId || !classeId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tranches_scolarite')
        .select('*')
        .eq('etablissement_id', etablissementId)
        .eq('annee_scolaire_id', anneeScolaireId)
        .eq('classe_id', classeId)
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
  }, [etablissementId, anneeScolaireId, classeId]);

  const handleAdd = async () => {
    if (!nom || !dateLimite || !montant) return;
    
    const amountVal = parseFloat(montant);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert("Veuillez saisir un montant valide supérieur à 0.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const nextOrdre = tranches.length > 0 ? Math.max(...tranches.map(t => t.ordre)) + 1 : 1;

      // Calcul d'un pourcentage indicatif pour assurer la rétrocompatibilité
      const currentTotal = tranches.reduce((sum, t) => sum + (Number(t.montant) || 0), 0);
      const newTotal = currentTotal + amountVal;
      const pct = newTotal > 0 ? Math.min(100, Math.max(1, Math.round((amountVal / newTotal) * 100))) : 10;

      const { error } = await supabase
        .from('tranches_scolarite')
        .insert([{
          etablissement_id: etablissementId,
          annee_scolaire_id: anneeScolaireId,
          classe_id: classeId,
          nom,
          date_limite: dateLimite,
          montant: amountVal,
          pourcentage: pct,
          ordre: nextOrdre
        }]);

      if (error) throw error;

      setNom('');
      setDateLimite('');
      setMontant('');
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

  const totalMontant = tranches.reduce((sum, t) => sum + (Number(t.montant) || 0), 0);
  const ecartPrix = classePrix != null ? classePrix - totalMontant : null;

  if (!anneeScolaireId || !classeId) {
    return (
      <div className="text-sm text-ink-soft p-4 border border-dashed border-border rounded-control text-center">
        Sélectionnez d'abord une année scolaire active et une classe.
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Tranches de Scolarité de cette classe</h4>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-full bg-accent/10 text-accent">
            Total : {new Intl.NumberFormat('fr-FR').format(totalMontant)} FCFA
          </span>
          {ecartPrix !== null && ecartPrix !== 0 && (
            <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-full bg-red-bg text-accent" title="Écart entre le total des tranches et le prix de scolarité de la classe">
              {ecartPrix > 0 ? `Il manque ${new Intl.NumberFormat('fr-FR').format(ecartPrix)} FCFA` : `Dépasse le prix de ${new Intl.NumberFormat('fr-FR').format(-ecartPrix)} FCFA`}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-ink-soft animate-pulse">Chargement...</div>
      ) : (
        <div className="space-y-2">
          {tranches.length === 0 ? (
            <div className="text-xs text-ink-soft italic">Aucune tranche configurée pour cette classe.</div>
          ) : (
            tranches.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-2 bg-bg border border-border rounded-control text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ink">{t.nom}</span>
                  <span className="text-accent font-bold font-mono text-xs">
                    {new Intl.NumberFormat('fr-FR').format(t.montant || 0)} FCFA
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono text-ink-soft">
                    Échéance : {new Date(t.date_limite).toLocaleDateString('fr-FR')}
                  </span>
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
            placeholder="Montant"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            min="0"
            className="w-full px-2 py-1.5 border border-border rounded-control text-xs outline-none focus:border-accent pr-11 font-mono"
          />
          <span className="absolute right-1.5 top-1.5 text-[9px] text-ink-soft font-bold">FCFA</span>
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
            disabled={saving || !nom || !montant || !dateLimite}
            className="w-full h-full bg-ink hover:bg-ink/90 text-cream text-[10px] font-bold rounded-control disabled:opacity-50 transition-colors cursor-pointer"
          >
            + Ajout
          </button>
        </div>
      </div>
    </div>
  );
}
