// Test file for game logic
// This tests the core game rules without DOM dependencies

// Mock the assets and DOM dependencies
global.HTMLAudioElement = class {
    constructor() {
        this.currentTime = 0;
    }
    play() { return Promise.resolve(); }
    pause() {}
};

// Mock Image
global.HTMLImageElement = class {
    constructor() {
        this.src = '';
        this.onload = null;
        this.onerror = null;
    }
};

// Import the game classes
import { GameModel } from './gameModel.js';
import { GameController } from './gameController.js';
import { GameView } from './gameView.js';

// We'll need to mock the view methods that the controller calls
const mockView = {
    onStateChange: () => {},
    onTurnChange: () => {},
    onExtraRoll: () => {},
    onTripleSixPenalty: () => {},
    onCapture: () => {},
    onGameWin: () => {},
    onReset: () => {}
};

// Test 1: Initial state
console.log('Test 1: Initial state');
{
    const model = new GameModel();
    console.assert(model.getActivePlayer() === 0, 'Active player should be 0');
    console.assert(model.getConsecutiveSixes() === 0, 'Consecutive sixes should be 0');
    console.assert(model.getPlayerPosition(0) === 0, 'Player 0 should be at position 0');
    console.assert(!model.isGameOver(), 'Game should not be over initially');
}
console.log('✓ Initial state test passed');

// Test 2: Rolling a 1 from off-board should move to tile 1
console.log('\nTest 2: Rolling 1 from off-board');
{
    const model = new GameModel();
    const controller = new GameController(model, mockView);
    controller.rollDice = function() { 
        // Mock to always return 1
        const dieRoll = 1;
        this.processTurn(dieRoll); 
    };
    controller.rollDice();
    console.assert(model.getPlayerPosition(0) === 1, 'Player 0 should be at tile 1 after rolling 1');
}
console.log('✓ Off-board entry with 1 test passed');

// Test 3: Rolling a 6 from off-board should move to tile 1
console.log('\nTest 3: Rolling 6 from off-board');
{
    const model = new GameModel();
    const controller = new GameController(model, mockView);
    model.resetGame(); // Reset to initial state
    controller.rollDice = function() { 
        const dieRoll = 6;
        this.processTurn(dieRoll); 
    };
    controller.rollDice();
    console.assert(model.getPlayerPosition(0) === 1, 'Player 0 should be at tile 1 after rolling 6 from off-board');
}
console.log('✓ Off-board entry with 6 test passed');

// Test 4: Rolling a 2 from off-board should NOT move (needs 1 or 6)
console.log('\nTest 4: Rolling 2 from off-board should not move');
{
    const model = new GameModel();
    const controller = new GameController(model, mockView);
    model.resetGame();
    controller.rollDice = function() { 
        const dieRoll = 2;
        this.processTurn(dieRoll); 
    };
    controller.rollDice();
    console.assert(model.getPlayerPosition(0) === 0, 'Player 0 should still be at tile 0 after rolling 2 from off-board');
}
console.log('✓ Off-board entry with 2 test passed');

// Test 5: Exact landing rule for winning
console.log('\nTest 5: Exact landing for winning');
{
    const model = new GameModel();
    const controller = new GameController(model, mockView);
    model.resetGame();
    // Manually set player to tile 95
    model.setPlayerPosition(0, 95);
    model.setActivePlayer(0);
    // Roll a 5 to reach exactly 100
    controller.rollDice = function() { 
        const dieRoll = 5;
        this.processTurn(dieRoll); 
    };
    controller.rollDice();
    console.assert(model.getPlayerPosition(0) === 100, 'Player 0 should be at tile 100 after rolling 5 from 95');
    console.assert(model.isGameOver(), 'Game should be over after reaching tile 100');
    console.assert(model.getWinner() === 0, 'Player 0 should be the winner');
}
console.log('✓ Exact landing for winning test passed');

// Test 6: Overshooting 100 should not move (and no entities/capture)
console.log('\nTest 6: Overshooting 100 should not move');
{
    const model = new GameModel();
    const controller = new GameController(model, mockView);
    model.resetGame();
    model.setPlayerPosition(0, 95);
    model.setActivePlayer(0);
    // Roll a 6 (would go to 101, which is over 100)
    controller.rollDice = function() { 
        const dieRoll = 6;
        this.processTurn(dieRoll); 
    };
    controller.rollDice();
    console.assert(model.getPlayerPosition(0) === 95, 'Player 0 should still be at tile 95 after rolling 6 from 95 (overshoot)');
}
console.log('✓ Overshoot test passed');

// Test 7: Ladder climb
console.log('\nTest 7: Ladder climb');
// Using our defined ladder from 2 to 38
{
    const model = new GameModel();
    const controller = new GameController(model, mockView);
    model.resetGame();
    model.setPlayerPosition(0, 1);
    model.setActivePlayer(0);
    // Roll a 1 to reach tile 2 (base of ladder) and then climb to 38
    controller.rollDice = function() { 
        const dieRoll = 1;
        this.processTurn(dieRoll); 
    };
    controller.rollDice();
    console.assert(model.getPlayerPosition(0) === 38, 'Player 0 should be at tile 38 after climbing ladder from 2 (via rolling a 1 from 1)');
}
console.log('✓ Ladder climb test passed');

// Test 8: Snake descent
console.log('\nTest 8: Snake descent');
// Using our defined snake from 16 to 6
{
    const model = new GameModel();
    const controller = new GameController(model, mockView);
    model.resetGame();
    model.setPlayerPosition(0, 10);
    model.setActivePlayer(0);
    // Roll a 6 to reach tile 16 (head of snake) and then slide to 6
    controller.rollDice = function() { 
        const dieRoll = 6;
        this.processTurn(dieRoll); 
    };
    controller.rollDice();
    console.assert(model.getPlayerPosition(0) === 6, 'Player 0 should be at tile 6 after sliding down snake from 16 (via rolling a 6 from 10)');
}
console.log('✓ Snake descent test passed');

// Test 9: Capture (Katti) mechanics
console.log('\nTest 9: Capture mechanics');
{
    const model = new GameModel();
    const controller = new GameController(model, mockView);
    model.resetGame();
    // Set player 0 at tile 4
    model.setPlayerPosition(0, 4);
    // Set player 1 at tile 5 (so that when player 0 moves to 5, they capture)
    model.setPlayerPosition(1, 5);
    // Set active player to 0
    model.setActivePlayer(0);
    // Roll a 1 - player 0 should move from 4 to 5 and capture player 1
    controller.rollDice = function() { 
        const dieRoll = 1;
        this.processTurn(dieRoll); 
    };
    // We need to mock the view's onCapture method to verify it was called
    let captureCalled = false;
    mockView.onCapture = (opponent, targetPos) => {
        captureCalled = true;
        console.assert(opponent === 1, 'Opponent should be player 1');
        console.assert(targetPos === 5, 'Capture should happen at tile 5');
    };
    controller.rollDice();
    console.assert(model.getPlayerPosition(0) === 5, 'Player 0 should be at tile 5 after moving');
    console.assert(model.getPlayerPosition(1) === 0, 'Player 1 should be sent back to off-board (0) after capture');
    console.assert(captureCalled, 'Capture callback should have been called');
}
console.log('✓ Capture mechanics test passed');

// Test 10: Six gives extra roll
console.log('\nTest 10: Six gives extra roll');
{
    const model = new GameModel();
    const controller = new GameController(model, mockView);
    model.resetGame();
    model.setActivePlayer(0);
    // Track how many times rollDice was called
    let rollCallCount = 0;
    controller.rollDice = function() { 
        rollCallCount++;
        // First call: roll a 6
        // Second call (if extra roll): roll a 3
        const dieRoll = rollCallCount === 1 ? 6 : 3;
        this.processTurn(dieRoll); 
    };
    // We need to mock the view's onExtraRoll method
    let extraRollCalled = false;
    mockView.onExtraRoll = () => {
        extraRollCalled = true;
    };
    controller.rollDice(); // First roll (should be 6)
    console.assert(rollCallCount === 1, 'Roll dice should have been called once');
    console.assert(model.getActivePlayer() === 0, 'Active player should still be 0 after six (extra roll)');
    console.assert(model.getConsecutiveSixes() === 1, 'Consecutive sixes should be 1');
    console.assert(!extraRollCalled, 'Extra roll should not have been called yet (we call it on the second roll)');
    // Second roll
    controller.rollDice(); // Second roll (should be 3)
    console.assert(rollCallCount === 2, 'Roll dice should have been called twice');
    console.assert(model.getActivePlayer() === 1, 'Active player should now be 1 after the non-six roll');
    console.assert(model.getConsecutiveSixes() === 0, 'Consecutive sixes should be reset after non-six');
    console.assert(extraRollCalled, 'Extra roll callback should have been called');
}
console.log('✓ Six extra roll test passed');

// Test 11: Three sixes penalty
console.log('\nTest 11: Three sixes penalty');
{
    const model = new GameModel();
    const controller = new GameController(model, mockView);
    model.resetGame();
    model.setPlayerPosition(0, 10);
    model.setTurnStartPosition(10); // Snapshot the start position
    model.setActivePlayer(0);
    // Track roll calls
    let rollCallCount = 0;
    controller.rollDice = function() { 
        rollCallCount++;
        // Always roll 6
        const dieRoll = 6;
        this.processTurn(dieRoll); 
    };
    // Mock view methods
    let tripleSixCalled = false;
    mockView.onTripleSixPenalty = () => {
        tripleSixCalled = true;
    };
    // First six: move from 10 to 16, then snake to 6
    controller.rollDice(); // First six
    console.assert(rollCallCount === 1, 'Roll dice called once');
    console.assert(model.getConsecutiveSixes() === 1, 'Should have 1 consecutive six');
    console.assert(model.getPlayerPosition(0) === 6, 'After first six: moved to 16 then snake to 6');
    // Second six: move from 6 to 12 (no snake/ladder at 12)
    controller.rollDice(); // Second six
    console.assert(rollCallCount === 2, 'Roll dice called twice');
    console.assert(model.getConsecutiveSixes() === 2, 'Should have 2 consecutive sixes');
    console.assert(model.getPlayerPosition(0) === 12, 'After second six: moved to 12');
    // Third six: should trigger penalty and revert to start position (10)
    controller.rollDice(); // Third six
    console.assert(rollCallCount === 3, 'Roll dice called three times');
    console.assert(model.getConsecutiveSixes() === 0, 'Consecutive sixes should be reset to 0');
    console.assert(model.getPlayerPosition(0) === 10, 'Position should be reverted to start position (10)');
    console.assert(tripleSixCalled, 'Triple six penalty callback should have been called');
    // Turn should have advanced
    console.assert(model.getActivePlayer() === 1, 'Active player should have advanced to player 1 after triple six penalty');
}
console.log('✓ Three sixes penalty test passed');

console.log('\n🎉 All tests passed!');