const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require("fs");
const path = require("path");

// Read the diag_accept.html file
const html = fs.readFileSync(path.join(__dirname, "diag_accept.html"), "utf8");

// Create a JSDOM instance
const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable",
});

// Wait for the load event and then run the test
dom.window.addEventListener("load", () => {
  // The script in diag_accept.html sets up an iframe and then runs the test after 3500ms.
  // We need to wait for the iframe to load and then for the test to run.
  // We'll wait a bit longer than 3500ms.
  setTimeout(() => {
    const iframe = dom.window.document.getElementById("f");
    if (iframe && iframe.contentDocument) {
      // The test script runs in the iframe's contentWindow after 3500ms.
      // Since we already waited, we can just read the output.
      const output = iframe.contentDocument.getElementById("out").textContent;
      console.log("Test output:");
      console.log(output);
    } else {
      console.error("Iframe not loaded");
    }
    dom.window.close();
  }, 5000);
});

// If there's an error, close the dom
dom.window.addEventListener("error", (e) => {
  console.error("Error:", e);
  dom.window.close();
});