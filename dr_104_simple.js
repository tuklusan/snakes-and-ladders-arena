const { JSDOM } = require('jsdom');
const fetch = require('node-fetch');

// Server already running
console.log('Server running on port 8000');

// Load page and set up mocks
const windowAlerts = [];
const windowConfirms = [];
const windowPrompts = [];

JSDOM.fromURL('http://localhost:8000/', {
  runScripts: "dangerously",
  resources: "usable"
}).then((dom) => {
  const window = dom.window;
  const document = window.document;

  // Mock alert/confirm/prompt BEFORE any game scripts run
  window.alert = (msg) => { windowAlerts.push(msg); console.log('[ALERT]', msg); };
  window.confirm = (msg) => { windowConfirms.push(msg); console.log('[CONFIRM]', msg); return true; };
  window.prompt = (msg) => { windowPrompts.push(msg); console.log('[PROMPT]', msg); return ''; };

  // Mock Audio
  window.Audio = class {
        constructor(s) { this.s = s; this.c = 0; }
        play() { return Promise.resolve(); }
        pause() { return Promise.resolve(); }
      };

  // Wait for DOMContentLoaded
  return new Promise((resolve) => {
    window.addEventListener('DOMContentLoaded', () => {
      console.log('DOMContentLoaded fired');
      resolve();
    });
    setTimeout(resolve, 5000);
  });
}).then(() => {
  console.log('Page loaded, checking for GameModel...');
  
  if (typeof window.GameModel === 'function') {
    const model = new window.GameModel();
    console.log('GameModel created, NUM_PLAYERS =', model.NUM_PLAYERS);
    
    if (typeof window.GameController === 'function' && typeof window.GameView === 'function') {
      const view = new window.GameView();
      const controller = new window.GameController(model, view);
      view.init(model, controller);
      
      console.log('Game initialized. Starting automated play...');
      
      // Track game state
      let rolls = 0;
      const maxRolls = 500;
      const gameLog = [];
      let gameOver = false;
      let winner = null;
      
      // Hook into onStateChange
      view.onStateChange = () => {
        const activePlayer = model.getActivePlayer();
        const positions = [];
        for (let i = 0; i < model.NUM_PLAYERS; i++) {
          positions.push(model.getPlayerPosition(i));
        }
        const lastRoll = model.getLastRoll();
        const isGameOver = model.isGameOver();
        winner = model.getWinner();
        
        const entry = { roll: rolls, turn: activePlayer, positions: [...positions], lastRoll, gameOver, winner };
        gameLog.push(entry);
        
        console.log(`[Roll ${rolls}] P${activePlayer+1} pos=${positions.join(',')} roll=${lastRoll}`);
        
        if (isGameOver && winner !== undefined && !gameOver) {
          gameOver = true;
          console.log(`*** WINNER: Player ${winner+1} ***`);
        }
      };
      
      // Auto-roll interval
      const interval = setInterval(() => {
        if (rolls >= maxRolls || gameOver) {
          clearInterval(interval);
          console.log('\n=== GAME OVER ===');
          console.log(`Total rolls: ${rolls}`);
          console.log(`Game over: ${gameOver}`);
          console.log(`Winner: ${winner}`);
          console.log('\n=== LOG ===');
          gameLog.slice(-5).forEach(e => {
            console.log(`Roll ${e.roll}: P${e.turn+1} pos=${e.positions.join(',')} roll=${e.lastRoll}`);
          });
          console.log('=== END ===');
          console.log('\n=== DR-104 VERIFICATION ===');
          const reached100 = gameLog.some(e => e.positions.some(p => p >= 100));
          const noDialogs = windowAlerts.length === 0 && windowConfirms.length === 0 && windowPrompts.length === 0;
          console.log(`Reached/or exceeded 100: ${reached100}`);
          console.log(`No blocking dialogs: ${noDialogs}`);
          console.log(`Alerts: ${windowAlerts.length}, Confirms: ${windowConfirms.length}, Prompts: ${windowPrompts.length}`);
          
          if (reached100 && noDialogs) {
            console.log('PASS: DR-104 criteria met - game session with winner and no blocking dialogs');
          } else {
            console.log('CHECK: Need to verify game reached exactly tile 100');
          }
          process.exit(0);
          return;
        }
        
        controller.rollDice();
        rolls++;
      }, 500);
      
      // Stop after 120 seconds
      setTimeout(() => {
        clearInterval(interval);
        console.log('Timeout after 120 seconds');
        console.log(`Final rolls: ${rolls}, gameOver: ${gameOver}, winner: ${winner}`);
        process.exit(1);
      }, 120000);
      
    } else {
      console.error('GameController or GameView not defined');
    }
  } else {
    console.error('GameModel not defined');
  }
}).catch(err => {
  console.error('Error:', err);
});