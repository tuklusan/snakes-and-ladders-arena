const { JSDOM } = require('jsdom');
const fs = require('fs');

// Create a virtual window with a game-container div
const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="game-container"></div></body></html>`);
const window = dom.window;
const document = window.document;

// Mock the alert function since jsdom doesn't implement it by default
window.alert = (msg) => {
    console.log('Alert: ' + msg);
};

// Also mock console.error to capture errors
const originalError = console.error;
console.error = (...args) => {
    originalError(...args);
};

// Function to inject a script into the document
function injectScript(filename) {
    const code = fs.readFileSync(filename, 'utf8');
    const script = document.createElement('script');
    script.textContent = code;
    document.head.appendChild(script);
}

// Inject the game scripts
try {
    injectScript('./src/js/gameModel.js');
    injectScript('./src/js/gameController.js');
    injectScript('./src/js/gameView.js');
    // We don't inject main.js because we want to control the creation
} catch (e) {
    console.error('Error injecting scripts:', e);
    process.exit(1);
}

// Give the scripts a moment to execute (should be immediate)
// We'll wait a bit using setTimeout, but since we are in node, we can just continue.
// However, to be safe, we can wait for a promise that resolves after a short time.
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

wait(100).then(() => {
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
}).catch((e) => {
    console.error('Error in test:', e);
    process.exit(1);
});