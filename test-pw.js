const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  await page.goto('http://localhost:3000/api/login'); // just to grab token if it was GET? No, it's POST.
  await page.request.post('http://localhost:3000/api/login', {
      data: { username: 'v1ra@admin', password: 'ash' }
  });

  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  
  await page.evaluate(() => {
    if (window.switchView) window.switchView('creator');
  });
  await page.waitForTimeout(2000);
  
  const html = await page.evaluate(() => document.getElementById('signup-analytics-tbody').innerHTML);
  console.log('TBODY HTML:', html.substring(0, 150));
  
  const stats = await page.evaluate(() => document.getElementById('signup-match-stats').textContent);
  console.log('STATS TEXT:', stats);

  await browser.close();
})();
