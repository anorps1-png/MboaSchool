import React from 'react';
import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-white to-white"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold mb-8 animate-fade-in-up">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Spécialement conçu pour le Cameroun 🇨🇲
        </div>
        
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight mb-8">
          La gestion de votre école,<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-500">
            enfin simplifiée.
          </span>
        </h1>
        
        <p className="mt-4 text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
          Mboaschool centralise les élèves, les enseignants, les paiements, les notes et les bulletins dans une seule plateforme en ligne, pensée pour les écoles camerounaises.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
          <Link href="#demo" className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/30 transition-all transform hover:-translate-y-1">
            Demander une démonstration
          </Link>
          <Link href="/dashboard" className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
            Essayer gratuitement
          </Link>
        </div>

        {/* Dashboard Mockup Placeholder */}
        <div className="relative mx-auto max-w-5xl rounded-2xl border border-slate-200/50 bg-white/50 backdrop-blur shadow-2xl p-2 sm:p-4">
          <div className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50 aspect-[16/9] relative flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50 to-slate-50 opacity-50"></div>
            <div className="text-center z-10">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-slate-500 font-medium">Aperçu interactif du tableau de bord</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
