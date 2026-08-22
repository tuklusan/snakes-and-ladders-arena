const fs = require('fs');
const { JSDOM } = require('jsdom');

// Use the built-in fetch in Node.js v20+
async function fetchHTML(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return await response.text();
}

async function testConsole() {
  try {
    const diagConsoleHTML = await fetchHTML('http://localhost:8000/diag_console.html');
    const dom = new JSDOM(diagConsoleHTML, {
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
        // After iframe loads, wait 100 seconds for the console watcher to run
        setTimeout(() => {
          try {
            const output = document.getElementById('out').textContent;
            resolve(output);
          } catch (e) {
            resolve('ERROR: ' + e.message);
          }
        }, 100 * 1000); // 100 seconds
      });
    });
  } catch (e) {
    return 'ERROR: ' + e.message;
  }
}

testConsole().then(result => {
  console.log('Console watcher result:');
  console.log(result);
  // Extract errors= and distinct=
  const lines = result.split('\n').filter(line => line.trim());
  for (const line of lines) {
    if (line.startsWith('CONSOLE WATCH')) {
      console.log(line);
      // We can parse the errors and distinct from this line
      // Example: "CONSOLE WATCH  elapsed 93s  hooked=true
      //          errors=4  distinct=1  warnings=0"
      const match = line.match(/errors=(\d+).*distinct=(\d+)/);
      if (match) {
        const errors = parseInt(match[1]);
        const distinct = parseInt(match[2]);
        console.log(`Errors: ${errors}, Distinct: ${distinct}`);
      }
      break;
    }
  }
});