-- Permet de rattacher explicitement un paiement à une tranche de scolarité
-- configurée (tranches_scolarite). Nullable : seuls les paiements de type
-- Scolarité ont vocation à être rattachés à une tranche ; les autres types
-- de frais (Inscription, Examen, Transport) et les paiements historiques
-- antérieurs à cette fonctionnalité restent à NULL.
ALTER TABLE public.paiements
  ADD COLUMN IF NOT EXISTS tranche_id UUID REFERENCES public.tranches_scolarite(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_paiements_tranche ON public.paiements(tranche_id);
