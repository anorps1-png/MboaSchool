const dns = require('dns').promises;

async function run() {
  try {
    const host = 'db.fjsuhzgvoswdmwaowkcz.supabase.co';
    // Resolve CNAME or ANY
    const cname = await dns.resolveCname(host);
    console.log("CNAME results:", cname);
  } catch (e) {
    console.error("CNAME resolution failed:", e.message);
    try {
      const any = await dns.resolveAny('db.fjsuhzgvoswdmwaowkcz.supabase.co');
      console.log("ANY results:", any);
    } catch (err) {
      console.error("ANY resolution failed:", err.message);
    }
  }
}

run().catch(console.error);
