import { describe, it, expect } from 'vitest';
import {
  normalizeGrade,
  computeWeightedAverage,
  getMention,
  computeRanks,
  computeQuartiles,
} from './calculations';

describe('normalizeGrade', () => {
  it('convertit une note d\'un barème vers un autre', () => {
    expect(normalizeGrade(35, 50, 20)).toBe(14);
    expect(normalizeGrade(10, 20, 20)).toBe(10);
    expect(normalizeGrade(15, 30, 10)).toBe(5);
  });

  it('renvoie 0 pour un barème nul ou négatif (évite la division par zéro)', () => {
    expect(normalizeGrade(10, 0)).toBe(0);
    expect(normalizeGrade(10, -5)).toBe(0);
  });

  it('utilise 20 comme barème cible par défaut', () => {
    expect(normalizeGrade(5, 10)).toBe(10);
  });
});

describe('computeWeightedAverage', () => {
  it('calcule une moyenne pondérée par les coefficients', () => {
    // (14*4 + 10*1) / (4+1) = 66/5 = 13.2
    const r = computeWeightedAverage([
      { note: 14, bareme: 20, coefficient: 4 },
      { note: 10, bareme: 20, coefficient: 1 },
    ]);
    expect(r.average).toBe(13.2);
    expect(r.totalPoints).toBe(66);
    expect(r.totalCoefficients).toBe(5);
  });

  it('normalise les barèmes hétérogènes avant de pondérer', () => {
    // 35/50 -> 14/20 ; 8/10 -> 16/20 ; coeffs 2 et 1
    // (14*2 + 16*1) / 3 = 44/3 = 14.67
    const r = computeWeightedAverage([
      { note: 35, bareme: 50, coefficient: 2 },
      { note: 8, bareme: 10, coefficient: 1 },
    ]);
    expect(r.average).toBe(14.67);
    expect(r.totalCoefficients).toBe(3);
  });

  it('traite un coefficient absent comme 1', () => {
    const r = computeWeightedAverage([
      { note: 12, bareme: 20, coefficient: 0 },
    ]);
    // coefficient 0 -> || 1 -> compte comme 1
    expect(r.totalCoefficients).toBe(1);
    expect(r.average).toBe(12);
  });

  it('renvoie des zéros pour une liste vide', () => {
    expect(computeWeightedAverage([])).toEqual({
      average: 0,
      totalPoints: 0,
      totalCoefficients: 0,
    });
  });
});

describe('getMention', () => {
  it('associe la bonne mention à chaque palier', () => {
    expect(getMention(18)).toBe('Très Bien');
    expect(getMention(16)).toBe('Très Bien');
    expect(getMention(14)).toBe('Bien');
    expect(getMention(12)).toBe('Assez Bien');
    expect(getMention(10)).toBe('Passable');
    expect(getMention(8)).toBe('Insuffisant');
    expect(getMention(5)).toBe('Médiocre');
  });

  it('gère les bornes exactes (>=)', () => {
    expect(getMention(15.99)).toBe('Bien');
    expect(getMention(9.99)).toBe('Insuffisant');
  });
});

describe('computeRanks', () => {
  it('classe par moyenne décroissante', () => {
    const ranks = computeRanks([
      { id: 'a', average: 12 },
      { id: 'b', average: 15 },
      { id: 'c', average: 9 },
    ]);
    expect(ranks).toEqual({ b: 1, a: 2, c: 3 });
  });

  it('gère les ex-aequo (même rang, saut ensuite)', () => {
    const ranks = computeRanks([
      { id: 'a', average: 15 },
      { id: 'b', average: 15 },
      { id: 'c', average: 10 },
    ]);
    expect(ranks.a).toBe(1);
    expect(ranks.b).toBe(1);
    expect(ranks.c).toBe(3); // rang 2 sauté à cause de l'ex-aequo
  });

  it('renvoie un objet vide pour une liste vide', () => {
    expect(computeRanks([])).toEqual({});
  });
});

describe('computeQuartiles', () => {
  it('calcule min, q1, médiane, q3, max par interpolation linéaire', () => {
    const r = computeQuartiles([1, 2, 3, 4, 5]);
    expect(r.min).toBe(1);
    expect(r.median).toBe(3);
    expect(r.max).toBe(5);
    expect(r.q1).toBe(2);
    expect(r.q3).toBe(4);
  });

  it('interpole entre deux valeurs pour la médiane d\'un effectif pair', () => {
    const r = computeQuartiles([10, 20]);
    expect(r.median).toBe(15);
  });

  it('renvoie des zéros pour un tableau vide', () => {
    expect(computeQuartiles([])).toEqual({ min: 0, q1: 0, median: 0, q3: 0, max: 0 });
  });

  it('ne dépend pas de l\'ordre d\'entrée', () => {
    expect(computeQuartiles([5, 1, 3, 2, 4])).toEqual(computeQuartiles([1, 2, 3, 4, 5]));
  });
});
