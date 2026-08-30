const puppeteer = require('puppeteer');

async function runDiagErrors() {
  console.log('Running diag_errors.html...');
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  // Listen for console messages to capture errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  // Also listen for page errors
  page.on('pageerror', err => {
    errors.push(err.toString());
  });
  
  await page.goto('file://' + process.cwd() + '/diag_errors.html', { waitUntil: 'networkidle0' });
  
  // Wait for the test to complete - the diag_errors.html script will update the #out element
  await page.waitForFunction(() => {
    const out = document.querySelector('#out');
    return out && out.textContent !== 'waiting...' && out.textContent !== '';
  }, { timeout: 30000 });
  
  const output = await page.evaluate(() => document.querySelector('#out').textContent);
  await browser.close();
  
  console.log('diag_errors.html output:');
  console.log(output);
  
  // Check if there are any errors
  const lines = output.split('\n');
  let errorCount = 0;
  for (const line of lines) {
    if (line.includes('errors       :')) {
      const parts = line.split(':');
      if (parts.length >= 2) {
        errorCount = parseInt(parts[1].trim()) || 0;
      }
      break;
    }
  }
  
  return { errorCount, output };
}

async function runDiagAccept() {
  console.log('Running diag_accept.html...');
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('file://' + process.cwd() + '/diag_accept.html', { waitUntil: 'networkidle0' });
  
  // Wait for the test to complete - the diag_accept.html script will update the #out element
  await page.waitForFunction(() => {
    const out = document.querySelector('#out');
    return out && out.textContent !== 'pending' && out.textContent !== '';
  }, { timeout: 30000 });
  
  const output = await page.evaluate(() => document.querySelector('#out').textContent);
  await browser.close();
  
  console.log('diag_accept.html output:');
  console.log(output);
  
  // Check if all tests passed
  const lines = output.split('\n');
  let failedCount = 0;
  for (const line of lines) {
    if (line.includes('FAIL  ')) {
      failedCount++;
    }
  }
  
  return { failedCount, output };
}

async function main() {
  console.log('Running diagnostics to verify the fix...\n');
  
  // Run diag_errors.html three times as required
  let allErrorsPassed = true;
  for (let i = 1; i <= 3; i++) {
    console.log(`\n=== Run ${i}/3 of diag_errors.html ===\n`);
    const result = await runDiagErrors();
    if (result.errorCount > 0) {
      console.log(`❌ Run ${i} FAILED: ${result.errorCount} errors found`);
      allErrorsPassed = false;
    } else {
      console.log(`✅ Run ${i} PASSED: 0 errors found`);
    }
  }
  
  console.log('\n=== Running diag_accept.html ===\n');
  const acceptResult = await runDiagAccept();
  const acceptPassed = acceptResult.failedCount === 0;
  if (acceptPassed) {
    console.log('✅ diag_accept.html PASSED: All visual tests passed');
  } else {
    console.log(`❌ diag_accept.html FAILED: ${acceptResult.failedCount} visual tests failed`);
  }
  
  console.log('\n=== SUMMARY ===');
  if (allErrorsPassed && acceptPassed) {
    console.log('🎉 ALL DIAGNOSTICS PASSED - Fix verified successfully!');
    return 0;
  } else {
    console.log('❌ SOME DIAGNOSTICS FAILED - Fix needs more work');
    return 1;
  }
}

main().then(exitCode => {
  process.exit(exitCode);
}).catch(err => {
  console.error('Failed to run diagnostics:', err);
  process.exit(1);
});