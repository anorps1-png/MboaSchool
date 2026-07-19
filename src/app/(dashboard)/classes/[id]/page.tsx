'use client';
import React, { useState, useEffect, useMemo, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Classe, Eleve } from '@/types/domain';
import Link from 'next/link';
import { useEtablissement } from '@/contexts/etablissement-context';
import { captureError, captureMessage } from '@/lib/observability/logger';

export default function ClasseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const classeId = decodeURIComponent(resolvedParams.id);
  const { etablissementId } = useEtablissement();
  
  const [classe, setClasse] = useState<any | null>(null);
  const [students, setStudents] = useState<Eleve[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!etablissementId) return;
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('*, eleves(*)')
          .eq('id', classeId)
          .eq('etablissement_id', etablissementId)
          .single();

        if (data) {
          setClasse(data);
          setStudents(data.eleves || []);
        }
      } catch (err) {
        captureError(err, { context: "Error fetching class details:" });
      } finally {
        setIsLoaded(true);
      }
    };
    fetchData();
  }, [classeId, etablissementId, supabase]);

  if (!isLoaded) return <div className="p-8 text-center text-ink-soft">Chargement...</div>;
  if (!classe) return <div className="p-8 text-center text-accent font-bold">Classe introuvable</div>;

  const filles = students.filter(s => s.sexe === 'F').length;
  const garcons = students.filter(s => s.sexe === 'M').length;

  let sumAvg = 0;
  let countAvg = 0;
  let passed = 0;

  students.forEach(student => {
    const numericGrades = (student.notes || []).filter(g => g.note !== undefined);
    if (numericGrades.length > 0) {
      // Simplified average calculation for display
      const totalPoints = numericGrades.reduce((sum, g) => sum + ((g.note || 0) * (g.coefficient || 1)), 0);
      const totalCoefs = numericGrades.reduce((sum, g) => sum + (g.coefficient || 1), 0);
      const avg = totalCoefs > 0 ? totalPoints / totalCoefs : 0;
      
      sumAvg += avg;
      countAvg++;
      if (avg >= 10) passed++;
    }
  });

  const classAvg = countAvg > 0 ? (sumAvg / countAvg).toFixed(2) : '--';
  const successRate = countAvg > 0 ? ((passed / countAvg) * 100).toFixed(1) : '--';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Link href="/classes" className="text-ink text-sm font-semibold hover:underline">← Retour aux classes</Link>
      
      <div className="flex items-end justify-between">
        <h1 className="text-[44px] font-extrabold text-ink tracking-[-1.5px] leading-tight">Classe : {classe.nom}</h1>
        <div className="text-sm font-semibold text-ink-soft bg-chip px-3 py-1 rounded-md">
          {classe.section === 'Anglophone' ? 'Section Anglophone' : 'Section Francophone'}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface p-6 rounded-card shadow-sm border border-border">
          <h2 className="text-lg font-bold border-b pb-2 mb-4">Équipe Pédagogique</h2>
          <p className="text-sm text-ink-soft"><span className="font-bold text-ink">Enseignant Principal:</span> {classe.enseignant_principal_id || 'Non assigné'}</p>
          <p className="text-sm text-ink-soft mt-2"><span className="font-bold text-ink">Assistant:</span> {classe.enseignant_assistant_id || 'Aucun'}</p>
        </div>

        <div className="bg-surface p-6 rounded-card shadow-sm border border-border">
          <h2 className="text-lg font-bold border-b pb-2 mb-4">Effectif</h2>
          <div className="flex justify-between items-center">
            <span className="text-[40px] font-extrabold text-ink tracking-[-2px] leading-none">{students.length}</span>
            <div className="text-sm text-ink-soft font-semibold text-right">
              <p>{filles} Filles ({students.length ? Math.round(filles/students.length*100) : 0}%)</p>
              <p>{garcons} Garçons ({students.length ? Math.round(garcons/students.length*100) : 0}%)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface p-6 rounded-card shadow-sm border border-border">
        <h2 className="text-lg font-bold border-b pb-2 mb-4">Performances</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-xs font-bold text-ink-faint uppercase">Moyenne de la classe</p>
            <p className="text-2xl font-extrabold mt-1">{classAvg} / 20</p>
          </div>
          <div>
            <p className="text-xs font-bold text-ink-faint uppercase">Taux de réussite</p>
            <p className="text-2xl font-extrabold text-green mt-1">{successRate}%</p>
          </div>
          <div>
            <p className="text-xs font-bold text-ink-faint uppercase">Comparaison N-1</p>
            <p className="text-2xl font-extrabold text-ink-faint mt-1">N/A</p>
            <p className="text-xs text-ink-faint">Historique multi-années non disponible</p>
          </div>
        </div>
      </div>

      {/* Liste des Élèves */}
      <div className="bg-surface p-6 rounded-card shadow-sm border border-border">
        <div className="flex items-center justify-between border-b pb-2 mb-4">
          <h2 className="text-lg font-bold">Liste des Élèves</h2>
          <span className="text-xs font-bold bg-chip text-ink px-2 py-1 rounded">{students.length} Inscrits</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[12px] font-bold text-ink-faint uppercase tracking-[1px] bg-bg/20">
                <th className="px-4 py-3">Matricule</th>
                <th className="px-4 py-3">Nom complet</th>
                <th className="px-4 py-3">Sexe</th>
                <th className="px-4 py-3">Date de Naissance</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-row text-sm">
              {students.map(student => (
                <tr key={student.id} className="hover:bg-bg/30">
                  <td className="px-4 py-3 text-ink-soft font-mono text-xs">{student.matricule}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{student.nom} {student.prenom}</td>
                  <td className="px-4 py-3">{student.sexe === 'M' ? 'Garçon' : 'Fille'}</td>
                  <td className="px-4 py-3 text-ink-soft">{student.dateNaissance}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/eleves/${encodeURIComponent(student.id)}`} className="inline-block px-3 py-1.5 bg-chip hover:bg-chip text-ink-soft font-semibold rounded-control text-xs transition-colors">
                      Voir profil
                    </Link>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-faint italic">
                    Aucun élève n'est encore inscrit dans cette classe.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
