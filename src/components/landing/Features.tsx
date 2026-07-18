import React from 'react';

export default function Features() {
  const features = [
    { title: 'Élèves & enseignants', desc: 'Fiches complètes, inscriptions, imports Excel robustes sans doublons.' },
    { title: 'Trésorerie & facturation', desc: 'Encaissements Mobile Money, relances et suivi du recouvrement en temps réel.' },
    { title: 'Bulletins PDF', desc: 'Génération conforme MINESEC, bilingue, en quelques clics.' },
    { title: 'Emploi du temps', desc: 'Planification hebdomadaire interactive par classe et par enseignant.' },
    { title: 'Recouvrement', desc: 'Tableau de bord des impayés par classe, famille par famille.' },
    { title: 'Comptabilité OHADA', desc: 'Journal, balance, liasse DSF et fiscalité camerounaise (CNPS, CAC, CFC).' },
    { title: 'Multi-établissement', desc: 'Isolation stricte des données de chaque école via les politiques RLS.' },
    { title: 'RH & paie', desc: 'Contrats, absences, CNPS, IRPP et bulletins de paie automatisés.' },
  ];

  return (
    <section id="fonctionnalites" className="py-20 lg:py-24 bg-bg border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-11">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-1.5px] text-ink">
            Tout votre établissement, un seul outil
          </h2>
          <p className="mt-2 text-base text-ink-soft font-medium">
            Huit modules qui couvrent la vie complète de l&apos;école.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => {
            const accent = i % 3 === 1;
            return (
              <div key={i} className="bg-surface border border-border rounded-card p-6">
                <div className={`w-[42px] h-[42px] rounded-[14px] flex items-center justify-center text-base font-extrabold ${accent ? 'bg-red-bg text-accent' : 'bg-chip text-ink-soft'}`}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="mt-4 mb-1.5 text-[17px] font-extrabold text-ink tracking-[-0.3px]">{f.title}</h3>
                <p className="text-sm text-ink-soft font-medium leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
