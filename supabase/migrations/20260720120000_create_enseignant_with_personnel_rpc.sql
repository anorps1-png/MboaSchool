-- ============================================================================
-- RPC : création transactionnelle d'un enseignant + son dossier RH
-- MboaSchool / APON — 2026-07-20
--
-- Bugs corrigés (enseignants/page.tsx, handleAddEnseignant) :
--   1. Le matricule était généré côté client via
--      'PROF-' + Math.floor(Math.random()*10000) — seulement 10 000 valeurs
--      possibles, sans aucune vérification de collision avant insert. Cette
--      RPC génère le matricule côté serveur avec une boucle de nouvelle
--      tentative tant qu'il n'est pas garanti unique pour l'établissement.
--      (Pas de contrainte UNIQUE ajoutée sur enseignants.matricule : des
--      doublons peuvent déjà exister en production du fait de l'ancienne
--      génération non vérifiée, et ajouter une contrainte UNIQUE à l'aveugle
--      ferait échouer cette migration si c'est le cas. La vérification
--      d'existence ci-dessous suffit pour les nouvelles créations.)
--   2. Après l'insert dans enseignants, deux inserts supplémentaires
--      (membres_personnel puis mouvements_personnel) étaient faits en
--      séquence côté client, non transactionnels : un échec en cours de
--      route laissait l'enseignant créé sans dossier RH ni mouvement de
--      personnel, avec un toast de succès affiché quand même. Cette RPC
--      fait les 3 inserts dans une seule transaction plpgsql.
--
-- SECURITY INVOKER (défaut) : la RLS s'applique normalement sur les 3
-- tables, comme le faisait déjà le code client.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_enseignant_with_personnel(
  p_etablissement_id UUID,
  p_nom TEXT,
  p_prenom TEXT,
  p_sexe TEXT,
  p_telephone TEXT,
  p_email TEXT,
  p_matiere_principale TEXT,
  p_salaire_mensuel NUMERIC,
  p_statut TEXT,
  p_type_contrat TEXT,
  p_categorie TEXT,
  p_date_embauche DATE
)
RETURNS public.enseignants
LANGUAGE plpgsql
AS $$
DECLARE
  v_matricule TEXT;
  v_enseignant public.enseignants;
  v_personnel_id UUID;
  v_attempt INT := 0;
BEGIN
  IF p_etablissement_id != public.current_user_etablissement_id() THEN
    RAISE EXCEPTION 'etablissement_id ne correspond pas à l''utilisateur courant.';
  END IF;

  LOOP
    v_matricule := 'PROF-' || lpad(floor(random() * 10000)::int::text, 4, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.enseignants
      WHERE etablissement_id = p_etablissement_id AND matricule = v_matricule
    );
    v_attempt := v_attempt + 1;
    IF v_attempt >= 20 THEN
      RAISE EXCEPTION 'Impossible de générer un matricule unique après 20 tentatives.';
    END IF;
  END LOOP;

  INSERT INTO public.enseignants (
    matricule, nom, prenom, sexe, telephone, email, matiere_principale,
    salaire_mensuel, statut, type_contrat, categorie, date_embauche, etablissement_id
  ) VALUES (
    v_matricule, p_nom, p_prenom, p_sexe, p_telephone, p_email, p_matiere_principale,
    COALESCE(p_salaire_mensuel, 0), COALESCE(p_statut, 'actif'), COALESCE(p_type_contrat, 'CDI'),
    COALESCE(p_categorie, 'Enseignant'), COALESCE(p_date_embauche, CURRENT_DATE), p_etablissement_id
  )
  RETURNING * INTO v_enseignant;

  INSERT INTO public.membres_personnel (
    nom, prenom, email, telephone, sexe, categorie, type_contrat,
    salaire_de_base, date_embauche, statut, etablissement_id
  ) VALUES (
    p_nom, p_prenom, COALESCE(p_email, ''), COALESCE(p_telephone, '+237 600 00 00 00'), p_sexe,
    COALESCE(p_categorie, 'Enseignant'), COALESCE(p_type_contrat, 'CDI'), COALESCE(p_salaire_mensuel, 0),
    COALESCE(p_date_embauche, CURRENT_DATE), 'actif', p_etablissement_id
  )
  RETURNING id INTO v_personnel_id;

  INSERT INTO public.mouvements_personnel (
    personnel_id, nom_personnel, type, date, details, etablissement_id
  ) VALUES (
    v_personnel_id, p_nom || ' ' || p_prenom, 'embauche', COALESCE(p_date_embauche, CURRENT_DATE),
    'Embauche en contrat ' || COALESCE(p_type_contrat, 'CDI') || ' (' || COALESCE(p_categorie, 'Enseignant') || ')',
    p_etablissement_id
  );

  RETURN v_enseignant;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_enseignant_with_personnel(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, DATE
) TO authenticated;
