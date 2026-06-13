const anonKey = 'sb_publishable_1rB6bxWaJBxJjGe3HIj_VA_HyGcL1sY';
const supabaseUrl = 'https://fjsuhzgvoswdmwaowkcz.supabase.co';
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(supabaseUrl, anonKey);

async function run() {
  console.log('--- Checking for partenaire column ---');
  const { data, error } = await supabase
    .from('ecritures_comptables')
    .select('partenaire')
    .limit(1);

  if (error) {
    console.error('Error querying partenaire:', error.message);
  } else {
    console.log('Success! Column exists. Data:', data);
  }
}

run().catch(err => console.error(err));
