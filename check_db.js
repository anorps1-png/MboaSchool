require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: eleves, error: elevesError } = await supabase.from('eleves').select('id, nom').limit(1);
  console.log("Eleves:", eleves, elevesError);

  if (eleves && eleves.length > 0) {
    const eleveId = eleves[0].id;
    const { data: pay, error: payError } = await supabase.from('paiements').insert([{
      eleve_id: eleveId,
      montant: 100,
      date: new Date().toISOString().split('T')[0],
      type_frais: 'Scolarité',
      mode_paiement: 'Espèces',
      statut: 'paid',
      reference: `TEST-${Date.now()}`
    }]).select();
    
    console.log("Paiement Insert Result:", pay, payError);
  }
}

check();
