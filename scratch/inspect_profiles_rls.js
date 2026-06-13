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
    
    // Check if rowsecurity is enabled
    const securityRes = await client.query(`
      SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity 
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'profiles'
    `);
    console.log("\n--- Row Security on profiles ---");
    console.table(securityRes.rows);

    // Check all policies for public.profiles
    const policiesRes = await client.query(`
      SELECT policyname, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'profiles'
    `);
    console.log("\n--- Policies on profiles ---");
    console.table(policiesRes.rows);

    await client.end();
  } catch (err) {
    console.error("Error:", err.message);
    try { await client.end(); } catch (e) {}
  }
}

run().catch(console.error);
