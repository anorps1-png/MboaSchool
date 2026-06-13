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
    
    const policiesRes = await client.query(`
      SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename IN ('etablissements', 'profiles', 'classes')
      ORDER BY tablename, cmd
    `);
    
    console.log("\n--- Active RLS Policies ---");
    console.table(policiesRes.rows.map(p => ({
      table: p.tablename,
      name: p.policyname,
      cmd: p.cmd,
      roles: p.roles,
      using: p.qual,
      with_check: p.with_check
    })));

    await client.end();
  } catch (err) {
    console.error("Error fetching policies:", err.message);
    try { await client.end(); } catch (e) {}
  }
}

run().catch(console.error);
