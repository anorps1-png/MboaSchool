const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const supabaseUrl = envContent.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL'))?.split('=')[1]?.trim();
const supabaseKey = envContent.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY'))?.split('=')[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // 1. Try to fetch a single profile to see the user context
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').limit(5);
  console.log("Profiles in DB:", profiles, pErr);

  // 2. Fetch sections
  const { data: sections, error: sErr } = await supabase.from('sections').select('*');
  console.log("Sections in DB:", sections, sErr);

  // 3. Fetch niveaux_classes
  const { data: niveaux, error: nErr } = await supabase.from('niveaux_classes').select('*');
  console.log("Niveaux classes in DB:", niveaux, nErr);

  // 4. Try doing an insert on classes with mock data to see error details or what columns exist
  const { data: testClass, error: cErr } = await supabase.from('classes').insert([{
    nom: 'Test Class 1',
    // We try writing both formats to see what works or what the database rejects
  }]).select();
  console.log("Insert test class (empty fields) error:", cErr);
}

run();
