'use client';
import React, { useState, useEffect } from 'react';
import { EcritureComptable, CompteOHADA, Eleve } from '@/types/domain';
import { planComptableOHADA, mockEcrituresInitiales } from '@/mock/comptabilite';
import { mockStudents } from '@/mock/students';

export default function ComptabilitePage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'journal' | 'balance' | 'resultat'>('dashboard');
  const [ecritures, setEcritures] = useState<EcritureComptable[]>([]);
  const [planComptable, setPlanComptable] = useState<CompteOHADA[]>([]);
  
  // Modal state - Expense
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expTypeSaisie, setExpTypeSaisie] = useState<'immediat' | 'credit' | 'reglement'>('immediat');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expLibelle, setExpLibelle] = useState('');
  const [expReference, setExpReference] = useState('');
  const [expAmount, setExpAmount] = useState(''); // Montant de la facture
  const [expAmountPaye, setExpAmountPaye] = useState(''); // Montant réglé
  const [expCompteDebit, setExpCompteDebit] = useState('601');
  const [expCompteTiers, setExpCompteTiers] = useState('401');
  const [expCompteCredit, setExpCompteCredit] = useState('571');
  const [expTva, setExpTva] = useState(false);

  // Modal state - Add Account
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccNum, setNewAccNum] = useState('');
  const [newAccLibelle, setNewAccLibelle] = useState('');
  const [newAccClasse, setNewAccClasse] = useState('6');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Force reset of ecritures to apply the new accrual mock data for the user
      localStorage.removeItem('mboaschool_ecritures');
      
      // Load Chart of Accounts
      const storedPlan = localStorage.getItem('mboaschool_plancomptable');
      const loadedPlan = storedPlan ? JSON.parse(storedPlan) : planComptableOHADA;
      setPlanComptable(loadedPlan);
      if (!storedPlan) localStorage.setItem('mboaschool_plancomptable', JSON.stringify(planComptableOHADA));

      // 1. Get stored custom entries (expenses)
      const storedEcritures = localStorage.getItem('mboaschool_ecritures');
      let customEcritures = mockEcrituresInitiales;
      if (storedEcritures) {
        try { customEcritures = JSON.parse(storedEcritures); } catch(e) {}
      }

      // 2. Generate entries from Student Payments (Comptabilité d'Engagement)
      const storedStudents = localStorage.getItem('mboaschool_students');
      let allStudents: Eleve[] = mockStudents;
      if (storedStudents) {
        try { allStudents = JSON.parse(storedStudents); } catch(e) {}
      }

      const paymentEcritures: EcritureComptable[] = [];
      
      allStudents.forEach(student => {
        const paiements = student.paiements || [];
        
        // Calcul du total facturé (engagement total)
        const totalScolarite = paiements.reduce((sum, p) => sum + p.montant, 0);
        
        if (totalScolarite > 0) {
          // Écriture de Constatation (Facturation) à la date d'inscription
          const dateConstatation = student.dateInscription ? student.dateInscription.split('T')[0] : '2025-09-01';
          paymentEcritures.push({
            id: `ecr-const-${student.id}`,
            date: dateConstatation,
            libelle: `Constatation Frais Scolaires - ${student.nom} ${student.prenom}`,
            reference: `FACT-${student.matricule}`,
            lignes: [
              { compteNumero: '411', debit: totalScolarite, credit: 0 }, // Client
              { compteNumero: '706', debit: 0, credit: totalScolarite }  // Produit (Scolarité)
            ]
          });

          // Écritures de Règlements
          paiements.forEach(paiement => {
            if (paiement.statut === 'paid') {
              const isBank = paiement.modePaiement === 'Virement Bancaire';
              const compteTresorerie = isBank ? '521' : '571';
              
              paymentEcritures.push({
                id: `ecr-pay-${paiement.id}`,
                date: paiement.date.split('T')[0],
                libelle: `Règlement ${paiement.typeFrais} - ${student.nom} ${student.prenom}`,
                reference: paiement.reference,
                lignes: [
                  { compteNumero: compteTresorerie, debit: paiement.montant, credit: 0 }, // Trésorerie
                  { compteNumero: '411', debit: 0, credit: paiement.montant } // Solde le client
                ]
              });
            }
          });
        }
      });

      // Combine and sort by date
      const allEcritures = [...customEcritures, ...paymentEcritures].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEcritures(allEcritures);
      
      // Save default if empty
      if (!storedEcritures) {
        localStorage.setItem('mboaschool_ecritures', JSON.stringify(customEcritures));
      }
    }
  }, []);

  const handleLibelleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setExpLibelle(val);
    const lowVal = val.toLowerCase();

    // Auto-select Debit Account based on keywords
    if (lowVal.includes('loyer') || lowVal.includes('location')) setExpCompteDebit('622');
    else if (lowVal.includes('eau') || lowVal.includes('electricit') || lowVal.includes('électricité')) setExpCompteDebit('605');
    else if (lowVal.includes('transport') || lowVal.includes('carburant')) setExpCompteDebit('61');
    else if (lowVal.includes('salaire') || lowVal.includes('paye') || lowVal.includes('prime')) {
      setExpCompteDebit('661');
      setExpCompteTiers('421'); // Personnel
    }
    else if (lowVal.includes('banque') || lowVal.includes('frais bancaires')) setExpCompteDebit('631');
    else if (lowVal.includes('impot') || lowVal.includes('taxe')) {
      setExpCompteDebit('64');
      setExpCompteTiers('441'); // Etat
    }
    else if (lowVal.includes('fourniture') || lowVal.includes('achat')) setExpCompteDebit('601');
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const ts = Date.now();
    const ref = expReference || `OP-${ts.toString().slice(-6)}`;
    
    let newEcritures: EcritureComptable[] = [];

    // 1. Constatation (si ce n'est pas un simple règlement)
    if (expTypeSaisie === 'immediat' || expTypeSaisie === 'credit') {
      const amountTTC = Number(expAmount);
      if (!amountTTC || amountTTC <= 0) return;

      let ht = amountTTC;
      let tva = 0;

      if (expTva) {
        ht = Math.round(amountTTC / 1.1925);
        tva = amountTTC - ht;
      }

      const lignesConstatation = [
        { compteNumero: expCompteDebit, debit: ht, credit: 0 }
      ];
      if (expTva) {
        lignesConstatation.push({ compteNumero: '445', debit: tva, credit: 0 }); // TVA Récupérable
      }
      lignesConstatation.push({ compteNumero: expCompteTiers, debit: 0, credit: amountTTC }); // Tiers (Fournisseur)

      newEcritures.push({
        id: `ecr-cst-${ts}`,
        date: expDate,
        libelle: `Constatation : ${expLibelle}`,
        reference: ref,
        lignes: lignesConstatation
      });
    }

    // 2. Règlement
    let amountToPay = 0;
    if (expTypeSaisie === 'immediat') amountToPay = Number(expAmount);
    else if (expTypeSaisie === 'credit' || expTypeSaisie === 'reglement') amountToPay = Number(expAmountPaye);

    if (amountToPay > 0) {
      newEcritures.push({
        id: `ecr-reg-${ts}`,
        date: expDate,
        libelle: `Règlement : ${expLibelle}`,
        reference: `PAY-${ref}`,
        lignes: [
          { compteNumero: expCompteTiers, debit: amountToPay, credit: 0 },
          { compteNumero: expCompteCredit, debit: 0, credit: amountToPay }
        ]
      });
    }

    if (newEcritures.length === 0) return;

    const stored = localStorage.getItem('mboaschool_ecritures');
    const existing = stored ? JSON.parse(stored) : mockEcrituresInitiales;
    const updated = [...newEcritures, ...existing];
    localStorage.setItem('mboaschool_ecritures', JSON.stringify(updated));
    
    // Update state
    const newAll = [...ecritures, ...newEcritures].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setEcritures(newAll);
    
    setShowExpenseModal(false);
    setExpLibelle('');
    setExpReference('');
    setExpAmount('');
    setExpAmountPaye('');
    setExpTva(false);
    setExpTypeSaisie('immediat');
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccNum || !newAccLibelle) return;
    
    const newAcc: CompteOHADA = {
      numero: newAccNum,
      libelle: newAccLibelle,
      classe: Number(newAccClasse) as any
    };

    const updatedPlan = [...planComptable, newAcc].sort((a,b) => a.numero.localeCompare(b.numero));
    setPlanComptable(updatedPlan);
    localStorage.setItem('mboaschool_plancomptable', JSON.stringify(updatedPlan));
    
    setShowAddAccountModal(false);
    setNewAccNum('');
    setNewAccLibelle('');
    setNewAccClasse('6');
  };

  // --- Calculations ---

  const accountBalances: Record<string, { debit: number, credit: number, solde: number }> = {};
  planComptable.forEach(c => {
    accountBalances[c.numero] = { debit: 0, credit: 0, solde: 0 };
  });

  let totalProducts = 0; // Class 7
  let totalExpenses = 0; // Class 6

  ecritures.forEach(ecr => {
    ecr.lignes.forEach(ligne => {
      if (!accountBalances[ligne.compteNumero]) {
        accountBalances[ligne.compteNumero] = { debit: 0, credit: 0, solde: 0 };
      }
      accountBalances[ligne.compteNumero].debit += ligne.debit;
      accountBalances[ligne.compteNumero].credit += ligne.credit;

      const accountClass = ligne.compteNumero.charAt(0);
      if (accountClass === '7') {
        totalProducts += ligne.credit - ligne.debit;
      } else if (accountClass === '6') {
        totalExpenses += ligne.debit - ligne.credit;
      }
    });
  });

  // Compute solde
  Object.keys(accountBalances).forEach(num => {
    const b = accountBalances[num];
    b.solde = b.debit - b.credit; // Positive means Debit balance, negative means Credit balance
  });

  const netResult = totalProducts - totalExpenses;

  // Formatting helper
  const formatMoney = (val: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 text-black">Comptabilité OHADA (Engagement)</h1>
          <p className="text-sm text-slate-500 mt-1">Gérez vos états financiers, créances, dettes et trésorerie</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddAccountModal(true)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors"
          >
            + Ajouter un Compte
          </button>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-md transition-colors flex items-center gap-2"
          >
            + Saisir une opération
          </button>
        </div>
      </div>

      <div className="flex gap-2 bg-white p-2 rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
        {[
          { id: 'dashboard', label: 'Tableau de bord' },
          { id: 'journal', label: 'Le Journal' },
          { id: 'balance', label: 'Balance Générale' },
          { id: 'resultat', label: 'Compte de Résultat' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
              activeTab === tab.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Chiffre d'Affaires (Produits)</p>
              <h2 className="text-3xl font-extrabold text-indigo-600">{formatMoney(totalProducts)}</h2>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total des Charges</p>
              <h2 className="text-3xl font-extrabold text-rose-500">{formatMoney(totalExpenses)}</h2>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Résultat Net</p>
              <h2 className={`text-3xl font-extrabold ${netResult >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {formatMoney(netResult)}
              </h2>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center py-12">
            <div className="w-16 h-16 mx-auto bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 text-black">Graphique Financier</h3>
            <p className="text-slate-500 text-sm mt-2">Le module graphique complet sera connecté via une librairie de DataViz (ex: Chart.js ou Recharts).</p>
          </div>
        </div>
      )}

      {activeTab === 'journal' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h2 className="font-bold text-slate-800 text-black">Le Journal Comptable</h2>
            <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded">{ecritures.length} opérations</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse text-black">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-black uppercase bg-slate-50/20">
                  <th className="px-4 py-3 text-black">Date</th>
                  <th className="px-4 py-3 text-black">Référence</th>
                  <th className="px-4 py-3 text-black">Compte</th>
                  <th className="px-4 py-3 text-black">Libellé</th>
                  <th className="px-4 py-3 text-right text-black">Débit</th>
                  <th className="px-4 py-3 text-right text-black">Crédit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ecritures.map(ecr => (
                  <React.Fragment key={ecr.id}>
                    {ecr.lignes.map((ligne, idx) => {
                      const compteDef = planComptable.find(c => c.numero === ligne.compteNumero);
                      return (
                        <tr key={`${ecr.id}-${idx}`} className="hover:bg-slate-50/50">
                          {idx === 0 && (
                            <>
                              <td className="px-4 py-3 font-mono text-xs whitespace-nowrap align-top text-black font-semibold" rowSpan={ecr.lignes.length}>{new Date(ecr.date).toLocaleDateString('fr-FR')}</td>
                              <td className="px-4 py-3 font-mono text-xs text-black font-semibold align-top" rowSpan={ecr.lignes.length}>{ecr.reference}</td>
                            </>
                          )}
                          <td className="px-4 py-3 font-bold text-indigo-600">{ligne.compteNumero}</td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-black">{ecr.libelle}</div>
                            <div className="text-xs text-black">{compteDef?.libelle || 'Compte inconnu'}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-black font-bold">{ligne.debit > 0 ? formatMoney(ligne.debit) : ''}</td>
                          <td className="px-4 py-3 text-right font-mono text-black font-bold">{ligne.credit > 0 ? formatMoney(ligne.credit) : ''}</td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'balance' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-800 text-black">Balance Générale des Comptes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse text-black">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-black uppercase bg-slate-50/20">
                  <th className="px-4 py-3 w-24 text-black">Compte</th>
                  <th className="px-4 py-3 text-black">Intitulé</th>
                  <th className="px-4 py-3 text-right text-black">Mouvement Débit</th>
                  <th className="px-4 py-3 text-right text-black">Mouvement Crédit</th>
                  <th className="px-4 py-3 text-right text-black">Solde Débiteur</th>
                  <th className="px-4 py-3 text-right text-black">Solde Créditeur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {planComptable.filter(c => accountBalances[c.numero]?.debit > 0 || accountBalances[c.numero]?.credit > 0).sort((a,b) => a.numero.localeCompare(b.numero)).map(compte => {
                  const b = accountBalances[compte.numero];
                  return (
                    <tr key={compte.numero} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-indigo-600">{compte.numero}</td>
                      <td className="px-4 py-3 font-bold text-black">{compte.libelle}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-bold text-black">{formatMoney(b.debit)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-bold text-black">{formatMoney(b.credit)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-bold text-black">{b.solde > 0 ? formatMoney(b.solde) : ''}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-bold text-black">{b.solde < 0 ? formatMoney(Math.abs(b.solde)) : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'resultat' && (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-xl text-black">
          <div className="text-center mb-8 border-b border-slate-200 pb-6">
            <h1 className="text-2xl font-black uppercase text-black">Compte de Résultat</h1>
            <p className="text-black font-semibold">Période : Exercice en cours</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Charges */}
            <div>
              <h2 className="text-lg font-bold text-rose-600 mb-4 uppercase border-b border-rose-100 pb-2">Charges (Classe 6)</h2>
              <div className="space-y-3">
                {planComptable.filter(c => c.classe === 6 && accountBalances[c.numero]?.debit > 0).map(c => {
                  const val = accountBalances[c.numero].debit - accountBalances[c.numero].credit;
                  return (
                    <div key={c.numero} className="flex justify-between text-sm border-b border-slate-50 pb-2">
                      <span className="text-black font-semibold">{c.numero} - {c.libelle}</span>
                      <span className="font-mono font-bold text-black">{formatMoney(val)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 pt-4 border-t-2 border-slate-200 flex justify-between font-bold text-lg">
                <span className="text-black">TOTAL CHARGES</span>
                <span className="text-rose-600 font-mono font-bold">{formatMoney(totalExpenses)}</span>
              </div>
            </div>

            {/* Produits */}
            <div>
              <h2 className="text-lg font-bold text-emerald-600 mb-4 uppercase border-b border-emerald-100 pb-2">Produits (Classe 7)</h2>
              <div className="space-y-3">
                {planComptable.filter(c => c.classe === 7 && accountBalances[c.numero]?.credit > 0).map(c => {
                  const val = accountBalances[c.numero].credit - accountBalances[c.numero].debit;
                  return (
                    <div key={c.numero} className="flex justify-between text-sm border-b border-slate-50 pb-2">
                      <span className="text-black font-semibold">{c.numero} - {c.libelle}</span>
                      <span className="font-mono font-bold text-black">{formatMoney(val)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 pt-4 border-t-2 border-slate-200 flex justify-between font-bold text-lg">
                <span className="text-black">TOTAL PRODUITS</span>
                <span className="text-emerald-600 font-mono font-bold">{formatMoney(totalProducts)}</span>
              </div>
            </div>
          </div>

          <div className={`mt-12 p-6 rounded-xl text-center border-2 ${netResult >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <h3 className="text-sm font-bold uppercase tracking-widest text-black mb-2">Résultat Net</h3>
            <p className={`text-4xl font-black ${netResult >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatMoney(netResult)}
            </p>
            <p className="text-sm font-bold mt-2 text-black">
              {netResult >= 0 ? 'Bénéfice (Profit)' : 'Perte (Déficit)'}
            </p>
          </div>
        </div>
      )}

      {/* Modal Ajouter un Compte */}
      {showAddAccountModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-100 shadow-2xl p-6 relative">
            <button onClick={() => setShowAddAccountModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 font-bold">✕</button>
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Ajouter un Compte OHADA</h3>
            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Numéro de Compte</label>
                <input type="text" placeholder="Ex: 602" value={newAccNum} onChange={(e) => setNewAccNum(e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Libellé</label>
                <input type="text" placeholder="Ex: Achat de matières premières" value={newAccLibelle} onChange={(e) => setNewAccLibelle(e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Classe OHADA</label>
                <select value={newAccClasse} onChange={(e) => setNewAccClasse(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-semibold">
                  <option value="2">Classe 2 - Immobilisations</option>
                  <option value="4">Classe 4 - Tiers</option>
                  <option value="5">Classe 5 - Trésorerie</option>
                  <option value="6">Classe 6 - Charges</option>
                  <option value="7">Classe 7 - Produits</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddAccountModal(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold">Annuler</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Saisie Opération */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-100 shadow-2xl p-6 relative">
            <button onClick={() => setShowExpenseModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 font-bold">✕</button>
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Saisir une Opération</h3>
            <form onSubmit={handleSaveExpense} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Type de saisie</label>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button type="button" onClick={() => setExpTypeSaisie('immediat')} className={`flex-1 text-xs py-2 px-2 rounded-md font-bold transition-colors ${expTypeSaisie === 'immediat' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>Facture Payée</button>
                  <button type="button" onClick={() => setExpTypeSaisie('credit')} className={`flex-1 text-xs py-2 px-2 rounded-md font-bold transition-colors ${expTypeSaisie === 'credit' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>Facture à Crédit</button>
                  <button type="button" onClick={() => setExpTypeSaisie('reglement')} className={`flex-1 text-xs py-2 px-2 rounded-md font-bold transition-colors ${expTypeSaisie === 'reglement' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>Règlement Dette</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Date</label>
                  <input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Référence Pièce</label>
                  <input type="text" placeholder="Ex: FACT-001" value={expReference} onChange={(e) => setExpReference(e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-mono" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Libellé</label>
                <input type="text" placeholder="Ex: Loyer du mois, Electricité..." value={expLibelle} onChange={handleLibelleChange} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {(expTypeSaisie === 'immediat' || expTypeSaisie === 'credit') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Compte de Charge (Débit)</label>
                    <select value={expCompteDebit} onChange={(e) => setExpCompteDebit(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-semibold">
                      {planComptable.filter(c => c.classe === 6 || c.classe === 2 || c.classe === 4).map(c => (
                        <option key={c.numero} value={c.numero}>{c.numero} - {c.libelle}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className={expTypeSaisie === 'reglement' ? 'col-span-2' : ''}>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Compte Tiers (Fournisseur)</label>
                  <select value={expCompteTiers} onChange={(e) => setExpCompteTiers(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-semibold">
                    {planComptable.filter(c => c.classe === 4).map(c => (
                      <option key={c.numero} value={c.numero}>{c.numero} - {c.libelle}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(expTypeSaisie === 'immediat' || expTypeSaisie === 'credit') && (
                <div className="grid grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Montant Facture TTC</label>
                    <input type="number" min="1" placeholder="Ex: 50000" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-mono" />
                  </div>
                  <div className="pb-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700 select-none">
                      <input type="checkbox" checked={expTva} onChange={(e) => setExpTva(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                      Soumis à TVA (19.25%)
                    </label>
                  </div>
                </div>
              )}

              {(expTypeSaisie === 'credit' || expTypeSaisie === 'reglement') && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Montant Réglé (Payé)</label>
                  <input type="number" min="0" placeholder="Ex: 25000 (0 si aucun paiement)" value={expAmountPaye} onChange={(e) => setExpAmountPaye(e.target.value)} required={expTypeSaisie === 'reglement'} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-mono" />
                </div>
              )}

              {(expTypeSaisie === 'immediat' || (expTypeSaisie === 'credit' && Number(expAmountPaye) > 0) || expTypeSaisie === 'reglement') && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Moyen de paiement (Trésorerie)</label>
                  <select value={expCompteCredit} onChange={(e) => setExpCompteCredit(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:border-indigo-500 font-semibold bg-indigo-50">
                    {planComptable.filter(c => c.classe === 5).map(c => (
                      <option key={c.numero} value={c.numero}>{c.numero} - {c.libelle}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-500 leading-relaxed">
                {expTypeSaisie === 'immediat' && <span>Génère la constatation et le règlement total en même temps.</span>}
                {expTypeSaisie === 'credit' && <span>Génère la constatation globale, et un règlement partiel uniquement si le montant réglé est &gt; 0. Le reste reste dû au fournisseur.</span>}
                {expTypeSaisie === 'reglement' && <span>Génère uniquement un règlement pour diminuer la dette envers le fournisseur.</span>}
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold">Annuler</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
