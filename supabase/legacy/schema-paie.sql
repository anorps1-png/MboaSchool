-- ============================================================
-- Table: fiches_de_paie
-- Bulletins de paie conformes CNPS Cameroun
-- ============================================================

CREATE TABLE IF NOT EXISTS fiches_de_paie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id UUID REFERENCES etablissements(id) ON DELETE CASCADE,
  personnel_id UUID REFERENCES membres_personnel(id) ON DELETE CASCADE,
  nom_personnel TEXT NOT NULL,
  periode TEXT NOT NULL,              -- Format: "2026-06"
  date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Éléments de rémunération
  salaire_de_base NUMERIC(12,0) NOT NULL DEFAULT 0,
  prime_transport NUMERIC(12,0) NOT NULL DEFAULT 0,
  prime_logement NUMERIC(12,0) NOT NULL DEFAULT 0,
  prime_anciennete NUMERIC(12,0) NOT NULL DEFAULT 0,
  autres_primes NUMERIC(12,0) NOT NULL DEFAULT 0,
  salaire_brut NUMERIC(12,0) NOT NULL DEFAULT 0,
  
  -- Retenues salariales (part employé)
  cnps_salariale NUMERIC(12,0) NOT NULL DEFAULT 0,
  cfc_salariale NUMERIC(12,0) NOT NULL DEFAULT 0,
  irpp NUMERIC(12,0) NOT NULL DEFAULT 0,
  cac NUMERIC(12,0) NOT NULL DEFAULT 0,
  rav NUMERIC(12,0) NOT NULL DEFAULT 0,
  total_retenues NUMERIC(12,0) NOT NULL DEFAULT 0,
  
  -- Charges patronales
  cnps_patronale NUMERIC(12,0) NOT NULL DEFAULT 0,
  cfc_patronale NUMERIC(12,0) NOT NULL DEFAULT 0,
  fne NUMERIC(12,0) NOT NULL DEFAULT 0,
  total_charges_patronales NUMERIC(12,0) NOT NULL DEFAULT 0,
  
  -- Net
  net_a_payer NUMERIC(12,0) NOT NULL DEFAULT 0,
  
  -- Statut du bulletin
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'valide', 'paye')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Un seul bulletin par employé par période
  UNIQUE(personnel_id, periode)
);

-- Index pour les performances de requête
CREATE INDEX IF NOT EXISTS idx_fiches_paie_etab ON fiches_de_paie(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_fiches_paie_periode ON fiches_de_paie(periode);
CREATE INDEX IF NOT EXISTS idx_fiches_paie_personnel ON fiches_de_paie(personnel_id);
CREATE INDEX IF NOT EXISTS idx_fiches_paie_statut ON fiches_de_paie(statut);

-- Sécurité Row Level Security
ALTER TABLE fiches_de_paie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fiches_de_paie_select" ON fiches_de_paie
  FOR SELECT USING (
    etablissement_id IN (
      SELECT etablissement_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "fiches_de_paie_insert" ON fiches_de_paie
  FOR INSERT WITH CHECK (
    etablissement_id IN (
      SELECT etablissement_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "fiches_de_paie_update" ON fiches_de_paie
  FOR UPDATE USING (
    etablissement_id IN (
      SELECT etablissement_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "fiches_de_paie_delete" ON fiches_de_paie
  FOR DELETE USING (
    etablissement_id IN (
      SELECT etablissement_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Ajouter le mode de paiement préférentiel dans membres_personnel si inexistant
ALTER TABLE public.membres_personnel 
ADD COLUMN IF NOT EXISTS mode_paiement_preferentiel text DEFAULT 'Banque' CHECK (mode_paiement_preferentiel IN ('Banque', 'Caisse'));
