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
