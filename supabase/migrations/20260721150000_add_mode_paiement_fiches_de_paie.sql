-- La colonne mode_paiement est envoyée par le code applicatif à chaque
-- validation de paie (src/app/(dashboard)/rh/page.tsx: handleValiderPaie)
-- mais n'a jamais existé sur la table fiches_de_paie. L'insertion échouait
-- donc silencieusement à chaque tentative de paiement (l'erreur était
-- attrapée et seulement envoyée à Sentry), laissant la table perpétuellement
-- vide et rendant inopérantes les vérifications anti-double-paiement basées
-- sur la base de données.
ALTER TABLE public.fiches_de_paie
ADD COLUMN IF NOT EXISTS mode_paiement TEXT DEFAULT 'Banque' CHECK (mode_paiement IN ('Banque', 'Caisse'));
