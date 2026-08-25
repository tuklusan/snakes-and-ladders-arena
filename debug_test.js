const fs = require('fs');
const { JSDOM } = require('jsdom');

async function fetchHTML(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return await response.text();
}

(async () => {
  try {
    const diagAcceptTestHTML = await fetchHTML('http://localhost:8000/diag_accept_test.html');
    console.log('Fetched diag_accept_test.html, length:', diagAcceptTestHTML.length);
    const dom = new JSDOM(diagAcceptTestHTML, {
      runScripts: 'dangerously',
      resources: 'usable',
      pretendToBeVisual: true,
    });
    const window = dom.window;
    const document = window.document;
    console.log('Window location:', window.location.href);
    const iframe = document.getElementById('f');
    console.log('Iframe element:', iframe);
    if (iframe) {
      console.log('Iframe src:', iframe.src);
      console.log('Iframe contentWindow:', iframe.contentWindow);
      console.log('Iframe contentDocument:', iframe.contentDocument);
      // If the iframe already has content, we can try to run the run function
      if (iframe.contentDocument) {
        console.log('Iframe has contentDocument');
        try {
          window.run();
          console.log('window.run called');
          const output = document.getElementById('out').textContent;
          console.log('Output:', output);
        } catch (e) {
          console.log('Error calling window.run:', e.message);
        }
      }
    }
  } catch (e) {
    console.error('Error:', e);
  }
})();
