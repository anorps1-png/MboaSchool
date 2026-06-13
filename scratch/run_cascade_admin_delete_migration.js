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

-- Mise à jour de la fonction de suppression pour cascader aux sous-comptes si c'est un administrateur
CREATE OR REPLACE FUNCTION public.handle_delete_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le compte supprimé est un administrateur, supprimer tous les autres profils de son établissement
  IF OLD.role = 'admin' THEN
    DELETE FROM public.profiles WHERE etablissement_id = OLD.etablissement_id AND id != OLD.id;
  END IF;

  -- Supprimer l'utilisateur correspondant dans auth.users
  DELETE FROM auth.users WHERE id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
