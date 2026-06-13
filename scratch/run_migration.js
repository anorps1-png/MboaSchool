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

-- 1. Nettoyage des anciennes politiques sur la table profiles
DROP POLICY IF EXISTS "Profile user access" ON public.profiles;
DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insert policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles delete policy" ON public.profiles;

-- 2. Création des politiques RLS adaptées sur la table profiles
CREATE POLICY "Profiles select policy" ON public.profiles 
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR etablissement_id = public.current_user_etablissement_id());

CREATE POLICY "Profiles insert policy" ON public.profiles 
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR etablissement_id = public.current_user_etablissement_id());

CREATE POLICY "Profiles update policy" ON public.profiles 
  FOR UPDATE TO authenticated
  USING (etablissement_id = public.current_user_etablissement_id())
  WITH CHECK (etablissement_id = public.current_user_etablissement_id());

CREATE POLICY "Profiles delete policy" ON public.profiles 
  FOR DELETE TO authenticated
  USING (etablissement_id = public.current_user_etablissement_id());

-- 3. Mise à jour de la table enseignants avec les colonnes attendues par le frontend
ALTER TABLE public.enseignants ADD COLUMN IF NOT EXISTS matricule TEXT;
ALTER TABLE public.enseignants ADD COLUMN IF NOT EXISTS sexe TEXT CHECK (sexe IN ('M', 'F'));
ALTER TABLE public.enseignants ADD COLUMN IF NOT EXISTS matiere_principale TEXT;
ALTER TABLE public.enseignants ADD COLUMN IF NOT EXISTS salaire_mensuel NUMERIC DEFAULT 0;
ALTER TABLE public.enseignants ADD COLUMN IF NOT EXISTS date_embauche DATE DEFAULT CURRENT_DATE;

-- Migration des données existantes (genre -> sexe)
UPDATE public.enseignants SET sexe = genre WHERE sexe IS NULL AND genre IS NOT NULL;

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
