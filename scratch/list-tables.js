const anonKey = 'sb_publishable_1rB6bxWaJBxJjGe3HIj_VA_HyGcL1sY';
const supabaseUrl = 'https://fjsuhzgvoswdmwaowkcz.supabase.co';

async function listTables() {
  const url = `${supabaseUrl}/rest/v1/`;
  const res = await fetch(url, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch schema: ${res.statusText}`);
  }

  const spec = await res.json();
  const paths = Object.keys(spec.paths || {});
  console.log("Found endpoints/tables:");
  const tables = paths
    .filter(p => p !== '/' && !p.startsWith('/rpc/'))
    .map(p => p.replace(/^\//, ''));
  console.log(tables);
}

listTables().catch(err => console.error(err));
