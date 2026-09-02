const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'test_output', 'qa_screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const BASE_URL = 'http://localhost:8000/?debug=1';

// Test results collector
const results = {
    test1_kiosk: { passed: false, details: [], screenshots: [] },
    test2_nonkiosk: { passed: false, details: [], screenshots: [] },
    test3_mobile: { passed: false, details: [], screenshots: [] },
    summary: {}
};

async function takeScreenshot(page, name) {
    if (!page || page.isClosed()) {
        console.warn(`Cannot take screenshot ${name}: page is closed`);
        return null;
    }
    try {
        const filepath = path.join(SCREENSHOT_DIR, `${name}.png`);
        await page.screenshot({ path: filepath, fullPage: true });
        return filepath;
    } catch (e) {
        console.warn(`Screenshot failed for ${name}:`, e.message);
        return null;
    }
}

async function waitForGameInit(page, timeout = 15000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        const initialized = await page.evaluate(() => {
            return window.gameViewInstance && 
                   window.gameViewInstance.model && 
                   window.gameViewInstance.controller &&
                   window.gameViewInstance.isAssetsLoaded;
        });
        if (initialized) return true;
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    return false;
}

// ============================================================
// TEST 1: Desktop Kiosk Mode
// - Launch with --app flag (simulates standalone/kiosk mode)
// - Verify auto-start (no start button)
// - Verify audio format selection (MP3 on WebKit, OGG on others)
// - Verify all 12 events produce sound
// ============================================================
async function testKioskMode(browser) {
    console.log('\n=== TEST 1: Desktop Kiosk Mode ===');
    let page;
    
    try {
        // Create a new page
        page = await browser.newPage();
        
        // Emulate standalone display mode
        await page.evaluateOnNewDocument(() => {
            // Mock matchMedia for (display-mode: standalone)
            const originalMatchMedia = window.matchMedia;
            window.matchMedia = (query) => {
                if (query === '(display-mode: standalone)') {
                    return { matches: true, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => {} };
                }
                return originalMatchMedia(query);
            };
        });
        
        // Set viewport to desktop
        await page.setViewport({ width: 1200, height: 800 });
        
        // Track audio requests
        const audioRequests = [];
        page.on('request', request => {
            if (request.resourceType() === 'media' && request.url().includes('.mp3')) {
                audioRequests.push({ url: request.url(), format: 'mp3' });
            } else if (request.resourceType() === 'media' && request.url().includes('.ogg')) {
                audioRequests.push({ url: request.url(), format: 'ogg' });
            }
        });
        
        // Track console logs for audio playback
        const consoleLogs = [];
        page.on('console', msg => {
            consoleLogs.push(msg.text());
        });
        
        await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Wait for game to fully initialize
        await waitForGameInit(page);
        
        // Expose game objects for testing
        await page.evaluate(() => {
            window.gameView = window.gameViewInstance;
            window.gameModel = window.gameViewInstance.model;
            window.gameController = window.gameViewInstance.controller;
        });
        
        // Wait for game to initialize
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if start button is NOT present (should auto-start in kiosk)
        const startButton = await page.$('#start-arena-btn');
        const buttonVisible = startButton ? await startButton.isIntersectingViewport() : false;
        
        results.test1_kiosk.details.push(`Start button visible: ${buttonVisible} (expected: false)`);
        
        if (buttonVisible) {
            results.test1_kiosk.details.push('FAIL: Start button should not be visible in kiosk mode with autoplay allowed');
        } else {
            results.test1_kiosk.details.push('PASS: No start button visible - auto-start working');
        }
        
        // Check audio format used
        const audioFormat = await page.evaluate(() => {
            const audio = new Audio();
            const canPlayMp3 = audio.canPlayType('audio/mpeg');
            return canPlayMp3 ? 'mp3' : 'ogg';
        });
        results.test1_kiosk.details.push(`Browser preferred audio format: ${audioFormat}`);
        
        // Verify audio elements loaded with correct format
        const loadedAudioFormats = await page.evaluate(() => {
            const formats = {};
            if (window.gameView && window.gameView.assets && window.gameView.assets.audio) {
                for (const [event, audio] of Object.entries(window.gameView.assets.audio)) {
                    formats[event] = audio.src.split('.').pop();
                }
            }
            return formats;
        });
        results.test1_kiosk.details.push(`Loaded audio formats: ${JSON.stringify(loadedAudioFormats)}`);
        
        // Check that all 12 events have audio
        const expectedEvents = ['roll', 'step', 'settle', 'ladder', 'snake', 'six', 'triple_six', 'turn', 'win', 'gameover', 'capture', 'enter'];
        const missingEvents = expectedEvents.filter(e => !loadedAudioFormats[e]);
        if (missingEvents.length === 0) {
            results.test1_kiosk.details.push('PASS: All 12 audio events loaded');
        } else {
            results.test1_kiosk.details.push(`FAIL: Missing audio events: ${missingEvents.join(', ')}`);
        }
        
        // Verify audio format matches browser capability
        const formatMatches = Object.values(loadedAudioFormats).every(f => f === audioFormat);
        results.test1_kiosk.details.push(`All audio use ${audioFormat}: ${formatMatches ? 'PASS' : 'FAIL'}`);
        
        // Wait a bit for game to play some sounds
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check if any audio played (via console logs)
        const audioPlayLogs = consoleLogs.filter(log => log.includes('playAudio') || log.includes('audio'));
        results.test1_kiosk.details.push(`Audio-related logs: ${audioPlayLogs.length} entries`);
        
        // Screenshot
        const screenshot = await takeScreenshot(page, 'test1_kiosk_mode');
        if (screenshot) results.test1_kiosk.screenshots.push(screenshot);
        
        // Determine pass/fail
        results.test1_kiosk.passed = !buttonVisible && missingEvents.length === 0 && formatMatches;
        
    } catch (error) {
        results.test1_kiosk.details.push(`ERROR: ${error.message}`);
        results.test1_kiosk.passed = false;
        const screenshot = await takeScreenshot(page, 'test1_kiosk_mode_error');
        if (screenshot) results.test1_kiosk.screenshots.push(screenshot);
    } finally {
        if (page && !page.isClosed()) await page.close();
    }
}

// ============================================================
// TEST 2: Desktop Non-Kiosk Mode
// - Launch normally (not standalone)
// - Verify start button appears immediately
// - Verify nothing auto-starts until clicked
// - Test with audio blocked (simulate network failure for audio)
// ============================================================
async function testNonKioskMode(browser) {
    console.log('\n=== TEST 2: Desktop Non-Kiosk Mode ===');
    let page;
    
    try {
        page = await browser.newPage();
        
        // Explicitly mock matchMedia to return false for standalone (non-kiosk)
        await page.evaluateOnNewDocument(() => {
            const originalMatchMedia = window.matchMedia;
            window.matchMedia = (query) => {
                if (query === '(display-mode: standalone)') {
                    return { matches: false, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => {} };
                }
                return originalMatchMedia(query);
            };
        });
        
        await page.setViewport({ width: 1200, height: 800 });
        
        // Block audio requests to simulate network failure
        await page.setRequestInterception(true);
        page.on('request', request => {
            if (request.resourceType() === 'media' && (request.url().includes('.mp3') || request.url().includes('.ogg'))) {
                request.abort('failed');
            } else {
                request.continue();
            }
        });
        
        // Track console logs
        const consoleLogs = [];
        page.on('console', msg => {
            consoleLogs.push(msg.text());
        });
        
        await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Wait for game to fully initialize
        await waitForGameInit(page);
        
        // Expose game objects for testing
        await page.evaluate(() => {
            window.gameView = window.gameViewInstance;
            window.gameModel = window.gameViewInstance.model;
            window.gameController = window.gameViewInstance.controller;
        });
        
        // Wait for game to initialize
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Debug: check isKioskMode and start button state
        const debugInfo = await page.evaluate(() => {
            return {
                isKioskMode: window.gameViewInstance.isKioskMode,
                startButtonInDOM: !!document.getElementById('start-arena-btn'),
                startButtonParent: window.gameViewInstance.startButtonElement.parentNode ? 'yes' : 'no',
                containerHasButton: window.gameViewInstance.container.contains(window.gameViewInstance.startButtonElement),
                containerInnerHTML: window.gameViewInstance.container.innerHTML.substring(0, 500)
            };
        });
        results.test2_nonkiosk.details.push(`Debug info: ${JSON.stringify(debugInfo)}`);
        
        // Check if start button is visible IMMEDIATELY (should be shown in createDOM for non-kiosk)
        // Use the gameViewInstance's startButtonElement directly since it may not have the expected ID
        const startButtonHandle = await page.evaluateHandle(() => window.gameViewInstance.startButtonElement);
        const buttonVisible = await startButtonHandle.evaluate(el => el.offsetParent !== null);
        
        results.test2_nonkiosk.details.push(`Start button visible immediately: ${buttonVisible} (expected: true)`);
        
        if (buttonVisible) {
            results.test2_nonkiosk.details.push('PASS: Start button visible immediately on load');
        } else {
            results.test2_nonkiosk.details.push('FAIL: Start button not visible immediately');
        }
        
        // Check that game hasn't auto-started (no dice rolls, tokens at position 0)
        const gameState = await page.evaluate(() => {
            if (window.gameModel) {
                return {
                    positions: window.gameModel.pawn_positions,
                    currentTurn: window.gameModel.active_player,
                    isGameOver: window.gameModel.isGameOver(),
                    // Debug: list all properties
                    keys: Object.keys(window.gameModel)
                };
            }
            return null;
        });
        
        results.test2_nonkiosk.details.push(`Initial game state: ${JSON.stringify(gameState)}`);
        
        if (gameState && gameState.positions && gameState.positions.every(p => p === 0)) {
            results.test2_nonkiosk.details.push('PASS: Game has not auto-started (all tokens at position 0)');
        } else {
            results.test2_nonkiosk.details.push('FAIL: Game appears to have auto-started');
        }
        
        // Click the start button
        if (buttonVisible) {
            await startButtonHandle.evaluate(el => el.click());
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Verify game started after click
            const gameStateAfterClick = await page.evaluate(() => {
                if (window.gameModel) {
                    return {
                        positions: window.gameModel.pawn_positions,
                        currentTurn: window.gameModel.active_player,
                        isGameOver: window.gameModel.isGameOver(),
                        keys: Object.keys(window.gameModel)
                    };
                }
                return null;
            });
            
            results.test2_nonkiosk.details.push(`Game state after click: ${JSON.stringify(gameStateAfterClick)}`);
            
            // Game starts after click - check if active_player is set (should be 0 for first player)
            if (gameStateAfterClick && gameStateAfterClick.currentTurn !== undefined && gameStateAfterClick.currentTurn !== null) {
                results.test2_nonkiosk.details.push('PASS: Game started after button click');
            } else {
                results.test2_nonkiosk.details.push('FAIL: Game did not start after button click');
            }
        }
        
        // Screenshot
        const screenshot = await takeScreenshot(page, 'test2_nonkiosk_mode');
        if (screenshot) results.test2_nonkiosk.screenshots.push(screenshot);
        
        // Determine pass/fail
        results.test2_nonkiosk.passed = buttonVisible && gameState && gameState.positions && gameState.positions.every(p => p === 0);
        
    } catch (error) {
        results.test2_nonkiosk.details.push(`ERROR: ${error.message}`);
        results.test2_nonkiosk.passed = false;
        const screenshot = await takeScreenshot(page, 'test2_nonkiosk_mode_error');
        if (screenshot) results.test2_nonkiosk.screenshots.push(screenshot);
    } finally {
        if (page && !page.isClosed()) await page.close();
    }
}

// ============================================================
// TEST 3: Mobile Viewport (390x844 portrait)
// - Emulate iPhone 14/15/16 viewport
// - Verify no horizontal overflow
// - Verify board fills width
// - Verify layout stacks: title → board → commentary
// - Verify commentary is scrollable
// ============================================================
async function testMobileViewport(browser) {
    console.log('\n=== TEST 3: Mobile Viewport (390x844 portrait) ===');
    let page;
    
    try {
        page = await browser.newPage();
        
        // Emulate iPhone 14 Pro (390x844)
        await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
        await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15');
        
        const consoleLogs = [];
        page.on('console', msg => {
            consoleLogs.push(msg.text());
        });
        
        await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Wait for game to fully initialize
        await waitForGameInit(page);
        
        // Expose game objects for testing
        await page.evaluate(() => {
            window.gameView = window.gameViewInstance;
            window.gameModel = window.gameViewInstance.model;
            window.gameController = window.gameViewInstance.controller;
        });
        
        // Wait for game to initialize
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Click start button if present (non-kiosk mode)
        const startButtonHandle = await page.evaluateHandle(() => window.gameViewInstance.startButtonElement);
        const buttonVisible = await startButtonHandle.evaluate(el => el.offsetParent !== null);
        if (buttonVisible) {
            await startButtonHandle.evaluate(el => el.click());
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Trigger many game turns to generate commentary
        await page.evaluate(() => {
            if (window.gameController) {
                for (let i = 0; i < 20; i++) {
                    if (!window.gameModel.isGameOver()) {
                        window.gameController.rollDice();
                    }
                }
            }
        });
        
        // Wait for commentary to accumulate
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Debug: check commentary panel state
        const commentaryDebug = await page.evaluate(() => {
            const commentaryContent = document.getElementById('commentary-content');
            const commentaryPanel = document.getElementById('right-commentary-panel');
            return {
                contentScrollHeight: commentaryContent ? commentaryContent.scrollHeight : 0,
                contentClientHeight: commentaryContent ? commentaryContent.clientHeight : 0,
                contentInnerHTML: commentaryContent ? commentaryContent.innerHTML.length : 0,
                panelStyle: commentaryPanel ? window.getComputedStyle(commentaryPanel).cssText : '',
                contentStyle: commentaryContent ? window.getComputedStyle(commentaryContent).cssText : ''
            };
        });
        results.test3_mobile.details.push(`Commentary debug: ${JSON.stringify(commentaryDebug)}`);
        
        // Check for horizontal overflow
        const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
        const bodyClientWidth = await page.evaluate(() => document.body.clientWidth);
        const hasHorizontalOverflow = bodyScrollWidth > bodyClientWidth;
        
        results.test3_mobile.details.push(`Body scrollWidth: ${bodyScrollWidth}, clientWidth: ${bodyClientWidth}`);
        results.test3_mobile.details.push(`Horizontal overflow: ${hasHorizontalOverflow} (expected: false)`);
        
        if (!hasHorizontalOverflow) {
            results.test3_mobile.details.push('PASS: No horizontal scroll/overflow');
        } else {
            results.test3_mobile.details.push('FAIL: Horizontal overflow detected');
        }
        
        // Check layout stacking order (title → board → commentary)
        const layoutInfo = await page.evaluate(() => {
            const titlePanel = document.getElementById('left-title-panel');
            const boardContainer = document.getElementById('game-board-container');
            const commentaryPanel = document.getElementById('right-commentary-panel');
            const container = document.getElementById('game-container');
            
            if (!titlePanel || !boardContainer || !commentaryPanel || !container) {
                return { error: 'Elements not found' };
            }
            
            const titleRect = titlePanel.getBoundingClientRect();
            const boardRect = boardContainer.getBoundingClientRect();
            const commentaryRect = commentaryPanel.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            // Check vertical stacking order
            const titleTop = titleRect.top;
            const boardTop = boardRect.top;
            const commentaryTop = commentaryRect.top;
            
            const isStackedCorrectly = titleTop < boardTop && boardTop < commentaryTop;
            
            // Check board fills width
            const boardWidth = boardRect.width;
            const containerWidth = containerRect.width;
            const boardFillsWidth = boardWidth >= containerWidth * 0.95; // 95% tolerance
            
            // Check commentary scrollable
            const commentaryContent = document.getElementById('commentary-content');
            const commentaryScrollable = commentaryContent ? commentaryContent.scrollHeight > commentaryContent.clientHeight : false;
            
            return {
                titleTop,
                boardTop,
                commentaryTop,
                isStackedCorrectly,
                boardWidth,
                containerWidth,
                boardFillsWidth,
                commentaryScrollable,
                commentaryContentHeight: commentaryContent ? commentaryContent.scrollHeight : 0,
                commentaryViewportHeight: commentaryContent ? commentaryContent.clientHeight : 0
            };
        });
        
        results.test3_mobile.details.push(`Layout info: ${JSON.stringify(layoutInfo, null, 2)}`);
        
        if (layoutInfo.isStackedCorrectly) {
            results.test3_mobile.details.push('PASS: Layout stacks correctly (title → board → commentary)');
        } else {
            results.test3_mobile.details.push('FAIL: Layout stacking order incorrect');
        }
        
        if (layoutInfo.boardFillsWidth) {
            results.test3_mobile.details.push('PASS: Board fills viewport width');
        } else {
            results.test3_mobile.details.push(`FAIL: Board does not fill width (board: ${layoutInfo.boardWidth}, container: ${layoutInfo.containerWidth})`);
        }
        
        if (layoutInfo.commentaryScrollable) {
            results.test3_mobile.details.push('PASS: Commentary panel is scrollable');
        } else {
            results.test3_mobile.details.push('FAIL: Commentary panel is not scrollable');
        }
        
        // Screenshot
        const screenshot = await takeScreenshot(page, 'test3_mobile_390x844');
        if (screenshot) results.test3_mobile.screenshots.push(screenshot);
        
        // Determine pass/fail
        results.test3_mobile.passed = !hasHorizontalOverflow && 
                                       layoutInfo.isStackedCorrectly && 
                                       layoutInfo.boardFillsWidth && 
                                       layoutInfo.commentaryScrollable;
        
    } catch (error) {
        results.test3_mobile.details.push(`ERROR: ${error.message}`);
        results.test3_mobile.passed = false;
        const screenshot = await takeScreenshot(page, 'test3_mobile_error');
        if (screenshot) results.test3_mobile.screenshots.push(screenshot);
    } finally {
        if (page && !page.isClosed()) await page.close();
    }
}

async function main() {
    console.log('Starting QA Acceptance Tests...');
    console.log('Test output directory:', SCREENSHOT_DIR);
    
    // Start the server if not running
    const { spawn } = require('child_process');
    const server = spawn('python3', ['tools/serve_nocache.py', '8000'], {
        cwd: path.join(__dirname, '..'),
        detached: true,
        stdio: 'ignore'
    });
    
    // Give server time to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required']
    });
    
    try {
        await testKioskMode(browser);
        await testNonKioskMode(browser);
        await testMobileViewport(browser);
    } finally {
        await browser.close();
        server.kill();
    }
    
    // Generate summary
    results.summary = {
        test1_kiosk: results.test1_kiosk.passed ? 'PASS' : 'FAIL',
        test2_nonkiosk: results.test2_nonkiosk.passed ? 'PASS' : 'FAIL',
        test3_mobile: results.test3_mobile.passed ? 'PASS' : 'FAIL',
        overall: (results.test1_kiosk.passed && results.test2_nonkiosk.passed && results.test3_mobile.passed) ? 'PASS' : 'FAIL'
    };
    
    // Save results
    const outputPath = path.join(__dirname, '..', 'test_output', 'qa_acceptance_report.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    
    console.log('\n=== QA ACCEPTANCE TEST RESULTS ===');
    console.log(JSON.stringify(results, null, 2));
    console.log(`\nReport saved to: ${outputPath}`);
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
    
    process.exit(results.summary.overall === 'PASS' ? 0 : 1);
}

main().catch(err => {
    console.error('Test runner failed:', err);
    process.exit(1);
});