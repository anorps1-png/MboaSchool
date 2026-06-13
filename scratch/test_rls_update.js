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
    
    // Begin a transaction to simulate the user session
    await client.query('BEGIN');
    
    // Set the claims to simulate the logged-in user: anorp200@yahoo.fr (c62d1ddf-9f26-4174-95ca-7de754d454a3)
    const userId = 'c62d1ddf-9f26-4174-95ca-7de754d454a3';
    await client.query(`
      SELECT set_config('request.jwt.claims', $1, true)
    `, [JSON.stringify({ sub: userId, role: 'authenticated' })]);

    console.log("Simulating update query as user...");
    const updateRes = await client.query(`
      UPDATE public.etablissements 
      SET nom = 'Établissement Principal Test' 
      WHERE id = 'd3b07384-d113-4ee7-a496-c67b8a74e50d'
    `);
    
    console.log("Update success! Rows affected:", updateRes.rowCount);
    
    // Rollback so we don't accidentally save this test name
    await client.query('ROLLBACK');
    await client.end();
  } catch (err) {
    console.error("Simulation failed. PostgreSQL Error:", err.message);
    try {
      await client.query('ROLLBACK');
      await client.end();
    } catch (e) {}
  }
}

run().catch(console.error);
