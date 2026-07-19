-- ============================================================================
-- Durcissement : delete_etablissement_child_data doit vérifier le rôle admin
-- côté serveur (MboaSchool / APON — 2026-07-20)
--
-- Bug corrigé : la RPC delete_etablissement_child_data (migration
-- 20260719140000) était GRANT EXECUTE TO authenticated sans aucun contrôle
-- de rôle dans son corps. Le contrôle "admin uniquement" n'existait que
-- côté client (settings/page.tsx: isUserAdmin = profile.role === 'admin').
-- N'importe quel utilisateur authentifié du tenant (ex. un enseignant)
-- pouvait appeler cette RPC directement (console réseau) et effacer en une
-- transaction la quasi-totalité des données de son école.
--
-- Correctif : garde en tête de fonction vérifiant que l'appelant réel
-- (auth.uid(), pas p_current_user_id fourni par le client) a le rôle
-- 'admin', et que p_current_user_id correspond bien à auth.uid() (élimine
-- la dépendance à une valeur non vérifiée pour la clause d'exclusion du
-- profil courant à la fin de la fonction).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_etablissement_child_data(
  p_etablissement_id UUID,
  p_current_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_current_user_id THEN
    RAISE EXCEPTION 'p_current_user_id doit correspondre à l''utilisateur authentifié.';
  END IF;

  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Action réservée à l''administrateur de l''établissement.';
  END IF;

  -- 1. Notes, bulletins, incidents disciplinaires (via la liste d'élèves)
  DELETE FROM public.notes
    WHERE eleve_id IN (SELECT id FROM public.eleves WHERE etablissement_id = p_etablissement_id);
  DELETE FROM public.bulletins
    WHERE eleve_id IN (SELECT id FROM public.eleves WHERE etablissement_id = p_etablissement_id);
  DELETE FROM public.discipline_incidents
    WHERE eleve_id IN (SELECT id FROM public.eleves WHERE etablissement_id = p_etablissement_id);

  -- 2. Paiements, élèves
  DELETE FROM public.paiements WHERE etablissement_id = p_etablissement_id;
  DELETE FROM public.eleves WHERE etablissement_id = p_etablissement_id;

  -- 3. Lignes d'écritures, écritures comptables, plan comptable
  DELETE FROM public.lignes_ecritures
    WHERE ecriture_id IN (SELECT id FROM public.ecritures_comptables WHERE etablissement_id = p_etablissement_id);
  DELETE FROM public.ecritures_comptables WHERE etablissement_id = p_etablissement_id;
  DELETE FROM public.comptes_ohada WHERE etablissement_id = p_etablissement_id;

  -- 4. Classes, sections, années scolaires
  DELETE FROM public.classes WHERE etablissement_id = p_etablissement_id;
  DELETE FROM public.sections WHERE etablissement_id = p_etablissement_id;
  DELETE FROM public.annees_scolaires WHERE etablissement_id = p_etablissement_id;

  -- 5. Enseignants, personnel, formations
  DELETE FROM public.enseignants WHERE etablissement_id = p_etablissement_id;
  DELETE FROM public.membres_personnel WHERE etablissement_id = p_etablissement_id;
  DELETE FROM public.formations_rh WHERE etablissement_id = p_etablissement_id;

  -- 6. Autres profils de l'établissement (pas celui de l'appelant)
  DELETE FROM public.profiles
    WHERE etablissement_id = p_etablissement_id AND id != auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_etablissement_child_data(UUID, UUID) TO authenticated;
