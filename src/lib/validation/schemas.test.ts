import { describe, it, expect } from 'vitest';
import { eleveSchema, paiementSchema, validateOrThrow } from './schemas';

const UUID = '00000000-0000-0000-0000-000000000001';

describe('eleveSchema', () => {
  it('accepte un élève minimal valide', () => {
    expect(() => validateOrThrow(eleveSchema, { matricule: 'E001', nom: 'Nkolo', prenom: 'Awa' }, 'test')).not.toThrow();
  });

  it('refuse un matricule vide', () => {
    expect(() => validateOrThrow(eleveSchema, { matricule: '', nom: 'X', prenom: 'Y' }, 'test')).toThrow(/matricule/i);
  });

  it('refuse un sexe hors M/F', () => {
    expect(() => validateOrThrow(eleveSchema, { matricule: 'E1', nom: 'X', prenom: 'Y', sexe: 'Z' }, 'test')).toThrow();
  });

  it('refuse un email parent malformé', () => {
    expect(() => validateOrThrow(eleveSchema, { matricule: 'E1', nom: 'X', prenom: 'Y', email_parent: 'pas-un-email' }, 'test')).toThrow(/email/i);
  });
});

describe('paiementSchema', () => {
  const valide = {
    eleve_id: UUID,
    montant: 50000,
    date: '2026-07-13',
    mode_paiement: 'Espèces',
    type_frais: 'Scolarité',
    reference: 'PAY-001',
  };

  it('accepte un paiement valide', () => {
    expect(() => validateOrThrow(paiementSchema, valide, 'test')).not.toThrow();
  });

  it('refuse un montant négatif ou nul', () => {
    expect(() => validateOrThrow(paiementSchema, { ...valide, montant: -100 }, 'test')).toThrow(/positif/i);
    expect(() => validateOrThrow(paiementSchema, { ...valide, montant: 0 }, 'test')).toThrow(/positif/i);
  });

  it('refuse un mode de paiement inconnu', () => {
    expect(() => validateOrThrow(paiementSchema, { ...valide, mode_paiement: 'Bitcoin' }, 'test')).toThrow();
  });

  it('refuse une référence manquante', () => {
    expect(() => validateOrThrow(paiementSchema, { ...valide, reference: '' }, 'test')).toThrow(/référence/i);
  });
});
