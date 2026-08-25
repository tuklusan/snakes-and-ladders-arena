const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:8080/diag_accept.html', { waitUntil: 'networkidle0' });

  // Wait for the iframe to load and then for the test to run.
  // The test in diag_accept.html sets up an iframe and then runs the test after 3500ms.
  // We'll wait for the iframe to be present, then wait for its load, then wait 3500ms.
  const iframeSelector = '#f';
  await page.waitForSelector(iframeSelector);
  const frame = await page.frames().find(f => f.name() === '');
  // Actually, we can get the iframe element and wait for its load.
  const iframeHandle = await page.$(iframeSelector);
  await iframeHandle.waitForElementState('stable'); // Not exactly load, but we can wait for load event.
  // Wait for iframe to load by waiting for a known element inside it, e.g., the game board.
  // We'll wait for the iframe to load by waiting for the game board inside it.
  // Since we don't know when the iframe load completes, we can wait for a timeout and then check.
  // Better: wait for the iframe to load by waiting for the 'load' event via page.waitForFunction.
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