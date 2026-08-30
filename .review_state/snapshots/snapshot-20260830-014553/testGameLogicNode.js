// Test for game logic running in Node.js with mocked window and document
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
loadScript('./src/js/gameController.js');
loadScript('./src/js/gameView.js');

// Now, the GameModel, GameController, GameView should be attached to window
// We can access them via window.GameModel, etc.

// We'll now run the same tests as in testGameLogic.js
console.log('Test 1: Initial state');
const model = new window.GameModel();
console.assert(model.getActivePlayer() === 0, 'Active player should be 0');
console.assert(model.getConsecutiveSixes() === 0, 'Consecutive sixes should be 0');
console.assert(model.getPlayerPosition(0) === 0, 'Player 0 should be at position 0');
console.assert(!model.isGameOver(), 'Game should not be over initially');
console.log('✓ Initial state test passed');

console.log('\nTest 2: Rolling 1 from off-board');
const controller = new window.GameController(model, {
    onStateChange: () => {},
    onTurnChange: () => {},
    onExtraRoll: () => {},
    onTripleSixPenalty: () => {},
    onGameWin: () => {},
    onReset: () => {}
});
controller.rollDice = function() { 
    const dieRoll = 1;
    this.processTurn(dieRoll); 
};
controller.rollDice();
console.assert(model.getPlayerPosition(0) === 1, 'Player 0 should be at tile 1 after rolling 1');
console.log('✓ Off-board entry with 1 test passed');

console.log('\nTest 3: Rolling 6 from off-board');
model.resetGame(); // Reset to initial state
controller.rollDice = function() { 
    const dieRoll = 6;
    this.processTurn(dieRoll); 
};
controller.rollDice();
console.assert(model.getPlayerPosition(0) === 1, 'Player 0 should be at tile 1 after rolling 6 from off-board');
console.log('✓ Off-board entry with 6 test passed');

console.log('\nTest 4: Rolling a 2 from off-board should NOT move (needs 1 or 6)');
model.resetGame();
controller.rollDice = function() { 
    const dieRoll = 2;
    this.processTurn(dieRoll); 
};
controller.rollDice();
console.assert(model.getPlayerPosition(0) === 0, 'Player 0 should still be at tile 0 after rolling 2 from off-board');
console.log('✓ Off-board entry with 2 test passed');

console.log('\nTest 5: Exact landing rule for winning');
model.resetGame();
model.setPlayerPosition(0, 95);
model.setActivePlayer(0);
controller.rollDice = function() { 
    const dieRoll = 5;
    this.processTurn(dieRoll); 
};
controller.rollDice();
console.assert(model.getPlayerPosition(0) === 100, 'Player 0 should be at tile 100 after rolling 5 from 95');
console.assert(model.isGameOver(), 'Game should be over after reaching tile 100');
console.assert(model.getWinner() === 0, 'Player 0 should be the winner');
console.log('✓ Exact landing for winning test passed');

console.log('\nTest 6: Overshooting 100 should not move');
model.resetGame();
model.setPlayerPosition(0, 95);
model.setActivePlayer(0);
controller.rollDice = function() { 
    const dieRoll = 6;
    this.processTurn(dieRoll); 
};
controller.rollDice();
console.assert(model.getPlayerPosition(0) === 95, 'Player 0 should still be at tile 95 after rolling 6 from 95 (overshoot)');
console.log('✓ Overshoot test passed');

console.log('\nTest 7: Ladder climb');
model.resetGame();
model.setPlayerPosition(0, 1);
model.setActivePlayer(0);
controller.rollDice = function() { 
    const dieRoll = 1;
    this.processTurn(dieRoll); 
};
controller.rollDice();
console.assert(model.getPlayerPosition(0) === 38, 'Player 0 should be at tile 38 after climbing ladder from 2 (via rolling a 1 from 1)');
console.log('✓ Ladder climb test passed');

console.log('\nTest 8: Snake descent');
model.resetGame();
model.setPlayerPosition(0, 10);
model.setActivePlayer(0);
controller.rollDice = function() { 
    const dieRoll = 6;
    this.processTurn(dieRoll); 
};
controller.rollDice();
console.assert(model.getPlayerPosition(0) === 6, 'Player 0 should be at tile 6 after sliding down snake from 16 (via rolling a 6 from 10)');
console.log('✓ Snake descent test passed');

console.log('\nTest 9: Capture (Katti) mechanics');
model.resetGame();
model.setPlayerPosition(0, 4);
model.setPlayerPosition(1, 5);
model.setActivePlayer(0);
let captureCalled = false;
const mockView = {
    onStateChange: () => {},
    onTurnChange: () => {},
    onExtraRoll: () => {},
    onTripleSixPenalty: () => {},
    onCapture: (opponent, targetPos) => {
        captureCalled = true;
        console.assert(opponent === 1, 'Opponent should be player 1');
        console.assert(targetPos === 5, 'Capture should happen at tile 5');
    },
    onGameWin: () => {},
    onReset: () => {}
};
const controller2 = new window.GameController(model, mockView);
controller2.rollDice = function() { 
    const dieRoll = 1;
    this.processTurn(dieRoll); 
};
controller2.rollDice();
console.assert(model.getPlayerPosition(0) === 5, 'Player 0 should be at tile 5 after moving');
console.assert(model.getPlayerPosition(1) === 0, 'Player 1 should be sent back to off-board (0) after capture');
console.assert(captureCalled, 'Capture callback should have been called');
console.log('✓ Capture mechanics test passed');

console.log('\nTest 10: Six gives extra roll');
model.resetGame();
model.setActivePlayer(0);
let rollCallCount = 0;
controller.rollDice = function() { 
    rollCallCount++;
    const dieRoll = rollCallCount === 1 ? 6 : 3;
    this.processTurn(dieRoll); 
};
let extraRollCalled = false;
const mockView2 = {
    onStateChange: () => {},
    onTurnChange: () => {},
    onExtraRoll: () => {
        extraRollCalled = true;
    },
    onTripleSixPenalty: () => {},
    onCapture: () => {},
    onGameWin: () => {},
    onReset: () => {}
};
const controller3 = new window.GameController(model, mockView2);
controller3.rollDice = controller.rollDice; // reuse the same function
controller3.rollDice(); // First roll (should be 6)
console.assert(rollCallCount === 1, 'Roll dice should have been called once');
console.assert(model.getActivePlayer() === 0, 'Active player should still be 0 after six (extra roll)');
console.assert(model.getConsecutiveSixes() === 1, 'Consecutive sixes should be 1');
console.assert(extraRollCalled, 'Extra roll callback should have been called on the six roll');
// Second roll
controller3.rollDice(); // Second roll (should be 3)
console.assert(rollCallCount === 2, 'Roll dice should have been called twice');
console.assert(model.getActivePlayer() === 1, 'Active player should now be 1 after the non-six roll');
console.assert(model.getConsecutiveSixes() === 0, 'Consecutive sixes should be reset after non-six');
console.assert(extraRollCalled, 'Extra roll callback should have been called');
console.log('✓ Six extra roll test passed');

console.log('\nTest 11: Three sixes penalty');
model.resetGame();
model.setPlayerPosition(0, 10);
model.setTurnStartPosition(10); // Snapshot the start position
model.setActivePlayer(0);
let rollCallCount2 = 0;
controller.rollDice = function() { 
    rollCallCount2++;
    const dieRoll = 6;
    this.processTurn(dieRoll); 
};
let tripleSixCalled = false;
const mockView3 = {
    onStateChange: () => {},
    onTurnChange: () => {},
    onExtraRoll: () => {},
    onTripleSixPenalty: () => {
        tripleSixCalled = true;
    },
    onCapture: () => {},
    onGameWin: () => {},
    onReset: () => {}
};
const controller4 = new window.GameController(model, mockView3);
controller4.rollDice = controller.rollDice;
controller4.rollDice(); // First six
console.assert(rollCallCount2 === 1, 'Roll dice called once');
console.assert(model.getConsecutiveSixes() === 1, 'Should have 1 consecutive six');
console.assert(model.getPlayerPosition(0) === 6, 'After first six: moved to 16 then snake to 6');
// Second six
controller4.rollDice(); // Second six
console.assert(rollCallCount2 === 2, 'Roll dice called twice');
console.assert(model.getConsecutiveSixes() === 2, 'Should have 2 consecutive sixes');
console.assert(model.getPlayerPosition(0) === 12, 'After second six: moved to 12');
// Third six
controller4.rollDice(); // Third six
console.assert(rollCallCount2 === 3, 'Roll dice called three times');
console.assert(model.getConsecutiveSixes() === 0, 'Consecutive sixes should be reset to 0');
console.assert(model.getPlayerPosition(0) === 10, 'Position should be reverted to start position (10)');
console.assert(tripleSixCalled, 'Triple six penalty callback should have been called');
console.assert(model.getActivePlayer() === 1, 'Active player should have advanced to player 1 after triple six penalty');
console.log('✓ Three sixes penalty test passed');

console.log('\n🎉 All tests passed!');