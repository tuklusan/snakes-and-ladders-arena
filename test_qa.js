// QA test suite for Snakes and Ladders game
// Focuses on model, controller, and basic integration

const { JSDOM } = require('jsdom');
const fs = require('fs');
const vm = require('vm');

function loadScript(filename, window) {
    const code = fs.readFileSync(filename, 'utf8');
    // Ensure Image and Audio are defined on window
    if (!window.Image) {
        window.Image = class extends window.Element {
            constructor() {
                super();
                this.src = '';
                this.onload = null;
                this.onerror = null;
            }
        };
    }
    if (!window.Audio) {
        window.Audio = class {
            constructor(src) {
                this.src = src;
                this.currentTime = 0;
            }
            play() {
                return Promise.resolve();
            }
            pause() {
                return Promise.resolve();
            }
        };
    }
    // Run the script in the context of the window (as global)
    vm.runInContext(code, window, { filename, lineOffset: 0, displayErrors: true });
    return window;
}

function createWindow() {
    const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="game-container"></div></body></html>`, {
        runScripts: "dangerously",
        resources: "usable"
    });
    return dom.window;
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

// Test model and controller using the existing testGameLogicNode.js approach
function testModelAndController() {
    console.log('=== Model and Controller Tests ===');
    const window = createWindow();
    loadScript('./src/js/gameModel.js', window);
    loadScript('./src/js/gameController.js', window);
    const GameModel = window.GameModel;
    const GameController = window.GameController;

    // We'll reuse the tests from testGameLogicNode.js
    // Test 1: Initial state
    let model = new GameModel();
    assert(model.getActivePlayer() === 0, 'Active player should be 0');
    assert(model.getConsecutiveSixes() === 0, 'Consecutive sixes should be 0');
    assert(model.getPlayerPosition(0) === 0, 'Player 0 should be at position 0');
    assert(!model.isGameOver(), 'Game should not be over initially');

    // Test 2: Off-board entry with 1
    model.resetGame();
    const controller = new GameController(model, {
        onStateChange: () => {},
        onTurnChange: () => {},
        onExtraRoll: () => {},
        onTripleSixPenalty: () => {},
        onCapture: () => {},
        onGameWin: () => {},
        onReset: () => {}
    });
    controller.rollDice = function() { const dieRoll = 1; this.processTurn(dieRoll); };
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 1, 'Player 0 should be at tile 1 after rolling 1');

    // Test 3: Off-board entry with 6
    model.resetGame();
    controller.rollDice = function() { const dieRoll = 6; this.processTurn(dieRoll); };
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 1, 'Player 0 should be at tile 1 after rolling 6 from off-board');

    // Test 4: Off-board entry with 2 (should not move)
    model.resetGame();
    controller.rollDice = function() { const dieRoll = 2; this.processTurn(dieRoll); };
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 0, 'Player 0 should still be at tile 0 after rolling 2 from off-board');

    // Test 5: Exact landing for winning
    model.resetGame();
    model.setPlayerPosition(0, 95);
    model.setActivePlayer(0);
    controller.rollDice = function() { const dieRoll = 5; this.processTurn(dieRoll); };
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 100, 'Player 0 should be at tile 100 after rolling 5 from 95');
    assert(model.isGameOver(), 'Game should be over after reaching tile 100');
    assert(model.getWinner() === 0, 'Player 0 should be the winner');

    // Test 6: Overshooting 100 should not move
    model.resetGame();
    model.setPlayerPosition(0, 95);
    model.setActivePlayer(0);
    controller.rollDice = function() { const dieRoll = 6; this.processTurn(dieRoll); };
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 95, 'Player 0 should still be at tile 95 after rolling 6 from 95 (overshoot)');

    // Test 7: Ladder climb
    model.resetGame();
    model.setPlayerPosition(0, 1);
    model.setActivePlayer(0);
    controller.rollDice = function() { const dieRoll = 1; this.processTurn(dieRoll); };
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 38, 'Player 0 should be at tile 38 after climbing ladder from 2 (via rolling a 1 from 1)');

    // Test 8: Snake descent
    model.resetGame();
    model.setPlayerPosition(0, 10);
    model.setActivePlayer(0);
    controller.rollDice = function() { const dieRoll = 6; this.processTurn(dieRoll); };
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 6, 'Player 0 should be at tile 6 after sliding down snake from 16 (via rolling a 6 from 10)');

    // Test 9: Capture (Katti) mechanics
    model.resetGame();
    model.setPlayerPosition(0, 4);
    model.setPlayerPosition(1, 5);
    model.setActivePlayer(0);
    let captureCalled = false;
    const view2 = {
        onStateChange: () => {},
        onTurnChange: () => {},
        onExtraRoll: () => {},
        onTripleSixPenalty: () => {},
        onCapture: (opponent, targetPos) => {
            captureCalled = true;
            assert(opponent === 1, 'Opponent should be player 1');
            assert(targetPos === 5, 'Capture should happen at tile 5');
        },
        onGameWin: () => {},
        onReset: () => {}
    };
    const controller2 = new GameController(model, view2);
    controller2.rollDice = function() { const dieRoll = 1; this.processTurn(dieRoll); };
    controller2.rollDice();
    assert(model.getPlayerPosition(0) === 5, 'Player 0 should be at tile 5 after moving');
    assert(model.getPlayerPosition(1) === 0, 'Player 1 should be sent back to off-board (0) after capture');
    assert(captureCalled, 'Capture callback should have been called');

    // Test 10: Six gives extra roll
    model.resetGame();
    model.setActivePlayer(0);
    let rollCallCount = 0;
    let extraRollCalled = false;
    controller.rollDice = function() {
        rollCallCount++;
        const dieRoll = rollCallCount === 1 ? 6 : 3;
        this.processTurn(dieRoll);
    };
    let extraRollCalls = 0;
    const view3 = {
        onStateChange: () => {},
        onTurnChange: () => {},
        onExtraRoll: () => { extraRollCalled = true; extraRollCalls++; },
        onTripleSixPenalty: () => {},
        onCapture: () => {},
        onGameWin: () => {},
        onReset: () => {}
    };
    const controller3 = new GameController(model, view3);
    controller3.rollDice = controller.rollDice;
    controller3.rollDice(); // First roll (should be 6)
    assert(rollCallCount === 1, 'Roll dice should have been called once');
    assert(model.getActivePlayer() === 0, 'Active player should still be 0 after six (extra roll)');
    assert(model.getConsecutiveSixes() === 1, 'Consecutive sixes should be 1');
    assert(extraRollCalled, 'Extra roll callback should have been called on the six roll');
    controller3.rollDice(); // Second roll (should be 3)
    assert(rollCallCount === 2, 'Roll dice should have been called twice');
    assert(model.getActivePlayer() === 1, 'Active player should now be 1 after the non-six roll');
    assert(model.getConsecutiveSixes() === 0, 'Consecutive sixes should be reset after non-six');
    assert(extraRollCalled, 'Extra roll callback should have been called');

    // Test 11: Three sixes penalty
    model.resetGame();
    model.setPlayerPosition(0, 10);
    model.setTurnStartPosition(10); // Snapshot the start position
    model.setActivePlayer(0);
    let rollCallCount2 = 0;
    let tripleSixCalled = false;
    controller.rollDice = function() {
        rollCallCount2++;
        const dieRoll = 6;
        this.processTurn(dieRoll);
    };
    const view4 = {
        onStateChange: () => {},
        onTurnChange: () => {},
        onExtraRoll: () => {},
        onTripleSixPenalty: () => { tripleSixCalled = true; },
        onCapture: () => {},
        onGameWin: () => {},
        onReset: () => {}
    };
    const controller4 = new GameController(model, view4);
    controller4.rollDice = controller.rollDice;
    controller4.rollDice(); // First six
    assert(rollCallCount2 === 1, 'Roll dice called once');
    assert(model.getConsecutiveSixes() === 1, 'Should have 1 consecutive six');
    assert(model.getPlayerPosition(0) === 6, 'After first six: moved to 16 then snake to 6');
    controller4.rollDice(); // Second six
    assert(rollCallCount2 === 2, 'Roll dice called twice');
    assert(model.getConsecutiveSixes() === 2, 'Should have 2 consecutive sixes');
    assert(model.getPlayerPosition(0) === 12, 'After second six: moved to 12');
    controller4.rollDice(); // Third six
    assert(rollCallCount2 === 3, 'Roll dice called three times');
    assert(model.getConsecutiveSixes() === 0, 'Consecutive sixes should be reset to 0');
    assert(model.getPlayerPosition(0) === 10, 'Position should be reverted to start position (10)');
    assert(tripleSixCalled, 'Triple six penalty callback should have been called');
    assert(model.getActivePlayer() === 1, 'Active player should have advanced to player 1 after triple six penalty');

    console.log('✓ Model and controller tests passed');
}

// Simple integration test: simulate a few turns and check state changes
function testIntegration() {
    console.log('=== Integration Test ===');
    const window = createWindow();
    loadScript('./src/js/gameModel.js', window);
    loadScript('./src/js/gameController.js', window);
    loadScript('./src/js/gameView.js', window);
    const GameModel = window.GameModel;
    const GameController = window.GameController;
    const GameView = window.GameView;

    const model = new GameModel();
    const view = new GameView();
    const controller = new GameController(model, view);

    // Initialize view (we'll skip asset loading checks)
    view.isAssetsLoaded = true;
    view.isAssetsHandled = true;
    if (view.loadingOverlay) {
        view.loadingOverlay.style.display = 'none';
    }
    view.enableRollButton();

    // We'll track state changes via a simple counter
    let stateChangeCount = 0;
    view.onStateChange = () => { stateChangeCount++; };

    // Start game: player 0 at 0
    assert(model.getPlayerPosition(0) === 0, 'Initial position 0');

    // Roll 1 -> move to 1
    controller.rollDice = sharedRoll(1);
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 1, 'After roll 1, position should be 1');
    assert(stateChangeCount >= 1, 'State should have changed');
    stateChangeCount = 0;

    // Roll 6 -> from 1, +6 =7 -> ladder to 14? Wait, ladder from 2 to 38, but we are at 1, roll 6 -> 7 (no ladder)
    // Actually, from tile 1, rolling a 6 moves to tile 7 (1+6=7). There is no ladder at 7.
    controller.rollDice = sharedRoll(6);
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 7, 'After roll 6 from tile 1, position should be 7');
    assert(stateChangeCount >= 1, 'State should have changed');
    stateChangeCount = 0;

    // Roll 2 -> from 7, +2 =9 (no snake/ladder)
    controller.rollDice = sharedRoll(2);
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 9, 'After roll 2 from tile 7, position should be 9');
    assert(stateChangeCount >= 1, 'State should have changed');
    stateChangeCount = 0;

    // Roll 1 -> from 9, +1 =10 (no snake/ladder, but note: tile 10 is start of snake? Actually snake at 16->6, so 10 is safe)
    controller.rollDice = sharedRoll(1);
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 10, 'After roll 1 from tile 9, position should be 10');
    assert(stateChangeCount >= 1, 'State should have changed');
    stateChangeCount = 0;

    // Roll 6 -> from 10, +6 =16 -> snake to 6
    controller.rollDice = sharedRoll(6);
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 6, 'After roll 6 from tile 10, position should be 6 (snake)');
    assert(stateChangeCount >= 1, 'State should have changed');
    stateChangeCount = 0;

    // Now test that the turn changes after a non-six
    // We just rolled a 6, so we get an extra roll.
    // Let's roll a non-six to end the turn.
    controller.rollDice = sharedRoll(3);
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 9, 'After roll 3 from tile 6, position should be 9');
    // Since it's a non-six, turn should advance to player 1
    assert(model.getActivePlayer() === 1, 'Active player should be 1 after non-six');
    assert(stateChangeCount >= 1, 'State should have changed');

    console.log('✓ Integration test passed');

    function sharedRoll(dieValue) {
        return function() {
            const dieRoll = dieValue;
            this.processTurn(dieRoll);
        };
    }
}

// Simple black-box test: simulate clicks on the roll button
function testBlackBox() {
    console.log('=== Black-box Test ===');
    const window = createWindow();
    loadScript('./src/js/gameModel.js', window);
    loadScript('./src/js/gameController.js', window);
    loadScript('./src/js/gameView.js', window);
    const GameModel = window.GameModel;
    const GameController = window.GameController;
    const GameView = window.GameView;

    const model = new GameModel();
    const view = new GameView();
    const controller = new GameController(model, view);
    view.init(model, controller);

    // Bypass asset loading
    view.isAssetsLoaded = true;
    view.isAssetsHandled = true;
    if (view.loadingOverlay) {
        view.loadingOverlay.style.display = 'none';
    }
    view.enableRollButton();

    const rollButton = window.document.getElementById('roll-button');
    assert(rollButton !== null, 'Roll button should exist');
    assert(rollButton.disabled === false, 'Roll button should be enabled');

    let stateChangeCount = 0;
    view.onStateChange = () => { stateChangeCount++; };

    // We'll control the roll by overriding Math.random
    function clickWithDie(dieValue) {
        const originalRandom = Math.random;
        Math.random = () => (dieValue - 1) / 6.0;
        try {
            rollButton.click();
        } finally {
            Math.random = originalRandom;
        }
    }

    // Start: player 0 at 0
    assert(model.getPlayerPosition(0) === 0, 'Initial position 0');

    // Click with die 1 -> move to 1
    clickWithDie(1);
    assert(model.getPlayerPosition(0) === 1, 'After clicking die 1, position should be 1');
    assert(stateChangeCount >= 1, 'State should have changed');
    stateChangeCount = 0;

    // Click with die 6 -> from 1, +6 =7 (no ladder)
    clickWithDie(6);
    assert(model.getPlayerPosition(0) === 7, 'After clicking die 6 from tile 1, position should be 7');
    assert(stateChangeCount >= 1, 'State should have changed');
    stateChangeCount = 0;

    // Click with die 3 -> from 7, +3 =10
    clickWithDie(3);
    assert(model.getPlayerPosition(0) === 10, 'After clicking die 3 from tile 7, position should be 10');
    assert(stateChangeCount >= 1, 'State should have changed');
    stateChangeCount = 0;

    // Click with die 6 -> from 10, +6 =16 -> snake to 6
    clickWithDie(6);
    assert(model.getPlayerPosition(0) === 6, 'After clicking die 6 from tile 10, position should be 6 (snake)');
    assert(stateChangeCount >= 1, 'State should have changed');

    console.log('✓ Black-box test passed');
}

// Run the tests
try {
    testModelAndController();
    testIntegration();
    testBlackBox();
    console.log('\n🎉 All QA tests passed!');
    process.exit(0);
} catch (e) {
    console.error('\n❌ QA test failed:', e.message);
    console.error(e.stack);
    process.exit(1);
}