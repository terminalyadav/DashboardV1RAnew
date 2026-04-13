const http = require('http');

async function check() {
  try {
    const loginRes = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'v1ra@admin', password: 'ash' })
    });
    
    // built-in fetch uses Headers API
    const cookieHeader = loginRes.headers.get('set-cookie');
    if (!cookieHeader) {
      console.log('No cookie returned on login');
      return;
    }
    const cookie = cookieHeader.split(';')[0];
    
    console.log('Sending GET /api/signups with cookie:', cookie);
    
    const signupsRes = await fetch('http://localhost:3000/api/signups', {
      headers: { 'Cookie': cookie }
    });
    
    console.log('API Status:', signupsRes.status);
    const text = await signupsRes.text();
    console.log('API Body:', text);
  } catch (err) {
    console.error('Error in check script:', err.message);
  }
}

check();
