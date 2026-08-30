const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/snap/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });
  const page = await browser.newPage();
  
  // Array to store log entries
  const logs = [];
  
  // Listen for console messages
  page.on('console', msg => {
    const text = msg.text();
    // We only care about our gameView logs
    if (text.includes('[gameView]')) {
      logs.push(text);
      // Keep only recent logs to avoid memory issues, but we need all for five turns
      // We'll keep all for now.
    }
  });
  
  // Listen for page errors
  page.on('pageerror', err => console.log('PAGE ERROR:', err));
  
  await page.goto('http://localhost:8000', { waitUntil: 'networkidle0' });
  
  // Wait for the game container to be present
  await page.waitForSelector('#game-container', { timeout: 10000 });
  
  // Wait for loading overlay to disappear (if present) - removed as we logs show it hides.
  
  // Wait for 60 seconds to accumulate logs for about twenty turns.
// Since autoRoll is every 1.8 seconds plus animation time, say ~3 seconds per turn.
// For ten turns, wait 30 seconds; for twenty, wait 60.
  console.log('Waiting for 60 seconds to accumulate logs...');
  await new Promise(resolve => setTimeout(resolve, 60000));
  
  // Now extract the logs we collected
  const gameLogs = logs.filter(l => l.startsWith('[gameView]'));
  
  // We need to parse out the timestamps for five consecutive turns.
  // We'll look for patterns:
  // move start
  // dice tumble start
  // dice settled
  // delay complete
  // piece move start
  
  // We'll group logs by turn based on move start timestamps.
  const turnLogs = [];
  let currentTurn = [];
  for (const log of gameLogs) {
    if (log.includes('[gameView] move start at ')) {
      if (currentTurn.length > 0) {
        turnLogs.push(currentTurn);
      }
      currentTurn = [log];
    } else {
      currentTurn.push(log);
    }
  }
  if (currentTurn.length > 0) {
    turnLogs.push(currentTurn);
  }
  
  // We need at least five turns
  if (turnLogs.length < 5) {
    console.log(`Only captured ${turnLogs.length} turns, need 5`);
    // Print what we have
    for (let i = 0; i < turnLogs.length; i++) {
      console.log(`Turn ${i+1}:`);
      turnLogs[i].forEach(l => console.log(`  ${l}`));
    }
  } else {
    console.log('Successfully captured at least 5 turns. Showing first 5:');
    for (let i = 0; i < 5; i++) {
      console.log(`Turn ${i+1}:`);
      turnLogs[i].forEach(l => console.log(`  ${l}`));
    }
  }
  
  await browser.close();
})();