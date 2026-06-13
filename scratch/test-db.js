const anonKey = 'sb_publishable_1rB6bxWaJBxJjGe3HIj_VA_HyGcL1sY';
const supabaseUrl = 'https://fjsuhzgvoswdmwaowkcz.supabase.co';
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(supabaseUrl, anonKey);

async function run() {
  console.log('--- Querying comptes_ohada ---');
  const { data: accounts, error: errAccounts } = await supabase
    .from('comptes_ohada')
    .select('*')
    .limit(5);
  
  if (errAccounts) {
    console.error('comptes_ohada Error:', errAccounts);
  } else {
    console.log('comptes_ohada Success! Count:', accounts.length, accounts);
  }

  console.log('\n--- Querying profiles ---');
  const { data: profiles, error: errProfiles } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);
  if (errProfiles) console.error('profiles Error:', errProfiles);
  else console.log('profiles Success! Keys:', Object.keys(profiles[0] || {}));

  console.log('\n--- Querying eleves ---');
  const { data: eleves, error: errEleves } = await supabase
    .from('eleves')
    .select('*')
    .limit(1);
  if (errEleves) console.error('eleves Error:', errEleves);
  else console.log('eleves Success! Keys:', Object.keys(eleves[0] || {}));
}

run().catch(err => console.error(err));
