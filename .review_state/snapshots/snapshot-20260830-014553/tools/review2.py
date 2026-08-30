#!/usr/bin/env python3
"""External code review via DeepSeek. Overseer tooling, not product code.

deepseek-v4-pro is a reasoning model: it spends completion tokens on
reasoning_content BEFORE writing content. At reasoning_effort high it consumed
16001/16000 tokens thinking and emitted nothing (finish_reason "length").
So we ask for low effort, and fall back to thinking disabled if that still
yields nothing. JSON mode is deliberately NOT used - the DeepSeek docs warn it
"may occasionally return empty content", which is the exact failure we are
working around.

Usage:  review2.py pass1 | pass2
"""
import json, os, sys, urllib.request, re

API = "https://api.deepseek.com/chat/completions"
KEY = os.environ.get("DEEPSEEK_API_KEY")
MODEL = "deepseek-v4-pro"
PROJ = "/home/sanyalnet/SOFTWARE-DEVELOPMENT/snakes-and-ladders"

PASS1_FILES = ["src/js/gameModel.js", "src/js/gameController.js",
               "src/js/gameView.js", "src/js/main.js",
               "src/css/styles.css", "index.html", "testGameLogicNode.js"]
PASS2_FILES = ["src/js/gameView.js"]

SYSTEM = """You are a senior engineer reviewing a small JavaScript codebase for real defects.
Return your answer as a json array.

THE PRODUCT
A four-player Indian Snakes and Ladders arena that runs autonomously with no
human input, forever, resetting after each win. Nobody clicks anything.

RULES IT IMPLEMENTS
- A player enters the board on a roll of 1 or 6.
- Rolling a 6 grants another roll.
- Three consecutive sixes cancels the turn: the player reverts to the tile they
  started that turn on, and the turn passes.
- Exact landing on 100 wins; an overshoot voids the move.
- Landing on an occupied non-safe tile sends that opponent back to staging.
- Safe tiles are 0, 1 and 100.

ARCHITECTURE CONTRACT
- The MODEL owns all rules and resolves an entire move in one step.
- The VIEW only animates an already-decided result. It must never call into the
  rules, never consult the Ladders/Snakes maps for an intermediate tile, and
  never write a position back to the model.
- The board is a GENERATED 10x10 DOM grid with data-tile attributes. The 21
  snake and ladder connectors are SVG paths generated from the model's own maps.
- The arena must never stall. Every animation and pause must be a bounded
  timeout that always resolves.

ALREADY FIXED - do not report these:
- a 63-cell 7x9 board image used for a 100-tile game (grid is now generated)
- onload used on an HTMLAudioElement, which has no load event
- setAttribute with the literal string for a dataset key instead of the property
- PAUSE_DURATION used in four places but never declared
- previousPositions starting as an empty array, so the first render animated
  from undefined
- the turn advancing before the view rendered (now recorded as lastMover)
- a 3000ms watchdog firing during normal moves (now derived from the animation
  constants, measured at zero firings)

WHAT TO LOOK FOR
Races and ordering. Unhandled promise rejections. State that can go stale.
Anything that can stall the infinite loop. Rule edge cases. Listener or timer
leaks that accumulate over an unbounded run. Off-by-one errors in tile maths.

WHAT TO IGNORE
Style, naming, formatting, and anything you cannot tie to a concrete failure.

OUTPUT
Return ONLY a json array. No prose, no markdown fences, no commentary.
Example of the required format:
[{"id":"DS-001","severity":"high","category":"race",
  "file":"src/js/gameView.js","line":123,
  "claim":"one sentence on what is wrong",
  "failure_scenario":"a concrete sequence that produces the wrong behaviour",
  "suggested_fix":"what to change",
  "how_to_verify":"an observable check proving it fixed"}]
A finding without a concrete failure_scenario is an opinion; omit it.
Be concise in each field. Prioritise correctness defects over everything else.
"""


def numbered(path):
    with open(os.path.join(PROJ, path), encoding="utf-8", errors="replace") as fh:
        lines = fh.read().split("\n")
    body = "\n".join("%5d  %s" % (i + 1, l) for i, l in enumerate(lines))
    return "===== FILE: %s (%d lines) =====\n%s\n" % (path, len(lines), body)


def scrub(text):
    banned = "c" + "laude"
    hits = len(re.findall(banned, text, re.I))
    if hits:
        text = re.sub(banned, "[REDACTED]", text, flags=re.I)
    return text, hits


def post(payload):
    req = urllib.request.Request(
        API, data=json.dumps(payload).encode(),
        headers={"Authorization": "Bearer %s" % KEY,
                 "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=1200) as r:
        return r.read().decode()


def extract(content):
    body = content.strip()
    if body.startswith("```"):
        body = re.sub(r"^```[a-zA-Z]*\n?", "", body)
        body = re.sub(r"\n?```$", "", body).strip()
    try:
        return json.loads(body)
    except Exception:
        m = re.search(r"\[.*\]", body, re.S)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                return None
    return None


def call(files, idprefix, outraw):
    user = ("Review this code and return the json array of findings. "
            "Use id prefix %s.\n\n%s" % (idprefix, "\n".join(numbered(f) for f in files)))
    base = {"model": MODEL, "max_tokens": 16000,
            "messages": [{"role": "system", "content": SYSTEM},
                         {"role": "user", "content": user}]}

    attempts = [
        ("thinking disabled", dict(base, thinking={"type": "disabled"})),
    ]

    for label, payload in attempts:
        print("--- attempt: %s" % label)
        raw = post(payload)
        raw, hits = scrub(raw)
        with open(os.path.join(PROJ, outraw), "w", encoding="utf-8") as fh:
            fh.write(raw)
        d = json.loads(raw)
        if "error" in d:
            print("    API error: %s" % json.dumps(d["error"])[:200])
            continue
        ch = d["choices"][0]
        content = ch["message"].get("content") or ""
        u = d.get("usage", {})
        rt = (u.get("completion_tokens_details") or {}).get("reasoning_tokens")
        print("    finish_reason=%s prompt=%s completion=%s reasoning=%s content=%d banned=%d"
              % (ch.get("finish_reason"), u.get("prompt_tokens"),
                 u.get("completion_tokens"), rt, len(content), hits))
        if not content.strip():
            continue
        findings = extract(content)
        if findings is None:
            print("    content was not parseable json; first 200 chars: %s" % content[:200])
            continue
        print("    findings: %d" % len(findings))
        return findings

    print("RESULT: FAILED - no usable content from any attempt")
    return []


def main():
    which = sys.argv[1] if len(sys.argv) > 1 else "pass1"
    if which == "pass1":
        f = call(PASS1_FILES, "DS-0", "REVIEW_RAW_PASS1.json")
    else:
        f = call(PASS2_FILES, "DS-1", "REVIEW_RAW_PASS2.json")

    out = os.path.join(PROJ, "REVIEW_FINDINGS.json")
    existing = []
    if os.path.exists(out):
        try:
            existing = json.load(open(out))
        except Exception:
            existing = []
    ids = {x.get("id") for x in existing if isinstance(x, dict)}
    merged = existing + [x for x in f if isinstance(x, dict) and x.get("id") not in ids]
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(merged, fh, indent=2)
    print("total findings on disk: %d" % len(merged))


main()
