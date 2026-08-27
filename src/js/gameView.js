// Game View - Handles rendering and user interface
console.log("!!! gameView.js LOADED !!!");
console.log("DEFINITELY RUNNING THIS LINE - SHOULD APPEAR IN CONSOLE");
class GameView {
    constructor() {
        console.log("!!! gameView constructor START !!!");
        console.log("gameView constructor called");
        this.model = null;
        this.controller = null;
        this.assets = {
            board: null,
            tokens: [], // array of image elements for each player token
            diceFaces: [], // array of image elements for dice faces 1-6
            diceTumbleSheet: null, // for dice roll animation
            audio: {} // map of event to audio elements
        };
        this.isAssetsLoaded = false;
        this.assetsLoadedCount = 0;
        this.assetsFailedCount = 0;
        this.assetsTotalCount = 0;
        this.boardImage = new Image();
        this.boardLoaded = false;
        this.container = null;
        this.boardElement = null;
        this.tokenElements = []; // array of div elements for tokens
        this.diceElement = null;
        // this.playerInfoElement = null; // Removed per requirement
        this.loadingOverlay = null;
        this.autoRollTimeout = null;
        this.gameOverTimeout = null;
        this.loadingTimeout = null; // timeout to hide loading overlay after a delay
        this.audioElements = {} // HTMLAudioElement for each sound
        this.previousPositions = [0,0,0,0]; // to track token positions for animation
        this.pendingCaptureOpponentId = null;
        this.pendingCaptureTile = null;
        this.isAssetsHandled = false; // flag to prevent handling asset load completion multiple times
        this.svgElement = null; // SVG overlay for snakes and ladders
        this.pendingTransitions = new Map(); // map of token element to {listener, timeoutId} for pending direct move transitions
        this.moveId = 0; // unique identifier for each onStateChange call
        this.lastTurnRecord = null; // record of the last turn processed by the controllerach onStateChange call
        this.commentaryBuffer = []; // Array to store commentary messages
        this.maxCommentaryLines = 200; // Maximum lines to keep in buffer

        // Bind methods
        this.handleRollClick = this.handleRollClick.bind(this);
        this.assetLoaded = this.assetLoaded.bind(this);
        this.assetError = this.assetError.bind(this);
        this.autoRoll = this.autoRoll.bind(this);
        this.handleGameOver = this.handleGameOver.bind(this);
        // Expose instance for debugging
        if (typeof window !== 'undefined') {
            window.gameViewInstance = this;
        }

        // Audio unlock and start button
        this.isAudioUnlocked = false;
        this._deferredUnlock = false;
        this.hasProbedAutoplay = false;
        this.startButtonElement = document.createElement('button');
        this.startButtonElement.textContent = 'Click to start the arena';
        Object.assign(this.startButtonElement.style, {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '12px 24px',
            fontSize: '18px',
            backgroundColor: '#ffeb3b',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            zIndex: '1000'
        });
        this.startButtonElement.addEventListener('click', () => {
            this._unlockAudioAndStart();
        });
        this._debugEnabled = (new URLSearchParams(window.location.search).get('debug') === '1');
    }

    debugLog(message) {
        if (!this._debugEnabled) return;
        // Get or create the debug log div
        let debugLogDiv = document.getElementById('debuglog');
        if (!debugLogDiv) {
            debugLogDiv = document.createElement('div');
            debugLogDiv.id = 'debuglog';
            debugLogDiv.style.position = 'fixed';
            debugLogDiv.style.top = '0';
            debugLogDiv.style.left = '0';
            debugLogDiv.style.width = '100%';
            debugLogDiv.style.background = 'rgba(0,0,0,0.7)';
            debugLogDiv.style.color = '#0f0';
            debugLogDiv.style.fontFamily = 'monospace';
            debugLogDiv.style.fontSize = '12px';
            debugLogDiv.style.lineHeight = '1.4';
            debugLogDiv.style.padding = '5px';
            debugLogDiv.style.overflow = 'auto';
            debugLogDiv.style.zIndex = '9999';
            debugLogDiv.style.maxHeight = '50%';
            document.body.insertBefore(debugLogDiv, document.body.firstChild);
        }
        const timestamp = new Date().toISOString();
        const line = document.createElement('div');
        line.textContent = `[${timestamp}] ${message}`;
        debugLogDiv.appendChild(line);
        // Optionally scroll to bottom
        debugLogDiv.scrollTop = debugLogDiv.scrollHeight;
    }
    
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Constants
    static PAUSE_DURATION = 500;   // ms settle at landing and destination tiles

    // Helper function to get the center of a tile in viewBox coordinates (0-100)
    getViewBoxCenter(tile) {
        const tileZero = tile - 1;
        const logicalRow = Math.floor(tileZero / 10); // 0 = bottom row, 9 = top row
        const colInRow = tileZero % 10;
        const col = (logicalRow % 2 === 0) ? colInRow : (9 - colInRow);
        const x = (col * 10) + 5;
        const y = ((9 - logicalRow) * 10) + 5; // because logicalRow 0 -> y=95
        return {x, y};
    }

    // Helper function to get the cell element for a given tile number
    getCellElement(tile) {
        return this.boardElement.querySelector(`[data-tile="${tile}"]`);
    }

    // Helper function to get the bounding box of the cell element for a given tile number
    getCellRect(tile) {
        const cell = this.getCellElement(tile);
        if (!cell) return null;
        return cell.getBoundingClientRect();
    }

    // Helper function to get the center of a cell element in pixels relative to the container
    getTokenPositionFromTile(tile, playerId) {
        const containerRect = this.container.getBoundingClientRect();

        // Handle tile 0 (off-board staging)
        if (tile === 0) {
            const stagingRect = this.stagingElement.getBoundingClientRect();
            const containerRect = this.container.getBoundingClientRect();
            const stripLeft = stagingRect.left - containerRect.left;
            const stripWidth = stagingRect.width;
            const x = stripLeft + (playerId + 0.5) * (stripWidth / 4);
            const y = stagingRect.top - containerRect.top + stagingRect.height / 2;
            return { x, y };
        }

        // For tiles 1-100, get the cell element and compute its center relative to container
        const cell = this.getCellElement(tile);
        if (!cell) return null;
        const rect = cell.getBoundingClientRect();
        return {
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top + rect.height / 2
        };
    }

    // Helper function to get all players on tile #1, sorted by playerId
    getPlayersOnTileOne() {
        const players = [];
        for (let i = 0; i < this.model.NUM_PLAYERS; i++) {
            if (this.model.getPlayerPosition(i) === 1) {
                players.push(i);
            }
        }
        return players.sort((a, b) => a - b); // ascending playerId order
    }

    // Compute position and transform for a token on tile #1
    getTokenPositionAndTransformForTileOne(playerId) {
        const playersOnTileOne = this.getPlayersOnTileOne();
        const k = playersOnTileOne.length;
        
        // Get the cell element and its bounding rect
        const cell = this.getCellElement(1);
        if (!cell) {
            // Fallback to normal positioning if we can't get cell
            const pos = this.getTokenPositionFromTile(1, playerId);
            return { x: pos.x, y: pos.y, transform: 'translate(-50%, -50%)' };
        }
        const cellRect = cell.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        
        // Compute center relative to container
        const centerX = cellRect.left - containerRect.left + cellRect.width / 2;
        const centerY = cellRect.top - containerRect.top + cellRect.height / 2;
        
        if (k <= 1) {
            // Lone piece or empty tile - normal positioning
            return { 
                x: centerX, 
                y: centerY, 
                transform: 'translate(-50%, -50%)' 
            };
        } else {
            // Multiple pieces - quadrant layout
            const quadrantIndex = playersOnTileOne.indexOf(playerId);
            if (quadrantIndex === -1) {
                // Should not happen, but fallback
                return { 
                    x: centerX, 
                    y: centerY, 
                    transform: 'translate(-50%, -50%)' 
                };
            }
            
            // Quadrant offsets: +/- 25% of cell size from center
            const offsetX = (quadrantIndex % 2 === 0) ? -cellRect.width * 0.25 : cellRect.width * 0.25;
            const offsetY = (Math.floor(quadrantIndex / 2) === 0) ? -cellRect.height * 0.25 : cellRect.height * 0.25;
            
            // Scale down to ~0.5 (about 48%)
            const scale = 0.5;
            
            return {
                x: centerX + offsetX,
                y: centerY + offsetY,
                transform: `translate(-50%, -50%) scale(${scale})`
            };
        }
    }

    // Set token position using pixel values
    setTokenPositionFromPixel(x, y, token) {
        token.style.left = x + 'px';
        token.style.top = y + 'px';
        token.style.transform = 'translate(-50%, -50%)';
    }

    // Position a token with special handling for tile #1 multi-occupancy
    positionToken(playerId, tile, token) {
        if (tile === 1) {
            const { x, y, transform } = this.getTokenPositionAndTransformForTileOne(playerId);
            token.style.left = x + 'px';
            token.style.top = y + 'px';
            token.style.transform = transform;
        } else {
            // Use existing positioning for all other tiles
            const pos = this.getTokenPositionFromTile(tile, playerId);
            if (pos) {
                this.setTokenPositionFromPixel(pos.x, pos.y, token);
            }
        }
    }

    // Position a token on a given tile
    positionTokenOnTile(playerId, tile) {
        const pos = this.getTokenPositionFromTile(tile, playerId);
        if (tile === 26 && playerId === 0) {
            console.log();
        }
        if (pos) {
            this.setTokenPositionFromPixel(pos.x, pos.y, this.tokenElements[playerId]);
        }
    }

    // Draw snakes and ladders on the SVG overlay
    drawSnakesAndLadders() {
        // Clear any existing paths from this.svgElement (while keeping the SVG element itself)
        while (this.svgElement.firstChild) {
            this.svgElement.removeChild(this.svgElement.firstChild);
        }

        // Draw ladders with two rails and rungs
        for (const [start, end] of this.model.Ladders) {
            const startCenter = this.getViewBoxCenter(start);
            const endCenter = this.getViewBoxCenter(end);
            
            // Calculate the vector from start to end
            const dx = endCenter.x - startCenter.x;
            const dy = endCenter.y - startCenter.y;
            const length = Math.sqrt(dx*dx + dy*dy);
            
            // If length is zero, skip (shouldn't happen)
            if (length === 0) continue;
            
            // Unit vector along the ladder
            const ux = dx / length;
            const uy = dy / length;
            
            // Perpendicular vector (for rungs and rail offset)
            const px = -uy;
            const py = ux;
            
            // Rail offset (half the distance between rails)
            const railOffset = 0.8; // in viewBox units
            
            // Calculate rail positions
            const rail1StartX = startCenter.x + px * railOffset;
            const rail1StartY = startCenter.y + py * railOffset;
            const rail1EndX = endCenter.x + px * railOffset;
            const rail1EndY = endCenter.y + py * railOffset;
            
            const rail2StartX = startCenter.x - px * railOffset;
            const rail2StartY = startCenter.y - py * railOffset;
            const rail2EndX = endCenter.x - px * railOffset;
            const rail2EndY = endCenter.y - py * railOffset;
            
            // Draw the two rails
            const rail1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            rail1.setAttribute('d', `M ${rail1StartX} ${rail1StartY} L ${rail1EndX} ${rail1EndY}`);
            rail1.setAttribute('stroke', '#2ecc71'); // green
            rail1.setAttribute('stroke-width', '1.5');
            rail1.setAttribute('fill', 'none');
            rail1.setAttribute('data-jump', `${start}-${end}`);
            this.svgElement.appendChild(rail1);
            
            const rail2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            rail2.setAttribute('d', `M ${rail2StartX} ${rail2StartY} L ${rail2EndX} ${rail2EndY}`);
            rail2.setAttribute('stroke', '#2ecc71'); // green
            rail2.setAttribute('stroke-width', '1.5');
            rail2.setAttribute('fill', 'none');
            rail2.setAttribute('data-jump', `${start}-${end}`);
            this.svgElement.appendChild(rail2);
            
            // Draw rungs (perpendicular lines between rails)
            const numRungs = Math.max(2, Math.floor(length / 5)); // at least 2 rungs, spaced every 5 viewBox units
            for (let i = 0; i <= numRungs; i++) {
                const t = i / numRungs; // position along ladder from 0 to 1
                const rungCenterX = startCenter.x + t * dx;
                const rungCenterY = startCenter.y + t * dy;
                
                // Rung endpoints (from rail1 to rail2)
                const rungStartX = rungCenterX + px * railOffset;
                const rungStartY = rungCenterY + py * railOffset;
                const rungEndX = rungCenterX - px * railOffset;
                const rungEndY = rungCenterY - py * railOffset;
                
                const rung = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                rung.setAttribute('d', `M ${rungStartX} ${rungStartY} L ${rungEndX} ${rungEndY}`);
                rung.setAttribute('stroke', '#2ecc71'); // green
                rung.setAttribute('stroke-width', '1.5');
                rung.setAttribute('fill', 'none');
                rung.setAttribute('data-jump', `${start}-${end}`);
                this.svgElement.appendChild(rung);
            }
        }

        // Draw snakes
        for (const [start, end] of this.model.Snakes) {
            const startCenter = this.model.tileToViewBoxCenter(start);
            const endCenter = this.model.tileToViewBoxCenter(end);
            
            // Draw the snake body with sinuous S-curve as a tapered filled path
            const dx = endCenter.x - startCenter.x;
            const dy = endCenter.y - startCenter.y;
            const length = Math.sqrt(dx*dx + dy*dy);
            
            // Perpendicular vector (normalized)
            const nx = -dy / length;
            const ny = dx / length;
            
            // Amplitude for the S-curve (undulation)
            const amplitude = Math.min(12, length / 4); // tweak for natural look
            
            // Control points positioned on opposite sides of the line to create an S shape
            const controlPoint1X = startCenter.x + nx * amplitude * 0.5;
            const controlPoint1Y = startCenter.y + ny * amplitude * 0.5;
            const controlPoint2X = endCenter.x - nx * amplitude * 0.5;
            const controlPoint2Y = endCenter.y - ny * amplitude * 0.5;
            
            // Sample the Bezier curve for the tapered body
            const numSamples = 20;
            const baseWidth = 4.0; // in viewBox units
            const taperFactor = 0.5; // width at tail is baseWidth * (1 - taperFactor) = baseWidth * 0.5
            let pointsLeft = [];
            let pointsRight = [];
            for (let i = 0; i <= numSamples; i++) {
                const t = i / numSamples;
                // Compute point on Bezier curve
                const oneMinusT = 1 - t;
                const x = 
                    oneMinusT*oneMinusT*oneMinusT * startCenter.x +
                    3 * oneMinusT*oneMinusT * t * controlPoint1X +
                    3 * oneMinusT * t*t * controlPoint2X +
                    t*t*t * endCenter.x;
                const y = 
                    oneMinusT*oneMinusT*oneMinusT * startCenter.y +
                    3 * oneMinusT*oneMinusT * t * controlPoint1Y +
                    3 * oneMinusT * t*t * controlPoint2Y +
                    t*t*t * endCenter.y;
                
                // Compute derivative (tangent) for normal
                const dx_dt = 
                    3 * oneMinusT*oneMinusT * (controlPoint1X - startCenter.x) +
                    6 * oneMinusT * t * (controlPoint2X - controlPoint1X) +
                    3 * t*t * (endCenter.x - controlPoint2X);
                const dy_dt = 
                    3 * oneMinusT*oneMinusT * (controlPoint1Y - startCenter.y) +
                    6 * oneMinusT * t * (controlPoint2Y - controlPoint1Y) +
                    3 * t*t * (endCenter.y - controlPoint2Y);
                
                // Normalize the tangent to get the direction vector
                const len = Math.sqrt(dx_dt*dx_dt + dy_dt*dy_dt);
                let tx, ty;
                if (len > 0) {
                    tx = dx_dt / len;
                    ty = dy_dt / len;
                } else {
                    // If tangent is zero, use the direction from start to end
                    tx = dx / length;
                    ty = dy / length;
                }
                // Normal vector (perpendicular to tangent): rotate 90 degrees counterclockwise: (-ty, tx)
                const nx = -ty;
                const ny = tx;
                
                // Width at this point: taper from head (t=0) to tail (t=1)
                const width = baseWidth * (1 - t * taperFactor);
                const halfWidth = width / 2;
                
                // Left and right points
                pointsLeft.push({
                    x: x + nx * halfWidth,
                    y: y + ny * halfWidth
                });
                pointsRight.push({
                    x: x - nx * halfWidth,
                    y: y - ny * halfWidth
                });
            }
            
            // Build the path data: left edge from head to tail, then right edge from tail to head
            let d = `M ${pointsLeft[0].x} ${pointsLeft[0].y}`;
            for (let i = 1; i < pointsLeft.length; i++) {
                d += ` L ${pointsLeft[i].x} ${pointsLeft[i].y}`;
            }
            // Now go to the right edge at tail (which is the last point in pointsLeft? Actually, pointsLeft[numSamples] is at tail)
            // But we want to go to the right edge at tail: pointsRight[numSamples]
            d += ` L ${pointsRight[numSamples].x} ${pointsRight[numSamples].y}`;
            for (let i = numSamples-1; i >= 0; i--) {
                d += ` L ${pointsRight[i].x} ${pointsRight[i].y}`;
            }
            d += ` Z`; // close the path
            
            const bodyPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            bodyPath.setAttribute('d', d);
            bodyPath.setAttribute('fill', '#e74c3c'); // red
            bodyPath.setAttribute('stroke', 'none');
            bodyPath.setAttribute('data-jump', `${start}-${end}`);
            this.svgElement.appendChild(bodyPath);
            
            // Now, draw the head and tail, but scaled down to match the width at the ends
            // Direction from tail to head: (startCenter - endCenter)
            const headDx = startCenter.x - endCenter.x;
            const headDy = startCenter.y - endCenter.y;
            const headLength = Math.sqrt(headDx*headDx + headDy*headDy);
            const headUx = headDx / headLength;
            const headUy = headDy / headLength;
            
            // Size of head proportional to width at head (t=0): baseWidth
            const headSize = baseWidth / 2.0; // adjust as needed
            const headGroup = this._createHeadElement(startCenter.x, startCenter.y, headUx, headUy, headSize);
            this.svgElement.appendChild(headGroup);
            
            // Direction from head to tail: (endCenter - startCenter) = (-headDx, -headDy)
            const tailUx = -headUx;
            const tailUy = -headUy;
            // Size of tail proportional to width at tail (t=1): baseWidth * (1 - taperFactor)
            const tailSize = baseWidth * (1 - taperFactor) / 2.0;
            const tailGroup = this._createTailElement(endCenter.x, endCenter.y, tailUx, tailUy, tailSize);
            this.svgElement.appendChild(tailGroup);
        }
    }

    init(model, controller) {
        console.log("!!! gameView.init START !!!");
        console.log("gameView.init called");
        this.model = model;
        this.controller = controller;
        try {
            this.createDOM();
        } catch (e) {
            console.error("Error in createDOM:", e);
        }
        this.loadAssets();
        this.bindEvents();
        window.addEventListener('resize', () => this.onWindowResize());
    }

    createDOM() {
        console.log("!!! gameView.createDOM START !!!");
        console.log("gameView.createDOM called at", new Date().toISOString());
        // Get main container
        this.container = document.getElementById('game-container');
        if (!this.container) {
            console.error("Game container not found");
            return;
        }
        
        // Get the existing panels from HTML
        this.leftTitlePanel = document.getElementById('left-title-panel');
        this.leftTitlePanel.style.position = 'relative';
        this.gameBoardContainer = document.getElementById('game-board-container');
        this.rightCommentaryPanel = document.getElementById('right-commentary-panel');
        this.commentaryElement = document.getElementById('commentary-content');

        console.log("Looking for panels:", {
            leftTitlePanel: !!this.leftTitlePanel,
            gameBoardContainer: !!this.gameBoardContainer,
            rightCommentaryPanel: !!this.rightCommentaryPanel,
            commentaryElement: !!this.commentaryElement
        });

        if (!this.leftTitlePanel || !this.gameBoardContainer || !this.rightCommentaryPanel || !this.commentaryElement) {
            console.error("Required panels not found in HTML");
            console.log("leftTitlePanel:", this.leftTitlePanel);
            console.log("gameBoardContainer:", this.gameBoardContainer);
            console.log("rightCommentaryPanel:", this.rightCommentaryPanel);
            console.log("commentaryElement:", this.commentaryElement);
            return;
        }

        // Set container styles for three-column flex layout
        this.container.style.position = 'relative';
        this.container.style.width = '620px';
        this.container.style.height = '434px';
        this.container.style.margin = '0 auto';
        this.container.style.padding = '0';
        this.container.style.boxSizing = 'border-box';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'row';
        this.container.style.alignItems = 'stretch';
        this.container.style.gap = '0px';
        this.container.style.overflow = 'hidden';
        console.log(`[gameView] container width: ${this.container.style.width}, height: ${this.container.style.height}`);

        // Configure the three columns with exact widths
        this.leftTitlePanel.style.flex = '0 0 60px'; // COLUMN 1: 60px width
        this.leftTitlePanel.style.display = 'flex';
        this.leftTitlePanel.style.flexDirection = 'column';
        this.leftTitlePanel.style.alignItems = 'center';
        this.leftTitlePanel.style.padding = '4px';
        this.leftTitlePanel.style.boxSizing = 'border-box';

        this.gameBoardContainer.style.flex = '0 0 380px'; // COLUMN 2: 380px width
        this.gameBoardContainer.style.display = 'flex';
        this.gameBoardContainer.style.flexDirection = 'column';
        this.gameBoardContainer.style.alignItems = 'center';
        this.gameBoardContainer.style.gap = '6px';
        this.gameBoardContainer.style.position = 'relative';
        this.gameBoardContainer.style.padding = '4px';
        this.gameBoardContainer.style.boxSizing = 'border-box';

        this.rightCommentaryPanel.style.flex = '0 0 auto'; // Fixed height, will be set below
        this.rightCommentaryPanel.style.display = 'flex';
        this.rightCommentaryPanel.style.flexDirection = 'column';
        this.rightCommentaryPanel.style.alignItems = 'center';
        this.rightCommentaryPanel.style.gap = '10px';
        this.rightCommentaryPanel.style.position = 'relative';
        this.rightCommentaryPanel.style.padding = '4px';
        this.rightCommentaryPanel.style.boxSizing = 'border-box';
        // Set height to align commentary bottom with staging bottom
        this.rightCommentaryPanel.style.height = '374px';

        // Create board element inside game-board-container
        console.log("About to create board element");
        this.boardElement = document.createElement('div');
        this.boardElement.id = 'game-board';
        this.boardElement.style.width = '380px';
        this.boardElement.style.height = '380px';
        this.boardElement.style.backgroundColor = '#f8f9fa';
        this.boardElement.style.display = 'grid';
        this.boardElement.style.gridTemplateColumns = 'repeat(10, 1fr)';
        this.boardElement.style.gridTemplateRows = 'repeat(10, 1fr)';
        console.log("Created board element:", this.boardElement);
        this.gameBoardContainer.appendChild(this.boardElement);
        console.log("Board element appended to gameBoardContainer. Children count:", this.gameBoardContainer.children.length);
        console.log("Last child is board element:", this.gameBoardContainer.lastElementChild === this.boardElement);

        // Force layout to ensure dimensions are non-zero in test environments
        this.boardElement.offsetWidth;

        // Create 100 cell elements
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                // Compute tile number in boustrophedon order with tile 1 at bottom-left
                const logicalRow = 9 - row; // 0 = bottom row, 9 = top row
                let tile;
                if (logicalRow % 2 === 0) {
                    tile = logicalRow * 10 + col + 1;
                } else {
                    tile = logicalRow * 10 + (9 - col) + 1;
                }
                cell.dataset.tile = tile;
                cell.textContent = tile;
                this.boardElement.appendChild(cell);
            }
        }
        console.log("Created", this.boardElement.children.length, "cell elements");

        // Create SVG overlay for snakes and ladders
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '0';
        svg.setAttribute('viewBox', '0 0 100 100');
        this.boardElement.appendChild(svg);
        this.svgElement = svg;
        this.drawSnakesAndLadders();

        // Create staging area below board
        this.stagingElement = document.createElement('div');
        this.stagingElement.id = 'staging-area';
        this.stagingElement.style.width = '380px';
        this.stagingElement.style.height = '40px';
        this.stagingElement.style.backgroundColor = 'rgba(0,0,0,0.1)'; // for debugging, can be removed
        this.stagingElement.style.display = 'flex';
        this.stagingElement.style.justifyContent = 'space-around';
        this.stagingElement.style.alignItems = 'center';
        this.gameBoardContainer.appendChild(this.stagingElement);

        // Removed playerInfoPanel per requirement - no bottom panel needed

        // Debug: log positions
        const boardRect = this.boardElement.getBoundingClientRect();
        const stagingRect = this.stagingElement.getBoundingClientRect();
        // const playerInfoRect = this.playerInfoElement.getBoundingClientRect(); // Removed per requirement
        const gameBoardContainerRect = this.gameBoardContainer.getBoundingClientRect();
        console.log('[gameView] board rect:', JSON.stringify(boardRect));
        console.log('[gameView] staging rect:', JSON.stringify(stagingRect));
        // console.log('[gameView] playerInfo rect:', JSON.stringify(playerInfoRect)); // Removed per requirement
        console.log('[gameView] gameBoardContainer rect:', JSON.stringify(gameBoardContainerRect));
        console.log('[gameView] DEBUG: Before computed style logs');
        console.log('[gameView] gameBoardContainer computed style:', window.getComputedStyle(this.gameBoardContainer).cssText);
        // console.log('[gameView] playerInfo computed style:', window.getComputedStyle(this.playerInfoElement).cssText); // Removed per requirement

        // Create the right column wrapper that will hold the dice, indicator, and commentary panel
        this.rightColumnWrapper = document.createElement('div');
        this.rightColumnWrapper.id = 'right-column-wrapper';
        // Set flex properties to take remaining space (matching original right-commentary-panel)
        this.rightColumnWrapper.style.flex = '1 1 auto';
        this.rightColumnWrapper.style.display = 'flex';
        this.rightColumnWrapper.style.flexDirection = 'column';
        console.log('[gameView] Created rightColumnWrapper with flex: 1 1 auto');

        // Create dice container
        this.diceElement = document.createElement('div');
        this.diceElement.id = 'dice-container';
        this.diceElement.style.width = '60px';
        this.diceElement.style.height = '60px';
        this.diceElement.style.backgroundSize = 'contain';
        this.diceElement.style.backgroundRepeat = 'no-repeat';
        this.diceElement.style.backgroundPosition = 'center';
        // Override any absolute positioning from CSS
        this.diceElement.style.position = 'static';
        console.log('[gameView] Created diceElement with position: static');

        // Add dice to the wrapper (turn indicator removed)
        this.rightColumnWrapper.appendChild(this.diceElement);

        // Now we need to insert the wrapper in place of the right-commentary-panel
        // First, remove the right-commentary-panel from the game container
        this.container.removeChild(this.rightCommentaryPanel);
        console.log('[gameView] Removed rightCommentaryPanel from container');

        // Then add the wrapper to the game container
        this.container.appendChild(this.rightColumnWrapper);
        console.log('[gameView] Added rightColumnWrapper to container');

        // Finally, add the right-commentary-panel to the wrapper (it will be the third child)
        this.rightColumnWrapper.appendChild(this.rightCommentaryPanel);
        console.log('[gameView] Added rightCommentaryPanel to rightColumnWrapper');
        
        // Ensure the commentary content can scroll and doesn't prevent the column from shrinking
        this.commentaryElement.style.minHeight = '0';
        // Ensure the commentary panel takes remaining space in the wrapper
        this.rightCommentaryPanel.style.flex = '1 1 auto';
        console.log('[gameView] Set commentaryElement minHeight: 0 and rightCommentaryPanel flex: 1 1 auto');

        // Create token elements (as children of container, absolutely positioned for game logic)
        for (let i = 0; i < 4; i++) {
            const token = document.createElement('div');
            token.className = `game-token player-${i}`;
            token.style.position = 'absolute';
            token.style.pointerEvents = 'none';
            token.style.backgroundSize = 'contain';
            token.style.backgroundRepeat = 'no-repeat';
            token.style.backgroundPosition = 'center';
            this.container.appendChild(token);
            this.tokenElements.push(token);
        }
        // Size tokens after all DOM is created
        this.sizeTokens();
        console.log("DOM creation complete");
    }

    loadAssets() {
        // Calculate total assets to load
        this.assetsTotalCount = 0; // no board image
        this.assetsTotalCount += 4; // tokens
        this.assetsTotalCount += 6; // dice faces
        this.assetsTotalCount += 1; // dice tumble sheet
        this.assetsTotalCount += 12; // audio events (roll, step, settle, ladder, snake, six, triple_six, turn, win, gameover, capture, enter)
        console.log(`[gameView] Total assets to load: ${this.assetsTotalCount}`);

        this.assetsLoadedCount = 0;

        // Set a timeout to hide loading overlay after 5 seconds if assets don't load
        this.loadingTimeout = setTimeout(() => {
            if (!this.isAssetsLoaded && !this.isAssetsHandled) {
                console.log("[gameView] Loading timeout: hiding overlay and enabling roll button");
                this.hideLoadingOverlay();
                this.enableRollButton();
                this.isAssetsHandled = true;
                // Start auto-play even if assets didn't load (maybe some failed)
                this.autoRoll();
            }
        }, 5000);

        // Load token images (assuming token_1.png to token_4.png)
        for (let i = 1; i <= 4; i++) {
            const img = new Image();
            img.onload = () => {
                this.assetLoaded();
                // Set the token image for the corresponding token element
                if (this.tokenElements[i-1]) {
                    this.tokenElements[i-1].style.backgroundImage = `url('${img.src}')`;
                }
            };
            img.onerror = this.assetError;
            img.src = `assets/images/tokens/token_${i}.png`;
            this.assets.tokens.push(img);
        }

        // Load dice faces
        for (let i = 1; i <= 6; i++) {
            const img = new Image();
            img.onload = this.assetLoaded;
            img.onerror = this.assetError;
            img.src = `assets/images/dice/dice_face_${i}.png`;
            this.assets.diceFaces.push(img);
        }

        // Load dice tumble sheet for animation
        const tumbleSheet = new Image();
        tumbleSheet.onload = this.assetLoaded;
        tumbleSheet.onerror = this.assetError;
        tumbleSheet.src = 'assets/images/dice/dice_tumble_sheet.png';
        this.assets.diceTumbleSheet = tumbleSheet;

        // Load audio files
        const audioEvents = ['roll', 'step', 'settle', 'ladder', 'snake', 'six', 'triple_six', 'turn', 'win', 'gameover', 'capture', 'enter'];
        audioEvents.forEach(event => {
            const audio = new Audio();
            audio.src = `assets/audio/${event}.ogg`;
            audio.preload = 'auto';
            audio.addEventListener('loadeddata', this.assetLoaded, { once: true });
            audio.addEventListener('error', this.assetError, { once: true });
            this.assets.audio[event] = audio;
        });
    }

    assetLoaded() {
        console.log("[gameView] assetLoaded called");
        this.assetsLoadedCount++;
        console.log(`[gameView] Asset loaded: ${this.assetsLoadedCount}/${this.assetsTotalCount}`);
        // Update loading overlay text to show progress and failed count
        if (this.loadingOverlay) {
            this.loadingOverlay.innerHTML = `Loading game assets... ${this.assetsLoadedCount}/${this.assetsTotalCount} (Failed: ${this.assetsFailedCount})`;
        }
        if (this.assetsLoadedCount >= this.assetsTotalCount) {
            console.log("[gameView] All assets loaded");
            this.isAssetsLoaded = true;
            // Clear the loading timeout since we loaded all assets
            if (this.loadingTimeout) {
                clearTimeout(this.loadingTimeout);
                this.loadingTimeout = null;
            }
            if (!this.isAssetsHandled) {
                this.isAssetsHandled = true;
                this.hideLoadingOverlay();
                // Probe autoplay policy
                if (!this.hasProbedAutoplay) {
                    this.hasProbedAutoplay = true;
                    this.probeAutoplay();
                }
                // Start auto-play after assets loaded
                // Also reset the game to ensure token positions are updated with loaded assets
                setTimeout(() => {
                    if (this.controller) {
                        this.controller.resetGame();
                    }
                    this.autoRoll();
                }, 0);
            }
        }
    }

    assetError(e) {
        console.log("[gameView] assetError called", e.target.src);
        const src = e.target.src;
        if (src && src.endsWith('ladder.ogg')) {
            console.warn(`[gameView] Failed to load asset: ${src}`, e);
        } else {
            console.error(`[gameView] Failed to load asset: ${src}`, e);
        }
        this.assetsFailedCount++;
        this.assetLoaded();   // count this asset as resolved
        // For debugging: set a visible background on token elements if this is a token image
        if (src && src.includes('tokens/')) {
            // Extract token number from src like .../token_3.png
            const match = src.match(/token_(\d+)\.png/);
            if (match) {
                const tokenIndex = parseInt(match[1], 10) - 1;
                if (this.tokenElements[tokenIndex]) {
                    this.tokenElements[tokenIndex].style.backgroundColor = 'rgba(255,0,0,0.5)';
                    console.log(`[gameView] Set debug background for token ${tokenIndex} due to load failure`);
                }
            }
        }
    }

    hideLoadingOverlay() {
        console.log("[gameView] Hiding loading overlay");
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'none';
        }
    }

    /**
     * Probe autoplay policy by trying to play a silent audio.
     * If allowed (resolved), we do nothing (button not shown).
     * If blocked (rejected), we show the start button to unlock audio via user gesture.
     */
    probeAutoplay() {
        // Use the first loaded audio asset, or create a temporary one if none are loaded yet.
        // We'll use the 'enter' sound if available, otherwise create a new Audio object.
        let audio = null;
        if (this.assets.audio && this.assets.audio.enter) {
            audio = this.assets.audio.enter;
        } else {
            audio = new Audio();
            audio.src = 'assets/audio/enter.ogg';
        }
        // Ensure we don't interfere with existing audio state: mute, reset, and try to play.
        const originalVolume = audio.volume;
        audio.volume = 0;
        audio.muted = true;
        audio.currentTime = 0;

        const playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    // Autoplay allowed (e.g., in kiosk with --autoplay-policy=no-user-gesture-required)
                    // We do not show the button. Reset the audio state.
                    audio.pause();
                    audio.currentTime = 0;
                    audio.volume = originalVolume;
                    audio.muted = false;
                })
                .catch(() => {
                    // Autoplay blocked (normal browser): show the button to unlock audio via user gesture.
                    this.showStartButton();
                    // Reset the audio state (we don't want to leave it in a clean state for later use )
                    audio.pause();
                    audio.currentTime = 0;
                    audio.volume = originalVolume;
                    audio.muted = false;
                });
        } else {
            // If play() returned undefined, treat as blocked (some browsers return undefined and then reject later?).
            // To be safe, we show the button.
            this.showStartButton();
            audio.pause();
            audio.currentTime = 0;
            audio.volume = originalVolume;
            audio.muted = false;
        }
    }

    /**
     * Show the start button as an overlay over the game container.
     */
    showStartButton() {
        // Append the button to the container (which is positioned relative)
        this.container.appendChild(this.startButtonElement);
    }

    /**
     * Handle button click: unlock audio and remove the button.
     * This satisfies the user-gesture requirement for audio playback.
     */
    _unlockAudioAndStart() {
        // Mark audio as unlocked
        this.isAudioUnlocked = true;
        
        // Play a sound to satisfy the user-gesture requirement (use the 'enter' sound if available)
        const audio = this.assets.audio.enter || new Audio('assets/audio/enter.ogg');
        audio.currentTime = 0;
        audio.play().catch(e => {
            console.warn(`[gameView] Failed to play audio for unlock:`, e);
        });
        
        // Remove the button from DOM
        if (this.startButtonElement.parentNode) {
            this.startButtonElement.parentNode.removeChild(this.startButtonElement);
        }
        
        console.log('[gameView] Audio unlocked via user interaction');
    }

    clearTimeouts() {
        if (this.autoRollTimeout) {
            clearTimeout(this.autoRollTimeout);
            this.autoRollTimeout = null;
        }
        if (this.gameOverTimeout) {
            clearTimeout(this.gameOverTimeout);
            this.gameOverTimeout = null;
        }
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            this.loadingTimeout = null;
        }
        // Clear any pending transition timeouts and listeners
        for (const [token, { listener, timeoutId }] of this.pendingTransitions) {
            token.removeEventListener('transitionend', listener);
            clearTimeout(timeoutId);
        }
        this.pendingTransitions.clear();
    }

    bindEvents() {
        // Roll button removed for fully automatic arena
    }
    
    enableRollButton() {
        // Roll button removed for fully automatic arena
        // This is a no-op but kept for compatibility
        console.log('[gameView] Roll button enabled (no-op in automatic mode)');
    }

    handleRollClick() {
        // Roll button removed for fully automatic arena - do nothing
    }

    // Auto-roll after a delay
    autoRoll() {
        // Clear any existing autoRoll and gameOver timeouts
        if (this.autoRollTimeout) {
            clearTimeout(this.autoRollTimeout);
            this.autoRollTimeout = null;
        }
        if (this.gameOverTimeout) {
            clearTimeout(this.gameOverTimeout);
            this.gameOverTimeout = null;
        }
        // If game over, handle restart
        if (this.model.isGameOver()) {
            this.handleGameOver();
            return;
        }
        // Check if we need to probe autoplay
        if (!this.hasProbedAutoplay) {
            this.hasProbedAutoplay = true;
            this.probeAutoplay();
            // If the button is now shown, we wait for the user to click it.
            if (this.startButtonElement.parentNode) {
                return;
            }
        }
        // Immediately roll dice
        this.controller.rollDice();
    }

    // Handle game over: show win, then after 10 sec restart
    handleGameOver() {
        this.clearTimeouts();
        this.playAudio('gameover');
        // Show win message (already shown by controller via onGameWin)
        // Wait 10 seconds then restart
        this.gameOverTimeout = setTimeout(() => {
            console.log("[gameView] Game over timeout: restarting");
            this.controller.resetGame();
            // After reset, start auto-play again
            this.autoRoll();
        }, 10000);
    }

    // Reset the game state for the view
    onReset() {
        this.clearTimeouts();
        this.moveId++;   // invalidate any in-flight animation
        this.debugLog(`onReset called, moveId=${this.moveId}`);
        this.commentaryBuffer = [];
        this.commentaryElement.textContent = '';
        // Reset dice to empty
        this.diceElement.style.backgroundImage = '';
        const activePlayer = this.model.getActivePlayer();
        // Reset tokens to staging (position 0) without animation
        for (let i = 0; i < this.model.NUM_PLAYERS; i++) {
            const pos = this.getTokenPositionFromTile(0, i);
            if (pos) {
                this.positionToken(i, 0, this.tokenElements[i]);
            }
        }
        // Reset previousPositions to all zeros
        this.previousPositions = [0,0,0,0];
        // Update player info to show active player
        this.updatePlayerInfo(activePlayer);
        // Ensure tokens are sized correctly
        this.sizeTokens();
        
        // Redraw snakes and ladders to match the newly generated board
        this.drawSnakesAndLadders();
        // Re-layout tile #1 occupants after reset
        this.relayoutTileOneOccupants();
    }

    // Handle extra roll (when a six is rolled and not three sixes)
    // Handle earning another roll after rolling a 6
    onExtraRoll() {
        // Play the six sound
        this.playAudio('six');
    }

    // Handle triple six penalty
    onTripleSixPenalty() {
        // Play the triple six sound
        this.playAudio('triple_six');
        // Turn indicator and commentary are updated in onStateChange
    }

    // Handle capture of an opponent's token
    onCapture(opponentId, finalPos) {
        // Store capture info for delayed processing
        this.pendingCaptureOpponentId = opponentId;
        this.pendingCaptureTile = finalPos;
        // Do NOT play capture sound here
    }

    onGameWin(playerId) {
        // Play the win sound
        this.playAudio('win');
        // The win commentary is generated in onStateChange via generateCommentary.
        // This method is required by the contract but does not need to contain any logic.
    }

    // Update the board background color
    updateBoardBackground() {
        this.boardElement.style.backgroundColor = '#f8f9fa';
    }

    // Note: The old tileToPosition function has been removed.
    // We now use getTokenPositionFromTile for pixel-based positioning.

    // Update token positions based on model state - now handles animation
    async onStateChange() {
        const currentMoveId = ++this.moveId;
        // SNAPSHOT: Capture all turn-specific data needed for animation and proceed BEFORE any await
        // This prevents reading shared mutable state after awaits which could belong to a different turn
        const lastRoll = this.model.getLastRoll();
        const lastTurnRecord = this.model.getLastTurnRecord();
        const consecutiveSixes = this.model.getConsecutiveSixes();
        const lastMover = this.model.getLastMover();
        const activePlayer = this.model.getActivePlayer();
        this.debugLog(`Entering onStateChange: moveId=${currentMoveId}, lastRoll=${lastRoll}, activePlayer=${activePlayer}`);
        this.debugLog(`Snapshot lastTurnRecord: ${JSON.stringify(lastTurnRecord)}`);
        this.debugLog(`After snapshot log`);

        // Update dice ring color to show whose turn it is
        let diceBorderColor;
        switch (lastMover) {
            case 0: diceBorderColor = '#e74c3c'; break; // Red
            case 1: diceBorderColor = '#3498db'; break; // Blue
            case 2: diceBorderColor = '#2ecc71'; break; // Green
            case 3: diceBorderColor = '#f1c40f'; break; // Yellow
            default: diceBorderColor = '#ccc';
        }
        this.diceElement.style.border = `2px solid ${diceBorderColor}`;
        this.debugLog(`Before dice animation, lastRoll=${lastRoll}`);
        // Update dice display with tumble animation
        if (lastRoll >= 1 && lastRoll <= 6) {
            // Log dice tumble start
            console.log(`[gameView] dice tumble start at ${Date.now()}`);
            
            await this.animateDiceRoll(lastRoll);
            // Log after dice animation
            this.debugLog(`After dice animation, lastRoll=${lastRoll}`);
        } else {
            // Non-animated case (no roll or invalid roll)
            this.diceElement.style.backgroundImage = '';
            // Log dice settled for non-animated case
            this.debugLog(`Non-animated dice case, lastRoll=${lastRoll}`);
            console.log(`[gameView] dice settled on face ${lastRoll} at ${Date.now()}`);
        }

        // Wait 500ms with nothing moving
        this.debugLog(`Before 500ms wait`);
        await new Promise(resolve => setTimeout(resolve, 500));
        this.debugLog(`After 500ms wait`);

        // Log piece move start
        console.log(`[gameView] piece move start at ${Date.now()}`);

        // Update turn indicator to show whose roll is being processed (matches dice)
    // Turn indicator removed - no longer needed

        // Now, animate the tokens that have changed
        const currentPositions = [];
        for (let i = 0; i < this.model.NUM_PLAYERS; i++) {
            currentPositions.push(this.model.getPlayerPosition(i));
        }
        console.log('[gameView] currentPositions:', currentPositions);

        // Size tokens based on board width after first layout
        this.sizeTokens();

        let animationPromises = [];
        for (let i = 0; i < this.model.NUM_PLAYERS; i++) {
            // Skip animating the captured opponent token in this batch; it will be handled later
            if (this.pendingCaptureOpponentId !== null && i === this.pendingCaptureOpponentId && 
                currentPositions[i] === 0 && this.previousPositions[i] === this.pendingCaptureTile) {
                continue;
            }
            
            if (currentPositions[i] !== this.previousPositions[i]) {
                console.log(`[gameView] animating token ${i} from ${this.previousPositions[i]} to ${currentPositions[i]}`);
                
                // CREATE MOVE OBJECT: Snapshot all data needed for this token's animation
                const move = {
                    playerId: i,
                    from: this.previousPositions[i],
                    to: currentPositions[i],
                    lastTurnRecord: lastTurnRecord,
                    lastRoll: lastRoll,
                    lastMover: lastMover,
                    consecutiveSixes: consecutiveSixes,
                    intermediatePos: this.model.getLastMoveIntermediatePosition(),
                    moveId: currentMoveId
                };
                
                const promise = this.animateTokenMove(move);
                animationPromises.push(promise);
            }
        }

        // Update previous positions
        this.previousPositions = [...currentPositions];

        // Async post-animation handler
        async function handlePostAnimation() {
            
            this.debugLog(`handlePostAnimation called: moveId=${this.moveId}, lastRoll=${lastRoll}, activePlayer=${activePlayer}`);
            
            // Update player info to show whose turn is next after movement completes
            let activePlayerToShow;
            if (lastRoll === 6 && consecutiveSixes > 0) {
                // Extra roll situation: same player gets another turn
                activePlayerToShow = lastMover;
            } else {
                // Turn advanced: next player gets turn
                activePlayerToShow = activePlayer;
            }
            // Update player info panel to show next player (for highlighting in panel) - removed per requirement
            // this.updatePlayerInfo(activePlayerToShow);
            
            // Re-layout tile #1 occupants after move settles
            this.relayoutTileOneOccupants();
            
            // Generate commentary for the turn that just completed
            this.generateCommentary();
            
            // Handle pending capture if any
            if (this.pendingCaptureOpponentId !== null) {
                this.debugLog(`Handling pending capture for opponent ${this.pendingCaptureOpponentId} from tile ${this.pendingCaptureTile}`);
                // Play the capture sound
                this.playAudio('capture');
                // Animate the opponent token from the pendingCaptureTile to tile 0 (staging)
                await this._animateDirectMove(this.pendingCaptureTile, 0, this.pendingCaptureOpponentId);
                // Check if this is still the current move after the await (in case a new turn started during the animation)
                if (this.moveId !== currentMoveId) {
                    // Do not clear the pending capture variables as they belong to a newer turn
                    return;
                }
                // Clear the pending capture variables only if we are still the current turn
                this.pendingCaptureOpponentId = null;
                this.pendingCaptureTile = null;
            }
            
            // Schedule the next autoRoll with a 900ms delay only if we are still the current turn
            if (this.moveId === currentMoveId) {
                if (this.autoRollTimeout) {
                    clearTimeout(this.autoRollTimeout);
                }
                this.debugLog(`autoRoll scheduled for moveId=${this.moveId} in 900ms after turn with lastRoll=${lastRoll}, activePlayer=${activePlayer}`);
                this.autoRollTimeout = setTimeout(() => {
                    this.autoRoll();
                }, 900);
            } else {
                this.debugLog(`Not scheduling autoRoll because moveId changed (current moveId=${this.moveId}, expected=${currentMoveId})`);
            }
        }

        // Single-fire guard for autoRoll
        let settled = false;
        const proceed = () => {
            this.debugLog(`proceed called (at beginning): moveId=${this.moveId}`);
            if (settled) return;
            // We always want to handle post-animation for the turn that just completed,
            // even if a new turn has started during the animation wait.
            this.debugLog(`proceed called: moveId=${this.moveId}, lastRoll=${lastRoll}, activePlayer=${activePlayer}`);
            settled = true;
            handlePostAnimation.call(this);
        };

        this.debugLog(`animationPromises length: ${animationPromises.length}`);
        if (animationPromises.length === 0) {
            this.debugLog(`animationPromises is empty, calling proceed`);
            proceed();
            return;
        }

        // Wait for all animations to complete
        Promise.all(animationPromises).then(() => {
            proceed();
        }).catch((error) => {
            console.error('[gameView] Animation error:', error);
            proceed();
        });
    }

    // Resize tokens when window changes size
    onWindowResize() {
        this.sizeTokens();
        this.drawSnakesAndLadders();
        this.relayoutTileOneOccupants();
    }

    // Animates a token move. Returns a promise that resolves when the animation completes.
    async animateTokenMove(move) {
        console.log(`[gameView] animateTokenMove called for player ${move.playerId} to position ${move.to}`);
        // Check if there is no movement needed
        const previousPosition = move.from;
        const newPosition = move.to;
        if (previousPosition === newPosition) {
            // No movement, so we don't need to animate or play sounds.
            console.log(`[gameView] no movement needed for player ${move.playerId}`);
            return Promise.resolve();
        }

        // Determine if this is a step-by-step move (active player's normal move)
        const dieRoll = move.lastRoll;
        const isMover = move.playerId === move.lastMover;
        // Use snapshotted intermediate position (already captured in onStateChange)
        const intermediatePos = move.intermediatePos;
        const hasJump = (intermediatePos !== previousPosition && intermediatePos !== newPosition) &&
            (this.model.Ladders.has(intermediatePos) || this.model.Snakes.has(intermediatePos));

        // We will animate step-by-step only if:
        //   - the player is the active player
        //   - the move is caused by a die roll (intermediatePos differs from previousPosition)
        //   - and we are not in the special case of leaving staging (0->1) which uses direct move
        const isStepByStep = isMover &&
            ((previousPosition === 0 && newPosition === 1) || // leaving staging
             (previousPosition > 0 && intermediatePos !== previousPosition)); // any move based on die roll
             
        // SPECIAL CASE: Entry moves (0->1) should not do tile-by-tile walk, use direct move instead
        const isEntryMove = (previousPosition === 0 && newPosition === 1);
        const shouldDoStepByStepWalk = isStepByStep && !isEntryMove;

        if (shouldDoStepByStepWalk) {
            await this._animateStepByStep(previousPosition, newPosition, move.playerId, dieRoll, intermediatePos, move.lastTurnRecord, undefined, undefined, undefined, undefined, move.moveId);
        } else {
            this.playAudio('enter');
            await this._animateDirectMove(previousPosition, newPosition, move.playerId);
        }
    }
    
    
    // Animates a move step-by-step along the board, then along the jump path if applicable.
    // Animates a move step-by-step along the board, then along the jump path if applicable.
    async _animateStepByStep(startTile, endTile, playerId, dieRoll, intermediatePos, lastTurnRecord, isIntermediatePosLadderStart, isIntermediatePosSnakeStart, isEndTileLadderStart, isEndTileSnakeStart, moveId) {
        console.log(`[gameView] _animateStepByStep from ${startTile} to ${endTile} for player ${playerId}`);
        const token = this.tokenElements[playerId];
        // Determine if there is a jump based on the SNAPSHOTTED last turn record
        let jumpStart = intermediatePos;
        let jumpEnd = endTile;
        let hasJump = false;
        if (lastTurnRecord && 
            (lastTurnRecord.event === 'ladder' || lastTurnRecord.event === 'snake') &&
            lastTurnRecord.mover === playerId) {
            jumpStart = lastTurnRecord.landed;
            jumpEnd = lastTurnRecord.to;
            hasJump = (jumpStart !== jumpEnd);
        } else {
            // Fallback to the old method if no record or not a jump
            hasJump = (intermediatePos !== startTile && intermediatePos !== endTile) &&
                (isIntermediatePosLadderStart || isIntermediatePosSnakeStart);
        }

        // Determine if jumpStart is the start of a ladder or snake for sound effects
        const isJumpStartLadderStart = (lastTurnRecord && 
            lastTurnRecord.event === 'ladder' && 
            lastTurnRecord.mover === playerId) ||
            (!(lastTurnRecord && 
                lastTurnRecord.event === 'ladder' && 
                lastTurnRecord.mover === playerId) &&
            isIntermediatePosLadderStart);
            
        const isJumpStartSnakeStart = (lastTurnRecord && 
            lastTurnRecord.event === 'snake' && 
            lastTurnRecord.mover === playerId) ||
            (!(lastTurnRecord && 
                lastTurnRecord.event === 'snake' && 
                lastTurnRecord.mover === playerId) &&
            isIntermediatePosSnakeStart);

        // Part 1: move from startTile to jumpStart one tile at a time
        // GUARD THE DIRECTION: A tile-by-tile walk is only meaningful forward
        let current = startTile;
        let steps = 0;
        if (jumpStart < startTile) {
            console.warn(`[gameView] jumpStart (${jumpStart}) < startTile (${startTile}) - not walking backwards`);
            // Log the case for investigation
            console.warn(`[gameView] Investigation: startTile=${startTile}, endTile=${endTile}, playerId=${playerId}, dieRoll=${dieRoll}, intermediatePos=${intermediatePos}`);
            if (lastTurnRecord) {
                console.warn(`[gameView] lastTurnRecord:`, lastTurnRecord);
            }
            // Place token directly at jumpStart since we're not walking
            current = jumpStart;
        } else {
            // BOUND THE LOOP: Even with the guard, never let it run free
            // Twelve is more than any legal single move
            while (current !== jumpStart && current < 100 && steps++ < 12) {
                if (this.moveId !== moveId) return;
                // Determine next tile: since we are moving forward, next = current + 1
                const nextTile = current + 1;
                console.log(`[gameView] hop from ${current} to ${nextTile} start`);
                // Move token to nextTile
                const pos = this.getTokenPositionFromTile(nextTile, playerId);
                if (!pos) {
                    console.error(`[gameView] Could not compute position for tile ${nextTile}`);
                    break;
                }
                this.positionToken(playerId, nextTile, token);
                // Play step sound for each hop with volume based on tile number
                const stepAudio = this.assets.audio.step;
                if (stepAudio) {
                    // Linear volume from 0.2 at tile 1 to 1.0 at tile 100
                    stepAudio.volume = 0.2 + (nextTile - 1) * (0.8 / 99);
                    stepAudio.currentTime = 0;
                    stepAudio.play().catch(e => {
                        console.warn(`[gameView] Failed to play step audio:`, e);
                    });
                } else {
                    console.warn(`[gameView] Step audio not found`);
                }
                // Wait for a short duration (150-250ms)
                await this._delay(200); // fixed 200ms for now, can be random
                current = nextTile;
            }
            
            // Check if we exited due to bounds
            if (current !== jumpStart) {
                console.error(`[gameView] _animateStepByStep loop bounded! startTile=${startTile}, jumpStart=${jumpStart}, endTile=${endTile}, steps=${steps}`);
                console.error(`[gameView] Placing token directly at jumpStart=${jumpStart}`);
                // Place token directly at destination so the arena keeps running
                const pos = this.getTokenPositionFromTile(jumpStart, playerId);
                if (pos) {
                    this.setTokenPositionFromPixel(pos.x, pos.y, token);
                }
                current = jumpStart; // Set current to jumpStart to continue with jump logic
            }
        }

        // Pause at the landing tile (jumpStart) before jumping
        console.log(`[gameView] pausing at landing tile ${jumpStart} for ${GameView.PAUSE_DURATION}ms`);
        await this._delay(GameView.PAUSE_DURATION);
        console.log(`[gameView] landing pause end`);
        // Bail out if a newer turn or reset invalidated this walk
        if (this.moveId !== moveId) return;

        // Part 2: if there is a jump, follow the SVG path from jumpStart to jumpEnd
        if (hasJump) {
            // Bail out if a newer turn or reset invalidated this walk
            if (this.moveId !== moveId) return;
            console.log(`[gameView] has jump from ${jumpStart} to ${jumpEnd}`);
            // Find the SVG path element for this jump
            const pathSelector = `[data-jump="${jumpStart}-${jumpEnd}"]`;
            const path = this.svgElement.querySelector(pathSelector);
            if (!path) {
                console.error(`[gameView] SVG path not found for jump ${jumpStart}-${jumpEnd}`);
                // Fallback: direct move
                const pos = this.getTokenPositionFromTile(jumpEnd, playerId);
                if (pos) {
                    this.setTokenPositionFromPixel(pos.x, pos.y, token);
                }
                // Play the appropriate sound based on the jumpStart (which is the landed position)
                this.playAudio(isJumpStartLadderStart ? 'ladder' : 'snake');
                await this._delay(100); // small delay to simulate sound
            } else {
                // Animate along the path
                const length = path.getTotalLength();
                // We'll animate from t=0 to t=1 over 600-900ms
                const duration = Math.random() * 300 + 600; // 600-900ms
                const startTime = performance.now();
                // Play the appropriate sound
                this.playAudio(isJumpStartLadderStart ? 'ladder' : 'snake');
                // Prepare for pixel-based positioning: suppress CSS transition during path animation
                const containerRect = this.container.getBoundingClientRect();
                const boardRect = this.boardElement.getBoundingClientRect();
                const boardLeft = boardRect.left - containerRect.left;
                const boardTop = boardRect.top - containerRect.top;
                const boardWidth = boardRect.width;
                const boardHeight = boardRect.height;
                const originalTransition = token.style.transition;
                token.style.transition = 'none';
                // Animation loop
                await new Promise((resolve, reject) => {
                    // Create SVG point once for reuse
                    const pt = this.svgElement.createSVGPoint();
                    let animationFinished = false;
                    let rafId = null;
                    const timeoutId = setTimeout(() => {
                        if (!animationFinished) {
                            animationFinished = true;
                            if (rafId) cancelAnimationFrame(rafId);
                            // Restore transition
                            token.style.transition = originalTransition;
                            resolve();
                        }
                    }, duration + 100);
                    const step = (timestamp) => {
                        if (this.moveId !== moveId) {
                            animationFinished = true;
                            if (rafId) cancelAnimationFrame(rafId);
                            clearTimeout(timeoutId);
                            // Restore transition
                            token.style.transition = originalTransition;
                            resolve();
                            return;
                        }
                        if (animationFinished) {
                            // already timed out, just return
                            return;
                        }
                        const elapsed = timestamp - startTime;
                        const t = Math.min(elapsed / duration, 1);
                        const point = path.getPointAtLength(t * length);
                        // point.x and point.y are in viewBox coordinates (0-100)
                        const x_vb = point.x;
                        const y_vb = point.y;
                        // Convert viewBox point to container-relative pixels
                        const pixelX = boardLeft + (x_vb / 100) * boardWidth;
                        const pixelY = boardTop + (y_vb / 100) * boardHeight;
                        this.setTokenPositionFromPixel(pixelX, pixelY, token);
                        if (t < 1) {
                            rafId = requestAnimationFrame(step);
                        } else {
                            animationFinished = true;
                            clearTimeout(timeoutId);
                            // Restore transition
                            token.style.transition = originalTransition;
                            resolve();
                        }
                    };
                    rafId = requestAnimationFrame(step);
                });
                console.log(`[gameView] traversal end`);
            }
        } else {
            // No jump, we are already at jumpStart (which equals jumpEnd)
            console.log(`[gameView] no jump, jumpStart=${jumpStart} equals jumpEnd=${jumpEnd}`);
            // But we need to move the token to the endTile position (if not already there)
            const pos = this.getTokenPositionFromTile(endTile, playerId);
            if (pos) {
                this.setTokenPositionFromPixel(pos.x, pos.y, token);
            }
        }

        // Play settle sound after reaching the destination tile
        this.playAudio('settle');

        // Pause at the destination tile before finishing
        console.log(`[gameView] pausing at destination tile ${endTile} for ${GameView.PAUSE_DURATION}ms`);
        await this._delay(GameView.PAUSE_DURATION);
        console.log(`[gameView] destination pause end`);
        console.log(`[gameView] move complete at ${Date.now()}`);

        // Update classes for staging/board (optional, keeps existing behavior)
        if (endTile === 0) {
            token.classList.add('return-to-staging');
            token.classList.remove('move-to-board');
        } else {
            token.classList.remove('return-to-staging');
            // Add move-to-board class when re-entering from staging (position was 0 previously)
            if (startTile === 0) {
                token.classList.add('move-to-board');
            } else {
                token.classList.remove('move-to-board');
            }
        }
    }

    // Animates a direct move using CSS transition (for non-step-by-step moves).
    // Returns a promise that resolves when the transition ends or after a fallback timeout.
    _animateDirectMove(startTile, endTile, playerId) {
        console.log(`[gameView] _animateDirectMove from ${startTile} to ${endTile} for player ${playerId}`);
        console.log(`[gameView] direct move start`);
        return new Promise((resolve) => {
            const token = this.tokenElements[playerId];
            const startPos = this.getTokenPositionFromTile(startTile, playerId);
            const endPos = this.getTokenPositionFromTile(endTile, playerId);
            if (!startPos || !endPos) {
                if (!startPos && !endPos) {
                    console.error(`[gameView] Could not compute start or end position for direct move: startTile=${startTile}, endTile=${endTile}, playerId=${playerId}`);
                } else if (!startPos) {
                    console.error(`[gameView] Could not compute start position for direct move: startTile=${startTile}, endTile=${endTile}, playerId=${playerId}`);
                } else {
                    console.error(`[gameView] Could not compute end position for direct move: startTile=${startTile}, endTile=${endTile}, playerId=${playerId}`);
                }
                // Fallback: if we can compute the end position, set the token there (without animation)
                if (endPos) {
                    this.positionToken(playerId, endTile, token);
                    console.log(`[gameView] move complete at ${Date.now()}`);
                }
                resolve();
                return;
            }

            // Set initial position
            this.positionToken(playerId, startTile, token);
            // Trigger reflow to ensure the transition works
            void token.offsetHeight;
            // Set end position (CSS transition will animate the change)
            this.positionToken(playerId, endTile, token);

            // If there is a pending transition for this token, clean it up
            const pending = this.pendingTransitions.get(token);
            if (pending) {
                token.removeEventListener('transitionend', pending.listener);
                clearTimeout(pending.timeoutId);
                this.pendingTransitions.delete(token);
            }

            const FALLBACK_TIME = 1000; // 1 second fallback
            const onTransitionEnd = () => {
                // Clear fallback timeout
                clearTimeout(timeoutId);
                // Clean up pending entry
                this.pendingTransitions.delete(token);

                // Play settle sound
                this.playAudio('settle');

                // Check for ladder or snake at the end position (if applicable)
                if (this.model.Ladders.has(endTile)) {
                    this.playAudio('ladder');
                } else if (this.model.Snakes.has(endTile)) {
                    this.playAudio('snake');
                }

                console.log(`[gameView] move complete at ${Date.now()}`);
                resolve();
            };

            const onTimeout = () => {
                // Remove transitionend listener if still present
                token.removeEventListener('transitionend', onTransitionEnd);
                // Clean up pending entry
                this.pendingTransitions.delete(token);

                console.log(`[gameView] direct move fallback triggered after ${FALLBACK_TIME}ms`);
                // Play settle sound
                this.playAudio('settle');
                // Check for ladder or snake at the end position (if applicable)
                if (this.model.Ladders.has(endTile)) {
                    this.playAudio('ladder');
                } else if (this.model.Snakes.has(endTile)) {
                    this.playAudio('snake');
                }
                resolve();
            };

            const timeoutId = setTimeout(onTimeout, FALLBACK_TIME);
            this.pendingTransitions.set(token, { listener: onTransitionEnd, timeoutId });

            token.addEventListener('transitionend', onTransitionEnd);
        });
    }

    // Update dice display
    updateDice(face) {
        // Static dice face
        this.diceElement.style.backgroundImage = `url('${this.assets.diceFaces[face-1].src}')`;
        this.diceElement.style.backgroundSize = 'contain';
        this.diceElement.style.backgroundRepeat = 'no-repeat';
        this.diceElement.style.backgroundPosition = 'center';
    }

    // Play dice roll animation (tumble) and then show the result
    animateDiceRoll(face, callback) {
        this.debugLog(`animateDiceRoll START: face=${face}, callback=${!!callback}`);
        // Play roll sound
        this.playAudio('roll');

        console.log(`[gameView] animateDiceRoll START: face=${face}, callback=${!!callback}`);

        // Check if tumble sheet is loaded
        this.debugLog(`Checking if tumble sheet is loaded: this.assets.diceTumbleSheet=${this.assets.diceTumbleSheet}, complete=${this.assets.diceTumbleSheet?.complete}`);
        if (!this.assets.diceTumbleSheet || !this.assets.diceTumbleSheet.complete) {
            // Fallback to static face if tumble sheet not ready
            this.debugLog(`Tumble sheet not ready, using fallback for face ${face}`);
            try {
                this.updateDice(face);
            } catch (e) {
                console.error(`[gameView] Error in fallback updateDice:`, e);
                // Last resort: try to set it directly
                try {
                    this.diceElement.style.backgroundImage = `url('${this.assets.diceFaces[face-1].src}')`;
                    this.diceElement.style.backgroundSize = 'contain';
                    this.diceElement.style.backgroundRepeat = 'no-repeat';
                    this.diceElement.style.backgroundPosition = 'center';
                } catch (e2) {
                    console.error(`[gameView] Fallback also failed:`, e2);
                    // Last resort: blank it out
                    this.diceElement.style.backgroundImage = '';
                }
            }
            // Log dice settled for fallback case
            console.log(`[gameView] dice settled on face ${face} at ${Date.now()}`);
            if (callback) callback();
            // Return a promise that resolves immediately for fallback case
            return Promise.resolve();
        }

        // Play tumble animation by scaling the sprite sheet to the element size
        const tumbleSheet = this.assets.diceTumbleSheet;
        this.debugLog(`this.assets.diceTumbleSheet=${tumbleSheet}`);
        // Get the cell size from the dice element (assumes square)
        const cell = this.diceElement.getBoundingClientRect().width;
        this.debugLog(`this.diceElement.getBoundingClientRect().width=${cell}`);
        const frames = 12; // number of frames in the tumble sheet (1536px / 128px)
        let currentFrame = 0;
        let startTime;
        const duration = 1000; // 1 second for tumble animation

        // Return a promise that resolves when the animation settles
        return new Promise((resolve) => {
            this.debugLog(`Starting tumble animation promise`);
            // Timeout fallback: resolve after 1200ms if animation doesn't complete naturally
            const timeoutId = setTimeout(() => {
                this.debugLog(`animateDiceRoll timeout fallback triggered`);
                resolve();
            }, 1200);
            const animate = (timestamp) => {
                this.debugLog(`animate called with timestamp=${timestamp.toFixed(0)}`);
                if (startTime === undefined) {
                    startTime = timestamp;
                }
                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const frame = Math.floor(progress * frames);
                
                // Log first few frames and last few frames to debug timing
                if (frame < 5 || frame >= frames - 5) {
                    console.log(`[dice] ts=${timestamp.toFixed(0)} startTime=${startTime.toFixed(0)} elapsed=${elapsed.toFixed(0)} progress=${progress.toFixed(3)} frame=${frame}/${frames}`);
                }
                
                // Check if animation has completed (with small epsilon for timing imprecisions)
                const isComplete = frame >= frames - 1;
                if (isComplete) {
                    this.debugLog(`Entering completion condition: frame=${frame}, frames-1=${frames-1}`);
                    // Clear timeout on natural completion
                    clearTimeout(timeoutId);
                    // Animation ended, show final face
                    try {
                        this.updateDice(face);
                        console.log(`[gameView] animateDiceRoll: updateDice called with face ${face}`);
                    } catch (e) {
                        console.error(`[gameView] Error updating dice to settled face:`, e);
                        // Fallback: try to set it directly
                        try {
                            this.diceElement.style.backgroundImage = `url('${this.assets.diceFaces[face-1].src}')`;
                            this.diceElement.style.backgroundSize = 'contain';
                            this.diceElement.style.backgroundRepeat = 'no-repeat';
                            this.diceElement.style.backgroundPosition = 'center';
                        } catch (e2) {
                            console.error(`[gameView] Fallback also failed:`, e2);
                            // Last resort: blank it out
                            this.diceElement.style.backgroundImage = '';
                        }
                    }
                    // Log dice settled
                    console.log(`[gameView] dice settled on face ${face} at ${Date.now()}`);
                    if (callback) callback();
                    resolve();
                    return;
                }
                const isSchedulingAnotherFrame = true; // We are about to schedule another frame unless we return above
                // Log the required details
                this.debugLog(`animate: timestamp=${timestamp}, startTime=${startTime}, elapsed=${elapsed}, progress=${progress}, frame=${frame}, currentFrame=${currentFrame}, schedulingAnotherFrame=${isSchedulingAnotherFrame}`);
                if (frame !== currentFrame) {
                    currentFrame = frame;
                    const offset = -currentFrame * cell;
                    this.diceElement.style.backgroundImage = `url('${tumbleSheet.src}')`;
                    this.diceElement.style.backgroundPosition = `${offset}px 0`;
                    this.diceElement.style.backgroundSize = `${frames * cell}px ${cell}px`;
                    this.diceElement.style.backgroundRepeat = 'no-repeat';
                }
                requestAnimationFrame(animate);
                this.debugLog('animate end');
            };
            requestAnimationFrame(animate);
        });
    }

    // Play audio
    playAudio(event) {
        const audio = this.assets.audio[event];
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => {
                console.warn(`[gameView] Failed to play audio ${event}:`, e);
            });
        } else {
            console.warn(`[gameView] Audio not found for event: ${event}`);
        }
    }

    // Generate commentary for the turn that just completed
    generateCommentary() {
        const record = this.model.getLastTurnRecord();
        this.debugLog(`generateCommentary: record = ${JSON.stringify(record)}, will return early: ${!record}`);
        if (!record) return;

        // Format the commentary text
        const playerNum = record.mover + 1; // Convert to 1-indexed for display
        let text = `Player ${playerNum} rolled a ${record.roll}`;

        switch (record.event) {
            case 'no_move':
                text += ` but couldn't move from ${record.from}`;
                break;
            case 'move':
                if (record.from === 0 && record.to === 1) {
                    text += ` and entered the board at tile 1`;
                } else {
                    text += ` and moved from tile ${record.from} to ${record.to}`;
                }
                break;
            case 'ladder':
                text += ` and climbed a ladder from ${record.landed} to ${record.to}!`;
                break;
            case 'snake':
                text += ` but landed on a snake at ${record.landed} and slid down to ${record.to}!`;
                break;
            case 'capture':
                const capturedPlayerNum = record.captured + 1;
                text += ` and captured Player ${capturedPlayerNum}'s token!`;
                break;
            case 'win':
                text += ` and reached tile 100! Player ${playerNum} wins!`;
                break;
            case 'triple_six':
                text += ` but rolled three consecutive sixes! All tokens returned to start.`;
                break;
            default:
                text += ` and moved from ${record.from} to ${record.to}`;
        }

        // Debug log
        console.log('generateCommentary record:', record);
        console.log('generateCommentary formatted text:', text);

        // Create commentary line element
        const line = document.createElement('div');
        line.style.marginBottom = '4px';
        line.style.padding = '2px 4px';
        line.style.borderRadius = '2px';
        line.style.fontSize = '12px';
        line.style.lineHeight = '1.4';

        // Determine player color
        const playerColors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];
        const playerColor = playerColors[record.mover] || '#ffffff';
        line.style.borderLeft = `3px solid ${playerColor}`;

        line.textContent = text;
        
        // Add to commentary buffer and limit size
        this.commentaryBuffer.push(line);
        if (this.commentaryBuffer.length > this.maxCommentaryLines) {
            const removedLine = this.commentaryBuffer.shift();
            this.commentaryElement.removeChild(removedLine);
        }
        
        // Add new line to commentary element
        this.commentaryElement.appendChild(line);
        
        // Auto-scroll to bottom
        this.commentaryElement.scrollTop = this.commentaryElement.scrollHeight;
    }

    // Update player info panel to show next player (for highlighting in panel)
    updatePlayerInfo(activePlayerToShow) {
        // Guard clause: if playerInfoElement doesn't exist, exit early
        if (!this.playerInfoElement) return;
        // Clear the player info element
        this.playerInfoElement.innerHTML = '';
        
        // Create a container for the player info
        const playerInfoContainer = document.createElement('div');
        playerInfoContainer.style.display = 'flex';
        playerInfoContainer.style.flexDirection = 'row';
        playerInfoContainer.style.gap = '8px';
        playerInfoContainer.style.width = '100%';
        playerInfoContainer.style.alignItems = 'flex-start';
        
        // Add info for each player
        for (let i = 0; i < this.model.NUM_PLAYERS; i++) {
            const playerContainer = document.createElement('div');
            playerContainer.style.display = 'flex';
            playerContainer.style.flexDirection = 'column';
            playerContainer.style.alignItems = 'center';
            playerContainer.style.flex = '1 1 0';
            playerContainer.style.height = '56px';
            
            // Add player token image
            if (this.assets.tokens[i]) {
                const tokenImg = document.createElement('div');
                tokenImg.style.width = '24px';
                tokenImg.style.height = '24px';
                tokenImg.style.backgroundImage = `url('${this.assets.tokens[i].src}')`;
                tokenImg.style.backgroundSize = 'contain';
                tokenImg.style.backgroundRepeat = 'no-repeat';
                tokenImg.style.backgroundPosition = 'center';
                tokenImg.style.marginBottom = '2px';
                tokenImg.style.flexShrink = '0';
                playerContainer.appendChild(tokenImg);
            }
            
            // Add player number
            const playerNumber = document.createElement('div');
            playerNumber.textContent = `P${i + 1}`;
            playerNumber.style.fontSize = '12px';
            playerNumber.style.fontWeight = 'bold';
            playerNumber.style.color = '#fff';
            playerNumber.style.marginBottom = '4px'; // Add space between number and tile
            playerNumber.style.flexShrink = '0';
            playerNumber.style.lineHeight = '1.2';
            playerContainer.appendChild(playerNumber);
            
            // Add current tile position
            const playerPosition = document.createElement('div');
            const position = this.model.getPlayerPosition(i);
            playerPosition.textContent = `Tile ${position}`;
            playerPosition.style.fontSize = '10px';
            playerPosition.style.color = '#ccc';
            playerPosition.style.flexShrink = '0';
            playerPosition.style.lineHeight = '1.2';
            playerContainer.appendChild(playerPosition);
            
            // Highlight active player
            if (i === activePlayerToShow) {
                playerContainer.style.border = '2px solid #ffeb3b';
                playerContainer.style.borderRadius = '4px';
                playerContainer.style.padding = '4px';
                playerContainer.style.backgroundColor = 'rgba(255, 235, 59, 0.2)';
            }
            
            playerInfoContainer.appendChild(playerContainer);
        }
        
        // Add the container to the player info element
        this.playerInfoElement.appendChild(playerInfoContainer);
    }

    // Size tokens based on board width
    sizeTokens() {
        // Set token size to 30px by 30px
        const tokenSize = 30; // pixels
        console.log(`[gameView] sizeTokens: setting token size to ${tokenSize}px`);
        for (const token of this.tokenElements) {
            token.style.width = tokenSize + 'px';
            token.style.height = tokenSize + 'px';
            console.log(`[gameView] token ${this.tokenElements.indexOf(token)} width: ${token.style.width}, height: ${token.style.height}`);
        }
    }

    // Re-layout all occupants of tile #1 after a move settles or on reset
    relayoutTileOneOccupants() {
        const playersOnTileOne = this.getPlayersOnTileOne();
        // Re-position each player currently on tile #1
        for (const playerId of playersOnTileOne) {
            this.positionToken(playerId, 1, this.tokenElements[playerId]);
        }
    }

    // Create an SVG group for a snake head, positioned at (cx, cy) and facing in the direction (ux, uy)
    _createHeadElement(cx, cy, ux, uy, size = 1.0) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const angle = Math.atan2(uy, ux); // in radians
        group.setAttribute('transform', `translate(${cx},${cy}) rotate(${angle * 180 / Math.PI})`);

        // Head base: circle - scaled by size
        const headCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        headCircle.setAttribute('cx', 0);
        headCircle.setAttribute('cy', 0);
        headCircle.setAttribute('r', 3 * size); // Set to 3 as required, scaled
        headCircle.setAttribute('fill', '#e74c3c'); // Changed from #111 to red for better visibility
        group.appendChild(headCircle);

        // Eyes: two circles - scaled by size
        const eyeOffsetX = 2 * size;
        const eyeOffsetY = 1 * size;
        const eyeRadius = 1.2 * size; // Increased from 0.8 to 1.2, scaled

        // Left eye (top-right in the head's coordinate system)
        const eye1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        eye1.setAttribute('cx', eyeOffsetX);
        eye1.setAttribute('cy', -eyeOffsetY);
        eye1.setAttribute('r', eyeRadius);
        eye1.setAttribute('fill', '#fff');
        group.appendChild(eye1);

        // Right eye (bottom-right)
        const eye2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        eye2.setAttribute('cx', eyeOffsetX);
        eye2.setAttribute('cy', eyeOffsetY);
        eye2.setAttribute('r', eyeRadius);
        eye2.setAttribute('fill', '#fff');
        group.appendChild(eye2);

        // Tongue: two lines - scaled by size
        const tongueStartX = 4 * size;
        const tongueStartY = 0;
        const tongueLength = 3 * size; // Increased from 2 to 3, scaled
        const tongueOffset = 0.7 * size; // Increased from 0.5 to 0.7, scaled

        const tongueLine1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tongueLine1.setAttribute('x1', tongueStartX);
        tongueLine1.setAttribute('y1', tongueStartY);
        tongueLine1.setAttribute('x2', tongueStartX + tongueLength);
        tongueLine1.setAttribute('y2', -tongueOffset);
        tongueLine1.setAttribute('stroke', '#c0392b');
        tongueLine1.setAttribute('stroke-width', 0.8 * size); // Increased from 0.5 to 0.8, scaled
        group.appendChild(tongueLine1);

        const tongueLine2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tongueLine2.setAttribute('x1', tongueStartX);
        tongueLine2.setAttribute('y1', tongueStartY);
        tongueLine2.setAttribute('x2', tongueStartX + tongueLength);
        tongueLine2.setAttribute('y2', tongueOffset);
        tongueLine2.setAttribute('stroke', '#c0392b');
        tongueLine2.setAttribute('stroke-width', 0.8 * size); // Increased from 0.5 to 0.8, scaled
        group.appendChild(tongueLine2);

        return group;
    }

    // Create an SVG group for a snake tail, positioned at (cx, cy) and facing in the direction (ux, uy)
    _createTailElement(cx, cy, ux, uy, size = 1.0) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const angle = Math.atan2(uy, ux); // in radians
        group.setAttribute('transform', `translate(${cx},${cy}) rotate(${angle * 180 / Math.PI})`);

        // Tail: a tapering whip tail - slender triangle pointing backward, scaled by size
        const tailLength = 5 * size; // length of the tail
        const tailWidth = 2 * size; // base width
        const tailPoints = `
            0,0 
            ${-tailLength},${-tailWidth/2} 
            ${-tailLength},${tailWidth/2}
        `;
        const tailPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        tailPolygon.setAttribute('points', tailPoints.trim());
        tailPolygon.setAttribute('fill', '#e74c3c');
        group.appendChild(tailPolygon);

        return group;
    }
}

// Attach to window for browser compatibility
console.log("!!! Attaching GameView to window !!!");
if (typeof window !== 'undefined') {
    window.GameView = GameView;
}
// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameView;
}