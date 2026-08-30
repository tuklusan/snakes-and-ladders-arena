const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/snap/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:8080/diag_accept.html', { waitUntil: 'networkidle0' });

  // Wait for the iframe to load and then for the test to run.
  // Wait for the iframe to be present.
  await page.waitForSelector('#f');
  // Wait for the iframe to load by waiting for its contentDocument to have a readyState of complete.
  await page.waitForFunction(() => {
    const iframe = document.querySelector('#f');
    return iframe && iframe.contentDocument && iframe.contentDocument.readyState === 'complete';
  });

  // Now wait for the test to run (the script in diag_accept.html sets a timeout of 3500ms after iframe load)
  // We'll wait an additional 4000ms to be safe.
  await page.waitForTimeout(4000);

  // Now get the output from the iframe.
  const output = await page.evaluate(() => {
    const iframe = document.querySelector('#f');
    if (!iframe || !iframe.contentDocument) return null;
    const pre = iframe.contentDocument.getElementById('out');
    return pre ? pre.textContent : null;
  });

  console.log('Test output:');
  console.log(output);

  await browser.close();
})();