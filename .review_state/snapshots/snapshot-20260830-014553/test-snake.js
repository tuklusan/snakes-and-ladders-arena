const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
  const page = await browser.newPage();
  await page.goto('http://localhost:8080/test_snake.html');
  // Wait for the output element to have the expected content (timeout 90 seconds)
  await page.waitForFunction(() => {
    const out = document.getElementById('out');
    return out && out.textContent.includes('REAL CONTROLLER PATH');
  }, { timeout: 90000 });
  const output = await page.evaluate(() => document.getElementById('out').textContent);
  console.log(output);
  await browser.close();
})();