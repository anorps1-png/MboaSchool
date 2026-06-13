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

-- 2. Création de la fonction et du trigger de suppression automatique de l'authentification
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
