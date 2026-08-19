'use client';

import React, { useState, useEffect } from 'react';

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      getVersion: () => Promise<string>;
      checkForUpdates: () => Promise<any>;
      quitAndInstall: () => Promise<void>;
      onUpdateStatus: (callback: (data: { status: string; version?: string; percent?: number; error?: string; message?: string }) => void) => () => void;
    };
  }
}

export default function AppUpdateCard() {
  const [isElectron, setIsElectron] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('0.1.0');
  const [checking, setChecking] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [downloadPercent, setDownloadPercent] = useState<number | null>(null);
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const electronAvailable = Boolean(window.electronAPI && window.electronAPI.isElectron);
      setIsElectron(electronAvailable);

      if (electronAvailable && window.electronAPI) {
        window.electronAPI.getVersion().then((v) => {
          if (v) setCurrentVersion(v);
        }).catch(() => {});

        const unsubscribe = window.electronAPI.onUpdateStatus((data) => {
          setChecking(false);
          if (data.status === 'checking') {
            setChecking(true);
            setUpdateStatus('Vérification des mises à jour en cours...');
          } else if (data.status === 'available') {
            setUpdateStatus(`Nouvelle version v${data.version} disponible ! Téléchargement en cours...`);
            if (data.version) setNewVersion(data.version);
          } else if (data.status === 'not-available') {
            setUpdateStatus('Votre application est à jour. Aucune mise à jour disponible.');
          } else if (data.status === 'downloading') {
            if (typeof data.percent === 'number') {
              setDownloadPercent(data.percent);
              setUpdateStatus(`Téléchargement de la mise à jour : ${data.percent}%`);
            }
          } else if (data.status === 'downloaded') {
            setDownloadPercent(100);
            setUpdateStatus(`Mise à jour v${data.version || ''} prête à être installée !`);
            if (data.version) setNewVersion(data.version);
          } else if (data.status === 'error') {
            setErrorMessage(data.error || 'Erreur lors de la vérification.');
            setUpdateStatus(null);
          }
        });

        return () => {
          unsubscribe();
        };
      }
    }
  }, []);

  const handleCheckForUpdates = async () => {
    setChecking(true);
    setErrorMessage(null);
    setUpdateStatus('Recherche des mises à jour...');
    setDownloadPercent(null);

    if (isElectron && window.electronAPI) {
      try {
        const res = await window.electronAPI.checkForUpdates();
        if (res && res.status === 'dev-mode') {
          setChecking(false);
          setUpdateStatus(res.message || 'Mode développement actif. Mises à jour disponibles dans la version installée.');
        }
      } catch (err: any) {
        setChecking(false);
        setErrorMessage(err.message || 'Impossible de vérifier les mises à jour.');
        setUpdateStatus(null);
      }
    } else {
      // PWA / Web Browser mode
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await reg.update();
            if (reg.waiting) {
              setUpdateStatus('Nouvelle version web prête ! Cliquez pour actualiser.');
              setNewVersion('Web');
            } else {
              setUpdateStatus('Application web à jour. Dernière version en ligne chargée.');
            }
          } else {
            setUpdateStatus('Application web connectée et synchronisée en temps réel.');
          }
        } catch (e: any) {
          setUpdateStatus('Vérification effectuée. L\'application web est à jour.');
        }
      } else {
        setUpdateStatus('Votre navigateur charge toujours la version en ligne la plus récente.');
      }
      setChecking(false);
    }
  };

  const handleApplyUpdate = () => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.quitAndInstall();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="bg-surface p-6 rounded-card border border-border shadow-sm space-y-4">
      <h3 className="text-base font-bold text-ink border-b border-border pb-3 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Mises à jour & Version du Setup
        </span>
        <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full ${
          isElectron ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-green/10 text-green border border-green/20'
        }`}>
          {isElectron ? '🖥️ Desktop (Setup Windows)' : '🌐 Web SaaS & PWA'}
        </span>
      </h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs p-3 bg-bg border border-border rounded-control">
          <div>
            <span className="text-ink-soft block text-[11px] font-semibold">Version installée</span>
            <span className="text-ink font-bold font-mono text-sm">v{currentVersion}</span>
          </div>
          <div>
            <span className="text-ink-soft block text-[11px] font-semibold">Canal de mise à jour</span>
            <span className="text-accent font-bold text-xs">Production (GitHub Releases)</span>
          </div>
        </div>

        {downloadPercent !== null && (
          <div className="space-y-1.5 p-3 bg-bg border border-border rounded-control">
            <div className="flex justify-between text-xs font-bold text-ink">
              <span>Téléchargement de la mise à jour...</span>
              <span className="font-mono">{downloadPercent}%</span>
            </div>
            <div className="w-full bg-border h-2 rounded-full overflow-hidden">
              <div
                className="bg-accent h-full transition-all duration-300 rounded-full"
                style={{ width: `${downloadPercent}%` }}
              />
            </div>
          </div>
        )}

        {updateStatus && (
          <div className="p-3 bg-accent/5 border border-accent/20 rounded-control text-xs text-ink font-semibold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>{updateStatus}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-bg border border-red-500/20 rounded-control text-xs text-accent font-semibold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent shrink-0">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={handleCheckForUpdates}
            disabled={checking}
            className="flex-1 py-2.5 bg-ink hover:bg-ink/90 text-cream rounded-control text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={checking ? 'animate-spin' : ''}>
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            {checking ? 'Recherche en cours...' : 'Rechercher les mises à jour'}
          </button>

          {(downloadPercent === 100 || (newVersion && !isElectron)) && (
            <button
              type="button"
              onClick={handleApplyUpdate}
              className="py-2.5 px-4 bg-green hover:bg-green/90 text-cream rounded-control text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Installer & Redémarrer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
