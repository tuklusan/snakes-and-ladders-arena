const { JSDOM } = require('jsdom');
const fs = require('fs');
const vm = require('vm');

// Create a virtual window with a game-container div
const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="game-container"></div></body></html>`);
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

// Function to load a script into the window context
function loadScript(filename) {
  const code = fs.readFileSync(filename, 'utf8');
  // We need to run the code in the context of the window
  const context = vm.createContext(window);
  try {
    vm.runInContext(code, context, { filename, lineOffset: 0, displayErrors: true });
    console.log(`Loaded ${filename}`);
  } catch (e) {
    console.error(`Error loading ${filename}:`, e);
    throw e;
  }
}

// Load the game scripts
try {
  loadScript('./src/js/gameModel.js');
  loadScript('./src/js/gameController.js');
  loadScript('./src/js/gameView.js');
  console.log('All scripts loaded');
} catch (e) {
  console.error('Failed to load scripts');
  process.exit(1);
}

// Now, GameModel, GameController, GameView should be attached to window
console.log('GameModel defined:', typeof window.GameModel);
console.log('GameController defined:', typeof window.GameController);
console.log('GameView defined:', typeof window.GameView);

if (typeof window.GameModel !== 'function' ||
    typeof window.GameController !== 'function' ||
    typeof window.GameView !== 'function') {
  console.error('One or more game classes are not defined correctly');
  process.exit(1);
}

// Create instances
const model = new window.GameModel();
const view = new window.GameView();
const controller = new window.GameController(model, view);

// Initialize the view
try {
  view.init(model, controller);
  console.log('View initialized successfully');
} catch (e) {
  console.error('Error initializing view:', e);
  process.exit(1);
}

// After init, we expect the container to have been modified
const container = document.getElementById('game-container');
if (!container) {
  console.error('Container not found after init');
  process.exit(1);
}

// Check if the container has children
console.log('Container children count:', container.children.length);
if (container.children.length === 0) {
  console.error('Container has no children after view init');
  // Let's see what the container's innerHTML is
  console.log('Container innerHTML:', container.innerHTML);
  process.exit(1);
}

// Optionally, check for specific elements
const loadingOverlay = document.getElementById('loading-overlay');
if (loadingOverlay) {
  console.log('Loading overlay found');
} else {
  console.log('Loading overlay not found');
}

const boardElement = document.getElementById('game-board');
if (boardElement) {
  console.log('Board element found');
} else {
  console.log('Board element not found');
}

console.log('DOM test completed');