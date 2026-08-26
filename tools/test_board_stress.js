const GameModel = require('../src/js/gameModel.js');

const model = new GameModel();

let throws = 0;
let violations = 0;
const total = 20000;

for (let i = 0; i < total; i++) {
    try {
        const board = model.generateBoard();
        const errs = model.validateBoard(board.ladders, board.snakes);
        if (errs.length > 0) {
            violations++;
            // Optionally log first few errors for debugging
            if (violations <= 3) {
                console.error(`Validation errors on iteration ${i}:`, errs);
            }
        }
    } catch (e) {
        throws++;
        console.error(`Unexpected throw on iteration ${i}:`, e.message);
    }
}

console.log(`STRESS: ${total} runs, throws=${throws}, violations=${violations}`);

// Exit with non-zero if any throws or violations to fail the task if needed
if (throws > 0 || violations > 0) {
    process.exit(1);
}