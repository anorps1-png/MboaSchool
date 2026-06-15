const { Client } = require('pg');

const projectRef = 'fjsuhzgvoswdmwaowkcz';
const password = 'Deniso67*2025';
const host = 'aws-0-eu-west-3.pooler.supabase.com';
const connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@${host}:6543/postgres`;

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query("SELECT * FROM pg_policies WHERE tablename = 'classes'");
    console.log("Classes policies:");
    console.table(res.rows);
    await client.end();
  } catch (err) {
    console.error("Failed:", err.message);
    try { await client.end(); } catch (e) {}
  }
}

run().catch(console.error);
