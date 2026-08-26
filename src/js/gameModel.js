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
        // Ladders and Snakes mappings (generated randomly for each game)
        const board = this.generateBoard();
        this.Ladders = board.ladders;
        this.Snakes  = board.snakes;

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
        this.lastTurnRecord = null; // record of the last resolved turn
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

    getLastTurnRecord() {
        return this.lastTurnRecord;
    }

    getLastMoveIntermediatePosition() {
        return this.lastMoveIntermediatePosition;
    }

    setLastMoveIntermediatePosition(position) {
        this.lastMoveIntermediatePosition = position;
    }

    /**
     * Generate a random valid board configuration
     * @returns {{ladders: Map<number, number>, snakes: Map<number, number>}} Random valid board
     */
    generateBoard() {
        const MAX_ATTEMPTS = 1000;
        
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            // Generate random counts
            const ladderCount = Math.floor(Math.random() * 4) + 6; // 6-9 ladders
            const snakeCount = Math.floor(Math.random() * 4) + 6;  // 6-9 snakes
            
            // Generate all endpoints first
            const endpoints = new Set();
            const ladders = new Map();
            const snakes = new Map();
            
            // Generate ladders
            let ladderSuccess = true;
            for (let i = 0; i < ladderCount; i++) {
                let foot, top;
                let valid = false;
                let attempts = 0;
                
                while (!valid && attempts < 100) {
                    foot = Math.floor(Math.random() * 98) + 2; // 2-99
                    top = foot + Math.floor(Math.random() * 36) + 5; // 5-40 range
                    if (top > 100) top = 100; // Cap at 100
                    
                    // Check constraints
                    valid = (foot >= 2 && foot <= 99 && 
                            top >= 2 && top <= 99 && 
                            top > foot && 
                            top - foot >= 5 && top - foot <= 40 &&
                            !endpoints.has(foot) && !endpoints.has(top));
                    
                    if (valid) {
                        endpoints.add(foot);
                        endpoints.add(top);
                        ladders.set(foot, top);
                    }
                    attempts++;
                }
                
                if (!valid) {
                    ladderSuccess = false;
                    break;
                }
            }
            
            if (!ladderSuccess) continue;
            
            // Generate snakes
            let snakeSuccess = true;
            for (let i = 0; i < snakeCount; i++) {
                let head, tail;
                let valid = false;
                let attempts = 0;
                
                while (!valid && attempts < 100) {
                    head = Math.floor(Math.random() * 98) + 2; // 2-99
                    tail = head - (Math.floor(Math.random() * 36) + 5); // 5-40 range down
                    if (tail < 1) tail = 1; // Cap at 1
                    
                    // Check constraints (including no snake head in 95-99)
                    valid = (head >= 2 && head <= 94 && // No snake head in 95-99
                            tail >= 2 && tail <= 99 && 
                            head > tail && 
                            head - tail >= 5 && head - tail <= 40 &&
                            !endpoints.has(head) && !endpoints.has(tail));
                    
                    if (valid) {
                        endpoints.add(head);
                        endpoints.add(tail);
                        snakes.set(head, tail);
                    }
                    attempts++;
                }
                
                if (!valid) {
                    snakeSuccess = false;
                    break;
                }
            }
            
            if (!snakeSuccess) continue;
            
            // If we got here, we have a valid board
            return { ladders, snakes };
        }
        
        // If we exceeded max attempts, throw an error
        throw new Error('Failed to generate valid board after maximum attempts');
    }

    /**
     * Validate a board configuration
     * @param {Map<number, number>} ladders - Map of ladder foot to top
     * @param {Map<number, number>} snakes - Map of snake head to tail
     * @returns {string[]} Array of violation messages (empty if valid)
     */
    validateBoard(ladders, snakes) {
        const violations = [];
        
        // Check a: Endpoints never touch {0,1,100}
        for (const [foot, top] of ladders) {
            if (foot === 0 || foot === 1 || foot === 100) {
                violations.push(`Ladder foot ${foot} is in {0,1,100}`);
            }
            if (top === 0 || top === 1 || top === 100) {
                violations.push(`Ladder top ${top} is in {0,1,100}`);
            }
        }
        
        for (const [head, tail] of snakes) {
            if (head === 0 || head === 1 || head === 100) {
                violations.push(`Snake head ${head} is in {0,1,100}`);
            }
            if (tail === 0 || tail === 1 || tail === 100) {
                violations.push(`Snake tail ${tail} is in {0,1,100}`);
            }
        }
        
        // Check b: Direction
        for (const [foot, top] of ladders) {
            if (top <= foot) {
                violations.push(`Ladder foot ${foot} >= top ${top}`);
            }
        }
        
        for (const [head, tail] of snakes) {
            if (head <= tail) {
                violations.push(`Snake head ${head} <= tail ${tail}`);
            }
        }
        
        // Check c: Unique endpoints
        const allEndpoints = new Set();
        
        for (const [foot, top] of ladders) {
            if (allEndpoints.has(foot)) {
                violations.push(`Duplicate ladder foot ${foot}`);
            }
            if (allEndpoints.has(top)) {
                violations.push(`Duplicate ladder top ${top}`);
            }
            allEndpoints.add(foot);
            allEndpoints.add(top);
        }
        
        for (const [head, tail] of snakes) {
            if (allEndpoints.has(head)) {
                violations.push(`Duplicate snake head ${head}`);
            }
            if (allEndpoints.has(tail)) {
                violations.push(`Duplicate snake tail ${tail}`);
            }
            allEndpoints.add(head);
            allEndpoints.add(tail);
        }
        
        // Check d: Counts
        const ladderCount = ladders.size;
        const snakeCount = snakes.size;
        
        if (ladderCount < 6 || ladderCount > 9) {
            violations.push(`Ladder count ${ladderCount} not in [6,9]`);
        }
        
        if (snakeCount < 6 || snakeCount > 9) {
            violations.push(`Snake count ${snakeCount} not in [6,9]`);
        }
        
        // Check e: Span
        for (const [foot, top] of ladders) {
            const span = top - foot;
            if (span < 5 || span > 40) {
                violations.push(`Ladder span ${top}-${foot}=${span} not in [5,40]`);
            }
        }
        
        for (const [head, tail] of snakes) {
            const span = head - tail;
            if (span < 5 || span > 40) {
                violations.push(`Snake span ${head}-${tail}=${span} not in [5,40]`);
            }
        }
        
        // Check f: Fairness - no snake head in 95..99
        for (const [head, tail] of snakes) {
            if (head >= 95 && head <= 99) {
                violations.push(`Snake head ${head} is in brutal zone [95,99]`);
            }
        }
        
        return violations;
    }
}

// Attach to window for browser compatibility - export global
if (typeof window !== 'undefined') {
    window.GameModel = GameModel;
}
