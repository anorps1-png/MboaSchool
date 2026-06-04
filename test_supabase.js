const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read env variables manually
const envContent = fs.readFileSync('.env.local', 'utf-8');
const supabaseUrl = envContent.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL'))?.split('=')[1]?.trim();
const supabaseKey = envContent.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY'))?.split('=')[1]?.trim();

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing Supabase connection to:", supabaseUrl);
  
  // Set a timeout to prevent hanging forever
  const timeoutId = setTimeout(() => {
    console.error("Connection timed out after 10 seconds!");
    process.exit(1);
  }, 10000);

  const { data, error } = await supabase.from('classes').select('*').limit(1);
  clearTimeout(timeoutId);
  
  if (error) {
    console.error("Error connecting to Supabase:", error);
  } else {
    console.log("Successfully connected! Data:", data);
  }
}

test();
