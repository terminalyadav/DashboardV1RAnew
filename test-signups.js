const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, res => {
  let cookie = res.headers['set-cookie'][0].split(';')[0];
  
  const getOpt = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/signups',
    method: 'GET',
    headers: { 'Cookie': cookie }
  };
  
  const getReq = http.request(getOpt, res2 => {
    let rawData = '';
    res2.on('data', chunk => { rawData += chunk; });
    res2.on('end', () => {
      console.log('Status:', res2.statusCode);
      console.log('Body:', rawData);
    });
  });
  getReq.end();
});

req.write(JSON.stringify({ username: 'v1ra@admin', password: 'ash' }));
req.end();
