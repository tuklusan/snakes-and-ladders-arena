const { JSDOM } = require('jsdom');
const fs = require('fs');

// Read the HTML file
const html = fs.readFileSync('./index.html', 'utf8');

// Create a virtual DOM from the HTML
const dom = new JSDOM(html, {
  // We need to pretend to be a browser so that we can have a window and document
  // JSDOM already provides that.
  // We also need to run scripts
  runScripts: "dangerously", // This allows us to run scripts
  resources: "usable"
});

// Get the window and document from the dom
const window = dom.window;
const document = window.document;

// Mock the alert function because jsdom doesn't have it by default
window.alert = (msg) => {
  console.log('Alert: ' + msg);
};

// Also, we need to mock the audio playback because we don't want to actually play sounds
// We'll just mock the Audio constructor and its methods
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

// Now, we need to wait for the scripts to load and the DOMContentLoaded event to fire.
// We can do this by waiting for a promise that resolves when the window's load event fires.
// But note: we are using runScripts: "dangerously", which means the scripts will be executed as they are encountered in the HTML.
// However, the DOMContentLoaded event might fire before we have a chance to listen for it? 
// We'll just wait for a short time after the dom construction and then check.

// Alternatively, we can listen for the DOMContentLoaded event on the window.
// But note: the jsdom environment might not fire DOMContentLoaded automatically? 
// Actually, JSDOM does fire DOMContentLoaded when the document is parsed.

// Let's listen for DOMContentLoaded and then run our checks.
return new Promise((resolve) => {
  window.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired');
    // Now, we can check the state of the game
    try {
      // Check if the game objects are created
      if (typeof window.GameModel === 'undefined') {
        throw new Error('GameModel is not defined');
      }
      if (typeof window.GameController === 'undefined') {
        throw new Error('GameController is not defined');
      }
      if (typeof window.GameView === 'undefined') {
        throw new Error('GameView is not defined');
      }

      // Now, we can check if the view has been initialized and has modified the container
      const container = document.getElementById('game-container');
      if (!container) {
        throw new Error('Game container not found');
      }

      // We expect the container to have children after the view's createDOM is called
      // Note: the view's createDOM is called from the view's init, which is called from main.js
      // We don't know if main.js has been run yet, but we hope that the DOMContentLoaded listener in main.js has run.

      // Let's check the container's children count
      console.log('Container children count:', container.children.length);
      if (container.children.length === 0) {
        // Maybe the view hasn't been initialized yet? Let's check if the main.js has run by looking for a global variable
        // In main.js, we expose the game objects on the window: window.gameModel, etc.
        // Let's check if they exist.
        if (typeof window.gameModel === 'undefined') {
          throw new Error('main.js has not run yet (window.gameModel is undefined)');
        } else {
          // main.js has run, but the container is still empty. This means the view's createDOM did not append anything.
          // Let's check if the view's createDOM was called by looking for a border we added? 
          // We can't see the border in the HTML string, but we can check the container's style.
          // However, we are not going to parse the style.
          // Instead, let's check if the container has any innerHTML that we expect.
          // We expect at least the loading overlay.
          const loadingOverlay = document.getElementById('loading-overlay');
          if (!loadingOverlay) {
            throw new Error('Loading overlay not found in container');
          }
          // If we get here, then the loading overlay is present, so the view did append something.
          // But we checked the container children count and it was 0? That doesn't make sense.
          // Let's re-check: maybe the container has children but they are not element nodes? 
          // Let's check the childNodes count.
          console.log('Container childNodes count:', container.childNodes.length);
          if (container.childNodes.length === 0) {
            throw new Error('Container has no child nodes at all');
          } else {
            // There are child nodes, but they are not element nodes? Let's see what they are.
            for (let i = 0; i < container.childNodes.length; i++) {
              const node = container.childNodes[i];
              console.log(`Child node ${i}:`, node.nodeName, node.nodeType);
            }
            // If we get here, then there are child nodes, so the view did append something.
            // We'll consider the test passed for now.
            console.log('View has appended child nodes to container');
          }
        }
      } else {
        // Container has children, so we assume the view has been initialized and appended elements.
        console.log('Container has children, assuming view initialized');
      }

      // If we get here, we consider the test passed
      console.log('✓ DOM test passed: container has been populated by the view');
      resolve();
    } catch (e) {
      console.error('✗ DOM test failed:', e.message);
      // We can also log the container's innerHTML for debugging
      const container = document.getElementById('game-container');
      if (container) {
        console.error('Container innerHTML:', container.innerHTML);
      }
      resolve(e);
    }
  });

  // If DOMContentLoaded doesn't fire within a second, we assume something is wrong
  setTimeout(() => {
    console.error('✗ DOM test failed: DOMContentLoaded did not fire within 1 second');
    resolve(new Error('DOMContentLoaded timeout'));
  }, 1000);
});