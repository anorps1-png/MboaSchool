import React from 'react';

export default function ProblemSolution() {
  return (
    <section id="solution" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            La gestion scolaire ne devrait pas être un casse-tête
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Fini le stress des fins de trimestre et le suivi manuel des paiements.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Les Problèmes */}
          <div className="bg-red-50 rounded-3xl p-8 border border-red-100">
            <h3 className="text-xl font-bold text-red-800 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Avant MboaSchool
            </h3>
            <ul className="space-y-4">
              {[
                "Registres papier qui s'abîment, se perdent ou sont illisibles.",
                "Difficile de savoir avec certitude qui a payé ou non les frais de scolarité.",
                "Préparation des bulletins de notes qui prend des jours entiers aux enseignants.",
                "Communication difficile et lente avec les parents d'élèves.",
                "Comptabilité complexe et erreurs de calcul manuelles."
              ].map((problem, i) => (
                <li key={i} className="flex gap-3 text-red-700/80">
                  <svg className="w-5 h-5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>{problem}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* La Solution */}
          <div className="bg-emerald-50 rounded-3xl p-8 border border-emerald-100 shadow-xl shadow-emerald-900/5 relative">
            <div className="absolute -top-4 -right-4 bg-yellow-400 text-yellow-900 font-bold px-4 py-1 rounded-full text-sm shadow-md transform rotate-3">
              La solution 🚀
            </div>
            <h3 className="text-xl font-bold text-emerald-800 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Avec MboaSchool
            </h3>
            <ul className="space-y-4">
              {[
                "Vous gérez tout en ligne : inscriptions, dossiers élèves, et historique.",
                "Paiements suivis en temps réel (espèces, MTN Mobile Money, Orange Money).",
                "Notes saisies en un clic, calcul automatique et bulletins PDF générés instantanément.",
                "Tableau de bord comptable clair basé sur les normes OHADA.",
                "Emplois du temps synchronisés par classe et par enseignant."
              ].map((solution, i) => (
                <li key={i} className="flex gap-3 text-emerald-800/80">
                  <svg className="w-5 h-5 flex-shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{solution}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
