const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
  const page = await browser.newPage();
  await page.goto('http://localhost:8080/walk6.html');
  // Wait for the output element to have non-x content
  await page.waitForFunction(() => {
    const out = document.getElementById('out');
    return out && out.textContent.trim() !== 'x';
  });
  const output = await page.evaluate(() => document.getElementById('out').textContent);
  console.log(output);
  await browser.close();
})();