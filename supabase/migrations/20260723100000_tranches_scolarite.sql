-- ============================================================================
-- Tranches de Scolarité
-- ============================================================================

CREATE TABLE public.tranches_scolarite (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etablissement_id UUID NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  annee_scolaire_id UUID NOT NULL REFERENCES public.annees_scolaires(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  date_limite DATE NOT NULL,
  pourcentage NUMERIC NOT NULL CHECK (pourcentage > 0 AND pourcentage <= 100),
  ordre INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_tranches_scolarite_etablissement ON public.tranches_scolarite(etablissement_id);
CREATE INDEX idx_tranches_scolarite_annee ON public.tranches_scolarite(annee_scolaire_id);

-- RLS
ALTER TABLE public.tranches_scolarite ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Etablissement access for ALL on tranches_scolarite"
ON public.tranches_scolarite
FOR ALL
TO authenticated
USING (etablissement_id = (SELECT id FROM public.etablissements WHERE id = tranches_scolarite.etablissement_id LIMIT 1))
WITH CHECK (etablissement_id = (SELECT id FROM public.etablissements WHERE id = tranches_scolarite.etablissement_id LIMIT 1));

-- ============================================================================
-- Mise à jour de get_students_paginated
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_students_paginated(UUID, UUID, TEXT, UUID, TEXT, TEXT, INT, INT);

CREATE OR REPLACE FUNCTION public.get_students_paginated(
  p_etablissement_id UUID,
  p_annee_scolaire_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_classe_id UUID DEFAULT NULL,
  p_statut_paiement TEXT DEFAULT NULL, -- 'paid' | 'partial' | 'unpaid' | 'late' | NULL (tous)
  p_sexe TEXT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  matricule TEXT,
  nom TEXT,
  prenom TEXT,
  sexe TEXT,
  classe_id UUID,
  classe_nom TEXT,
  annee_scolaire_id UUID,
  nom_parent TEXT,
  telephone_parent TEXT,
  email_parent TEXT,
  date_naissance DATE,
  lieu_naissance TEXT,
  date_inscription DATE,
  statut TEXT,
  total_due NUMERIC,
  total_paid NUMERIC,
  statut_paiement TEXT,
  reste_a_payer_echu NUMERIC,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_offset INT := GREATEST(p_page - 1, 0) * GREATEST(p_page_size, 1);
BEGIN
  RETURN QUERY
  WITH tranches_sum AS (
    SELECT ts.annee_scolaire_id, SUM(ts.pourcentage) / 100.0 AS pct_echu
    FROM public.tranches_scolarite ts
    WHERE ts.etablissement_id = p_etablissement_id
      AND ts.date_limite < CURRENT_DATE
    GROUP BY ts.annee_scolaire_id
  ),
  base AS (
    SELECT
      e.id, e.matricule, e.nom, e.prenom, e.sexe, e.classe_id, c.nom AS classe_nom,
      e.annee_scolaire_id, e.nom_parent, e.telephone_parent, e.email_parent,
      e.date_naissance, e.lieu_naissance, e.date_inscription, e.statut,
      COALESCE(c.prix, 200000)::NUMERIC AS total_due,
      COALESCE((
        SELECT SUM(pmt.montant) FROM public.paiements pmt
        WHERE pmt.eleve_id = e.id AND pmt.statut = 'paid'
      ), 0)::NUMERIC AS total_paid,
      COALESCE(ts.pct_echu, 0)::NUMERIC AS pct_echu
    FROM public.eleves e
    LEFT JOIN public.classes c ON c.id = e.classe_id
    LEFT JOIN tranches_sum ts ON ts.annee_scolaire_id = e.annee_scolaire_id
    WHERE e.etablissement_id = p_etablissement_id
      AND (p_annee_scolaire_id IS NULL OR e.annee_scolaire_id = p_annee_scolaire_id)
      AND (p_classe_id IS NULL OR e.classe_id = p_classe_id)
      AND (p_sexe IS NULL OR e.sexe = p_sexe)
      AND (
        p_search IS NULL OR p_search = '' OR
        (e.nom || ' ' || e.prenom) ILIKE '%' || p_search || '%' OR
        e.matricule ILIKE '%' || p_search || '%'
      )
  ),
  scored AS (
    SELECT base.*,
      CASE
        WHEN base.total_due > 0 AND base.total_paid >= base.total_due THEN 'paid'
        WHEN base.total_due > 0 AND base.total_paid < (base.total_due * base.pct_echu) THEN 'late'
        WHEN base.total_paid > 0 THEN 'partial'
        ELSE 'unpaid'
      END AS statut_paiement,
      GREATEST(0, (base.total_due * base.pct_echu) - base.total_paid)::NUMERIC AS reste_a_payer_echu
    FROM base
  ),
  filtered AS (
    SELECT * FROM scored s
    WHERE p_statut_paiement IS NULL 
       OR s.statut_paiement = p_statut_paiement 
       OR (p_statut_paiement = 'late' AND s.statut_paiement = 'late')
       OR (p_statut_paiement = 'partial' AND s.statut_paiement IN ('partial', 'late'))
  )
  SELECT f.id, f.matricule, f.nom, f.prenom, f.sexe, f.classe_id, f.classe_nom,
         f.annee_scolaire_id, f.nom_parent, f.telephone_parent, f.email_parent,
         f.date_naissance, f.lieu_naissance, f.date_inscription, f.statut,
         f.total_due, f.total_paid, f.statut_paiement, f.reste_a_payer_echu,
         count(*) OVER()::BIGINT AS total_count
  FROM filtered f
  ORDER BY f.nom ASC, f.id ASC
  LIMIT GREATEST(p_page_size, 1)
  OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_students_paginated(UUID, UUID, TEXT, UUID, TEXT, TEXT, INT, INT) TO authenticated;
