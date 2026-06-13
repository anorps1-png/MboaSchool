const dns = require('dns').promises;

const projectRef = 'fjsuhzgvoswdmwaowkcz';
const regions = [
  'eu-central-1', // Frankfurt
  'eu-west-3',    // Paris
  'eu-west-1',    // Ireland
  'eu-west-2',    // London
  'us-east-1',    // N. Virginia
  'us-east-2',    // Ohio
  'us-west-1',    // N. California
  'us-west-2',    // Oregon
  'ap-southeast-1', // Singapore
  'ap-northeast-1', // Tokyo
  'sa-east-1',    // São Paulo
  'af-south-1',   // Cape Town
  'me-central-1'  // Israel
];

async function run() {
  console.log("Checking pooler host DNS resolution...");
  for (const r of regions) {
    const host = `aws-0-${r}.pooler.supabase.com`;
    try {
      const addresses = await dns.resolve4(host);
      console.log(`Region ${r} (${host}) resolves to IPv4:`, addresses);
    } catch (e) {
      // Ignore unresolved
    }
  }
}

run().catch(console.error);
