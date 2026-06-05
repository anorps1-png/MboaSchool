'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SyncManager from '@/lib/syncManager';
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
  ChartIcon
} from './icons';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [academicYear, setAcademicYear] = useState('2025/2026');
  const [selectedSchool, setSelectedSchool] = useState('Collège Vogt - Yaoundé');
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('admin@mboaschool.com');
  const [userRole, setUserRole] = useState('Administrateur');
  const [showNotifications, setShowNotifications] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [forceOffline, setForceOffline] = useState(false);

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
              .select('role, etablissement_id')
              .eq('id', user.id)
              .single();

            if (profile) {
              setUserRole(profile.role === 'admin' ? 'Administrateur' : profile.role);
              
              // Get establishment details
              if (profile.etablissement_id) {
                const { data: etab } = await supabase
                  .from('etablissements')
                  .select('nom, annee_scolaire_active_id')
                  .eq('id', profile.etablissement_id)
                  .single();

                if (etab) {
                  setSelectedSchool(etab.nom);
                  
                  if (etab.annee_scolaire_active_id) {
                    const { data: annee } = await supabase
                      .from('annees_scolaires')
                      .select('nom')
                      .eq('id', etab.annee_scolaire_active_id)
                      .single();

                    if (annee) {
                      setAcademicYear(annee.nom);
                    }
                  }
                }
              }
            }
          }
        } catch (err) {
          console.warn("Could not load dynamic user context from Supabase, loading fallbacks", err);
        }

        // Always check local storage fallbacks
        const localSchool = localStorage.getItem('mboaschool_current_school');
        const localYear = localStorage.getItem('mboaschool_current_year');
        const localSub = localStorage.getItem('mboaschool_subscription');
        const offlineSession = localStorage.getItem('mboaschool_offline_session');

        if (localSchool) setSelectedSchool(localSchool);
        if (localYear) setAcademicYear(localYear);
        if (localSub) setSubscriptionPlan(localSub);
        
        if (offlineSession) {
          try {
            const parsed = JSON.parse(offlineSession);
            if (parsed.email) setUserEmail(parsed.email);
            if (parsed.role) setUserRole(parsed.role === 'admin' ? 'Administrateur' : parsed.role);
          } catch (e) {
            console.warn("Failed parsing offline session", e);
          }
        }
      };

      loadProfileAndSchool();
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleOnline = () => {
        if (!forceOffline) {
          setIsOnline(true);
          SyncManager.syncAll();
        }
      };
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Check initial state
      if (!forceOffline) {
        setIsOnline(navigator.onLine);
        if (navigator.onLine) {
          SyncManager.syncAll();
        }
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
    { name: 'Tableau de bord', href: '/dashboard', icon: DashboardIcon },
    { name: 'Sections', href: '/sections', icon: DashboardIcon },
    { name: 'Classes', href: '/classes', icon: StudentsIcon },
    { name: 'Élèves', href: '/eleves', icon: StudentsIcon },
    { name: 'Communauté & QHSE', href: '/parents', icon: UsersIcon },
    { name: 'Enseignants', href: '/enseignants', icon: TeachersIcon },
    { name: 'Évaluations', href: '/evaluations', icon: AcademicIcon },
    { name: 'Finance', href: '/finance', icon: ChartIcon },
    { name: 'Ressources Humaines', href: '/rh', icon: UsersIcon },
  ];

  const notifications = [
    { id: 1, text: "Nouveau paiement de 150 000 FCFA reçu pour Jean-Pierre Fouda", time: "Il y a 10 min", unread: true },
    { id: 2, text: "Emploi du temps de la classe Seconde C mis à jour", time: "Il y a 1 heure", unread: true },
    { id: 3, text: "Inscription de Christian Bassogog complétée", time: "Il y a 3 heures", unread: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-red-500 text-white text-xs font-bold text-center py-1.5 px-4 shadow-md z-50">
          ⚠️ Mode Hors-ligne : Aucune connexion internet. Vos actions seront enregistrées et synchronisées automatiquement à la reconnexion.
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
            {menuItems.map((item) => {
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
          <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm uppercase">
              {userEmail ? userEmail.substring(0, 2) : 'AD'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate" title={userEmail}>{userEmail}</p>
              <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider">{userRole}</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-slate-400 cursor-pointer flex items-center gap-1" title="Simuler le mode hors-ligne">
                <input 
                  type="checkbox" 
                  checked={forceOffline} 
                  onChange={(e) => setForceOffline(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800"
                />
                Offline
              </label>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
            </div>
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
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 pl-3 pr-8 py-1.5 rounded-lg text-sm font-medium text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-black"
                >
                  <option value={academicYear}>Année {academicYear}</option>
                  {academicYear !== '2025/2026' && <option value="2025/2026">Année 2025/2026</option>}
                  {academicYear !== '2024/2025' && <option value="2024/2025">Année 2024/2025</option>}
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
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
