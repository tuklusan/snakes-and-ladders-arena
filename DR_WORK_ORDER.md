# DR WORK ORDER — SANYALnet Labs

## Defect Assignment

| DR | Assigned | Brief Technical Approach |
|----|----------|--------------------------|
| **DR‑101** | **Programmer** | Implement a `sizeTokens()` method that computes token size from `boardElement.clientWidth / 10` (cell size) and `0.7 * cell` for token diameter. Invoke `sizeTokens()` after the first layout (e.g., `requestAnimationFrame` or board `onload`) and on every window‑resize event, hooked from `onStateChange()`. Ensure the rendered token width is ≥ 50 % of a grid cell width. |
| **DR‑102** | **Programmer** | Replace every occurrence of `alert`, `confirm`, or `prompt` in `src/js` with a non‑blocking on‑page message element that clears itself via `setTimeout` while the game loop continues. After the change, a grep of `src/js` for `alert` must return zero matches. |
| **DR‑102** | **Tester** | Verify DR‑102 by **source inspection**: confirm that `src/js` contains no `alert`, `confirm`, or `prompt` calls. Do **not** rely on headless screenshots, as headless Chromium auto‑dismisses modals. |
| **DR‑103** | **Programmer** | Investigate parallel loading of the 22 game assets (e.g., using `Promise.all` or dynamic `import()`). Determine whether the board can render after the core board image and essential CSS are available, aiming for a playable board by 3 s virtual time. |
| **DR‑104** | **Tester** | Produce evidence of **one continuous game session** that proceeds from start to a winner without a blocking dialog. Use a headless run with a generous virtual‑time budget, log each roll and final positions to a file, and capture periodical screenshots from the same page instance. Acceptance: a log showing a single game progressing to a declared winner. |

---

**Notes**

- DR‑101 and DR‑102 are primarily code‑change tasks for the Programmer; the Tester’s role for DR‑102 is limited to source‑code inspection.
- DR‑103 is a performance‑investigation and implementation task for the Programmer.
- DR‑104 is a testing‑only task; the Tester must generate a reproducible session log as proof.