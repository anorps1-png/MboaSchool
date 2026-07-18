import { createClient } from '../supabase/client';
import { eleveSchema, paiementSchema, validateOrThrow } from '../validation/schemas';

const supabase = createClient();

export async function getStudents(etablissementId: string) {
  let allData: any[] = [];
  let from = 0;
  const step = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('eleves')
      .select('id, matricule, nom, prenom, sexe, classe_id, annee_scolaire_id, nom_parent, telephone_parent, email_parent, date_naissance, lieu_naissance, date_inscription, statut, paiements(id, eleve_id, montant, date, type_frais, statut, reference, mode_paiement)')
      .eq('etablissement_id', etablissementId)
      .order('nom', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + step - 1);

    if (error) throw error;
    if (data && data.length > 0) {
      allData = allData.concat(data);
      from += step;
      if (data.length < step) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }
  return allData;
}

export interface StudentPage {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  sexe: string;
  classe_id: string;
  classe_nom: string | null;
  annee_scolaire_id: string | null;
  nom_parent: string | null;
  telephone_parent: string | null;
  email_parent: string | null;
  date_naissance: string | null;
  lieu_naissance: string | null;
  date_inscription: string | null;
  statut: string;
  total_due: number;
  total_paid: number;
  statut_paiement: 'paid' | 'partial' | 'unpaid';
}

export interface StudentsWidgetStats {
  total: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
}

/**
 * Recherche + filtres + pagination calculés en base via la RPC
 * get_students_paginated (voir supabase/migrations/20260718100000_*).
 * À appeler seulement après avoir vérifié que la migration est appliquée
 * (get_students_paginated absente -> l'appel échoue avec un code Postgres
 * 42883 "function does not exist" ; l'appelant doit alors retomber sur
 * getStudents() + calcul/pagination client, comme avant).
 */
export async function getStudentsPaginated(params: {
  etablissementId: string;
  anneeScolaireId?: string | null;
  search?: string;
  classeId?: string | null;
  statutPaiement?: 'paid' | 'partial' | 'unpaid' | null;
  sexe?: 'M' | 'F' | null;
  page: number;
  pageSize: number;
}): Promise<{ students: StudentPage[]; totalCount: number }> {
  const { data, error } = await supabase.rpc('get_students_paginated', {
    p_etablissement_id: params.etablissementId,
    p_annee_scolaire_id: params.anneeScolaireId ?? null,
    p_search: params.search || null,
    p_classe_id: params.classeId ?? null,
    p_statut_paiement: params.statutPaiement ?? null,
    p_sexe: params.sexe ?? null,
    p_page: params.page,
    p_page_size: params.pageSize,
  });

  if (error) throw error;
  const rows = (data || []) as (StudentPage & { total_count: number })[];
  const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;
  return { students: rows, totalCount };
}

/** Agrégats des cartes de résumé (payé/partiel/non payé/total), sans transférer les lignes. */
export async function getStudentsWidgetStats(
  etablissementId: string,
  anneeScolaireId?: string | null
): Promise<StudentsWidgetStats> {
  const { data, error } = await supabase.rpc('get_students_widget_stats', {
    p_etablissement_id: etablissementId,
    p_annee_scolaire_id: anneeScolaireId ?? null,
  });

  if (error) throw error;
  return data as StudentsWidgetStats;
}

export async function getStudentById(id: string) {
  const { data, error } = await supabase
    .from('eleves')
    .select('id, matricule, nom, prenom, sexe, classe_id, annee_scolaire_id, nom_parent, telephone_parent, email_parent, date_naissance, lieu_naissance, date_inscription, statut, paiements(id, eleve_id, montant, date, type_frais, statut, reference, mode_paiement), notes(id, note, trimestre, matiere, matiere_id, evaluation_maternelle, enseignant_id, coefficient)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createStudent(studentData: Record<string, any>, etablissementId: string) {
  validateOrThrow(eleveSchema, studentData, 'Élève invalide');

  const { data, error } = await supabase
    .from('eleves')
    .insert([{ ...studentData, etablissement_id: etablissementId }])
    .select();

  if (error) throw error;
  return data;
}

export async function addPayment(paymentData: Record<string, any>, etablissementId: string) {
  validateOrThrow(paiementSchema, paymentData, 'Paiement invalide');

  const { data, error } = await supabase
    .from('paiements')
    .insert([{ ...paymentData, etablissement_id: etablissementId }])
    .select();

  if (error) throw error;
  return data;
}
