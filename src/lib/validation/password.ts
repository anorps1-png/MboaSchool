/**
 * Politique de mot de passe côté application.
 *
 * Aligne le front sur un durcissement minimal recommandé (voir
 * docs/AUTH_RATE_LIMITING.md) : au moins 8 caractères, avec au moins une lettre
 * et un chiffre. À compléter par la protection contre les mots de passe
 * compromis et la longueur minimale côté Supabase Auth.
 */

export const PASSWORD_MIN_LENGTH = 8;

/**
 * Valide la robustesse d'un mot de passe.
 * @returns un message d'erreur (français) si invalide, sinon null.
 */
export function validatePasswordStrength(password: string): string | null {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Le mot de passe doit contenir au moins une lettre et un chiffre.';
  }
  return null;
}
