// Main entry point for the game
(function() {
    'use strict';

    // Factory function for dependency injection - improves modularity and testability
    function createGameDependencies() {
        return {
            model: new GameModel(),
            view: new GameView(),
            controller: null // will be set after view creation
        };
    }

    function initGame() {
        const deps = createGameDependencies();
        deps.controller = new GameController(deps.model, deps.view);
        
        // Initialize the view with model and controller
        deps.view.init(deps.model, deps.controller);

        // Reset the game to set initial state
        deps.controller.resetGame();

        // Expose for debugging (optional) - guarded by DEBUG flag
        const DEBUG = false; // Set to true for development
        if (DEBUG) {
            window.gameModel = deps.model;
            window.gameController = deps.controller;
            window.gameView = deps.view;
        }
    }

    function handleError(e) {
        const container = document.getElementById('game-container');
        if (container) {
            container.innerHTML = '';
            const errorDiv = document.createElement('div');
            errorDiv.style.color = 'red';
            errorDiv.style.padding = '20px';
            // DEF-0001 fix: use textContent to prevent DOM XSS
            errorDiv.textContent = `Error: ${e.message || e}`;
            container.appendChild(errorDiv);
            
            // Only show stack if available - don't assume it exists
            if (e.stack) {
                const stackDiv = document.createElement('div');
                stackDiv.style.color = 'red';
                stackDiv.style.padding = '20px';
                // DEF-0001 fix: use textContent to prevent DOM XSS
                stackDiv.textContent = `Stack: ${e.stack}`;
                container.appendChild(stackDiv);
            }
        }
        console.error(e);
    }

    // Check if document is already loaded (for cases where script loads after DOMContentLoaded)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGame);
    } else {
        // DOMContentLoaded already fired
        initGame();
    }

    // Global error handler for uncaught errors
    window.addEventListener('error', function(event) {
        handleError(event.error);
    });

    window.addEventListener('unhandledrejection', function(event) {
        handleError(event.reason);
    });
})();