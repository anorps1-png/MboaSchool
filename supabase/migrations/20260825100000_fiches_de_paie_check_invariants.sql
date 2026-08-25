-- ============================================================================
-- Défense en profondeur : invariants comptables sur fiches_de_paie
-- MboaSchool / APON — 2026-08-25
--
-- CONTEXTE
-- Les taux CNPS/IRPP/CFC/FNE (lib/payroll.ts:getTauxFromLocalStorage) sont
-- lus depuis localStorage côté navigateur, jamais synchronisés en base ni
-- même partagés entre postes d'un même établissement. Rien n'empêche un
-- utilisateur de modifier ces valeurs via devtools avant de valider une
-- paie (rh/page.tsx: handleCalculerPaie -> handleValiderPaie ->
-- insertFichesDePaie), et aucune contrainte en base ne revalidait jusqu'ici
-- les montants soumis.
--
-- Ce correctif NE résout PAS le problème à la racine : il ne peut pas
-- vérifier que les TAUX utilisés sont corrects (ça suppose de stocker les
-- taux en base et de recalculer la paie côté serveur, comme
-- create_ecriture_comptable le fait déjà pour l'équilibre débit=crédit —
-- chantier plus large, volontairement laissé de côté ici). Il garantit en
-- revanche la COHÉRENCE INTERNE de chaque fiche : impossible d'enregistrer
-- un total qui ne correspond pas à la somme de ses composants, ou un net à
-- payer négatif ou supérieur au brut.
--
-- Vérifié en base avant application : 2 fiches de paie existantes, aucune
-- ne viole ces invariants.
-- ============================================================================

ALTER TABLE public.fiches_de_paie
  ADD CONSTRAINT fiches_de_paie_montants_non_negatifs CHECK (
    salaire_de_base >= 0 AND prime_transport >= 0 AND prime_logement >= 0
    AND prime_anciennete >= 0 AND autres_primes >= 0 AND salaire_brut >= 0
    AND cnps_salariale >= 0 AND cfc_salariale >= 0 AND irpp >= 0 AND cac >= 0
    AND rav >= 0 AND total_retenues >= 0 AND cnps_patronale >= 0
    AND cfc_patronale >= 0 AND fne >= 0 AND total_charges_patronales >= 0
    AND net_a_payer >= 0
  );

ALTER TABLE public.fiches_de_paie
  ADD CONSTRAINT fiches_de_paie_brut_coherent CHECK (
    salaire_brut = salaire_de_base + prime_transport + prime_logement + prime_anciennete + autres_primes
  );

ALTER TABLE public.fiches_de_paie
  ADD CONSTRAINT fiches_de_paie_retenues_coherentes CHECK (
    total_retenues = cnps_salariale + cfc_salariale + irpp + cac + rav
  );

ALTER TABLE public.fiches_de_paie
  ADD CONSTRAINT fiches_de_paie_charges_coherentes CHECK (
    total_charges_patronales = cnps_patronale + cfc_patronale + fne
  );

ALTER TABLE public.fiches_de_paie
  ADD CONSTRAINT fiches_de_paie_net_coherent CHECK (
    net_a_payer = salaire_brut - total_retenues
    AND net_a_payer <= salaire_brut
  );
