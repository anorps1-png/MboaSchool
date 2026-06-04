import React from 'react';

export default function Testimonials() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Ils nous font déjà confiance
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Découvrez comment MboaSchool transforme le quotidien des écoles au Cameroun.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 relative">
            <span className="absolute top-6 left-6 text-6xl text-indigo-200 font-serif leading-none">"</span>
            <div className="relative z-10">
              <p className="text-lg text-slate-700 italic mb-6 pt-4">
                Avant, la fin du trimestre était un cauchemar pour l'impression des bulletins. Avec MboaSchool, les moyennes sont calculées sans erreur et on imprime tout en une matinée.
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-700">
                  MA
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">M. Abena</h4>
                  <p className="text-sm text-slate-500">Censeur, Yaoundé</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 relative">
            <span className="absolute top-6 left-6 text-6xl text-indigo-200 font-serif leading-none">"</span>
            <div className="relative z-10">
              <p className="text-lg text-slate-700 italic mb-6 pt-4">
                Le suivi des paiements des frais de scolarité est devenu tellement simple. Je sais exactement qui doit combien, et l'intégration des dépenses OHADA est un vrai plus !
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center font-bold text-emerald-700">
                  JE
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Mme Ekotto</h4>
                  <p className="text-sm text-slate-500">Intendante, Douala</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Logos placeholders */}
        <div className="pt-8 border-t border-slate-100">
          <p className="text-center text-sm font-semibold text-slate-500 uppercase tracking-wider mb-8">
            Établissements partenaires
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2 font-bold text-xl text-slate-400">
                <div className="w-8 h-8 bg-slate-300 rounded-lg"></div>
                École Logo {i}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
