const { Client } = require('pg');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const rawDbUrl = envContent.split('\n').find(l => l.startsWith('DATABASE_URL'))?.split('=')[1]?.trim();
const dbUrlWithBrackets = rawDbUrl.replace(':[', ':').replace(']@', '@');

const passwordMatch = dbUrlWithBrackets.match(/:([^:@]+)@/);
const password = passwordMatch ? passwordMatch[1] : '';

const dbUrl = `postgresql://postgres.fjsuhzgvoswdmwaowkcz:${encodeURIComponent(password)}@aws-0-eu-west-3.pooler.supabase.com:6543/postgres`;

const sql = `
BEGIN;

-- 1. Ajout de la colonne nom_complet sur la table profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nom_complet TEXT;

-- 2. Trigger de suppression automatique dans auth.users
CREATE OR REPLACE FUNCTION public.handle_delete_profile()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_deleted ON public.profiles;
CREATE TRIGGER on_profile_deleted
  AFTER DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_delete_profile();

-- 3. Trigger de synchronisation : enseignants -> membres_personnel
CREATE OR REPLACE FUNCTION public.sync_enseignant_to_personnel()
RETURNS TRIGGER AS $$
DECLARE
  ens_email TEXT;
BEGIN
  -- Éviter la récursion infinie
  IF pg_trigger_depth() > 1 THEN
    IF (TG_OP = 'DELETE') THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.membres_personnel WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  ens_email := COALESCE(NEW.email, NEW.id::text || '@mboaschool.internal');

  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    INSERT INTO public.membres_personnel (
      id, nom, prenom, email, telephone, sexe, categorie, type_contrat, salaire_de_base, date_embauche, statut, etablissement_id, created_at
    ) VALUES (
      NEW.id, NEW.nom, NEW.prenom, ens_email, NEW.telephone, NEW.sexe, 'Enseignant', 'CDI', COALESCE(NEW.salaire_mensuel, 0), COALESCE(NEW.date_embauche, CURRENT_DATE), COALESCE(NEW.statut, 'actif'), NEW.etablissement_id, NEW.created_at
    ) ON CONFLICT (id) DO UPDATE SET
      nom = EXCLUDED.nom,
      prenom = EXCLUDED.prenom,
      email = EXCLUDED.email,
      telephone = EXCLUDED.telephone,
      sexe = EXCLUDED.sexe,
      salaire_de_base = EXCLUDED.salaire_de_base,
      date_embauche = EXCLUDED.date_embauche,
      statut = EXCLUDED.statut;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_enseignant ON public.enseignants;
CREATE TRIGGER trg_sync_enseignant
  AFTER INSERT OR UPDATE OR DELETE ON public.enseignants
  FOR EACH ROW EXECUTE FUNCTION public.sync_enseignant_to_personnel();

-- 4. Trigger de synchronisation : membres_personnel -> enseignants
CREATE OR REPLACE FUNCTION public.sync_personnel_to_enseignant()
RETURNS TRIGGER AS $$
BEGIN
  -- Éviter la récursion infinie
  IF pg_trigger_depth() > 1 THEN
    IF (TG_OP = 'DELETE') THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.enseignants WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF (NEW.categorie = 'Enseignant') THEN
      INSERT INTO public.enseignants (
        id, nom, prenom, email, telephone, sexe, matiere_principale, salaire_mensuel, date_embauche, statut, etablissement_id, created_at
      ) VALUES (
        NEW.id, NEW.nom, NEW.prenom, NEW.email, NEW.telephone, NEW.sexe, 'Général', COALESCE(NEW.salaire_de_base, 0), COALESCE(NEW.date_embauche, CURRENT_DATE), COALESCE(NEW.statut, 'actif'), NEW.etablissement_id, NEW.created_at
      ) ON CONFLICT (id) DO UPDATE SET
        nom = EXCLUDED.nom,
        prenom = EXCLUDED.prenom,
        email = EXCLUDED.email,
        telephone = EXCLUDED.telephone,
        sexe = EXCLUDED.sexe,
        salaire_mensuel = EXCLUDED.salaire_mensuel,
        date_embauche = EXCLUDED.date_embauche,
        statut = EXCLUDED.statut;
    ELSE
      DELETE FROM public.enseignants WHERE id = NEW.id;
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_personnel ON public.membres_personnel;
CREATE TRIGGER trg_sync_personnel
  AFTER INSERT OR UPDATE OR DELETE ON public.membres_personnel
  FOR EACH ROW EXECUTE FUNCTION public.sync_personnel_to_enseignant();

-- 5. Migration initiale des enseignants existants dans les effectifs RH
INSERT INTO public.membres_personnel (
  id, nom, prenom, email, telephone, sexe, categorie, type_contrat, salaire_de_base, date_embauche, statut, etablissement_id, created_at
)
SELECT 
  id, nom, prenom, COALESCE(email, id::text || '@mboaschool.internal'), telephone, sexe, 'Enseignant', 'CDI', COALESCE(salaire_mensuel, 0), COALESCE(date_embauche, CURRENT_DATE), COALESCE(statut, 'actif'), etablissement_id, created_at
FROM public.enseignants
ON CONFLICT (id) DO NOTHING;

COMMIT;
`;

async function run() {
  const client = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log("Connected to pooler successfully.");
    console.log("Running migration...");
    await client.query(sql);
    console.log("Migration executed successfully!");
    await client.end();
  } catch (err) {
    console.error("Migration failed:", err.message);
    try { await client.end(); } catch (e) {}
    process.exit(1);
  }
}

run().catch(console.error);
