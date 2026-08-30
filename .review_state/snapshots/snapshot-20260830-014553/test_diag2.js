const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:8080/diag_accept.html', { waitUntil: 'networkidle0' });

  // Wait for the iframe to load
  await page.waitForSelector('#f');
  // Wait for the iframe to load by waiting for its contentDocument to have a readyState of complete.
  await page.waitForFunction(() => {
    const iframe = document.querySelector('#f');
    return iframe && iframe.contentDocument && iframe.contentDocument.readyState === 'complete';
  }, { timeout: 10000 });

  // Wait for the test to run and output to change from pending
  await page.waitForFunction(() => {
    const iframe = document.querySelector('#f');
    if (!iframe || !iframe.contentDocument) return false;
    const pre = iframe.contentDocument.getElementById('out');
    return pre && pre.textContent !== 'pending';
  }, { timeout: 15000 });

  // Now get the output
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
