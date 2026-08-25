const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const url = "http://localhost:8080/index.html";

(async () => {
  const dom = await JSDOM.fromURL(url, {
    runScripts: "dangerously",
    resources: "usable",
  });

  dom.window.addEventListener("load", () => {
    console.log("Window loaded");
    // Wait a bit for the game to initialize
    setTimeout(() => {
      const document = dom.window.document;
      console.log("Checking board element");
      const board = document.getElementById("game-board");
      if (board) {
        console.log("Board element found:", board);
        const cells = document.querySelectorAll("[data-tile]");
        console.log("Number of cells:", cells.length);
        const tokens = document.querySelectorAll(".game-token");
        console.log("Number of tokens:", tokens.length);
        if (tokens.length > 0) {
          const firstToken = tokens[0];
          const rect = firstToken.getBoundingClientRect();
          console.log("First token rect:", rect);
          console.log("First token width:", rect.width);
        }
      } else {
        console.log("Board element NOT found");
        // Log the body to see what's there
        console.log("Body innerHTML:", document.body.innerHTML);
      }
      dom.window.close();
    }, 1000);
  });

  dom.window.addEventListener("error", (e) => {
    console.error("Error:", e);
    dom.window.close();
  });
})();