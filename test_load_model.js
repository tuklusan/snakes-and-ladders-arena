const { JSDOM } = require('jsdom');
const fs = require('fs');

const html = `<!DOCTYPE html><html><body><div id="game-container"></div></body></html>`;
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

// Load the gameModel.js script by reading the file and injecting it
const modelCode = fs.readFileSync('./src/js/gameModel.js', 'utf8');
const script = document.createElement('script');
script.textContent = modelCode;
document.head.appendChild(script);

// Now check if GameModel is defined on window
console.log('typeof window.GameModel:', typeof window.GameModel);
if (typeof window.GameModel === 'function') {
  console.log('SUCCESS: GameModel is defined as a function');
  // Try to create an instance
  try {
    const model = new window.GameModel();
    console.log('GameModel instance created:', model);
  } catch (e) {
    console.error('Error creating GameModel instance:', e);
  }
} else {
  console.error('FAILURE: GameModel is not defined or not a function');
}
