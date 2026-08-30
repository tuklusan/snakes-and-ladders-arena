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

  // Wait an additional 4 seconds for the test to run
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 4000)));

  // Now get the iframe body and the output
  const result = await page.evaluate(() => {
    const iframe = document.querySelector('#f');
    if (!iframe || !iframe.contentDocument) {
      return { body: null, output: null };
    }
    const body = iframe.contentDocument.body.innerHTML;
    const pre = iframe.contentDocument.getElementById('out');
    const output = pre ? pre.textContent : null;
    return { body, output };
  });

  console.log('Iframe body length:', result.body ? result.body.length : 0);
  console.log('Iframe body snippet:', result.body ? result.body.substring(0, 500) : null);
  console.log('Output:', result.output);

  await browser.close();
})();
