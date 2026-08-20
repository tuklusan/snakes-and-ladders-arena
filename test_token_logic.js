// Mock Image and Audio for jsdom
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

global.HTMLImageElement = class {
    constructor() {
        this.src = '';
        this.onload = null;
        this.onerror = null;
    }
};
global.HTMLAudioElement = class {
    constructor() {
        this.src = '';
        this.currentTime = 0;
    }
    play() { return Promise.resolve(); }
    pause() {}
};

// Load the actual gameView.js source code (we need to execute it in the jsdom window)
const fs = require("fs");
const path = require("path");

const viewCode = fs.readFileSync(path.resolve(__dirname, "src/js/gameView.js"), "utf8");
const modelCode = fs.readFileSync(path.resolve(__dirname, "src/js/gameModel.js"), "utf8");
const controllerCode = fs.readFileSync(path.resolve(__dirname, "src/js/gameController.js"), "utf8");

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Test</title>
  <link rel="stylesheet" href="src/css/styles.css">
</head>
<body>
  <div id="game-container"></div>
  <script src="src/js/gameModel.js"></script>
  <script src="src/js/gameController.js"></script>
  <script src="src/js/gameView.js"></script>
  <script>
    // Initialize the game
    const model = new GameModel();
    const view = new GameView();
    const controller = new GameController(model, view);
    view.init(model, controller);
    // Trigger a roll to see if tokens move
    setTimeout(() => {
      controller.rollDice();
    }, 100);
  </script>
</body>
</html>`;

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable",
  url: "http://localhost"
});

// Wait for scripts to load and then check
setTimeout(() => {
  const document = dom.window.document;
  const tokens = document.querySelectorAll(".game-token");
  console.log(`Found ${tokens.length} token elements`);
  tokens.forEach((token, idx) => {
    const bg = dom.window.getComputedStyle(token).getPropertyValue("background-image");
    const left = dom.window.getComputedStyle(token).getPropertyValue("left");
    const top = dom.window.getComputedStyle(token).getPropertyValue("top");
    const transform = dom.window.getComputedStyle(token).getPropertyValue("transform");
    console.log(`Token ${idx}: background-image=${bg}, left=${left}, top=${top}, transform=${transform}`);
    if (bg && bg !== "none" && bg !== "") {
      console.log(`  => Token ${idx} has a background image`);
    } else {
      console.log(`  => Token ${idx} NO BACKGROUND IMAGE`);
    }
  });
  // Also check if the board has background image
  const board = document.querySelector("#game-board");
  if (board) {
    const boardBg = dom.window.getComputedStyle(board).getPropertyValue("background-image");
    console.log(`Board background-image: ${boardBg}`);
  }
  dom.window.close();
}, 1000);
