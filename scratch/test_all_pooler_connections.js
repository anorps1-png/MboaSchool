const { Client } = require('pg');
const fs = require('fs');

const projectRef = 'fjsuhzgvoswdmwaowkcz';
const passwords = ['Deniso67*2025', '[Deniso67*2025]'];
const regions = [
  'eu-central-1', // Frankfurt
  'eu-west-3',    // Paris
  'eu-west-1',    // Ireland
  'eu-west-2',    // London
  'us-east-1',    // N. Virginia
  'us-east-2',    // Ohio
  'us-west-1',    // N. California
  'us-west-2',    // Oregon
  'ap-southeast-1', // Singapore
  'ap-northeast-1', // Tokyo
  'sa-east-1',    // São Paulo
  'af-south-1',   // Cape Town
  'me-central-1'  // Israel
];

const sql = `
-- 1. Nettoyer les politiques si elles existent
DROP POLICY IF EXISTS "Etablissement insert access" ON public.etablissements;
DROP POLICY IF EXISTS "Etablissement update access" ON public.etablissements;
DROP POLICY IF EXISTS "Etablissement delete access" ON public.etablissements;
DROP POLICY IF EXISTS "Classes scope access" ON public.classes;

-- 2. Autoriser la création d'établissements pour les utilisateurs connectés
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

-- 3. Adapter la politique RLS de classes à la colonne réelle
CREATE POLICY "Classes scope access" 
ON public.classes 
TO authenticated 
USING (etablissement_id = public.current_user_etablissement_id())
WITH CHECK (etablissement_id = public.current_user_etablissement_id());

-- 4. Réparer les profils utilisateurs existants
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

async function tryConnection(region, password) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const username = `postgres.${projectRef}`;
  const connectionString = `postgresql://${username}:${encodeURIComponent(password)}@${host}:6543/postgres`;
  
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 5000 // 5 seconds timeout
  });

  try {
    await client.connect();
    console.log(`\n🎉 SUCCESS! Connected to pooler region: ${region} with password: ${password.includes('[') ? '[brackets]' : 'normal'}`);
    console.log("Executing SQL migrations...");
    await client.query(sql);
    console.log("Migrations applied successfully!");
    await client.end();
    return true;
  } catch (err) {
    if (err.message.includes('password authentication failed') || err.message.includes('authentification par mot de passe échoué')) {
      console.log(`❌ Region ${region}: Auth failed (wrong password)`);
    } else {
      console.log(`❌ Error connecting or running query in region ${region}:`, err.message);
    }
    try { await client.end(); } catch (e) {}
    return false;
  }
}

async function run() {
  console.log("Testing pooler connections across all regions...");
  let found = false;
  
  for (const pwd of passwords) {
    console.log(`\nTesting password option: ${pwd.includes('[') ? '[brackets]' : 'normal'}`);
    
    // We run the connection attempts in chunks to avoid rate limiting or too many descriptors
    for (let i = 0; i < regions.length; i += 4) {
      const chunk = regions.slice(i, i + 4);
      const promises = chunk.map(r => tryConnection(r, pwd));
      const results = await Promise.all(promises);
      if (results.some(r => r === true)) {
        found = true;
        break;
      }
    }
    if (found) break;
  }

  if (!found) {
    console.log("\nCould not connect to any pooler region. Please ensure your credentials are correct and that database connections are not blocked.");
  }
}

run().catch(console.error);
