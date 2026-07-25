import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // JAMAIS de cache pour les réponses Supabase : la dernière règle de
    // defaultCache capture tout le cross-origin en NetworkFirst (1 h sur
    // disque), or les réponses PostgREST contiennent l'identité des élèves,
    // les coordonnées des parents et l'historique des paiements — et le JWT ne
    // fait pas partie de la clé de cache (pas de Vary: Authorization). Sur un
    // poste partagé, couper le réseau suffisait à relire ces données sans
    // session. Cette règle doit rester AVANT defaultCache : première règle qui
    // matche gagne.
    {
      matcher: ({ url }) =>
        url.hostname.endsWith(".supabase.co") || url.hostname.endsWith(".supabase.in"),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
