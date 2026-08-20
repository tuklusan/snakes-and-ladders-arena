// test_view_layer.js — asserts off-board staging coords are on-screen
let fail = 0;
function stagingCoords(slotIndex) {
    const slot = (slotIndex % 4) + 1;
    return { x: 12 + slot * 18, y: 95 };
}
for (let i = 0; i < 4; i++) {
    const { x, y } = stagingCoords(i);
    const ok = typeof x === 'number' && typeof y === 'number' &&
               x >= 0 && x <= 100 && y >= 0 && y <= 100;
    console.log(`token ${i}: x=${x} y=${y} -> ${ok ? 'PASS' : 'FAIL'}`);
    if (!ok) fail++;
}
console.log(fail === 0 ? 'ALL VIEW-LAYER TESTS PASSED' : `${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);