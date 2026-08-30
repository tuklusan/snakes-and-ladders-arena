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
  await page.waitForFunction(() => true, { timeout: 5000 });

  // Now get detailed info from the iframe.
  const info = await page.evaluate(() => {
    const iframe = document.querySelector('#f');
    if (!iframe || !iframe.contentDocument) {
      return { error: 'iframe or contentDocument not found' };
    }
    const out = iframe.contentDocument.getElementById('out');
    let result = {
      outExists: !!out,
      outTextContent: out ? out.textContent : null,
      outInnerHTML: out ? out.innerHTML : null,
      bodyLength: iframe.contentDocument.body.innerHTML.length
    };
    // Also check if there are any error messages in the body
    if (iframe.contentDocument.body.innerHTML.includes('ERROR')) {
      const errorMatch = iframe.contentDocument.body.innerHTML.match(/ERROR [^\n]*/);
      result.errorInBody = errorMatch ? errorMatch[0] : null;
    }
    return result;
  });

  console.log('Info from iframe:');
  console.log(info);

  await browser.close();
})();