const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const supabaseUrl = envContent.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL'))?.split('=')[1]?.trim();
const supabaseKey = envContent.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY'))?.split('=')[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = `test_${Math.floor(Math.random() * 100000)}@gmail.com`;
  const password = 'password123';

  console.log("1. Signing up a test user...");
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password
  });

  if (signUpError) {
    console.error("Sign up failed:", signUpError);
    return;
  }
  
  const user = signUpData.user;
  console.log("User signed up successfully. User ID:", user.id);

  // Sign in explicitly to make sure we have a session
  console.log("2. Signing in...");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (signInError) {
    console.error("Sign in failed:", signInError);
    return;
  }
  
  // Create a new client with the user's session/token to be safe
  const authSupabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false
    }
  });
  await authSupabase.auth.setSession(signInData.session);

  // Let's create an etablissement
  console.log("3. Creating etablissement...");
  const { data: etabData, error: etabError } = await authSupabase
    .from('etablissements')
    .insert([{ nom: "Test School RLS", seuil_reussite: 10 }])
    .select();
  
  console.log("Etablissement result:", etabData, etabError);

  let etablissementId = null;
  if (etabData && etabData[0]) {
    etablissementId = etabData[0].id;
  } else {
    // If it failed because of RLS on etablissements, let's try to query if we can insert profiles
    console.log("Inserting profile without etablissement_id...");
  }

  // Create a profile for the user
  console.log("4. Creating user profile...");
  const { data: profileData, error: profileError } = await authSupabase
    .from('profiles')
    .insert([{
      id: user.id,
      email,
      role: 'admin',
      etablissement_id: etablissementId
    }])
    .select();
  console.log("Profile result:", profileData, profileError);

  // Let's try inserting a class
  console.log("5. Creating a class...");
  const { data: classData, error: classError } = await authSupabase
    .from('classes')
    .insert([{
      nom: "Test RLS Class",
      niveau: "Test Niveau",
      section: "Francophone",
      prix: 1000,
      etablissement_id: etablissementId
    }])
    .select();
  console.log("Class creation result:", classData, classError);
}

run().catch(console.error);
