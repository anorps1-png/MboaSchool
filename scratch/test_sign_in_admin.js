const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const supabaseUrl = envContent.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL'))?.split('=')[1]?.trim();
const supabaseKey = envContent.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY'))?.split('=')[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function test(email, password) {
  console.log(`Trying ${email} with password ${password}...`);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.log(`Failed: ${error.message}`);
    return null;
  }
  console.log(`SUCCESS! Signed in as ${email}`);
  return data.session;
}

async function run() {
  const passwords = ['admin123', 'admin', 'password', 'password123', '123456', 'mboaschool'];
  for (const email of ['admin@mboaschool.com', 'directeur@mboaschool.com']) {
    for (const pwd of passwords) {
      const session = await test(email, pwd);
      if (session) {
        // Log user details
        console.log("User metadata:", session.user);
        
        // Fetch profiles
        const authSupabase = createClient(supabaseUrl, supabaseKey);
        await authSupabase.auth.setSession(session);
        
        const { data: profile, error: pErr } = await authSupabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        console.log("Profile:", profile, pErr);
        
        // Fetch etablissements
        const { data: etabs, error: eErr } = await authSupabase
          .from('etablissements')
          .select('*');
        console.log("Etablissements read access test:", etabs, eErr);
        
        return;
      }
    }
  }
}

run().catch(console.error);
