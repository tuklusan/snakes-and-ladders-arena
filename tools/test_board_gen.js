// Test for board generation and validation
const { JSDOM } = require('jsdom');
const fs = require('fs');
const vm = require('vm');

// Create a mock window and document
const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="game-container"></div></body></html>`);
let window = dom.window;
global.window = window;
global.document = window.document;

// Now, we need to load the game scripts. Since they are attached to window, we can execute them.
// We'll read the files and evaluate them in the context of the window.
// We use vm.runInThisContext which runs in the current context (where we have window and document as variables because we declared them with let above).
function loadScript(filename) {
    const code = fs.readFileSync(filename, 'utf8');
    vm.runInThisContext(code, { filename, lineOffset: 0, displayErrors: true });
}

// Load the game scripts
loadScript('./src/js/gameModel.js');

// Now, the GameModel should be attached to window
// We can access it via window.GameModel

// Test the board generation and validation
console.log('Testing board generation and validation...');

const model = new window.GameModel();

let totalViolations = 0;
let totalCrossings = 0;
let totalRestarts = 0;
let minLadderCount = Infinity;
let maxLadderCount = -Infinity;
let minSnakeCount = Infinity;
let maxSnakeCount = -Infinity;
const RUNS = 1000;

for (let i = 0; i < RUNS; i++) {
    const board = model.generateBoard();
    const violations = model.validateBoard(board.ladders, board.snakes);
    
    if (violations.length > 0) {
        console.error(`Run ${i}: ${violations.length} violations:`);
        violations.forEach(v => {
            console.error(`  - ${v}`);
            if (v.toLowerCase().includes('crosses')) {
                totalCrossings++;
            }
        });
        totalViolations += violations.length;
    }
    
    const ladderCount = board.ladders.size;
    const snakeCount = board.snakes.size;
    const restarts = board.restarts !== undefined ? board.restarts : 0;
    totalRestarts += restarts;
    
    if (ladderCount < minLadderCount) minLadderCount = ladderCount;
    if (ladderCount > maxLadderCount) maxLadderCount = ladderCount;
    
    if (snakeCount < minSnakeCount) minSnakeCount = snakeCount;
    if (snakeCount > maxSnakeCount) maxSnakeCount = snakeCount;
}

console.log(`RUNS=${RUNS} VIOLATIONS=${totalViolations} CROSSINGS=${totalCrossings} RESTARTS=${totalRestarts}`);
console.log(`Ladder counts: min=${minLadderCount}, max=${maxLadderCount}`);
console.log(`Snake counts: min=${minSnakeCount}, max=${maxSnakeCount}`);

if (totalViolations > 0) {
    process.exit(1);
} else {
    console.log('✓ All board generations passed validation!');
    process.exit(0);
}