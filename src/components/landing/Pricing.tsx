import React from 'react';
import Link from 'next/link';

export default function Pricing() {
  return (
    <section id="tarifs" className="py-20 lg:py-24 bg-surface border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-1.5px] text-ink">
            Des tarifs simples et transparents
          </h2>
          <p className="mt-3 text-base text-ink-soft font-medium">
            Choisissez le plan adapté à la taille de votre établissement.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
          {/* Gratuit */}
          <div className="bg-bg rounded-card-lg p-8 border border-border">
            <h3 className="text-2xl font-extrabold text-ink mb-1.5">Gratuit</h3>
            <p className="text-sm text-ink-faint font-medium mb-5">Pour tester ou pour les petites structures.</p>
            <div className="text-4xl font-extrabold text-ink tracking-[-1.5px] mb-6">
              0 <span className="text-lg text-ink-faint font-semibold">FCFA</span>
            </div>
            <ul className="space-y-3 mb-7 text-sm font-semibold text-ink-soft">
              <li>✓ Jusqu&apos;à 100 élèves</li>
              <li>✓ 1 administrateur</li>
              <li>✓ Modules de base</li>
            </ul>
            <Link href="/login?signup=true" className="block w-full text-center bg-chip text-ink font-extrabold py-3.5 rounded-control hover:bg-chip-hover transition-colors">
              Commencer gratuitement
            </Link>
          </div>

          {/* Standard */}
          <div className="bg-ink rounded-card-lg p-8 text-cream relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-accent text-cream font-extrabold px-4 py-1.5 rounded-pill text-xs shadow-cta">
              Le plus populaire
            </div>
            <h3 className="text-2xl font-extrabold text-cream mb-1.5">Standard</h3>
            <p className="text-sm text-[#a89a7e] font-medium mb-5">Idéal pour les collèges et lycées classiques.</p>
            <div className="text-4xl font-extrabold text-cream tracking-[-1.5px] mb-6">
              50 000 <span className="text-sm text-[#a89a7e] font-semibold">FCFA / mois</span>
            </div>
            <ul className="space-y-3 mb-7 text-sm font-semibold text-[#d8ceb8]">
              <li>✓ Jusqu&apos;à 300 élèves</li>
              <li>✓ Multi-utilisateurs</li>
              <li>✓ Comptabilité complète</li>
              <li>✓ Bulletins PDF illimités</li>
            </ul>
            <Link href="/login?signup=true" className="block w-full text-center bg-accent text-cream font-extrabold py-3.5 rounded-control hover:bg-accent-hover transition-colors shadow-cta">
              Choisir Standard
            </Link>
          </div>

          {/* Premium */}
          <div className="bg-bg rounded-card-lg p-8 border border-border">
            <h3 className="text-2xl font-extrabold text-ink mb-1.5">Premium</h3>
            <p className="text-sm text-ink-faint font-medium mb-5">Pour les grands groupes et complexes scolaires.</p>
            <div className="text-4xl font-extrabold text-ink tracking-[-1.5px] mb-6">Sur devis</div>
            <ul className="space-y-3 mb-7 text-sm font-semibold text-ink-soft">
              <li>✓ Élèves illimités</li>
              <li>✓ Multi-établissements</li>
              <li>✓ Accompagnement dédié</li>
            </ul>
            <Link href="/login?signup=true" className="block w-full text-center bg-chip text-ink font-extrabold py-3.5 rounded-control hover:bg-chip-hover transition-colors">
              Contacter l&apos;équipe
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
