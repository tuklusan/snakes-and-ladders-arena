// Test to verify that dice animation settles correctly
const { JSDOM } = require('jsdom');
const fs = require('fs');
const vm = require('vm');

// Create a mock window and document
const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="game-container"></div></body></html>`);
let window = dom.window;
global.window = window;
global.document = window.document;

// Capture console logs to check for settled messages
const logs = [];
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
console.log = function(...args) {
    logs.push({ type: 'log', args: args.join(' ') });
    originalConsoleLog.apply(console, args);
};
console.error = function(...args) {
    logs.push({ type: 'error', args: args.join(' ') });
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

console.log('Testing dice settle functionality...');

let settleCount = 0;
let tumbleStartCount = 0;

// Override the console logging in gameView to capture specific messages
const originalGameViewLog = window.GameView.prototype.animateDiceRoll;
window.GameView.prototype.animateDiceRoll = function(face, callback) {
    // Call the original function
    const result = originalGameViewLog.call(this, face, callback);
    
    // Override the internal console.log calls to capture settle/tumble messages
    const originalInnerLog = console.log;
    console.log = function(...args) {
        const message = args.join(' ');
        if (message.includes('dice tumble start')) {
            tumbleStartCount++;
            console.log(`[gameView] dice tumble start at ${Date.now()}`);
        } else if (message.includes('dice settled on face')) {
            settleCount++;
            console.log(`[gameView] dice settled on face ${face} at ${Date.now()}`);
        }
        originalInnerLog.apply(console, args);
    };
    
    return result;
};

// Run a series of dice rolls to test settling
const model = new window.GameModel();
const controller = new window.GameController(model, {
    onStateChange: () => {},
    onTurnChange: () => {},
    onExtraRoll: () => {},
    onTripleSixPenalty: () => {},
    onGameWin: () => {},
    onReset: () => {},
    onCapture: () => {} // Added missing callback
});

// Test multiple rolls
for (let i = 0; i < 20; i++) {
    // Reset errors for clarity
    const logStartLength = logs.length;
    
    // Roll a random die
    const dieRoll = Math.floor(Math.random() * 6) + 1;
    controller.processTurn(dieRoll);
    
    // Wait a bit for animations to complete (in real test we'd wait for promises)
    // For this test, we'll just check the logs
}

// Restore original console methods
console.log = originalConsoleLog;
console.error = originalConsoleError;

// Analyze results
console.log(`\n=== Dice Settle Test Results ===`);
console.log(`Tumble start events: ${tumbleStartCount}`);
console.log(`Settle events: ${settleCount}`);

if (tumbleStartCount > 0 && settleCount > 0) {
    const settleRatio = settleCount / tumbleStartCount;
    console.log(`Settle ratio: ${settleRatio.toFixed(2)} (settle/tumble)`);
    
    if (settleRatio >= 0.8) { // Expect at least 80% of tumbles to settle
        console.log('✅ SUCCESS: Dice settling appears to be working correctly!');
        process.exit(0);
    } else {
        console.log('⚠️  WARNING: Low settle ratio - dice may not be settling reliably');
        process.exit(1);
    }
} else if (tumbleStartCount === 0) {
    console.log('⚠️  WARNING: No tumble start events detected - dice animation may not be triggering');
    process.exit(1);
} else {
    console.log('❌ FAILURE: Tumble starts detected but no settle events - dice not settling');
    process.exit(1);
}