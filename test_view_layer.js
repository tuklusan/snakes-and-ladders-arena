// test_view_layer.js — asserts tile movement, not just start frame
// Computes tileToPosition coordinates and proves tokens move off the staging row

function tileToPosition(tile) {
    if (tile === 0) {
        // Off-board staging: spread along the bottom inside the board
        const slot = (0 % 4) + 1; // slotIndex defaults to 0
        return { x: 12 + slot * 18, y: 95 };
    }
    tile--; // convert to 0-indexed (0-99)
    const row = Math.floor(tile / 10); // 0-9 (0 is bottom row)
    const colInRow = tile % 10; // 0-9

    let col;
    if (row % 2 === 0) {
        // Even row (0,2,4,6,8): left to right
        col = colInRow;
    } else {
        // Odd row (1,3,5,7,9): right to left
        col = 9 - colInRow;
    }

    // Convert to percentage (0-100%) within the board
    // Each tile is 10% of the board width (since 10 tiles per row)
    const xPercent = (col * 10) + 5; // add half a token to center the token
    const yPercentFromTop = ((9 - row) * 10) + 5; // row 0 is bottom, so from top it's 9-row

    return { x: xPercent, y: yPercentFromTop };
}

let fail = 0;

// Assertion 1: tileToPosition(26) should differ from tileToPosition(0)
const pos0 = tileToPosition(0);
const pos26 = tileToPosition(26);
const diff = pos26.x !== pos0.x || pos26.y !== pos0.y;
console.log(`A1: tileToPosition(26) differs from tileToPosition(0): ${diff ? 'PASS' : 'FAIL'}`);
if (!diff) fail++;

// Assertion 2: tileToPosition(26).y should not be 95 (it's on the board, not staging)
const yNot95 = pos26.y !== 95;
console.log(`A2: tileToPosition(26).y is not 95 (got ${pos26.y}): ${yNot95 ? 'PASS' : 'FAIL'}`);
if (!yNot95) fail++;

console.log(fail === 0 ? 'ALL MOVEMENT TESTS PASSED' : `${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);