'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { mockClassFees, mockTransactions } from '@/mock/fees';
import { SearchIcon } from '@/components/icons';
import { ConfigurationFrais, TransactionPaiement } from '@/types/domain';

export default function FraisPage() {
  const [activeTab, setActiveTab] = useState<'config' | 'transactions'>('config');

  const [feeConfigs, setFeeConfigs] = useState<ConfigurationFrais[]>([]);
  const [transactions, setTransactions] = useState<TransactionPaiement[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  // Temporary editing states
  const [editRegistration, setEditRegistration] = useState(0);
  const [editTuition, setEditTuition] = useState(0);
  const [editExam, setEditExam] = useState(0);

  // Transaction filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedMethod, setSelectedMethod] = useState('All');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Fee configs
      const storedFees = localStorage.getItem('mboaschool_fees_config');
      if (storedFees) {
        try {
          setFeeConfigs(JSON.parse(storedFees));
        } catch (e) {
          setFeeConfigs(mockClassFees);
        }
      } else {
        localStorage.setItem('mboaschool_fees_config', JSON.stringify(mockClassFees));
        setFeeConfigs(mockClassFees);
      }

      // Transactions
      const storedTx = localStorage.getItem('mboaschool_transactions');
      if (storedTx) {
        try {
          setTransactions(JSON.parse(storedTx));
        } catch (e) {
          setTransactions(mockTransactions);
        }
      } else {
        localStorage.setItem('mboaschool_transactions', JSON.stringify(mockTransactions));
        setTransactions(mockTransactions);
      }
      setIsLoaded(true);
    }
  }, []);

  // Calculations for transactions
  const totalCollected = useMemo(() => {
    return transactions
      .filter(t => t.statut === 'paid')
      .reduce((sum, t) => sum + t.montant, 0);
  }, [transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const nameMatch = t.nomEleve.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        t.matriculeEleve.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        t.reference.toLowerCase().includes(searchTerm.toLowerCase());
      const typeMatch = selectedType === 'All' || t.typeFrais === selectedType;
      const methodMatch = selectedMethod === 'All' || t.modePaiement === selectedMethod;
      return nameMatch && typeMatch && methodMatch;
    });
  }, [transactions, searchTerm, selectedType, selectedMethod]);

  const handleStartEdit = (index: number, config: ConfigurationFrais) => {
    setEditingIndex(index);
    setEditRegistration(config.fraisInscription);
    setEditTuition(config.fraisScolarite);
    setEditExam(config.fraisExamen);
  };

  const handleSaveEdit = (index: number) => {
    const updated = [...feeConfigs];
    updated[index] = {
      ...updated[index],
      fraisInscription: editRegistration,
      fraisScolarite: editTuition,
      fraisExamen: editExam,
      total: editRegistration + editTuition + editExam
    };
    setFeeConfigs(updated);
    localStorage.setItem('mboaschool_fees_config', JSON.stringify(updated));
    setEditingIndex(null);
  };

  const formatFCFA = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  if (!isLoaded) {
    return (
      <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl shadow-sm">
        <p className="text-slate-500">Chargement de la comptabilité...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight text-black font-black">Frais & Comptabilité</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configurez la structure de frais scolaires par classe et suivez le journal comptable.
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Fonds Collectés (Global)</span>
          <span className="text-2xl font-extrabold text-indigo-600 mt-2 block">{formatFCFA(totalCollected)}</span>
        </div>
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Transactions Validées</span>
          <span className="text-2xl font-extrabold text-emerald-600 mt-2 block">{transactions.length} paiements</span>
        </div>
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Classes configurées</span>
          <span className="text-2xl font-extrabold text-slate-800 mt-2 block text-black">{feeConfigs.length} niveaux</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-5 py-3.5 text-sm font-bold border-b-2 transition-all -mb-px ${
            activeTab === 'config'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          Configuration des Frais par Classe
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-5 py-3.5 text-sm font-bold border-b-2 transition-all -mb-px ${
            activeTab === 'transactions'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          Journal des Paiements
        </button>
      </div>

      {/* Tab content panels */}
      <div className="min-h-96">
        {/* Panel 1: Configuration */}
        {activeTab === 'config' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block text-black">Grille tarifaire des scolarités</span>
                <span className="text-[10px] text-slate-400">Montants de base applicables par élève inscrit</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/20">
                    <th className="px-6 py-4">Classe</th>
                    <th className="px-6 py-4">Frais Inscription</th>
                    <th className="px-6 py-4">Frais Scolarité</th>
                    <th className="px-6 py-4">Frais d&apos;Examen</th>
                    <th className="px-6 py-4">Total Annuel</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {feeConfigs.map((config, index) => {
                    const isEditing = editingIndex === index;
                    return (
                      <tr key={config.niveauId} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800 text-black">{config.niveauId}</td>
                        <td className="px-6 py-4 text-black">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editRegistration}
                              onChange={(e) => setEditRegistration(Number(e.target.value))}
                              className="w-28 px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none text-black"
                            />
                          ) : (
                            formatFCFA(config.fraisInscription)
                          )}
                        </td>
                        <td className="px-6 py-4 text-black">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editTuition}
                              onChange={(e) => setEditTuition(Number(e.target.value))}
                              className="w-28 px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none text-black"
                            />
                          ) : (
                            formatFCFA(config.fraisScolarite)
                          )}
                        </td>
                        <td className="px-6 py-4 text-black">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editExam}
                              onChange={(e) => setEditExam(Number(e.target.value))}
                              className="w-28 px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none text-black"
                            />
                          ) : (
                            formatFCFA(config.fraisExamen)
                          )}
                        </td>
                        <td className="px-6 py-4 font-extrabold text-slate-800 text-black">
                          {isEditing ? (
                            formatFCFA(editRegistration + editTuition + editExam)
                          ) : (
                            formatFCFA(config.total)
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isEditing ? (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setEditingIndex(null)}
                                className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded text-xs font-bold transition-all cursor-pointer"
                              >
                                Annuler
                              </button>
                              <button
                                onClick={() => handleSaveEdit(index)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition-all cursor-pointer"
                              >
                                Sauver
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartEdit(index, config)}
                              className="inline-flex items-center justify-center px-3 py-1.5 border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/20 hover:text-indigo-600 rounded-lg text-xs font-semibold text-slate-600 transition-all cursor-pointer"
                            >
                              Éditer
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Panel 2: Transactions Journal */}
        {activeTab === 'transactions' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Filter Bar */}
            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="relative w-full md:w-80">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <SearchIcon size={16} />
                </span>
                <input
                  type="text"
                  placeholder="Rechercher par élève, matricule, reçu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-black"
                />
              </div>

              {/* Select filters */}
              <div className="flex flex-wrap gap-3 w-full md:w-auto items-center justify-end">
                {/* Type Filter */}
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 pl-3 pr-8 py-2 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-black"
                >
                  <option value="All">Tous les types de frais</option>
                  <option value="Inscription">Inscription</option>
                  <option value="Scolarité">Scolarité</option>
                  <option value="Examen">Examen</option>
                </select>

                {/* Method Filter */}
                <select
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 pl-3 pr-8 py-2 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-black"
                >
                  <option value="All">Tous les modes</option>
                  <option value="Orange Money">Orange Money</option>
                  <option value="MTN Mobile Money">MTN Mobile Money</option>
                  <option value="Espèces">Espèces</option>
                  <option value="Virement Bancaire">Virement Bancaire</option>
                </select>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/20">
                      <th className="px-6 py-4">Reçu / Réf</th>
                      <th className="px-6 py-4">Élève</th>
                      <th className="px-6 py-4">Classe</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Montant</th>
                      <th className="px-6 py-4">Mode</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-500">{tx.reference}</td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-800 text-black">{tx.nomEleve}</span>
                            <span className="block text-[10px] text-slate-400">{tx.matriculeEleve}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-medium">{tx.classeNom}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              tx.typeFrais === 'Inscription' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                            }`}>
                              {tx.typeFrais}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800 text-black">{formatFCFA(tx.montant)}</td>
                          <td className="px-6 py-4 text-slate-500 text-xs">{tx.modePaiement}</td>
                          <td className="px-6 py-4 text-slate-500 text-xs">{tx.date}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Payé
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400 text-sm">
                          Aucun paiement enregistré pour ces critères.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
