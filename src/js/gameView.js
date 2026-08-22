// Game View - Handles rendering and user interface
console.log("gameView.js loaded");
class GameView {
    constructor() {
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
        this.playerInfoElement = null;
        this.turnIndicator = null;
        this.loadingOverlay = null;
        this.autoRollTimeout = null;
        this.gameOverTimeout = null;
        this.loadingTimeout = null; // timeout to hide loading overlay after a delay
        this.audioElements = {} // HTMLAudioElement for each sound
        this.previousPositions = []; // to track token positions for animation
        this.isAssetsHandled = false; // flag to prevent handling asset load completion multiple times
        this.svgElement = null; // SVG overlay for snakes and ladders

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
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

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

    // Set token position using pixel values
    setTokenPositionFromPixel(x, y, token) {
        token.style.left = x + 'px';
        token.style.top = y + 'px';
        token.style.transform = 'translate(-50%, -50%)';
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

        // Helper function to compute the viewBox center for a tile
        const getViewBoxCenter = (tile) => {
            const tileZero = tile - 1;
            const logicalRow = Math.floor(tileZero / 10); // 0 = bottom row, 9 = top row
            const colInRow = tileZero % 10;
            const col = (logicalRow % 2 === 0) ? colInRow : (9 - colInRow);
            const x = (col * 10) + 5;
            const y = ((9 - logicalRow) * 10) + 5; // because logicalRow 0 -> y=95
            return {x, y};
        };

        // Draw ladders
        for (const [start, end] of this.model.Ladders) {
            const startCenter = getViewBoxCenter(start);
            const endCenter = getViewBoxCenter(end);
            // For ladder, we'll draw a straight line with dash array to simulate rungs
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M ${startCenter.x} ${startCenter.y} L ${endCenter.x} ${endCenter.y}`);
            path.setAttribute('stroke', '#2ecc71'); // green
            path.setAttribute('stroke-width', '2');
            path.setAttribute('stroke-dasharray', '4,2');
            path.setAttribute('fill', 'none');
            path.setAttribute('data-jump', `${start}-${end}`);
            this.svgElement.appendChild(path);
        }

        // Draw snakes
        for (const [start, end] of this.model.Snakes) {
            const startCenter = getViewBoxCenter(start);
            const endCenter = getViewBoxCenter(end);
            // For snake, we'll draw a curved path (quadratic Bezier)
            const mx = (startCenter.x + endCenter.x) / 2;
            const my = (startCenter.y + endCenter.y) / 2;
            const dx = endCenter.x - startCenter.x;
            const dy = endCenter.y - startCenter.y;
            const length = Math.sqrt(dx*dx + dy*dy);
            const offset = 20; // arbitrary offset for control point
            const nx = (-dy / length) * offset;
            const ny = (dx / length) * offset;
            const controlX = mx + nx;
            const controlY = my + ny;
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M ${startCenter.x} ${startCenter.y} Q ${controlX} ${controlY} ${endCenter.x} ${endCenter.y}`);
            path.setAttribute('stroke', '#e74c3c'); // red
            path.setAttribute('stroke-width', '2');
            path.setAttribute('fill', 'none');
            path.setAttribute('data-jump', `${start}-${end}`);
            this.svgElement.appendChild(path);
        }
    }

    init(model, controller) {
        this.model = model;
        this.controller = controller;
        this.createDOM();
        this.loadAssets();
        this.bindEvents();
        window.addEventListener('resize', () => this.onWindowResize());
    }

    createDOM() {
        console.log("gameView.createDOM called at", new Date().toISOString());
        // Get main container
        this.container = document.getElementById('game-container');
        if (!this.container) {
            console.error("Game container not found");
            return;
        }
        // Set its style
        this.container.style.position = 'relative';
        this.container.style.width = '100%';
        this.container.style.maxWidth = '800px';
        this.container.style.margin = '0 auto';
        this.container.style.height = '600px';
        this.container.style.padding = '0';
        this.container.style.boxSizing = 'border-box';

        // Create loading overlay
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.id = 'loading-overlay';
        this.loadingOverlay.style.position = 'absolute';
        this.loadingOverlay.style.top = '0';
        this.loadingOverlay.style.left = '0';
        this.loadingOverlay.style.width = '100%';
        this.loadingOverlay.style.height = '100%';
        this.loadingOverlay.style.backgroundColor = 'rgba(255,255,255,0.9)';
        this.loadingOverlay.style.display = 'flex';
        this.loadingOverlay.style.justifyContent = 'center';
        this.loadingOverlay.style.alignItems = 'center';
        this.loadingOverlay.style.fontSize = '24px';
        this.loadingOverlay.style.zIndex = '1000';
        this.loadingOverlay.innerHTML = 'Loading game assets...';
        this.container.appendChild(this.loadingOverlay);

        // Fixed layout to fit in 600px container without overlapping
        const boardSizeValue = 'min(380px, 100%)';
        const boardTop = '10px';
        const gap = '10px';

        // Create board container
        this.boardElement = document.createElement('div');
        this.boardElement.id = 'game-board';
        this.boardElement.style.position = 'absolute';
        this.boardElement.style.left = '50%';
        this.boardElement.style.transform = 'translateX(-50%)';
        this.boardElement.style.width = boardSizeValue;
        this.boardElement.style.height = boardSizeValue;
        this.boardElement.style.top = boardTop;
        this.boardElement.style.backgroundColor = '#f8f9fa';
        this.boardElement.style.display = 'grid';
        this.boardElement.style.gridTemplateColumns = 'repeat(10, 1fr)';
        this.boardElement.style.gridTemplateRows = 'repeat(10, 1fr)';
        this.container.appendChild(this.boardElement);

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

        // Create SVG overlay for snakes and ladders
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'absolute';
        svg.style.top = 0;
        svg.style.left = 0;
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '0';
        svg.setAttribute('viewBox', '0 0 100 100');
        this.boardElement.appendChild(svg);
        this.svgElement = svg;
        this.drawSnakesAndLadders();

        // Create staging area
        this.stagingElement = document.createElement('div');
        this.stagingElement.id = 'staging-area';
        this.stagingElement.style.position = 'absolute';
        this.stagingElement.style.left = '50%';
        this.stagingElement.style.transform = 'translateX(-50%)';
        this.stagingElement.style.width = boardSizeValue;
        this.stagingElement.style.height = '40px';
        this.stagingElement.style.top = `calc(${boardTop} + ${boardSizeValue} + ${gap})`;
        this.stagingElement.style.backgroundColor = 'rgba(0,0,0,0.1)'; // for debugging, can be removed
        this.stagingElement.style.display = 'flex';
        this.stagingElement.style.justifyContent = 'space-around';
        this.stagingElement.style.alignItems = 'center';
        this.container.appendChild(this.stagingElement);

        // Create token elements (now as children of container)
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

        // Create dice container
        this.diceElement = document.createElement('div');
        this.diceElement.id = 'dice-container';
        this.diceElement.style.position = 'absolute';
        this.diceElement.style.top = '20px';
        this.diceElement.style.right = '20px';
        this.diceElement.style.width = '60px';
        this.diceElement.style.height = '60px';
        this.diceElement.style.backgroundSize = 'contain';
        this.diceElement.style.backgroundRepeat = 'no-repeat';
        this.diceElement.style.backgroundPosition = 'center';
        this.container.appendChild(this.diceElement);

        // Create turn indicator (placed below dice)
        this.turnIndicator = document.createElement('div');
        this.turnIndicator.id = 'turn-indicator';
        this.turnIndicator.style.position = 'absolute';
        this.turnIndicator.style.top = '90px'; // below dice (dice at 20px, 60px high, so 20+60+10=90px)
        this.turnIndicator.style.right = '20px';
        this.turnIndicator.style.width = '30px';
        this.turnIndicator.style.height = '30px';
        this.turnIndicator.style.backgroundSize = 'contain';
        this.turnIndicator.style.backgroundRepeat = 'no-repeat';
        this.turnIndicator.style.backgroundPosition = 'center';
        this.container.appendChild(this.turnIndicator);

        // Create message area for non-blocking alerts
        this.messageElement = document.createElement('div');
        this.messageElement.style.position = 'absolute';
        this.messageElement.style.top = '490px'; // in the gap between staging (480px) and player info (520px)
        this.messageElement.style.left = '10px';
        this.messageElement.style.right = '10px';
        this.messageElement.style.height = '20px';
        this.messageElement.style.backgroundColor = 'rgba(255,255,0,0.8)';
        this.messageElement.style.color = '#333';
        this.messageElement.style.padding = '8px';
        this.messageElement.style.borderRadius = '5px';
        this.messageElement.style.fontSize = '14px';
        this.messageElement.style.display = 'none';
        this.container.appendChild(this.messageElement);

        // Create player info panel
        this.playerInfoElement = document.createElement('div');
        this.playerInfoElement.id = 'player-info';
        this.playerInfoElement.style.position = 'absolute';
        this.playerInfoElement.style.left = '10px';
        this.playerInfoElement.style.right = '10px';
        this.playerInfoElement.style.top = `calc(${boardTop} + ${boardSizeValue} + ${gap} + 40px + ${gap})`;
        this.playerInfoElement.style.height = '80px';
        this.playerInfoElement.style.backgroundColor = 'rgba(0,0,0,0.6)';
        this.playerInfoElement.style.color = '#fff';
        this.playerInfoElement.style.padding = '12px';
        this.playerInfoElement.style.borderRadius = '8px';
        this.playerInfoElement.style.display = 'flex';
        this.playerInfoElement.style.justifyContent = 'space-around';
        this.playerInfoElement.style.alignItems = 'center';
        this.container.appendChild(this.playerInfoElement);

        
    }

    loadAssets() {
        // Calculate total assets to load
        this.assetsTotalCount = 0; // no board image
        this.assetsTotalCount += 4; // tokens
        this.assetsTotalCount += 6; // dice faces
        this.assetsTotalCount += 1; // dice tumble sheet
        this.assetsTotalCount += 10; // audio events (roll, step, settle, ladder, snake, six, triple_six, turn, win, gameover)
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
        const audioEvents = ['roll', 'step', 'settle', 'ladder', 'snake', 'six', 'triple_six', 'turn', 'win', 'gameover'];
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
                // Start auto-play after assets loaded
                this.autoRoll();
            }
        }
    }

    assetError(e) {
        console.error(`[gameView] Failed to load asset: ${e.target.src}`, e);
        this.assetsFailedCount++;
        this.assetLoaded();   // count this asset as resolved
        // For debugging: set a visible background on token elements if this is a token image
        const src = e.target.src;
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
    }

    bindEvents() {
        // Roll button removed for fully automatic arena
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
        // Set timeout to roll again after 1 second
        this.autoRollTimeout = setTimeout(() => {
            console.log("[gameView] Auto-rolling");
            this.controller.rollDice();
        }, 1800);
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

    // Update the board background color
    updateBoardBackground() {
        this.boardElement.style.backgroundColor = '#f8f9fa';
    }

    // Note: The old tileToPosition function has been removed.
// We now use getTokenPositionFromTile for pixel-based positioning.

    // Update token positions based on model state - now handles animation
    onStateChange() {
        console.log('[gameView] onStateChange called');
        // Update dice display with tumble animation
        const lastRoll = this.model.getLastRoll();
        if (lastRoll >= 1 && lastRoll <= 6) {
            this.animateDiceRoll(lastRoll);
        } else {
            this.diceElement.style.backgroundImage = '';
        }

        // Update player info immediately
        this.updatePlayerInfo();

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
            if (currentPositions[i] !== this.previousPositions[i]) {
                console.log(`[gameView] animating token ${i} from ${this.previousPositions[i]} to ${currentPositions[i]}`);
                const promise = this.animateTokenMove(i, currentPositions[i]);
                animationPromises.push(promise);
            }
        }

        // Update previous positions
        this.previousPositions = [...currentPositions];

        if (animationPromises.length === 0) {
            this.autoRoll();
            return;
        }

        // Watchdog: if animations take too long, we still want to proceed.
        const watchdogId = setTimeout(() => {
            console.log('[gameView] Watchdog triggered: calling autoRoll after timeout');
            this.autoRoll();
        }, 3000); // 3 seconds

        // Wait for all animations to complete
        Promise.all(animationPromises).then(() => {
            clearTimeout(watchdogId);
            this.autoRoll();
        }).catch(() => {
            // In case of error, we still want to proceed.
            clearTimeout(watchdogId);
            this.autoRoll();
        });
    }

    // Resize tokens when window changes size
    onWindowResize() {
        this.sizeTokens();
        this.drawSnakesAndLadders();
    }

    // Animates a token move. Returns a promise that resolves when the animation completes.
    async animateTokenMove(playerId, newPosition) {
        console.log(`[gameView] animateTokenMove called for player ${playerId} to position ${newPosition}`);
        // Check if there is no movement needed
        const previousPosition = this.previousPositions[playerId];
        if (previousPosition === newPosition) {
            // No movement, so we don't need to animate or play sounds.
            console.log(`[gameView] no movement needed for player ${playerId}`);
            return Promise.resolve();
        }

        // Determine if this is a step-by-step move (active player's normal move)
        const dieRoll = this.model.getLastRoll();
        const isMover = playerId === this.model.getLastMover();
        const intermediatePos = this._calculateIntermediatePosition(previousPosition, dieRoll, playerId);
        const hasJump = (intermediatePos !== previousPosition && intermediatePos !== newPosition) &&
            (this.model.Ladders.has(intermediatePos) || this.model.Snakes.has(intermediatePos));

        // We will animate step-by-step only if:
        //   - the player is the active player
        //   - the move is forward (newPosition > previousPosition) [or for leaving staging?]
        //   - and the intermediate position is different from previous (i.e., the die roll caused movement)
        //   - and the intermediate position is on the board (1-100) or we are leaving staging (from 0 to 1)
        const isStepByStep = isMover &&
            ((previousPosition === 0 && newPosition === 1) || // leaving staging
             (previousPosition > 0 && newPosition > 0 && newPosition > previousPosition)); // moving forward on board

        if (isStepByStep) {
            await this._animateStepByStep(previousPosition, newPosition, playerId, dieRoll);
        } else {
            await this._animateDirectMove(previousPosition, newPosition, playerId);
        }
    }

    // Helper to compute the intermediate position after die roll but before jump
    _calculateIntermediatePosition(start, dieRoll, playerId) {
        // Replicate the controller's movement logic for a given start and dieRoll.
        if (start === 0) {
            // Off-board pawns require a 1 or a 6 to enter Tile 1
            if (dieRoll === 1 || dieRoll === 6) {
                return 1;
            } else {
                return start; // didn't move
            }
        } else {
            // Exact landing rule: overshooting tile 100 voids movement
            if (start + dieRoll <= 100) {
                return start + dieRoll;
            } else {
                return start; // didn't move
            }
        }
    }

    // Animates a move step-by-step along the board, then along the jump path if applicable.
    async _animateStepByStep(startTile, endTile, playerId, dieRoll) {
        console.log(`[gameView] _animateStepByStep from ${startTile} to ${endTile} for player ${playerId}`);
        const token = this.tokenElements[playerId];
        const intermediatePos = this._calculateIntermediatePosition(startTile, dieRoll, playerId);
        const hasJump = (intermediatePos !== startTile && intermediatePos !== endTile) &&
            (this.model.Ladders.has(intermediatePos) || this.model.Snakes.has(intermediatePos));

        // Part 1: move from startTile to intermediatePos one tile at a time
        let current = startTile;
        while (current !== intermediatePos) {
            // Determine next tile: since we are moving forward, next = current + 1
            const nextTile = current + 1;
            // Move token to nextTile
            const pos = this.getTokenPositionFromTile(nextTile, playerId);
            if (!pos) {
                console.error(`[gameView] Could not compute position for tile ${nextTile}`);
                break;
            }
            this.setTokenPositionFromPixel(pos.x, pos.y, token);
            // Play step sound for each hop
            this.playAudio('step');
            // Wait for a short duration (150-250ms)
            await this._delay(200); // fixed 200ms for now, can be random
            current = nextTile;
        }

        // Pause at the landing tile (intermediatePos) before jumping
        console.log(`[gameView] pausing at landing tile ${intermediatePos} for ${PAUSE_DURATION}ms`);
        await this._delay(PAUSE_DURATION);

        // Part 2: if there is a jump, follow the SVG path from intermediatePos to endTile
        if (hasJump) {
            console.log(`[gameView] has jump from ${intermediatePos} to ${endTile}`);
            // Find the SVG path element for this jump
            const pathSelector = `[data-jump="${intermediatePos}-${endTile}"]`;
            const path = this.svgElement.querySelector(pathSelector);
            if (!path) {
                console.error(`[gameView] SVG path not found for jump ${intermediatePos}-${endTile}`);
                // Fallback: direct move
                const pos = this.getTokenPositionFromTile(endTile, playerId);
                if (pos) {
                    this.setTokenPositionFromPixel(pos.x, pos.y, token);
                }
                this.playAudio(this.model.Ladders.has(intermediatePos) ? 'ladder' : 'snake');
                await this._delay(100); // small delay to simulate sound
            } else {
                // Animate along the path
                const length = path.getTotalLength();
                // We'll animate from t=0 to t=1 over 600-900ms
                const duration = Math.random() * 300 + 600; // 600-900ms
                const startTime = performance.now();
                // Play the appropriate sound
                this.playAudio(this.model.Ladders.has(intermediatePos) ? 'ladder' : 'snake');
                // Animation loop
                await new Promise((resolve, reject) => {
                    // Create SVG point once for reuse
                    const pt = this.svgElement.createSVGPoint();
                    const step = (timestamp) => {
                        const elapsed = timestamp - startTime;
                        const t = Math.min(elapsed / duration, 1);
                        const point = path.getPointAtLength(t * length);
                        pt.x = point.x;
                        pt.y = point.y;
                        const screenPt = pt.matrixTransform(this.svgElement.getScreenCTM());
                        const containerRect = this.container.getBoundingClientRect();
                        const x = screenPt.x - containerRect.left;
                        const y = screenPt.y - containerRect.top;
                        this.setTokenPositionFromPixel(x, y, token);
                        console.log(`[gameView] jump animation at t=${t} -> (${x},${y})`);
                        if (t < 1) {
                            requestAnimationFrame(step);
                        } else {
                            resolve();
                        }
                    };
                    requestAnimationFrame(step);
                });
            }
        } else {
            // No jump, we are already at intermediatePos (which equals endTile)
            // But we need to move the token to the endTile position (if not already there)
            const pos = this.getTokenPositionFromTile(endTile, playerId);
            if (pos) {
                this.setTokenPositionFromPixel(pos.x, pos.y, token);
            }
        }

        // Play settle sound after reaching the destination tile
        this.playAudio('settle');

        // Pause at the destination tile before finishing
        console.log(`[gameView] pausing at destination tile ${endTile} for ${PAUSE_DURATION}ms`);
        await this._delay(PAUSE_DURATION);

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
    // Returns a promise that resolves when the transition ends.
    _animateDirectMove(startTile, endTile, playerId) {
        console.log(`[gameView] _animateDirectMove from ${startTile} to ${endTile} for player ${playerId}`);
        return new Promise((resolve) => {
            const token = this.tokenElements[playerId];
            const startPos = this.getTokenPositionFromTile(startTile, playerId);
            const endPos = this.getTokenPositionFromTile(endTile, playerId);
            if (!startPos || !endPos) {
                console.error(`[gameView] Could not compute positions for direct move`);
                resolve();
                return;
            }

            // Set initial position
            this.setTokenPositionFromPixel(startPos.x, startPos.y, token);
            // Trigger reflow to ensure the transition works
            void token.offsetHeight;
            // Set end position (CSS transition will animate the change)
            this.setTokenPositionFromPixel(endPos.x, endPos.y, token);

            // Listen for transitionend on this token
            const onTransitionEnd = () => {
                // Play settle sound
                this.playAudio('settle');

                // Check for ladder or snake at the end position (if applicable)
                if (this.model.Ladders.has(endTile)) {
                    this.playAudio('ladder');
                } else if (this.model.Snakes.has(endTile)) {
                    this.playAudio('snake');
                }

                // Remove the event listener
                token.removeEventListener('transitionend', onTransitionEnd);
                resolve();
            };

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
        // Play roll sound
        this.playAudio('roll');

        // Check if tumble sheet is loaded
        if (!this.assets.diceTumbleSheet || !this.assets.diceTumbleSheet.complete) {
            // Fallback to static face after a short delay
            setTimeout(() => {
                this.updateDice(face);
                if (callback) callback();
            }, 500);
            return;
        }

        // Set up the tumble sheet
        this.diceElement.style.backgroundImage = `url('${this.assets.diceTumbleSheet.src}')`;
        this.diceElement.style.backgroundSize = '720px 60px'; // assuming 12 frames of 60x60
        this.diceElement.style.backgroundRepeat = 'no-repeat';

        const totalFrames = 12;
        const totalDuration = 800; // ms, within 700-900
        const frameDuration = totalDuration / totalFrames;

        let currentFrame = 0;

        const animate = () => {
            this.diceElement.style.backgroundPosition = `-${currentFrame * 60}px 0`;
            currentFrame++;
            if (currentFrame < totalFrames) {
                setTimeout(animate, frameDuration);
            } else {
                // After tumble, show the static face
                this.updateDice(face);
                if (callback) callback();
            }
        };

        animate();
    }

    // Play audio for a given event
    playAudio(event) {
        const audio = this.assets.audio[event];
        if (audio && audio.src) {
            // Create a new audio element to allow overlapping playback
            const audioClone = new Audio(audio.src);
            audioClone.play().catch(e => console.warn(`Audio play failed for ${event}: ${e}`));
        }
    }

    // View callback methods (called by controller)
    onTurnChange(activePlayer) {
        // Update player info panel to show whose turn it is
        this.updatePlayerInfo();
        // Update turn indicator below dice
        if (this.turnIndicator && this.assets.tokens[activePlayer]) {
            this.turnIndicator.style.backgroundImage = `url('${this.assets.tokens[activePlayer].src}')`;
        }
        this.playAudio('turn');
    }

    onExtraRoll() {
        // Indicate extra roll (maybe change button text or add a visual cue)
        // Roll button removed for fully automatic arena
        setTimeout(() => {
            // Roll button removed for fully automatic arena
        }, 1000);
        this.playAudio('six');
    }

    onTripleSixPenalty() {
        this.playAudio('triple_six');
        // Show non-blocking message
        this.messageElement.textContent = 'Triple Six! Penalty: Turn reverted and turn passed to next player.';
        this.messageElement.style.display = 'block';
        setTimeout(() => { this.messageElement.textContent = ''; this.messageElement.style.display = 'none'; }, 3000);
    }

    onCapture(opponent, targetPos) {
        this.playAudio('snake'); // or maybe a capture sound? we don't have one, so use snake for now
        // Optionally show a visual indication
        console.log(`Player ${opponent} captured at tile ${targetPos}`);
    }

    onGameWin(playerId) {
        this.playAudio('win');
        // Roll button removed for fully automatic arena
        // Show non-blocking win message
        this.messageElement.textContent = `Player ${playerId + 1} wins!`;
        this.messageElement.style.display = 'block';
        setTimeout(() => { this.messageElement.textContent = ''; this.messageElement.style.display = 'none'; }, 3000);
        // Handle game over: after showing win, wait 10 sec then restart
        this.handleGameOver();
    }

    onReset() {
        this.clearTimeouts();
        // Roll button removed for fully automatic arena
        this.updateTokenPositions();
        this.updatePlayerInfo();
        this.diceElement.style.backgroundImage = ''; // clear dice
    }

    // Update token positions (called on reset, without animation)
    updateTokenPositions() {
        const boardWidth = this.boardElement.clientWidth;
        const boardHeight = this.boardElement.clientHeight;
        console.log('[DEBUG] updateTokenPositions called, boardWidth:', boardWidth, 'boardHeight:', boardHeight);

        for (let i = 0; i < this.model.NUM_PLAYERS; i++) {
            const position = this.model.getPlayerPosition(i);
            const pos = this.getTokenPositionFromTile(position, i);
            if (!pos) continue;
            const token = this.tokenElements[i];
            console.log(`[DEBUG] Player ${i} position ${position}: pos.x=${pos.x}, pos.y=${pos.y}`);

            // Set position in pixels
            this.setTokenPositionFromPixel(pos.x, pos.y, token);

            // Adjust token size based on board size (e.g., 10% of tile size)
            const tileSize = Math.min(boardWidth, boardHeight) / 10;
            const tokenSize = tileSize * 0.6; // 60% of tile size
            token.style.width = `${tokenSize}px`;
            token.style.height = `${tokenSize}px`;

            // Set token image
            token.style.backgroundImage = `url('${this.assets.tokens[i].src}')`;
        }
    }

    // Resize tokens based on board width
    sizeTokens() {
        const boardWidth = this.boardElement.clientWidth;
        if (boardWidth === 0) {
            // Not ready yet; try again on next animation frame
            requestAnimationFrame(() => this.sizeTokens());
            return;
        }
        const cellWidth = boardWidth / 10;
        const tokenDiameter = cellWidth * 0.7;
        for (let i = 0; i < this.tokenElements.length; i++) {
            const token = this.tokenElements[i];
            token.style.width = `${tokenDiameter}px`;
            token.style.height = `${tokenDiameter}px`;
        }
    }

    // Helper method to set token position using left/top/transform for centering
    setTokenPosition(playerId, xPercent, yPercent) {
        console.log(`[gameView] setTokenPosition called for player ${playerId} with x:${xPercent}%, y:${yPercent}%`);
        const token = this.tokenElements[playerId];
        // Always use left for on-board positions
        token.style.left = `${xPercent}%`;
        token.style.right = 'auto';
        token.style.top = `${yPercent}%`;
        token.style.transform = 'translate(-50%, -50%)';
    }

    // Update player info panel
    updatePlayerInfo() {
        // Clear current content
        this.playerInfoElement.innerHTML = '';

        // Create a div for each player
        for (let i = 0; i < this.model.NUM_PLAYERS; i++) {
            const playerDiv = document.createElement('div');
            playerDiv.style.textAlign = 'center';

            // Player token indicator (small circle)
            const tokenIndicator = document.createElement('div');
            tokenIndicator.style.display = 'inline-block';
            tokenIndicator.style.width = '12px';
            tokenIndicator.style.height = '12px';
            tokenIndicator.style.backgroundImage = `url('${this.assets.tokens[i].src}')`;
            tokenIndicator.style.backgroundSize = 'contain';
            tokenIndicator.style.marginBottom = '4px';
            playerDiv.appendChild(tokenIndicator);

            // Player name (we'll use placeholder names for now)
            const nameSpan = document.createElement('span');
            nameSpan.textContent = `Player ${i+1}`;
            nameSpan.style.display = 'block';
            if (i === this.model.getActivePlayer()) {
                nameSpan.style.fontWeight = 'bold';
                nameSpan.style.color = '#ff0'; // highlight active player
            }
            playerDiv.appendChild(nameSpan);

            // Player position
            const posSpan = document.createElement('span');
            posSpan.textContent = `Tile: ${this.model.getPlayerPosition(i)}`;
            posSpan.style.display = 'block';
            posSpan.style.fontSize = '14px';
            playerDiv.appendChild(posSpan);

            this.playerInfoElement.appendChild(playerDiv);
        }
    }
}

// Attach to window for browser compatibility
if (typeof window !== 'undefined') {
    window.GameView = GameView;
    console.log("GameView attached to window");
}
