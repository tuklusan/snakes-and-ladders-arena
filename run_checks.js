const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require("fs");

// Load the diag_accept.html file
const html = fs.readFileSync("diag_accept.html", "utf8");

async function runChecks() {
  const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable" });
  await new Promise((resolve) => {
    dom.window.addEventListener("load", () => {
      // Wait for the test to run (the test runs on iframe load with a timeout)
      // We'll wait a bit longer than the timeout in the script (3500ms)
      setTimeout(() => {
        const output = dom.window.document.getElementById("out").textContent;
        console.log(output);
        resolve();
      }, 5000);
    });
  });
}

runChecks().catch(console.error);