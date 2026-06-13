const { Client } = require('pg');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const rawDbUrl = envContent.split('\n').find(l => l.startsWith('DATABASE_URL'))?.split('=')[1]?.trim();
const dbUrlWithBrackets = rawDbUrl.replace(':[', ':').replace(']@', '@');

const passwordMatch = dbUrlWithBrackets.match(/:([^:@]+)@/);
const password = passwordMatch ? passwordMatch[1] : '';

const dbUrl = `postgresql://postgres.fjsuhzgvoswdmwaowkcz:${encodeURIComponent(password)}@aws-0-eu-west-3.pooler.supabase.com:6543/postgres`;

const sql = `
-- 1. Add the missing column to etablissements table
ALTER TABLE public.etablissements ADD COLUMN IF NOT EXISTS annee_scolaire_active_id UUID;

-- 2. Add the foreign key constraint safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_annee_active' AND table_name = 'etablissements'
  ) THEN
    ALTER TABLE public.etablissements 
      ADD CONSTRAINT fk_annee_active 
      FOREIGN KEY (annee_scolaire_active_id) 
      REFERENCES public.annees_scolaires(id) ON DELETE SET NULL;
  END IF;
END $$;
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
    console.log("Connected to database. Adding missing column...");

    await client.query(sql);
    console.log("Successfully added column 'annee_scolaire_active_id' and its foreign key constraint!");

    // Verify columns again
    const columnsRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'etablissements'
    `);
    console.log("\n--- Etablissements columns updated ---");
    console.table(columnsRes.rows);

    await client.end();
  } catch (err) {
    console.error("Error executing database update:", err.message);
    try { await client.end(); } catch (e) {}
  }
}

run().catch(console.error);
