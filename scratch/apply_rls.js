const fs = require('fs');
const { execSync } = require('child_process');

// 1. Programmatically install 'pg' if not already installed
try {
  require.resolve('pg');
} catch (e) {
  console.log("Installing 'pg' package to interact with the database...");
  execSync('npm install pg', { stdio: 'inherit' });
}

const { Client } = require('pg');

// 2. Read database URL from .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const rawDbUrl = envContent.split('\n').find(l => l.startsWith('DATABASE_URL'))?.split('=')[1]?.trim();

if (!rawDbUrl) {
  console.error("Could not find DATABASE_URL in .env.local");
  process.exit(1);
}

const sql = `
-- 1. Autoriser la création d'établissements pour les utilisateurs connectés
CREATE POLICY "Etablissement insert access" 
ON public.etablissements 
FOR INSERT 
TO authenticated 
WITH CHECK (TRUE);

CREATE POLICY "Etablissement update access" 
ON public.etablissements 
FOR UPDATE 
TO authenticated 
USING (id = public.current_user_etablissement_id());

CREATE POLICY "Etablissement delete access" 
ON public.etablissements 
FOR DELETE 
TO authenticated 
USING (id = public.current_user_etablissement_id());

-- 2. Adapter la politique RLS de classes à la colonne réelle
DROP POLICY IF EXISTS "Classes scope access" ON public.classes;

CREATE POLICY "Classes scope access" 
ON public.classes 
TO authenticated 
USING (etablissement_id = public.current_user_etablissement_id())
WITH CHECK (etablissement_id = public.current_user_etablissement_id());

-- 3. Réparer les profils utilisateurs existants
DO $$
DECLARE
  default_etab_id UUID := 'd3b07384-d113-4ee7-a496-c67b8a74e50d';
BEGIN
  INSERT INTO public.etablissements (id, nom, seuil_reussite)
  VALUES (default_etab_id, 'Mon Établissement', 10)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.profiles
  SET etablissement_id = default_etab_id
  WHERE etablissement_id IS NULL;
END $$;
`;

async function tryConnectAndRun(dbUrl) {
  const client = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log("Connected successfully to PostgreSQL database!");
    console.log("Executing SQL migrations...");
    const res = await client.query(sql);
    console.log("Migrations applied successfully!");
    await client.end();
    return true;
  } catch (err) {
    console.error("Connection failed with URL:", dbUrl.replace(/:([^:@]+)@/, ':****@'), "\nError:", err.message);
    try { await client.end(); } catch (e) {}
    return false;
  }
}

async function run() {
  // Try with brackets first
  let success = await tryConnectAndRun(rawDbUrl);
  
  if (!success && rawDbUrl.includes('[') && rawDbUrl.includes(']')) {
    // If it fails and has brackets, try stripping them from the password
    console.log("\nTrying again by stripping brackets from the password...");
    const strippedDbUrl = rawDbUrl.replace(':[', ':').replace(']@', '@');
    success = await tryConnectAndRun(strippedDbUrl);
  }

  if (success) {
    console.log("\nDatabase migration completed successfully!");
  } else {
    console.error("\nCould not connect to database. Please check your credentials.");
  }
}

run().catch(console.error);
