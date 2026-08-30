// Main entry point for the game
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Create model, view, and controller using the global constructors
        const model = new GameModel();
        const view = new GameView();
        const controller = new GameController(model, view);

        // Initialize the view with model and controller
        view.init(model, controller);

        // Reset the game to set initial state
        controller.resetGame();

        // Expose for debugging (optional) - guarded by DEBUG flag - DEF-0002 fix
        const DEBUG = false; // Set to true for development
        if (DEBUG) {
            window.gameModel = model;
            window.gameController = controller;
            window.gameView = view;
        }
    } catch (e) {
        // Show error in the container instead of a blocking alert
        const container = document.getElementById('game-container');
        if (container) {
            // Use textContent to prevent XSS - DEF-0001 fix
            container.innerHTML = '';
            const errorDiv = document.createElement('div');
            errorDiv.style.color = 'red';
            errorDiv.style.padding = '20px';
            errorDiv.textContent = `Error: ${e}`;
            const stackDiv = document.createElement('div');
            stackDiv.style.color = 'red';
            stackDiv.style.padding = '20px';
            stackDiv.textContent = `Stack: ${e.stack}`;
            container.appendChild(errorDiv);
            container.appendChild(stackDiv);
        }
        console.error(e);
    }
});