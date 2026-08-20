const { JSDOM } = require('jsdom');
const { spawn } = require('child_process');
const fetch = require('node-fetch');

// Server already running on port 8000
console.log('Server is running on port 8000');

// We'll set mocks after JSDOM loads
const windowAlerts = [];
const windowConfirms = [];
const windowPrompts = [];

setTimeout(async () => {
  try {
    console.log('Loading page with JSDOM...');
    const dom = await JSDOM.fromURL('http://localhost:8000/', {
      runScripts: "dangerously",
      resources: "usable",
      // Provide necessary globals
      pretendToBeVisual: true,
      runInNewContext: false
    });
    const window = dom.window;
    const document = window.document;

    // Now set mocks on the jsdom window
    window.alert = (msg) => { windowAlerts.push(msg); console.log('[ALERT MOCKED]', msg); };
    window.confirm = (msg) => { windowConfirms.push(msg); console.log('[CONFIRM MOCKED]', msg); return true; };
    window.prompt = (msg) => { windowPrompts.push(msg); console.log('[PROMPT MOCKED]', msg); return ''; };

    // Mock Audio on window
    window.Audio = class {
      constructor(src) { this.src = src; this.currentTime = 0; }
      play() { return Promise.resolve(); }
      pause() { return Promise.resolve(); }
    };

    // Provide requestAnimationFrame if missing
    if (typeof window.requestAnimationFrame !== 'function') {
      window.requestAnimationFrame = (cb) => setTimeout(cb, 1000 / 60);
      window.cancelAnimationFrame = clearTimeout;
    }

    console.log('DOM loaded, initializing game...');

    // Check if GameModel is defined
    if (typeof window.GameModel === 'function') {
      console.log('GameModel is defined');
      const model = new window.GameModel();
      console.log('GameModel created');

      if (typeof window.GameView === 'function') {
        console.log('GameView is defined');
        const view = new window.GameView();
        
        if (typeof window.GameController === 'function') {
          console.log('GameController is defined');
          const controller = new window.GameController(model, view);
          view.init(model, controller);

          // Game tracking variables
          let rollCount = 0;
          const maxRolls = 300;
          const gameLog = [];
          let gameOver = false;
          let winner = null;

          // Hook into onStateChange to track progress
          const prevOnStateChange = view.onStateChange;
          view.onStateChange = () => {
            const activePlayer = model.getActivePlayer();
            const positions = [];
            for (let i = 0; i < model.NUM_PLAYERS; i++) {
              positions.push(model.getPlayerPosition(i));
            }
            const lastRoll = model.getLastRoll();
            const isGameOver = model.isGameOver();
            winner = model.getWinner();

            const logEntry = {
              roll: rollCount,
              turn: activePlayer,
              positions: [...positions],
              lastRoll: lastRoll,
              gameOver: isGameOver,
              winner: winner
            };
            gameLog.push(logEntry);

            console.log(`[Roll ${rollCount}] Player ${activePlayer+1} turn, positions: ${positions.join(',')}, roll: ${lastRoll}`);

            if (isGameOver && winner !== undefined) {
              gameOver = true;
              console.log(`*** GAME OVER! Player ${winner+1} wins! ***`);
              // Stop auto-rolling
              view.clearTimeouts();
            }
          };

          // Hook up extra roll
          view.onExtraRoll = () => {
            console.log('[Extra roll awarded]');
          };

          // Hook up win
          view.onGameWin = (playerId) => {
            console.log(`[View] Player ${playerId+1} wins!`);
          };

          // Start auto-rolling with setInterval
          const rollInterval = setInterval(() => {
            if (gameOver || rollCount >= maxRolls) {
              clearInterval(rollInterval);
              console.log('Max rolls reached or game over, stopping...');
              console.log('\n=== FINAL GAME LOG ===');
              gameLog.forEach(entry => {
                console.log(`Roll ${entry.roll}: Player ${entry.turn+1} positions: ${entry.positions.join(',')} roll=${entry.lastRoll}, gameOver=${entry.gameOver}, winner=${entry.winner}`);
              });
              console.log('=== END FINAL GAME LOG ===');
              console.log('\n=== DR-104 VERIFICATION ===');
              const hasWinner = gameLog.some(e => e.winner !== undefined);
              const reached100 = gameLog.some(e => e.positions.some(p => p === 100));
              const noBlockingDialogs = windowAlerts.length === 0 && windowConfirms.length === 0 && windowPrompts.length === 0;
              
              console.log(`Winner observed: ${hasWinner}`);
              console.log(`Reached tile 100: ${reached100}`);
              console.log(`No blocking dialogs (alert/confirm/prompt): ${noBlockingDialogs}`);
              console.log(`Alert calls: ${windowAlerts.length}`);
              console.log(`Confirm calls: ${windowConfirms.length}`);
              console.log(`Prompt calls: ${windowPrompts.length}`);

              if (hasWinner && reached100 && noBlockingDialogs) {
                console.log('PASS: DR-104 acceptance criteria met');
              } else {
                console.log('FAIL: DR-104 acceptance criteria NOT met');
                console.log('Full log:');
                gameLog.slice(-10).forEach(entry => {
                  console.log(`Roll ${entry.roll}: Player ${entry.turn+1} positions: ${entry.positions.join(',')} roll=${entry.lastRoll}`);
                });
              }
              process.exit(0);
              return;
            }

            // Roll dice
            controller.rollDice();
            rollCount++;
            console.log(`[Roll ${rollCount}] Initiating...`);
          }, 600);

          // Stop after 75 seconds
          setTimeout(() => {
            if (!gameOver) {
              console.log('Timeout: stopping after 75 seconds');
              clearInterval(rollInterval);
              console.log('\n=== FINAL GAME LOG ===');
              gameLog.forEach(entry => {
                console.log(`Roll ${entry.roll}: Player ${entry.turn+1} positions: ${entry.positions.join(',')} roll=${entry.lastRoll}`);
              });
              console.log('=== END FINAL GAME LOG ===');
              process.exit(1);
            }
          }, 75000);

        } else {
          console.error('GameController not defined');
        }
      } else {
        console.error('GameView not defined');
      }
    } else {
      console.error('GameModel not defined');
    }
  } catch (err) {
    console.error('Error:', err);
    console.error(err.stack);
  }
}, 500);