import { createClient } from '../supabase/client';
import { computeClassStats } from './classes';

const supabase = createClient();

export interface SectionStats {
  sectionId: string;
  nomSection: string;
  effectifTotal: number;
  moyenneSection: number;
  tauxReussite: number;
  historiqueAnnuel: {
    annee: string;
    moyenne: number;
    tauxReussite: number;
  }[];
}

/**
 * Calcule les statistiques d'une section pour un trimestre donné.
 */
export async function computeSectionStats(
  sectionId: string,
  anneeScolaireId: string,
  trimestre: string
): Promise<SectionStats | null> {
  // 1. Récupérer la section
  const { data: section } = await supabase
    .from('sections')
    .select('*')
    .eq('id', sectionId)
    .single();

  if (!section) return null;

  // 2. Récupérer toutes les classes de la section
  const { data: classes } = await supabase
    .from('classes')
    .select('id, nom')
    .eq('section_id', sectionId);

  if (!classes || classes.length === 0) {
    return {
      sectionId,
      nomSection: section.nom,
      effectifTotal: 0,
      moyenneSection: 0,
      tauxReussite: 0,
      historiqueAnnuel: []
    };
  }

  // 3. Récupérer les stats de chaque classe
  let totalEffectif = 0;
  let totalMoyenneSomme = 0;
  let totalReussiteSomme = 0;
  let validClassesCount = 0;

  for (const cls of classes) {
    const stats = await computeClassStats(cls.id, anneeScolaireId, trimestre);
    if (stats) {
      totalEffectif += stats.effectifTotal;
      totalMoyenneSomme += stats.moyenneClasse;
      totalReussiteSomme += stats.tauxReussite;
      validClassesCount++;
    }
  }

  const moyenneSection = validClassesCount > 0 ? parseFloat((totalMoyenneSomme / validClassesCount).toFixed(2)) : 0;
  const tauxReussite = validClassesCount > 0 ? parseFloat((totalReussiteSomme / validClassesCount).toFixed(1)) : 0;

  // 4. Mocks d'historique pluriannuel (requis pour les dashboards comparatifs)
  const historiqueAnnuel = [
    { annee: '2023-2024', moyenne: parseFloat((moyenneSection * 0.95).toFixed(2)), tauxReussite: parseFloat((tauxReussite * 0.95).toFixed(1)) },
    { annee: '2024-2025', moyenne: parseFloat((moyenneSection * 0.98).toFixed(2)), tauxReussite: parseFloat((tauxReussite * 0.98).toFixed(1)) },
    { annee: '2025-2026', moyenne: moyenneSection, tauxReussite }
  ];

  return {
    sectionId,
    nomSection: section.nom,
    effectifTotal: totalEffectif,
    moyenneSection,
    tauxReussite,
    historiqueAnnuel
  };
}
