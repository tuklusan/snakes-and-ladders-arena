const fs = require('fs');
const { JSDOM } = require('jsdom');

// Load the diag_accept.html to get the run function
const diagAccept = fs.readFileSync('./diag_accept.html', 'utf8');
// Extract the run function from the script tag
// We'll just evaluate the entire script in a new JSDOM window to define run
async function getTestResult(domHtml) {
  const dom = await JSDOM.fromFile(domHtml, {
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
      // After iframe loads, wait a bit for assets to load (we'll use a setTimeout)
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
}

// Now we need to get the current DOM of index.html as it would be in the iframe.
// We'll load index.html directly and then set it as the iframe's content? 
// Instead, we can load index.html in a separate JSDOM and then assign its window.document to the iframe's contentDocument.
// But that's complex.

// Simpler: we can just run the test by loading diag_accept.html and letting it load index.html in the iframe.
// We already have that function getTestResult.

getTestResult('./diag_accept.html').then(result => {
  console.log('Test result:');
  console.log(result);
});