const { JSDOM } = require('jsdom');
const { spawn } = require('child_process');
const fetch = require('node-fetch');

// Start the server
const server = spawn('python3', ['-m', 'http.server', '8000'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe']
});

// Wait for the server to be ready
const waitForServer = () => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Server did not start in time'));
    }, 5000);
    const check = async () => {
      try {
        const response = await fetch('http://localhost:8000/');
        if (response.ok) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(check, 100);
        }
      } catch (e) {
        setTimeout(check, 100);
      }
    };
    check();
  });
};

// Function to load the page and check for GameModel
const loadPageAndCheck = () => {
  return new Promise((resolve, reject) => {
    JSDOM.fromURL('http://localhost:8000/', {
      runScripts: "dangerously",
      resources: "usable"
    }).then((dom) => {
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

      // Wait for DOMContentLoaded
      window.addEventListener('DOMContentLoaded', () => {
        console.log('DOMContentLoaded fired');
        // Check if GameModel is defined on window
        console.log('typeof window.GameModel:', typeof window.GameModel);
        if (typeof window.GameModel === 'function') {
          console.log('SUCCESS: GameModel is defined as a function');
          // Try to create an instance
          try {
            const model = new window.GameModel();
            console.log('GameModel instance created:', model);
            // Kill the server
            server.kill();
            resolve();
          } catch (e) {
            console.error('Error creating GameModel instance:', e);
            server.kill();
            reject(e);
          }
        } else {
          console.error('GameModel is not defined or not a function');
          // Kill the server
          server.kill();
          reject(new Error('GameModel not defined'));
        }
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        console.error('DOMContentLoaded timeout');
        server.kill();
        reject(new Error('Timeout'));
      }, 5000);
    }).catch((err) => {
      console.error('Error loading JSDOM:', err);
      server.kill();
      reject(err);
    });
  });
};

// Run the test
waitForServer()
  .then(() => {
    console.log('Server is ready, loading page...');
    return loadPageAndCheck();
  })
  .then(() => {
    console.log('Test passed!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
