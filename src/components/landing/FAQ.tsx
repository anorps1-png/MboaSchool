import React from 'react';

export default function FAQ() {
  const faqs = [
    {
      q: "Est-ce que MboaSchool fonctionne sans connexion internet ?",
      a: "Oui ! MboaSchool est capable de fonctionner en mode hors-ligne. Vous pouvez continuer à saisir des notes ou enregistrer des paiements sans internet. Une fois la connexion rétablie, toutes vos données seront automatiquement synchronisées dans la base de données de l'école. De plus, vous avez toujours la possibilité d'exporter l'ensemble de vos données sur Excel à tout moment."
    },
    {
      q: "Les données de mon école sont-elles en sécurité ?",
      a: "Absolument. Nous utilisons des serveurs sécurisés et vos données sont sauvegardées quotidiennement. Personne d'autre que les administrateurs autorisés de votre école ne peut y accéder."
    },
    {
      q: "Pouvez-vous adapter les bulletins à notre modèle actuel ?",
      a: "Oui, la plateforme permet de configurer le format d'impression des bulletins et des relevés de notes pour qu'ils respectent la charte graphique de votre établissement."
    },
    {
      q: "Comment se passe la formation de mon personnel ?",
      a: "Lors de la souscription au plan Standard ou Premium, une session d'accompagnement est incluse pour former l'intendant, le censeur et le personnel administratif à l'utilisation du logiciel."
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Questions fréquentes
          </h2>
        </div>
        <div className="space-y-8">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <h4 className="text-lg font-bold text-slate-900 mb-2">{faq.q}</h4>
              <p className="text-slate-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
