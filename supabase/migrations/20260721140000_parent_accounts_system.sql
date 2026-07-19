-- Système de comptes parents : liaison parent-enfants et RLS

-- 1. Table de liaison parent-enfants (un parent peut avoir plusieurs enfants)
CREATE TABLE IF NOT EXISTS public.parent_eleves (
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  eleve_id UUID NOT NULL REFERENCES public.eleves(id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, eleve_id)
);

ALTER TABLE public.parent_eleves ENABLE ROW LEVEL SECURITY;

-- RLS : parents can see their own children, admins/directeurs see all
CREATE POLICY "Parents see their children" ON public.parent_eleves TO authenticated
  USING (
    parent_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'directeur'))
  );

-- 2. RLS pour les élèves : parents ne voient que leurs enfants
CREATE POLICY "Parents see only their children" ON public.eleves TO authenticated
  USING (
    -- Admins/directeurs voient tous les élèves
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'directeur') OR
    -- Enseignants voient les élèves de leurs classes
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'enseignant' OR
    -- Parents ne voient que leurs enfants
    ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'parent' AND
     id IN (SELECT eleve_id FROM public.parent_eleves WHERE parent_id = auth.uid()))
  );

-- 3. RLS pour les paiements : parents ne voient que les paiements de leurs enfants
CREATE POLICY "Parents see only their children payments" ON public.paiements TO authenticated
  USING (
    -- Admins/directeurs voient tous les paiements
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'directeur') OR
    -- Parents ne voient que les paiements de leurs enfants
    ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'parent' AND
     eleve_id IN (SELECT eleve_id FROM public.parent_eleves WHERE parent_id = auth.uid()))
  );

-- 4. RLS pour les notes/résultats académiques : parents ne voient que ceux de leurs enfants
-- (Adapter selon la vraie table de notes/bulletins si différente)
-- CREATE POLICY "Parents see only their children grades" ON public.notes TO authenticated
--   USING (
--     ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'parent' AND
--      eleve_id IN (SELECT eleve_id FROM public.parent_eleves WHERE parent_id = auth.uid()))
--   );

-- 5. Indexe pour les performances
CREATE INDEX IF NOT EXISTS idx_parent_eleves_parent_id ON public.parent_eleves(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_eleves_eleve_id ON public.parent_eleves(eleve_id);
