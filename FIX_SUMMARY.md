# Fix Summary: Async Capture Bug in Snakes and Ladders Game

## Problem
The game had an async capture bug where the animation system was reading shared mutable state (like `this.lastTurnRecord`, `this.model.getLastRoll()`, etc.) after awaits. By the time the animation ran, the game could have advanced to a different turn, causing the animation to use data from the wrong turn.

Symptoms observed:
- `_animateStepByStep loop bounded!` errors with impossible values (e.g., moving 21 tiles with a single die roll)
- Same start position showing different end positions in rapid succession
- These errors occurred 4 times per game run before the fix

## Root Cause
In `onStateChange()`, the code was:
1. Reading turn-specific state (`this.model.getLastRoll()`, `this.model.getLastTurnRecord()`, etc.)
2. Performing awaits (dice animation, 500ms delay)
3. Then using that state in animation functions that could run much later

Between the initial read and the animation usage, the game could advance to a new turn, overwriting the shared state.

## Solution
Implemented snapshot pattern: Capture all turn-specific data needed for animation BEFORE any awaits, and pass this snapshot down through the animation call chain.

### Changes Made:

#### In `onStateChange()`:
- Snapshot turn-specific data before any awaits:
  ```javascript
  const lastRoll = this.model.getLastRoll();
  const lastTurnRecord = this.model.getLastTurnRecord();
  const consecutiveSixes = this.model.getConsecutiveSixes();
  const lastMover = this.model.getLastMover();
  const activePlayer = this.model.getActivePlayer();
  ```
- Created move objects for each animated token containing all needed data
- Passed snapshotted data down to animation functions

#### In `animateTokenMove()`:
- Changed signature to accept a `move` object instead of individual parameters
- Extracted data from the move object instead of reading from shared state after awaits

#### In `_animateStepByStep()`:
- Used snapshotted `lastTurnRecord` parameter instead of `this.lastTurnRecord`
- Updated sound effect logic to use snapshotted data
- Preserved all existing safety checks and logging

### Key Preservations:
- ✅ Direction guard (`jumpStart < startTile` check) 
- ✅ Loop bound (`steps++ < 12`)
- ✅ Bounded loop logging (for debugging if snapshot is incomplete)
- ✅ All existing functionality and test compatibility

## Verification
The fix was verified through:

1. **View Contract Check**: `node tools/check_view_contract.js` - PASSED
2. **Game Logic Tests**: `node testGameLogicNode.js` - 11/11 PASSED (run 3x)
3. **Loop Bounded Test**: Custom test to detect the specific error - 0 errors found (run 3x)
4. **Manual Inspection**: Confirmed all safety guards and logging remain intact

## Result
- No more `_animateStepByStep loop bounded!` errors
- Animation now consistently uses data from the correct turn
- All existing functionality preserved
- Robust against race conditions regardless of timing