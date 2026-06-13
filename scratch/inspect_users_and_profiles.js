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
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to database.");

    // 1. Fetch users from auth.users
    console.log("\n--- auth.users ---");
    const usersRes = await client.query('SELECT id, email, created_at, last_sign_in_at, email_confirmed_at, raw_user_meta_data FROM auth.users ORDER BY created_at DESC LIMIT 10');
    usersRes.rows.forEach(r => {
      console.log(`ID: ${r.id} | Email: ${r.email} | Confirmed: ${r.email_confirmed_at} | Meta: ${JSON.stringify(r.raw_user_meta_data)}`);
    });

    // 2. Fetch profiles from public.profiles
    console.log("\n--- public.profiles ---");
    const profilesRes = await client.query('SELECT id, email, role, etablissement_id, nom_complet, created_at FROM public.profiles ORDER BY created_at DESC LIMIT 10');
    profilesRes.rows.forEach(r => {
      console.log(`ID: ${r.id} | Email: ${r.email} | Role: ${r.role} | EtabID: ${r.etablissement_id} | Name: ${r.nom_complet}`);
    });

    // 3. Fetch etablissements
    console.log("\n--- public.etablissements ---");
    const etabRes = await client.query('SELECT id, nom, annee_scolaire_active_id FROM public.etablissements LIMIT 10');
    etabRes.rows.forEach(r => {
      console.log(`ID: ${r.id} | Name: ${r.nom} | ActiveYearID: ${r.annee_scolaire_active_id}`);
    });

    // 4. Check if there are any orphaned profiles or users
    console.log("\n--- Orphans or Mismatches ---");
    const orphans = await client.query(`
      SELECT u.id, u.email 
      FROM auth.users u 
      LEFT JOIN public.profiles p ON u.id = p.id 
      WHERE p.id IS NULL
    `);
    console.log(`Users without profile: ${orphans.rows.length}`);
    orphans.rows.forEach(r => console.log(`- ${r.email} (${r.id})`));

    await client.end();
  } catch (err) {
    console.error("Failed:", err.message);
    try { await client.end(); } catch (e) {}
  }
}

run().catch(console.error);
