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

  // Wait a bit more for the test to run (the test in diag_accept.html waits 3500ms after iframe load)
  // Use waitForFunction with a true condition and a timeout of 5000 ms.
  await page.waitForFunction(() => true, { timeout: 5000 });

  // Now get the output from the iframe.
  const output = await page.evaluate(() => {
    const iframe = document.querySelector('#f');
    if (!iframe || !iframe.contentDocument) return null;
    const pre = iframe.contentDocument.getElementById('out');
    return pre ? pre.textContent : null;
  });

  console.log('Test output:');
  console.log(output);

  // Also log the iframe's body to see if the game is running
  const iframeBody = await page.evaluate(() => {
    const iframe = document.querySelector('#f');
    if (!iframe || !iframe.contentDocument) return null;
    return iframe.contentDocument.body.innerHTML;
  });
  console.log('Iframe body length:', iframeBody ? iframeBody.length : 0);

  await browser.close();
})();