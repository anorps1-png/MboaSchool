const { Client } = require('pg');

const projectRef = 'fjsuhzgvoswdmwaowkcz';
const password = 'Deniso67*2025';
const host = 'aws-0-eu-west-3.pooler.supabase.com';
const connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@${host}:6543/postgres`;

async function run() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    
    // 1. Query auth.users
    const usersRes = await client.query(`
      SELECT id, email, email_confirmed_at, created_at, last_sign_in_at 
      FROM auth.users 
      ORDER BY created_at DESC
    `);
    console.log("\n--- Users in auth.users ---");
    console.table(usersRes.rows);

    // 2. Query public.profiles
    const profilesRes = await client.query(`
      SELECT id, email, role, etablissement_id, created_at 
      FROM public.profiles 
      ORDER BY created_at DESC
    `);
    console.log("\n--- Profiles in public.profiles ---");
    console.table(profilesRes.rows);

    // 3. Query public.etablissements
    const etabsRes = await client.query(`
      SELECT id, nom, created_at 
      FROM public.etablissements
    `);
    console.log("\n--- Establishments in public.etablissements ---");
    console.table(etabsRes.rows);

    await client.end();
  } catch (err) {
    console.error("Error running query:", err.message);
    try { await client.end(); } catch (e) {}
  }
}

run().catch(console.error);
