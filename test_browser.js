const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Read the HTML file
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable",
  // We need to pretend we are in a browser so that the scripts can load assets
  // But we will mock the asset loading to avoid network requests
  beforeParse(window) {
    // Mock the Image and Audio constructors
    window.HTMLImageElement = class extends window.Element {
      constructor() {
        super();
        this.src = '';
        this.onload = null;
        this.onerror = null;
      }
    };
    window.HTMLAudioElement = class {
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
  }
});

const window = dom.window;
const document = window.document;

// Wait for the scripts to load and the game to initialize
// We'll wait for the DOMContentLoaded event and then a bit more
return new Promise((resolve) => {
  window.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for assets to load (but we mocked them, so they should be immediate)
    setTimeout(() => {
      try {
        // Check if the game is initialized
        const container = document.getElementById('game-container');
        if (!container) {
          throw new Error('Game container not found');
        }
        // Check if the view has created elements
        const board = document.getElementById('game-board');
        if (!board) {
          throw new Error('Board element not found');
        }
        const tokens = document.getElementsByClassName('game-token');
        if (tokens.length !== 4) {
          throw new Error(`Expected 4 tokens, found ${tokens.length}`);
        }
        const dice = document.getElementById('dice-container');
        if (!dice) {
          throw new Error('Dice element not found');
        }
        const rollButton = document.getElementById('roll-button');
        if (!rollButton) {
          throw new Error('Roll button not found');
        }
        // Click the roll button
        rollButton.click();
        // Wait a bit for the roll to process
        setTimeout(() => {
          // Check if the dice has changed
          const diceBackground = dice.style.backgroundImage;
          if (diceBackground === '') {
            throw new Error('Dice background is empty after roll');
          }
          console.log('Game loaded and roll button works!');
          resolve();
        }, 500);
      } catch (e) {
        console.error('Test failed:', e);
        process.exit(1);
      }
    }, 1000);
  });
});