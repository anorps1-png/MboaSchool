const anonKey = 'sb_publishable_1rB6bxWaJBxJjGe3HIj_VA_HyGcL1sY';
const supabaseUrl = 'https://fjsuhzgvoswdmwaowkcz.supabase.co';
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(supabaseUrl, anonKey);

async function run() {
  console.log('--- Testing classes join with enseignants ---');
  
  // Test syntax 1: using column name
  const { data: data1, error: err1 } = await supabase
    .from('classes')
    .select('*, enseignants!enseignant_principal_id(nom, prenom)')
    .limit(1);

  if (err1) {
    console.error('Syntax 1 failed:', err1.message);
  } else {
    console.log('Syntax 1 succeeded!', data1);
  }

  // Test syntax 2: using table name only (ambiguous)
  const { data: data2, error: err2 } = await supabase
    .from('classes')
    .select('*, enseignants(nom, prenom)')
    .limit(1);

  if (err2) {
    console.error('Syntax 2 failed:', err2.message);
  } else {
    console.log('Syntax 2 succeeded!', data2);
  }
}

run().catch(err => console.error(err));
