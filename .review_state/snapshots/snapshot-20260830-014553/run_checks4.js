const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require("fs");

// Load the index.html file
const html = fs.readFileSync("index.html", "utf8");

async function runChecks() {
  const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable" });
  const { window } = dom;
  const d = window.document;

  // Wait for DOMContentLoaded
  await new Promise((resolve) => {
    if (d.readyState === "loading") {
      d.addEventListener("DOMContentLoaded", resolve);
    } else {
      resolve();
    }
  });

  // Wait a bit for the game to initialize (the controller resetGame might be synchronous, but let's wait for the board to be rendered)
  // We'll wait for the game-board element to appear, with a timeout.
  await new Promise((resolve, reject) => {
    const maxAttempts = 50;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const board = d.getElementById("game-board");
      if (board) {
        clearInterval(interval);
        resolve();
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        reject(new Error("Timeout waiting for game-board"));
      }
    }, 100); // check every 100ms
  });

  // Additional wait for the game to set up tokens, etc.
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Now run the checks as defined in the run() function of diag_accept.html
  const w = window;
  const L = [];
  const P = (k, ok, v) => L.push((ok ? "PASS  " : "FAIL  ") + k.padEnd(26) + v);

  try {
    // 1. fits 600
    const sh = d.documentElement.scrollHeight;
    P("DR110_scrollHeight<=600", sh <= 600, sh + "px");
    const scroll = d.documentElement.scrollHeight > d.documentElement.clientHeight + 1;
    P("DR110_no_vscrollbar", !scroll, scroll ? "scrolls" : "no scroll");
    // 2. board square
    const b = d.getElementById("game-board");
    if (!b) {
      L.push("FAIL  board element           missing");
    } else {
      const r = b.getBoundingClientRect();
      const ratio = r.width / r.height;
      const sq = Math.abs(ratio - 1) <= 0.02;
      P("DR110_board_square", sq, r.width.toFixed(0) + "x" + r.height.toFixed(0) + " ratio=" + ratio.toFixed(3));
    }
    // 3. 100 addressable cells
    let cells = d.querySelectorAll("[data-tile]").length;
    if (!cells) cells = d.querySelectorAll(".tile,.cell,.board-cell,.grid-cell").length;
    P("DR108_100_cells", cells === 100, cells + " cells");
    // 4. tokens visible >=20px
    const toks = d.querySelectorAll(".game-token");
    let minT = 1e9;
    toks.forEach((t) => {
      const r = t.getBoundingClientRect();
      minT = Math.min(minT, r.width);
    });
    P("DR110_tokens>=20px", toks.length === 4 && minT >= 20, toks.length + " tokens, min " + (minT === 1e9 ? "n/a" : minT.toFixed(0) + "px"));
    // 5. tile numbers >=9px
    let fs = 0;
    let numEl = null;
    const cand = d.querySelector("[data-tile]") || d.querySelector(".tile,.cell,.board-cell,.grid-cell");
    if (cand) {
      numEl = cand;
      fs = parseFloat(w.getComputedStyle(cand).fontSize) || 0;
    }
    P("DR110_numbers>=9px", fs >= 9, fs ? fs.toFixed(1) + "px" : "no numbered cell found");
    // 6. connectors present (one per jump = 21)
    const conn = d.querySelectorAll("[data-jump],.ladder,.snake,.connector").length;
    P("DR108_connectors=21", conn === 21, conn + " connectors");
    // 7. tokens must occupy DISTINCT positions (not stacked)
    const pos = new Set();
    toks.forEach((t) => {
      const r = t.getBoundingClientRect();
      pos.add(r.left.toFixed(0) + "," + r.top.toFixed(0));
    });
    P("VIS_tokens_distinct", pos.size === toks.length, pos.size + " distinct of " + toks.length);
    // 8. staging tokens must NOT sit on tile 100's cell
    const c100 = d.querySelector('[data-tile="100"]');
    let onC100 = 0;
    if (c100) {
      const q = c100.getBoundingClientRect();
      toks.forEach((t) => {
        const r = t.getBoundingClientRect();
        if (Math.abs(r.left - q.left) < 5 && Math.abs(r.top - q.top) < 5) onC100++;
      });
    }
    P("VIS_tokens_not_on_100", onC100 === 0, onC100 + " tokens on cell 100");
    // 9. dice must not overlap the board
    const bb = b.getBoundingClientRect();
    const dice = d.getElementById("dice-container") || d.querySelector("[id*=dice]");
    let ov = false;
    if (dice) {
      const r = dice.getBoundingClientRect();
      ov = r.left < bb.right && r.right > bb.left && r.top < bb.bottom && r.bottom > bb.top;
    }
    P("VIS_dice_off_board", dice && !ov, dice ? (ov ? "overlaps board" : "clear") : "no dice el");
    // 10. cells must have visible grid lines
    const c1 = d.querySelector("[data-tile]");
    let bw = 0;
    if (c1) {
      const st = w.getComputedStyle(c1);
      bw = parseFloat(st.borderTopWidth) || parseFloat(st.outlineWidth) || 0;
    }
    P("VIS_grid_lines", bw > 0, bw + "px border");
    // 11. connectors must render BEHIND the numbers
    const svg = d.querySelector("#game-board svg");
    let behind = false;
    if (svg && c1) {
      const zs = parseInt(w.getComputedStyle(svg).zIndex) || 0;
      const zc = parseInt(w.getComputedStyle(c1).zIndex) || 0;
      behind = zs < zc || (svg.compareDocumentPosition(c1) & window.Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    }
    P("VIS_connectors_behind", behind, svg ? ("svg z=" + w.getComputedStyle(svg).zIndex) : "no svg");
    // 12. the loading overlay must be gone and the game actually started
    const bodyTxt = (d.body.innerText || "");
    const loading = /Loading game assets/i.test(bodyTxt);
    P("VIS_loading_cleared", !loading, loading ? "STILL LOADING" : "cleared");
    // 13/14. nothing may be hidden behind the player panel
    const panel = d.getElementById("player-info") || d.querySelector("#player-panel,.player-info");
    const inter = (a, z) => a.left < z.right && a.right > z.left && a.top < z.bottom && a.bottom > z.top;
    if (panel) {
      const pr = panel.getBoundingClientRect();
      const bb2 = b.getBoundingClientRect();
      P("VIS_board_not_clipped", !inter(bb2, pr), "board B=" + bb2.bottom.toFixed(0) + " panel T=" + pr.top.toFixed(0));
      let hidden = 0;
      toks.forEach((t) => {
        if (inter(t.getBoundingClientRect(), pr)) hidden++;
      });
      P("VIS_all_tokens_visible", hidden === 0, hidden + " tokens behind panel");
      // 15. staged tokens must sit inside the staging strip
      const st = d.getElementById("staging") || d.getElementById("staging-area") || d.querySelector(".staging,.staging-area");
      if (st) {
        const sr = st.getBoundingClientRect();
        let outside = 0;
        toks.forEach((t) => {
          const r = t.getBoundingClientRect();
          const staged = r.top >= sr.top - 2 && r.bottom <= sr.bottom + 2;
          if (staged && (r.left < sr.left - 1 || r.right > sr.right + 1)) outside++;
        });
        P("VIS_staging_contained", outside === 0, outside + " staged tokens outside strip");
      } else {
        P("VIS_staging_contained", false, "no staging element");
      }
      // 16. there must be NO roll button (fully automatic arena)
      var rb = d.getElementById("roll-button");
      if (!rb) {
        var bl = d.querySelectorAll("button");
        for (var q = 0; q < bl.length; q++) {
          if (/roll/i.test(bl[q].textContent || "")) {
            rb = bl[q];
            break;
          }
        }
      }
      P("VIS_no_roll_button", !rb, rb ? ("found: " + (rb.id || rb.textContent)) : "none");
      // 17. turn indicator must be visible below dice
      var ind = d.getElementById("turn-indicator") || d.querySelector(".turn-indicator");
      var okI = false,
        whyI = "missing";
      if (ind) {
        var ir = ind.getBoundingClientRect(),
          ic = w.getComputedStyle(ind);
        var paint =
          (ic.backgroundImage && ic.backgroundImage !== "none") ||
          (ic.backgroundColor && ic.backgroundColor !== "rgba(0, 0, 0, 0)");
        okI = ir.width > 6 && ir.height > 6 && !!paint;
        whyI = Math.round(ir.width) + "x" + Math.round(ir.height) + " painted=" + !!paint;
      }
      P("VIS_turn_indicator", okI, whyI);
      // 19/20. the side panels must not overlap the board or each other
      var bb3 = b.getBoundingClientRect();
      var cm = d.getElementById("right-commentary-panel");
      var tt = d.getElementById("left-title-panel");
      var dc = d.getElementById("dice-container");
      var ix = function (a, z) {
        return a && z && a.left < z.right && a.right > z.left && a.top < z.bottom && a.bottom > z.top;
      };
      var cr = cm ? cm.getBoundingClientRect() : null,
        tr2 = tt ? tt.getBoundingClientRect() : null,
        dr2 = dc ? dc.getBoundingClientRect() : null;
      var bad = [];
      if (!cm) bad.push("commentary missing");
      else if (ix(cr, bb3)) bad.push("commentary overlaps board by " + Math.round(bb3.right - cr.left) + "px");
      if (!tt) bad.push("title missing");
      else if (ix(tr2, bb3)) bad.push("title overlaps board");
      P("VIS_panels_no_overlap", bad.length === 0, bad.length ? bad.join("; ") : "board clear of both panels");
      var bad2 = [];
      if (dr2 && cr && ix(dr2, cr)) bad2.push("dice overlaps commentary");
      if (cm) {
        // the scrollable element may be the panel itself or an inner content div
        var cands = [cm].concat(Array.prototype.slice.call(cm.querySelectorAll("*")));
        var scrolls = false;
        for (var si = 0; si < cands.length; si++) {
          var oy = w.getComputedStyle(cands[si]).overflowY;
          if (oy === "auto" || oy === "scroll") {
            scrolls = true;
            break;
          }
        }
        if (!scrolls) bad2.push("no scrollable element inside commentary (need overflow-y auto/scroll)");
      }
      P("VIS_commentary_scrolls", bad2.length === 0, bad2.length ? bad2.join("; ") : "dice clear, overflow-y ok");
    } else {
      P("VIS_board_not_clipped", false, "no panel element found");
      P("VIS_all_tokens_visible", false, "no panel element found");
      P("VIS_staging_contained", false, "no panel element found");
      P("VIS_no_roll_button", false, "no panel element found");
      P("VIS_turn_indicator", false, "no panel element found");
      P("VIS_panels_no_overlap", false, "no panel element found");
      P("VIS_commentary_scrolls", false, "no panel element found");
    }
  } catch (e) {
    L.push("ERROR " + e.message);
  }
  console.log(L.join("\n"));
}

runChecks().catch(console.error);