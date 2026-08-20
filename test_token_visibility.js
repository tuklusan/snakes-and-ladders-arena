const jsdom = require("jsdom");
const { JSDOM } = jsdom;

// Fetch the local file
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf8");

// Create a JSDOM instance
const dom = new JSDOM(html, {
  runScripts: "dangerously", // allow scripts to run
  resources: "usable",
  // Pretend to be a browser
  url: "http://localhost:8000"
});

// Wait for scripts to load and then check
setTimeout(() => {
  const document = dom.window.document;

  // Helper to get computed style
  const getStyle = (el, prop) => {
    return dom.window.getComputedStyle(el).getPropertyValue(prop);
  };

  // Find token elements
  const tokens = document.querySelectorAll(".game-token");
  console.log(`Found ${tokens.length} token elements`);

  tokens.forEach((token, idx) => {
    const bg = getStyle(token, "background-image");
    const left = getStyle(token, "left");
    const top = getStyle(token, "top");
    const transform = getStyle(token, "transform");
    console.log(`Token ${idx}: background-image=${bg}, left=${left}, top=${top}, transform=${transform}`);
    if (bg && bg !== "none" && bg !== "") {
      console.log(`  => Token ${idx} has a background image (likely visible)`);
    } else {
      console.log(`  => Token ${idx} NO BACKGROUND IMAGE`);
    }
  });

  // Also check if the board has background image
  const board = document.querySelector("#game-board");
  if (board) {
    const boardBg = getStyle(board, "background-image");
    console.log(`Board background-image: ${boardBg}`);
  }

  // Try to trigger a dice roll via the controller if exposed
  if (dom.window.gameController) {
    console.log("Controller exposed, triggering a roll...");
    dom.window.gameController.rollDice();
    // Wait a bit then re-check
    setTimeout(() => {
      tokens.forEach((token, idx) => {
        const bg = getStyle(token, "background-image");
        console.log(`After roll - Token ${idx}: background-image=${bg}`);
      });
    }, 500);
  } else {
    console.log("Controller not exposed on window");
  }

  // Clean up
  dom.window.close();
}, 1000);
