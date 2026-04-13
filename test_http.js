const fetch = require('node-fetch'); // we'll use native fetch in node 18+
// Wait, node 18 fetch is native. Let's just use it.
async function run() {
  const r = await fetch('http://localhost:3000/api/signups');
  console.log("Status:", r.status);
  const t = await r.text();
  console.log("Response:", t.substring(0, 100));
}
run();
