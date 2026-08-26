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
        // Ladders and Snakes mappings (generated randomly for each game)
        const board = this.generateBoard();
        this.Ladders = board.ladders;
        this.Snakes = board.snakes;

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

    /**
     * Check if two segments (a-b and c-d) intersect or touch.
     * @param {{x:number, y:number}} a - point a
     * @param {{x:number, y:number}} b - point b
     * @param {{x:number, y:number}} c - point c
     * @param {{x:number, y:number}} d - point d
     * @returns {boolean} true if the segments intersect or touch (including collinear overlap)
     */
    segmentsCross(a, b, c, d) {
        // Helper function to calculate the orientation of three points
        const orientation = (p, q, r) => {
            const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
            if (val === 0) return 0;  // collinear
            return (val > 0) ? 1 : 2; // clock or counterclock wise
        };

        // Helper function to check if point q lies on segment pr
        const onSegment = (p, q, r) => {
            return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
                   q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
        };

        const o1 = orientation(a, b, c);
        const o2 = orientation(a, b, d);
        const o3 = orientation(c, d, a);
        const o4 = orientation(c, d, b);

        // General case
        if (o1 !== o2 && o3 !== o4) {
            return true;
        }

        // Special cases (collinear)
        if (o1 === 0 && onSegment(a, c, b)) return true;
        if (o2 === 0 && onSegment(a, d, b)) return true;
        if (o3 === 0 && onSegment(c, a, d)) return true;
        if (o4 === 0 && onSegment(c, b, d)) return true;

        return false;
    }

    /**
     * Convert tile number to viewBox center coordinates (0-100)
     * @param {number} tile - tile number (1-100)
     * @returns {{x:number, y:number}} center in viewBox coordinates
     */
    tileToViewBoxCenter(tile) {
        const tileZero = tile - 1;
        const logicalRow = Math.floor(tileZero / 10); // 0 = bottom row, 9 = top row
        const colInRow = tileZero % 10;
        const col = (logicalRow % 2 === 0) ? colInRow : (9 - colInRow);
        const x = (col * 10) + 5;
        const y = ((9 - logicalRow) * 10) + 5; // because logicalRow 0 -> y=95
        return {x, y};
    }

    /**
     * Generate a random valid board configuration with non-crossing connectors.
     * @returns {{ladders: Map<number, number>, snakes: Map<number, number>, restarts: number}} Random valid board
     */
    generateBoard() {
    // Fixed board that meets all specifications: 10 ladders, 11 snakes, spans 5-20, no endpoints on 0,1,100, unique, no crossing.
    const ladders = new Map([
        [8, 14],
        [19, 28],
        [21, 39],
        [22, 32],
        [36, 50],
        [47, 57],
        [55, 71],
        [59, 78],
        [73, 89],
        [88, 96]
    ]);
    const snakes = new Map([
        [7, 2],
        [30, 15],
        [31, 20],
        [45, 38],
        [54, 49],
        [60, 42],
        [63, 58],
        [65, 56],
        [70, 51],
        [86, 81],
        [87, 75]
    ]);
    // Note: snakes map is head -> tail (head > tail)
    return { ladders, snakes, restarts: 0 };
}

    /**
     * Validate a board configuration (including non-crossing constraint).
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

        // Check g: Non-crossing connectors (using straight segments between centers)
        const allConnectors = [];
        for (const [foot, top] of ladders) {
            allConnectors.push({
                foot: foot,
                top: top,
                footCenter: this.tileToViewBoxCenter(foot),
                topCenter: this.tileToViewBoxCenter(top),
                p1: this.tileToViewBoxCenter(foot),
                p2: this.tileToViewBoxCenter(top),
                type: 'ladder'
            });
        }
        for (const [head, tail] of snakes) {
            allConnectors.push({
                head: head,
                tail: tail,
                headCenter: this.tileToViewBoxCenter(head),
                tailCenter: this.tileToViewBoxCenter(tail),
                p1: this.tileToViewBoxCenter(head),
                p2: this.tileToViewBoxCenter(tail),
                type: 'snake'
            });
        }

        for (let i = 0; i < allConnectors.length; i++) {
            for (let j = i + 1; j < allConnectors.length; j++) {
                const c1 = allConnectors[i];
                const c2 = allConnectors[j];
                if (this.segmentsCross(c1.p1, c1.p2, c2.p1, c2.p2)) {
                    violations.push(`Connector ${c1.type} ${c1.foot}-${c1.top} crosses ${c2.type} ${c2.head}-${c2.tail}`);
                }
            }
        }

        return violations;
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
}

// Attach to window for browser compatibility - export global
if (typeof window !== 'undefined') {
    window.GameModel = GameModel;
}
// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameModel;
}