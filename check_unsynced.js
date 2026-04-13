require('dotenv').config({ path: '/home/ashutosh-yadav/.gemini/antigravity/scratch/DashboardV1RA/.env' });
const { MongoClient } = require('mongodb');
const { google } = require('googleapis');

const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = 'tiktok_scraper';
const COLLECTION_NAME = 'influencers';
const SPREADSHEET_ID = "143w5H8j_WlK98A3xXzWzTj8-N3JrdtDqP2A41fI3wIs";

async function check() {
  console.log("Checking Unsynced Data...");
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const coll = db.collection(COLLECTION_NAME);

  const mongoCount = await coll.countDocuments();
  console.log(`Total in MongoDB: ${mongoCount}`);

  let credentials;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  } else {
      credentials = JSON.parse(require('fs').readFileSync('/home/ashutosh-yadav/.gemini/antigravity/scratch/DashboardV1RA/service-account-key.json', 'utf8'));
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  
  try {
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'A:A',
    });
    const sheetCount = (res.data.values || []).length - 1; // Assuming row 1 is header
    console.log(`Total in Google Sheets: ${sheetCount}`);
    console.log(`Unsynced Difference: ${mongoCount - sheetCount}`);
  } catch (e) {
      console.log('Error fetching from sheets:', e.message);
  }

  await client.close();
}
check().catch(console.error);
