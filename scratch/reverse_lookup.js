const dns = require('dns').promises;

async function run() {
  const ip = '2a05:d012:5aa:c900:eebf:837f:f5e2:64da';
  try {
    const hostnames = await dns.reverse(ip);
    console.log("Reverse DNS results:", hostnames);
  } catch (e) {
    console.error("Reverse lookup failed:", e.message);
  }
}

run().catch(console.error);
