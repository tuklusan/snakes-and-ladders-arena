// Game Controller - Implements game logic and rules
console.log("gameController.js loaded");
class GameController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.bindEvents();
        this.turnStartPlayerPositions = []; // to snapshot player positions at start of turn for triple six penalty
    }

    bindEvents() {
        // Listen for roll dice request from the view
        // In a more decoupled architecture, we would use events.
        // For now, we assume the view has a method to set the controller's rollDice method as a handler.
        // We'll set it up in the view's init.
    }

    // This method is called by the view when the user requests to roll the dice
    rollDice() {
        if (this.model.isGameOver()) {
            // Optionally, allow resetting the game
            return;
        }
        // Generate a random dice roll (1-6)
        const dieRoll = Math.floor(Math.random() * 6) + 1;
        console.log(`Dice roll: ${dieRoll}`);
        // Store the last roll for the view to display
        this.model.setLastRoll(dieRoll);
        this.processTurn(dieRoll);
    }

    processTurn(dieRoll) {
        const activePlayer = this.model.getActivePlayer();
        let consecutive_sixes = this.model.getConsecutiveSixes();
        let turn_start_position = this.model.getTurnStartPosition();

        // Snapshot turn start position if this is the first roll of the turn
        if (consecutive_sixes === 0) {
            turn_start_position = this.model.getPlayerPosition(activePlayer);
            this.model.setTurnStartPosition(turn_start_position);
            // Snapshot all player positions for potential rollback on triple six
            this.turnStartPlayerPositions = [];
            for (let i = 0; i < this.model.NUM_PLAYERS; i++) {
                this.turnStartPlayerPositions.push(this.model.getPlayerPosition(i));
            }
        }

        // Update consecutive sixes
        if (dieRoll === 6) {
            consecutive_sixes += 1;
            this.model.setConsecutiveSixes(consecutive_sixes);
        } else {
            consecutive_sixes = 0;
            this.model.setConsecutiveSixes(0);
        }

        // Check for triple six penalty
        if (consecutive_sixes === 3) {
            // Rollback all movement executed during this multi-roll turn
            this.model.setPlayerPosition(activePlayer, turn_start_position);
            // Also rollback all player positions to the start of the turn
            for (let i = 0; i < this.model.NUM_PLAYERS; i++) {
                this.model.setPlayerPosition(i, this.turnStartPlayerPositions[i]);
            }
            this.model.setConsecutiveSixes(0);
            // Advance turn
            this.advanceTurn();
            // Notify view of the penalty (we'll let the view handle audio/visuals)
            this.view.onTripleSixPenalty();
            this.view.onStateChange();
            return; // Turn ends
        }

        // Base movement calculation
        let current_pos = this.model.getPlayerPosition(activePlayer);
        let target_pos = current_pos;
        let moved = false;

        if (current_pos === 0) {
            // Off-board pawns require a 1 or a 6 to enter Tile 1
            if (dieRoll === 1 || dieRoll === 6) {
                target_pos = 1;
                moved = true;
            }
        } else {
            // Exact landing rule: overshooting tile 100 voids movement
            if (current_pos + dieRoll <= 100) {
                target_pos = current_pos + dieRoll;
                moved = true;
            }
        }

        // Entity Traversal (Ladders & Snakes) and Capture only apply if we moved
        if (moved) {
            // Entity Traversal (Ladders & Snakes)
            if (this.model.Ladders.has(target_pos)) {
                target_pos = this.model.Ladders.get(target_pos);
            } else if (this.model.Snakes.has(target_pos)) {
                target_pos = this.model.Snakes.get(target_pos);
            }

            // Opponent Capture Mechanics (Katti)
            if (!this.model.SafeZones.has(target_pos)) {
                for (let opponent = 0; opponent < this.model.NUM_PLAYERS; opponent++) {
                    if (opponent !== activePlayer && this.model.getPlayerPosition(opponent) === target_pos) {
                        this.model.setPlayerPosition(opponent, 0); // Opponent sent back to off-board
                        // Notify view of capture
                        this.view.onCapture(opponent, target_pos);
                    }
                }
            }
        }

        // Position Commitment
        this.model.setPlayerPosition(activePlayer, target_pos);

        // Terminal State Evaluation
        if (this.model.getPlayerPosition(activePlayer) === 100) {
            this.model.setGameOver(true);
            this.model.setWinner(activePlayer);
            this.view.onGameWin(activePlayer);
            this.view.onStateChange();
            return;
        }

        // Turn Arbitrator
        if (dieRoll === 6) {
            // Bonus roll awarded (consecutive_sixes < 3 guaranteed here)
            // The same player gets to roll again
            this.view.onExtraRoll();
        } else {
            this.advanceTurn();
        }

        // Notify view that the state has changed (for rendering)
        this.view.onStateChange();
    }

    advanceTurn() {
        const numPlayers = this.model.NUM_PLAYERS;
        let active = this.model.getActivePlayer();
        active = (active + 1) % numPlayers;
        this.model.setActivePlayer(active);
        this.model.setConsecutiveSixes(0); // Reset consecutive sixes on turn change
        this.view.onTurnChange(active);
    }

    // Reset the game (for replay)
    resetGame() {
        this.model.resetGame();
        this.view.onReset();
    }

}

// Attach to window for browser compatibility
if (typeof window !== 'undefined') {
    window.GameController = GameController;
}