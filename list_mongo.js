require('dotenv').config({ path: '/home/ashutosh-yadav/.gemini/antigravity/scratch/DashboardV1RA/.env' });
const { MongoClient } = require('mongodb');

async function listDbs() {
  const uri = process.env.MONGO_URI;
  const client = new MongoClient(uri);
  await client.connect();
  const adminDb = client.db().admin();
  
  const dbs = await adminDb.listDatabases();
  console.log("Databases:");
  for (let dbInfo of dbs.databases) {
    console.log(`\nDB: ${dbInfo.name}`);
    const db = client.db(dbInfo.name);
    const collections = await db.listCollections().toArray();
    for (let c of collections) {
      if (c.name !== 'sessions') {
        const count = await db.collection(c.name).countDocuments();
        console.log(`  - ${c.name}: ${count}`);
      }
    }
  }

  await client.close();
}
listDbs().catch(console.error);
