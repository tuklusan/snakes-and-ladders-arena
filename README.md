# 🐍🪜 SANYALnet Labs – Indian Snakes & Ladders Arena

[![CI](https://github.com/tuklusan/snakes-and-ladders-arena/actions/workflows/ci.yml/badge.svg)](https://github.com/tuklusan/snakes-and-ladders-arena/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-SANYALnet%20Non--Commercial-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/tuklusan/snakes-and-ladders-arena?sort=semver)](https://github.com/tuklusan/snakes-and-ladders-arena/releases/latest)

> **A fully-automated, browser-based, 4-player Indian Snakes & Ladders arena**  
> Procedural boards · SVG snakes & ladders · real-time animation · zero-click auto-play

### ▶️ Play it now
**[▶️ Play in your browser (GitHub Pages)](https://tuklusan.github.io/snakes-and-ladders-arena/)** — then click **“Click to start the arena”** to unlock audio and watch it auto-play.

### 📝 Read the build story
**➡️ [How AI Agents Built a Snakes & Ladders Web Game](https://supratim-sanyal.blogspot.com/2026/08/build-snakes-and-ladders-web-game-ai-agents.html)** — the full story of an AI software company (a fleet of LLM agents running an SDLC) building this arena, on the **SANYALnet Labs blog**.

---

## ✨ Highlights

| Feature | Details |
|---------|---------|
| **Authentic Indian rules** | Entry on 1 or 6, exact landing on 100, capture (Katti), triple-six penalty, extra turn on 6 |
| **Procedural boards** | 4–6 ladders & 4–6 snakes each game, geometrically validated (no crossings, minimum row-span, fairness zone) |
| **SVG-rendered pieces** | Sinuous dark snakes with tiny heads, forked tongues & whip tails (an SVG speckle filter is applied for subtle texture); two-rail ladders with interior rungs only |
| **Smooth animation** | Token walks tile-by-tile then glides along the exact SVG path; CSS transitions suppressed during jumps for zero wobble |
| **Audio cues** | 12 event sounds (roll, step, settle, ladder, snake, six, triple-six, turn, win, game-over, capture, enter) with autoplay-policy gate |
| **Kiosk-ready** | Detects `display-mode: standalone`; hides start button when autoplay allowed |
| **Auto-play arena** | Starts, plays to completion, shows winner, waits 10 s, regenerates board, repeats — no user input required |
| **Responsive layout** | 3-column flex UI (title • board • commentary) that works from desktop down to 600 px |
| **Zero-build** | Pure ES6 modules, plain CSS, static files — drop into any static host (GitHub Pages, Netlify, Nginx) |

---

## 🎮 Live Demo

```bash
# 1. Clone
git clone https://github.com/tuklusan/snakes-and-ladders-arena.git
cd snakes-and-ladders-arena

# 2. Serve (no build step)
python3 tools/serve_nocache.py 8000
# → open http://localhost:8000  (or http://<your-lan-ip>:8000)
```

The server sends `Cache-Control: no-store` so every reload picks up the latest code — ideal for kiosk / active development.

---

## 🖼️ Screenshots

### Initial State (Audio Gate)
In normal browsers, autoplay is blocked — the game waits for a user gesture. The **“Click to start the arena”** button appears over the board; clicking it unlocks audio and begins auto-play.

| Before click | After click (mid-game) |
|--------------|------------------------|
| ![Start button](https://raw.githubusercontent.com/tuklusan/snakes-and-ladders-arena/master/validation_output/screenshot_start_button.png) | ![Mid-game](https://raw.githubusercontent.com/tuklusan/snakes-and-ladders-arena/master/validation_output/screenshot_30s.png) |

*In kiosk mode (`--app` / standalone) the button is hidden and the arena starts automatically.*

### Gameplay at 30s and 90s
Real mid-game captures from a properly running session (start button clicked, audio unlocked, auto-play active).

| 30 seconds | 90 seconds |
|------------|------------|
| ![30s](https://raw.githubusercontent.com/tuklusan/snakes-and-ladders-arena/master/validation_output/screenshot_30s.png) | ![90s](https://raw.githubusercontent.com/tuklusan/snakes-and-ladders-arena/master/validation_output/screenshot_90s.png) |

*Captured with headless Puppeteer at exact timestamps after start button click.*

---

## 🏗️ Architecture (MVC)

```
index.html
└─ main.js                 → bootstraps
   ├─ gameModel.js         → state, procedural board generator, geometry helpers
   ├─ gameController.js    → rules engine (ProcessTurn, capture, triple-six, win)
   └─ gameView.js          → DOM, SVG, animation loop, audio, commentary
```

*All logic is deterministic; the only randomness is `Math.random()` for dice and board generation.*

---

## 📜 Rules Quick-Reference (GAME-RULES.md)

1. **Start** – all pawns at 0 (off-board)  
2. **Enter** – roll 1 or 6 → pawn appears on tile 1  
3. **Move** – pawn advances `roll` tiles; overshooting 100 cancels move  
4. **Ladders** – land on ladder foot → climb to top instantly  
5. **Snakes** – land on snake head → slide down to tail  
6. **Capture (Katti)** – land on opponent (not in safe zones 0, 1, 100) → opponent returns to 0  
7. **Six bonus** – roll 6 → extra turn (max 2 consecutive)  
8. **Triple-six penalty** – three 6s in one turn → all movement reverted, turn ends  
9. **Win** – first pawn to land **exactly** on 100 wins

---

## 🛠️ Development

```bash
# Sanity / regression checks (Node scripts require Puppeteer: npm install)
node tools/test_board_gen.js        # board generator sanity
node tools/test_board_stress.js     # board generator stress test
bash tools/verify_all.sh            # aggregate verification run

# Lint
npx eslint src/js/
```

### Key source locations

| Feature | File |
|---------|------|
| Board generator & validation | `src/js/gameModel.js` |
| Snake rendering (speckle filter, uniform width) | `src/js/gameView.js` |
| Head / tail SVG elements | `src/js/gameView.js` |
| Ladder rung loop (interior only) | `src/js/gameView.js` |
| Token animation (step + jump) | `src/js/gameView.js` |
| Audio autoplay probe & start button | `src/js/gameView.js` |
| Rules engine (ProcessTurn, capture, triple-six, win) | `src/js/gameController.js` |

---

## 📦 Release History

| Tag | Date | Notes |
|-----|------|-------|
| `beta-0.0.1` – `beta-0.0.5` | 2026-08 | Incremental fixes (movement, snake heads/tongues, ladder rungs, wobble analysis) |
| `beta-0.1.0` | 2026-08-31 | Operator issues OI-1..4 resolved: small tile font, ladder interior rungs, snake traversal + audio, uniform snakes |
| `beta-0.1.1` | 2026-08-31 | Defects/pending closed; DeepSeek review baseline |
| `beta-0.1.2` | 2026-09-01 | Repo consolidation: single linear branch, hygiene cleanup |
| `beta-0.1.3` | 2026-09-01 | 28 DeepSeek defects repaired; layout height + capture-sound follow-ups |
| **`1.0.0`** | **2026-09-01** | **First stable release** — all issues and review defects resolved; zero console errors |
| **`1.0.1`** | **2026-09-02** | **Cross-platform polish** — iOS audio sync via Web Audio API, responsive mobile layout (iPhone 12 & iPhone 15 Pro Max), reliable single-tap start; zero console errors |

---

## 🚀 Roadmap (post-β)

- Formal test suite (Vitest + Playwright) + GitHub Actions CI  
- Module split: `SnakeRenderer`, `LadderRenderer`, `TokenAnimator`, `AudioManager`  
- Static-host packaging (esbuild / Vite) for GitHub Pages deploy  
- Accessibility pass (ARIA, keyboard nav, colour-contrast audit)  
- i18n support (Hindi, Bengali, …)  

---

## 📄 License

Copyright © 2026 Supratim Sanyal / SANYALnet Labs.

Licensed under the **SANYALnet Labs Non-Commercial License** — free to use, modify, and distribute for **non-commercial** purposes (personal, educational, hobbyist); **commercial use is prohibited** without prior written permission. Derivative works must carry the attribution *“Based on original work by Supratim Sanyal of SANYALnet Labs.”* See [`LICENSE`](LICENSE) for the full terms.

Third-party assets (tokens, dice, audio) are CC0 / Kenney.nl — see `assets/audio/CREDITS.md`.

---

## 🙏 Credits

* **Author** – Supratim Sanyal / SANYALnet Labs  
* **Snake reference art** – `assets/reference/snake_example.jpg`  
* **Audio** – Kenney “Casino”, “Interface”, “Digital” & “Impact” packs (CC0) – see `assets/audio/CREDITS.md`  

---

> **“Roll the dice. Watch the arena play itself. Repeat.”**  
> — *SANYALnet Labs*