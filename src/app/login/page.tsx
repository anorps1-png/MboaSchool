'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, isRunningInElectron } from '@/lib/supabase/client';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Navigation & Wizard State
  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [signupStep, setSignupStep] = useState(1); // 1: Credentials, 2: Plan, 3: Payment, 4: School Info
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1 & Login States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkStatus = () => {
        const forceOffline = localStorage.getItem('mboaschool_force_offline') === 'true';
        setIsOffline(!navigator.onLine || forceOffline);
      };
      checkStatus();
      window.addEventListener('online', checkStatus);
      window.addEventListener('offline', checkStatus);
      return () => {
        window.removeEventListener('online', checkStatus);
        window.removeEventListener('offline', checkStatus);
      };
    }
  }, []);

  // Step 2 State: Subscription Plan
  const [selectedPlan, setSelectedPlan] = useState<'Basic' | 'Standard' | 'Premium'>('Standard');

  // Step 3 State: Payment Method
  const [paymentMethod, setPaymentMethod] = useState<'momo' | 'om' | 'card'>('momo');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Step 4 State: School Information
  const [schoolName, setSchoolName] = useState('');
  const [schoolSystem, setSchoolSystem] = useState('Francophone');
  const [schoolYear, setSchoolYear] = useState('2025/2026');

  const supabase = createClient();

  useEffect(() => {
    const isSignupUrl = searchParams.get('signup') === 'true';
    if (isSignupUrl) {
      setIsSignUp(true);
      setSignupStep(1);
    }
  }, [searchParams]);

  const handleOfflineLogin = () => {
    // Check if we have a simulated active account session
    const storedOffline = localStorage.getItem('mboaschool_offline_session');
    if (storedOffline) {
      try {
        const parsed = JSON.parse(storedOffline);
        if (parsed.email === email) {
          document.cookie = "mboaschool_offline_session=true; path=/; max-age=86400";
          router.push('/dashboard');
          return;
        }
      } catch (e) {
        console.warn("Parsing offline session failed", e);
      }
    }

    // Check in mboaschool_profiles for simulated accounts cached during online login
    const storedProfiles = localStorage.getItem('mboaschool_profiles');
    if (storedProfiles) {
      try {
        const profilesList = JSON.parse(storedProfiles);
        const matchedProfile = profilesList.find((p: any) => p.email === email);
        if (matchedProfile) {
          // Verify password if it is stored in the profile
          if (matchedProfile.password && matchedProfile.password !== password) {
            setErrorMsg("Mot de passe incorrect.");
            setIsLoading(false);
            return;
          }
          localStorage.setItem('mboaschool_offline_session', JSON.stringify({
            email: matchedProfile.email,
            role: matchedProfile.role,
            school: matchedProfile.school || localStorage.getItem('mboaschool_current_school') || 'Mon Établissement'
          }));
          if (matchedProfile.school) {
            localStorage.setItem('mboaschool_current_school', matchedProfile.school);
          }
          if (matchedProfile.etablissement_id) {
            localStorage.setItem('mboaschool_etablissement_id', matchedProfile.etablissement_id);
          }
          document.cookie = "mboaschool_offline_session=true; path=/; max-age=86400";
          router.push('/dashboard');
          return;
        }
      } catch (e) {
        console.warn("Failed checking mboaschool_profiles", e);
      }
    }

    // General fallback demo login
    if (email === 'admin@mboaschool.com' || email === 'directeur@mboaschool.com') {
      const demoEtabId = 'd3b07384-d113-4ee7-a496-c67b8a74e50d';
      const demoYearId = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
      document.cookie = "mboaschool_offline_session=true; path=/; max-age=86400";
      localStorage.setItem('mboaschool_offline_session', JSON.stringify({
        email,
        role: 'admin',
        school: 'Collège Vogt - Yaoundé'
      }));
      localStorage.setItem('mboaschool_current_school', 'Collège Vogt - Yaoundé');
      localStorage.setItem('mboaschool_current_year', '2025/2026');
      localStorage.setItem('mboaschool_active_year_id', demoYearId);
      localStorage.setItem('mboaschool_etablissement_id', demoEtabId);

      // Pre-populate offline cache for annees_scolaires
      const mockYear = { id: demoYearId, nom: '2025/2026', etablissement_id: demoEtabId };
      localStorage.setItem('offline_cache_annees_scolaires', JSON.stringify([mockYear]));

      router.push('/dashboard');
      return;
    }

    setErrorMsg("Aucun compte local correspondant trouvé sur cet appareil. Veuillez vous connecter une fois en ligne.");
    setIsLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    const isElectron = isRunningInElectron();
    const forceOffline = isElectron && typeof window !== 'undefined' && localStorage.getItem('mboaschool_force_offline') === 'true';
    const isOfflineMode = isElectron && typeof navigator !== 'undefined' && (!navigator.onLine || forceOffline);

    if (isOfflineMode) {
      handleOfflineLogin();
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      if (data?.user) {
        // Clear offline session cookie if successful Supabase authentication
        document.cookie = "mboaschool_offline_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        localStorage.removeItem('mboaschool_offline_session');
        
        // Fetch profile and cache robustly in Electron only
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('etablissement_id, role, permissions, nom_complet')
            .eq('id', data.user.id)
            .single();
            
          let schoolName = 'Mon Établissement';
          let etabId = profile?.etablissement_id || null;
          
          if (etabId) {
            localStorage.setItem('mboaschool_etablissement_id', etabId);
            const { data: etab } = await supabase
              .from('etablissements')
              .select('nom')
              .eq('id', etabId)
              .single();
            if (etab) {
              schoolName = etab.nom;
              localStorage.setItem('mboaschool_current_school', etab.nom);
            }
          }
          
          if (isElectron) {
            const storedProfiles = localStorage.getItem('mboaschool_profiles');
            let profilesList = [];
            if (storedProfiles) {
              try { profilesList = JSON.parse(storedProfiles); } catch (e) {}
            }
            profilesList = profilesList.filter((p: any) => p.email !== email);
            profilesList.push({
              id: data.user.id,
              email: email,
              password: password, // Store password for offline local check
              role: profile?.role || 'admin',
              school: schoolName,
              etablissement_id: etabId,
              permissions: profile?.permissions || null,
              nom_complet: profile?.nom_complet || '',
              created_at: new Date().toISOString()
            });
            localStorage.setItem('mboaschool_profiles', JSON.stringify(profilesList));
          }
        } catch (profileErr) {
          console.warn('Could not fetch/cache profile on login:', profileErr);
          
          if (isElectron) {
            // Fallback to caching basic details
            const storedProfiles = localStorage.getItem('mboaschool_profiles');
            let profilesList = [];
            if (storedProfiles) {
              try { profilesList = JSON.parse(storedProfiles); } catch (e) {}
            }
            if (!profilesList.find((p: any) => p.email === email)) {
              profilesList.push({
                id: data.user.id,
                email: email,
                password: password,
                role: 'admin',
                school: localStorage.getItem('mboaschool_current_school') || 'Mon Établissement',
                etablissement_id: localStorage.getItem('mboaschool_etablissement_id'),
                created_at: new Date().toISOString()
              });
              localStorage.setItem('mboaschool_profiles', JSON.stringify(profilesList));
            }
          }
        }
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error("Login error, checking error type:", err);

      // 1. Check if the error is due to unconfirmed email
      if (err.message && (err.message.includes('Email not confirmed') || err.message.toLowerCase().includes('confirm'))) {
        setErrorMsg("Veuillez valider votre adresse email avant de vous connecter. Un email de confirmation vous a été envoyé lors de votre inscription.");
        setIsLoading(false);
        return;
      }

      // 2. Check if it's a real credential failure from Supabase
      const isRealAuthError = err.message && (
        err.message.includes('Invalid login credentials') ||
        err.message.toLowerCase().includes('invalid_credentials') ||
        err.message.toLowerCase().includes('invalid credentials')
      );

      if (isRealAuthError) {
        setErrorMsg("Identifiants de connexion invalides. Veuillez vérifier votre adresse email et votre mot de passe.");
        setIsLoading(false);
        return;
      }

      // Connection error, fallback to offline login only in Electron
      if (isElectron) {
        handleOfflineLogin();
      } else {
        setErrorMsg("Erreur de connexion : impossible de joindre le serveur. Veuillez vérifier votre connexion internet.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (signupStep === 1) {
      if (!email || !password || password.length < 6) {
        setErrorMsg("Le mot de passe doit faire au moins 6 caractères.");
        return;
      }
      setSignupStep(2);
    } else if (signupStep === 2) {
      setSignupStep(3);
    }
  };

  const handleSimulatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentLoading(true);
    setErrorMsg(null);

    // Simulate validation
    setTimeout(() => {
      setPaymentLoading(false);
      setPaymentSuccess(true);
      setTimeout(() => {
        setSignupStep(4);
      }, 1000);
    }, 2000);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName) {
      setErrorMsg("Veuillez renseigner le nom de votre établissement.");
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // 1. Create client auth user in Supabase with metadata
      const { data: signUpData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            school_name: schoolName,
            school_year: schoolYear
          }
        }
      });

      if (authError) throw authError;

      if (signUpData?.user) {
        // Since database trigger handles creating the establishment, year, and profile,
        // we can fetch the profile to get the created etablissement_id
        let etabId = null;
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('etablissement_id')
            .eq('id', signUpData.user.id)
            .single();
          if (profile) etabId = profile.etablissement_id;
        } catch (e) {
          console.warn("Could not fetch newly created profile immediately:", e);
        }

        // Always save plan & info to local storage as fallback and for Layout displaying
        localStorage.setItem('mboaschool_current_school', schoolName);
        localStorage.setItem('mboaschool_current_year', schoolYear);
        localStorage.setItem('mboaschool_subscription', selectedPlan);
        // Persist the etablissement_id for multi-tenant filtering
        if (etabId) {
          localStorage.setItem('mboaschool_etablissement_id', etabId);
        }

        // Update local profiles list so they can log back in
        const storedProfiles = localStorage.getItem('mboaschool_profiles');
        let profilesList = [];
        if (storedProfiles) {
          try {
            profilesList = JSON.parse(storedProfiles);
          } catch (e) {
            profilesList = [];
          }
        }
        if (!profilesList.find((p: any) => p.email === email)) {
          profilesList.push({
            id: signUpData?.user?.id || `offline-${Date.now()}`,
            email: email,
            password: password,
            role: 'admin',
            school: schoolName,
            etablissement_id: etabId,
            created_at: new Date().toISOString()
          });
          localStorage.setItem('mboaschool_profiles', JSON.stringify(profilesList));
        }

        // If the email is auto-confirmed, we can log the user in immediately
        if (!signUpData.session) {
          try {
            await supabase.auth.signInWithPassword({
              email,
              password
            });
          } catch (loginErr) {
            console.warn("Auto login failed after signup:", loginErr);
          }
        }
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.warn("Supabase onboarding failed, checking error type:", err);
      
      // If it's a real API auth error from Supabase (rate limit, weak password, duplicate email, invalid domain),
      // we must show the error instead of falling back to simulated offline mode.
      if (err.status || err.code || (err.message && !err.message.includes('fetch') && !err.message.includes('network') && !err.message.includes('Failed to fetch'))) {
        let displayMsg = err.message;
        if (err.code === 'over_email_send_rate_limit' || (err.message && err.message.toLowerCase().includes('rate limit'))) {
          displayMsg = "Limite d'envoi d'emails de confirmation dépassée par Supabase. Veuillez désactiver l'option 'Confirm email' dans la console Supabase (Auth > Providers > Email) ou configurer un service SMTP.";
        } else if (err.code === 'user_already_exists' || (err.message && err.message.toLowerCase().includes('already registered'))) {
          displayMsg = "Cette adresse email est déjà enregistrée. Veuillez utiliser une autre adresse ou vous connecter.";
        } else if (err.code === 'weak_password') {
          displayMsg = "Le mot de passe choisi est trop faible. Veuillez choisir un mot de passe plus complexe.";
        } else if (err.code === 'email_address_invalid') {
          displayMsg = "L'adresse email saisie est invalide ou non autorisée.";
        }
        setErrorMsg(displayMsg);
        setIsLoading(false);
        return;
      }
      
      // Local Fallback Mode (only when completely offline or server unreachable)
      const offlineEtabId = crypto.randomUUID();
      const offlineYearId = crypto.randomUUID();
      localStorage.setItem('mboaschool_current_school', schoolName);
      localStorage.setItem('mboaschool_current_year', schoolYear);
      localStorage.setItem('mboaschool_active_year_id', offlineYearId);
      localStorage.setItem('mboaschool_subscription', selectedPlan);
      localStorage.setItem('mboaschool_etablissement_id', offlineEtabId);

      // Pre-populate offline cache for annees_scolaires so that academic years list and student dropdowns are happy
      const mockYear = { id: offlineYearId, nom: schoolYear, etablissement_id: offlineEtabId };
      localStorage.setItem('offline_cache_annees_scolaires', JSON.stringify([mockYear]));

      // Update local profiles list so they can log back in
      const storedProfiles = localStorage.getItem('mboaschool_profiles');
      let profilesList = [];
      if (storedProfiles) {
        try {
          profilesList = JSON.parse(storedProfiles);
        } catch (e) {
          profilesList = [];
        }
      }
      if (!profilesList.find((p: any) => p.email === email)) {
        profilesList.push({
          id: `offline-${Date.now()}`,
          email: email,
          password: password,
          role: 'admin',
          school: schoolName,
          etablissement_id: offlineEtabId,
          created_at: new Date().toISOString()
        });
        localStorage.setItem('mboaschool_profiles', JSON.stringify(profilesList));
      }
      
      // Simulate active offline profile session
      localStorage.setItem('mboaschool_offline_session', JSON.stringify({
        email,
        role: 'admin',
        school: schoolName
      }));

      // Set cookie so middleware lets us access /dashboard
      document.cookie = "mboaschool_offline_session=true; path=/; max-age=86400";

      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const getPlanPrice = (plan: 'Basic' | 'Standard' | 'Premium') => {
    if (plan === 'Basic') return '25 000 FCFA';
    if (plan === 'Standard') return '50 000 FCFA';
    return '100 000 FCFA';
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden text-slate-100">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[60%] rounded-full bg-emerald-500/10 blur-[150px] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <span className="text-5xl">🏫</span>
        <h2 className="mt-4 text-3xl font-black text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
          MboaSchool
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Système de Gestion Scolaire Intégré
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10 px-4">
        <div className="bg-slate-900/80 backdrop-blur-md py-8 px-6 border border-slate-800 shadow-2xl rounded-3xl sm:px-10">
          
          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3.5 rounded-xl text-xs font-semibold flex items-center gap-3 mb-6">
              <span className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center font-bold">!</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {isOffline ? (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-3.5 rounded-xl text-xs font-semibold mb-6">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">💻 Mode Hors-ligne / Local actif</span>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('mboaschool_force_offline', 'false');
                    setIsOffline(!navigator.onLine);
                  }}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700 font-bold transition-all cursor-pointer"
                >
                  Passer en ligne
                </button>
              </div>
              <p className="text-[11px] text-slate-400 font-normal mt-2 leading-relaxed">
                Connexion avec vos identifiants habituels (déjà connectés sur cet appareil) ou le compte démo :
                <strong className="text-amber-300 ml-1">admin@mboaschool.com</strong>.
              </p>
            </div>
          ) : (
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('mboaschool_force_offline', 'true');
                  setIsOffline(true);
                }}
                className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-all cursor-pointer"
              >
                <span>🌐 Travailler hors-ligne (mode local)</span>
              </button>
            </div>
          )}

          {/* LOGIN VIEW */}
          {!isSignUp && (
            <form className="space-y-6" onSubmit={handleLogin}>
              <div className="border-b border-slate-800 pb-4 mb-4 flex justify-between items-center">
                <h3 className="text-xl font-extrabold text-white">Connexion</h3>
                <button 
                  type="button" 
                  onClick={() => { setIsSignUp(true); setSignupStep(1); }} 
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300"
                >
                  S'inscrire à la plateforme →
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Adresse Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="directeur@mboaschool.com"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mot de passe</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center disabled:opacity-50"
              >
                {isLoading ? "Vérification..." : "Se connecter"}
              </button>
            </form>
          )}

          {/* SIGNUP VIEW */}
          {isSignUp && (
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                <div>
                  <h3 className="text-xl font-extrabold text-white">Créer mon espace</h3>
                  <p className="text-xs text-slate-500 mt-1">Création de votre compte établissement</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsSignUp(false)} 
                  className="text-xs font-bold text-slate-400 hover:text-white"
                >
                  Se connecter
                </button>
              </div>

              <form onSubmit={handleFinalSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nom de l'Établissement *</label>
                  <input
                    type="text"
                    required
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Ex: Collège Vogt, Lycée de Douala"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Adresse Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@mboaschool.com"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Créer un Mot de passe *</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 caractères"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center disabled:opacity-50"
                >
                  {isLoading ? "Création de l'Espace..." : "Finaliser et ouvrir mon Dashboard →"}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Chargement...</div>}>
      <LoginContent />
    </Suspense>
  );
}
