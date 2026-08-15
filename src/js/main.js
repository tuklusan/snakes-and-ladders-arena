// Main entry point for the game
document.addEventListener('DOMContentLoaded', () => {
    // Create model, view, and controller
    const model = new GameModel();
    const view = new GameView();
    const controller = new GameController(model, view);

    // Initialize the view with model and controller
    view.init(model, controller);

    // Expose for debugging (optional)
    window.gameModel = model;
    window.gameController = controller;
    window.gameView = view;
});