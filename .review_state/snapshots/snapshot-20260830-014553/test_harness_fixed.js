nsole.log("Test harness started");
console.log("Starting test harness...");
const fs = require('fs');
const { JSDOM } = require('jsdom');

async function fetchHTML(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return await response.text();
}

async function runTest() {
  try {
    const diagAcceptTestHTML = await fetchHTML('http://localhost:8000/diag_accept_test.html');
    const dom = new JSDOM(diagAcceptTestHTML, {
      runScripts: 'dangerously',
      resources: 'usable',
      pretendToBeVisual: true,
    });
    const window = dom.window;
    const document = window.document;
    // Wait for iframe to load
    return new Promise((resolve) => {
      const iframe = document.getElementById('f');
      if (!iframe) {
        resolve('ERROR: iframe not found');
        return;
      }
      iframe.addEventListener('load', () => {
        // After iframe loads, wait a bit for assets to load
        setTimeout(() => {
          try {
            // Now call the run function (defined in the parent window)
            window.run();
            const output = document.getElementById('out').textContent;
            resolve(output);
          } catch (e) {
            resolve('ERROR: ' + e.message);
          }
        }, 5000); // wait for assets to load
      });
    });
  } catch (e) {
    return 'ERROR: ' + e.message;
  }
}

runTest().then(result => {
  console.log('Test result:');
  console.log(result);
  // Count PASS and FAIL lines
  const lines = result.split('\n').filter(line => line.trim());
  let pass = 0, fail = 0;
  for (const line of lines) {
    if (line.startsWith('PASS  ')) pass++;
    else if (line.startsWith('FAIL  ')) fail++;
  }
  console.log(`PASS: ${pass}, FAIL: ${fail}`);
});console.log("Test harness ended");
