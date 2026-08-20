// Comprehensive test suite for Snakes and Ladders game
// Includes unit, integration, and black-box UI tests

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

// Set up a mock window and document for jsdom
function createWindow() {
    const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="game-container"></div></body></html>`, {
        runScripts: "dangerously",
        resources: "usable"
        // We'll handle Image and Audio mocking in loadScript
    });
    return dom.window;
}

// Test 1: Model unit tests (extended)
function testModel() {
    console.log('=== Model Unit Tests ===');
    const window = createWindow();
    loadScript('./src/js/gameModel.js', window);
    const GameModel = window.GameModel;

    // Test reset
    let model = new GameModel();
    assert(model.getActivePlayer() === 0, 'Active player should be 0 after reset');
    assert(model.getConsecutiveSixes() === 0, 'Consecutive sixes should be 0 after reset');
    assert(JSON.stringify(model.getState().pawn_positions) === JSON.stringify([0,0,0,0]), 'All pawns should be at 0 after reset');
    assert(!model.isGameOver(), 'Game should not be over after reset');
    assert(model.getWinner() === null, 'Winner should be null after reset');

    // Test setters and getters
    model.setActivePlayer(2);
    assert(model.getActivePlayer() === 2, 'Active player setter/getter');
    model.setConsecutiveSixes(3);
    assert(model.getConsecutiveSixes() === 3, 'Consecutive sixes setter/getter');
    model.setPlayerPosition(1, 5);
    assert(model.getPlayerPosition(1) === 5, 'Player position setter/getter');
    model.setGameOver(true);
    assert(model.isGameOver(), 'Game over setter/getter');
    model.setWinner(1);
    assert(model.getWinner() === 1, 'Winner setter/getter');
    model.setLastRoll(4);
    assert(model.getLastRoll() === 4, 'Last roll setter/getter');

    // Test safe zones
    assert(model.SafeZones.has(0), 'Safe zone 0');
    assert(model.SafeZones.has(1), 'Safe zone 1');
    assert(model.SafeZones.has(100), 'Safe zone 100');
    assert(!model.SafeZones.has(2), 'Non-safe zone 2');

    // Test ladders and snakes
    assert(model.Ladders.has(2) && model.Ladders.get(2) === 38, 'Ladder 2->38');
    assert(model.Ladders.has(7) && model.Ladders.get(7) === 14, 'Ladder 7->14');
    assert(model.Snakes.has(16) && model.Snakes.get(16) === 6, 'Snake 16->6');
    assert(model.Snakes.has(99) && model.Snakes.get(99) === 80, 'Snake 99->80');

    console.log('✓ Model unit tests passed');
}

// Test 2: Controller unit tests (extended)
function testController() {
    console.log('=== Controller Unit Tests ===');
    const window = createWindow();
    loadScript('./src/js/gameModel.js', window);
    loadScript('./src/js/gameController.js', window);
    const GameModel = window.GameModel;
    const GameController = window.GameController;

    // Helper to create a mock view
    function createMockView() {
        return {
            onStateChange: () => {},
            onTurnChange: () => {},
            onExtraRoll: () => {},
            onTripleSixPenalty: () => {},
            onCapture: () => {},
            onGameWin: () => {},
            onReset: () => {}
        };
    }

    // Test initial state
    const model = new GameModel();
    const view = createMockView();
    const controller = new GameController(model, view);
    assert(model.getActivePlayer() === 0, 'Initial active player');
    assert(model.getConsecutiveSixes() === 0, 'Initial consecutive sixes');

    // Test off-board entry with 1 (already covered in existing tests, but we'll do more)
    model.resetGame();
    controller.rollDice = function() { const dieRoll = 1; this.processTurn(dieRoll); };
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 1, 'Off-board entry with 1');

    // Test off-board entry with 6
    model.resetGame();
    controller.rollDice = function() { const dieRoll = 6; this.processTurn(dieRoll); };
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 1, 'Off-board entry with 6');

    // Test off-board entry with 2 (should not move)
    model.resetGame();
    controller.rollDice = function() { const dieRoll = 2; this.processTurn(dieRoll); };
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 0, 'Off-board entry with 2 should not move');

    // Test exact landing for win
    model.resetGame();
    model.setPlayerPosition(0, 95);
    model.setActivePlayer(0);
    controller.rollDice = function() { const dieRoll = 5; this.processTurn(dieRoll); };
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 100, 'Exact landing for win');
    assert(model.isGameOver(), 'Game should be over after win');
    assert(model.getWinner() === 0, 'Winner should be player 0');

    // Test overshoot
    model.resetGame();
    model.setPlayerPosition(0, 95);
    model.setActivePlayer(0);
    controller.rollDice = function() { const dieRoll = 6; this.processTurn(dieRoll); };
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 95, 'Overshoot should not move');

    // Test ladder climb
    model.resetGame();
    model.setPlayerPosition(0, 1);
    model.setActivePlayer(0);
    controller.rollDice = function() { const dieRoll = 1; this.processTurn(dieRoll); };
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 38, 'Ladder climb: 1 -> 2 -> ladder to 38');

    // Test snake descent
    model.resetGame();
    model.setPlayerPosition(0, 10);
    model.setActivePlayer(0);
    controller.rollDice = function() { const dieRoll = 6; this.processTurn(dieRoll); };
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 6, 'Snake descent: 10 +6 =16 -> snake to 6');

    // Test capture
    model.resetGame();
    model.setPlayerPosition(0, 4);
    model.setPlayerPosition(1, 5);
    model.setActivePlayer(0);
    let captureCalled = false;
    const view2 = {
        ...createMockView(),
        onCapture: (opponent, targetPos) => {
            captureCalled = true;
            assert(opponent === 1, 'Capture opponent should be player 1');
            assert(targetPos === 5, 'Capture should happen at tile 5');
        }
    };
    const controller2 = new GameController(model, view2);
    controller2.rollDice = function() { const dieRoll = 1; this.processTurn(dieRoll); };
    controller2.rollDice();
    assert(model.getPlayerPosition(0) === 5, 'Capture: mover should be at 5');
    assert(model.getPlayerPosition(1) === 0, 'Capture: opponent should be sent to 0');
    assert(captureCalled, 'Capture callback should be called');

    // Test six gives extra roll
    model.resetGame();
    model.setActivePlayer(0);
    let rollCount = 0;
    let extraRollCalled = false;
    const view3 = {
        ...createMockView(),
        onExtraRoll: () => { extraRollCalled = true; }
    };
    const controller3 = new GameController(model, view3);
    controller3.rollDice = function() {
        rollCount++;
        const dieRoll = rollCount === 1 ? 6 : 3;
        this.processTurn(dieRoll);
    };
    controller3.rollDice(); // first roll (6)
    assert(rollCount === 1, 'Roll count should be 1 after first roll');
    assert(model.getActivePlayer() === 0, 'Active player should still be 0 after six');
    assert(model.getConsecutiveSixes() === 1, 'Consecutive sixes should be 1');
    assert(extraRollCalled, 'Extra roll should be called on six');
    controller3.rollDice(); // second roll (3)
    assert(rollCount === 2, 'Roll count should be 2 after second roll');
    assert(model.getActivePlayer() === 1, 'Active player should be 1 after non-six');
    assert(model.getConsecutiveSixes() === 0, 'Consecutive sixes should reset after non-six');
    assert(extraRollCalled, 'Extra roll flag should remain true');

    // Test three sixes penalty
    model.resetGame();
    model.setPlayerPosition(0, 10);
    model.setTurnStartPosition(10); // manually set for test
    model.setActivePlayer(0);
    let rollCount2 = 0;
    let tripleSixCalled = false;
    const view4 = {
        ...createMockView(),
        onTripleSixPenalty: () => { tripleSixCalled = true; }
    };
    const controller4 = new GameController(model, view4);
    controller4.rollDice = function() {
        rollCount2++;
        const dieRoll = 6;
        this.processTurn(dieRoll);
    };
    // First six
    controller4.rollDice();
    assert(rollCount2 === 1, 'Roll count 1');
    assert(model.getConsecutiveSixes() === 1, 'Consecutive sixes 1');
    // Position after first six: 10 +6 =16 -> snake to 6
    assert(model.getPlayerPosition(0) === 6, 'Position after first six should be 6');
    // Second six
    controller4.rollDice();
    assert(rollCount2 === 2, 'Roll count 2');
    assert(model.getConsecutiveSixes() === 2, 'Consecutive sixes 2');
    // Position after second six: 6 +6 =12 (no snake/ladder at 12)
    assert(model.getPlayerPosition(0) === 12, 'Position after second six should be 12');
    // Third six
    controller4.rollDice();
    assert(rollCount2 === 3, 'Roll count 3');
    assert(model.getConsecutiveSixes() === 0, 'Consecutive sixes should reset after three sixes');
    // Position should revert to turn start position (10)
    assert(model.getPlayerPosition(0) === 10, 'Position after three sixes penalty should be 10');
    assert(tripleSixCalled, 'Triple six penalty callback should be called');
    // Active player should advance to next player
    assert(model.getActivePlayer() === 1, 'Active player should advance to player 1 after triple six penalty');
    // All player positions should be reverted to turn start positions
    // We only set player 0's turn start position, but the controller snapshots all players.
    // For simplicity, we'll just check player 0.
    // We'll also check that the turnStartPlayerPositions array was used to revert others.
    // Since we didn't change other players, they should remain at 0.
    assert(model.getPlayerPosition(1) === 0, 'Player 1 should remain at 0 (assuming no change)');

    console.log('✓ Controller unit tests passed');
}

// Test 3: View unit tests (using jsdom)
function testView() {
    console.log('=== View Unit Tests ===');
    const window = createWindow();
    loadScript('./src/js/gameModel.js', window);
    loadScript('./src/js/gameView.js', window);
    const GameModel = window.GameModel;
    const GameView = window.GameView;

    // Create a mock model and controller
    const model = new GameModel();
    const controller = {
        rollDice: () => {},
        resetGame: () => {}
    };

    // Initialize the view
    const view = new GameView();
    view.init(model, controller);

    // Check that the container was found and elements created
    const container = window.document.getElementById('game-container');
    assert(container !== null, 'Game container should exist');
    assert(container.style.position === 'relative', 'Container should have relative position');
    assert(container.style.border === '2px solid red', 'Container should have red border (from createDOM)');

    // Check board element
    const board = window.document.getElementById('game-board');
    assert(board !== null, 'Board element should exist');
    assert(board.style.position === 'relative', 'Board should be relative');
    assert(board.style.width === '100%', 'Board width 100%');
    assert(board.style.paddingBottom === '100%', 'Board paddingBottom 100% (aspect ratio)');

    // Check token elements (should be 4)
    const tokens = window.document.getElementsByClassName('game-token');
    assert(tokens.length === 4, 'Should have 4 token elements');
    // Check they are absolutely positioned
    for (let i = 0; i < tokens.length; i++) {
        assert(tokens[i].style.position === 'absolute', `Token ${i} should be absolute`);
    }

    // Check dice element
    const dice = window.document.getElementById('dice-container');
    assert(dice !== null, 'Dice element should exist');
    assert(dice.style.position === 'absolute', 'Dice should be absolute');
    assert(dice.style.top === '10px', 'Dice top 10px');
    assert(dice.style.right === '10px', 'Dice right 10px');

    // Check player info element
    const playerInfo = window.document.getElementById('player-info');
    assert(playerInfo !== null, 'Player info element should exist');
    assert(playerInfo.style.position === 'absolute', 'Player info should be absolute');
    assert(playerInfo.style.bottom === '10px', 'Player info bottom 10px');
    assert(playerInfo.style.left === '10px', 'Player info left 10px');
    assert(playerInfo.style.right === '10px', 'Player info right 10px');

    // Check roll button
    const rollButton = window.document.getElementById('roll-button');
    assert(rollButton !== null, 'Roll button should exist');
    assert(rollButton.id === 'roll-button', 'Roll button id');
    assert(rollButton.textContent === 'Roll Dice', 'Roll button text');
    assert(rollButton.disabled === true, 'Roll button should be disabled initially (assets not loaded)');

    // Check loading overlay
    const loadingOverlay = window.document.getElementById('loading-overlay');
    assert(loadingOverlay !== null, 'Loading overlay should exist');
    assert(['0', '0px'].includes(loadingOverlay.style.top), 'Loading overlay top 0');
    assert(['0', '0px'].includes(loadingOverlay.style.left), 'Loading overlay left 0');
    assert(loadingOverlay.style.width === '100%' || loadingOverlay.style.width === '', 'Loading overlay width 100%');
    assert(loadingOverlay.style.height === '100%' || loadingOverlay.style.height === '', 'Loading overlay height 100%');
    assert(loadingOverlay.style.backgroundColor !== '', 'Loading overlay background color should be set');
    assert(loadingOverlay.style.backgroundColor.match(/rgba?\(/), 'Loading overlay background color should be a color');
    assert(loadingOverlay.style.display === 'flex', 'Loading overlay display flex');
    assert(loadingOverlay.style.justifyContent === 'center', 'Loading overlay justify content center');
    assert(loadingOverlay.style.alignItems === 'center', 'Loading overlay align items center');
    assert(loadingOverlay.style.fontSize === '24px', 'Loading overlay font size 24px');
    assert(loadingOverlay.style.zIndex === '1000', 'Loading overlay z-index 1000');
    assert(loadingOverlay.innerHTML.includes('Loading game assets'), 'Loading overlay should have loading text');

    // Test tileToPosition function
    // We'll call it via the view instance (it's a public method)
    // Test off-board (tile 0)
    const pos0 = view.tileToPosition(0);
    assert(pos0.x === -50 && pos0.y === -50, 'Off-board position should be (-50, -50)');

    // Test tile 1 (bottom left)
    const pos1 = view.tileToPosition(1);
    // Tile 1: row 0, col 0 (since tile-- =>0, row=0, colInRow=0, row even => col=0)
    // xPercent = (0*10)+5 =5, yPercentFromTop = ((9-0)*10)+5 =95
    assert(pos1.x === 5 && pos1.y === 95, 'Tile 1 position should be (5,95)');

    // Test tile 10 (bottom right)
    const pos10 = view.tileToPosition(10);
    // Tile 10: tile-- =>9, row=0, colInRow=9, row even => col=9
    // xPercent = (9*10)+5 =95, yPercentFromTop = ((9-0)*10)+5 =95
    assert(pos10.x === 95 && pos10.y === 95, 'Tile 10 position should be (95,95)');

    // Test tile 11 (row 1, right to left)
    const pos11 = view.tileToPosition(11);
    // Tile 11: tile-- =>10, row=1, colInRow=0, row odd => col=9-0=9
    // xPercent = (9*10)+5 =95, yPercentFromTop = ((9-1)*10)+5 =85
    assert(pos11.x === 95 && pos11.y === 85, 'Tile 11 position should be (95,85)');

    // Test token 20 (row 1, leftmost in row)
    const pos20 = view.tileToPosition(20);
    // Token-- =>19, row=1, colInRow=9, row odd => col=9-9=0
    // xPercent = (0*10)+5 =5, yPercentFromTop = ((9-1)*10)+5 =85
    assert(pos20.x === 5 && pos20.y === 85, 'Tile 20 position should be (5,85)');

    // Test tile 100 (top right? Actually tile 100 is off-board? In our game, tile 100 is the winning tile, and it's on the board.
    // According to the boustrophedon layout, tile 100: tile-- =>99, row=9, colInRow=9, row odd (9%2=1) => col=9-9=0
    // xPercent = (0*10)+5 =5, yPercentFromTop = ((9-9)*10)+5 =5
    const pos100 = view.tileToPosition(100);
    assert(pos100.x === 5 && pos100.y === 5, 'Tile 100 position should be (5,5)');

    // Test updateDice (requires mocking assets)
    // We'll mock the assets.diceFaces array
    view.assets.diceFaces = [/* mock images */ { src: 'fake1.png' }, { src: 'fake2.png' }, { src: 'fake3.png' }, { src: 'fake4.png' }, { src: 'fake5.png' }, { src: 'fake6.png' }];
    view.updateDice(3);
    assert(dice.style.backgroundImage === "url('fake3.png')", 'Dice background should update to face 3');

    // Test playAudio (we mocked Audio, so just check it doesn't throw)
    view.playAudio('roll');
    // If we get here, no error.

    // Test onStateChange (should call updateDice, updatePlayerInfo, etc.)
    // We'll just call it and see if it throws.
    model.setLastRoll(2);
    view.onStateChange(); // should not throw

    // Test onTurnChange
    view.onTurnChange(2); // should not throw

    // Test onExtraRoll
    view.onExtraRoll(); // should change button text temporarily
    assert(rollButton.textContent === 'Extra Roll!', 'Button text should be Extra Roll after onExtraRoll');
    // After timeout, it should revert, but we won't wait.

    // Test onTripleSixPenalty
    view.onTripleSixPenalty(); // should play audio and alert (we mocked audio, alert will happen but we can ignore)

    // Test onCapture
    view.onCapture(1, 5); // should play audio and log

    // Test onGameWin
    view.onGameWin(0); // should play audio, disable button, change text, and show alert after timeout

    // Test onReset
    view.onReset(); // should clear timeouts, reset button text, enable button, update token positions, update player info, clear dice

    console.log('✓ View unit tests passed');
}

// Test 4: Integration tests (model-controller-view interaction)
function testIntegration() {
    console.log('=== Integration Tests ===');
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

    // Initialize view (this will create DOM elements)
    view.init(model, controller);

    // Now simulate a few rolls and check that the state and UI update correctly
    // We'll mock the view's callbacks to track calls
    let stateChangeCalls = 0;
    let turnChangeCalls = 0;
    let extraRollCalls = 0;
    let tripleSixCalls = 0;
    let captureCalls = 0;
    let gameWinCalls = 0;
    let resetCalls = 0;

    view.onStateChange = () => { stateChangeCalls++; };
    view.onTurnChange = () => { turnChangeCalls++; };
    view.onExtraRoll = () => { extraRollCalls++; };
    view.onTripleSixPenalty = () => { tripleSixCalls++; };
    view.onCapture = () => { captureCalls++; };
    view.onGameWin = () => { gameWinCalls++; };
    view.onReset = () => { resetCalls++; };

    // Test 1: Start game, roll 1 (should move to tile 1)
    controller.rollDice = function() { const dieRoll = 1; this.processTurn(dieRoll); };
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 1, 'Player 0 should be at tile 1 after rolling 1');
    assert(stateChangeCalls >= 1, 'onStateChange should be called');
    // Reset call counts for next test
    stateChangeCalls = 0;

    // Test 2: Roll 6 from tile 1 (should go to tile 7, then ladder to 14)
    controller.rollDice = function() { const dieRoll = 6; this.processTurn(dieRoll); };
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 14, 'Player 0 should be at tile 14 after rolling 6 from tile 1 (ladder)');
    assert(stateChangeCalls >= 1, 'onStateChange should be called');

    // Test 3: Roll 6 again (from 14, +6 =20, no snake/ladder)
    controller.rollDice = function() { const dieRoll = 6; this.processTurn(dieRoll); };
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 20, 'Player 0 should be at tile 20 after rolling 6 from tile 14');
    // Since it's a six, we should get an extra roll, so active player should still be 0
    assert(model.getActivePlayer() === 0, 'Active player should still be 0 after a six (extra roll)');
    assert(extraRollCalls >= 1, 'onExtraRoll should be called');

    // Test 4: Roll non-six (say 3) to end turn
    controller.rollDice = function() { const dieRoll = 3; this.processTurn(dieRoll); };
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 23, 'Player 0 should be at tile 23 after rolling 3 from tile 20');
    assert(model.getActivePlayer() === 1, 'Active player should be 1 after non-six');
    assert(turnChangeCalls >= 1, 'onTurnChange should be called');

    // Test 5: Test capture
    // Set player 1 to tile 23
    model.setPlayerPosition(1, 23);
    // Now player 0 rolls a 0? Actually we need to roll a number that lands on 23.
    // Player 0 is at 23, so to capture we need to be on a different tile and roll to 23.
    // Let's move player 0 to 20 and roll a 3.
    model.setPlayerPosition(0, 20);
    model.setActivePlayer(0);
    controller.rollDice = function() { const dieRoll = 3; this.processTurn(dieRoll); };
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 23, 'Player 0 should move to tile 23');
    assert(model.getPlayerPosition(1) === 0, 'Player 1 should be captured and sent to 0');
    assert(captureCalls >= 1, 'onCapture should be called');

    // Test 6: Test win condition
    model.setPlayerPosition(0, 95);
    model.setActivePlayer(0);
    controller.rollDice = function() { const dieRoll = 5; this.processTurn(dieRoll); };
    controller.rollDice();
    assert(model.getPlayerPosition(0) === 100, 'Player 0 should reach tile 100 and win');
    assert(model.isGameOver(), 'Game should be over');
    assert(model.getWinner() === 0, 'Winner should be player 0');
    assert(gameWinCalls >= 1, 'onGameWin should be called');

    // Test 7: Test reset after win
    controller.resetGame();
    assert(resetCalls >= 1, 'onReset should be called');
    assert(!model.isGameOver(), 'Game should not be over after reset');
    assert(model.getWinner() === null, 'Winner should be null after reset');
    assert(model.getActivePlayer() === 0, 'Active player should be 0 after reset');
    assert(JSON.stringify(model.getState().pawn_positions) === JSON.stringify([0,0,0,0]), 'All pawns should be at 0 after reset');

    console.log('✓ Integration tests passed');
}

// Test 5: Black-box UI tests (simulate user interaction)
function testBlackBoxUI() {
    console.log('=== Black-box UI Tests ===');
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

    // We'll simulate clicks on the roll button and check that the dice changes and state updates.
    // Since we mocked Image and Audio, the view should initialize without errors.
    // We need to wait for assets to load (or bypass loading). We'll manually set isAssetsLoaded to true and enable the button.
    // Alternatively, we can modify the view's loadAssets to not actually load images but just set the flags.
    // For simplicity, we'll directly set the view's state to skip loading.
    view.isAssetsLoaded = true;
    view.isAssetsHandled = true;
    if (view.loadingOverlay) {
        view.loadingOverlay.style.display = 'none';
    }
    view.enableRollButton();

    const rollButton = window.document.getElementById('roll-button');
    assert(rollButton !== null, 'Roll button should exist');
    assert(rollButton.disabled === false, 'Roll button should be enabled after assets loaded');

    // We'll also need to mock the view's asset loading to avoid waiting.
    // We'll just proceed.

    // Track the number of times onStateChange is called
    let stateChangeCount = 0;
    view.onStateChange = () => { stateChangeCount++; };

    // Simulate a click
    rollButton.click();
    // The click handler will call controller.rollDice(), which will generate a random roll.
    // We need to control the roll to make assertions. We'll override the controller's rollDice method to use a fixed roll.
    // But we already set the controller; we can replace its rollDice method.
    // However, the click handler is bound to the original controller.rollDice.
    // Instead, we'll override the model's setLastRoll and processTurn to use a fixed roll? That's messy.
    // Better: we'll create a new controller for this test that uses fixed rolls.
    // Let's do a fresh setup for each click test.

    // We'll create a helper function to simulate a roll with a fixed die value.
    function simulateFixedRoll(dieValue) {
        // We'll directly call controller.processTurn with the dieValue, but we need to go through the view's click handler?
        // For black-box, we want to simulate the user clicking the button, which leads to controller.rollDice().
        // Since we cannot control the random roll inside controller.rollDice, we'll instead stub Math.random.
        // We'll wrap the click in a stub.
        const originalRandom = Math.random;
        Math.random = () => (dieValue - 1) / 6.0; // so that floor(Math.random()*6)+1 = dieValue
        try {
            rollButton.click();
        } finally {
            Math.random = originalRandom;
        }
    }

    // Test 1: Click with die roll 1 (should move from 0 to 1)
    simulateFixedRoll(1);
    // Allow time for processing (though it's synchronous)
    assert(model.getPlayerPosition(0) === 1, 'After clicking roll button with die 1, player should be at tile 1');
    assert(stateChangeCount >= 1, 'onStateChange should have been called');

    // Reset for next test
    stateChangeCount = 0;

    // Test 2: Click with die roll 6 (should go to ladder)
    simulateFixedRoll(6);
    assert(model.getPlayerPosition(0) === 38, 'After clicking roll button with die 6 from tile 1, player should be at tile 38 (ladder)');
    assert(stateChangeCount >= 1, 'onStateChange should have been called');

    // Test 3: Click with die roll 6 again (should get extra roll, so active player remains 0)
    simulateFixedRoll(6);
    // From 38, +6 =44 (no snake/ladder at 44)
    assert(model.getPlayerPosition(0) === 44, 'After second six, player should be at tile 44');
    assert(model.getActivePlayer() === 0, 'After a six, active player should remain 0 (extra roll)');
    // We can't easily check extraRoll call because we didn't stub the view, but we trust the controller.

    // Test 4: Click with die roll 3 (should end turn)
    simulateFixedRoll(3);
    assert(model.getPlayerPosition(0) === 47, 'After rolling 3 from 44, player should be at tile 47');
    assert(model.getActivePlayer() === 1, 'After non-six, active player should advance to player 1');

    // Test 5: Test win condition via clicks
    // Reset the game
    controller.resetGame();
    // Set player 0 to 95 via direct model manipulation (since we can't roll exactly to 95 easily without many clicks)
    model.setPlayerPosition(0, 95);
    model.setActivePlayer(0);
    stateChangeCount = 0;
    simulateFixedRoll(5); // should win
    assert(model.getPlayerPosition(0) === 100, 'After rolling 5 from 95, player should win');
    assert(model.isGameOver(), 'Game should be over');
    assert(model.getWinner() === 0, 'Winner should be player 0');

    console.log('✓ Black-box UI tests passed');
}

// Test 6: Stress testing (random playthroughs)
function testStress() {
    console.log('=== Stress Tests ===');
    const window = createWindow();
    loadScript('./src/js/gameModel.js', window);
    loadScript('./src/js/gameController.js', window);
    loadScript('./src/js/gameView.js', window);
    const GameModel = window.GameModel;
    const GameController = window.GameController;
    const GameView = window.GameView;

    // Run 1000 random games, ensuring no crashes and that the game ends when someone wins.
    const numGames = 1000;
    const maxTurnsPerGame = 1000; // prevent infinite loops

    for (let i = 0; i < numGames; i++) {
        const model = new GameModel();
        const view = new GameView();
        const controller = new GameController(model, view);
        // Initialize view (we'll skip asset loading for speed)
        view.isAssetsLoaded = true;
        view.isAssetsHandled = true;
        if (view.loadingOverlay) {
            view.loadingOverlay.style.display = 'none';
        }
        view.enableRollButton();

        let turnCount = 0;
        let gameOver = false;
        while (!gameOver && turnCount < maxTurnsPerGame) {
            // Roll the dice
            controller.rollDice();
            turnCount++;
            gameOver = model.isGameOver();
            // Optional: we could also check that no player position is <0 or >100 (except 0 for off-board)
            for (let p = 0; p < model.NUM_PLAYERS; p++) {
                const pos = model.getPlayerPosition(p);
                assert(pos >= 0 && pos <= 100, `Player ${p} position ${pos} out of bounds`);
            }
        }
        assert(gameOver, `Game ${i} did not end within ${maxTurnsPerGame} turns`);
        assert(model.getWinner() !== null, `Game ${i} has no winner`);
        assert(model.getWinner() >= 0 && model.getWinner() < model.NUM_PLAYERS, `Game ${i} winner invalid`);
        // Optionally, we can assert that the winner's position is 100
        assert(model.getPlayerPosition(model.getWinner()) === 100, `Game ${i} winner not at tile 100`);
    }

    console.log(`✓ Stress tests passed (${numGames} games)`);
}

// Helper assertion function
function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

// Run all tests
try {
    testModel();
    testController();
    testView();
    testIntegration();
    testBlackBoxUI();
    testStress();
    console.log('\n🎉 All tests passed!');
    process.exit(0);
} catch (e) {
    console.error('\n❌ Test failed:', e.message);
    console.error(e.stack);
    process.exit(1);
}