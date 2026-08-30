#!/usr/bin/env bash
# Run the console watcher on a REAL display for N seconds and capture the verdict.
set -u
PROJ=/home/sanyalnet/SOFTWARE-DEVELOPMENT/snakes-and-ladders
D=:90
pkill -f "user-data-dir=/tmp/cr_cw" 2>/dev/null; pkill -f "Xvfb $D" 2>/dev/null
sleep 1; rm -rf /tmp/cr_cw /tmp/.X90-lock 2>/dev/null
Xvfb $D -screen 0 1400x1000x24 >/dev/null 2>&1 & sleep 4
DISPLAY=$D chromium --disable-gpu --user-data-dir=/tmp/cr_cw \
  --no-first-run --disable-infobars --window-size=1400,1000 \
  --autoplay-policy=no-user-gesture-required \
  "http://localhost:8000/diag_console.html" >/dev/null 2>&1 &
sleep "${1:-100}"
mkdir -p "$PROJ/shots"
DISPLAY=$D import -window root "$PROJ/shots/console.png" 2>&1 || echo IMPORT_FAILED
echo captured
pkill -f "user-data-dir=/tmp/cr_cw" 2>/dev/null; pkill -f "Xvfb $D" 2>/dev/null
