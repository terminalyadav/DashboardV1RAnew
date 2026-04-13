const fs = require('fs');
async function loadSignups() {
  try {
    const response = await fetch('https://app.v1ra.com/api/email-outreach');
    if (!response.ok) {
      console.error('Failed to fetch signups from API. Status:', response.status);
      return [];
    }
    const parsed = await response.json();
    return Array.isArray(parsed) ? parsed : (parsed.data || []);
  } catch (e) { 
    console.error('loadSignups error fetching from API:', e.message); 
    return []; 
  }
}

async function testSignups() {
  const signups = await loadSignups();
  console.log("Total signups fetched:", signups.length);
  const with_socials = signups.filter(s => Array.isArray(s.social_accounts) && s.social_accounts.length > 0).length;
  const email_only   = signups.filter(s => !Array.isArray(s.social_accounts) || s.social_accounts.length === 0).length;
  console.log("With socials:", with_socials, "Email only:", email_only);
}

testSignups();
