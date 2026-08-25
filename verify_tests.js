const puppeteer = require('puppeteer');

async function testPage(url) {
  const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox']});
  const page = await browser.newPage();
  await page.goto(url);
  // Wait for the output to change from the initial message, with a timeout of 20 seconds
  await page.waitForFunction(() => {
    const out = document.getElementById('out');
    return out && out.textContent !== 'waiting for game to initialise...';
  }, { timeout: 20000 });
  const text = await page.evaluate(() => document.getElementById('out').textContent);
  await browser.close();
  return text;
}

(async () => {
  try {
    console.log('Testing ladder case (diag_live.html)...');
    const ladderResult = await testPage('http://localhost:8080/diag_live.html');
    console.log('Ladder result:\n', ladderResult);
    
    console.log('\nTesting snake case (test_snake.html)...');
    const snakeResult = await testPage('http://localhost:8080/test_snake.html');
    console.log('Snake result:\n', snakeResult);
  } catch (e) {
    console.error('Error during testing:', e);
  }
})();