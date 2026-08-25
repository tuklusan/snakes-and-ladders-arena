// Direct test of dice settle functionality
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

// Mock requestAnimationFrame and performance.now properly
let frameCount = 0;
const originalRequestAnimationFrame = global.requestAnimationFrame || function(callback) { 
    setTimeout(() => callback(performance.now() + 16), 16); 
};

global.requestAnimationFrame = function(callback) {
    // Increment frame count and call callback with a progressing timestamp
    frameCount++;
    const fakeTimestamp = frameCount * 16; // 16ms per frame (~60fps)
    return callback(fakeTimestamp);
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

console.log('Testing dice settle functionality directly...');

try {
    // Create game objects
    const model = new window.GameModel();
    const view = new window.GameView();
    
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
    
    console.log('View initialized');
    console.log('Dice element exists:', !!view.diceElement);
    console.log('Dice tumble sheet exists:', !!view.assets.diceTumbleSheet);
    console.log('Dice faces loaded:', view.assets.diceFaces.length);
    
    // Test the animateDiceRoll function directly
    if (view.diceElement && view.assets.diceTumbleSheet) {
        console.log('Testing animateDiceRoll with face 3...');
        view.animateDiceRoll(3, () => {
            console.log('Callback executed - dice should be settled');
        });
        
        // Wait for animation to complete (animateDiceRoll takes ~1 second, which is ~60 frames)
        setTimeout(() => {
            console.log('Test completed');
            console.log('Logs captured:', logs.length);
            let settleFound = false;
            let updateDiceFound = false;
            logs.forEach((log, i) => {
                if (log.args.includes('dice settled on face')) {
                    console.log(`Log ${i}: ${log.args}`);
                    settleFound = true;
                }
                if (log.args.includes('animateDiceRoll: updateDice called')) {
                    console.log(`Log ${i}: ${log.args}`);
                    updateDiceFound = true;
                }
            });
            
            if (settleFound && updateDiceFound) {
                console.log('✅ SUCCESS: Dice settle animation is working correctly!');
                process.exit(0);
            } else {
                console.log('❌ FAILURE: Missing expected logs');
                console.log('Settle found:', settleFound);
                console.log('UpdateDice found:', updateDiceFound);
                process.exit(1);
            }
        }, 1500);
    } else {
        console.log('Missing required assets for test');
        console.log('Dice element:', !!view.diceElement);
        console.log('Tumble sheet:', !!view.assets.diceTumbleSheet);
        process.exit(1);
    }
} catch (e) {
    console.error('Error in test:', e);
    process.exit(1);
}