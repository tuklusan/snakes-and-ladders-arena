const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/snap/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });
  const page = await browser.newPage();
  // Listen for console messages from the main page and frames
  page.on('console', msg => console.log('PAGE CONSOLE:', msg.text()));
  // Listen for page errors
  page.on('pageerror', err => console.log('PAGE ERROR:', err));

  await page.goto('http://localhost:8080/diag_accept.html', { waitUntil: 'networkidle0' });

  // Wait for the iframe to load and then for the test to run.
  // Wait for the iframe to be present.
  await page.waitForSelector('#f');
  // Wait for the iframe to load by waiting for its contentDocument to have a readyState of complete.
  await page.waitForFunction(() => {
    const iframe = document.querySelector('#f');
    return iframe && iframe.contentDocument && iframe.contentDocument.readyState === 'complete';
  }, { timeout: 10000 });

  // Wait for the test to run and the output to change from "pending"
  // The test runs 3500ms after iframe load.
  await page.waitForFunction(() => {
    const out = document.getElementById('out');
    return out && out.textContent !== 'pending';
  }, { timeout: 20000 });

  // Now get the output from the main page.
  const output = await page.evaluate(() => {
    const out = document.getElementById('out');
    return out ? out.textContent : null;
  });

  console.log('Test output:');
  console.log(output);

  await browser.close();
})();