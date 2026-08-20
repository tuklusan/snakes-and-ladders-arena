const { JSDOM } = require('jsdom');
const fs = require('fs');

// Read the HTML file
const html = fs.readFileSync('./index.html', 'utf8');

// Create a virtual DOM from the HTML
const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable"
});

const window = dom.window;
const document = window.document;

// Mock the alert function
window.alert = (msg) => {
  console.log('Alert: ' + msg);
};

// Mock the Audio constructor
window.Audio = class {
  constructor(src) {
    this.src = src;
    this.currentTime = 0;
  }
  play() {
    return Promise.resolve();
  }
  pause() {
    return Promise.resolve();
  }
};

// We'll wait for the loading overlay to be hidden as a sign that assets are loaded
return new Promise((resolve, reject) => {
  // Check periodically for the loading overlay being hidden
  const checkLoading = () => {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (!loadingOverlay) {
      // Loading overlay removed from DOM
      console.log('Loading overlay removed from DOM');
      // Now print the container's innerHTML
      const container = document.getElementById('game-container');
      if (container) {
        console.log('Container innerHTML:', container.innerHTML);
        // Also list the children
        console.log('Container children:');
        for (let i = 0; i < container.children.length; i++) {
          const child = container.children[i];
          console.log(`  ${i}: ${child.tagName} ${child.id?('#'+child.id:'')} ${child.className?('.'+child.className:'')}`);
        }
        resolve('Loading overlay removed');
      } else {
        console.log('Container not found');
        resolve('Loading overlay removed but container missing');
      }
      return;
    }
    const display = window.getComputedStyle(loadingOverlay).display;
    if (display === 'none') {
      console.log('Loading overlay hidden (display:none)');
      // Now print the container's innerHTML
      const container = document.getElementById('game-container');
      if (container) {
        console.log('Container innerHTML:', container.innerHTML);
        // Also list the children
        console.log('Container children:');
        for (let i = 0; i < container.children.length; i++) {
          const child = container.children[i];
          console.log(`  ${i}: ${child.tagName} ${child.id?('#'+child.id:'')} ${child.className?('.'+child.className:'')}`);
        }
        resolve('Loading overlay hidden');
      } else {
        console.log('Container not found');
        resolve('Loading overlay hidden but container missing');
      }
      return;
    }
    // Otherwise, wait a bit and check again
    setTimeout(checkLoading, 100);
  };

  // Start checking after a short delay to allow scripts to run
  setTimeout(checkLoading, 200);

  // Timeout after 10 seconds
  setTimeout(() => {
    reject(new Error('Timeout waiting for loading overlay to be hidden'));
  }, 10000);
}).then((result) => {
  console.log(`SUCCESS: ${result}`);
}).catch((err) => {
  console.error(`FAILED: ${err}`);
  process.exit(1);
});
