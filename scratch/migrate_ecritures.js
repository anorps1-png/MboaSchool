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

-- Add etablissement_id and partenaire to ecritures_comptables
ALTER TABLE public.ecritures_comptables ADD COLUMN IF NOT EXISTS etablissement_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE;
ALTER TABLE public.ecritures_comptables ADD COLUMN IF NOT EXISTS partenaire TEXT;

-- Backfill existing entries with the first available etablissement_id
DO $$
DECLARE
  default_etab_id UUID;
BEGIN
  SELECT id INTO default_etab_id FROM public.etablissements LIMIT 1;
  IF default_etab_id IS NOT NULL THEN
    UPDATE public.ecritures_comptables SET etablissement_id = default_etab_id WHERE etablissement_id IS NULL;
  END IF;
END $$;

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
