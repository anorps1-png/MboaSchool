const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const supabaseUrl = envContent.split('\n').find(l => l.includes('NEXT_PUBLIC_SUPABASE_URL'))?.split('=')[1]?.trim();
const supabaseKey = envContent.split('\n').find(l => l.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'))?.split('=')[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  // Try signing in
  const credentials = [
    { email: 'admin@mboaschool.com', password: 'password' },
    { email: 'directeur@mboaschool.com', password: 'password' },
    { email: 'admin@mboaschool.com', password: 'admin' },
    { email: 'directeur@mboaschool.com', password: 'directeur' }
  ];

  let sessionUser = null;
  for (const cred of credentials) {
    console.log(`Trying login with ${cred.email}...`);
    const { data, error } = await supabase.auth.signInWithPassword(cred);
    if (!error && data.user) {
      console.log(`Logged in successfully as ${cred.email}!`);
      sessionUser = data.user;
      break;
    } else {
      console.log(`Failed for ${cred.email}:`, error?.message);
    }
  }

  if (!sessionUser) {
    console.log("Could not log in with demo credentials. Let's try selecting public info.");
  }

  // Inspect tables
  const { data: etabs } = await supabase.from('etablissements').select('*');
  console.log("Etablissements (Auth):", etabs);

  const { data: years } = await supabase.from('annees_scolaires').select('*');
  console.log("Annees Scolaires (Auth):", years);

  const { data: classes } = await supabase.from('classes').select('*');
  console.log("Classes (Auth):", classes);
}

test();
