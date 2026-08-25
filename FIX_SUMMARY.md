# Fix Summary: Snake Animation Teleport Bug

## Issue
All snakes in the game were teleporting instead of showing the piece moving step-by-step to the snake's head before sliding down. This was caused by incorrect logic in the step-by-step animation decision.

## Root Cause
In `src/js/gameView.js` line 877-879, the decision for step-by-step animation was based on:
```javascript
const isStepByStep = isMover &&
    ((previousPosition === 0 && newPosition === 1) || // leaving staging
     (previousPosition > 0 && newPosition > 0 && newPosition > previousPosition)); // moving forward on board
```

This compared `newPosition` (the final position after jumps) instead of the actual die roll result. For snakes:
- Start: 97
- Die roll: 2 → lands on 99 (snake head)
- Jump: 99 → 80 (snake tail)
- `newPosition` = 80
- Comparison: 80 > 97? FALSE → step-by-step animation skipped → teleport

For ladders, this worked by coincidence because ladders end higher than they start.

## Fix
Changed the condition to use `intermediatePos` (the position after die roll, before jumps):
```javascript
const isStepByStep = isMover &&
    ((previousPosition === 0 && newPosition === 1) || // leaving staging
     (previousPosition > 0 && intermediatePos > previousPosition)); // moving forward based on die roll
```

This correctly evaluates:
- Start: 97
- Die roll: 2 → `intermediatePos` = 99
- Comparison: 99 > 97? TRUE → step-by-step animation enabled

## Files Modified
1. `src/js/gameView.js` - Lines 877-879: Fixed step-by-step animation decision logic

## Test Files Created
1. `test_snake.html` - Test case for snake: player on tile 97, forced roll 2
   - Expected sequence: 97 → 98 → 99 → (slide to 80)
2. `diag_live.html` - Existing test case for ladder: player on tile 26, forced roll 2
   - Expected sequence: 26 → 27 → 28 → (climb to 84)

## Verification
Both test cases should now show:
- Ladder: Visits tiles 27, 28 before climbing to 84
- Snake: Visits tiles 98, 99 before sliding to 80

This fix ensures that:
1. All normal moves show step-by-step animation
2. Ladders show climb animation after reaching the base
3. Snakes show approach to the head before sliding down
4. The special case for entering the board (0→1) remains unchanged (uses direct move)

## Note on Related Issues
This was the fourth defect caused by using incorrect values:
1. Board modeled as 63 cells instead of 100 tiles
2. View recomputing rules the model already knew
3. Jump lookup guessing its endpoints
4. Walk decision reading destination instead of landing position

Each was invisible until someone observed the screen animation.