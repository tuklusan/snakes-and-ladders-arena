const jsdom = require("jsdom");
const { JSDOM } = jsdom;

async function runTest() {
  // Load the diag_accept.html file
  const dom = await JSDOM.fromFile("./diag_accept.html", {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
  });

  // Get the window and document
  const window = dom.window;
  const document = window.document;

  // Wait for the iframe to load
  return new Promise((resolve) => {
    const iframe = document.getElementById("f");
    if (iframe) {
      iframe.addEventListener("load", () => {
        // After iframe loads, set a timeout to run the test (as in the original)
        setTimeout(() => {
          try {
            // The run function is defined in the iframe's contentWindow? Actually, the run function is in the parent's script.
            // In diag_accept.html, the run function is defined in the parent script.
            // So we can call window.run()? No, the run function is not attached to window.
            // The run function is defined inside a script tag in the parent.
            // We need to evaluate the script again? Actually, the script has already been executed.
            // The run function is in the parent's scope.
            // We can try to call it by accessing the parent's window? We are already in the parent's window.
            // The run function is defined in the global scope of the parent.
            // So we can call run() directly.
            // However, the run function uses fr.contentDocument, which is now available.
            window.run();
            // After run, the output is in document.getElementById("out").textContent
            const output = document.getElementById("out").textContent;
            resolve(output);
          } catch (e) {
            resolve("ERROR: " + e.message);
          }
        }, 3500);
      });
    } else {
      resolve("ERROR: iframe not found");
    }
  });
}

runTest().then((output) => {
  console.log(output);
});