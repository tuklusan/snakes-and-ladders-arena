const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require("fs");

// Load the diag_accept.html file
const html = fs.readFileSync("diag_accept.html", "utf8");

async function runChecks() {
  const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable" });
  await new Promise((resolve, reject) => {
    const iframe = dom.window.document.getElementById("f");
    if (!iframe) {
      reject(new Error("iframe not found"));
      return;
    }
    iframe.addEventListener("load", () => {
      // Wait for the test to run (the test runs after 3500ms in the iframe)
      setTimeout(() => {
        try {
          const output = dom.window.document.getElementById("out").textContent;
          console.log(output);
          resolve();
        } catch (e) {
          reject(e);
        }
      }, 4000); // Wait a bit longer than 3500ms
    });
    // Also set a timeout in case the iframe never loads
    setTimeout(() => {
      reject(new Error("iframe load timeout"));
    }, 10000);
  });
}

runChecks().catch(console.error);