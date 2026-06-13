const anonKey = 'sb_publishable_1rB6bxWaJBxJjGe3HIj_VA_HyGcL1sY';
const supabaseUrl = 'https://fjsuhzgvoswdmwaowkcz.supabase.co';
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(supabaseUrl, anonKey);

async function run() {
  console.log('--- Fetching classes row ---');
  const { data: classes, error: errClasses } = await supabase
    .from('classes')
    .select('*')
    .limit(1);
  if (errClasses) console.error('classes Error:', errClasses);
  else console.log('classes row keys:', Object.keys(classes[0] || {}), classes[0]);

  console.log('\n--- Fetching enseignants row ---');
  const { data: teachers, error: errTeachers } = await supabase
    .from('enseignants')
    .select('*')
    .limit(1);
  if (errTeachers) console.error('enseignants Error:', errTeachers);
  else console.log('enseignants row keys:', Object.keys(teachers[0] || {}), teachers[0]);
}

run().catch(err => console.error(err));
