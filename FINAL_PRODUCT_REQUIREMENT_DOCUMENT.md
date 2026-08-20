# Product Requirement Document (PRD)
## Indian-Style Snakes and Ladders (Chaturanga-based)
**Version:** 1.0  
**Date:** 2024-08-20  
**Prepared By:** SANYALnet Labs CEO & CPO  

---

## 1. Introduction

This document defines the product requirements for the Indian-Style Snakes and Ladders game, a deterministic, 4-player, turn-based board game featuring capture mechanics (Katti), snake and ladder traversals, and special rules for rolling sixes (including triple-six penalty). The game is implemented as a web-based application using HTML5, CSS3, and modern JavaScript.

## 2. User Journeys

### 2.1 Starting the Game
1. User opens the game in a web browser (desktop or mobile)
2. User sees the main game screen with the Snakes and Ladders board visible
3. Four player tokens are positioned off-board (position 0) at the side of the board
4. Player information panel shows all four players with default names (Player 1-4)
5. Active player indicator highlights Player 1's turn
6. "Roll Dice" button is enabled and ready for interaction

### 2.2 Playing a Turn
1. Active player clicks the "Roll Dice" button (or taps on touch devices)
2. Dice roll animation plays, showing tumbling dice faces
3. Dice settles on a random value between 1 and 6
4. Game processes the turn according to rules:
   - **Off-board Entry**: If player is at position 0, requires a 1 or 6 to move to tile 1
   - **Movement Calculation**: Player advances by dice roll value
   - **Exact Landing Rule**: If moving would exceed tile 100, player does not move
   - **Snake/Ladder Resolution**: If landing on snake/ladder base/top, moves accordingly
   - **Capture (Katti)**: If landing on opponent's token (not in safe zones 0,1,100), opponent returns to off-board
   - **Sixes Bonus**: Rolling a 6 awards an extra roll (same player continues)
   - **Triple-six Penalty**: Three consecutive 6s revert all movement this turn and pass turn
5. Token animates smoothly to final position with intermediate highlights for snakes/ladders
6. Appropriate sound effect plays for the event (roll, step, settle, ladder, snake, six, etc.)
7. If extra roll awarded, button text changes to "Extra Roll!" temporarily
8. If turn passes, active player indicator updates to next player
9. If win condition met (position 100), win sequence triggers

### 2.3 Winning the Game
1. When a player's tile reaches exactly 100, game detects win condition
2. Win sound effect plays
3. "Roll Dice" button disables and shows "Game Over!"
4. After 1 second, alert displays: "Player [X] wins!"
5. After 10 seconds, game automatically resets for a new game
6. All tokens return to off-board positions
7. Active player resets to Player 1
8. "Roll Dice" button re-enables with original text

### 2.4 Accessing Game Information
1. Player information panel always visible showing:
   - Each player's token indicator
   - Player name (Player 1-4)
   - Current tile position
   - Active player highlighted (bold name, yellow color)
2. Current dice roll displayed in dice container area
3. No separate menu needed for core gameplay (design choice for immediacy)

## 3. Layout Structures

### 3.1 Game Screen Composition
- **Board Area** (60-70% of screen): 
  - Displays Snakes and Ladders board image scaled to fit container
  - Maintains 1:1 aspect ratio (or matches board asset ratio)
  - Centered horizontally with auto height
  
- **Token Layer** (Overlaid on Board):
  - Four player tokens positioned absolutely over board
  - Sized at ~60% of tile dimension for clear visibility
  - Centered on tile coordinates using transform: translate(-50%, -50%)
  
- **Dice Display Area**:
  - Fixed 60x60px container positioned top-right of board (10px margin)
  - Shows static dice face corresponding to last roll
  - Empty when no valid roll
  
- **Player Information Panel**:
  - Positioned bottom-left of board (10px margin)
  - Semi-transparent dark background (rgba(0,0,0,0.5))
  - Flex layout showing each player vertically:
    * Token indicator (12x12px)
    * Player name (bold for active player)
    * Current tile position
  
- **Action Controls**:
  - "Roll Dice" button centered below board (20px margin)
  - Padding: 10px 20px, Font size: 16px
  - Disabled during asset loading and game over states
  
- **Loading Overlay** (During Initialization):
  - Full-screen semi-transparent white background (rgba(255,255,255,0.9))
  - Centered text showing loading progress
  - Hidden automatically when assets load or after 5-second timeout

### 3.2 Responsive Design Breakpoints
- **Desktop** (≥1024px):
  - Board: 65% width, centered
  - Player panels: Left and right sides (20% each)
  - Controls: Bottom center
  
- **Tablet** (768-1023px):
  - Board: Full width, top 60% height
  - Player panel: Bottom 40% width, horizontal scrolling if needed
  - Controls: Bottom center
  
- **Mobile** (<768px):
  - Board: Full width
  - Player panel: Bottom drawer or tab (collapsible)
  - Dice: Above board
  - Controls: Bottom center

### 3.3 Touch and Interaction Design
- **Minimum Touch Target**: 48x48px for all interactive elements
- **Roll Dice Button**: Large tappable area with visual feedback on press
- **Feedback Mechanisms**:
  - Visual: Button depress animation, color change
  - Audio: Click sound (system) plus game audio
- **Gesture Prevention**: Conflicting gestures (pinch-zoom) disabled during gameplay
- **Orientation**: Portrait preferred on mobile to maintain board aspect ratio
- **Keyboard Accessibility**: Space or Enter keys can trigger dice roll

### 3.4 Asset Integration Specifications
- **Board**: 
  - Primary: SVG (`Snakes_and_Ladders_-_Board_Game_Corrected.svg`)
  - Fallback: PNG (`Snakes_and_Ladders_-_Board_Game_Corrected.png`)
  - CSS: `background-size: contain; background-repeat: no-repeat; background-position: center`
  
- **Tokens**:
  - Format: PNG with transparency (RGBA)
  - Sizing: Dynamically calculated as 60% of tile size
  - Implementation: `<div>` elements with `background-image` set to token PNG
  
- **Dice**:
  - Static Face: Individual `dice_face_N.png` images
  - Animation Option: Sprite sheet (`dice_tumble_sheet.png`) with CSS `steps()` animation
  - Display: Fixed-size container with background image
  
- **Audio**:
  - Format: OGG files (provided)
  - Events Mapped: roll, step, settle, ladder, snake, six, triple_six, turn, win, gameover
  - Implementation: HTML5 `<audio>` elements with preload="auto"
  - Concurrency: Multiple Audio objects per sound for overlapping playback

## 4. Acceptance Thresholds

### 4.1 Functional Requirements
All criteria must be met for release readiness:

1. **Game Initialization** ✅
   - Sets up exactly 4 players, all starting at position 0 (off-board)
   - Active player correctly set to Player 1
   - Consecutive sixes counter initialized to 0
   
2. **Dice Rolling** ✅
   - Generates random integer uniformly distributed between 1 and 6 inclusive
   - Last roll value stored and accessible
   - Dice animation/visualization corresponds to rolled value
   
3. **Movement Logic** ✅
   - Off-board entry only possible with dice roll of 1 or 6
   - Exact landing required for tile 100 (movement void if roll would exceed 100)
   - Snake and ladder traversals follow board-defined mappings
   - Capture (Katti) activates when landing on opponent's token (positions not in {0,1,100})
   - Sixes bonus: Roll of 6 awards extra roll unless third consecutive six
   - Triple-six penalty: Three consecutive 6s revert turn movement and reset counter
   
4. **Turn Management** ✅
   - Turn advances correctly after non-six roll or after extra rolls
   - Active player indicator updates in UI
   - Consecutive sixes counter resets on turn change (except during penalty)
   
5. **Win Condition** ✅
   - Game detects when any player reaches exactly tile 100
   - Game state transitions to "game over"
   - Winner identification and display functions correctly
   
6. **Audio Feedback** ✅
   - Distinct sound effect for each game event:
     * roll: Dice roll start
     * step: Token movement step
     * settle: Token final position
     * ladder: Ladder climb
     * snake: Snake descent
     * six: Six rolled
     * triple_six: Triple six penalty
     * turn: Turn change
     * win: Player wins
     * gameover: Game ends
   - Audio plays with appropriate timing relative to events
   - Volume levels balanced for clear audibility
   
7. **UI Responsiveness** ✅
   - Game playable on desktop browsers (Chrome, Firefox, Safari, Edge)
   - Game playable on mobile browsers (iOS Safari, Android Chrome)
   - Touch controls functional and appropriately sized
   - Layout adapts to screen size without breaking
   - Asset loading shows progress and handles failures gracefully

### 4.2 Non-Functional Requirements

1. **Performance** ✅
   - Initial load time < 3 seconds on typical broadband connection
   - Maintains 60 FPS during all animations on mid-range 2020+ devices
   - Asset optimization: All provided assets already web-optimized
   
2. **Compatibility** ✅
   - Supports latest versions of:
     * Chrome (desktop and mobile)
     * Firefox (desktop and mobile)
     * Safari (desktop and iOS)
     * Edge (desktop and mobile)
   - Graceful degradation:
     * SVG fallback to PNG
     * CSS animations fallback to JS if needed
   
3. **Accessibility** ✅
   - Sufficient color contrast (WCAG 2.1 AA)
   - Keyboard navigability (Space/Enter to roll dice)
   - Screen reader friendly structure (semantic HTML, ARIA labels where beneficial)
   - Touch targets meet minimum 48x48px requirement
   
4. **Code Quality** ✅
   - Source code well-structured and commented
   - Follows approved MVC architectural blueprint
   - Clear separation of concerns between model, view, controller
   - Consistent naming conventions
   - No console errors in production build
   
5. **Asset Usage** ✅
   - All provided assets (images, audio) utilized in the game
   - CREDITS.md accessible (referenced in assets/audio/ directory)
   - No unused or placeholder assets

### 4.3 Testing Verification

1. **Unit Test Coverage** ✅
   - Core game logic covered by `testGameLogic.js` (11 test cases)
   - Tests validate:
     * Dice roll distribution
     * Movement rules (off-board, exact landing)
     * Snake and ladder transitions
     * Capture mechanics
     * Sixes bonus and triple-six penalty
     * Win condition detection
     * Turn progression
   
2. **Manual Test Validation** ✅
   - All user journeys verified through manual playtesting
   - Edge cases tested:
     * Multiple consecutive sixes
     * Captures on snakes/ladders
     * Winning via snake/ladder to 100
     * Off-board entry requirements
   - Cross-browser/device testing performed

## 5. Out of Scope

The following features are explicitly excluded from MVP release:

1. **Online Multiplayer**: Networked play not required; hot-seat sufficient
2. **AI Opponents**: Human-only interaction preserves social dynamics
3. **Persistent Profiles**: No account system; player names entered per session
4. **In-Game Purchases**: Complete experience unlocked at start
5. **Advanced Analytics**: Basic telemetry only for crash reports and completion rates
6. **Game Saving/Loading**: Session-only state; no persistence between sessions
7. **Custom Rulesets**: Fixed to Indian Snakes and Ladders variant as specified
8. **Alternative Boards/Tokens**: Uses provided assets exclusively
9. **Tutorial Mode**: While beneficial, not required for core gameplay understanding
10. **Audio Controls**: Volume/mute controls nice-to-have but not essential

## 6. Success Metrics

Post-launch evaluation criteria:

1. **Completion Rate**: >60% of started games reach natural conclusion
2. **Session Length**: Average 15-30 minutes per game session
3. **Replay Rate**: >40% of players start another game within 5 minutes
4. **Rule Mastery**: >80% correct application of special rules observed in testing
5. **Satisfaction**: >4.0/5 average rating in post-game surveys
6. **Performance**: 95% of sessions maintain >50 FPS on target devices
7. **Accessibility**: Passes automated WCAG 2.1 AA screening

---

## Approval

This PRD consolidates requirements from:
- CEO Phase 1 Report: Technical specifications and architectural foundation
- CPO Phase 1 Report: User experience and product-focused refinements  
- CTO Phase 2 Report: Technical architecture and implementation guidelines
- Implementation Summary: Verification of completed modules

**Ready for Development Sign-off: ✅**

---
*Document Version: 1.0 | Last Updated: 2024-08-20*