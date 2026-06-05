import React from 'react';
import Link from 'next/link';

export default function Pricing() {
  return (
    <section id="tarifs" className="py-24 bg-slate-50 border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Des tarifs simples et transparents
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Choisissez le plan adapté à la taille de votre établissement.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Gratuit */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Gratuit</h3>
            <p className="text-slate-500 mb-6">Pour tester ou pour les petites structures.</p>
            <div className="text-4xl font-extrabold text-slate-900 mb-6">
              0 <span className="text-xl text-slate-500 font-medium">FCFA</span>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex gap-3 text-slate-600">
                <span className="text-indigo-500 font-bold">✓</span> Jusqu'à 100 élèves
              </li>
              <li className="flex gap-3 text-slate-600">
                <span className="text-indigo-500 font-bold">✓</span> 1 Administrateur
              </li>
              <li className="flex gap-3 text-slate-600">
                <span className="text-indigo-500 font-bold">✓</span> Modules de base
              </li>
            </ul>
            <Link href="/login?signup=true" className="block w-full text-center bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors">
              Commencer gratuitement
            </Link>
          </div>

          {/* Standard */}
          <div className="bg-indigo-900 rounded-3xl p-8 border border-indigo-700 shadow-xl relative transform md:-translate-y-4">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white font-bold px-4 py-1 rounded-full text-sm shadow-md">
              Le plus populaire
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Standard</h3>
            <p className="text-indigo-200 mb-6">Idéal pour les collèges et lycées classiques.</p>
            <div className="text-4xl font-extrabold text-white mb-6">
              50 000 <span className="text-xl text-indigo-300 font-medium">FCFA / mois</span>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex gap-3 text-indigo-100">
                <span className="text-emerald-400 font-bold">✓</span> Jusqu'à 300 élèves
              </li>
              <li className="flex gap-3 text-indigo-100">
                <span className="text-emerald-400 font-bold">✓</span> Multi-utilisateurs
              </li>
              <li className="flex gap-3 text-indigo-100">
                <span className="text-emerald-400 font-bold">✓</span> Comptabilité complète
              </li>
              <li className="flex gap-3 text-indigo-100">
                <span className="text-emerald-400 font-bold">✓</span> Support prioritaire
              </li>
            </ul>
            <Link href="/login?signup=true" className="block w-full text-center bg-white text-indigo-900 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors shadow-md">
              Essayer ce plan
            </Link>
          </div>

          {/* Premium */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Premium</h3>
            <p className="text-slate-500 mb-6">Pour les grands établissements ou groupes scolaires.</p>
            <div className="text-4xl font-extrabold text-slate-900 mb-6">
              Sur devis
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex gap-3 text-slate-600">
                <span className="text-indigo-500 font-bold">✓</span> Élèves illimités
              </li>
              <li className="flex gap-3 text-slate-600">
                <span className="text-indigo-500 font-bold">✓</span> Multi-campus
              </li>
              <li className="flex gap-3 text-slate-600">
                <span className="text-indigo-500 font-bold">✓</span> Développements sur-mesure
              </li>
            </ul>
            <Link href="/login?signup=true" className="block w-full text-center bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors">
              Nous contacter
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
