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

        // Expose for debugging (optional)
        window.gameModel = model;
        window.gameController = controller;
        window.gameView = view;
    } catch (e) {
        // Show error in the container instead of a blocking alert
        const container = document.getElementById('game-container');
        if (container) {
            container.innerHTML = `<div style="color:red; padding:20px;">Error: ${e}</div><div style="color:red; padding:20px;">Stack: ${e.stack}</div>`;
        }
        console.error(e);
    }
});