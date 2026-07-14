import { describe, it, expect } from 'vitest';
import { validatePasswordStrength, PASSWORD_MIN_LENGTH } from './password';

describe('validatePasswordStrength', () => {
  it('accepte un mot de passe conforme (>= 8, lettre + chiffre)', () => {
    expect(validatePasswordStrength('motdepasse1')).toBeNull();
    expect(validatePasswordStrength('Abcdef12')).toBeNull();
  });

  it('refuse un mot de passe trop court', () => {
    expect(validatePasswordStrength('Abc1')).toMatch(/8 caractères/);
    expect(validatePasswordStrength('')).toMatch(/8 caractères/);
  });

  it('refuse un mot de passe sans chiffre', () => {
    expect(validatePasswordStrength('motdepasse')).toMatch(/lettre et un chiffre/);
  });

  it('refuse un mot de passe sans lettre', () => {
    expect(validatePasswordStrength('12345678')).toMatch(/lettre et un chiffre/);
  });

  it('exige au moins 8 caractères', () => {
    expect(PASSWORD_MIN_LENGTH).toBeGreaterThanOrEqual(8);
  });
});
