const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://scrapper:scraper@v1ra.jt3fzns.mongodb.net/sanjeevo";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    
    // List databases
    console.log("Databases:");
    const databasesList = await client.db().admin().listDatabases();
    databasesList.databases.forEach(db => console.log(` - ${db.name}`));
    
    // Check v1ra db if it exists, otherwise check sanjeevo
    let targetDb = "sanjeevo";
    const dbNames = databasesList.databases.map(d => d.name);
    if (dbNames.includes('v1ra')) targetDb = 'v1ra';
    else if (dbNames.includes('test')) targetDb = 'test'; // sometimes default
    
    console.log(`\nScanning all databases...`);
    for (let dbObj of databasesList.databases) {
      const dbName = dbObj.name;
      if (['admin', 'local', 'config'].includes(dbName)) continue;
      
      console.log(`\nCollections in ${dbName}:`);
      const cols = await client.db(dbName).listCollections().toArray();
      for (let c of cols) {
        console.log(` - ${c.name}`);
        const count = await client.db(dbName).collection(c.name).countDocuments();
        if (count > 0) {
          const sample = await client.db(dbName).collection(c.name).findOne({});
          // Check if this looks like user/signup data
          const keys = Object.keys(sample);
          if (keys.includes('email') || keys.includes('name') || keys.includes('social_accounts')) {
            console.log(`\n!!! FOUND POTENTIAL SIGNUP DATA in ${dbName}.${c.name} (Count: ${count}) !!!`);
            console.log(JSON.stringify(sample, null, 2));
          }
        }
      }
    }
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
