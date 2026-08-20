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
        this.rollButton = null;
        this.loadingOverlay = null;
        this.autoRollTimeout = null;
        this.gameOverTimeout = null;
        this.loadingTimeout = null; // timeout to hide loading overlay after a delay
        this.audioElements = {} // HTMLAudioElement for each sound
        this.previousPositions = []; // to track token positions for animation
        this.isAssetsHandled = false; // flag to prevent handling asset load completion multiple times

        // Bind methods
        this.handleRollClick = this.handleRollClick.bind(this);
        this.assetLoaded = this.assetLoaded.bind(this);
        this.assetError = this.assetError.bind(this);
        this.autoRoll = this.autoRoll.bind(this);
        this.handleGameOver = this.handleGameOver.bind(this);
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
        console.log("gameView.createDOM called");
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
        this.container.style.height = 'auto';
        this.container.style.padding = '20px';
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

        // Create board container
        this.boardElement = document.createElement('div');
        this.boardElement.id = 'game-board';
        this.boardElement.style.position = 'relative';
        this.boardElement.style.width = '100%';
        this.boardElement.style.paddingBottom = '133.35%'; // match portrait board aspect ratio
        this.boardElement.style.backgroundSize = 'contain';
        this.boardElement.style.backgroundRepeat = 'no-repeat';
        this.boardElement.style.backgroundPosition = 'center';
        this.container.appendChild(this.boardElement);

        // Create token elements (will be positioned absolutely)
        for (let i = 0; i < 4; i++) {
            const token = document.createElement('div');
            token.className = `game-token player-${i}`;
            token.style.position = 'absolute';
            token.style.pointerEvents = 'none';
            token.style.backgroundSize = 'contain';
            token.style.backgroundRepeat = 'no-repeat';
            token.style.backgroundPosition = 'center';
            this.boardElement.appendChild(token);
            this.tokenElements.push(token);
        }
        // Size tokens after all DOM is created
        this.sizeTokens();

        // Create dice container
        this.diceElement = document.createElement('div');
        this.diceElement.id = 'dice-container';
        this.diceElement.style.position = 'absolute';
        this.diceElement.style.top = '10px';
        this.diceElement.style.right = '10px';
        this.diceElement.style.width = '60px';
        this.diceElement.style.height = '60px';
        this.diceElement.style.backgroundSize = 'contain';
        this.diceElement.style.backgroundRepeat = 'no-repeat';
        this.diceElement.style.backgroundPosition = 'center';
        this.boardElement.appendChild(this.diceElement);

        // Create player info panel
        this.playerInfoElement = document.createElement('div');
        this.playerInfoElement.id = 'player-info';
        this.playerInfoElement.style.position = 'absolute';
        this.playerInfoElement.style.bottom = '10px';
        this.playerInfoElement.style.left = '10px';
        this.playerInfoElement.style.right = '10px';
        this.playerInfoElement.style.backgroundColor = 'rgba(0,0,0,0.5)';
        this.playerInfoElement.style.color = 'white';
        this.playerInfoElement.style.padding = '10px';
        this.playerInfoElement.style.borderRadius = '5px';
        this.playerInfoElement.style.display = 'flex';
        this.playerInfoElement.style.justifyContent = 'space-around';
        this.playerInfoElement.style.alignItems = 'center';
        this.container.appendChild(this.playerInfoElement);

        // Create message area for non-blocking alerts
        this.messageElement = document.createElement('div');
        this.messageElement.style.position = 'absolute';
        this.messageElement.style.bottom = '55px';
        this.messageElement.style.left = '10px';
        this.messageElement.style.right = '10px';
        this.messageElement.style.backgroundColor = 'rgba(255,255,0,0.8)';
        this.messageElement.style.color = '#333';
        this.messageElement.style.padding = '8px';
        this.messageElement.style.borderRadius = '5px';
        this.messageElement.style.fontSize = '14px';
        this.messageElement.style.display = 'none';
        this.container.appendChild(this.messageElement);

        // Create roll button
        this.rollButton = document.createElement('button');
        this.rollButton.id = 'roll-button';
        this.rollButton.textContent = 'Roll Dice';
        this.rollButton.style.padding = '10px 20px';
        this.rollButton.style.fontSize = '16px';
        this.rollButton.style.cursor = 'pointer';
        this.rollButton.style.display = 'block';
        this.rollButton.style.margin = '20px auto';
        this.rollButton.disabled = true; // disabled until assets load
        this.container.appendChild(this.rollButton);
    }

    loadAssets() {
        // Calculate total assets to load
        this.assetsTotalCount = 1; // board
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

        // Load board image (try SVG first, then PNG)
        this.boardImage.onload = () => {
            console.log("[gameView] Board image onload");
            this.boardLoaded = true;
            this.updateBoardBackground();
            this.assetLoaded();
            // Board is loaded - make it playable even if other assets are still loading
            if (!this.isAssetsHandled) {
                this.isAssetsHandled = true;
                this.hideLoadingOverlay();
                this.enableRollButton();
                this.autoRoll();
            }
        };
        this.boardImage.onerror = () => {
            console.log("[gameView] Board image onerror, trying PNG fallback");
            // Fallback to PNG
            this.boardImage.src = 'assets/images/board/Snakes_and_Ladders_-_Board_Game_Corrected.png';
        };
        // Try SVG first
        this.boardImage.src = 'assets/images/board/Snakes_and_Ladders_-_Board_Game_Corrected.svg';

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
            audio.onload = this.assetLoaded;
            audio.onerror = this.assetError;
            this.assets.audio[event] = audio;
        });
    }

    assetLoaded() {
        this.assetsLoadedCount++;
        console.log(`[gameView] Asset loaded: ${this.assetsLoadedCount}/${this.assetsTotalCount}`);
        // Update loading overlay text to show progress
        if (this.loadingOverlay) {
            this.loadingOverlay.innerHTML = `Loading game assets... ${this.assetsLoadedCount}/${this.assetsTotalCount}`;
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
                this.enableRollButton();
                // Start auto-play after assets loaded
                this.autoRoll();
            }
        }
    }

    assetError(e) {
        console.error(`[gameView] Failed to load asset: ${e.target.src}`, e);
        this.assetsFailedCount++;
        // Update loading overlay text to show progress and failed count
        if (this.loadingOverlay) {
            this.loadingOverlay.innerHTML = `Loading game assets... ${this.assetsLoadedCount}/${this.assetsTotalCount} (Failed: ${this.assetsFailedCount})`;
        }
        // Note: We do NOT call assetLoaded() here to avoid counting failed assets as loaded.
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

    enableRollButton() {
        console.log("[gameView] Enabling roll button");
        if (this.rollButton) {
            this.rollButton.disabled = false;
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
        this.rollButton.addEventListener('click', this.handleRollClick);
    }

    handleRollClick() {
        if (this.model.isGameOver()) {
            // Optionally, allow resetting the game
            return;
        }
        // Check if roll button is disabled (assets not loaded or already rolling)
        if (this.rollButton.disabled) {
            console.log("[gameView] Roll button disabled, ignoring click");
            return;
        }
        console.log("[gameView] Roll button clicked");
        this.controller.rollDice();
        this.rollButton.disabled = true;
        // Disable button; will be re-enabled in onStateChange if game not over
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

    // Update the board background image
    updateBoardBackground() {
        if (this.boardLoaded) {
            this.boardElement.style.backgroundImage = `url('${this.boardImage.src}')`;
        }
    }

    // Convert tile number to x, y coordinates (in percentage of board size)
    // Assuming standard boustrophedon layout: 
    // Row 0 (bottom): 1-10 left to right
    // Row 1: 11-20 right to left
    // Row 2: 21-30 left to right
    // etc.
    tileToPosition(tile) {
        const GRID_TOP = 3.33;      // % from top of board image
        const GRID_HEIGHT = 95.34;  // % of board image height
        const cell = GRID_HEIGHT / 10;
        if (tile === 0) {
            // Off-board staging: spread along the bottom inside the board area
            const slot = (this._stagingSlot = ((this._stagingSlot || 0) % 4) + 1);
            return { x: 12 + slot * 18, y: GRID_TOP + (9.5 * cell) };
        }
        tile--; // convert to 0-indexed (0-99)
        const row = Math.floor(tile / 10); // 0-9 (0 is bottom row)
        const colInRow = tile % 10; // 0-9

        let col;
        if (row % 2 === 0) {
            // Even row (0,2,4,6,8): left to right
            col = colInRow;
        } else {
            // Odd row (1,3,5,7,9): right to left
            col = 9 - colInRow;
        }

        // Convert to percentage (0-100%) within the board
        // Each tile is 10% of the board width (since 10 tiles per row)
        const xPercent = (col * 10) + 5; // add half a token to center the token
        const yPercentFromTop = GRID_TOP + ((9 - row) * cell) + (cell / 2);

        return { x: xPercent, y: yPercentFromTop };
    }

    // Update token positions based on model state - now handles animation
    onStateChange() {
        console.log('[gameView] onStateChange called');
        // Update dice display immediately
        const lastRoll = this.model.getLastRoll();
        if (lastRoll >= 1 && lastRoll <= 6) {
            this.updateDice(lastRoll);
        } else {
            this.diceElement.style.backgroundImage = '';
        }

        // Update player info and button state immediately
        this.updatePlayerInfo();
        if (!this.model.isGameOver()) {
            this.rollButton.disabled = false;
        } else {
            this.rollButton.disabled = true;
            this.rollButton.textContent = 'Game Over!';
        }

        // Now, animate the tokens that have changed
        const currentPositions = [];
        for (let i = 0; i < this.model.NUM_PLAYERS; i++) {
            currentPositions.push(this.model.getPlayerPosition(i));
        }
        console.log('[gameView] currentPositions:', currentPositions);

        // Size tokens based on board width after first layout
        this.sizeTokens();

        let animationCount = 0;
        for (let i = 0; i < this.model.NUM_PLAYERS; i++) {
            if (currentPositions[i] !== this.previousPositions[i]) {
                console.log(`[gameView] animating token ${i} from ${this.previousPositions[i]} to ${currentPositions[i]}`);
                this.animateTokenMove(i, currentPositions[i]);
                animationCount++;
            }
        }

        // Update previous positions
        this.previousPositions = [...currentPositions];

        // Trigger auto-roll (as before)
        this.autoRoll();
    }

    // Resize tokens when window changes size
    onWindowResize() {
        this.sizeTokens();
    }

    // Animates a token move with step and settle sounds
    animateTokenMove(playerId, newPosition) {
        console.log(`[gameView] animateTokenMove called for player ${playerId} to position ${newPosition}`);
        // Check if there is no movement needed
        const previousPosition = this.previousPositions[playerId];
        if (previousPosition === newPosition) {
            // No movement, so we don't need to animate or play sounds.
            console.log(`[gameView] no movement needed for player ${playerId}`);
            return;
        }

        // Play step sound
        this.playAudio('step');

        const token = this.tokenElements[playerId];
        const { x, y } = this.tileToPosition(newPosition);

        // Set the position to trigger transition
        if (newPosition === 0) {
            token.classList.add('return-to-staging');
            token.classList.remove('move-to-board');
        } else {
            token.classList.remove('return-to-staging');
            // Add move-to-board class when re-entering from staging (position was 0 previously)
            if (this.previousPositions[playerId] === 0) {
                token.classList.add('move-to-board');
            } else {
                token.classList.remove('move-to-board');
            }
        }

        // Actually move the token to the computed position
        this.setTokenPosition(playerId, x, y);


        // Listen for transitionend on this token
        const onTransitionEnd = () => {
            // Play settle sound
            this.playAudio('settle');

            // Check for ladder or snake
            if (this.model.Ladders.has(newPosition)) {
                this.playAudio('ladder');
            } else if (this.model.Snakes.has(newPosition)) {
                this.playAudio('snake');
            }

            // Remove the event listener
            token.removeEventListener('transitionend', onTransitionEnd);
        };

        token.addEventListener('transitionend', onTransitionEnd);
    }

    // Update dice display
    updateDice(face) {
        // Static dice face
        this.diceElement.style.backgroundImage = `url('${this.assets.diceFaces[face-1].src}')`;
    }

    // Play dice roll animation (tumble) and then show the result
    animateDiceRoll(face, callback) {
        // For simplicity, we'll just show the static face after a short delay
        // In a more advanced version, we would use the tumble sheet and CSS animation
        setTimeout(() => {
            this.updateDice(face);
            if (callback) callback();
        }, 500); // simulate roll time
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
        this.playAudio('turn');
    }

    onExtraRoll() {
        // Indicate extra roll (maybe change button text or add a visual cue)
        this.rollButton.textContent = 'Extra Roll!';
        setTimeout(() => {
            this.rollButton.textContent = 'Roll Dice';
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
        this.rollButton.disabled = true;
        this.rollButton.textContent = 'Game Over!';
        // Show non-blocking win message
        this.messageElement.textContent = `Player ${playerId + 1} wins!`;
        this.messageElement.style.display = 'block';
        setTimeout(() => { this.messageElement.textContent = ''; this.messageElement.style.display = 'none'; }, 3000);
        // Handle game over: after showing win, wait 10 sec then restart
        this.handleGameOver();
    }

    onReset() {
        this.clearTimeouts();
        this.rollButton.textContent = 'Roll Dice';
        this.rollButton.disabled = false;
        this.updateTokenPositions();
        this.updatePlayerInfo();
        this.diceElement.style.backgroundImage = ''; // clear dice
    }

    // Update token positions (called on reset, without animation)
    updateTokenPositions() {
        const boardWidth = this.boardElement.clientWidth;
        const boardHeight = this.boardElement.clientHeight;

        for (let i = 0; i < this.model.NUM_PLAYERS; i++) {
            const position = this.model.getPlayerPosition(i);
            const pos = this.tileToPosition(position);
            const token = this.tokenElements[i];

            // Set position as percentage of board size (centered)
            this.setTokenPosition(i, pos.x, pos.y);

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
