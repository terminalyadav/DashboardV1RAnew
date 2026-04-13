const http = require('http');

async function testLoginAndFetch() {
  const loginData = JSON.stringify({ username: 'v1ra@admin', password: 'ash' });
  const req = http.request('http://localhost:3000/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  }, (res) => {
    let cookie = res.headers['set-cookie']?.[0].split(';')[0];
    console.log('Got cookie:', cookie);

    http.get('http://localhost:3000/api/influencer-stats', { headers: { Cookie: cookie } }, (res2) => {
      let body = '';
      res2.on('data', c => body += c);
      res2.on('end', () => {
        console.log('Status code:', res2.statusCode);
        console.log('Response:', body.substring(0, 500));
      });
    });
  });
  req.write(loginData);
  req.end();
}
testLoginAndFetch();
