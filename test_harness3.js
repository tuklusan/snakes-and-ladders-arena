const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const url = "http://localhost:8080/diag_accept.html";

(async () => {
  const dom = await JSDOM.fromURL(url, {
    runScripts: "dangerously",
    resources: "usable",
  });

  dom.window.addEventListener("load", () => {
    const iframe = dom.window.document.getElementById("f");
    if (!iframe) {
      console.error("Iframe not found");
      dom.window.close();
      return;
    }

    // Wait for the iframe to load
    iframe.addEventListener("load", () => {
      // After iframe loads, wait for the test to run (3500ms as set in the parent script)
      setTimeout(() => {
        try {
          const output = iframe.contentDocument.getElementById("out").textContent;
          console.log("Test output:");
          console.log(output);
        } catch (e) {
          console.error("Error reading output:", e);
        }
        dom.window.close();
      }, 3500);
    });

    // If the iframe already loaded (unlikely), we can check its readyState
    if (iframe.contentDocument && iframe.contentDocument.readyState === "complete") {
      setTimeout(() => {
        try {
          const output = iframe.contentDocument.getElementById("out").textContent;
          console.log("Test output:");
          console.log(output);
        } catch (e) {
          console.error("Error reading output:", e);
        }
        dom.window.close();
      }, 3500);
    }
  });

  dom.window.addEventListener("error", (e) => {
    console.error("Error:", e);
    dom.window.close();
  });
})();