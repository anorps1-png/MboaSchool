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
    
    // 1. Fetch details of establishments
    const etabRes = await client.query('SELECT * FROM public.etablissements');
    console.log("\n--- Etablissements ---");
    console.log(etabRes.rows);

    // 2. Fetch academic years
    const yearsRes = await client.query('SELECT * FROM public.annees_scolaires');
    console.log("\n--- Annees Scolaires ---");
    console.log(yearsRes.rows);

    await client.end();
  } catch (err) {
    console.error("Error:", err.message);
    try { await client.end(); } catch (e) {}
  }
}

run().catch(console.error);
