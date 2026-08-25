const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/snap/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });
  const page = await browser.newPage();
  // Listen for console messages
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

  // Let's also wait for the game container to be present in the iframe.
  await page.waitForFunction(() => {
    const iframe = document.querySelector('#f');
    if (!iframe || !iframe.contentDocument) return false;
    return iframe.contentDocument.getElementById('game-container') !== null;
  }, { timeout: 10000 });

  // Log the iframe's body to see what's inside
  const iframeBody = await page.evaluate(() => {
    const iframe = document.querySelector('#f');
    if (!iframe || !iframe.contentDocument) return null;
    return iframe.contentDocument.body.innerHTML;
  });
  console.log('Iframe body length:', iframeBody ? iframeBody.length : 0);
  console.log('Iframe body snippet:', iframeBody ? iframeBody.substring(0, 500) : null);

  // Now wait for the test to run and the output to change from "pending"
  // We'll wait up to 30 seconds for the output to become non-pending.
  let output = '';
  try {
    await page.waitForFunction(() => {
      const iframe = document.querySelector('#f');
      if (!iframe || !iframe.contentDocument) return false;
      const pre = iframe.contentDocument.getElementById('out');
      return pre && pre.textContent !== 'pending';
    }, { timeout: 30000 });
    output = await page.evaluate(() => {
      const iframe = document.querySelector('#f');
      if (!iframe || !iframe.contentDocument) return null;
      const pre = iframe.contentDocument.getElementById('out');
      return pre ? pre.textContent : null;
    });
  } catch (e) {
    console.log('Timeout waiting for output to change from pending');
    // Get the current output anyway
    output = await page.evaluate(() => {
      const iframe = document.querySelector('#f');
      if (!iframe || !iframe.contentDocument) return null;
      const pre = iframe.contentDocument.getElementById('out');
      return pre ? pre.textContent : null;
    });
  }

  console.log('Test output:');
  console.log(output);

  await browser.close();
})();