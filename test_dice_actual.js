// Test to verify that dice animation settles correctly in actual game context
const { JSDOM } = require('jsdom');
const fs = require('fs');
const vm = require('vm');

// Create a mock window and document with all required elements
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="src/css/styles.css">
</head>
<body>
    <div id="game-container">
        <!-- Left margin title panel -->
        <div id="left-title-panel">
            <div class="title-content">
                <div class="title-main">SANYALnet Labs Snakes & Ladders Arena</div>
                <div class="title-sub">© Supratim Sanyal</div>
            </div>
        </div>
        
        <!-- Game board and controls -->
        <div id="game-board-container"></div>
        
        <!-- Right margin commentary panel -->
        <div id="right-commentary-panel">
            <div id="commentary-content"></div>
        </div>
    </div>
</body>
</html>`);
let window = dom.window;
global.window = window;
global.document = window.document;

// Mock Image constructor
global.Image = class Image {
    constructor() {
        this.src = '';
        this.complete = false;
        this.onload = null;
        this.onerror = null;
    }
};

// Mock audio element
global.Audio = class Audio {
    constructor(src) {
        this.src = src;
        this.currentTime = 0;
    }
    play() {
        return Promise.resolve();
    }
    pause() {}
};

// Mock requestAnimationFrame and performance.now for animation testing
let frameCount = 0;
let lastTimestamp = 0;
global.requestAnimationFrame = function(callback) {
    frameCount++;
    // Simulate 60fps: each frame is ~16.67ms
    const timestamp = lastTimestamp + 16;
    lastTimestamp = timestamp;
    return callback(timestamp);
};

global.performance = {
    now: function() {
        return Date.now();
    }
};

// Capture console logs to check for settled messages
const logs = [];
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
console.log = function(...args) {
    const message = args.join(' ');
    logs.push({ type: 'log', args: message });
    originalConsoleLog.apply(console, args);
    // Also print to stdout so we can see it
    process.stdout.write(message + '\n');
};
console.error = function(...args) {
    const message = args.join(' ');
    logs.push({ type: 'error', args: message });
    originalConsoleError.apply(console, args);
    process.stderr.write(message + '\n');
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

console.log('Testing dice settle functionality in actual game context...');

try {
    // Create game objects
    const model = new window.GameModel();
    const view = new window.GameView();
    let controller = null;
    
    // Initialize the view (this would normally happen in main.js)
    view.model = model;
    
    // Mock the assets loading to avoid needing to actually load images
    view.assets = {
        board: { src: '', complete: true },
        tokens: Array.from({length: 4}, (_, i) => ({ src: `token_${i}.png`, complete: true })),
        diceFaces: Array.from({length: 6}, (_, i) => ({ src: `dice_face_${i+1}.png`, complete: true })),
        diceTumbleSheet: { src: 'dice_tumble_sheet.png', complete: true },
        audio: {
            roll: new Audio(),
            capture: new Audio(),
            win: new Audio()
        }
    };
    view.isAssetsLoaded = true;
    view.isAssetsHandled = true;
    
    // Create the DOM elements
    view.createDOM();
    
    // Create controller
    controller = new window.GameController(model, {
        onStateChange: () => {},
        onTurnChange: () => {},
        onExtraRoll: () => {},
        onTripleSixPenalty: () => {},
        onGameWin: () => {},
        onReset: () => {},
        onCapture: () => {} // Added missing callback
    });
    
    // Connect view to controller
    view.controller = controller;
    
    console.log('View initialized');
    console.log('Dice element exists:', !!view.diceElement);
    console.log('Dice tumble sheet exists:', !!view.assets.diceTumbleSheet);
    console.log('Dice faces loaded:', view.assets.diceFaces.length);
    
    // Track settle events
    let settleCount = 0;
    let tumbleStartCount = 0;
    
    // Override the console logging in gameView to capture specific messages
    const originalAnimateDiceRoll = window.GameView.prototype.animateDiceRoll;
    window.GameView.prototype.animateDiceRoll = function(face, callback) {
        // Call the original function
        const result = originalAnimateDiceRoll.call(this, face, callback);
        
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
    
    // Test multiple dice rolls
    console.log('Starting dice roll tests...');
    for (let i = 0; i < 10; i++) {
        // Roll a random die
        const dieRoll = Math.floor(Math.random() * 6) + 1;
        console.log(`Rolling ${dieRoll}...`);
        controller.processTurn(dieRoll);
        
        // Wait a bit for animations to complete
        // We'll use a longer timeout to allow for the animation to finish
    }
    
    // Wait for animations to complete (give it 3 seconds)
    setTimeout(() => {
        console.log('\n=== Dice Settle Test Results ===');
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
    }, 3000);
    
} catch (e) {
    console.error('Error in test:', e);
    process.exit(1);
}