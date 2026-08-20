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

// We'll listen for the error event on window to catch any script errors
window.addEventListener('error', (e) => {
  console.error('Script error:', e.error);
});

// Wait for DOMContentLoaded
return new Promise((resolve) => {
  window.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired');
    // Check if GameModel is defined on window
    console.log('typeof window.GameModel:', typeof window.GameModel);
    if (typeof window.GameModel === 'function') {
      console.log('SUCCESS: GameModel is defined as a function');
      // Try to create an instance
      try {
        const model = new window.GameModel();
        console.log('GameModel instance created:', model);
        resolve();
      } catch (e) {
        console.error('Error creating GameModel instance:', e);
        resolve(e);
      }
    } else {
      console.error('GameModel is not defined or not a function');
      // Let's see what is on window
      console.log('window object has GameModel?', 'GameModel' in window);
      // Check if there are any script errors by looking at the console? We don't have access.
      // Let's check the document for script elements and see if they have any error? Not easily.
      resolve(new Error('GameModel not defined'));
    }
  });

  // Timeout after 5 seconds
  setTimeout(() => {
    console.error('DOMContentLoaded timeout');
    resolve(new Error('Timeout'));
  }, 5000);
});
