-- ============================================================================
-- RPC transactionnelle : création d'une écriture comptable OHADA
-- MboaSchool / APON — 2026-07-13
--
-- Problème corrigé : côté application, l'en-tête (ecritures_comptables) et les
-- lignes (lignes_ecritures) étaient insérés en DEUX appels réseau distincts.
-- Si le second échouait, l'en-tête restait orphelin. Aucune vérification non
-- plus de l'équilibre débit = crédit (invariant fondamental de la comptabilité
-- en partie double / OHADA).
--
-- Cette fonction fait tout dans UNE transaction atomique (une fonction plpgsql
-- s'exécute intégralement ou pas du tout) :
--   1. Résout l'établissement du tenant appelant
--   2. Valide que l'écriture est équilibrée et non vide
--   3. Crée à la volée les comptes OHADA manquants (idempotent)
--   4. Insère l'en-tête puis les lignes
--   5. Renvoie l'id de l'écriture créée
--
-- SECURITY INVOKER (défaut) : la RLS continue de s'appliquer, le tenant ne peut
-- écrire que dans son propre établissement.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_ecriture_comptable(
  p_libelle    TEXT,
  p_reference  TEXT,
  p_date       DATE,
  p_partenaire TEXT,
  p_lignes     JSONB   -- [{ "compte_numero": "661", "libelle": "...", "classe": 6, "debit": 1000, "credit": 0 }, ...]
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_etab_id      UUID;
  v_ecriture_id  UUID;
  v_total_debit  NUMERIC := 0;
  v_total_credit NUMERIC := 0;
  v_count        INT := 0;
  ligne          JSONB;
BEGIN
  -- 1. Établissement du tenant appelant
  v_etab_id := public.current_user_etablissement_id();
  IF v_etab_id IS NULL THEN
    RAISE EXCEPTION 'Aucun établissement associé à l''utilisateur courant.';
  END IF;

  -- 2. Validation de l'écriture
  IF p_lignes IS NULL OR jsonb_typeof(p_lignes) <> 'array' OR jsonb_array_length(p_lignes) = 0 THEN
    RAISE EXCEPTION 'L''écriture doit comporter au moins une ligne.';
  END IF;

  FOR ligne IN SELECT * FROM jsonb_array_elements(p_lignes) LOOP
    v_total_debit  := v_total_debit  + COALESCE((ligne->>'debit')::NUMERIC, 0);
    v_total_credit := v_total_credit + COALESCE((ligne->>'credit')::NUMERIC, 0);
    v_count := v_count + 1;
  END LOOP;

  -- Équilibre débit = crédit (tolérance 0.01 pour d'éventuels arrondis)
  IF abs(v_total_debit - v_total_credit) > 0.01 THEN
    RAISE EXCEPTION 'Écriture déséquilibrée : total débit = %, total crédit = %.',
      v_total_debit, v_total_credit;
  END IF;

  IF v_total_debit <= 0 THEN
    RAISE EXCEPTION 'Le montant total de l''écriture doit être strictement positif.';
  END IF;

  -- 3. Créer les comptes OHADA référencés mais absents (pour ce tenant)
  FOR ligne IN SELECT * FROM jsonb_array_elements(p_lignes) LOOP
    IF (ligne->>'compte_numero') IS NULL OR (ligne->>'compte_numero') = '' THEN
      RAISE EXCEPTION 'Une ligne d''écriture référence un compte vide.';
    END IF;

    INSERT INTO public.comptes_ohada (numero, libelle, classe, etablissement_id)
    SELECT
      ligne->>'compte_numero',
      COALESCE(ligne->>'libelle', 'Compte ' || (ligne->>'compte_numero')),
      COALESCE((ligne->>'classe')::INT, left(ligne->>'compte_numero', 1)::INT),
      v_etab_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.comptes_ohada c
      WHERE c.numero = ligne->>'compte_numero'
        AND (c.etablissement_id = v_etab_id OR c.etablissement_id IS NULL)
    );
  END LOOP;

  -- 4. En-tête
  INSERT INTO public.ecritures_comptables (libelle, reference, date, partenaire, etablissement_id)
  VALUES (p_libelle, p_reference, COALESCE(p_date, CURRENT_DATE), p_partenaire, v_etab_id)
  RETURNING id INTO v_ecriture_id;

  -- 5. Lignes (alias distinct de la variable de boucle 'ligne' pour éviter
  --    toute ambiguïté de référence de colonne)
  INSERT INTO public.lignes_ecritures (ecriture_id, compte_numero, debit, credit)
  SELECT
    v_ecriture_id,
    elem->>'compte_numero',
    COALESCE((elem->>'debit')::NUMERIC, 0),
    COALESCE((elem->>'credit')::NUMERIC, 0)
  FROM jsonb_array_elements(p_lignes) AS arr(elem);

  RETURN v_ecriture_id;
END;
$$;

-- Accessible aux utilisateurs authentifiés (la RLS gouverne le périmètre tenant)
GRANT EXECUTE ON FUNCTION public.create_ecriture_comptable(TEXT, TEXT, DATE, TEXT, JSONB) TO authenticated;
