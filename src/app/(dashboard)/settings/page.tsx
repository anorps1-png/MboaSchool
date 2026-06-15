'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useEtablissement } from '@/contexts/etablissement-context';

interface AcademicYear {
  id: string;
  nom: string;
}

export default function SettingsPage() {
  const { etablissementId, setEtablissementId } = useEtablissement();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Supabase state
  const [schoolName, setSchoolName] = useState('');
  const [passingScore, setPassingScore] = useState<number>(10);
  const [activeYearId, setActiveYearId] = useState('');
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);

  const [showAddYearForm, setShowAddYearForm] = useState(false);
  const [newYearName, setNewYearName] = useState('');
  const [newYearStart, setNewYearStart] = useState('');
  const [newYearEnd, setNewYearEnd] = useState('');

  useEffect(() => {
    if (/^\d{4}\/\d{4}$/.test(newYearName)) {
      const parts = newYearName.split('/');
      setNewYearStart(`${parts[0]}-09-01`);
      setNewYearEnd(`${parts[1]}-06-30`);
    }
  }, [newYearName]);

  const handleCreateYear = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newYearName) return;

    const supabase = createClient();
    try {
      const yearPayload = {
        nom: newYearName,
        date_debut: newYearStart || `${newYearName.split('/')[0]}-09-01`,
        date_fin: newYearEnd || `${newYearName.split('/')[1]}-06-30`,
        etablissement_id: etablissementId,
      };

      const { data, error } = await supabase
        .from('annees_scolaires')
        .insert([yearPayload])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const createdYear = data[0];
        setAcademicYears([createdYear, ...academicYears]);
        setActiveYearId(createdYear.id);
        setShowAddYearForm(false);
        setNewYearName('');
        triggerToast(`Année scolaire ${createdYear.nom} créée et sélectionnée !`);
      }
    } catch (err: any) {
      console.error('Error creating academic year:', err);
      triggerToast(`Erreur : ${err.message || err}`);
    }
  };

  // Local state (localStorage persisted)
  const [schoolMotto, setSchoolMotto] = useState('Éducation, Discipline, Succès');
  const [schoolEmail, setSchoolEmail] = useState('contact@etablissement.com');
  const [schoolPhone, setSchoolPhone] = useState('+237 600 00 00 00');
  const [schoolAddress, setSchoolAddress] = useState('Yaoundé, Cameroun');
  const [directorName, setDirectorName] = useState('M. le Principal');
  
  const [currency, setCurrency] = useState('XAF');
  const [tvaRate, setTvaRate] = useState<number>(19.25);
  const [defaultBankAcc, setDefaultBankAcc] = useState('521');
  const [defaultCashAcc, setDefaultCashAcc] = useState('571');

  // Cameroon specific taxes
  const [cnpsEmployeeRate, setCnpsEmployeeRate] = useState<number>(4.2);
  const [cnpsEmployerRate, setCnpsEmployerRate] = useState<number>(16.2);
  const [cfcEmployeeRate, setCfcEmployeeRate] = useState<number>(1.0);
  const [cfcEmployerRate, setCfcEmployerRate] = useState<number>(1.5);
  const [fneRate, setFneRate] = useState<number>(1.0);
  const [cacRate, setCacRate] = useState<number>(10.0);

  const [themeColor, setThemeColor] = useState('indigo');
  const [appLanguage, setAppLanguage] = useState('fr');

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!etablissementId) return;

    const loadSettings = async () => {
      setLoading(true);
      const supabase = createClient();

      try {
        // 1. Load school/establishment from Supabase
        const { data: etab, error: etabErr } = await supabase
          .from('etablissements')
          .select('*')
          .eq('id', etablissementId)
          .single();

        if (!etabErr && etab) {
          setSchoolName(etab.nom);
          setPassingScore(Number(etab.seuil_reussite) || 10);
          setActiveYearId(etab.annee_scolaire_active_id || '');
        }

        // 2. Load academic years for selection dropdown
        const { data: years, error: yearsErr } = await supabase
          .from('annees_scolaires')
          .select('id, nom')
          .order('nom', { ascending: false });

        if (!yearsErr && years) {
          setAcademicYears(years);
        }
      } catch (err) {
        console.error('Error loading settings from Supabase:', err);
      }

      // 3. Load other configurations from localStorage
      if (typeof window !== 'undefined') {
        setSchoolMotto(localStorage.getItem('setting_school_motto') || 'Éducation, Discipline, Succès');
        setSchoolEmail(localStorage.getItem('setting_school_email') || 'contact@etablissement.com');
        setSchoolPhone(localStorage.getItem('setting_school_phone') || '+237 600 00 00 00');
        setSchoolAddress(localStorage.getItem('setting_school_address') || 'Yaoundé, Cameroun');
        setDirectorName(localStorage.getItem('setting_director_name') || 'M. le Principal');
        
        setCurrency(localStorage.getItem('setting_currency') || 'XAF');
        setTvaRate(Number(localStorage.getItem('setting_tva_rate')) || 19.25);
        setDefaultBankAcc(localStorage.getItem('setting_default_bank_acc') || '521');
        setDefaultCashAcc(localStorage.getItem('setting_default_cash_acc') || '571');

        setCnpsEmployeeRate(Number(localStorage.getItem('setting_cnps_employee_rate')) || 4.2);
        setCnpsEmployerRate(Number(localStorage.getItem('setting_cnps_employer_rate')) || 16.2);
        setCfcEmployeeRate(Number(localStorage.getItem('setting_cfc_employee_rate')) || 1.0);
        setCfcEmployerRate(Number(localStorage.getItem('setting_cfc_employer_rate')) || 1.5);
        setFneRate(Number(localStorage.getItem('setting_fne_rate')) || 1.0);
        setCacRate(Number(localStorage.getItem('setting_cac_rate')) || 10.0);

        setThemeColor(localStorage.getItem('setting_theme_color') || 'indigo');
        setAppLanguage(localStorage.getItem('setting_language') || 'fr');
      }

      setLoading(false);
    };

    loadSettings();
  }, [etablissementId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!etablissementId) return;

    setSaving(true);
    const supabase = createClient();

    try {
      // 1. Update Supabase etablissements details
      const { error: updateErr } = await supabase
        .from('etablissements')
        .update({
          nom: schoolName,
          seuil_reussite: passingScore,
          annee_scolaire_active_id: activeYearId || null,
        })
        .eq('id', etablissementId);

      if (updateErr) throw updateErr;

      // 2. Save other configurations in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('mboaschool_current_school', schoolName);
        if (activeYearId) {
          localStorage.setItem('mboaschool_active_year_id', activeYearId);
        }
        const activeYearObj = academicYears.find(y => y.id === activeYearId);
        if (activeYearObj) {
          localStorage.setItem('mboaschool_current_year', activeYearObj.nom);
        }

        localStorage.setItem('setting_school_motto', schoolMotto);
        localStorage.setItem('setting_school_email', schoolEmail);
        localStorage.setItem('setting_school_phone', schoolPhone);
        localStorage.setItem('setting_school_address', schoolAddress);
        localStorage.setItem('setting_director_name', directorName);
        
        localStorage.setItem('setting_currency', 'XAF');
        localStorage.setItem('setting_tva_rate', tvaRate.toString());
        localStorage.setItem('setting_default_bank_acc', defaultBankAcc);
        localStorage.setItem('setting_default_cash_acc', defaultCashAcc);

        localStorage.setItem('setting_cnps_employee_rate', cnpsEmployeeRate.toString());
        localStorage.setItem('setting_cnps_employer_rate', cnpsEmployerRate.toString());
        localStorage.setItem('setting_cfc_employee_rate', cfcEmployeeRate.toString());
        localStorage.setItem('setting_cfc_employer_rate', cfcEmployerRate.toString());
        localStorage.setItem('setting_fne_rate', fneRate.toString());
        localStorage.setItem('setting_cac_rate', cacRate.toString());

        localStorage.setItem('setting_theme_color', themeColor);
        localStorage.setItem('setting_language', appLanguage);
        
        // Trigger a custom event to update Sidebar/Layout if schoolName changes
        window.dispatchEvent(new Event('school_settings_updated'));
      }

      triggerToast('Paramètres enregistrés avec succès !');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      triggerToast(`Erreur d'enregistrement : ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("ATTENTION : Cette action est irréversible. Êtes-vous sûr de vouloir supprimer définitivement votre compte ainsi que toutes les données associées ?")) {
      return;
    }

    if (!confirm("CONFIRMATION FINALE : Toutes les données enregistrées (élèves, classes, écritures comptables, budget, etc.) seront supprimées définitivement. Confirmez-vous ?")) {
      return;
    }

    try {
      const supabase = createClient();
      
      // Get current user session details
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error("Impossible de récupérer la session utilisateur.");

      // Check current user role
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileErr || !profile) throw new Error("Impossible de charger le profil utilisateur.");

      const isUserAdmin = profile.role === 'admin';

      if (isUserAdmin && profile.etablissement_id) {
        const etabId = profile.etablissement_id;
        
        // 1. Delete notes and bulletins
        const eleveIds = (await supabase.from('eleves').select('id').eq('etablissement_id', etabId)).data?.map(e => e.id) || [];
        if (eleveIds.length > 0) {
          await supabase.from('notes').delete().in('eleve_id', eleveIds);
          await supabase.from('bulletins').delete().in('eleve_id', eleveIds);
          await supabase.from('discipline_incidents').delete().in('eleve_id', eleveIds);
        }
        
        // 2. Delete payments, students
        await supabase.from('paiements').delete().eq('etablissement_id', etabId);
        await supabase.from('eleves').delete().eq('etablissement_id', etabId);
        
        // 3. Delete accounting lines and entries
        const ecritureIds = (await supabase.from('ecritures_comptables').select('id').eq('etablissement_id', etabId)).data?.map(e => e.id) || [];
        if (ecritureIds.length > 0) {
          await supabase.from('lignes_ecritures').delete().in('ecriture_id', ecritureIds);
        }
        await supabase.from('ecritures_comptables').delete().eq('etablissement_id', etabId);
        await supabase.from('comptes_ohada').delete().eq('etablissement_id', etabId);
        
        // 4. Delete classes, subjects, sections, years
        await supabase.from('classes').delete().eq('etablissement_id', etabId);
        await supabase.from('sections').delete().eq('etablissement_id', etabId);
        await supabase.from('annees_scolaires').delete().eq('etablissement_id', etabId);
        
        // 5. Delete teachers and personnel
        await supabase.from('enseignants').delete().eq('etablissement_id', etabId);
        await supabase.from('membres_personnel').delete().eq('etablissement_id', etabId);
        await supabase.from('formations_rh').delete().eq('etablissement_id', etabId);
        
        // 6. Delete other profiles
        await supabase.from('profiles').delete().eq('etablissement_id', etabId).neq('id', user.id);
        
        // 7. Delete etablissement (will delete current profile via cascade, which triggers auth delete)
        const { error: delEtabErr } = await supabase.from('etablissements').delete().eq('id', etabId);
        if (delEtabErr) throw delEtabErr;
      } else {
        // If not admin, just delete their own profile (which triggers auth delete)
        const { error: delProfErr } = await supabase.from('profiles').delete().eq('id', user.id);
        if (delProfErr) throw delProfErr;
      }

      // Logout and redirect to login page
      await supabase.auth.signOut();
      
      // Clear localStorage cache
      localStorage.clear();
      
      // Redirect
      window.location.href = '/login';
    } catch (err: any) {
      console.error("Erreur lors de la suppression du compte :", err);
      alert(`Erreur de suppression : ${err.message || err}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-500 font-semibold">
        Chargement des paramètres de l'établissement...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl z-50 flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white">✓</div>
          <span className="text-sm font-semibold">{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 text-black">Paramètres de l'Établissement</h1>
          <p className="text-sm text-slate-500 mt-1">Configuration générale, seuils académiques, monnaies, taxes et branding PWA/SaaS</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/10 transition-colors disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : 'Sauvegarder les modifications'}
        </button>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: General and Academic Settings */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: General Info */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 text-black border-b border-slate-100 pb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-600"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>
              Identité de l'Établissement
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nom de l'École *</label>
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Devise / Slogan</label>
                <input
                  type="text"
                  value={schoolMotto}
                  onChange={(e) => setSchoolMotto(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nom du Directeur / Principal</label>
                <input
                  type="text"
                  value={directorName}
                  onChange={(e) => setDirectorName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email de Contact</label>
                <input
                  type="email"
                  value={schoolEmail}
                  onChange={(e) => setSchoolEmail(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Téléphone de l'Établissement</label>
                <input
                  type="text"
                  value={schoolPhone}
                  onChange={(e) => setSchoolPhone(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Adresse Physique</label>
              <input
                type="text"
                value={schoolAddress}
                onChange={(e) => setSchoolAddress(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
            </div>
          </div>

          {/* Card 2: Academic parameters */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 text-black border-b border-slate-100 pb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-600"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              Règles Académiques & Année en cours
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Année Scolaire Active</label>
                  <button
                    type="button"
                    onClick={() => setShowAddYearForm(!showAddYearForm)}
                    className="text-[10px] text-indigo-600 hover:text-indigo-700 font-bold transition-colors cursor-pointer"
                  >
                    {showAddYearForm ? "Annuler" : "+ Nouvelle Année"}
                  </button>
                </div>
                {!showAddYearForm ? (
                  <select
                    value={activeYearId}
                    onChange={(e) => setActiveYearId(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-black outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold cursor-pointer"
                  >
                    <option value="">Sélectionnez l'année active</option>
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>{y.nom}</option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nom (Ex: 2026/2027)</label>
                      <input
                        type="text"
                        placeholder="2026/2027"
                        value={newYearName}
                        onChange={(e) => setNewYearName(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-black focus:ring-1 focus:ring-indigo-500 outline-none font-semibold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Début</label>
                        <input
                          type="date"
                          value={newYearStart}
                          onChange={(e) => setNewYearStart(e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-[11px] text-black focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fin</label>
                        <input
                          type="date"
                          value={newYearEnd}
                          onChange={(e) => setNewYearEnd(e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-[11px] text-black focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateYear}
                      className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      Ajouter & Sélectionner
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Seuil de Réussite Académique (Note minimum de passage)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={passingScore}
                    onChange={(e) => setPassingScore(parseFloat(e.target.value) || 10)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">/ 20</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Financial Defaults */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 text-black border-b border-slate-100 pb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-600"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8"/><line x1="12" y1="6" x2="12" y2="18"/></svg>
              Configurations Comptables & Fiscales
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Devise Locale</label>
                <input
                  type="text"
                  disabled
                  value="Franc CFA (FCFA / XAF)"
                  className="w-full px-3.5 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-500 outline-none font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Taux de TVA standard</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={tvaRate}
                    onChange={(e) => setTvaRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">%</span>
                </div>
              </div>
            </div>

            {/* Other Cameroon Taxes */}
            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">Autres Taxes & Charges Salariales/Patronales (Cameroun)</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">CNPS - Part Employé</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={cnpsEmployeeRate}
                      onChange={(e) => setCnpsEmployeeRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">CNPS - Part Employeur</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={cnpsEmployerRate}
                      onChange={(e) => setCnpsEmployerRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Crédit Foncier (CFC) - Part Employé</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={cfcEmployeeRate}
                      onChange={(e) => setCfcEmployeeRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Crédit Foncier (CFC) - Part Employeur</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={cfcEmployerRate}
                      onChange={(e) => setCfcEmployerRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Fonds National Emploi (FNE) - Part Employeur</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={fneRate}
                      onChange={(e) => setFneRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Centimes Additionnels Communaux (CAC)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={cacRate}
                      onChange={(e) => setCacRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Compte Trésorerie - Banque par défaut</label>
                <input
                  type="text"
                  value={defaultBankAcc}
                  onChange={(e) => setDefaultBankAcc(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Compte Trésorerie - Caisse par défaut</label>
                <input
                  type="text"
                  value={defaultCashAcc}
                  onChange={(e) => setDefaultCashAcc(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Branding, App settings, License/SaaS */}
        <div className="space-y-6">
          
          {/* Card 5: Subscription / SaaS info */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 text-black border-b border-slate-100 pb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-600"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Abonnement SaaS & Licence
            </h3>

            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">Formule active</span>
                <span className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">SaaS Élite Pro</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">Statut licence</span>
                <span className="text-emerald-600 font-black flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                  Licence Validée
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">Date d'expiration</span>
                <span className="font-mono text-black font-bold">11/06/2027</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 text-center leading-relaxed">
              Pour toute mise à niveau de licence, ajout de modules ou modification de quota d'élèves/parents, contactez le support MboaSchool.
            </div>
          </div>

          {/* Card 6: Danger Zone - Delete Account */}
          <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm space-y-4 bg-rose-50/5">
            <h3 className="text-base font-bold text-rose-600 border-b border-rose-100 pb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-600"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Zone de Danger
            </h3>

            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              La suppression de votre compte effacera définitivement toutes vos données d'accès. Si vous êtes administrateur, toutes les données de l'établissement (élèves, paiements, écritures comptables, enseignants, etc.) seront également détruites.
            </p>

            <button
              type="button"
              onClick={handleDeleteAccount}
              className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 text-rose-600 hover:text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              Supprimer définitivement mon compte
            </button>
          </div>

        </div>

      </form>
    </div>
  );
}
