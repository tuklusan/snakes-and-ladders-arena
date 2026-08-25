#!/usr/bin/env bash
# Measure watchdog firings during real play, with stderr actually captured.
# Runs fully detached so it does not depend on an ssh session surviving.
set -u
export DISPLAY=:0
export XAUTHORITY=/home/sanyalnet/.Xauthority
PROJ=/home/sanyalnet/SOFTWARE-DEVELOPMENT/snakes-and-ladders
LOG=/home/sanyalnet/gatecheck.log
OUT=/home/sanyalnet/gatecheck.result

: > "$LOG"
: > "$OUT"

# stop anything else drawing on :0 so the log is from one game only
for pat in arenaprof cwprof gateprof; do
  for p in $(pgrep -f "$pat" 2>/dev/null); do kill -9 "$p" 2>/dev/null; done
done
sleep 3
rm -rf /home/sanyalnet/gcprof

# chromium writes page console.log to stderr with --enable-logging=stderr
chromium --disable-gpu \
  --user-data-dir=/home/sanyalnet/gcprof --no-first-run --disable-infobars \
  --window-size=1300,900 --autoplay-policy=no-user-gesture-required \
  --enable-logging=stderr --v=0 \
  --app=http://localhost:8000/index.html >>"$LOG" 2>&1 &
BPID=$!

sleep 150

{
  echo "=== WATCHDOG GATING MEASUREMENT (150s of real play) ==="
  echo "watchdog firings : $(grep -ci 'Watchdog triggered' "$LOG")   (must be 0)"
  echo "auto-rolls       : $(grep -ci 'Auto-rolling' "$LOG")"
  echo "moves animated   : $(grep -ci '_animateStepByStep from' "$LOG")"
  echo "landing pauses   : $(grep -ci 'pausing at landing tile' "$LOG")"
  echo "errors           : $(grep -ci 'error' "$LOG")"
  echo ""
  echo "--- any watchdog lines ---"
  grep -i 'Watchdog triggered' "$LOG" | head -5 || echo "(none)"
  echo ""
  echo "--- sample ordering: last 12 relevant lines ---"
  grep -iE 'Auto-rolling|_animateStepByStep from|pausing at landing' "$LOG" | tail -12
} > "$OUT" 2>&1

kill -9 "$BPID" 2>/dev/null
echo DONE >> "$OUT"
