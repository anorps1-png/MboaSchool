import React from 'react';

export default function TargetAudience() {
  return (
    <section className="py-24 bg-indigo-900 text-white relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-indigo-900 to-indigo-900"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">
            Pensé pour tous les acteurs de votre école
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-indigo-800/50 p-8 rounded-2xl border border-indigo-700 backdrop-blur-sm">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Directeurs & Fondateurs</h3>
            <p className="text-indigo-200 leading-relaxed">
              Pilotez votre établissement en temps réel. Suivez le recouvrement classe par classe avec des indicateurs visuels (donuts), analysez les moyennes générales et prenez des décisions éclairées.
            </p>
          </div>

          <div className="bg-indigo-800/50 p-8 rounded-2xl border border-indigo-700 backdrop-blur-sm">
            <div className="w-12 h-12 bg-yellow-400/20 text-yellow-400 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Intendants & Comptables</h3>
            <p className="text-indigo-200 leading-relaxed">
              Fini les écarts de caisse. Distinguez le CA constaté et la trésorerie perçue, calculez les salaires avec les cotisations camerounaises (CNPS, CFC, FNE, etc.) et générez le journal comptable OHADA.
            </p>
          </div>

          <div className="bg-indigo-800/50 p-8 rounded-2xl border border-indigo-700 backdrop-blur-sm">
            <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Responsables Scolarité</h3>
            <p className="text-indigo-200 leading-relaxed">
              Gérez les inscriptions, mettez à jour les dossiers, préparez les emplois du temps et imprimez les bulletins de fin de trimestre en un clic.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
