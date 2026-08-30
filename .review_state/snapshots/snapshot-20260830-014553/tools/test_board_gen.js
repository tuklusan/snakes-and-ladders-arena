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
let sumLadderCount = 0;
let sumSnakeCount = 0;
const RUNS = 5000;

// Signature of the fallback board (hardcoded 4+4)
const fallbackLadders = new Map([
    [9, 33],
    [14, 47],
    [20, 56],
    [21, 58],
    [25, 55],
    [60, 87]
]);
const fallbackSnakes = new Map([
    [31, 10],
    [35, 5],
    [37, 2],
    [74, 48]
]);
function boardSignature(ladders, snakes) {
    const ladderStr = Array.from(ladders.entries()).sort((a,b)=>a[0]-b[0]).map(p=>`[${p[0]},${p[1]}]`).join(',');
    const snakeStr = Array.from(snakes.entries()).sort((a,b)=>a[0]-b[0]).map(p=>`[${p[0]},${p[1]}]`).join(',');
    return `Ladders: ${ladderStr}; Snakes: ${snakeStr}`;
}
const fallbackSignature = boardSignature(fallbackLadders, fallbackSnakes);
let fallbackCount = 0;

for (let i = 0; i < RUNS; i++) {
    const board = model.generateBoard();
    const violations = model.validateBoard(board.ladders, board.snakes);
    
    if (violations.length > 0) {
        // Optionally log first few violations
        if (totalViolations < 5) {
            console.error(`Run ${i}: ${violations.length} violations:`);
            violations.forEach(v => {
                console.error(`  - ${v}`);
            });
        }
        totalViolations += violations.length;
    }
    
    // Check if this board matches the fallback signature
    if (boardSignature(board.ladders, board.snakes) === fallbackSignature) {
        fallbackCount++;
    }
    
    const ladderCount = board.ladders.size;
    const snakeCount = board.snakes.size;
    const restarts = board.restarts !== undefined ? board.restarts : 0;
    totalRestarts += restarts;
    sumLadderCount += ladderCount;
    sumSnakeCount += snakeCount;
    
    if (ladderCount < minLadderCount) minLadderCount = ladderCount;
    if (ladderCount > maxLadderCount) maxLadderCount = ladderCount;
    
    if (snakeCount < minSnakeCount) minSnakeCount = snakeCount;
    if (snakeCount > maxSnakeCount) maxSnakeCount = snakeCount;
}

console.log(`RUNS=${RUNS} VIOLATIONS=${totalViolations} THROWS=${0}`); // throws are zero because we never throw
console.log(`Ladder counts: min=${minLadderCount}, max=${maxLadderCount}, avg=${(sumLadderCount/RUNS).toFixed(2)}`);
console.log(`Snake counts: min=${minSnakeCount}, max=${maxSnakeCount}, avg=${(sumSnakeCount/RUNS).toFixed(2)}`);
console.log(`Fallback board fraction: ${fallbackCount}/${RUNS} = ${(fallbackCount/RUNS*100).toFixed(2)}%`);

if (totalViolations > 0) {
    process.exit(1);
} else {
    console.log('✓ All board generations passed validation!');
    process.exit(0);
}