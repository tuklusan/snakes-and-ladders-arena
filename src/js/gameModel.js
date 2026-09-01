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
     * @private
     * @param {{x:number, y:number}} p
     * @param {{x:number, y:number}} a
     * @param {{x:number, y:number}} b
     * @return {number} distance from point p to segment ab
     */
    _pointSegDistance(p, a, b) {
        const vx = b.x - a.x;
        const vy = b.y - a.y;
        const wx = p.x - a.x;
        const wy = p.y - a.y;
        const c1 = vx * wx + vy * wy;
        if (c1 <= 0) {
            // closest to a
            return Math.hypot(p.x - a.x, p.y - a.y);
        }
        const c2 = vx * vx + vy * vy;
        if (c2 <= c1) {
            // closest to b
            return Math.hypot(p.x - b.x, p.y - b.y);
        }
        const ratio = c1 / c2;
        const pbx = a.x + ratio * vx;
        const pby = a.y + ratio * vy;
        return Math.hypot(p.x - pbx, p.y - pby);
    }

    /**
     * @private
     * @param {{x:number, y:number}} a1
     * @param {{x:number, y:number}} a2
     * @param {{x:number, y:number}} b1
     * @param {{x:number, y:number}} b2
     * @return {number} distance between segments a1a2 and b1b2 (0 if they intersect or touch)
     */
    _segSegDistance(a1, a2, b1, b2) {
        if (this.segmentsCross(a1, a2, b1, b2)) {
            return 0;
        }
        return Math.min(
            this._pointSegDistance(a1, b1, b2),
            this._pointSegDistance(a2, b1, b2),
            this._pointSegDistance(b1, a1, a2),
            this._pointSegDistance(b2, a1, a2)
        );
    }

    /**
     * Generate a random valid board configuration with non-crossing connectors.
     * @returns {{ladders: Map<number, number>, snakes: Map<number, number>, restarts: number}} Random valid board
     */
    generateBoard() {
        const MAX_RESTARTS = 500;
        const MAX_ATTEMPTS_PER_PLACEMENT = 1000;
        const CLEARANCE = 5; // viewBox units

        // Helper: row of a tile (0-indexed rows from bottom)
        const row = (tile) => Math.floor((tile - 1) / 10);

        for (let restart = 0; restart < MAX_RESTARTS; restart++) {
            // Generate random counts: aim for 4-6 each to make placement feasible with constraints
            const ladderCount = Math.floor(Math.random() * 3) + 4; // 4-6 ladders
            const snakeCount = Math.floor(Math.random() * 3) + 4;  // 4-6 snakes

            // We'll try to place ladders and snakes one by one
            const ladders = new Map();
            const snakes = new Map();
            const usedTiles = new Set(); // to ensure unique endpoints
            const acceptedSegments = []; // each element is {foot: number, top: number, isLadder: boolean}

            // Helper to try placing one connector (ladder or snake)
            const placeOne = (isLadder) => {
                for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_PLACEMENT; attempt++) {
                    let foot, top;
                    if (isLadder) {
                        // Ladder: foot < top
                        foot = Math.floor(Math.random() * 98) + 2; // 2-99
                        top = foot + Math.floor(Math.random() * 36) + 5; // 5-40 range
                        if (top > 100) top = 100; // Cap at 100
                    } else {
                        // Snake: head > tail (and head in 2-94 to avoid 95-99)
                        let snakeHead = Math.floor(Math.random() * 93) + 2; // 2-94
                        let snakeTail = snakeHead - (Math.floor(Math.random() * 36) + 5); // 5-40 range down
                        if (snakeTail < 2) snakeTail = 2; // Cap at 2 (minimum tile is 2)
                        foot = snakeTail;   // lower value
                        top = snakeHead;    // higher value
                    }

                    // Check if endpoints are in [2,99] and not used
                    if (foot < 2 || foot > 99 || top < 2 || top > 99) continue;
                    if (usedTiles.has(foot) || usedTiles.has(top)) continue;

                    // Check direction and span
                    const diff = top - foot;
                    if (diff < 5 || diff > 40) continue;

                    // NEW: row span >= 3
                    const rFoot = row(foot);
                    const rTop = row(top);
                    if (Math.abs(rFoot - rTop) < 3) continue;

                    // Compute centers
                    const footCenter = this.tileToViewBoxCenter(foot);
                    const topCenter = this.tileToViewBoxCenter(top);

                    // Check against all previously accepted segments for clearance
                    let ok = true;
                    for (const seg of acceptedSegments) {
                        const dist = this._segSegDistance(footCenter, topCenter, seg.footCenter, seg.topCenter);
                        if (dist < CLEARANCE) {
                            ok = false;
                            break;
                        }
                    }
                    if (!ok) continue;

                    // If we passed all checks, accept this connector
                    if (isLadder) {
                        ladders.set(foot, top);
                    } else {
                        snakes.set(top, foot); // note: head>tail (top is head, foot is tail)
                    }
                    usedTiles.add(foot);
                    usedTiles.add(top);
                    acceptedSegments.push({footCenter, topCenter, isLadder});
                    return true;
                }
                return false; // failed to place this connector after max attempts
            };

            // Try to place ladders greedily up to ladderCount, but break on failure
            let laddersPlaced = 0;
            for (let i = 0; i < ladderCount; i++) {
                if (!placeOne(true)) { // ladder
                    break;
                }
                laddersPlaced++;
            }

            // Try to place snakes greedily up to snakeCount, but break on failure
            let snakesPlaced = 0;
            for (let i = 0; i < snakeCount; i++) {
                if (!placeOne(false)) { // snake
                    break;
                }
                snakesPlaced++;
            }

            // If we have at least 4 ladders and 4 snakes, we accept this board
            if (laddersPlaced >= 4 && snakesPlaced >= 4) {
                return { ladders, snakes, restarts: restart };
            }
            // Otherwise, we try again with a new restart
        }

        // If we exhausted all restarts, return the known-good 4+4 board (never throw)
        const ladders = new Map([
            [9, 33],
            [14, 47],
            [20, 56],
            [21, 58],
            [25, 55],
            [60, 87]
        ]);
        const snakes = new Map([
            [31, 10],
            [35, 5],
            [37, 2],
            [74, 48]
        ]);
        return { ladders, snakes, restarts: MAX_RESTARTS };
    }

    /**
     * Validate a board configuration (including non-crossing constraint).
     * @param {Map<number, number>} ladders - Map of ladder foot to top
     * @param {Map<number, number>} snakes - Map of snake head to tail
     * @returns {string[]} Array of violation messages (empty if valid)
     */
    validateBoard(ladders, snakes) {
        const violations = [];
        const CLEARANCE = 5;
        const row = (tile) => Math.floor((tile - 1) / 10);

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
        
        if (ladderCount < 4 || ladderCount > 6) {
            violations.push(`Ladder count ${ladderCount} not in [4,6]`);
        }
        
        if (snakeCount < 4 || snakeCount > 6) {
            violations.push(`Snake count ${snakeCount} not in [4,6]`);
        }
        
        // Check e: Span (5-40)
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

        // NEW: Check g: Row span >= 3 for each connector
        for (const [foot, top] of ladders) {
            const rFoot = row(foot);
            const rTop = row(top);
            if (Math.abs(rFoot - rTop) < 3) {
                violations.push(`Ladder ${foot}-${top} row span ${Math.abs(rFoot - rTop)} < 3`);
            }
        }
        for (const [head, tail] of snakes) {
            const rHead = row(head);
            const rTail = row(tail);
            if (Math.abs(rHead - rTail) < 3) {
                violations.push(`Snake ${head}-${tail} row span ${Math.abs(rHead - rTail)} < 3`);
            }
        }

        // Build list of connectors with centers for distance checks
        const allConnectors = [];
        for (const [foot, top] of ladders) {
            allConnectors.push({
                foot: foot,
                top: top,
                p1: this.tileToViewBoxCenter(foot),
                p2: this.tileToViewBoxCenter(top),
                type: 'ladder'
            });
        }
        for (const [head, tail] of snakes) {
            allConnectors.push({
                head: head,
                tail: tail,
                p1: this.tileToViewBoxCenter(head),
                p2: this.tileToViewBoxCenter(tail),
                type: 'snake'
            });
        }

        // NEW: Check h: Clearance gap >= CLEARANCE for every pair
        for (let i = 0; i < allConnectors.length; i++) {
            for (let j = i + 1; j < allConnectors.length; j++) {
                const c1 = allConnectors[i];
                const c2 = allConnectors[j];
                const dist = this._segSegDistance(c1.p1, c1.p2, c2.p1, c2.p2);
                if (dist < CLEARANCE) {
                    violations.push(`Connector ${c1.type} ${c1.foot}-${c1.top} and ${c2.type} ${c2.head}-${c2.tail} too close: distance ${dist.toFixed(2)} < ${CLEARANCE}`);
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

    setLastTurnRecord(record) {
        this.lastTurnRecord = record;
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