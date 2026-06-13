const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const supabaseUrl = envContent.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL'))?.split('=')[1]?.trim();
const supabaseKey = envContent.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY'))?.split('=')[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable(tableName) {
  const { data, error } = await supabase.from(tableName).select('*').limit(1);
  if (error) {
    console.log(`Table ${tableName} SELECT * error:`, error.message);
  } else {
    console.log(`Table ${tableName} exists. Columns:`, data.length > 0 ? Object.keys(data[0]) : "No rows, cannot verify columns directly");
  }
}

async function run() {
  const tables = ['etablissements', 'profiles', 'sections', 'niveaux_classes', 'eleves', 'paiements', 'classes'];
  for (const t of tables) {
    await checkTable(t);
  }
}

run().catch(console.error);
