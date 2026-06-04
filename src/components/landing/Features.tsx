import React from 'react';

export default function Features() {
  const features = [
    {
      title: "Gestion des élèves et enseignants",
      description: "Base de données centralisée pour suivre facilement les effectifs, les dossiers et les présences.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      title: "Suivi des paiements en FCFA",
      description: "Finis les impayés invisibles. Comptabilisez les règlements de frais de scolarité, gérez les tranches et les relances.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: "Génération de Bulletins PDF",
      description: "Saisie des notes par les professeurs, calcul automatique des moyennes, et impression massive des bulletins.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      title: "Emploi du temps interactif",
      description: "Gérez les plannings par classe et par enseignant pour éviter les conflits de salles et d'horaires.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: "Dashboard Statistiques",
      description: "Vue d'ensemble en temps réel sur les performances de l'école : finances, taux de réussite, effectifs.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      )
    },
    {
      title: "Comptabilité OHADA",
      description: "Saisie des dépenses, constatation des charges et module d'engagement spécialement conçu pour la norme OHADA.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: "Mode Hors-Ligne & Synchronisation",
      description: "Continuez à travailler même sans internet. Vos données sont sauvegardées localement et synchronisées automatiquement dès que la connexion est rétablie.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: "Export Excel & Rapports",
      description: "Exportez toutes vos données (élèves, paiements, notes) au format Excel en un clic pour vos archives ou analyses externes.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  const benefits = [
    { title: "Gagnez du temps", desc: "Automatisez les tâches répétitives et concentrez-vous sur la pédagogie." },
    { title: "Réduisez les impayés", desc: "Visualisez en un clic les paiements en retard." },
    { title: "Communiquez mieux", desc: "Partagez facilement les notes et les informations importantes avec les parents." },
    { title: "Données sécurisées", desc: "Stockage sécurisé et sauvegardes automatiques dans le cloud." }
  ];

  return (
    <section id="fonctionnalites" className="py-24 bg-slate-50 border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Tout ce dont votre établissement a besoin
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Une suite complète d'outils interconnectés pour remplacer vos tableurs et registres.
          </p>
        </div>

        {/* Bénéfices rapides */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {benefits.map((b, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center hover:shadow-md transition-shadow">
              <div className="w-12 h-12 mx-auto bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                <span className="font-bold">✓</span>
              </div>
              <h4 className="font-bold text-slate-900 mb-2">{b.title}</h4>
              <p className="text-sm text-slate-500">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* Fonctionnalités détaillées */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <div key={i} className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all group">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
