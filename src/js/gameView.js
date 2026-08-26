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
            const offset = 6; // arbitrary offset for control point
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
        this.diceElement.style.alignSelf = 'center'; // Center horizontally in the flex column
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
    
    _unlockAudioAndStart() {
        // Unlock audio context on user interaction
        // This is a no-op in automatic mode but kept for compatibility
        console.log('[gameView] Audio unlocked via user interaction');
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

    // Reset the game state for the view
    onReset() {
        this.clearTimeouts();
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
        // Play capture sound
        this.playAudio('capture');
        // Optionally, add a visual effect or vibration
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
        console.log(`[gameView] move start at ${Date.now()}`);
        const currentMoveId = ++this.moveId;
        
        // SNAPSHOT: Capture all turn-specific data needed for animation and proceed BEFORE any await
        // This prevents reading shared mutable state after awaits which could belong to a different turn
        const lastRoll = this.model.getLastRoll();
        const lastTurnRecord = this.model.getLastTurnRecord();
        const consecutiveSixes = this.model.getConsecutiveSixes();
        const lastMover = this.model.getLastMover();
        const activePlayer = this.model.getActivePlayer();
        
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
        
        // Update dice display with tumble animation
        if (lastRoll >= 1 && lastRoll <= 6) {
            // Log dice tumble start
            console.log(`[gameView] dice tumble start at ${Date.now()}`);
            
            // Wait for dice animation to complete with timeout fallback
            const DICE_TIMEOUT = 2000; // 2 second timeout for dice animation
            const diceTimeoutPromise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    console.log(`[gameView] Dice animation timeout after ${DICE_TIMEOUT}ms`);
                    resolve();
                }, DICE_TIMEOUT);
            });

            try {
                await Promise.race([this.animateDiceRoll(lastRoll), diceTimeoutPromise]);
            } catch (error) {
                console.error(`[gameView] Error waiting for dice animation:`, error);
            }
        } else {
            // Non-animated case (no roll or invalid roll)
            this.diceElement.style.backgroundImage = '';
            // Log dice settled for non-animated case
            console.log(`[gameView] dice settled on face ${lastRoll} at ${Date.now()}`);
        }

        // Wait 500ms with nothing moving
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(`[gameView] delay complete at ${Date.now()}`);

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
                    intermediatePos: this.model.getLastMoveIntermediatePosition() // Snapshot intermediate position
                };
                
                const promise = this.animateTokenMove(move);
                animationPromises.push(promise);
            }
        }

        // Update previous positions
        this.previousPositions = [...currentPositions];

        // Single-fire guard for autoRoll
        let settled = false;
        let watchdogId = null;
        const proceed = () => {
            if (settled) return;
            // Check if this is the latest move
            if (this.moveId !== currentMoveId) {
                return;
            }
            settled = true;
            if (watchdogId !== null) {
                clearTimeout(watchdogId);
            }
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
            
            this.autoRoll();
        };

        if (animationPromises.length === 0) {
            proceed();
            return;
        }

        // Watchdog timeout: derived from animation constants
        //   max hops (6) * hop delay (200ms) = 1200ms
        //   landing pause (PAUSE_DURATION) = 500ms
        //   max jump duration (600ms base + 300ms random) = 900ms
        //   destination pause (PAUSE_DURATION) = 500ms
        //   total = 1200 + 500 + 900 + 500 = 3100ms
        const WATCHDOG_TIMEOUT = (6 * 200) + GameView.PAUSE_DURATION + 900 + GameView.PAUSE_DURATION;
        watchdogId = setTimeout(() => {
            console.log('[gameView] Watchdog triggered: calling autoRoll after timeout');
            proceed();
        }, WATCHDOG_TIMEOUT);

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
            await this._animateStepByStep(previousPosition, newPosition, move.playerId, dieRoll, intermediatePos, move.lastTurnRecord);
        } else {
            this.playAudio('enter');
            await this._animateDirectMove(previousPosition, newPosition, move.playerId);
        }
    }

    

    // Animates a move step-by-step along the board, then along the jump path if applicable.
    // Animates a move step-by-step along the board, then along the jump path if applicable.
    async _animateStepByStep(startTile, endTile, playerId, dieRoll, intermediatePos, lastTurnRecord, isIntermediatePosLadderStart, isIntermediatePosSnakeStart, isEndTileLadderStart, isEndTileSnakeStart) {
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
                // Play step sound for each hop
                this.playAudio('step');
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

        // Part 2: if there is a jump, follow the SVG path from jumpStart to jumpEnd
        if (hasJump) {
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
                            resolve();
                        }
                    }, duration + 100);
                    const step = (timestamp) => {
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
                        // Find the closest tile to this viewBox position
                        const logicalRowFloat = 9 - (y_vb - 5) / 10;
                        let logicalRow = Math.round(logicalRowFloat);
                        logicalRow = Math.max(0, Math.min(9, logicalRow));
                        let colInRow;
                        if (logicalRow % 2 === 0) {
                            colInRow = (x_vb - 5) / 10;
                        } else {
                            colInRow = 9 - (x_vb - 5) / 10;
                        }
                        colInRow = Math.max(0, Math.min(9, colInRow));
                        const tileZero = logicalRow * 10 + colInRow;
                        let tile = Math.round(tileZero) + 1;
                        tile = Math.max(1, Math.min(100, tile));
                        // Get the pixel position of this tile's center
                        const pos = this.getTokenPositionFromTile(tile, playerId);
                        if (pos) {
                            this.positionToken(playerId, tile, token);
                        }
                        console.log(`[gameView] jump animation at t=${t} -> tile ${tile} (${x_vb},${y_vb})`);
                        if (t < 1) {
                            rafId = requestAnimationFrame(step);
                        } else {
                            animationFinished = true;
                            clearTimeout(timeoutId);
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
        // Play roll sound
        this.playAudio('roll');

        console.log(`[gameView] animateDiceRoll START: face=${face}, callback=${!!callback}`);

        // Check if tumble sheet is loaded
        if (!this.assets.diceTumbleSheet || !this.assets.diceTumbleSheet.complete) {
            // Fallback to static face if tumble sheet not ready
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
        // Get the cell size from the dice element (assumes square)
        const cell = this.diceElement.getBoundingClientRect().width;
        const frames = 12; // number of frames in the tumble sheet (1536px / 128px)
        let currentFrame = 0;
        const startTime = performance.now();
        const duration = 1000; // 1 second for tumble animation

        // Return a promise that resolves when the animation settles
        return new Promise((resolve) => {
            const animate = (timestamp) => {
                console.log(`[dice] animate called with timestamp=${timestamp.toFixed(0)}`);
                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const frame = Math.floor(progress * frames);
                
                // Log first few frames and last few frames to debug timing
                if (frame < 5 || frame >= frames - 5) {
                    console.log(`[dice] ts=${timestamp.toFixed(0)} startTime=${startTime.toFixed(0)} elapsed=${elapsed.toFixed(0)} progress=${progress.toFixed(3)} frame=${frame}/${frames}`);
                }
                
                // Check if animation has completed (with small epsilon for timing imprecisions)
                if (frame >= frames - 1) {
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
                if (frame !== currentFrame) {
                    currentFrame = frame;
                    const offset = -currentFrame * cell;
                    this.diceElement.style.backgroundImage = `url('${tumbleSheet.src}')`;
                    this.diceElement.style.backgroundPosition = `${offset}px 0`;
                    this.diceElement.style.backgroundSize = `${frames * cell}px ${cell}px`;
                    this.diceElement.style.backgroundRepeat = 'no-repeat';
                }
                requestAnimationFrame(animate);
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
        if (!record) return;

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
}

// Attach to window for browser compatibility
console.log("!!! Attaching GameView to window !!!");
if (typeof window !== 'undefined') {
    window.GameView = GameView;
}