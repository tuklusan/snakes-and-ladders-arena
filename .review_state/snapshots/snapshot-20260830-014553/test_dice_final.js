// Final test for dice settle functionality
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
};
console.error = function(...args) {
    const message = args.join(' ');
    logs.push({ type: 'error', args: message });
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

try {
    // Create game objects
    const model = new window.GameModel();
    const view = new window.GameView();
    
    // Initialize the view
    view.model = model;
    
    // Mock the assets loading
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
    
    console.log('View initialized successfully');
    console.log('Dice element exists:', !!view.diceElement);
    console.log('Dice tumble sheet exists:', !!view.assets.diceTumbleSheet);
    
    // Test the animateDiceRoll function directly
    if (view.diceElement && view.assets.diceTumbleSheet) {
        console.log('Testing animateDiceRoll with face 3...');
        let settleCalled = false;
        let updateDiceLogFound = false;
        
        // Override updateDice to track if it's called
        const originalUpdateDice = view.updateDice;
        view.updateDice = function(face) {
            settleCalled = true;
            console.log(`[gameView] updateDice called with face ${face}`);
            return originalUpdateDice.call(this, face);
        };
        
        // Call animateDiceRoll
        view.animateDiceRoll(3, () => {
            console.log('animateDiceRoll callback executed');
        });
        
        // Wait for animation to complete (should be about 1 second)
        setTimeout(() => {
            console.log('\n=== Test Results ===');
            console.log(`updateDice was called during animation: ${settleCalled}`);
            
            // Check logs for our expected messages
            logs.forEach((log, i) => {
                if (log.args.includes('animateDiceRoll: updateDice called')) {
                    console.log(`Log ${i}: ${log.args}`);
                    updateDiceLogFound = true;
                }
                if (log.args.includes('dice settled on face')) {
                    console.log(`Log ${i}: ${log.args}`);
                }
            });
            
            if (settleCalled && updateDiceLogFound) {
                console.log('✅ SUCCESS: Dice settle animation is working correctly!');
                console.log('   - updateDice was called during animation');
                console.log('   - The settle log message was found');
                process.exit(0);
            } else {
                console.log('❌ FAILURE: Dice settle animation not working properly');
                console.log('   - updateDice called during animation:', settleCalled);
                console.log('   - Settle log message found:', updateDiceLogFound);
                process.exit(1);
            }
        }, 1500);
    } else {
        console.log('❌ FAILURE: Missing required elements for test');
        console.log('   Dice element:', !!view.diceElement);
        console.log('   Tumble sheet:', !!view.assets.diceTumbleSheet);
        process.exit(1);
    }
} catch (e) {
    console.error('Error in test:', e);
    process.exit(1);
}