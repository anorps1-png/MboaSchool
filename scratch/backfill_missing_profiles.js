const { Client } = require('pg');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const rawDbUrl = envContent.split('\n').find(l => l.startsWith('DATABASE_URL'))?.split('=')[1]?.trim();
const dbUrlWithBrackets = rawDbUrl.replace(':[', ':').replace(']@', '@');

const passwordMatch = dbUrlWithBrackets.match(/:([^:@]+)@/);
const password = passwordMatch ? passwordMatch[1] : '';

const dbUrl = `postgresql://postgres.fjsuhzgvoswdmwaowkcz:${encodeURIComponent(password)}@aws-0-eu-west-3.pooler.supabase.com:6543/postgres`;

const sql = `
DO $$
DECLARE
  u RECORD;
  new_etab_id UUID;
  new_annee_id UUID;
  meta_school_name TEXT;
  meta_school_year TEXT;
  meta_etab_id_str TEXT;
BEGIN
  FOR u IN 
    SELECT id, email, raw_user_meta_data 
    FROM auth.users 
    WHERE id NOT IN (SELECT id FROM public.profiles)
  LOOP
    meta_etab_id_str := u.raw_user_meta_data->>'etablissement_id';
    
    IF meta_etab_id_str IS NOT NULL THEN
      -- Collaborateur
      RAISE NOTICE 'Backfilling collaborator profile for %', u.email;
      INSERT INTO public.profiles (id, email, role, etablissement_id, permissions, nom_complet, created_at)
      VALUES (
        u.id,
        u.email,
        COALESCE(u.raw_user_meta_data->>'role', 'enseignant'),
        meta_etab_id_str::UUID,
        COALESCE(u.raw_user_meta_data->'permissions', '{}'::jsonb),
        u.raw_user_meta_data->>'nom_complet',
        NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    ELSE
      -- Administrateur
      RAISE NOTICE 'Backfilling admin profile and establishment for %', u.email;
      meta_school_name := COALESCE(u.raw_user_meta_data->>'school_name', 'Mon Établissement');
      meta_school_year := COALESCE(u.raw_user_meta_data->>'school_year', '2025/2026');
      
      -- Créer l'établissement
      INSERT INTO public.etablissements (nom, seuil_reussite)
      VALUES (meta_school_name, 10)
      RETURNING id INTO new_etab_id;
      
      -- Créer l'année scolaire active
      INSERT INTO public.annees_scolaires (nom, date_debut, date_fin)
      VALUES (meta_school_year, (split_part(meta_school_year, '/', 1) || '-09-01')::DATE, (split_part(meta_school_year, '/', 2) || '-06-30')::DATE)
      RETURNING id INTO new_annee_id;
      
      -- Associer l'année
      UPDATE public.etablissements 
      SET annee_scolaire_active_id = new_annee_id 
      WHERE id = new_etab_id;
      
      -- Créer le profil
      INSERT INTO public.profiles (id, email, role, etablissement_id, nom_complet, created_at)
      VALUES (u.id, u.email, 'admin', new_etab_id, u.raw_user_meta_data->>'nom_complet', NOW())
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;
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
    console.log("Running backfill migration...");
    const res = await client.query(sql);
    console.log("Backfill migration executed successfully!");
    await client.end();
  } catch (err) {
    console.error("Backfill failed:", err.message);
    try { await client.end(); } catch (e) {}
    process.exit(1);
  }
}

run().catch(console.error);
