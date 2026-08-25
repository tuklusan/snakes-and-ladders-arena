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
        const container = document.getElementById("game-container");
        console.log("Container:", container);
        if (container) {
          const containerRect = container.getBoundingClientRect();
          console.log("Container rect:", containerRect);
          console.log("Container width:", containerRect.width);
          console.log("Container height:", containerRect.height);
        }
        const cells = document.querySelectorAll("[data-tile]");
        console.log("Number of cells:", cells.length);
        const tokens = document.querySelectorAll(".game-token");
        console.log("Number of tokens:", tokens.length);
        if (tokens.length > 0) {
          const firstToken = tokens[0];
          console.log("First token:", firstToken);
          console.log("First token style width:", firstToken.style.width);
          console.log("First token style height:", firstToken.style.height);
          console.log("First token style left:", firstToken.style.left);
          console.log("First token style top:", firstToken.style.top);
          console.log("First token style transform:", firstToken.style.transform);
          const computedStyle = dom.window.getComputedStyle(firstToken);
          console.log("Computed width:", computedStyle.width);
          console.log("Computed height:", computedStyle.height);
          console.log("Computed left:", computedStyle.left);
          console.log("Computed top:", computedStyle.top);
          const rect = firstToken.getBoundingClientRect();
          console.log("First token rect:", rect);
          console.log("First token width:", rect.width);
          console.log("First token height:", rect.height);
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