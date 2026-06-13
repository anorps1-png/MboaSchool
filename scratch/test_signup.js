const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjsuhzgvoswdmwaowkcz.supabase.co';
const supabaseKey = 'sb_publishable_1rB6bxWaJBxJjGe3HIj_VA_HyGcL1sY'; // anon key

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = `test-user-${Date.now()}@gmail.com`;
  const password = 'test-password-123';
  console.log(`Attempting signup for: ${email}`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        school_name: 'Lycée de Test',
        school_year: '2025/2026'
      }
    }
  });

  if (error) {
    console.error("Signup failed with error:", error);
  } else {
    console.log("Signup succeeded with data:", JSON.stringify(data, null, 2));
  }
}

run().catch(console.error);
