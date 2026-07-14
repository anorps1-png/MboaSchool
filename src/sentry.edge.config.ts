import * as Sentry from '@sentry/nextjs';
import { setErrorReporter, setMessageReporter } from '@/lib/observability/logger';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
  });

  setErrorReporter((error, context) => Sentry.captureException(error, { extra: context }));
  setMessageReporter((message, context) => Sentry.captureMessage(message, { extra: context }));
}
