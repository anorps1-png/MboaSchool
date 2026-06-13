const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const supabaseUrl = envContent.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL'))?.split('=')[1]?.trim();
const supabaseKey = envContent.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY'))?.split('=')[1]?.trim();

async function run() {
  const url = `${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`;
  const response = await fetch(url);
  const spec = await response.json();
  console.log("Raw Spec:", spec);
}

run().catch(console.error);
