const http = require('http');
const req = http.get('http://localhost:3000/api/signups', { headers: { Cookie: 'session=auth-bypass-test' } }, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, body.substring(0, 500)));
});
req.on('error', e => console.error(e));
