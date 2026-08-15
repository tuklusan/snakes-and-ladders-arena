# Architectural Blueprinting & Tech Stack Validation Report - Phase 2
**Project:** Indian-Style Snakes and Ladders (Chaturanga-based)
**Date:** 2024-08-15
**Prepared By:** Chief Technology Officer (CTO), SANYALnet Labs

---

## 1. Executive Summary

This report outlines the findings of the Architectural Blueprinting & Tech Stack Validation phase (Phase 2) of the SDLC for the Indian-Style Snakes and Ladders game project. Based on the Phase 1 reports from CEO and CPO, technical specifications, and asset evaluation, this document defines the technology stack, establishes system design patterns, specifies data flow and API boundaries, and provides formal architectural sign-off for downstream implementation.

The project requires implementation of a deterministic, 4-player, turn-based board game with capture mechanics (Katti), snake and ladder traversals, and special rules for rolling sixes. The implementation will be a web-based application leveraging HTML5, CSS3, and modern JavaScript.

## 2. Technology Stack Review

### 2.1 Current State Assessment
- No existing source code or dependency files found in repository (confirmed via audit)
- No package.json, build configurations, or lock files present
- Project consists solely of documentation and assets
- Clean slate for technology selection

### 2.2 Evaluation Criteria
1. **Long-term Stability**: Technologies with established track records and minimal breaking changes
2. **Security**: Minimal attack surface, no known vulnerabilities in dependencies
3. **Performance**: Ability to maintain 60 FPS during animations on target devices
4. **Compatibility**: Support for latest versions of Chrome, Firefox, Safari, and Edge (desktop and mobile)
5. **Development Velocity**: Maturity of ecosystem, availability of debugging tools
6. **Asset Utilization**: Effective use of provided high-resolution PNG/SVG assets
7. **Maintainability**: Clear separation of concerns, testability

### 2.3 Technology Options Considered

| Option | Description | Pros | Cons | Verdict |
|--------|-------------|------|------|---------|
| **Vanilla HTML5/CSS/JS** | Native web technologies without frameworks | Zero dependencies, maximum control, best performance, ultimate stability | More boilerplate code, manual DOM/CSS animation handling | **SELECTED** |
| **HTML5 Canvas + JS** | Canvas for rendering, JS for logic | Excellent rendering performance, pixel-level control | Complex layout/UI implementation, harder responsive design | Considered but not selected |
| **2D Game Engine (Phaser/PixiJS)** | Specialized game development framework | Built-in game loop, sprite handling, physics, audio | Additional dependency, learning curve, potential overkill | Rejected |
| **React/Vue/Angular** | Component-based UI frameworks | Rich ecosystem, state management, developer tooling | Heavier weight, potential over-engineering, build complexity | Rejected |
| **TypeScript** | Typed superset of JavaScript | Improved developer experience, better tooling, refactoring safety | Build step required, learning curve | Considered but not selected for v1 |

### 2.4 Selected Technology Stack
**Core Technologies:**
- **HTML5**: Semantic markup for structure and accessibility
- **CSS3**: Flexbox/Grid for responsive layout, animations/transitions for UI feedback
- **JavaScript (ES2020+)**: Modern language features (modules, arrow functions, destructuring, async/await)
- **Web APIs**: DOM API, Canvas API (optional for dice animation), Web Audio API (or HTML5 Audio), requestAnimationFrame

**Rationale:**
1. **Zero Dependencies**: Eliminates supply chain risks and version conflicts for long-term stability
2. **Performance**: Native browser APIs provide optimal performance for this 2D turn-based game
3. **Compatibility**: Standards-based approach ensures broad browser support
4. **Simplicity**: Reduced complexity facilitates maintenance and security auditing
5. **Asset Alignment**: Direct manipulation of SVG/PNG assets aligns with provided resources
6. **Future-Proof**: Web standards evolve slowly and backwards compatibility is strong

**Optional Lightweight Helpers (if needed during implementation):**
- Animation: CSS transitions/animations or native `requestAnimationFrame` loop
- Audio: HTML5 `<audio>` element (no dependency required)
- Utility functions: Custom helpers as needed (kept minimal and auditable)

## 3. System Architecture Design

### 3.1 Architectural Pattern: Model-View-Controller (MVC)
The game implements a variant of MVC tailored for real-time interactive applications:

```
+------------------+     +------------------+     +------------------+
|   Game Model     |<---->|  Game Controller |<---->|     Game View    |
| (Data & State)   |     | (Logic & Rules)  |     | (Render & UI)    |
+------------------+     +------------------+     +------------------+
        ^                         ^                         ^
        |                         |                         |
        |                         |                         v
        |                   +------------------+     +------------------+
        |                   |  Asset Manager   |     | Input Handler    |
        |                   | (Images/Audio)   |     | (Touch/Click)    |
        |                   +------------------+     +------------------+
        |                         |                         |
        |                         v                         v
        |                   +------------------+     +------------------+
        |                   |  Audio Manager   |     |   Utility Funcs  |
        |                   | (Sound Effects)  |     | (Math, Helpers)  |
        |                   +------------------+     +------------------+
        +-------------------------------------------+
                        |
                        v
                +------------------+
                |  Event System    |
                | (Custom Events)  |
                +------------------+
```

### 3.2 Component Responsibilities

#### 3.2.1 Game Model (Data Layer)
- **State Management**: Player positions, active player, consecutive sixes counter, game status
- **Data Integrity**: Validates state transitions, enforces game rules invariants
- **Interface**: Getters/setters for state access, emits events on state changes
- **Persistence**: Optional localStorage for game state (future enhancement)

#### 3.2.2 Game Controller (Business Logic)
- **Rule Engine**: Implements all game rules from GAME-RULES.md and INDIAN-SNAKES-AND-LADDERS-GAME.md
- **Turn Processing**: Dice roll handling, movement calculation, snake/ladder resolution, capture (Katti)
- **State Transitions**: Updates Game Model based on game logic
- **Event Coordination**: Listens to View input, directs Model updates, notifies View of changes

#### 3.2.3 Game View (Presentation Layer)
- **Rendering**: Board, tokens, dice, player info panels, controls
- **User Interface**: Roll button, turn indicators, win celebrations
- **Responsive Design**: Adapts layout for desktop/tablet/mobile breakpoints
- **Animation Coordinates**: Token movement, dice roll animations, visual feedback
- **Input Capture**: Delegates user interactions to Input Handler

#### 3.2.4 Asset Manager
- **Resource Loading**: Preloads images (board, tokens, dice faces/tumble sheets)
- **Audio Management**: Loads and caches OGG sound effects
- **Lifecycle**: Handles asset loading errors, provides ready-state notifications
- **Scaling**: Converts logical board coordinates (mm from SVG) to device pixels

#### 3.2.5 Input Handler
- **Event Normalization**: Unified interface for touch, mouse, keyboard events
- **Gesture Prevention**: Prevents conflicting gestures (e.g., pinch-zoom during gameplay)
- **Accessibility**: Supports keyboard controls (Space/Enter to roll dice)
- **Delegation**: Routes validated input to Game Controller

#### 3.2.6 Audio Manager
- **Sound Mapping**: Associates game events with appropriate audio files
- **Concurrency**: Manages overlapping sounds (e.g., multiple steps)
- **Volume Control**: Global volume, mute/unmute functionality
- **API**: Uses HTML5 Audio API for broad compatibility

#### 3.2.7 Utility Functions
- **Mathematics**: Dice probability, coordinate transformations, collision detection
- **Helpers**: Array/object manipulation, DOM helpers, event delegation
- **Constants**: Game configuration (tile size, animation durations, etc.)

### 3.3 Data Flow Diagram (Text Representation)

```
[User Interaction] 
        ↓
[Input Handler] → [Game Controller] 
        ↓                           ↑
[Asset Manager]                   [Game Model]
        ↓                           ↑
[Audio Manager] ← [Game View] ←─── [Event System]
        ↑                           ↓
[Rendering & Animation] ← [Game View]
        ↓
[User Sees/Hears Game State Update]
```

**Detailed Turn Flow:**
1. User clicks "Roll Dice" button
2. Input Handler captures click event, validates, emits `ROLL_REQUESTED` event
3. Game Controller listens for `ROLL_REQUESTED`, generates random dice roll (1-6)
4. Game Controller updates Model: increments consecutive_sixes, checks for triple-six penalty
5. If not triple-six: Game Controller calculates movement:
   - Applies off-board entry rules (requires 1 or 6)
   - Checks exact landing rule (no overshoot 100)
   - Resolves snakes/ladders via lookup tables
   - Checks for capture (Katti) on non-safe zones
6. Game Controller updates Model with new player position
7. Game Controller checks win condition (position == 100)
8. Game Controller determines next state:
   - If triple-six: Revert movement, advance turn
   - If roll == 6 and not triple-six: Award extra roll (same player continues)
   - Else: Advance turn to next player
9. Game Controller emits `STATE_CHANGED` event with updated model
10. Game View listens for `STATE_CHANGED`:
    - Renders updated board with token positions
    - Shows dice result (static face or animation)
    - Plays appropriate audio via Audio Manager (roll, step, settle, ladder, snake, six, triple_six, turn, win, gameover)
    - Updates player info panel (turn indicator, positions)
    - Shows win celebration if game_over
11. Animation completes, system ready for next user interaction

### 3.4 API Boundaries and Module Interfaces

#### 3.4.1 Inter-Module Communication
- **Custom Events**: Loose coupling via DOM events on a central event hub (or window)
  - Event types: `ROLL_REQUESTED`, `DICE_ROLLED`, `TURN_PROCESSED`, `STATE_CHANGED`, `GAME_WON`, `TRIPLE_SIX_PENALTY`
  - Payload: Minimal data needed (e.g., `{dieRoll: 3}`, `{playerId: 2, position: 45}`)
- **Direct Method Calls**: Tight coupling where appropriate for performance-critical paths
  - Example: View → AssetManager.getTokenImage(playerId)
  - Example: Controller → Model.getActivePlayer()

#### 3.4.2 Public Interfaces Per Module

**GameModel:**
```javascript
interface GameModel {
  getState(): Readonly<GameState>;
  getPlayerPosition(playerId: number): number;
  getActivePlayer(): number;
  getConsecutiveSixes(): number;
  isGameOver(): boolean;
  getWinner(): number | null;
  resetGame(): void;
  // Setters typically private to Controller
}
```

**GameController:**
```javascript
interface GameController {
  init(model: GameModel, view: GameView): void;
  rollDice(): void; // Called by View on user input
  // Other methods typically private
}
```

**GameView:**
```javascript
interface GameView {
  init(model: GameModel, controller: GameController): void;
  render(): void; // Called on state change
  showDiceRoll(face: number): void;
  playSound(event: GameEvent): void;
  animateTokenMove(playerId: number, from: number, to: number): Promise<void>;
  // UI update methods
}
```

**AssetManager:**
```javascript
interface AssetManager {
  loadAssets(): Promise<void>;
  getImage(src: string): HTMLImageElement;
  getAudio(src: string): HTMLAudioElement;
  isReady(): boolean;
}
```

**AudioManager:**
```javascript
interface AudioManager {
  preloadSounds(soundMap: Record<string, string>): Promise<void>;
  play(event: GameEvent, options?: {volume?: number, loop?: boolean}): void;
  stop(event: GameEvent): void;
  setVolume(volume: number): void;
  mute(): void;
  unmute(): void;
}
```

## 4. Asset Integration Plan

### 4.1 Board Integration
- **Primary Display**: SVG preferred for scalability; PNG fallback for older browsers
- **Coordinate System**: Use SVG's logical coordinates (mm) as internal units
  - Tile center points calculated from SVG viewBox (0,0,210,297)
  - Conversion: logical_mm → CSS_pixels via devicePixelRatio and CSS scaling
- **Scaling Strategy**:
  - Container element with `width: 100%; max-width: 800px;` (example)
  - `height: auto;` to maintain aspect ratio
  - Board image: `width: 100%; height: auto; display: block;`
- **Token Positioning**: Absolutely positioned `<div>` or `<svg>` elements overlaid on board
  - `top` and `left` calculated from tile coordinates
  - CSS `transform: translate(-50%, -50%);` for center alignment

### 4.2 Token Assets
- **Format**: PNG with transparency (RGBA)
- **Sizing**: Scale to ~60-80% of tile width/height for clear visibility
- **Implementation**: 
  - Individual token PNGs or sprite sheet with CSS background-position
  - Each token: `<img src="token_X.png" class="game-token">` or `<div class="token token-X"></div>`
- **Z-index**: Ensure tokens render above board but below UI elements

### 4.3 Dice Assets
- **Static Result**: Use `dice_face_N.png` images
- **Animation Option 1**: Sprite sheet (`dice_tumble_sheet.png`) with CSS steps() animation
- **Animation Option 2**: Sequence of individual frames via requestAnimationFrame loop
- **Display Area**: Fixed-size container beside/above board (e.g., 100x100px)
- **Implementation**:
  ```css
  .dice-container {
    width: 100px;
    height: 100px;
    background-image: url('dice_tumble_sheet.png');
    background-size: 1200px 100px; /* 12 frames */
  }
  .dice-rolling {
    animation: tumble 0.5s steps(12) infinite;
  }
  @keyframes tumble {
    from { background-position: 0 0; }
    to { background-position: -1200px 0; }
  }
  ```

### 4.4 Audio Integration
- **Format**: OGG files (provided) with MP3 fallback for maximum browser coverage
- **Preloading**: Load all sound effects during initialization
- **Playback**: HTML5 Audio API with multiple Audio objects per sound for concurrency
- **Volume Control**: Global volume control with persistent preference (localStorage)
- **Events Mapped**:
  - `roll`: dice roll start
  - `step`: token movement step
  - `settle`: token final position after move
  - `ladder`: ladder climb
  - `snake`: snake descent
  - `six`: six rolled
  - `triple_six`: triple six penalty
  - `turn`: turn change
  - `win`: player wins
  - `gameover`: game ends

### 4.5 Responsive Design Breakpoints
Based on CPO recommendations and asset dimensions:

| Breakpoint | Width | Layout Strategy |
|------------|-------|-----------------|
| **Desktop** | ≥1024px | Board centered (60-70%), player panels on sides (20-25% each), controls bottom/top |
| **Tablet** | 768-1023px | Board top 60%, player panel bottom 40% (horizontal scrolling if needed) |
| **Mobile** | <768px | Board full width, player controls as bottom drawer or tab, dice above board |

**Touch Targets**: Minimum 48x48px for all interactive elements (dice roll button, etc.)

## 5. Security and Stability Considerations

### 5.1 Dependency Security
- **Zero Third-Party Dependencies**: Eliminates supply chain attack vectors
- **Browser APIs Only**: Reduces risk to well-audited, standardized interfaces
- **No Build Process**: Avoids vulnerabilities in build tools (Webpack, Babel, etc.)
- **Content Security Policy (CSP)**: Recommended implementation:
  ```
  default-src 'self';
  img-src 'self' data:;
  media-src 'self';
  style-src 'self' 'unsafe-inline'; /* for dynamic styles, can be avoided */
  script-src 'self';
  ```

### 5.2 Data Security and Privacy
- **No Persistent Storage by Default**: Game state ephemeral (session-only)
- **Optional localStorage**: If implemented, only stores non-PII game state
- **No External Calls**: All assets served from same origin
- **Input Sanitization**: Player name input sanitized to prevent XSS

### 5.3 Stability Measures
- **Standards Compliance**: Uses only stable, widely-supported web features
- **Graceful Degradation**: 
  - SVG fallback to PNG
  - CSS animations fallback to JS animation
  - Audio API fallback to simpler playback if needed
- **Error Handling**: 
  - Asset loading failures show user-friendly messages
  - Invalid state transitions logged and prevented
  - Animation frame rates capped to prevent excessive CPU usage
- **Performance Budgets**:
  - Target: <3s initial load on 3G connection
  - Target: 60 FPS during animations
  - Asset optimization: All provided assets already web-optimized

### 5.4 Maintainability Practices
- **Modular Architecture**: Clear separation of concerns enables independent updates
- **ES Modules**: Native JS modules for code organization (no bundler needed for v1)
- **Naming Conventions**: Consistent, descriptive identifiers
- **Documentation**: JSDoc comments for all public interfaces
- **Testing Readiness**: Design facilitates unit testing of Model and Controller logic

## 6. Implementation Roadmap Recommendations

### 6.1 Phased Development Approach
1. **Milestone 1**: Core Engine
   - Game Model with state management
   - Game Controller with rule implementation
   - Basic View rendering (static board and tokens)
   - Manual dice input (for testing)
   
2. **Milestone 2**: Interaction and Feedback
   - Input handling (click/touch)
   - Dice rolling visualization
   - Basic audio feedback
   - Turn management
   
3. **Milestone 3**: Polish and UX
   - Token movement animation
   - Win/lose celebrations
   - Responsive layout
   - Accessibility features
   
4. **Milestone 4**: Optional Enhancements
   - Game state persistence
   - Sound effects toggles
   - Rule help/tooltips
   - Animation speed controls

### 6.2 Snake/Ladder Position Definition
As identified in asset exploration, explicit snake/ladder mapping is required. Recommendation:
1. **Extract from Board Image**: Analyze illustrated paths to create coordinate mapping
2. **Standard Variant Fallback**: Use commonly accepted Indian Snakes and Ladders configuration if extraction proves ambiguous
3. **Implementation**: Lookup tables in Game Controller:
   ```javascript
   const Ladders = new Map([
     [2, 38], [7, 14], [8, 31], [15, 26], [21, 42],
     [28, 84], [36, 44], [51, 67], [71, 91], [78, 98],
     [87, 94] // Example - actual positions to be defined
   ]);
   
   const Snakes = new Map([
     [16, 6], [46, 25], [49, 11], [62, 19], [64, 60],
     [74, 53], [89, 68], [92, 51], [95, 75], [99, 80]
     // Example - actual positions to be defined
   ]);
   ```

## 7. Formal Architectural Sign-off

As Chief Technology Officer of SANYALnet Labs, having completed the Architectural Blueprinting & Tech Stack Validation phase (Phase 2) of the SDLC, I hereby:

### 7.1 Technology Stack Approval
✅ **APPROVE** the use of HTML5, CSS3, and modern JavaScript (ES2020+) as the core technology stack for the Indian-Style Snakes and Ladders game implementation.

### 7.2 Architecture Approval
✅ **APPROVE** the Model-View-Controller (MVC) architectural pattern with defined module boundaries and data flow as specified in Sections 3.1-3.4.

### 7.3 Asset Integration Approval
✅ **APPROVE** the asset integration plan for board, tokens, dice, and audio resources as detailed in Section 4.

### 7.4 Security and Stability Approval
✅ **APPROVE** the security considerations and stability measures outlined in Section 5 as sufficient for a production-ready web application.

### 7.5 Readiness for Implementation
✅ **SIGN OFF** that the architectural blueprint is complete, validated, and ready to authorize downstream implementation by the Programmer role in Phase 3 of the SDLC.

**Conditions for Implementation:**
1. Implementation MUST adhere strictly to this architectural blueprint
2. Any deviations from the approved architecture MUST undergo secondary architectural review
3. All security and stability considerations MUST be implemented as specified
4. The Programmer SHALL maintain clean version-control practices and ensure successful compilation/build
5. The Reviewer SHALL perform deep static analysis to verify adherence to this blueprint
6. The Tester SHALL validate that the implemented system matches the specified data flow and API boundaries

**Signed:**

_________________________
Chief Technology Officer (CTO)
SANYALnet Labs
Date: 2024-08-15

---
**End of CTO Phase 2 Report**