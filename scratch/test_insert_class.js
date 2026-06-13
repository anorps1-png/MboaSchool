const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjsuhzgvoswdmwaowkcz.supabase.co';
const supabaseKey = 'sb_publishable_1rB6bxWaJBxJjGe3HIj_VA_HyGcL1sY'; // anon key

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching establishments...");
  const { data: etabs, error: etabError } = await supabase
    .from('etablissements')
    .select('id, nom');
  
  if (etabError) {
    console.error("Error fetching establishments:", etabError);
    return;
  }
  
  console.log("Establishments found:", etabs);
  if (!etabs || etabs.length === 0) {
    console.log("No establishment found.");
    return;
  }
  
  const etabId = etabs[0].id;
  console.log(`Inserting test class for establishment: ${etabId}`);
  
  const { data: newClass, error: classError } = await supabase
    .from('classes')
    .insert([{
      nom: `Classe de Test ${Date.now()}`,
      niveau: '6ème',
      section: 'Francophone',
      prix: 50000,
      etablissement_id: etabId
    }])
    .select();
    
  if (classError) {
    console.error("Error inserting class:", classError);
  } else {
    console.log("Class inserted successfully:", newClass);
    
    // Now delete it to clean up
    console.log("Deleting test class...");
    const { error: delError } = await supabase
      .from('classes')
      .delete()
      .eq('id', newClass[0].id);
    if (delError) console.error("Error deleting test class:", delError);
    else console.log("Cleaned up successfully.");
  }
}

run().catch(console.error);
