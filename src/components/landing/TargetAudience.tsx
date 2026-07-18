import React from 'react';

export default function TargetAudience() {
  const audiences = [
    {
      badge: 'D',
      title: 'Directeurs & Fondateurs',
      desc: "Pilotez votre établissement en temps réel. Suivez le recouvrement classe par classe, analysez les moyennes générales et prenez des décisions éclairées.",
    },
    {
      badge: 'I',
      title: 'Intendants & Comptables',
      desc: "Fini les écarts de caisse. Distinguez le CA constaté et la trésorerie perçue, calculez les salaires avec les cotisations camerounaises (CNPS, CFC, FNE) et générez le journal OHADA.",
    },
    {
      badge: 'S',
      title: 'Responsables Scolarité',
      desc: "Gérez les inscriptions, mettez à jour les dossiers, préparez les emplois du temps et imprimez les bulletins de fin de trimestre en un clic.",
    },
  ];

  return (
    <section className="py-20 lg:py-24 bg-ink text-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-1.5px] text-cream">
            Pensé pour tous les acteurs de votre école
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {audiences.map((a, i) => (
            <div key={i} className="rounded-card p-8 border border-cream/10 bg-cream/[0.04]">
              <div className="w-[42px] h-[42px] rounded-[14px] bg-accent text-cream flex items-center justify-center font-extrabold text-lg mb-5">
                {a.badge}
              </div>
              <h3 className="text-xl font-extrabold mb-2.5 text-cream">{a.title}</h3>
              <p className="text-[#a89a7e] leading-relaxed text-sm font-medium">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
