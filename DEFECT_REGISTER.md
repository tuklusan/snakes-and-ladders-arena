# DEFECT REGISTER — Round 2
Source: AI-overseer continuous-session visual analysis (shots/live1_strip.png,
shots/long1_strip.png, shots/late.png) captured from ONE persistent browser on
Xvfb, plus quantitative pixel analysis.

## CLOSED — verified by the overseer, do not regress
- DR-101 token size: FIXED. Tokens are now clearly visible and correctly scaled.
- DR-102 blocking modals: FIXED. The LIVE src/js/gameView.js contains zero
  alert/confirm/prompt. (The earlier count of 8 was the overseer's measurement
  error: it counted gameView.js.backup, .backup2, .backup3, .backup4.)
- Auto-restart exists: gameView.js handles game-over and calls
  controller.resetGame() after a delay.
- Katti capture verified working in a live session: Player 4 landed on tile 84
  and sent Player 1 from 84 back to 0.
- Rule engine: 11/11 in testGameLogicNode.js.

## DR-105  CLOSED-INVALID - superseded by DR-108
The letterboxing diagnosis was withdrawn, and the follow-up animation diagnosis
was also wrong. Static placement is self-consistent; the real fault is DR-108.
Do not spend any further effort on tileToPosition arithmetic.

## DR-106  Stale backup files pollute the source tree   SEVERITY: LOW   STATUS: OPEN
src/js/ contains gameView.js.backup, .backup2, .backup3, .backup4. These caused
a false defect report (see DR-102 note above) because a grep for alert( matched
them. Delete them; git history is the backup.
ACCEPTANCE: ls src/js/*.backup* returns nothing.

## DR-107  Prove the infinite self-running loop   SEVERITY: HIGH   STATUS: OPEN
Nobody has yet observed a single game run through to a win AND automatically
start a fresh game. The client requires an arena that runs forever unattended.
REQUIRED: TESTER produces evidence of at least TWO consecutive completed games
in ONE browser session, with no human input, showing: a player reaching tile
100, a win announced without any blocking dialog, and the board resetting to a
new game.
MEASURED CONSTRAINT: under headless chromium with --virtual-time-budget the
game does NOT advance - tokens stay in staging at every budget from 15s to
160s. Headless virtual time therefore CANNOT prove DR-107. Use a real
persistent browser on Xvfb :99 (see ~/session_capture.sh).

ACCEPTANCE: a log file capturing at least two "game over / winner" events from
a single continuous run, plus screenshots from the same page instance before
and after a reset.

## DR-108  THE BOARD ARTWORK IS NOT THE GAME   SEVERITY: CRITICAL   STATUS: OPEN
*** ROUND 3 DECIDED THIS (OPTION A, see DR_WORK_ORDER_3.md) BUT NEVER BUILT IT.
*** gameView.js still uses backgroundImage at line 392 and paddingBottom
*** 133.35% at line 90. No grid-generation code exists. BUILD IT IN ROUND 4,
*** TOGETHER WITH DR-110 — they are one piece of work.

This supersedes DR-105 entirely. DR-105 is CLOSED-INVALID: the coordinate maths
was never the problem, which is why four rounds of patching it failed.

MEASURED, from two independent sources that agree:

1. Raster measurement of assets/images/board/..._Corrected.png (4953x6605):
       h-lines(10): 260 1022 1694 2366 3112 3870 4582 5234 5842 6453
       v-lines(8):   98  710 1332 2044 2726 3478 4170 4876
   That is 7 COLUMNS x 9 ROWS. Cell size ~683 x ~688 px, i.e. SQUARE.

2. The SVG source, which is authoritative. viewBox "0 0 210 297", board rect
   x=4.5062 y=25.983 w=204.067 h=262.005.
       As 10x10 the cells would be 20.4 x 26.2  -> NOT square.
       As  7x9  the cells are     29.2 x 29.1  -> SQUARE. Confirms 7x9.
   The SVG contains ZERO numeric text elements: the board has no tile numbers.

THEREFORE the printed board has 63 cells. The rules engine in src/js/gameModel.js
is a standard 100-tile game (Ladders 2->38 ... 87->94, Snakes 16->6 ... 99->80,
comment: "Using a common Indian Snakes and Ladders configuration as placeholder").

No formula can map 100 tiles onto 63 printed cells. Tokens will always land
between or across printed cells. Everything the client reported follows from
this single fact.

A SECOND, INDEPENDENT MISMATCH: even with perfect placement, the snakes and
ladders DRAWN on the board are decorative and do not correspond to the model's
jump table. A player who hits the ladder at 2->38 would climb where no ladder is
drawn, and would slide down snakes that are not there.

ALSO NOTE: the grid insets previously given in this register (GL 0.30, GR 99.68,
GT 3.33, GB 98.65) are WRONG - they were the outer edge of the image, not the
grid. The true board rect is left 2.14%, right 99.32%, top 8.75%, bottom 96.97%.
The top was out by 5.4%, more than half a cell. Discard the old numbers.

REQUIRED RESOLUTION - CTO decides between these two, and says which and why:
  OPTION A (preferred): STOP USING A PICTURE FOR THE GRID. Render the 10x10
    grid, the tile numbers, and the snakes and ladders in the DOM or on a
    canvas, generated FROM the model's own Ladders and Snakes maps. The board
    then cannot disagree with the rules, now or after any future rule change.
    Keep a decorative background if you like, but the grid must be generated.
  OPTION B: replace the asset with a genuine numbered 10x10 board AND rewrite
    gameModel's Ladders/Snakes maps to match exactly what that image draws.
    If you choose B you must prove every one of the 21 jumps matches the art.

ACCEPTANCE:
  - A test that asserts the rendered grid has exactly 100 addressable cells.
  - For all 100 tiles, the token centre lands within 25% of a cell of that
    tile's centre, measured against the RENDERED grid.
  - For each of the 21 entries in Ladders/Snakes, the drawn connector starts at
    the head tile and ends at the tail tile.
  - Tile numbers are visible and follow boustrophedon order, 1 bottom-left.

## DR-109  THE ARENA FREEZES   SEVERITY: CRITICAL   STATUS: FIX COMMITTED (d83f046), under re-verification

Continuous capture on Xvfb :98, 18 frames at 6s (shots/ovs1/). Frames 8 to 18
are BYTE-IDENTICAL (md5 1bb7376faab3ee0a40bafa8015c16826, 11 frames, 66+
seconds of no change whatsoever).

State at freeze: Player 1 tile 38, Player 2 tile 25, Player 3 tile 4, Player 4
tile 0. Player 4's name is highlighted, so it is Player 4's turn. Player 4 is
still off-board at tile 0. The dice shows 6. Nothing moves again, ever.

This defeats the client's core requirement of an arena that runs forever with no
human input. Prime suspect: the turn loop stops scheduling the next roll in some
state reachable from an off-board player, possibly the entry rule or the
consecutive-sixes path. Find the state machine dead end.

ACCEPTANCE: DR-107's two-consecutive-completed-games evidence, which cannot pass
while this defect exists.

## DR-110  THE APP MUST FIT IN 600 PX OF HEIGHT   SEVERITY: HIGH   STATUS: OPEN

CLIENT REQUIREMENT, verbatim intent: the board is too long for the screen.
Everything must be scaled down so the whole app fits a viewport whose maximum
height is 600 px. Roughly half of current size.

Current state: the board is forced to portrait 3:4 by
    gameView.js line 90:  this.boardElement.style.paddingBottom = '133.35%'
so at 760 px wide it is 1013 px tall, and the app needs ~1300 px of height. That
is why it does not fit.

THIS IS THE SAME WORK AS DR-108 — DO THEM TOGETHER, ONCE.
DR-108 replaces the 7x9 picture with a GENERATED 10x10 grid. A real 10x10 grid
is SQUARE (1:1), not 3:4, so it is inherently far shorter. Generating the board
is what makes it fit. Do not fix the height on the old picture and then rebuild
the board — that is the same layout work done twice.

TARGET LAYOUT
  - The whole app must fit within 600 px total height, with NO vertical page
    scrolling, at a viewport of 1280x600.
  - Budget: board ~480-500 px square, player panel and dice ~100-120 px.
  - The board is SQUARE. 10 columns x 10 rows of equal square cells.
  - Everything scales from the board size, not from hard-coded pixels:
    token diameter ~ cell*0.7, tile-number font ~ cell*0.22, dice ~ cell*1.2.
    Derive them from the measured cell size at layout time, as sizeTokens()
    already does for tokens.
  - It must still look correct at 1280x800 and 1280x1000 — fit means "fits
    within", not "assumes exactly 600".

ACCEPTANCE, measured not asserted:
  1. At viewport 1280x600, document.documentElement.scrollHeight <= 600.
     No vertical scrollbar.
  2. The board element is square within 2 percent.
  3. The rendered grid exposes exactly 100 addressable cells (DR-108).
  4. All four tokens are visible and at least 20 px across.
  5. Tile numbers are legible: font-size >= 9 px.
  6. The same page still fits, without overlap, at 1280x800.

The overseer's harness diag_sweep.html already measures grid geometry from the
DOM. Extend it rather than writing a new one.
