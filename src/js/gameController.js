// Game Controller - Implements game logic and rules
console.log("gameController.js loaded");
class GameController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.turnStartPlayerPositions = []; // to snapshot player positions at start of turn for triple six penalty
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
        this.model.setLastMover(activePlayer);
        let consecutive_sixes = this.model.getConsecutiveSixes();
        let turn_start_position = this.model.getTurnStartPosition();
        let current_pos = this.model.getPlayerPosition(activePlayer);

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
            // Create turn record for triple six penalty - DEF-0031 fix: clarify fields
            const record = {
                mover: activePlayer,
                roll: dieRoll,
                from: current_pos,
                landed: current_pos, // landed same as from (no movement executed)
                to: turn_start_position, // position after penalty (turn start)
                event: 'triple_six',
                captured: null
            };
            this.model.setLastTurnRecord(record);
            this.view.onStateChange();
            return; // Turn ends
        }

        // Base movement calculation
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

        // Store intermediate position (after die roll, before jumps) for the view
        const landedPos = target_pos; // position after die roll, before jumps
        this.model.setLastMoveIntermediatePosition(landedPos);

        // Entity Traversal (Ladders & Snakes) and Capture only apply if we moved
        let finalPos = target_pos;
        let capturedPlayerIds = []; // DEF-0033 fix: array to store all captured opponents
        let event = 'move'; // default, may change

        if (moved) {
            // Check for entry move (from 0 to 1)
            if (current_pos === 0 && landedPos === 1) {
                event = 'enter';
            }
            // Entity Traversal (Ladders & Snakes)
            if (this.model.Ladders.has(landedPos)) {
                finalPos = this.model.Ladders.get(landedPos);
                event = 'ladder';
            } else if (this.model.Snakes.has(landedPos)) {
                finalPos = this.model.Snakes.get(landedPos);
                event = 'snake';
            }

            // Opponent Capture Mechanics (Katti)
            if (!this.model.SafeZones.has(finalPos)) {
                for (let opponent = 0; opponent < this.model.NUM_PLAYERS; opponent++) {
                    if (opponent !== activePlayer && this.model.getPlayerPosition(opponent) === finalPos) {
                        this.model.setPlayerPosition(opponent, 0); // Opponent sent back to off-board
                        // Notify view of capture
                        this.view.onCapture(opponent, finalPos);
                        capturedPlayerIds.push(opponent); // DEF-0033 fix: record all captured
                    }
                }
                if (capturedPlayerIds.length > 0) {
                    event = 'capture';
                }
            }
        }

        // Position Commitment
        this.model.setPlayerPosition(activePlayer, finalPos);

        // Terminal State Evaluation
        if (this.model.getPlayerPosition(activePlayer) === 100) {
            this.model.setGameOver(true);
            this.model.setWinner(activePlayer);
            // Create turn record for win
            const record = {
                mover: activePlayer,
                roll: dieRoll,
                from: current_pos,
                landed: landedPos,
                to: 100,
                event: 'win',
                captured: capturedPlayerIds.length > 0 ? capturedPlayerIds : null // DEF-0033 fix
            };
            this.model.setLastTurnRecord(record);
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
            // Play the turn sound when the turn passes to the next player
            this.view.playAudio('turn');
        }

        // Create turn record for normal turn
        const record = {
            mover: activePlayer,
            roll: dieRoll,
            from: current_pos,
            landed: landedPos,
            to: finalPos,
            event: event,
            captured: capturedPlayerIds.length > 0 ? capturedPlayerIds : null // DEF-0033 fix
        };
        this.model.setLastTurnRecord(record);

        // Notify view that the state has changed (for rendering)
        this.view.onStateChange();
    }

    advanceTurn() {
        const numPlayers = this.model.NUM_PLAYERS;
        let active = this.model.getActivePlayer();
        active = (active + 1) % numPlayers;
        this.model.setActivePlayer(active);
        this.model.setConsecutiveSixes(0); // Reset consecutive sixes on turn change
        // Removed: this.view.onTurnChange(active);
        // Turn indicator will be updated in onStateChange after movement completes
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