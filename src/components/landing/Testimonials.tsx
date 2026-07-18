import React from 'react';

export default function Testimonials() {
  const testimonials = [
    {
      quote: "Avant, la fin du trimestre était un cauchemar pour l'impression des bulletins. Avec MboaSchool, les moyennes sont calculées sans erreur et on imprime tout en une matinée.",
      initials: 'MA',
      name: 'M. Abena',
      role: 'Censeur, Yaoundé',
    },
    {
      quote: "Le suivi des paiements des frais de scolarité est devenu tellement simple. Je sais exactement qui doit combien, et l'intégration des dépenses OHADA est un vrai plus !",
      initials: 'JE',
      name: 'Mme Ekotto',
      role: 'Intendante, Douala',
    },
  ];

  return (
    <section className="py-20 lg:py-24 bg-bg border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-1.5px] text-ink">
            Ils nous font déjà confiance
          </h2>
          <p className="mt-3 text-base text-ink-soft font-medium">
            Découvrez comment MboaSchool transforme le quotidien des écoles au Cameroun.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-14">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-surface p-8 rounded-card-lg border border-border relative">
              <span className="absolute top-5 left-6 text-6xl text-chip font-serif leading-none select-none">&ldquo;</span>
              <div className="relative z-10">
                <p className="text-base text-ink-soft italic mb-6 pt-5 leading-relaxed">{t.quote}</p>
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 bg-chip rounded-full flex items-center justify-center font-extrabold text-ink-soft text-sm">
                    {t.initials}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-ink">{t.name}</h4>
                    <p className="text-sm text-ink-faint">{t.role}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-border">
          <p className="text-center text-xs font-bold text-ink-faint uppercase tracking-wider mb-8">
            Établissements partenaires
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-14 opacity-60">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2 font-extrabold text-lg text-ink-faint">
                <div className="w-8 h-8 bg-chip rounded-control"></div>
                École {i}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
