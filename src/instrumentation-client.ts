import * as Sentry from '@sentry/nextjs';
import { setErrorReporter, setMessageReporter } from '@/lib/observability/logger';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    // Session Replay désactivé par défaut pour limiter le poids du bundle ;
    // à activer explicitement si besoin.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    environment: process.env.NODE_ENV,
  });

  setErrorReporter((error, context) => Sentry.captureException(error, { extra: context }));
  setMessageReporter((message, context) => Sentry.captureMessage(message, { extra: context }));
}

// Suivi des transitions de navigation (App Router). Inerte si Sentry non initialisé.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
