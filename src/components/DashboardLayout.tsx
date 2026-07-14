'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SyncManager from '@/lib/syncManager';
import { useEtablissement } from '@/contexts/etablissement-context';
import {
  DashboardIcon,
  StudentsIcon,
  TeachersIcon,
  FeesIcon,
  TimetableIcon,
  SearchIcon,
  NotificationIcon,
  ChevronDownIcon,
  AcademicIcon,
  UsersIcon,
  ChartIcon,
  SettingsIcon
} from './icons';

import { createClient } from '@/lib/supabase/client';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { etablissementId, setEtablissementId, academicYear, setAcademicYear, academicYearId, setAcademicYearId } = useEtablissement();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('admin@mboaschool.com');
  const [userRole, setUserRole] = useState('Administrateur');
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean> | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [forceOffline, setForceOffline] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isElectron, setIsElectron] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isEl = window.navigator.userAgent.toLowerCase().includes('electron') || 
                   !!(window as any).process?.versions?.electron;
      setIsElectron(isEl);
      
      // Seed database if empty and initialize offline settings
      const initLocalDb = async () => {
        try {
          const { mockStudents } = await import('@/mock/students');
          const { mockPersonnel, mockFormations } = await import('@/mock/rh');
          const { planComptableOHADA, mockEcrituresInitiales } = await import('@/mock/comptabilite');
          
          const seedData = {
            eleves: mockStudents,
            membres_personnel: mockPersonnel,
            formations_rh: mockFormations,
            comptes_ohada: planComptableOHADA,
            ecritures_comptables: mockEcrituresInitiales,
            etablissements: [{
              id: 'd3b07384-d113-4ee7-a496-c67b8a74e50d',
              nom: 'École Privée Bilingue Mboa',
              annee_scolaire_active_id: 'active-year-uuid-2026'
            }],
            annees_scolaires: [{
              id: 'active-year-uuid-2026',
              nom: '2025/2026',
              etablissement_id: 'd3b07384-d113-4ee7-a496-c67b8a74e50d'
            }],
            profiles: [{
              id: 'local-admin-id',
              role: 'admin',
              etablissement_id: 'd3b07384-d113-4ee7-a496-c67b8a74e50d',
              nom_complet: 'Administrateur Local',
              permissions: {}
            }]
          };

          await fetch('/api/local-db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'init',
              payload: seedData
            })
          });
        } catch (e) {
          console.error("Failed to seed local database:", e);
        }
      };

      if (isEl) {
        initLocalDb();
      }

      const storedForceOffline = localStorage.getItem('mboaschool_force_offline');
      let initForceOffline = false;
      if (storedForceOffline !== null && isEl) {
        initForceOffline = storedForceOffline === 'true';
      } else {
        initForceOffline = false;
        localStorage.setItem('mboaschool_force_offline', 'false');
      }
      
      setForceOffline(initForceOffline);
      (window as any).__forceOffline = initForceOffline;
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleUpdate = () => setRefreshTrigger(prev => prev + 1);
      window.addEventListener('school_settings_updated', handleUpdate);
      return () => window.removeEventListener('school_settings_updated', handleUpdate);
    }
  }, []);

  const toggleForceOffline = () => {
    const newVal = !forceOffline;
    setForceOffline(newVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mboaschool_force_offline', String(newVal));
    }
  };

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatusMsg('Synchronisation...');
    
    try {
      const res = await fetch('/api/local-db?action=get-queue');
      const data = await res.json();
      const queue = data.queue || [];
      
      if (queue.length === 0) {
        setSyncStatusMsg('Déjà à jour !');
        setTimeout(() => setSyncStatusMsg(''), 2500);
        setIsSyncing(false);
        return;
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
      const { createBrowserClient } = await import('@supabase/ssr');
      const onlineClient = createBrowserClient(supabaseUrl, supabaseKey);

      let successCount = 0;
      for (const task of queue) {
        const { id, table, action, payload, filters } = task;
        const queryBuilder = onlineClient.from(table);
        let result: any = null;

        if (action === 'insert') {
          result = await queryBuilder.insert(payload);
        } else if (action === 'update') {
          let builder: any = queryBuilder.update(payload);
          if (filters && Array.isArray(filters)) {
            for (const filter of filters) {
              builder = builder.eq(filter.field, filter.value);
            }
          }
          result = await builder;
        } else if (action === 'delete') {
          let builder: any = queryBuilder.delete();
          if (filters && Array.isArray(filters)) {
            for (const filter of filters) {
              builder = builder.eq(filter.field, filter.value);
            }
          }
          result = await builder;
        }

        if (!result.error) {
          successCount++;
          await fetch('/api/local-db', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: id })
          });
        } else {
          console.error(`Sync error on table ${table}:`, result.error);
        }
      }

      setSyncStatusMsg(`${successCount}/${queue.length} synchronisés !`);
      setTimeout(() => setSyncStatusMsg(''), 3000);
    } catch (e: any) {
      console.error("Sync failed:", e);
      setSyncStatusMsg('Erreur de synchronisation.');
      setTimeout(() => setSyncStatusMsg(''), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error signing out:", err);
    }
    // Always clear cookies & local storage
    document.cookie = "mboaschool_offline_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    localStorage.removeItem('mboaschool_offline_session');
    setEtablissementId(null);
    window.location.href = '/login';
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loadProfileAndSchool = async () => {
        try {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();

          if (user) {
            setUserEmail(user.email || '');
            
            // Get profile details
            const { data: profile } = await supabase
              .from('profiles')
              .select('role, etablissement_id, permissions')
              .eq('id', user.id)
              .single();

            if (profile) {
              setUserRole(profile.role === 'admin' ? 'Administrateur' : profile.role);
              if (profile.permissions) {
                setUserPermissions(profile.permissions);
              }
              
              // Synchronize database etablissement_id with context/localStorage
              if (profile.etablissement_id && profile.etablissement_id !== etablissementId) {
                setEtablissementId(profile.etablissement_id);
              }
              
              // Get establishment details
              if (profile.etablissement_id) {
                const { data: etab } = await supabase
                  .from('etablissements')
                  .select('nom, annee_scolaire_active_id')
                  .eq('id', profile.etablissement_id)
                  .single();

                if (etab) {
                  setSelectedSchool(etab.nom);
                  localStorage.setItem('mboaschool_current_school', etab.nom);
                  
                  let activeYearId = etab.annee_scolaire_active_id;
                  
                  // Fallback: If no active year is set in the establishment, query the first school year from the database
                  if (!activeYearId && profile.etablissement_id) {
                    const { data: years } = await supabase
                      .from('annees_scolaires')
                      .select('id')
                      .eq('etablissement_id', profile.etablissement_id)
                      .limit(1);
                    if (years && years.length > 0) {
                      activeYearId = years[0].id;
                    }
                  }

                  if (activeYearId) {
                    setAcademicYearId(activeYearId);
                    const { data: annee } = await supabase
                      .from('annees_scolaires')
                      .select('nom')
                      .eq('id', activeYearId)
                      .single();

                    if (annee) {
                      setAcademicYear(annee.nom);
                      localStorage.setItem('mboaschool_current_year', annee.nom);
                    }
                  }
                }
              }
            }
          }
        } catch (err) {
          console.warn("Could not load dynamic user context from Supabase, loading fallbacks", err);
        }

        // Check local storage fallbacks only if we don't have DB values yet
        const localSchool = localStorage.getItem('mboaschool_current_school');
        const localYear = localStorage.getItem('mboaschool_current_year');
        const localSub = localStorage.getItem('mboaschool_subscription');
        const offlineSession = localStorage.getItem('mboaschool_offline_session');

        if (!selectedSchool && localSchool) setSelectedSchool(localSchool);
        if (!academicYear && localYear) setAcademicYear(localYear);
        if (localSub) setSubscriptionPlan(localSub);
        
        let localActiveYearId = localStorage.getItem('mboaschool_active_year_id');
        const activeYearVal = localYear || academicYear;
        if (!localActiveYearId && activeYearVal) {
          localActiveYearId = typeof crypto !== 'undefined' ? crypto.randomUUID() : `local_year_${Date.now()}`;
          setAcademicYearId(localActiveYearId);
          
          const storedYears = localStorage.getItem('offline_cache_annees_scolaires');
          if (!storedYears) {
            const mockYear = { 
              id: localActiveYearId, 
              nom: activeYearVal, 
              etablissement_id: localStorage.getItem('mboaschool_etablissement_id') || 'd3b07384-d113-4ee7-a496-c67b8a74e50d'
            };
            localStorage.setItem('offline_cache_annees_scolaires', JSON.stringify([mockYear]));
          }
        }
        
        if (offlineSession) {
          try {
            const parsed = JSON.parse(offlineSession);
            if (parsed.email) setUserEmail(parsed.email);
            if (parsed.role) setUserRole(parsed.role === 'admin' ? 'Administrateur' : parsed.role);
            if (parsed.permissions) setUserPermissions(parsed.permissions);
          } catch (e) {
            console.warn("Failed parsing offline session", e);
          }
        }
      };

      loadProfileAndSchool();
    }
  }, [refreshTrigger]);

  const [availableYears, setAvailableYears] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && etablissementId) {
      const fetchYears = async () => {
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from('annees_scolaires')
            .select('*')
            .eq('etablissement_id', etablissementId)
            .order('nom', { ascending: false });

          if (!error && data && data.length > 0) {
            setAvailableYears(data);
            
            const currentYear = localStorage.getItem('mboaschool_current_year') || academicYear;
            const currentYearId = localStorage.getItem('mboaschool_active_year_id') || academicYearId;
            const match = data.find(y => y.nom === currentYear || y.id === currentYearId);
            if (match) {
              if (academicYear !== match.nom) setAcademicYear(match.nom);
              if (academicYearId !== match.id) setAcademicYearId(match.id);
            } else {
              setAcademicYear(data[0].nom);
              setAcademicYearId(data[0].id);
            }
          } else {
            const stored = localStorage.getItem('offline_cache_annees_scolaires');
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setAvailableYears(parsed);
                const match = parsed.find(y => y.nom === academicYear || y.id === academicYearId);
                if (match) {
                  if (academicYear !== match.nom) setAcademicYear(match.nom);
                  if (academicYearId !== match.id) setAcademicYearId(match.id);
                } else {
                  setAcademicYear(parsed[0].nom);
                  setAcademicYearId(parsed[0].id);
                }
              }
            }
          }
        } catch (e) {
          console.warn("Error fetching years in DashboardLayout:", e);
        }
      };

      fetchYears();

      window.addEventListener('school_settings_updated', fetchYears);
      window.addEventListener('academic_year_changed', fetchYears);
      return () => {
        window.removeEventListener('school_settings_updated', fetchYears);
        window.removeEventListener('academic_year_changed', fetchYears);
      };
    }
  }, [etablissementId, refreshTrigger]);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleOnline = () => {
        if (!forceOffline) {
          setIsOnline(true);
        }
      };
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Check initial state
      if (!forceOffline) {
        setIsOnline(navigator.onLine);
      } else {
        setIsOnline(false);
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [forceOffline]);

  // Intercept the global navigator.onLine for our components
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Pour les tests, on injecte une variable globale que les autres pages peuvent lire
      (window as any).__forceOffline = forceOffline;
    }
  }, [forceOffline]);

  // BYPASS POUR LA LANDING PAGE
  if (pathname === '/') {
    return <>{children}</>;
  }


  const menuItems = [
    { name: 'Tableau de bord', href: '/dashboard', icon: DashboardIcon, key: 'dashboard' },
    { name: 'Sections', href: '/sections', icon: DashboardIcon, key: 'sections' },
    { name: 'Classes', href: '/classes', icon: StudentsIcon, key: 'classes' },
    { name: 'Élèves', href: '/eleves', icon: StudentsIcon, key: 'eleves' },
    { name: 'Communauté & QHSE', href: '/parents', icon: UsersIcon, key: 'parents' },
    { name: 'Enseignants', href: '/enseignants', icon: TeachersIcon, key: 'enseignants' },
    { name: 'Évaluations', href: '/evaluations', icon: AcademicIcon, key: 'evaluations' },
    { name: 'Finance', href: '/finance', icon: ChartIcon, key: 'finance' },
    { name: 'Ressources Humaines', href: '/rh', icon: UsersIcon, key: 'rh' },
    { name: 'Paramètres', href: '/settings', icon: SettingsIcon, key: 'settings' },
  ];

  const roleLower = userRole.toLowerCase();

  const filteredMenuItems = menuItems.filter(item => {
    if (roleLower === 'admin' || roleLower === 'administrateur') {
      return true;
    }

    // Check custom permissions first if available
    if (userPermissions && Object.keys(userPermissions).length > 0) {
      if (item.key === 'dashboard') return true;
      if (userPermissions[item.key] !== undefined) {
        return userPermissions[item.key];
      }
    }

    // Fallback role defaults
    if (roleLower === 'directeur') {
      return true;
    }
    if (roleLower === 'enseignant') {
      return ['/dashboard', '/classes', '/eleves', '/evaluations'].includes(item.href);
    }
    if (roleLower === 'parent') {
      return ['/dashboard', '/eleves', '/parents'].includes(item.href);
    }
    return item.href === '/dashboard';
  });

  const isAuthorized = (href: string) => {
    if (roleLower === 'admin' || roleLower === 'administrateur') {
      return true;
    }

    // Check custom permissions first if available
    if (userPermissions && Object.keys(userPermissions).length > 0) {
      if (href === '/dashboard') return true;
      const matched = menuItems.find(item => href === item.href || href.startsWith(item.href + '/'));
      if (matched && userPermissions[matched.key] !== undefined) {
        return userPermissions[matched.key];
      }
    }

    // Fallback role defaults
    if (roleLower === 'directeur') {
      return true;
    }
    if (roleLower === 'enseignant') {
      return ['/dashboard', '/classes', '/eleves', '/evaluations'].some(path => href === path || href.startsWith(path + '/'));
    }
    if (roleLower === 'parent') {
      return ['/dashboard', '/eleves', '/parents'].some(path => href === path || href.startsWith(path + '/'));
    }
    return href === '/dashboard';
  };

  const notifications = [
    { id: 1, text: "Nouveau paiement de 150 000 FCFA reçu pour Jean-Pierre Fouda", time: "Il y a 10 min", unread: true },
    { id: 2, text: "Emploi du temps de la classe Seconde C mis à jour", time: "Il y a 1 heure", unread: true },
    { id: 3, text: "Inscription de Christian Bassogog complétée", time: "Il y a 3 heures", unread: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Offline/Local Banner */}
      {isElectron && !isOnline && (
        <div className={`${forceOffline ? 'bg-amber-600' : 'bg-red-500'} text-white text-xs font-bold text-center py-1.5 px-4 shadow-md z-50 transition-colors duration-300`}>
          {forceOffline ? (
            <span>💻 Base de données locale active sur cette machine. Cliquez sur "Synchroniser Cloud" en bas de la barre latérale pour mettre à jour Supabase.</span>
          ) : (
            <span>⚠️ Mode Hors-ligne : Aucune connexion internet. Les données sont lues et écrites sur le disque local de cette machine.</span>
          )}
        </div>
      )}

      {/* Configuration Warning Banner */}
      {(typeof window !== 'undefined' && 
        (!process.env.NEXT_PUBLIC_SUPABASE_URL || 
         process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'))) && (
        <div className="bg-amber-600 text-white text-xs font-bold text-center py-2.5 px-4 shadow-md z-50 flex items-center justify-center gap-2">
          <span>⚠️</span>
          <span>
            <strong>Configuration incomplète :</strong> Les variables d'environnement Supabase (URL / Clé) ne sont pas configurées sur Vercel. Veuillez ajouter <code>NEXT_PUBLIC_SUPABASE_URL</code> et <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> dans les paramètres d'environnement de votre projet Vercel et redéployer.
          </span>
        </div>
      )}

      {/* Mobile Top Bar */}
      <header className="lg:hidden bg-indigo-900 text-white flex items-center justify-between px-4 py-3 shadow-md sticky top-0 z-40">
        <div className="flex items-center gap-2">
          {/* Cameroon Flag Colors Icon */}
          <div className="flex h-6 w-8 rounded overflow-hidden shadow">
            <div className="bg-emerald-600 w-1/3 h-full"></div>
            <div className="bg-red-600 w-1/3 h-full flex items-center justify-center relative">
              <span className="text-[6px] text-yellow-400">★</span>
            </div>
            <div className="bg-yellow-400 w-1/3 h-full"></div>
          </div>
          <span className="font-bold text-lg tracking-tight">MboaSchool</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1 rounded-md hover:bg-indigo-800 focus:outline-none"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      <div className="flex flex-1 relative">
        {/* Sidebar Container */}
        <aside
          className={`
            fixed inset-y-0 left-0 transform lg:translate-x-0 lg:static lg:flex
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            transition-transform duration-300 ease-in-out
            w-64 bg-slate-900 text-slate-100 flex-col z-50 shadow-xl lg:shadow-none
            lg:h-auto h-screen top-0
          `}
        >
          {/* Sidebar Header */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 bg-slate-950">
            <div className="flex h-7 w-10 rounded overflow-hidden shadow">
              <div className="bg-emerald-600 w-1/3 h-full"></div>
              <div className="bg-red-600 w-1/3 h-full flex items-center justify-center relative">
                <span className="text-[8px] text-yellow-400">★</span>
              </div>
              <div className="bg-yellow-400 w-1/3 h-full"></div>
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">MboaSchool</span>
            </div>
          </div>

          {/* Sidebar Menu */}
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              // Check if pathname starts with item.href to keep active subroutes
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30 font-semibold translate-x-1'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-white hover:translate-x-1'
                    }
                  `}
                >
                  <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm uppercase">
                  {userEmail ? userEmail.substring(0, 2) : 'AD'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate" title={userEmail}>{userEmail}</p>
                  <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider">{userRole}</p>
                </div>
                {isElectron && (
                  <button
                    type="button"
                    onClick={toggleForceOffline}
                    title={forceOffline ? "Mode local actif. Cliquez pour basculer en ligne." : "Mode connecté actif. Cliquez pour forcer le mode local."}
                    className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold tracking-wide uppercase transition-all duration-200 cursor-pointer"
                  >
                    <span>{forceOffline ? 'Local' : (isOnline ? 'En ligne' : 'Déconnecté')}</span>
                    <div className={`w-2 h-2 rounded-full ${
                      forceOffline ? 'bg-amber-500 animate-pulse' : (isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500')
                    }`}></div>
                  </button>
                )}
              </div>

              {isElectron && (
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                  <span>{syncStatusMsg || 'Synchroniser Cloud'}</span>
                </button>
              )}

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-rose-950/20 hover:border-rose-900/50 hover:text-rose-400 text-slate-400 rounded-xl text-xs font-bold transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                <span>Se déconnecter</span>
              </button>
            </div>
        </aside>

        {/* Mobile Menu Backdrop */}
        {isMobileMenuOpen && (
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          ></div>
        )}

        {/* Main Work Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="hidden lg:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8 sticky top-0 z-30">
            {/* Left section: Etablissement, Année & Abonnement */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                <span>{selectedSchool}</span>
              </div>
              <div className="relative">
                <select
                  value={academicYear}
                  onChange={(e) => {
                    const selectedYearNom = e.target.value;
                    const matched = availableYears.find(y => y.nom === selectedYearNom);
                    if (matched) {
                      setAcademicYear(matched.nom);
                      setAcademicYearId(matched.id);
                    } else {
                      setAcademicYear(selectedYearNom);
                    }
                  }}
                  className="appearance-none bg-slate-50 border border-slate-200 pl-3 pr-8 py-1.5 rounded-lg text-sm font-medium text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-black"
                >
                  {availableYears.length === 0 ? (
                    <option value={academicYear}>Année {academicYear || 'Non spécifiée'}</option>
                  ) : (
                    availableYears.map(y => (
                      <option key={y.id} value={y.nom}>Année {y.nom}</option>
                    ))
                  )}
                </select>
                <ChevronDownIcon size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
              </div>
              {subscriptionPlan && (
                <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                  <span>Forfait {subscriptionPlan}</span>
                </div>
              )}
            </div>

            {/* Right section: Search, Notify, Profile */}
            <div className="flex items-center gap-4">
              {/* Search Bar */}
              <div className="relative w-64">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <SearchIcon size={16} />
                </span>
                <input
                  type="text"
                  placeholder="Rechercher élève, enseignant..."
                  className="w-full bg-slate-50 border border-slate-200 pl-9 pr-4 py-1.5 rounded-lg text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-black"
                />
              </div>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors relative"
                >
                  <NotificationIcon size={20} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)}></div>
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-40 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-xl">
                        <span className="text-xs font-semibold text-slate-800">Notifications</span>
                        <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-semibold">2 Nouvelles</span>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.map((n) => (
                          <div key={n.id} className={`px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 cursor-pointer transition-colors ${n.unread ? 'bg-indigo-50/30' : ''}`}>
                            <p className="text-xs text-slate-700 leading-relaxed">{n.text}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Cameroon Flag Decorative */}
              <div className="flex h-5 w-7 rounded overflow-hidden shadow border border-slate-200">
                <div className="bg-emerald-600 w-1/3 h-full"></div>
                <div className="bg-red-600 w-1/3 h-full flex items-center justify-center relative">
                  <span className="text-[5px] text-yellow-400">★</span>
                </div>
                <div className="bg-yellow-400 w-1/3 h-full"></div>
              </div>
            </div>
          </header>

          {/* Children Content */}
          <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
            {isAuthorized(pathname) ? (
              children
            ) : (
              <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center max-w-md mx-auto mt-20">
                <span className="text-5xl">🔒</span>
                <h2 className="text-xl font-bold text-slate-800 mt-4">Accès Restreint</h2>
                <p className="text-sm text-slate-500 mt-2">
                  Vous n'avez pas les habilitations nécessaires pour accéder à la rubrique <strong>{pathname}</strong>.
                </p>
                <Link href="/dashboard" className="mt-6 inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md transition-all">
                  Retour au Tableau de bord
                </Link>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
