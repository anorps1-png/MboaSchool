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

-- Ensure the 2025/2026 year exists
INSERT INTO public.annees_scolaires (nom, date_debut, date_fin)
VALUES ('2025/2026', '2025-09-01', '2026-06-30')
ON CONFLICT DO NOTHING;

-- Link active year to any etablissements that have it as NULL
DO $$
DECLARE
  default_year_id UUID;
BEGIN
  -- Get the ID of the '2025/2026' year
  SELECT id INTO default_year_id FROM public.annees_scolaires WHERE nom = '2025/2026' LIMIT 1;
  
  -- If not found, get any year
  IF default_year_id IS NULL THEN
    SELECT id INTO default_year_id FROM public.annees_scolaires LIMIT 1;
  END IF;
  
  -- If we have a year, update all etablissements where it is null
  IF default_year_id IS NOT NULL THEN
    UPDATE public.etablissements SET annee_scolaire_active_id = default_year_id WHERE annee_scolaire_active_id IS NULL;
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
    console.log("Running backfill...");
    await client.query(sql);
    console.log("Backfill executed successfully!");
    await client.end();
  } catch (err) {
    console.error("Backfill failed:", err.message);
    try { await client.end(); } catch (e) {}
    process.exit(1);
  }
}

run().catch(console.error);
