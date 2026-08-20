# DEFECT REGISTER — Client Acceptance Round

Source: client live browser session at http://10.0.0.161:8000, plus AI-overseer
visual analysis of a six-frame session filmstrip.
Raised to: CEO, for allocation via CTO to Programmer and Tester.

## Evidence available to the company
- shots/filmstrip.png       six-frame contact sheet across one session
- shots/film/f01..f06.png   individual frames, virtual clock 3s to 30s

## DR-101  Player tokens are far too small
SEVERITY: HIGH   STATUS: OPEN

Observed in every frame of the filmstrip and confirmed by the client:
"the pieces start off very small, waiting at the bottom, but even after
entering the board they are still tiny."

Root cause: tokens are created with hardcoded 20px width and height in
gameView.js around line 105. The only resize logic lives inside
updateTokenPositions(), which is invoked ONLY from onReset(). During normal
play it never executes, so tokens remain 20px permanently.

Required: a sizeTokens() method using boardElement.clientWidth divided by 10
for the cell size and roughly 0.7 of that for the token; invoked after first
layout (requestAnimationFrame or board image onload so clientWidth is not
zero), from onStateChange(), and on window resize.

Acceptance: a token's rendered width must be at least 50 percent of one grid
cell width.

## DR-102  Blocking modal dialogs stop the autonomous arena
SEVERITY: HIGH   STATUS: OPEN

Client screenshot shows the game frozen behind a browser modal reading
"Triple Six! Penalty: Turn reverted and turn passed to next player." with an
OK button. The arena is specified to run autonomously with no human input.
The alert function suspends the JavaScript event loop until dismissed.

A search for the alert function in src/js currently returns 8 occurrences.

Required: zero uses of alert, confirm or prompt anywhere in src/js. Replace
with a non-blocking on-page message element that clears itself via setTimeout
while the game loop keeps running.

Acceptance: searching src/js for the alert function must return zero matches.

NOTE FOR TESTER: headless Chromium auto-dismisses modals, so this defect is
INVISIBLE to every headless screenshot test. It must be verified by source
inspection, not by screenshot.

## DR-103  Slow asset loading
SEVERITY: LOW   STATUS: OPEN

Filmstrip frame f01 at 3s virtual time still displays
"Loading game assets... 12/22". The board is not interactive until roughly 7s.

Required: investigate whether the 22 assets can be loaded in parallel, or
whether the board can render before all audio is fetched.

Acceptance: playable board visible by 3s virtual time.

## DR-104  Session continuity unverified
SEVERITY: MEDIUM   STATUS: OPEN

The overseer filmstrip uses one page load per frame, so it samples six
independent games rather than one continuous session. Nobody has yet observed
a single uninterrupted game running through to a win.

Required: TESTER to produce evidence of ONE continuous session in which a
player reaches tile 100 and the win is announced without a blocking dialog.
Suggested approach: a headless run with a long virtual-time budget that logs
each roll and the final positions to a file, plus periodic screenshots taken
from the same page instance.

Acceptance: a log showing a single game progressing to a declared winner.

## Already verified FIXED by the overseer — do not regress
- Tokens now render INSIDE the grid on all rows, using
  GRID_TOP + ((9 - row) * cell) + (cell / 2).
- Board div aspect matches the 4953x6605 portrait PNG (paddingBottom 133.35%).
- Token transition slowed to 1.0s; class transition 1.5s.
- Debug styling removed: lightblue background, green border, red 2px frame.
- Token colour order correct, Player 1 red leftmost.
- Rule engine passes 11 of 11 in testGameLogicNode.js.
