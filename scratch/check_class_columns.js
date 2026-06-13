const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const supabaseUrl = envContent.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL'))?.split('=')[1]?.trim();
const supabaseKey = envContent.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY'))?.split('=')[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Try selecting columns from the schema.sql definition
  const { data: schemaCols, error: schemaErr } = await supabase
    .from('classes')
    .select('id, nom, niveau_id, annee_scolaire_id, prix')
    .limit(1);
  console.log("Schema.sql columns check:", { data: schemaCols, error: schemaErr });

  // Try selecting columns from the frontend's page.tsx insert/select structure
  const { data: frontendCols, error: frontendErr } = await supabase
    .from('classes')
    .select('id, nom, niveau, section, etablissement_id')
    .limit(1);
  console.log("Frontend columns check:", { data: frontendCols, error: frontendErr });
}

run().catch(console.error);
