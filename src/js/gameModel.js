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
        const MAX_RESTARTS = 50;
        const MAX_ATTEMPTS_PER_PLACEMENT = 300;

        for (let restart = 0; restart < MAX_RESTARTS; restart++) {
            // Generate random counts
            const ladderCount = Math.floor(Math.random() * 4) + 6; // 6-9 ladders
            const snakeCount = Math.floor(Math.random() * 4) + 6;  // 6-9 snakes

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

                    // For snakes, we already ensured head (which is top) is not in 95-99 by limiting head to 94
                    // But note: we set head = top, so we require top <= 94 for snakes? 
                    // Actually, we set head = top and we limited head to 94 above, so top<=94 for snakes.
                    // However, note that for ladders, we allow top up to 100 (but we capped at 100) and foot>=2.

                    // Compute centers
                    const footCenter = this.tileToViewBoxCenter(foot);
                    const topCenter = this.tileToViewBoxCenter(top);

                    // Check against all previously accepted segments for crossing
                    let cross = false;
                    for (const seg of acceptedSegments) {
                        if (this.segmentsCross(footCenter, topCenter, seg.footCenter, seg.topCenter)) {
                            cross = true;
                            break;
                        }
                    }
                    if (cross) continue;

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

            // Try to place all ladders and snakes
            let success = true;
            for (let i = 0; i < ladderCount; i++) {
                if (!placeOne(true)) { // ladder
                    success = false;
                    break;
                }
            }
            if (!success) continue;

            for (let i = 0; i < snakeCount; i++) {
                if (!placeOne(false)) { // snake
                    success = false;
                    break;
                }
            }
            if (!success) continue;

            // If we got here, we have a valid board with the desired counts
            return { ladders, snakes, restarts: restart };
        }

        // If we exceeded max restarts, throw an error
        throw new Error('Failed to generate valid non-crossing board after maximum restarts');
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