// Test to check for the "loop bounded" error that was occurring due to async state capture bug
const { JSDOM } = require('jsdom');
const fs = require('fs');
const vm = require('vm');

// Create a mock window and document
const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="game-container"></div></body></html>`);
let window = dom.window;
global.window = window;
global.document = window.document;

// Capture console errors
const errors = [];
const originalConsoleError = console.error;
console.error = function(...args) {
    errors.push(args.join(' '));
    originalConsoleError.apply(console, args);
};

// Now, we need to load the game scripts
function loadScript(filename) {
    const code = fs.readFileSync(filename, 'utf8');
    vm.runInThisContext(code, { filename, lineOffset: 0, displayErrors: true });
}

// Load the game scripts
loadScript('./src/js/gameModel.js');
loadScript('./src/js/gameController.js');
loadScript('./src/js/gameView.js');

// Now, the GameModel, GameController, GameView should be attached to window
// We can access them via window.GameModel, etc.

console.log('Testing for loop bounded error...');

let loopBoundedErrors = 0;

// Run multiple games to try to trigger the race condition
for (let game = 0; game < 100; game++) {
    // Reset errors for this game
    const gameStartErrorCount = errors.length;
    
    const model = new window.GameModel();
    const controller = new window.GameController(model, {
        onStateChange: () => {},
        onTurnChange: () => {},
        onExtraRoll: () => {},
        onTripleSixPenalty: () => {},
        onGameWin: () => {},
        onReset: () => {},
        onCapture: () => {} // Added missing onCapture callback
    });
    
    // Play a random game
    let rollCount = 0;
    const maxRollsPerGame = 50; // Prevent infinite loops
    
    while (!model.isGameOver() && rollCount < maxRollsPerGame) {
        // Roll a random die
        const dieRoll = Math.floor(Math.random() * 6) + 1;
        controller.processTurn(dieRoll);
        rollCount++;
    }
    
    // Check if any loop bounded errors occurred during this game
    const gameErrors = errors.slice(gameStartErrorCount);
    const loopErrors = gameErrors.filter(error => error.includes('_animateStepByStep loop bounded!'));
    loopBoundedErrors += loopErrors.length;
    
    if (loopErrors.length > 0) {
        console.log(`Game ${game}: Found ${loopErrors.length} loop bounded errors`);
        for (const error of loopErrors) {
            console.log(`  ${error}`);
        }
    }
    
    // Reset for next game
    model.resetGame();
}

// Restore original console.error
console.error = originalConsoleError;

console.log(`\nTotal loop bounded errors found: ${loopBoundedErrors}`);

if (loopBoundedErrors === 0) {
    console.log('✅ SUCCESS: No loop bounded errors found - the fix appears to be working!');
    process.exit(0);
} else {
    console.log('❌ FAILURE: Loop bounded errors still occurring - the fix may not be complete');
    process.exit(1);
}