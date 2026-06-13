const { Client } = require('pg');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const rawDbUrl = envContent.split('\n').find(l => l.startsWith('DATABASE_URL'))?.split('=')[1]?.trim();
const dbUrlWithBrackets = rawDbUrl.replace(':[', ':').replace(']@', '@');

const passwordMatch = dbUrlWithBrackets.match(/:([^:@]+)@/);
const password = passwordMatch ? passwordMatch[1] : '';

const dbUrl = `postgresql://postgres.fjsuhzgvoswdmwaowkcz:${encodeURIComponent(password)}@aws-0-eu-west-3.pooler.supabase.com:6543/postgres`;

async function run() {
  const client = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log("Connected to database. Fixing missing profiles...");

    // 1. Ensure the default establishment exists
    const defaultEtabId = 'd3b07384-d113-4ee7-a496-c67b8a74e50d';
    await client.query(`
      INSERT INTO public.etablissements (id, nom, seuil_reussite)
      VALUES ($1, 'Établissement Principal', 10)
      ON CONFLICT (id) DO NOTHING
    `, [defaultEtabId]);
    console.log("Default establishment verified.");

    // 2. Insert missing profiles
    const insertRes = await client.query(`
      INSERT INTO public.profiles (id, email, role, etablissement_id)
      SELECT id, email, 'admin', $1
      FROM auth.users
      ON CONFLICT (id) DO UPDATE 
      SET etablissement_id = COALESCE(public.profiles.etablissement_id, $1)
    `, [defaultEtabId]);
    
    console.log(`Profiles updated. Rows affected: ${insertRes.rowCount}`);

    // Double check profiles
    const profilesRes = await client.query(`
      SELECT id, email, role, etablissement_id 
      FROM public.profiles
    `);
    console.log("\n--- Updated Profiles ---");
    console.table(profilesRes.rows);

    await client.end();
  } catch (err) {
    console.error("Error executing profile fixes:", err.message);
    try { await client.end(); } catch (e) {}
  }
}

run().catch(console.error);
