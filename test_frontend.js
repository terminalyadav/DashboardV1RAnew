const { chromium } = require('playwright');

(async () => {
  console.log("Starting headless browser test...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to all console logs from the frontend
  page.on('console', msg => console.log('FRONTEND CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('FRONTEND ERROR:', err.message));

  console.log("Navigating to login...");
  await page.goto('http://localhost:3000/login');
  
  console.log("Logging in...");
  await page.fill('input[type="text"]', 'v1ra@admin');
  await page.fill('input[type="password"]', 'ash');
  await page.click('button[type="submit"]');

  console.log("Waiting for dashboard to load...");
  await page.waitForTimeout(3000); 

  console.log("Checking UI state...");
  const uiState = await page.evaluate(() => {
    return {
      tableText: document.getElementById('signup-analytics-tbody')?.innerText || 'Not Found',
      matchStats: document.getElementById('signup-match-stats')?.innerText || 'Not Found',
      signupData: window._signupData
    };
  });
  
  console.log('Playwright Test UI State:', uiState);
  await browser.close();
})();
