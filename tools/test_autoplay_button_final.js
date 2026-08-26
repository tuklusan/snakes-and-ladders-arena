const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require("fs");
const path = require("path");

// Set up a minimal DOM that matches the expected structure from index.html
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
  <body>
    <div id="game-container">
      <div id="left-title-panel"></div>
      <div id="game-board-container"></div>
      <div id="right-commentary-panel">
        <div id="commentary-content"></div>
      </div>
    </div>
  </body>
  </html>
`);

// Get the window and document
const window = dom.window;
const document = window.document;

// Mock Image and Audio constructors that are missing in jsdom environment
global.Image = class {};
global.Audio = class {}; // We'll override later for specific behavior if needed

// Set globals for the modules to find
global.window = window;
global.document = document;

// Load the model and view modules (they will attach to window.GameModel and window.GameView)
const GameModel = require('../src/js/gameModel.js');
const GameView = require('../src/js/gameView.js');

// Now we have the constructors
console.log('[debug] GameModel:', GameModel);
console.log('[debug] GameView:', GameView);

// Helper to create a mock audio object that returns a promise that resolves or rejects
function makeAudio(resolveAfterPlay) {
  const audio = new window.Audio();
  // Override play method to return a promise that resolves or rejects
  audio.play = function() {
    if (resolveAfterPlay) {
      return Promise.resolve();
    } else {
      return Promise.reject(new Error("Autoplay blocked"));
    }
  };
  // We also need to mock other properties if accessed
  audio.volume = 1;
  audio.muted = false;
  audio.currentTime = 0;
  audio.pause = function() {};
  return audio;
}

// Test function for autoplay allowed (should NOT show button)
async function testAutoplayAllowed() {
  console.log("\n=== Test: Autoplay allowed (should NOT show button) ===");
  
  // Create model and view
  const model = new GameModel();
  const view = new GameView();
  
  // Set up the container (as created in init's createDOM)
  view.container = document.getElementById('game-container');
  // The button element already exists in view.startButtonElement (created in constructor)
  
  // Set up assets: we need at least an enter audio for probeAutoplay to use.
  view.assets = view.assets || {};
  view.assets.audio = view.assets.audio || {};
  // Use a mock audio that resolves (autoplay allowed)
  view.assets.audio.enter = makeAudio(true);
  
  // Set flags as they would be before probeAutoplay is called
  view.isAudioUnlocked = false;
  view._deferredUnlock = false;
  view.hasProbedAutoplay = false;
  
  // Wrap probeAutoplay to log
  const originalProbe = view.probeAutoplay;
  view.probeAutoplay = function() {
    console.log('[test] probeAutoplay called');
    return originalProbe.call(this);
  };
  
  // Call probeAutoplay
  view.probeAutoplay();
  
  // Wait for the promise to settle (microtask)
  await new Promise(resolve => setTimeout(resolve, 0));
  
  // Check if button is in the DOM
  const buttonInDom = document.getElementById('start-arena-btn') !== null;
  console.log(`Button in DOM: ${buttonInDom} (expected: false)`);
  
  // Also check that isAudioUnlocked is still false (since we didn't click)
  console.log(`isAudioUnlocked: ${view.isAudioUnlocked} (expected: false)`);
  
  // Success if button is NOT in DOM and isAudioUnlocked is false
  const success = !buttonInDom && view.isAudioUnlocked === false;
  console.log(`Result: ${success ? "PASS" : "FAIL"}`);
  return success;
}

// Test function for autoplay blocked (should show button, and clicking it unlocks audio and removes button)
async function testAutoplayBlocked() {
  console.log("\n=== Test: Autoplay blocked (should show button, then click unlocks and removes) ===");
  
  // Create model and view
  const model = new GameModel();
  const view = new GameView();
  
  // Set up container
  view.container = document.getElementById('game-container');
  console.log('Container:', view.container);
  console.log('Button element:', view.startButtonElement);
  console.log('Button parent before probe:', view.startButtonElement.parentNode);
  
  // Set up assets: mock audio that rejects (autoplay blocked)
  view.assets = view.assets || {};
  view.assets.audio = view.assets.audio || {};
  view.assets.audio.enter = makeAudio(false);
  
  // Set flags
  view.isAudioUnlocked = false;
  view._deferredUnlock = false;
  view.hasProbedAutoplay = false;
  
  // Wrap probeAutoplay to log
  const originalProbe = view.probeAutoplay;
  view.probeAutoplay = function() {
    console.log('[test] probeAutoplay called');
    return originalProbe.call(this);
  };
  
  // Wrap showStartButton to log
  const originalShow = view.showStartButton;
  view.showStartButton = function() {
    console.log('[test] showStartButton called');
    console.log('[test] Container in showStartButton:', this.container);
    console.log('[test] Button in showStartButton:', this.startButtonElement);
    const result = originalShow.call(this);
    console.log('[test] Button parent after showStartButton:', this.startButtonElement.parentNode);
    return result;
  };
  
  // Call probeAutoplay
  view.probeAutoplay();
  
  // Wait for the promise to settle (microtask)
  await new Promise(resolve => setTimeout(resolve, 0));
  
  // Check if button is in the DOM now
  const buttonInContainer = view.container.contains(view.startButtonElement);
  console.log(`Button in container after probe: ${buttonInContainer} (expected: true)`);
  console.log('Container in document:', document.body.contains(view.container));
  console.log('Button in container:', view.container.contains(view.startButtonElement));
  console.log('Button in DOM (getElementById):', document.getElementById('start-arena-btn') !== null);
  console.log('Container innerHTML after probe:', view.container.innerHTML);

  if (!buttonInContainer) {
    console.log("FAIL: Button not shown when autoplay blocked");
    return false;
  }
  
  if (!buttonInDom) {
    console.log("FAIL: Button not shown when autoplay blocked");
    return false;
  }
  
  // Simulate a click on the button
  console.log("Simulating click on start button...");
  view.startButtonElement.dispatchEvent(new window.MouseEvent('click'));
  
  // Wait for any microtask from the click handler (if any)
  await new Promise(resolve => setTimeout(resolve, 0));
  
  // After click, button should be removed and isAudioUnlocked should be true
  buttonInDom = document.getElementById('start-arena-btn') !== null;
  console.log(`Button in DOM after click: ${buttonInDom} (expected: false)`);
  console.log(`isAudioUnlocked after click: ${view.isAudioUnlocked} (expected: true)`);
  
  const success = !buttonInDom && view.isAudioUnlocked === true;
  console.log(`Result: ${success ? "PASS" : "FAIL"}`);
  return success;
}

// Run tests
(async () => {
  let passed = true;
  passed = await testAutoplayAllowed() && passed;
  passed = await testAutoplayBlocked() && passed;

  if (passed) {
    console.log("\n=== All tests passed! ===");
    process.exit(0);
  } else {
    console.log("\n=== Some tests failed! ===");
    process.exit(1);
  }
})();