const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const url = "http://localhost:8080/diag_accept.html";

(async () => {
  const dom = await JSDOM.fromURL(url, {
    runScripts: "dangerously",
    resources: "usable",
  });

  // Wait for the load event and then for the test to run (the test runs after 3500ms in the iframe)
  dom.window.addEventListener("load", () => {
    // Wait a bit longer than 3500ms for the iframe to load and test to run
    setTimeout(() => {
      const iframe = dom.window.document.getElementById("f");
      if (iframe && iframe.contentDocument) {
        const output = iframe.contentDocument.getElementById("out").textContent;
        console.log("Test output:");
        console.log(output);
      } else {
        console.error("Iframe not loaded");
      }
      dom.window.close();
    }, 5000);
  });

  dom.window.addEventListener("error", (e) => {
    console.error("Error:", e);
    dom.window.close();
  });
})();