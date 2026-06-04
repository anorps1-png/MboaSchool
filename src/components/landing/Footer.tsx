import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer id="contact" className="bg-slate-950 pt-24 pb-12 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Final CTA */}
        <div className="bg-indigo-600 rounded-3xl p-8 md:p-12 text-center mb-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Prêt à moderniser la gestion de votre établissement ?
            </h2>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="#demo" className="px-8 py-4 bg-white text-indigo-900 rounded-xl font-bold text-lg hover:bg-slate-50 transition-colors shadow-lg">
                Planifier une démonstration
              </Link>
              <Link href="mailto:contact@mboaschool.cm" className="px-8 py-4 bg-indigo-700 text-white border border-indigo-500 rounded-xl font-bold text-lg hover:bg-indigo-800 transition-colors">
                Nous contacter
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="grid md:grid-cols-4 gap-8 mb-12 border-b border-slate-800 pb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-6 w-8 rounded overflow-hidden shadow">
                <div className="bg-emerald-600 w-1/3 h-full"></div>
                <div className="bg-red-600 w-1/3 h-full flex items-center justify-center relative">
                  <span className="text-[6px] text-yellow-400">★</span>
                </div>
                <div className="bg-yellow-400 w-1/3 h-full"></div>
              </div>
              <span className="font-bold text-xl text-white tracking-tight">MboaSchool</span>
            </div>
            <p className="text-slate-400 max-w-sm mb-6">
              Le logiciel de gestion scolaire conçu sur-mesure pour les réalités des collèges et lycées du Cameroun.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Produit</h4>
            <ul className="space-y-2 text-slate-400">
              <li><a href="#fonctionnalites" className="hover:text-white transition-colors">Fonctionnalités</a></li>
              <li><a href="#tarifs" className="hover:text-white transition-colors">Tarifs</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Cas clients</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Légal</h4>
            <ul className="space-y-2 text-slate-400">
              <li><a href="#" className="hover:text-white transition-colors">Mentions légales</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Confidentialité</a></li>
              <li><a href="#" className="hover:text-white transition-colors">CGV</a></li>
            </ul>
          </div>
        </div>
        
        <div className="text-center text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} MboaSchool. Tous droits réservés. Fait avec passion pour l'éducation au Cameroun.
        </div>
      </div>
    </footer>
  );
}
