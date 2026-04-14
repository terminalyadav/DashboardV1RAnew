/* ============================================================
   SCRAPER COMMAND CENTER v2.1 — server.js
   Split Cloud + Local Backends
   ============================================================ */
require('dotenv').config();
const express      = require('express');
const fs           = require('fs');
const path         = require('path');
const os           = require('os');
const crypto       = require('crypto');
const cookieParser = require('cookie-parser');
const { parse }    = require('csv-parse/sync');
const { MongoClient } = require('mongodb');
const { google }     = require('googleapis');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/public', express.static(path.join(__dirname, 'public'), { maxAge: 0, etag: false }));

// ─── Vercel Serverless: lazy data refresh ───
const isVercel = !!process.env.VERCEL;
let lastRefresh = 0;
const REFRESH_TTL = 60 * 1000;
async function ensureFreshData() {
  if (Date.now() - lastRefresh > REFRESH_TTL) {
    lastRefresh = Date.now();
    await refreshGlobalData();
  }
}
if (isVercel) {
  app.use('/api/', async (req, res, next) => {
    try { await ensureFreshData(); } catch(e) { console.error('ensureFreshData error:', e); }
    next();
  });
}


// ─── Auth (credentials from .env) ───
const CREDENTIALS = {
  username: process.env.AUTH_USERNAME || 'v1ra@admin',
  password: process.env.AUTH_PASSWORD || 'ash'
};

// ─── MongoDB-backed sessions (works on Vercel serverless) ───
async function createSession(token) {
  const db = await getMongo();
  const expiresAt = new Date(Date.now() + 86400000 * 7);
  await db.collection('sessions').updateOne(
    { token },
    { $set: { token, expiresAt } },
    { upsert: true }
  );
}
async function hasSession(token) {
  if (!token) return false;
  const db = await getMongo();
  const session = await db.collection('sessions').findOne({ token, expiresAt: { $gt: new Date() } });
  return !!session;
}
async function deleteSession(token) {
  if (!token) return;
  const db = await getMongo();
  await db.collection('sessions').deleteOne({ token });
}

async function authMiddleware(req, res, next) {
  const token = req.cookies?.session;
  if (await hasSession(token)) return next();
  res.redirect('/');
}

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (username === CREDENTIALS.username && password === CREDENTIALS.password) {
    const token = crypto.randomBytes(32).toString('hex');
    await createSession(token);
    res.cookie('session', token, { httpOnly: true, maxAge: 86400000 * 7 });
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/logout', async (req, res) => {
  await deleteSession(req.cookies?.session);
  res.clearCookie('session');
  res.json({ ok: true });
});


app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/dashboard', authMiddleware, (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));

// ─── Paths (env-var overridable for server deployment) ───
const SCRAPPER_DIR = process.env.SCRAPPER_DIR || path.join(__dirname, 'scrapper');
const IG_CSV       = process.env.IG_CSV       || path.join(SCRAPPER_DIR, 'instagram_accounts.csv');
const TK_CSV       = process.env.TK_CSV       || path.join(SCRAPPER_DIR, 'tiktok_accounts.csv');
const IG_LOG       = process.env.IG_LOG       || path.join(SCRAPPER_DIR, 'logs', 'instagram-out.log');
const TK_LOG       = process.env.TK_LOG       || path.join(SCRAPPER_DIR, 'logs', 'tiktok-out.log');
const OUTREACH_LOG = process.env.OUTREACH_LOG || path.join(SCRAPPER_DIR, 'outreach_log.json');
const MONGO_URI    = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('❌ MONGO_URI is not set in .env'); process.exit(1); }
const PORT         = process.env.PORT         || 3000;
const SESSION_DIR  = SCRAPPER_DIR;

let mongoClient = null;
async function getMongo() {
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    await mongoClient.connect();
  }
  return mongoClient.db('sanjeevo');
}

// ─── Helpers ───
let GLOBAL_STATE = { 
  overview: null, 
  today: null, 
  yesterday: null,
  tags: null, 
  cloud_ig: [], 
  cloud_tk: [], 
  ash_tk: [],
  global_creator: [], 
  global_brand: [] 
};

let sheetCache = { tk: [], ig: [], ash_tk: [], lastSync: 0 };
const SHEET_SYNC_INTERVAL = 15 * 60 * 1000; // 15 mins

/**
 * Syncs full data from Google Sheets (source of truth)
 */
async function syncGoogleSheets() {
  const now = Date.now();
  if (sheetCache.tk.length > 0 && (now - sheetCache.lastSync < SHEET_SYNC_INTERVAL)) {
    return { tk: sheetCache.tk, ig: sheetCache.ig, ash_tk: sheetCache.ash_tk };
  }
  
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1Q8Pw_a88RRZZ9dpaREMAgf5b0RqRqSkQdaJsLGWivMw';
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || path.join(SCRAPPER_DIR, 'service-account-key.json');
  const tiktokSheet = process.env.GOOGLE_SHEETS_TIKTOK_SHEET || 'TikTok';
  const tiktokAshSheet = process.env.GOOGLE_SHEETS_TIKTOK_ASH_SHEET || 'TikTok(Ash)';
  const instagramSheet = process.env.GOOGLE_SHEETS_INSTAGRAM_SHEET || 'Instagram';
  // Strip leading/trailing whitespace from env values
  const cleanSpreadsheetId = spreadsheetId.trim();
  const cleanTiktokSheet = tiktokSheet.trim();
  const cleanTiktokAshSheet = tiktokAshSheet.trim();
  const cleanInstagramSheet = instagramSheet.trim();

  // Support inline JSON key (Vercel) or file (local)
  const inlineKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!inlineKey && !fs.existsSync(keyFile)) {
    console.warn('⚠️ Google Sheets key file not found:', keyFile);
    return { tk: [], ig: [], ash_tk: [] };
  }

  try {
    const authConfig = inlineKey
      ? { credentials: JSON.parse(inlineKey), scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] }
      : { keyFile, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] };
    const auth = new google.auth.GoogleAuth(authConfig);
    const sheets = google.sheets({ version: 'v4', auth });

    // Cache sheet titles confirmed from metadata (needed for special-char names)
    let confirmedTitles = null;
    const resolveSheetTitle = async (title) => {
      if (!confirmedTitles) {
        const meta = await sheets.spreadsheets.get({ spreadsheetId: cleanSpreadsheetId, fields: 'sheets.properties' });
        confirmedTitles = (meta.data.sheets || []).map(s => s.properties.title);
      }
      return confirmedTitles.find(t => t === title) || null;
    };

    const parseRows = (rows) => {
      if (rows.length < 2) return [];
      const headers = rows[0];
      return rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => { if (h && row[i] !== undefined) obj[h.trim()] = row[i]; });
        return obj;
      });
    };

    const fetchSheet = async (title) => {
      // For standard names (letters, digits, spaces, hyphens), use A1 notation
      const isSimple = /^[A-Za-z0-9_ -]+$/.test(title);
      let range;
      if (isSimple) {
        range = title.includes(' ') ? `'${title}'!A:Z` : `${title}!A:Z`;
        const res = await sheets.spreadsheets.values.get({ spreadsheetId: cleanSpreadsheetId, range });
        return parseRows(res.data.values || []);
      } else {
        // Names with special chars (parentheses etc.) — confirm via metadata then pass title only as range
        const confirmed = await resolveSheetTitle(title);
        if (!confirmed) {
          console.warn(`Sheet "${title}" not found in spreadsheet`);
          console.warn(`Available sheets are: ${confirmedTitles.join(', ')}`);
          return [];
        }
        // Passing just the sheet title as the range returns all data for that sheet
        const res = await sheets.spreadsheets.values.get({ spreadsheetId: cleanSpreadsheetId, range: confirmed });
        return parseRows(res.data.values || []);
      }
    };

    console.log('📡 Fetching from Google Sheets...');
    const [tk, ig, ash_tk] = await Promise.all([
      fetchSheet(cleanTiktokSheet).catch(e => { console.error('TK Sheet Error:', e.message); return []; }),
      fetchSheet(cleanInstagramSheet).catch(e => { console.error('IG Sheet Error:', e.message); return []; }),
      fetchSheet(cleanTiktokAshSheet).catch(e => { console.error('Ash TK Sheet Error:', e.message); return []; })
    ]);
    console.log(`✅ Sheets synced: ${tk.length} TikTok, ${ig.length} Instagram, ${ash_tk.length} TikTok(Ash)`);
    
    sheetCache = { tk, ig, ash_tk, lastSync: Date.now() };
    return { tk, ig, ash_tk };
  } catch (e) {
    console.error('❌ Google Sheets Sync Error:', e.message);
    return { tk: sheetCache.tk, ig: sheetCache.ig, ash_tk: sheetCache.ash_tk };
  }
}

// ─── OUTREACH GOOGLE SHEET (Email Marketing Tracker) ───
// No internal cache — this sheet is small and manually updated.
// refreshGlobalData() runs every 60s, so changes appear within ~1 minute.
let outreachSheetCache = { data: [] }; // kept only as error fallback

async function syncOutreachSheet() {
  const spreadsheetId = (process.env.GOOGLE_SHEETS_OUTREACH_SPREADSHEET_ID || '').trim();
  if (!spreadsheetId) { console.warn('⚠️ GOOGLE_SHEETS_OUTREACH_SPREADSHEET_ID not set'); return outreachSheetCache.data; }

  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || path.join(SCRAPPER_DIR, 'service-account-key.json');
  const inlineKey2 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!inlineKey2 && !fs.existsSync(keyFile)) return outreachSheetCache.data;

  try {
    const authConfig2 = inlineKey2
      ? { credentials: JSON.parse(inlineKey2), scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] }
      : { keyFile, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] };
    const auth = new google.auth.GoogleAuth(authConfig2);
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetName = (process.env.GOOGLE_SHEETS_OUTREACH_TRACKING_SHEET || 'Tracking').trim();

    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${sheetName}'!A:Z` });
    const rows = res.data.values || [];
    if (rows.length < 2) return outreachSheetCache.data;

    const headers = rows[0];
    // Log headers and first row so we can diagnose column name mismatches
    console.log('📋 Outreach sheet headers:', JSON.stringify(headers));
    if (rows[1]) console.log('📋 Outreach sheet row 1 raw:', JSON.stringify(rows[1]));
    const parseNum = (v) => {
      if (v === null || v === undefined || String(v).trim() === '' || String(v).trim() === '-') return null;
      const n = parseInt(String(v).replace(/,/g, '').trim());
      return isNaN(n) ? null : n;
    };

    const processed = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h.trim()] = row[i] !== undefined ? row[i] : ''; });

      // Date column may be named "Column 1", "Date", or similar — fall back to first column value
      const rawDate = String(
        obj['Date'] || obj['date'] || obj['Column 1'] || obj['column 1'] ||
        (row[0] !== undefined ? row[0] : '')
      ).trim();

      // Skip empty rows, summary rows like "Total", or anything that isn't a date
      if (!rawDate || !/\d/.test(rawDate) || /total/i.test(rawDate)) return null;
      const parts = rawDate.split(/[-/]/);
      if (parts.length !== 3) return null;
      let dd, mm, yyyy;
      
      // Determine if format is YYYY-MM-DD
      if (parts[0].length === 4) {
        yyyy = parts[0]; mm = parts[1]; dd = parts[2];
      } 
      // Determine if format is MM/DD/YYYY (e.g. 04/14/2026)
      else if (parseInt(parts[1]) > 12) {
        mm = parts[0]; dd = parts[1]; yyyy = parts[2];
      }
      // Determine if format is DD/MM/YYYY (e.g. 14/04/2026)
      else {
        dd = parts[0]; mm = parts[1]; yyyy = parts[2];
      }
      
      if (!dd || !mm || !yyyy || yyyy.length !== 4) return null;

      return {
        date:    `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`,
        label:   `${dd.padStart(2,'0')}/${mm.padStart(2,'0')}`,
        day:     obj['Day'] || '',
        sent:    parseNum(obj['Emails Sent']),
        replies: parseNum(obj['Inbox Replies'] || obj['Replies']),
        signups: parseNum(obj['Total Signups'] || obj['Signups']),
        social:  parseNum(obj['Signup with Socials'] || obj['Social']),
        email:   parseNum(obj['Signup with Email only'] || obj['Email Signups']),
      };
    }).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date));

    console.log(`✅ Outreach Sheet synced: ${processed.length} rows from “${sheetName}”`);
    outreachSheetCache = { data: processed };
    return processed;
  } catch (e) {
    console.error('❌ Outreach Sheet Sync Error:', e.message);
    return outreachSheetCache.data;
  }
}

async function refreshGlobalData() {
  const start = Date.now();
  console.log('🔄 Refreshing Global Data (including Sheets)...');
  try {
    const [igCSV, tkCSV, { tk: tkSheet, ig: igSheet, ash_tk: ashTkSheet }, outreachHistory] = await Promise.all([
      Promise.resolve(readCSV(IG_CSV, 'ig')),
      Promise.resolve(TK_CSV ? readCSV(TK_CSV, 'tk') : []),
      syncGoogleSheets(),
      syncOutreachSheet()
    ]);


    // Deduplicate: Sheets take priority over CSV, key is Username or Email (fallback)
    const dedupe = (csv, sheet) => {
      const map = new Map();
      const normalize = (r) => (r.Username || r.username || r.Email || r.email || '').toLowerCase().trim();
      
      csv.forEach(r => { const k = normalize(r); if(k) map.set(k, r); });
      sheet.forEach(r => { const k = normalize(r); if(k) map.set(k, r); });
      return Array.from(map.values());
    };

    const igRows = dedupe(igCSV, igSheet);
    const tkRows = dedupe(tkCSV, tkSheet);
    
    const outreach = readOutreach();
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const createOverview = () => ({
      afnanIg: { accounts: 0, emails: 0 },
      afnanTk: { accounts: 0, emails: 0 },
      ashTk: { accounts: 0, emails: 0 },
      cloud: { accounts: 0, emails: 0, sent: 0, replied: 0, ig: 0, tk: 0 },
      local: { accounts: 0, emails: 0, sent: 0, replied: 0, jobs: 0 },
      totalEmails: 0,
      totalAccounts: 0,
      stats: { 
        creatorCloudUsers: 0, brandCloudUsers: 0, creatorSanjUsers: 0, brandSanjUsers: 0,
        creatorCloud: 0, brandCloud: 0, creatorSanj: 0, brandSanj: 0,
        creatorCloudSent: 0, brandCloudSent: 0, creatorSanjSent: 0, brandSanjSent: 0,
        creatorCloudRep: 0, brandCloudRep: 0, creatorSanjRep: 0, brandSanjRep: 0
      }
    });

    const ovAll = createOverview();
    const ovToday = createOverview();
    const ovYesterday = createOverview();
    const tagCounts = {};
    const cloudProcessedIg = [];
    const cloudProcessedTk = [];
    const ashProcessedTk = [];
    const localProcessed = [];

    // Helper to yield event loop every N items
    const processBatch = async (items, batchSize, fn) => {
      for (let i = 0; i < items.length; i++) {
        fn(items[i]);
        if (i > 0 && i % batchSize === 0) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }
    };

    const processRow = (r, platName, collector) => {
      const scrapedAtRaw = r['Scraped At'] || r['scrapedAt'] || r.createdAt || '';
      const scrapedAt = (scrapedAtRaw instanceof Date) ? scrapedAtRaw.toISOString() : String(scrapedAtRaw);
      
      const isToday = scrapedAt.startsWith(todayStr);
      const isYesterday = scrapedAt.startsWith(yesterdayStr);
      
      let type = r['Type'] || r['Category'] || (r.isBusinessAccount ? 'Brand' : 'Creator'); 
      if(r['Is Business Account'] === 'true' || r['Is Professional Account'] === 'true') type = 'Brand';
      
      if (type === 'Creator') {
        const bioText = (r['Bio'] || r['bio'] || '').toLowerCase();
        const nameText = (r['Name'] || r['name'] || '').toLowerCase();
        if (/brand|store|shop|official|apparel|business|company|agency/i.test(bioText) ||
            /brand|store|shop|official|apparel|business|company|agency/i.test(nameText)) {
          type = 'Brand';
        }
      }
      const isCreator = String(type).toLowerCase().includes('creator');
      
      const inc = (ov) => {
        if (collector === cloudProcessedIg) {
          ov.afnanIg.accounts++;
          ov.cloud.accounts++;
          ov.cloud.ig++;
          if (isCreator) ov.stats.creatorCloudUsers++; else ov.stats.brandCloudUsers++;
        } else if (collector === cloudProcessedTk) {
          ov.afnanTk.accounts++;
          ov.cloud.accounts++;
          ov.cloud.tk++;
          if (isCreator) ov.stats.creatorCloudUsers++; else ov.stats.brandCloudUsers++;
        } else if (collector === ashProcessedTk) {
          ov.ashTk.accounts++;
        }
      };

      inc(ovAll);
      if(isToday) inc(ovToday);
      if(isYesterday) inc(ovYesterday);

      const tag = r['Hashtag']?.trim() || r['hashtag']?.trim() || r['Tag']?.trim() || '';
      if (tag) tagCounts[tag] = (tagCounts[tag] || 0) + 1;

      const rawEm = r['Email']?.trim();
      const em = (rawEm && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEm)) ? rawEm : null;
      if (em) {
        const record = outreach[em.toLowerCase()];
        const isSent = !!record;
        const isReplied = record && record.replied;

        const incEm = (ov) => {
          if (collector === cloudProcessedIg || collector === cloudProcessedTk) {
            ov.cloud.emails++;
            if (collector === cloudProcessedIg) ov.afnanIg.emails++; else ov.afnanTk.emails++;
            if(isSent) ov.cloud.sent++;
            if(isReplied) ov.cloud.replied++;
            if(isCreator) { 
              ov.stats.creatorCloud++; 
              if(isSent) ov.stats.creatorCloudSent++; 
              if(isReplied) ov.stats.creatorCloudRep++;
            } else { 
              ov.stats.brandCloud++; 
              if(isSent) ov.stats.brandCloudSent++; 
              if(isReplied) ov.stats.brandCloudRep++;
            }
          } else if (collector === ashProcessedTk) {
            ov.ashTk.emails++;
          }
        };

        incEm(ovAll);
        if(isToday) incEm(ovToday);
        if(isYesterday) incEm(ovYesterday);
        
        collector.push({ 
          platform: platName, username: r['Username'] || r.username || '', email: em, 
          followers: r['Followers'] || r.followerCount || r.followers || '', scrapedAt, 
          status: isReplied ? 'replied' : (isSent ? 'sent' : 'pending'), type,
          hashtag: tag || '',
          _ts: new Date(scrapedAt || 0).getTime()
        });
      }
    };

    await processBatch(igRows, 1000, r => processRow(r, 'Instagram', cloudProcessedIg));
    await processBatch(tkRows, 1000, r => processRow(r, 'TikTok', cloudProcessedTk));
    await processBatch(ashTkSheet, 1000, r => processRow(r, 'TikTok', ashProcessedTk));

    // 2. Process MongoDB Data
    try {
      const db = await getMongo();
      const sjRows = await db.collection('accountdetails').find({ 
        $or: [
          { 'emails.0': { $exists: true } },
          { emails: { $type: 'string', $ne: '' } }
        ]
      })
        .project({ username: 1, emails: 1, followerCount: 1, followers: 1, createdAt: 1, isBusinessAccount: 1, contentType: 1, niche: 1 })
        .toArray();
      
      const dayStart = new Date(todayStr + 'T00:00:00Z');
      const dayEnd = new Date(todayStr + 'T23:59:59Z');
      const yestStart = new Date(yesterdayStr + 'T00:00:00Z');
      const yestEnd = new Date(yesterdayStr + 'T23:59:59Z');

      const discoveredCount = await db.collection('discoveredusers').countDocuments();
      const discoveredToday = await db.collection('discoveredusers').countDocuments({ createdAt: { $gte: dayStart, $lte: dayEnd } });
      const discoveredYesterday = await db.collection('discoveredusers').countDocuments({ createdAt: { $gte: yestStart, $lte: yestEnd } });
      const jobsCount = await db.collection('jobs').countDocuments();

      ovAll.local.accounts = discoveredCount;
      ovAll.local.jobs = jobsCount;
      ovToday.local.accounts = discoveredToday;
      ovToday.local.jobs = jobsCount;
      ovYesterday.local.accounts = discoveredYesterday;
      ovYesterday.local.jobs = jobsCount;

      await processBatch(sjRows, 1000, r => {
        const scrapedAtRaw = r.createdAt || '';
        const scrapedAt = (scrapedAtRaw instanceof Date) ? scrapedAtRaw.toISOString() : String(scrapedAtRaw);
        
        const isToday = scrapedAt.startsWith(todayStr);
        const isYesterday = scrapedAt.startsWith(yesterdayStr);

        // Support both new format (plain strings) and old format ({ value: '...' })
        let emailRaw = null;
        if (Array.isArray(r.emails)) emailRaw = r.emails[0];
        else if (typeof r.emails === 'string') emailRaw = r.emails;
        
        let email = typeof emailRaw === 'string' ? emailRaw.trim() : (emailRaw?.value || '').trim();
        email = (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ? email : null;
        
        // Brand detection: local scraper (Sanjeev) is strictly configured for Creators
        const isBrand = false;
        
        if (email) {
          const record = outreach[email.toLowerCase()];
          const isSent = !!record;
          const isReplied = record?.replied;

          const incSj = (ov) => {
            ov.local.emails++;
            if(isSent) ov.local.sent++;
            if(isReplied) ov.local.replied++;
            if(isBrand) {
              ov.stats.brandSanjUsers++;
              ov.stats.brandSanj++;
              if(isSent) ov.stats.brandSanjSent++;
              if(isReplied) ov.stats.brandSanjRep++;
            } else {
              ov.stats.creatorSanjUsers++;
              ov.stats.creatorSanj++;
              if(isSent) ov.stats.creatorSanjSent++;
              if(isReplied) ov.stats.creatorSanjRep++;
            }
          };

          incSj(ovAll);
          if(isToday) incSj(ovToday);
          if(isYesterday) incSj(ovYesterday);

          localProcessed.push({ 
            platform: 'Instagram', engine: 'Local Mongo', username: r.username, 
            email, followers: r.followerCount || r.followers || '', 
            scrapedAt, status: isReplied ? 'replied' : (isSent ? 'sent' : 'pending'),
            type: isBrand ? 'Brand' : 'Creator',
            _ts: new Date(scrapedAt || 0).getTime()
          });
        }
      });
    } catch (e) { console.error('Mongo refresh error:', e); }

    // 3. Finalize Lists & Sorting
    cloudProcessedIg.sort((a,b) => b._ts - a._ts);
    cloudProcessedTk.sort((a,b) => b._ts - a._ts);
    ashProcessedTk.sort((a,b) => b._ts - a._ts);
    
    const finalizeOv = (ov) => {
        ov.totalEmails = ov.cloud.emails + ov.local.emails;
        ov.totalAccounts = ov.cloud.accounts + ov.local.accounts;
    };
    finalizeOv(ovAll);
    finalizeOv(ovToday);
    finalizeOv(ovYesterday);

    const global_creator = [...cloudProcessedIg, ...cloudProcessedTk, ...ashProcessedTk, ...localProcessed].filter(e => e.type === 'Creator').sort((a,b) => b._ts - a._ts);
    const global_brand = [...cloudProcessedIg, ...cloudProcessedTk, ...ashProcessedTk, ...localProcessed].filter(e => e.type === 'Brand').sort((a,b) => b._ts - a._ts);

    GLOBAL_STATE = {
      overview: ovAll,
      today: ovToday,
      yesterday: ovYesterday,
      tags: Object.entries(tagCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      cloud_ig: cloudProcessedIg,
      cloud_tk: cloudProcessedTk,
      ash_tk: ashProcessedTk,
      global_creator,
      global_brand,
      local_processed: localProcessed,
      creator_outreach: outreachHistory   // ← live from Google Sheets
    };

    // 4. Cache Heavy Aggregations (Daily, Niches, Countries)
    try {
      const db = await getMongo();
      const numDays = lastNDays(14);
      const st = numDays[0];
      const en = numDays[numDays.length - 1];

      const discoveredAgg = await db.collection('discoveredusers').aggregate([
        { $match: { _id: { $gte: require('mongodb').ObjectId.createFromTime(Math.floor(new Date(st + 'T00:00:00Z').getTime() / 1000)), $lte: require('mongodb').ObjectId.createFromTime(Math.floor(new Date(en + 'T23:59:59Z').getTime() / 1000)) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$_id' } } }, count: { $sum: 1 } } }
      ]).toArray();

      const processedAgg = await db.collection('accountdetails').aggregate([
        { $match: { createdAt: { $gte: new Date(st + 'T00:00:00Z'), $lte: new Date(en + 'T23:59:59Z') }, 'emails.0': { $exists: true } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }
      ]).toArray();

      const discMap = {}; discoveredAgg.forEach(r => discMap[r._id] = r.count);
      const procMap = {}; processedAgg.forEach(r => procMap[r._id] = r.count);

      GLOBAL_STATE.local_daily = numDays.map(d => ({
        date: d,
        label: new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        discovered: discMap[d] || 0,
        processed: procMap[d] || 0
      }));

      const n = await db.collection('accountdetails').aggregate([
        { $match: { niche: { $exists: true, $nin: ['Unknown', '', null] } } },
        { $group: { _id: '$niche', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray();
      GLOBAL_STATE.local_niches = n.map(x => ({ name: x._id, value: x.count }));

      const c = await db.collection('accountdetails').aggregate([
        { $match: { country: { $exists: true, $nin: ['Unknown', '', null] } } },
        { $group: { _id: "$country", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray();
      GLOBAL_STATE.local_countries = c.map(x => ({ name: x._id, value: x.count }));

    } catch(err) { console.error('bg aggregation error:', err); }

    console.log(`✅ Global Data Refreshed in ${Date.now() - start}ms (Non-blocking)`);
  } catch (e) { console.error('refreshGlobalData error:', e); }
}

const cache = { 
  ig: { data: null, mtime: 0 }, 
  tk: { data: null, mtime: 0 }, 
  outreach: { data: null, mtime: 0 }
};

function readCSV(filePath, type) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const stats = fs.statSync(filePath);
    const mtime = stats.mtimeMs;
    
    if (cache[type] && cache[type].mtime === mtime && cache[type].data) {
      return cache[type].data;
    }
    
    const data = parse(fs.readFileSync(filePath, 'utf8'), {
      columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true
    });
    
    cache[type] = { data, mtime };
    return data;
  } catch (e) { 
    console.error(`readCSV error (${type}):`, e);
    return []; 
  }
}

function readOutreach() {
  try {
    if (!fs.existsSync(OUTREACH_LOG)) return {};
    const stats = fs.statSync(OUTREACH_LOG);
    const mtime = stats.mtimeMs;
    
    if (cache.outreach.mtime === mtime && cache.outreach.data) {
      return cache.outreach.data;
    }
    
    const arr = JSON.parse(fs.readFileSync(OUTREACH_LOG, 'utf8'));
    const map = {};
    arr.forEach(e => { if (e.email) map[e.email.toLowerCase()] = e; });
    
    cache.outreach = { data: map, mtime };
    return map;
  } catch (e) {
    console.error('readOutreach error:', e);
    return {};
  }
}

function todayKey() { return new Date().toISOString().slice(0, 10); }

function lastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function parseDateForComparison(dateStr) {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  // If DD/MM/YYYY
  if (s.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const parts = s.split('/');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  // If DD/MM (assume current year)
  if (s.match(/^\d{2}\/\d{2}$/)) {
    const parts = s.split('/');
    const y = new Date().getFullYear();
    return `${y}-${parts[1]}-${parts[0]}`;
  }
  // Standard format
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return '';
}

function filterByDate(arr, start, end) {
  if (!start && !end) return arr;
  return arr.filter(e => {
    const d = parseDateForComparison(e.scrapedAt || '');
    if (!d) return true; // keep if no date
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}

// ─── GLOBAL OVERVIEW ───
app.get('/api/overview', authMiddleware, async (req, res) => {
  const { startDate, endDate } = req.query;
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (!startDate && !endDate) return res.json(GLOBAL_STATE.overview || { error: 'warming up' });
  
  // Shortcut for today/yesterday presets
  if (startDate === todayStr && endDate === todayStr) return res.json(GLOBAL_STATE.today || { error: 'warming up' });
  if (startDate === yesterdayStr && endDate === yesterdayStr) return res.json(GLOBAL_STATE.yesterday || { error: 'warming up' });

  // Custom range: Dynamic calculation from cached lists
  // This is slightly slower but still fast (~50-100ms) because lists are in memory
  const start = Date.now();
  const filterRows = (rows) => filterByDate(rows, startDate, endDate);
  
  const creator = filterRows(GLOBAL_STATE.global_creator);
  const brand = filterRows(GLOBAL_STATE.global_brand);
  const ig = filterRows(GLOBAL_STATE.cloud_ig);
  const tk = filterRows(GLOBAL_STATE.cloud_tk);
  const local = filterRows(GLOBAL_STATE.local_processed);

  const stats = {
    creatorCloud: creator.filter(e => e.engine !== 'Local Mongo').length,
    brandCloud: brand.filter(e => e.engine !== 'Local Mongo').length,
    creatorSanj: creator.filter(e => e.engine === 'Local Mongo').length,
    brandSanj: brand.filter(e => e.engine === 'Local Mongo').length,
    creatorCloudSent: creator.filter(e => e.engine !== 'Local Mongo' && e.status !== 'pending').length,
    brandCloudSent: brand.filter(e => e.engine !== 'Local Mongo' && e.status !== 'pending').length,
    creatorSanjSent: creator.filter(e => e.engine === 'Local Mongo' && e.status !== 'pending').length,
    brandSanjSent: brand.filter(e => e.engine === 'Local Mongo' && e.status !== 'pending').length,
    creatorCloudRep: creator.filter(e => e.engine !== 'Local Mongo' && e.status === 'replied').length,
    brandCloudRep: brand.filter(e => e.engine !== 'Local Mongo' && e.status === 'replied').length,
    creatorSanjRep: creator.filter(e => e.engine === 'Local Mongo' && e.status === 'replied').length,
    brandSanjRep: brand.filter(e => e.engine === 'Local Mongo' && e.status === 'replied').length,
  };

  // For custom date ranges: ig/tk rows already only have emails (they were filtered by email presence)
  // So ig.length == emails from IG in that range; accounts ≥ emails (we don't have a filtered accounts count easily)
  // We use email counts as the best proxy for per-range sub-totals
  const igEmails = ig.length;
  const tkEmails = tk.length;
  const ashTkEmails = filterRows(GLOBAL_STATE.ash_tk || []).length;
  const localEmails = local.length;
  const overview = {
    afnanIg: { accounts: igEmails, emails: igEmails },
    afnanTk: { accounts: tkEmails, emails: tkEmails },
    ashTk: { accounts: ashTkEmails, emails: ashTkEmails },
    cloud: { 
      accounts: igEmails + tkEmails, 
      emails: igEmails + tkEmails, 
      sent: stats.creatorCloudSent + stats.brandCloudSent, 
      replied: stats.creatorCloudRep + stats.brandCloudRep,
      ig: igEmails, tk: tkEmails 
    },
    local: { 
      accounts: localEmails,
      emails: localEmails, 
      sent: stats.creatorSanjSent + stats.brandSanjSent, 
      replied: stats.creatorSanjRep + stats.brandSanjRep, 
      jobs: 0
    },
    totalEmails: igEmails + tkEmails + localEmails,
    totalAccounts: igEmails + tkEmails + localEmails,
    stats
  };

  res.json(overview);
});

// ─── SERVER HEALTH ───
app.get('/api/health', authMiddleware, (req, res) => {
  const memTotal = os.totalmem();
  const memFree = os.freemem();
  const memUsed = memTotal - memFree;
  const memPercent = ((memUsed / memTotal) * 100).toFixed(1);
  const cpuLoad = os.loadavg()[0].toFixed(2);
  const uptime = Math.floor(os.uptime() / 3600); // hours
  
  res.json({
    memory: `${memPercent}%`,
    memoryRaw: { used: memUsed, total: memTotal },
    cpu: `${cpuLoad}`,
    uptime: `${uptime}h`
  });
});

// ─── RECENT ACTIVITY LOGS ───
app.get('/api/activity', authMiddleware, (req, res) => {
  try {
    const activity = [];
    const outreach = readOutreach();
    Object.values(outreach).slice(-10).forEach(e => {
        activity.push({ type: 'Email Sent', desc: `Sent outreach to ${e.email}`, time: e.timestamp || Date.now() });
    });
    // Add dummy activity for UI if empty
    if(activity.length === 0) {
        activity.push({ type: 'System', desc: 'Command Center v2.1 Initialized', time: Date.now() });
    }
    
    activity.sort((a,b) => b.time - a.time);
    res.json(activity.slice(0, 10));
  } catch (e) { res.status(500).json({ error: e.message }); }
});


app.get('/api/export/cloud', authMiddleware, (req, res) => {
  try {
    const igRows = readCSV(IG_CSV, 'ig');
    const tkRows = readCSV(TK_CSV, 'tk');
    const outreach = readOutreach();
    const emails = [];
    
    igRows.forEach(r => { 
      if(r['Email'] && r['Email'].trim()) {
        const rec = outreach[r['Email'].trim().toLowerCase()];
        const status = rec ? (rec.replied ? 'Replied' : 'Sent') : 'Pending';
        emails.push({ platform: 'Instagram', username: r['Username'] || '', email: r['Email'].trim(), followers: r['Followers'] || r['Follower Count'] || '0', status, scrapedAt: r['Scraped At'] || '' }); 
      }
    });
    tkRows.forEach(r => { 
      if(r['Email'] && r['Email'].trim()) {
        const rec = outreach[r['Email'].trim().toLowerCase()];
        const status = rec ? (rec.replied ? 'Replied' : 'Sent') : 'Pending';
        emails.push({ platform: 'TikTok', username: r['Username'] || '', email: r['Email'].trim(), followers: r['Followers'] || r['Follower Count'] || '0', status, scrapedAt: r['Scraped At'] || '' });
      }
    });
    
    if (emails.length === 0) return res.status(404).send('No data to export');
    
    let csvStr = 'Platform,Username,Email,Followers,Status,Scraped At\n';
    emails.forEach(e => csvStr += `${e.platform},${e.username},${e.email},${e.followers},${e.status},${e.scrapedAt}\n`);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=cloud_emails.csv');
    res.send(csvStr);
  } catch (e) { res.status(500).send(e.message); }
});

// ─── GLOBAL CREATOR/BRAND ROUTES ───
app.get('/api/global/emails', authMiddleware, async (req, res) => {
  const { type = 'creator', platform = 'all', page = 1, q = '', status = 'all', startDate, endDate } = req.query;
  const limit = 50;
  
  let all = (type === 'brand') ? GLOBAL_STATE.global_brand : GLOBAL_STATE.global_creator;
  
  let filtered = filterByDate(all, startDate, endDate);
  if (status && status !== 'all') filtered = filtered.filter(e => e.status === status);
  if (platform !== 'all') filtered = filtered.filter(e => e.platform.toLowerCase().includes(platform));
  if (q) { 
    const lq = q.toLowerCase(); 
    filtered = filtered.filter(e => (e.username||'').toLowerCase().includes(lq) || e.email.toLowerCase().includes(lq)); 
  }

  res.json({ total: filtered.length, page: parseInt(page), limit, rows: filtered.slice((parseInt(page) - 1) * limit, parseInt(page) * limit) });
});

// ─── AFNAN IG ROUTES — Real daily data aggregated from Sheets cache ───
app.get('/api/afnan-ig/daily', authMiddleware, (req, res) => {
  const days = lastNDays(14);
  const ig = GLOBAL_STATE.cloud_ig || [];

  const igByDay = {};
  ig.forEach(r => {
    const d = (r.scrapedAt || '').split('T')[0];
    if (!igByDay[d]) igByDay[d] = { accounts: 0, emails: 0 };
    igByDay[d].accounts++;
    igByDay[d].emails++; // cloud_ig only contains records with emails
  });

  res.json(days.map(d => ({
    date: d,
    label: new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    ig: igByDay[d]?.accounts || 0,
    emails: igByDay[d]?.emails || 0
  })));
});

// ─── AFNAN TIKTOK ROUTES — Real daily data aggregated from Sheets cache ───
app.get('/api/afnan-tk/daily', authMiddleware, (req, res) => {
  const days = lastNDays(14);
  const tk = GLOBAL_STATE.cloud_tk || [];

  const tkByDay = {};
  tk.forEach(r => {
    const d = (r.scrapedAt || '').split('T')[0];
    if (!tkByDay[d]) tkByDay[d] = { accounts: 0, emails: 0 };
    tkByDay[d].accounts++;
    tkByDay[d].emails++;
  });

  res.json(days.map(d => ({
    date: d,
    label: new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    tk: tkByDay[d]?.accounts || 0,
    emails: tkByDay[d]?.emails || 0
  })));
});

// ─── ASH TIKTOK ROUTES ───
app.get('/api/ash-tk/daily', authMiddleware, (req, res) => {
  const days = lastNDays(14);
  const tk = GLOBAL_STATE.ash_tk || [];

  const tkByDay = {};
  tk.forEach(r => {
    const d = (r.scrapedAt || '').split('T')[0];
    if (!tkByDay[d]) tkByDay[d] = { accounts: 0, emails: 0 };
    tkByDay[d].accounts++;
    tkByDay[d].emails++;
  });

  res.json(days.map(d => ({
    date: d,
    label: new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    tk: tkByDay[d]?.accounts || 0,
    emails: tkByDay[d]?.emails || 0
  })));
});

app.get('/api/ash-tk/emails', authMiddleware, (req, res) => {
  const { page = 1, q = '', startDate, endDate } = req.query;
  const limit = 50;
  let all = GLOBAL_STATE.ash_tk || [];
  let filtered = filterByDate(all, startDate, endDate);
  if (q) { const lq = q.toLowerCase(); filtered = filtered.filter(e => (e.username||'').toLowerCase().includes(lq) || e.email.toLowerCase().includes(lq)); }
  res.json({ total: filtered.length, page: parseInt(page), limit, rows: filtered.slice((parseInt(page)-1)*limit, parseInt(page)*limit) });
});

app.get('/api/cloud/emails', authMiddleware, (req, res) => {
  const { platform = 'ig', page = 1, status = 'all', q = '', startDate, endDate } = req.query;
  const limit = 50;
  
  let all = (platform === 'ig') ? GLOBAL_STATE.cloud_ig : GLOBAL_STATE.cloud_tk;
  
  let filtered = filterByDate(all, startDate, endDate);
  if (status === 'pending' || status === 'sent' || status === 'replied') filtered = filtered.filter(e => e.status === status);
  if (status === 'creator') filtered = filtered.filter(e => e.type.toLowerCase().includes('creator'));
  if (status === 'brand') filtered = filtered.filter(e => !e.type.toLowerCase().includes('creator') && (e.type.toLowerCase().includes('brand') || e.type.toLowerCase().includes('business')));
  
  if (q) { const lq = q.toLowerCase(); filtered = filtered.filter(e => (e.username||'').toLowerCase().includes(lq) || e.email.toLowerCase().includes(lq)); }

  res.json({ total: filtered.length, page: parseInt(page), limit, rows: filtered.slice((parseInt(page) - 1) * limit, parseInt(page) * limit) });
});

app.get('/api/cloud/log', authMiddleware, (req, res) => {
  const lines = [];
  [IG_LOG, TK_LOG].forEach(f => {
    if (!fs.existsSync(f)) return;
    try { lines.push(...fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).slice(-150)); } catch {}
  });
  lines.sort((a, b) => a.slice(0, 19).localeCompare(b.slice(0, 19)));
  res.json({ lines: lines.slice(-200) });
});

app.get('/api/cloud/tags', authMiddleware, (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate && !endDate && GLOBAL_STATE.tags) return res.json(GLOBAL_STATE.tags);
  
  // Real tag filtering — hashtags are now stored on each record
  const allRows = [...(GLOBAL_STATE.cloud_ig || []), ...(GLOBAL_STATE.cloud_tk || [])];
  const filtered = filterByDate(allRows, startDate, endDate);
  
  const tagCounts = {};
  filtered.forEach(r => {
    if (r.hashtag) tagCounts[r.hashtag] = (tagCounts[r.hashtag] || 0) + 1;
  });
  
  const tags = Object.entries(tagCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  
  return res.json(tags);
});


// ─── LOCAL ROUTES ───
app.get('/api/local/daily', authMiddleware, async (req, res) => {
  res.json(GLOBAL_STATE.local_daily || []);
});

app.get('/api/local/niches', authMiddleware, async (req, res) => {
  res.json(GLOBAL_STATE.local_niches || []);
});

app.get('/api/local/countries', authMiddleware, async (req, res) => {
  res.json(GLOBAL_STATE.local_countries || []);
});

// ─── CREATOR OUTREACH HISTORY (from Google Sheets Email Marketing Tracker) ───
app.get('/api/creator-outreach', authMiddleware, (req, res) => {
  const { startDate, endDate } = req.query;
  let data = GLOBAL_STATE.creator_outreach || [];
  if (startDate || endDate) {
    data = data.filter(r => {
      const d = parseDateForComparison(r.date);
      if (!d) return true;
      if (startDate && d < startDate) return false;
      if (endDate   && d > endDate)   return false;
      return true;
    });
  }
  res.json(data);
});

// ─── DEBUG: inspect raw parsed outreach data ───
app.get('/api/debug-outreach', authMiddleware, (req, res) => {
  const data = GLOBAL_STATE.creator_outreach || [];
  res.json({
    total_rows: data.length,
    last_5: data.slice(-5),
    all: data
  });
});

app.get('/api/local/emails', authMiddleware, async (req, res) => {
  const { page = 1, status = 'all', q = '', startDate, endDate } = req.query;
  const limit = 50;
  
  let all = GLOBAL_STATE.local_processed || [];
  let filtered = filterByDate(all, startDate, endDate);

  if (status === 'creator') filtered = filtered.filter(e => e.type === 'Creator');
  if (status === 'brand') filtered = filtered.filter(e => e.type === 'Brand');
  if (status === 'pending' || status === 'sent' || status === 'replied') filtered = filtered.filter(e => e.status === status);
  if (q) { const lq = q.toLowerCase(); filtered = filtered.filter(e => (e.username||'').toLowerCase().includes(lq) || e.email.toLowerCase().includes(lq)); }

  const total = filtered.length;
  const skip = (parseInt(page)-1) * limit;
  res.json({ total, page: parseInt(page), limit, rows: filtered.slice(skip, skip + limit) });
});

app.get('/api/export/local', authMiddleware, async (req, res) => {
  try {
    const db = await getMongo();
    const dbRows = await db.collection('accountdetails').find({ 'emails.0': { $exists: true } }).sort({ createdAt: -1 }).toArray();
    const outreach = readOutreach();
    
    let csvStr = 'Platform,Username,Email,Followers,Type,Status,Scraped At\n';
    let count = 0;
    
    dbRows.forEach(r => {
      const emailRaw = Array.isArray(r.emails) ? r.emails[0] : null;
      const email = typeof emailRaw === 'string' ? emailRaw.trim() : (emailRaw?.value || '').trim();
      if (!email) return;
      const rec = outreach[email.toLowerCase()];
      const status = rec ? (rec.replied ? 'Replied' : 'Sent') : 'Pending';
      // Local scraper (Sanjeev) is strictly configured for Creators
      const type = 'Creator';
      const followers = r.followerCount || r.followers || 0;
      const scrapedAt = r.createdAt ? new Date(r.createdAt).toISOString().slice(0,10) : '';
      csvStr += `Instagram,${r.username},${email},${followers},${type},${status},${scrapedAt}\n`;
      count++;
    });
    
    if (count === 0) return res.status(404).send('No data to export');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=local_emails.csv');
    res.send(csvStr);
  } catch (e) { res.status(500).send(e.message); }
});

// ─── EXTRAS ───
app.post('/api/mark-sent', authMiddleware, (req, res) => {
  const { email, username } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  let entries = [];
  if (fs.existsSync(OUTREACH_LOG)) { try { entries = JSON.parse(fs.readFileSync(OUTREACH_LOG, 'utf8')); } catch {} }
  const existing = entries.find(e => e.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    existing.replied = false; // Reset replied state when marking sent
  } else {
    entries.push({ email, username: username || '', sentAt: new Date().toISOString(), markedManually: true });
  }
  fs.writeFileSync(OUTREACH_LOG, JSON.stringify(entries, null, 2));
  res.json({ ok: true });
});

app.post('/api/mark-unsent', authMiddleware, (req, res) => {
  const { email } = req.body;
  if (!fs.existsSync(OUTREACH_LOG)) return res.json({ ok: true });
  try {
    let entries = JSON.parse(fs.readFileSync(OUTREACH_LOG, 'utf8'));
    entries = entries.filter(e => e.email?.toLowerCase() !== email.toLowerCase());
    fs.writeFileSync(OUTREACH_LOG, JSON.stringify(entries, null, 2));
  } catch {}
  res.json({ ok: true });
});

app.post('/api/mark-replied', authMiddleware, (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  let entries = [];
  if (fs.existsSync(OUTREACH_LOG)) { try { entries = JSON.parse(fs.readFileSync(OUTREACH_LOG, 'utf8')); } catch {} }
  const record = entries.find(e => e.email?.toLowerCase() === email.toLowerCase());
  if (record) {
    record.replied = true;
    record.repliedAt = new Date().toISOString();
  } else {
    // If not in the log yet, add it as sent and replied immediately
    entries.push({ email, username: '', sentAt: new Date().toISOString(), replied: true, repliedAt: new Date().toISOString(), markedManually: true });
  }
  fs.writeFileSync(OUTREACH_LOG, JSON.stringify(entries, null, 2));
  res.json({ ok: true });
});


// ─── SIGN-UP ANALYTICS ───
// Fetches live creator sign-up data and cross-references
// with all scraped emails to measure outreach→signup conversion.

async function loadSignups() {
  try {
    console.log('[DEBUG] Calling loadSignups() (single fetch, API caps at 1000)...');
    const response = await fetch('https://app.v1ra.com/api/email-outreach');
    if (!response.ok) {
      console.error('Failed to fetch signups from API. Status:', response.status);
      return [];
    }
    const parsed = await response.json();
    const raw = Array.isArray(parsed) ? parsed : (parsed.data || []);
    console.log(`[DEBUG] V1RA API total count: ${parsed.count || raw.length}, returned: ${raw.length}`);

    // Deduplicate by email (safety net)
    const seen = new Set();
    const signups = raw.filter(r => {
      const email = (r.email || '').toLowerCase().trim();
      if (!email || seen.has(email)) return false;
      seen.add(email);
      return true;
    });
    console.log(`[DEBUG] loadSignups() complete: ${signups.length} unique signups`);
    return signups;
  } catch (e) {
    console.error('loadSignups error fetching from API:', e.message);
    return [];
  }
}

app.get(['/api/influencer-stats', '/api/signups'], authMiddleware, async (req, res) => {
  console.log('[DEBUG] Hit signups endpoint!', req.originalUrl);
  try {
    // Build Set of all scraped emails from memory (already normalised)
    const scrapedEmails = new Set();
    console.log('[DEBUG] Global state creator length:', GLOBAL_STATE.global_creator?.length);
    [...(GLOBAL_STATE.global_creator || []), ...(GLOBAL_STATE.global_brand || [])].forEach(r => {
      if (r.email) {
        // Use try catch just in case email is not a valid string
        try { scrapedEmails.add(String(r.email).toLowerCase().trim()); } catch(e) {}
      }
    });

    const signups = await loadSignups();
    
    // Apply date filter
    const { startDate, endDate } = req.query;
    let filteredSignups = signups;
    if (startDate || endDate) {
      filteredSignups = signups.filter(s => {
        const raw = s.created_at || s.createdAt || '';
        if (!raw) return !startDate; // fallback if record missing date
        const d = String(raw).slice(0, 10);
        if (startDate && d < startDate) return false;
        if (endDate   && d > endDate)   return false;
        return true;
      });
    }

    const total = filteredSignups.length;
    const with_socials = filteredSignups.filter(s => Array.isArray(s.social_accounts) && s.social_accounts.length > 0).length;
    const email_only   = filteredSignups.filter(s => !Array.isArray(s.social_accounts) || s.social_accounts.length === 0).length;

    // Cross-reference: sign-ups whose email exists in our scraped list
    const matched = filteredSignups.filter(s => s.email && scrapedEmails.has(String(s.email).toLowerCase().trim()));
    const from_our_emails = matched.length;

    // Lightweight mapper for all users
    const mapUser = s => ({
      name: s.name || '',
      email: s.email || '',
      country: s.locations?.country || '',
      has_socials: Array.isArray(s.social_accounts) && s.social_accounts.length > 0,
      socials: (s.social_accounts || []).map(sa => `${sa.platform}:${sa.username}`).join(', '),
      platform_list: (s.social_accounts || []).map(sa => (sa.platform || '').toLowerCase()).filter(Boolean)
    });

    const all_records            = filteredSignups.map(mapUser);
    const records_from_our_emails = matched.map(mapUser);

    const signupEmails = new Set(filteredSignups.map(s => String(s.email).toLowerCase().trim()));
    const outreach = readOutreach();
    const non_converted_records = Object.values(outreach)
      .filter(r => r.email && !signupEmails.has(r.email.toLowerCase().trim()))
      .map(r => ({ name: r.username || r.name || '', email: r.email }));

    res.json({ total, from_our_emails, with_socials, email_only, all_records, records_from_our_emails, non_converted_records });
  } catch (e) { 
    console.error('API Error /api/signups:', e);
    res.status(500).json({ error: e.message }); 
  }
});

app.listen(PORT, async () => {
  console.log(`\n⚡ Scraper Command Center v2.1 → http://localhost:${PORT}\n`);
  await refreshGlobalData();
  lastRefresh = Date.now();
  if (!isVercel) {
    setInterval(refreshGlobalData, 60000);
  }
});
process.on('SIGINT', async () => { if (mongoClient) await mongoClient.close(); process.exit(0); });
