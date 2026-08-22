// Game Model - Manages the game state
console.log("gameModel.js loaded");
class GameModel {
    constructor() {
        this.resetGame();
    }

    resetGame() {
        // Constants from the specification
        this.NUM_PLAYERS = 4;
        this.SafeZones = new Set([0, 1, 100]);
        // Ladders and Snakes mappings (to be defined based on board)
        // Using a common Indian Snakes and Ladders configuration as placeholder
        this.Ladders = new Map([
            [2, 38], [7, 14], [8, 31], [15, 26], [21, 42],
            [28, 84], [36, 44], [51, 67], [71, 91], [78, 98],
            [87, 94]
        ]);
        this.Snakes = new Map([
            [16, 6], [46, 25], [49, 11], [62, 19], [64, 60],
            [74, 53], [89, 68], [92, 51], [95, 75], [99, 80]
        ]);

        // Game state
        this.pawn_positions = Array(this.NUM_PLAYERS).fill(0); // [0, 0, 0, 0]
        this.active_player = 0; // 0-indexed internally, but UI may use 1-indexed
        this.consecutive_sixes = 0;
        this.turn_start_position = 0;
        this.game_over = false;
        this.winner = null;
        this.lastRoll = 0; // last dice roll (0 means no roll yet)
        this.lastMover = null; // ID of the player who last moved
        this.lastMoveIntermediatePosition = 0; // intermediate position after die roll, before jump
    }

    // Getters
    getState() {
        return {
            pawn_positions: [...this.pawn_positions],
            active_player: this.active_player,
            consecutive_sixes: this.consecutive_sixes,
            turn_start_position: this.turn_start_position,
            game_over: this.game_over,
            winner: this.winner
        };
    }

    getPlayerPosition(playerId) {
        // playerId is 0-indexed
        return this.pawn_positions[playerId];
    }

    getActivePlayer() {
        return this.active_player;
    }

    getConsecutiveSixes() {
        return this.consecutive_sixes;
    }

    getTurnStartPosition() {
        return this.turn_start_position;
    }

    isGameOver() {
        return this.game_over;
    }

    getWinner() {
        return this.winner;
    }

    getLastRoll() {
        return this.lastRoll;
    }

    // Setters (typically called by Controller)
    setPlayerPosition(playerId, position) {
        this.pawn_positions[playerId] = position;
    }

    setActivePlayer(playerId) {
        this.active_player = playerId;
    }

    setConsecutiveSixes(count) {
        this.consecutive_sixes = count;
    }

    setTurnStartPosition(position) {
        this.turn_start_position = position;
    }

    setGameOver(status) {
        this.game_over = status;
    }

    setWinner(playerId) {
        this.winner = playerId;
    }

    setLastRoll(roll) {
        this.lastRoll = roll;
    }

    getLastMover() {
        return this.lastMover;
    }

    setLastMover(playerId) {
        this.lastMover = playerId;
    }

    getLastMoveIntermediatePosition() {
        return this.lastMoveIntermediatePosition;
    }

    setLastMoveIntermediatePosition(position) {
        this.lastMoveIntermediatePosition = position;
    }
}

// Attach to window for browser compatibility - export global
if (typeof window !== 'undefined') {
    window.GameModel = GameModel;
}
