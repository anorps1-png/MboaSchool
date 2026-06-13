const anonKey = 'sb_publishable_1rB6bxWaJBxJjGe3HIj_VA_HyGcL1sY';
const supabaseUrl = 'https://fjsuhzgvoswdmwaowkcz.supabase.co';
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(supabaseUrl, anonKey);

async function run() {
  const studentId = '7e16f8ad-9e06-481c-867b-a732d65362bc';
  
  console.log('Querying student with discipline...');
  const { data, error } = await supabase
    .from('eleves')
    .select('*, paiements(*), notes(*), discipline(*)')
    .eq('id', studentId)
    .single();
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success! Student:', data);
  }
}

run().catch(err => console.error(err));
