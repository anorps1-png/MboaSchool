const anonKey = 'sb_publishable_1rB6bxWaJBxJjGe3HIj_VA_HyGcL1sY';
const supabaseUrl = 'https://fjsuhzgvoswdmwaowkcz.supabase.co';
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(supabaseUrl, anonKey);

const tables = [
  'etablissements',
  'profiles',
  'sections',
  'annees_scolaires',
  'niveaux_classes',
  'enseignants',
  'classes',
  'matieres',
  'eleves',
  'notes',
  'bulletins',
  'discipline',
  'discipline_incidents',
  'qhse_incidents',
  'qhse_reunions',
  'qhse_depenses',
  'qhse_evaluations',
  'enquetes',
  'enquetes_historique',
  'comptes_ohada',
  'ecritures_comptables',
  'lignes_ecritures',
  'membres_personnel',
  'absences_personnel',
  'mouvements_personnel',
  'evaluations_rh',
  'formations_rh',
  'paiements'
];

async function check() {
  console.log("Checking tables existence...");
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(0);
    if (error && error.code === 'PGRST205') {
      console.log(`❌ Table '${table}' does NOT exist`);
    } else if (error) {
      console.log(`⚠️ Table '${table}' exists but query failed with code: ${error.code} (${error.message})`);
    } else {
      console.log(`✅ Table '${table}' exists`);
    }
  }
}

check().catch(err => console.error(err));
