const http = require('http');
const { JSDOM } = require('jsdom');

// We'll use the built-in http module to make requests.
const fetch = (path) => {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(path, 'http://localhost:8000/');
      http.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve(data);
        });
      }).on('error', (err) => {
        reject(err);
      });
    } catch (e) {
      reject(e);
    }
  });
};

(async () => {
  try {
    // Fetch the HTML
    const html = await fetch('/');
    console.log('HTML fetched, length:', html.length);

    // Create a JSDOM from the HTML
    const dom = new JSDOM(html, {
      runScripts: "dangerously",
      resources: "usable"
    });

    const window = dom.window;
    const document = window.document;

    // Mock the alert function
    window.alert = (msg) => {
      console.log('Alert: ' + msg);
    };

    // Mock the Audio constructor
    window.Audio = class {
      constructor(src) {
        this.src = src;
        this.currentTime = 0;
      }
      play() {
        return Promise.resolve();
      }
      pause() {
        return Promise.resolve();
      }
    };

    // Now, we need to load the scripts that are in the HTML.
    // Find all script tags with a src attribute.
    const scriptTags = document.querySelectorAll('script[src]');
    console.log('Found', scriptTags.length, 'script tags with src');

    for (const tag of scriptTags) {
      const src = tag.getAttribute('src');
      console.log('Loading script:', src);
      try {
        const scriptCode = await fetch(src);
        // We need to evaluate the script in the context of the window.
        // We can use vm to run in the window context.
        const vm = require('vm');
        const context = vm.createContext(window);
        vm.runInContext(scriptCode, context, { filename: src, lineOffset: 0, displayErrors: true });
        console.log('  -> Loaded and evaluated');
      } catch (e) {
        console.error('  -> Error loading script:', e);
      }
    }

    // Also, there might be inline scripts (without src). We'll evaluate them too.
    const inlineScripts = document.querySelectorAll('script:not([src])');
    console.log('Found', inlineScripts.length, 'inline script tags');
    for (const tag of inlineScripts) {
      const scriptCode = tag.textContent;
      if (scriptCode.trim() !== '') {
        try {
          const vm = require('vm');
          const context = vm.createContext(window);
          vm.runInContext(scriptCode, context, { filename: 'inline', lineOffset: 0, displayErrors: true });
          console.log('  -> Loaded and evaluated inline script');
        } catch (e) {
          console.error('  -> Error loading inline script:', e);
        }
      }
    }

    // Now wait for a bit to let any async loading happen (like image loading, but we don't care)
    // Then check if GameModel is defined.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log('typeof window.GameModel:', typeof window.GameModel);
    if (typeof window.GameModel === 'function') {
      console.log('SUCCESS: GameModel is defined as a function');
      // Try to create an instance
      try {
        const model = new window.GameModel();
        console.log('GameModel instance created:', model);
      } catch (e) {
        console.error('Error creating GameModel instance:', e);
      }
    } else {
      console.error('FAILURE: GameModel is not defined or not a function');
    }

    // Also check if the container has been populated by the view.
    // The view's createDOM should have been called from the view's init, which is called from main.js.
    // We don't know if main.js has been run, but we hope that the DOMContentLoaded listener in main.js has run.
    // However, we have not waited for DOMContentLoaded event. We just fetched the HTML and evaluated the scripts.
    // The scripts we evaluated include the main.js, which has a DOMContentLoaded listener.
    // But we have not triggered the DOMContentLoaded event because we are not in a browser environment that fires it automatically.
    // In JSDOM, when we set the HTML, it does fire DOMContentLoaded? Let's check the JSDOM documentation.
    // Actually, when we create a JSDOM with an HTML string, it does not automatically fire DOMContentLoaded? I think it does when the document is parsed.
    // But we are not sure.

    // Let's try to fire the DOMContentLoaded event manually? Or we can just call the view's init ourselves? 
    // But we don't have a reference to the view because it was created in the main.js script and attached to window? 
    // In main.js, we do: window.gameModel = model; window.gameController = controller; window.gameView = view;
    // So we can check if window.gameView exists.

    console.log('Checking if window.gameView exists:', typeof window.gameView);
    if (typeof window.gameView === 'function') {
      console.log('window.gameView is a function (the class)');
      // We can try to create an instance and init it? But we don't have the model and controller.
      // However, we have the model and controller attached to window as well? 
      // In main.js, we attached the model, controller, and view to window as window.gameModel, etc.
      // But we also have the actual GameModel, GameController, GameView classes attached to window as well? 
      // In our scripts, we attached the classes to window at the end of each file: window.GameModel = GameModel, etc.
      // So we have both the classes and the instances.

      // Let's check if we have the instances.
      console.log('window.gameModel:', typeof window.gameModel);
      console.log('window.gameController:', typeof window.gameController);
      console.log('window.gameView:', typeof window.gameView);
    } else {
      console.log('window.gameView is not defined as a function');
    }

    // Let's also check the container's children.
    const container = document.getElementById('game-container');
    if (container) {
      console.log('Container children count:', container.children.length);
      if (container.children.length > 0) {
        console.log('Container has children, so the view has likely been initialized and appended elements.');
      } else {
        console.log('Container has no children yet.');
      }
    } else {
      console.log('Container not found');
    }

  } catch (e) {
    console.error('Error:', e);
  } finally {
    // Kill the server
    const { spawn } = require('child_process');
    spawn('pkill', ['-f', 'python3 -m http.server 8000']);
    process.exit(0);
  }
})();
