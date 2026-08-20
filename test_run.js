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
      resolve('Loading overlay removed');
      return;
    }
    const display = window.getComputedStyle(loadingOverlay).display;
    if (display === 'none') {
      resolve('Loading overlay hidden');
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
  // Additionally, check that the roll button is enabled
  const rollButton = document.getElementById('roll-button');
  if (rollButton) {
    const disabled = rollButton.disabled;
    console.log(`Roll button disabled: ${disabled}`);
    if (!disabled) {
      console.log('Roll button is enabled as expected.');
    } else {
      console.warn('Roll button is still disabled.');
    }
  } else {
    console.warn('Roll button not found.');
  }
  // Check that the game board is present
  const gameBoard = document.getElementById('game-board');
  if (gameBoard) {
    console.log('Game board found.');
    // Check that it has a background image
    const bgImage = window.getComputedStyle(gameBoard).backgroundImage;
    if (bgImage && bgImage !== 'none') {
      console.log('Game board has background image.');
    } else {
      console.warn('Game board has no background image.');
    }
  } else {
    console.warn('Game board not found.');
  }
  // Check that token elements are present
  const tokens = document.querySelectorAll('.game-token');
  console.log(`Found ${tokens.length} token elements.`);
  if (tokens.length === 4) {
    console.log('Correct number of tokens.');
  } else {
    console.warn('Expected 4 tokens, found ' + tokens.length);
  }
  // Check that dice element is present
  const diceElement = document.getElementById('dice-container');
  if (diceElement) {
    const diceBg = window.getComputedStyle(diceElement).backgroundImage;
    if (diceBg && diceBg !== 'none') {
      console.log('Dice element has background image (showing a face).');
    } else {
      console.log('Dice element has no background image (maybe no roll yet).');
    }
  } else {
    console.warn('Dice element not found.');
  }
}).catch((err) => {
  console.error(`FAILED: ${err}`);
  process.exit(1);
});