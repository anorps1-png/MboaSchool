/**
 * Reporting d'erreurs agnostique.
 *
 * Ce module ne dépend d'AUCUN fournisseur (Sentry ou autre). Il journalise
 * toujours de façon structurée dans la console, et transmet en plus l'erreur à
 * un « reporter » externe SI un est enregistré via setErrorReporter().
 *
 * L'intégration Sentry (voir instrumentation*.ts) s'enregistre elle-même ici au
 * démarrage. Si Sentry est absent ou non configuré (pas de DSN), rien n'est
 * transmis : le logger reste pleinement fonctionnel. Le code applicatif appelle
 * captureError() sans jamais connaître le fournisseur.
 */

export type ErrorContext = Record<string, unknown>;
type ErrorReporter = (error: unknown, context?: ErrorContext) => void;
type MessageReporter = (message: string, context?: ErrorContext) => void;

let errorReporter: ErrorReporter | null = null;
let messageReporter: MessageReporter | null = null;

/** Enregistre le fournisseur externe (appelé par l'intégration Sentry). */
export function setErrorReporter(fn: ErrorReporter | null): void {
  errorReporter = fn;
}

export function setMessageReporter(fn: MessageReporter | null): void {
  messageReporter = fn;
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  if (typeof error === 'object' && error !== null) {
    return { ...(error as Record<string, unknown>) };
  }
  return { value: String(error) };
}

/**
 * Signale une erreur : journal structuré systématique + transmission au
 * fournisseur externe si présent. N'échoue jamais (le reporting ne doit pas
 * casser le flux applicatif).
 */
export function captureError(error: unknown, context?: ErrorContext): void {
  try {
    console.error('[capture:error]', { ...context, error: serializeError(error) });
  } catch {
    /* la journalisation ne doit jamais lever */
  }
  try {
    errorReporter?.(error, context);
  } catch {
    /* un reporter défaillant ne doit pas propager */
  }
}

/** Signale un message notable (avertissement métier, état inattendu non fatal). */
export function captureMessage(message: string, context?: ErrorContext): void {
  try {
    console.warn('[capture:message]', message, context ?? {});
  } catch {
    /* idem */
  }
  try {
    messageReporter?.(message, context);
  } catch {
    /* idem */
  }
}
