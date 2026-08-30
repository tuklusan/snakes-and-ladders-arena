# Pending Actions — applicable ONLY on beta-0.0.4

These items were analyzed and deferred at beta-0.0.3 (commit 531a34c). They are
to be picked up when the codebase is bumped to **beta-0.0.4** and NOT before.
All work must be routed through the CEO Agent / full SDLC org; report-only until
then.

## 1. Snake shape — structural fidelity to the reference

Reference: `assets/reference/snake_example.jpg` (+ `snake_head_tail_reference.svg`).
At beta-0.0.3 the forked tongue was fixed (two red prongs flicking outward). The
remaining gaps between the on-board snakes and the template are structural:

- **Body curvature:** on-board snakes render as a DEAD-STRAIGHT diagonal band; the
  template body is sinuous (several undulating S-curves). Give the body real
  undulation along its `[data-jump]` path.
- **Tail:** the low-tile end is an ARROWHEAD / chevron (reads as an arrow). The
  template tail tapers to a thin whip point. Replace the chevron with a tapering
  tail; keep the forked tongue at the head.
- **Body form:** currently a hard tapered wedge (wide at head -> narrow at tip);
  template is organic with near-uniform width. Soften to an organic body.
- Preserve: head at high tile / tail at low tile orientation, red-on-white, and the
  `data-jump` attribute the animation depends on.

## 2. Ladder-climb wobble — piece drifts back to mid-ladder before settling

Root cause (analyzed at beta-0.0.3):
- In `_animateStepByStep` `hasJump` block (`src/js/gameView.js` ~1317-1385), each
  animation frame takes the real path point `getPointAtLength(t*length)` then
  DISCARDS it, rounding to the nearest boustrophedon tile and snapping `left/top`
  to that tile CENTER via `positionToken` (`src/js/gameView.js:238`) — a staircase,
  not a path glide.
- The token has `transition: left 150ms linear, top 150ms linear`
  (`src/css/styles.css:66`). Frames fire every ~16ms, so each snap restarts a 150ms
  ease and the rendered token trails ~150ms behind the target.
- Nearest-tile centers sit alternately to either side of the straight ladder line
  and the row-serpentine flips column direction each row, so snap targets are
  non-monotonic. When the RAF loop stops at t=1 and the 500ms settle pause begins
  with no further updates, the in-flight transition eases from a lagged interior
  position -> visible backtrack toward the middle of the ladder before settling.

Suggested fix (for beta-0.0.4):
- During a jump, position the token at the ACTUAL path pixel (viewBox->pixel of
  `point`) via `setTokenPositionFromPixel`, not a snapped tile center.
- Suppress the `left/top` transition for the duration of the path animation (drive
  motion purely by RAF); restore it only for discrete single-tile walking steps.
