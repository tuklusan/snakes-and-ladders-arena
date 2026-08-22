#!/usr/bin/env bash
set -u
PROJ=/home/sanyalnet/SOFTWARE-DEVELOPMENT/snakes-and-ladders
DUR=${1:-90}
pkill -f "user-data-dir=/tmp/cr_trav" 2>/dev/null
pkill -f "Xvfb :96" 2>/dev/null
sleep 1
rm -rf /tmp/cr_trav
Xvfb :96 -screen 0 1300x900x24 >/dev/null 2>&1 &
sleep 3
DISPLAY=:96 chromium --no-sandbox --disable-gpu --disable-dev-shm-usage \
  --user-data-dir=/tmp/cr_trav --no-first-run --disable-infobars \
  --window-size=1300,900 --window-position=0,0 \
  --autoplay-policy=no-user-gesture-required \
  "http://localhost:8000/diag_traverse.html" >/dev/null 2>&1 &
sleep "$DUR"
DISPLAY=:96 import -window root "$PROJ/shots/traverse.png" 2>/dev/null
echo done
