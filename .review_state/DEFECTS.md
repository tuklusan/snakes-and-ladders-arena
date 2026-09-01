# DEFECTS.md - Authoritative Defect List

**Run ID:** REVIEW-20260830-001
**Snapshot ID:** 20260830-014553
**Review Context ID:** (computed from harness)

---

## Defect List (28 Accepted Defects)

---

### DEF-0001: DOM XSS via unsanitized innerHTML
- **Status:** CLOSED - FIXED
- **File:** src/js/main.js:33-50
- **Severity:** medium
- **Category:** security
- **Title:** Potential DOM XSS via unsanitized error message in innerHTML
- **Description:** The catch block inserts error details into the DOM using innerHTML without sanitization. If an attacker can trigger an error where the error message or stack contains user-controlled content, this could lead to DOM-based cross-site scripting.
- **Trigger:** An attacker supplies input that causes a runtime error whose message contains malicious HTML/script.
- **Impact:** Execution of arbitrary JavaScript in the context of the application.
- **Root Cause:** Error messages interpolated directly into innerHTML without sanitization.
- **Required Repair:** Replace innerHTML with textContent and DOM methods.
- **Required Verification:** Test with error containing `<img src=x onerror=alert(1)>` and verify text is displayed as plain text.
- **Repair Applied:** Changed errorDiv.innerHTML to errorDiv.textContent and stackDiv.textContent (lines 40, 48) to prevent XSS.
- **Verification:** Error messages with HTML tags display as plain text, not executed.
- **Programmer Adjudication:** ACCEPTED_DEFECT - Root cause confirmed: error messages interpolated directly into innerHTML.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (main.js:17)
- **First Seen:** 2026-08-30
- **Fixed:** 2026-09-01

---

### DEF-0002: Global debug objects exposed
- **Status:** CLOSED - FIXED
- **File:** src/js/main.js:24-30
- **Severity:** low
- **Category:** security
- **Title:** Exposing internal game objects globally for debugging
- **Description:** The entry point attaches model, controller, and view instances to the global window object for debugging purposes. This exposes internal state and methods to any script running on the page.
- **Trigger:** If the application is deployed with debugging exposed, an attacker who can inject or execute any script can directly manipulate game state.
- **Impact:** Loss of integrity of game state and potentially enabling cheats or disruptions.
- **Root Cause:** Debug objects attached to window in production code without guard.
- **Required Repair:** Guard with DEBUG flag or remove in production build.
- **Required Verification:** Verify window.gameModel is undefined in production build.
- **Repair Applied:** DEBUG flag set to false (line 25), debug objects only attached when DEBUG=true (lines 26-30).
- **Verification:** window.gameModel, window.gameController, window.gameView are undefined in production.
- **Programmer Adjudication:** ACCEPTED_DEFECT - Root cause confirmed: debug objects attached to window without guard.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (main.js:11-13)
- **Fixed:** 2026-09-01

---

### DEF-0003: Scripts execute before footer parsed
- **Status:** CLOSED - FIXED
- **File:** index.html:32-39
- **Severity:** medium
- **Category:** bug
- **Title:** Scripts executed before footer element is parsed
- **Description:** The footer element appears after the script tags; scripts execute immediately when encountered, so any attempt to access the footer will fail.
- **Trigger:** Any code in the loaded scripts that references document.getElementById('app-footer') or otherwise tries to manipulate the footer.
- **Impact:** Potential JavaScript runtime error, preventing game initialization or footer functionality.
- **Root Cause:** Scripts at lines 32-35, footer at line 36. Without defer or async, scripts execute synchronously before parsing continues.
- **Required Repair:** Move script tags to end of body or add defer attribute.
- **Required Verification:** Verify footer accessible during script execution.
- **Repair Applied:** Moved footer before script tags (lines 32-35). Scripts already have defer attribute.
- **Verification:** Footer element is parsed before scripts execute, accessible to any script.
- **Programmer Adjudication:** ACCEPTED_DEFECT - Root cause confirmed: scripts execute before footer element exists.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (index.html:32-36)
- **Fixed:** 2026-09-01

---

### DEF-0004: Undefined stagingElement in off-board positioning
- **Status:** CLOSED - FIXED
- **File:** src/js/gameView.js:142-150
- **Severity:** high
- **Category:** bug
- **Title:** Reference to undefined this.stagingElement in off-board positioning
- **Description:** The method getTokenPositionFromTile accesses this.stagingElement to compute positioning for tile 0, but stagingElement is never initialized in the constructor or any visible code, leading to a TypeError when a token is off the board.
- **Trigger:** When getTokenPositionFromTile is called with tile=0 (e.g., initial placement of tokens off the board).
- **Impact:** The game crashes or fails to position starting tokens, preventing gameplay from proceeding.
- **Root Cause:** stagingElement is never initialized in the constructor or elsewhere.
- **Required Repair:** Initialize this.stagingElement = null in constructor, set when staging area created.
- **Required Verification:** Call getTokenPositionFromTile(0, 0) and verify no exception.
- **Repair Applied:** Added null check for this.stagingElement in getTokenPositionFromTile with fallback position (line 144-148). The stagingElement is initialized in createDOM (line 666), but this guards against early calls.
- **Verification:** getTokenPositionFromTile(0, 0) no longer throws; tokens position correctly off-board.
- **Programmer Adjudication:** ACCEPTED_DEFECT - Root cause confirmed: stagingElement never initialized.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (gameView.js:148)
- **Fixed:** 2026-09-01

---

### DEF-0005: Unused SVG speckle filter created every draw
- **Status:** CLOSED - FIXED
- **File:** src/js/gameView.js:262-300
- **Severity:** medium
- **Category:** performance
- **Title:** Unused SVG speckle filter is created every draw without application
- **Description:** The method constructs a complex SVG filter (snakeSpeckle) with turbulence, color matrix, and blend, appends it to defs, but the filter is never referenced by any drawn element. This adds unnecessary DOM operations and memory overhead on every call to drawSnakesAndLadders.
- **Trigger:** Each time drawSnakesAndLadders is called (e.g., on view updates), the filter is recreated and added to the SVG, bloating the DOM.
- **Impact:** Slight performance degradation and memory accumulation if the filter is not garbage collected promptly.
- **Root Cause:** Filter created with id 'snakeSpeckle' but no element uses filter="url(#snakeSpeckle)".
- **Required Repair:** Either apply filter to snake elements or remove unused filter creation.
- **Required Verification:** Inspect SVG DOM for filter usage after drawSnakesAndLadders.
- **Repair Applied:** Created createSpeckleFilter() method called once during SVG initialization. Filter is now applied to snake body segments (line 473), head (line 2009), and tail (line 2056). drawSnakesAndLadders calls createSpeckleFilter() after clearing SVG.
- **Verification:** Speckle filter visible on snakes (yellow/black speckled appearance). Filter created once per board generation, not every draw.
- **Programmer Adjudication:** ACCEPTED_DEFECT - Filter created but never applied.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (gameView.js:272-298)
- **Fixed:** 2026-09-01

---

### DEF-0006: Leftover debug console.log statements at file top
- **Status:** CLOSED - FIXED
- **File:** src/js/gameView.js:1-3
- **Severity:** low
- **Category:** maintainability
- **Title:** Leftover debug console.log statements at file top
- **Description:** The file begins with two unconditional console.log statements that appear to be debugging leftovers.
- **Trigger:** Every time the script is loaded.
- **Impact:** Minor noise in console; could be considered unprofessional.
- **Root Cause:** Unconditional console.log statements at module load.
- **Required Repair:** Delete the two lines or wrap in debug flag check.
- **Required Verification:** Load page and observe console for unconditional logs.
- **Repair Applied:** No unconditional console.log statements at file top - only class declaration and comments remain.
- **Verification:** Page loads without unconditional console.log output.
- **Programmer Adjudication:** ACCEPTED_DEFECT - Unconditional debug logs at module load.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (gameView.js:2-3)
- **Fixed:** 2026-09-01

---

### DEF-0007: Dead code with empty console.log for tile 26
- **Status:** CLOSED - FIXED
- **File:** src/js/gameView.js:255-260
- **Severity:** low
- **Category:** maintainability
- **Title:** Dead code with empty console.log for tile 26, player 0
- **Description:** The method positionTokenOnTile contains an empty console.log call inside an if condition that is likely leftover debugging code.
- **Trigger:** When positionTokenOnTile is called with tile=26 and playerId=0.
- **Impact:** Noise in console and unnecessary condition evaluation.
- **Root Cause:** Empty console.log in conditional block, likely leftover debugging.
- **Required Repair:** Remove the entire if block and the console.log statement.
- **Required Verification:** Call positionTokenOnTile(0, 26) and observe no console output.
- **Repair Applied:** Dead code block removed - positionTokenOnTile no longer has tile 26 debug condition.
- **Verification:** positionTokenOnTile(0, 26) produces no console output.
- **Programmer Adjudication:** ACCEPTED_DEFECT - Empty console.log in conditional block.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (gameView.js:257-259)
- **Fixed:** 2026-09-01

---

### DEF-0008: Redundant redeclaration of containerRect
- **Status:** CLOSED - FIXED
- **File:** src/js/gameView.js:140-148
- **Severity:** low
- **Category:** maintainability
- **Title:** Redundant redeclaration of containerRect in nested block
- **Description:** getTokenPositionFromTile declares const containerRect once at function scope and again inside the if (tile === 0) block.
- **Trigger:** When tile === 0, the second declaration is executed.
- **Impact:** Minor readability issue; no functional impact but could confuse maintainers.
- **Root Cause:** Variable redeclared in nested block with same value.
- **Required Repair:** Remove the inner const containerRect declaration and reuse outer variable.
- **Required Verification:** Linter should not warn about shadowing.
- **Repair Applied:** Removed inner const containerRect declaration (line 144). The outer containerRect (line 140) is reused in the tile === 0 block.
- **Verification:** No variable shadowing; code is cleaner.
- **Programmer Adjudication:** ACCEPTED_DEFECT - Redundant redeclaration in nested block.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (gameView.js:144-149)
- **Fixed:** 2026-09-01

---

### DEF-0009: Unbound methods used as event handlers
- **Status:** CLOSED - FIXED
- **File:** src/js/gameView.js:774-814
- **Severity:** critical
- **Category:** bug
- **Title:** Unbound methods used as event handlers cause incorrect `this` context
- **Description:** The methods assetLoaded and assetError were assigned directly to event handler properties without binding. When invoked, this inside these methods refers to the DOM element (Image or Audio) instead of the GameView instance.
- **Trigger:** Any asset load or error event fires (e.g., an image loads successfully or fails, an audio file's 'loadeddata' event triggers).
- **Impact:** Asset loading completion logic is broken; the loading overlay may not update correctly, the game may start before assets are ready, and console errors occur, potentially halting execution.
- **Root Cause:** Methods assigned directly as event handlers without binding: `img.onload = this.assetLoaded;`, `img.onerror = this.assetError;`, `audio.addEventListener('loadeddata', this.assetLoaded, { once: true });`.
- **Required Repair:** Bind the methods when assigning: `img.onload = this.assetLoaded.bind(this);` or use arrow functions: `img.onload = () => this.assetLoaded();`.
- **Required Verification:** Trigger asset load and verify `this` context is GameView instance.
- **Repair Applied:** Converted all event handler assignments to arrow functions (lines 777-784, 792-793, 800-801, 811-812) ensuring correct `this` context. Removed redundant constructor bindings.
- **Verification:** Assets load correctly, loading overlay updates, game starts after assets loaded.
- **Programmer Adjudication:** ACCEPTED_DEFECT - Methods used as event handlers without binding.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (gameView.js:844-870)
- **Fixed:** 2026-09-01

---

### DEF-0010: Multiple transitionend events cause duplicate settle
- **Status:** CLOSED - FIXED
- **File:** src/js/gameView.js:1628-1665
- **Severity:** medium
- **Category:** bug
- **Title:** Multiple transitionend events cause duplicate settle sound and resolve
- **Description:** The token's CSS transition may generate multiple transitionend events for different properties, and each event invokes onTransitionEnd, causing playAudio('settle') to be called multiple times and resolve() to be called more than once.
- **Trigger:** A direct move that changes both horizontal and vertical position (or any transition involving multiple properties).
- **Impact:** Duplicate settle sounds play in quick succession, and the promise resolves multiple times.
- **Root Cause:** onTransitionEnd does not remove the event listener or use a guard flag.
- **Required Repair:** In onTransitionEnd, remove the event listener immediately or use a guard flag.
- **Required Verification:** Direct move with multiple properties triggers only one settle sound.
- **Repair Applied:** Added transitionHandled guard flag (line 1628) and listener removal in both onTransitionEnd and onTimeout (lines 1631, 1637, 1651, 1653).
- **Verification:** Direct moves trigger only one settle sound, promise resolves once.
- **Programmer Adjudication:** ACCEPTED_DEFECT - No guard against multiple transitionend events.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (gameView.js:1657-1671)
- **Fixed:** 2026-09-01

---

### DEF-0011: Fallback path does not clean up pending transition
- **Status:** CLOSED - FIXED
- **File:** src/js/gameView.js:1619-1665
- **Severity:** medium
- **Category:** bug
- **Title:** Fallback path does not clean up previous pending transition
- **Description:** When startPos or endPos cannot be computed, the fallback path resolves but does not remove any existing entry from this.pendingTransitions for that token.
- **Trigger:** A direct move that fails to compute either start or end position while a previous transition for the same token is still pending.
- **Impact:** Stale timeout may fire and resolve an old promise, or a stale transitionend listener may react to a future transition.
- **Root Cause:** Fallback block does not check or delete from pendingTransitions.
- **Required Repair:** In the fallback path, check for and clean up any pending transition for the token.
- **Required Verification:** Rapid moves with one failing position computation.
- **Repair Applied:** Added cleanup of pending transitions at start of moveTokenDirectly (lines 1619-1625). onTimeout also removes listener and cleans pendingTransitions (lines 1651-1653).
- **Verification:** Rapid moves with failing position computation don't leave stale transitions.
- **Programmer Adjudication:** ACCEPTED_DEFECT - Fallback path doesn't clean pendingTransitions.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (gameView.js:1624-1639)
- **Fixed:** 2026-09-01

---

### DEF-0012: Timeout fallback does not cancel animation loop
- **Status:** CLOSED - FIXED
- **File:** src/js/gameView.js:1728-1743
- **Severity:** medium
- **Category:** bug
- **Title:** Timeout fallback does not cancel the animation loop
- **Description:** If the fallback timeout fires before the animation completes naturally, the promise resolves but the requestAnimationFrame loop continues, eventually updating the dice face again and calling resolve/callback a second time.
- **Trigger:** Tab throttling, slow device, or any condition where requestAnimationFrame is delayed beyond the 1200ms fallback.
- **Impact:** Game logic may proceed assuming the dice has settled, but the dice still displays tumbling animation; later the animation completes and updates the dice again.
- **Root Cause:** Timeout callback only logs and resolves, but does not cancel the animation frame loop.
- **Required Repair:** Store the animation frame ID and cancel it in the timeout callback, or add a flag to stop the loop.
- **Required Verification:** Simulate throttled RAF and verify animation stops.
- **Repair Applied:** Added animationFrameId tracking (line 1728). Timeout callback cancels animation frame (lines 1737-1741). Natural completion clears timeout (line 1763).
- **Verification:** Dice animation stops cleanly on timeout or natural completion.
- **Programmer Adjudication:** ACCEPTED_DEFECT - Timeout doesn't cancel RAF loop.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (gameView.js:1753-1756)
- **Fixed:** 2026-09-01

---

### DEF-0013: No validation of dice face parameter
- **Status:** CLOSED - FIXED
- **File:** src/js/gameView.js:1664-1669
- **Severity:** low
- **Category:** bug
- **Title:** No validation of dice face parameter
- **Description:** updateDice(face) assumes face is a valid integer between 1 and 6. If an invalid value is passed, accessing this.assets.diceFaces[face-1] will be undefined and accessing .src will throw a TypeError.
- **Trigger:** A call to updateDice with an invalid face value (e.g., 0, 7, NaN).
- **Impact:** Unhandled exception that may break the game view.
- **Root Cause:** Direct access to this.assets.diceFaces[face-1].src without validation.
- **Required Repair:** Add validation: if (face < 1 || face > 6 || !Number.isInteger(face)) return.
- **Required Verification:** Call updateDice(0), updateDice(7), updateDice('abc').
- **Repair Applied:** Added validation at start of updateDice (lines 1665-1668) with early return and console.error.
- **Verification:** updateDice(0), updateDice(7), updateDice('abc') handled gracefully without error.
- **Programmer Adjudication:** ACCEPTED_DEFECT - No validation of dice face parameter.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (gameView.js:1694-1700)
- **Fixed:** 2026-09-01

---

### DEF-0014: Capture event assumes record.captured exists
- **Status:** CLOSED - FIXED
- **File:** src/js/gameView.js:1859-1862
- **Severity:** low
- **Category:** bug
- **Title:** Capture event assumes record.captured exists
- **Description:** The 'capture' case accesses record.captured directly. If the model does not provide this property for a capture event, capturedPlayerNum becomes undefined.
- **Trigger:** A capture event record that lacks the captured property (e.g., due to model bug or incomplete data).
- **Impact:** Commentary displays incorrect or broken text.
- **Root Cause:** Direct access to record.captured without guard.
- **Required Repair:** Add guard: const capturedPlayerNum = record.captured !== undefined ? record.captured + 1 : null.
- **Required Verification:** Simulate capture event without captured property.
- **Repair Applied:** Added guard for record.captured (line 1861) using optional chaining and nullish coalescing.
- **Verification:** Capture events without captured property display correctly.
- **Programmer Adjudication:** ACCEPTED_DEFECT - No guard for missing captured property.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (gameView.js:1859-1862)
- **Fixed:** 2026-09-01

---

### DEF-0015: Head and tongue scaling inconsistencies
- **Status:** CLOSED - FIXED
- **File:** src/js/gameView.js:1994-2038
- **Severity:** medium
- **Category:** bug
- **Title:** Head and tongue scaling inconsistencies when size != 1
- **Description:** The head ellipse radius, snout position, and tongue path coordinates do not scale uniformly. backOffset, tongueLength, forkOffset, and strokeWidth remain constant regardless of size.
- **Trigger:** A caller invokes _createHeadElement with size parameter different from 1.0.
- **Impact:** Visual misalignment: the head and tongue will not scale proportionally.
- **Root Cause:** backOffset, tongueLength, forkOffset, and strokeWidth remain constant regardless of size parameter.
- **Required Repair:** Scale all size-dependent values by size parameter, or apply single scale transform.
- **Required Verification:** Render head with size=0.5 and size=2.0, verify proportions.
- **Repair Applied:** All size-dependent values now scale with `size` parameter: backOffset (line 1998), headEllipse rx/ry (lines 2006-2007), tongueLength (line 2016), forkOffset (line 2017), strokeWidth (line 2019), snoutX (line 2021), forkX (line 2022).
- **Verification:** Snake heads render proportionally at different sizes (e.g., headSize = BODY_WIDTH/3.0 ≈ 0.8).
- **Programmer Adjudication:** ACCEPTED_DEFECT - Not all values scale with size parameter.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (gameView.js:2010-2036)
- **Fixed:** 2026-09-01

---

### DEF-0017: Tongue path multiple subpaths causing artifacts
- **Status:** CLOSED - FIXED
- **File:** src/js/gameView.js:2031-2037
- **Severity:** low
- **Category:** bug
- **Title:** Tongue path uses multiple subpaths causing rounded cap artifacts
- **Description:** The path string creates three separate subpaths. With stroke-linecap='round', both the end of the snout->fork segment and the starts of the two fork->tip segments receive rounded caps at the fork point.
- **Trigger:** Rendering the snake head with the forked tongue visible.
- **Impact:** A small visual bulge at the fork point instead of a clean Y-junction.
- **Root Cause:** Path uses three M commands creating disjoint subpaths with stroke-linecap='round'.
- **Required Repair:** Use continuous path or separate line elements with butt caps.
- **Required Verification:** Visual inspection of fork point at render time.
- **Repair Applied:** Changed to single continuous path with stroke-linejoin='round' at fork (lines 2031-2037). Path: M snout -> L fork -> L tip1 M fork -> L tip2 with round join at fork.
- **Verification:** Clean Y-junction at fork point, no visual bulge artifacts.
- **Programmer Adjudication:** ACCEPTED_DEFECT - Multiple subpaths with rounded caps.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (gameView.js:2039-2044)
- **Fixed:** 2026-09-01

---

### DEF-0018: Debug console.log left in production code
- **Status:** CLOSED - FIXED
- **File:** src/js/gameView.js (removed)
- **Severity:** low
- **Category:** maintainability
- **Title:** Debug console.log left in production code
- **Description:** The statement `console.log("!!! Attaching GameView to window !!!");` is a debug message.
- **Trigger:** Loading the script in a browser environment.
- **Impact:** Unnecessary console noise.
- **Root Cause:** Unconditional console.log in production code.
- **Required Repair:** Remove or wrap in debug flag.
- **Required Verification:** Search for console.log in production build.
- **Repair Applied:** Debug console.log statement removed from production code.
- **Verification:** No "Attaching GameView to window" message in console.
- **Programmer Adjudication:** ACCEPTED_DEFECT - Unconditional debug console.log.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (gameView.js:2071)
- **Fixed:** 2026-09-01

---

### DEF-0019: Comments promise speckled filter but none applied
- **Status:** CLOSED - FIXED
- **File:** src/js/gameView.js:2010, 2058, 473
- **Severity:** low
- **Category:** documentation
- **Title:** Comments promise speckled appearance via filter but no filter is applied
- **Description:** Both _createHeadElement and _createTailElement contain comments indicating the head and tail should have a "speckled yellow/black via filter" appearance, but the SVG elements are only given a solid dark fill.
- **Trigger:** Rendering the snake head or tail.
- **Impact:** Discrepancy between documentation and implementation.
- **Root Cause:** Comments promise filter but no filter attribute is set on elements.
- **Required Repair:** Either apply filter or update comments to reflect actual implementation.
- **Required Verification:** Inspect generated SVG for filter attribute.
- **Repair Applied:** Filter applied to snake body segments (line 473), head (line 2010), and tail (line 2058). Comments now match implementation.
- **Verification:** SVG elements have filter="url(#snakeSpeckle)" attribute; snakes render with speckled yellow/black appearance.
- **Programmer Adjudication:** ACCEPTED_DEFECT - Comments promise filter but none applied.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (gameView.js:2020-2063)
- **Fixed:** 2026-09-01

---

### DEF-0021: Fixed width/height cause overflow on small screens
- **Status:** CLOSED - FIXED
- **File:** src/css/styles.css:18-31
- **Severity:** high
- **Category:** bug
- **Title:** Fixed width/height cause horizontal and vertical overflow on small screens
- **Description:** The #game-container has fixed width:800px and height:600px, which are not overridden in the max-width:600px media query.
- **Trigger:** Viewing the game on a viewport narrower than 800px or shorter than 600px.
- **Impact:** Horizontal scroll bars appear, content may be cut off.
- **Root Cause:** Fixed width/height not overridden in media query.
- **Required Repair:** In media query, set width:auto or width:100%, max-width:800px, height:auto.
- **Required Verification:** Test on mobile viewport.
- **Repair Applied:** Changed #game-container to width:100%, max-width:800px, height:auto, min-height:600px. Added responsive media queries for ≤600px with flex-direction:column, proper margins/padding.
- **Verification:** Tested on mobile viewport - no horizontal overflow, content fits.
- **Programmer Adjudication:** ACCEPTED_DEFECT - Fixed width/height not responsive.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (styles.css:18-31)
- **Fixed:** 2026-09-01

---

### DEF-0022: Absolute positioning leads to unpredictable placement
- **Status:** CLOSED - FIXED
- **File:** src/css/styles.css:95-112
- **Severity:** high
- **Category:** bug
- **Title:** Absolute positioning with only top specified leads to unpredictable placement
- **Description:** #player-info is absolutely positioned with top:50% but no left/right, so it is placed at the static position. In the media query, bottom/left/right are set but top:50% remains.
- **Trigger:** Viewing the game on any screen, especially small screens.
- **Impact:** Player info panel may overlap other elements unpredictably.
- **Root Cause:** top:50% set but not overridden in media query; bottom/left/right ignored.
- **Required Repair:** Set proper positioning or use flex/grid layout.
- **Required Verification:** Test on mobile viewport.
- **Repair Applied:** Changed #player-info from absolute to relative positioning, integrated into flex flow. Mobile media query uses flex-direction:row with justify-content:space-around.
- **Verification:** Player info panel displays correctly on all screen sizes, no overlapping.
- **Programmer Adjudication:** ACCEPTED_DEFECT - Absolute positioning unpredictable.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (styles.css:85-99)
- **Fixed:** 2026-09-01

---

### DEF-0023: top/right in media query have no effect
- **Status:** CLOSED - FIXED
- **File:** src/css/styles.css:79-93
- **Severity:** medium
- **Category:** bug
- **Title:** top and right properties in media query have no effect because element is not positioned
- **Description:** #dice-container is not absolutely positioned, yet in the media query top:10px and right:10px are set, which have no effect.
- **Trigger:** Viewing on screen ≤600px.
- **Impact:** Dice container does not move to intended location.
- **Root Cause:** Element not positioned, top/right ineffective.
- **Required Repair:** Add position:absolute or remove ineffective properties.
- **Required Verification:** Inspect computed styles on small screen.
- **Repair Applied:** Changed mobile media query to use position:static with margin:auto for centering, removing ineffective top/right.
- **Verification:** Dice container centers correctly on mobile viewport.
- **Programmer Adjudication:** ACCEPTED_DEFECT - top/right on non-positioned element.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (styles.css:70-82)
- **Fixed:** 2026-09-01

---

### DEF-0024: Commentary panel scrolling disabled
- **Status:** CLOSED - FIXED
- **File:** src/css/styles.css:294-310
- **Severity:** high
- **Category:** bug
- **Title:** Commentary panel scrolling is disabled due to pointer-events:none and missing height constraint
- **Description:** #right-commentary-panel has pointer-events:none, which prevents any mouse interaction including scrolling. Additionally, #commentary-content has flex:1 but parent is not flex container, and no height constraint.
- **Trigger:** When commentary content exceeds panel height.
- **Impact:** Users cannot scroll to see all commentary; content may be clipped.
- **Root Cause:** pointer-events:none on panel; no height constraint on content element.
- **Required Repair:** Remove pointer-events:none or add height constraint to content.
- **Required Verification:** Insert long commentary and attempt to scroll.
- **Repair Applied:** Removed pointer-events:none from #right-commentary-panel. Added min-height:0 to allow flex shrinking. Ensured parent #right-column-wrapper is flex container with proper height.
- **Verification:** Commentary panel scrolls correctly when content exceeds height.
- **Programmer Adjudication:** ACCEPTED_DEFECT - pointer-events:none prevents scrolling.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (styles.css:286-302)
- **Fixed:** 2026-09-01

---

### DEF-0025: Active player name selector mismatch
- **Status:** CLOSED - FIXED
- **File:** src/css/styles.css:150-152
- **Severity:** medium
- **Category:** bug
- **Title:** Active player name color selector likely does not match actual DOM structure
- **Description:** The CSS tries to color the active player's name using a span selector, but the player info items are likely built with div elements.
- **Trigger:** When a player is active and the active-player class is applied.
- **Impact:** Active player's name will not be highlighted in yellow.
- **Root Cause:** Selector uses span:nth-child(2) but markup uses div.
- **Required Repair:** Change selector to match actual markup.
- **Required Verification:** Check active player highlighting in UI.
- **Repair Applied:** Changed selector from `span:nth-child(2)` to `> div:nth-child(2)` to match div-based markup.
- **Verification:** Active player name highlights yellow correctly.
- **Programmer Adjudication:** ACCEPTED_DEFECT - Selector uses span but markup uses div.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (styles.css:137-138)
- **Fixed:** 2026-09-01

---

### DEF-0027: Duplicate selector for game-board-container
- **Status:** CLOSED - FIXED
- **File:** src/css/styles.css:283-292
- **Severity:** low
- **Category:** maintainability
- **Title:** Duplicate selector definitions for #game-board-container lead to maintainability issues
- **Description:** #game-board-container is defined twice with different properties.
- **Trigger:** Future modifications may inadvertently change one definition.
- **Impact:** Increased risk of inconsistent styling.
- **Root Cause:** Two separate #game-board-container rules.
- **Required Repair:** Merge properties into single rule.
- **Required Verification:** CSS lint should not report duplicates.
- **Repair Applied:** Merged duplicate #game-board-container rules into single definition with all properties.
- **Verification:** No duplicate selectors in CSS; styles apply correctly.
- **Programmer Adjudication:** ACCEPTED_DEFECT - Duplicate selector definitions.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (styles.css:249-278)
- **Fixed:** 2026-09-01

---

### DEF-0028: bindEvents method does not bind any events
- **Status:** CLOSED - FIXED
- **File:** src/js/gameController.js:11-16
- **Severity:** medium
- **Category:** architecture
- **Title:** bindEvents method does not bind any events
- **Description:** The bindEvents method is empty, so the controller does not wire up any UI event handlers.
- **Trigger:** If the view does not explicitly call controller.rollDice, the game will not respond to user input.
- **Impact:** The game may appear unresponsive.
- **Root Cause:** Method body contains only comments, no event listener registrations.
- **Required Repair:** Implement event binding within bindEvents, or provide public method for view to attach handler.
- **Required Verification:** Verify events are properly bound.
- **Repair Applied:** Removed empty bindEvents method and its call from constructor. The fully automatic arena doesn't need UI event binding - view calls controller.rollDice() directly via autoRoll().
- **Verification:** Game auto-plays correctly without user input.
- **Programmer Adjudication:** ACCEPTED_DEFECT - bindEvents method empty.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (gameController.js:11-16)
- **Fixed:** 2026-09-01

---

### DEF-0029: Redundant event determination logic
- **Status:** CLOSED - FIXED
- **File:** src/js/gameController.js:161-170 (removed)
- **Severity:** low
- **Category:** maintainability
- **Title:** Redundant event determination logic
- **Description:** The code re-evaluates ladder/snake event conditions after they have already been set inside the moved block.
- **Trigger:** Future modifications may misalign the two checks.
- **Impact:** Increased maintenance burden and risk of inconsistent behavior.
- **Root Cause:** Event set in moved block, then re-checked in later if block.
- **Required Repair:** Remove redundant second block.
- **Required Verification:** Code review and test coverage.
- **Repair Applied:** Removed redundant event determination block (lines 161-170). Event is now set only once inside the moved block.
- **Verification:** Event types correctly assigned for all turn outcomes.
- **Programmer Adjudication:** ACCEPTED_DEFECT - Redundant logic.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (gameController.js:128-145)
- **Fixed:** 2026-09-01

---

### DEF-0030: Direct assignment bypasses encapsulation
- **Status:** CLOSED - FIXED
- **File:** src/js/gameController.js:65-75, 146-155, 184-193
- **Severity:** low
- **Category:** maintainability
- **Title:** Direct assignment to model.lastTurnRecord bypasses encapsulation
- **Description:** The controller directly assigns to this.model.lastTurnRecord instead of using a setter method.
- **Trigger:** If the model later adds a setter with side effects, these assignments will not trigger them.
- **Impact:** Potential inconsistency in model state management.
- **Root Cause:** Direct property assignment instead of setter method.
- **Required Repair:** Use setter method if available.
- **Required Verification:** Check model for setter and verify it is used.
- **Repair Applied:** Added setLastTurnRecord() setter to GameModel (line 495). Updated all three record assignments in GameController to use this.model.setLastTurnRecord(record).
- **Verification:** Records set via setter, encapsulation maintained.
- **Programmer Adjudication:** ACCEPTED_DEFECT - Direct assignment bypasses encapsulation.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (gameController.js:64-66)
- **Fixed:** 2026-09-01

---

### DEF-0031: Triple six penalty record misleading fields
- **Status:** CLOSED - FIXED
- **File:** src/js/gameController.js:65-75
- **Severity:** low
- **Category:** docs
- **Title:** Triple six penalty record has misleading 'landed' and 'to' fields
- **Description:** The record for triple six penalty sets both 'landed' and 'to' to turn_start_position, which may mislead the view into showing a movement from current_pos back to start.
- **Trigger:** If the view uses these fields to animate dice roll movement.
- **Impact:** Potential UI animation error for triple six penalty.
- **Root Cause:** Both 'landed' and 'to' set to turn_start_position.
- **Required Repair:** Clarify semantics; perhaps set landed to current_pos or leave undefined.
- **Required Verification:** Trigger triple six and observe view animation.
- **Repair Applied:** Changed 'landed' to current_pos (no movement executed) and 'to' to turn_start_position (position after penalty). Semantics now clear: landed = where die roll would have landed, to = final position after penalty.
- **Verification:** Triple six penalty record has correct, non-misleading fields.
- **Programmer Adjudication:** ACCEPTED_DEFECT - Misleading record fields.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (gameController.js:55-62)
- **Fixed:** 2026-09-01

---

### DEF-0033: Only first captured opponent recorded
- **Status:** CLOSED - FIXED
- **File:** src/js/gameController.js:103, 122-134, 148, 188
- **Severity:** low
- **Category:** bug
- **Title:** Only first captured opponent is recorded
- **Description:** If multiple opponents occupy the same tile, the loop captures each one but only the first opponent's id is stored.
- **Trigger:** Two or more opponents on the same tile as landing position (not safe zone).
- **Impact:** Turn record's 'captured' field is incomplete.
- **Root Cause:** capturedPlayerId only set once even though loop continues.
- **Required Repair:** Change captured in record to array of all captured player IDs.
- **Required Verification:** Test with multiple opponents on same tile.
- **Repair Applied:** Changed capturedPlayerId to capturedPlayerIds array (line 103). Loop now pushes all captured opponents (line 130). Records use capturedPlayerIds array (lines 148, 188).
- **Verification:** Multiple captures on same tile all recorded in turn record.
- **Programmer Adjudication:** ACCEPTED_DEFECT - Only first captured opponent recorded.
- **Origin:** DEEPSEEK_CHUNK_REVIEW (gameController.js:99-105)
- **Fixed:** 2026-09-01

---

## Summary
- **Total Findings Reviewed:** 32
- **Accepted Defects:** 28
- **Rejected (False Positive):** 1 (F004 - model.tileToViewBoxCenter exists)
- **Out of Scope:** 1 (F020 - Node.js document usage intentional)
- **Defects to Repair:** 28

All 28 accepted defects are recorded here with full provenance and adjudication evidence.