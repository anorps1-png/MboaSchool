/**
 * Normalise une note sur un barème arbitraire vers un barème cible (par défaut sur 20).
 */
export function normalizeGrade(note: number, bareme: number, targetBareme: number = 20): number {
  if (bareme <= 0) return 0;
  return (note / bareme) * targetBareme;
}

/**
 * Calcule la moyenne pondérée (coefficientée) de notes normalisées sur 20.
 */
export function computeWeightedAverage(
  notes: { note: number; bareme: number; coefficient: number }[]
): { average: number; totalPoints: number; totalCoefficients: number } {
  if (notes.length === 0) {
    return { average: 0, totalPoints: 0, totalCoefficients: 0 };
  }

  let totalPoints = 0;
  let totalCoefficients = 0;

  for (const item of notes) {
    const normalized = normalizeGrade(item.note, item.bareme, 20);
    const coeff = item.coefficient || 1;
    totalPoints += normalized * coeff;
    totalCoefficients += coeff;
  }

  const average = totalCoefficients > 0 ? totalPoints / totalCoefficients : 0;
  return {
    average: parseFloat(average.toFixed(2)),
    totalPoints: parseFloat(totalPoints.toFixed(2)),
    totalCoefficients
  };
}

/**
 * Détermine la mention associée à une moyenne générale (sur 20).
 */
export function getMention(average: number): string {
  if (average >= 16) return 'Très Bien';
  if (average >= 14) return 'Bien';
  if (average >= 12) return 'Assez Bien';
  if (average >= 10) return 'Passable';
  if (average >= 8) return 'Insuffisant';
  return 'Médiocre';
}

/**
 * Calcule le rang de chaque entité en fonction de sa moyenne.
 * Gère les ex-aequo simples.
 */
export function computeRanks(
  entities: { id: string; average: number }[]
): Record<string, number> {
  const sorted = [...entities].sort((a, b) => b.average - a.average);
  const ranks: Record<string, number> = {};
  
  let currentRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].average < sorted[i - 1].average) {
      currentRank = i + 1;
    }
    ranks[sorted[i].id] = currentRank;
  }
  
  return ranks;
}

/**
 * Calcule les quartiles d'un tableau de nombres.
 */
export function computeQuartiles(values: number[]): {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
} {
  const sorted = [...values].sort((a, b) => a - b);
  const len = sorted.length;

  if (len === 0) {
    return { min: 0, q1: 0, median: 0, q3: 0, max: 0 };
  }

  const getPercentile = (p: number) => {
    const pos = (len - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    }
    return sorted[base];
  };

  return {
    min: sorted[0],
    q1: parseFloat(getPercentile(0.25).toFixed(2)),
    median: parseFloat(getPercentile(0.5).toFixed(2)),
    q3: parseFloat(getPercentile(0.75).toFixed(2)),
    max: sorted[len - 1]
  };
}
