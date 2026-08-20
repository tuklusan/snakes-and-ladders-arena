// Main entry point for the game
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Create model, view, and controller using the global constructors
        const model = new GameModel();
        const view = new GameView();
        const controller = new GameController(model, view);

        // Initialize the view with model and controller
        view.init(model, controller);

        // Expose for debugging (optional)
        window.gameModel = model;
        window.gameController = controller;
        window.gameView = view;
    } catch (e) {
        alert("Error initializing game: " + e);
        console.error(e);
        // Also show error in the container
        const container = document.getElementById('game-container');
        if (container) {
            container.innerHTML = `<div style="color:red; padding:20px;">Error: ${e}</div>`;
        }
    }
});