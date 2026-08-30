#!/usr/bin/env bash
# Snakes and Ladders Arena — durable runner.
# Keeps the web server and a persistent browser alive, restarting either if it
# dies. Safe to run more than once; it self-guards with flock.
#
# Uses the REAL session display :0 rather than Xvfb. Xvfb cannot start on this
# box: /tmp is a 2GB tmpfs held at ~80% by stale root-owned snap mount
# namespaces, so Xvfb cannot write its lock file. Clearing that needs root or a
# reboot. :0 already exists and works.
set -u

PROJ=/home/sanyalnet/SOFTWARE-DEVELOPMENT/snakes-and-ladders
export DISPLAY=:0
export XAUTHORITY=/home/sanyalnet/.Xauthority
PROFILE=/home/sanyalnet/arenaprof
URL=http://localhost:8000/index.html
LOG=/home/sanyalnet/arena.log

log() { echo "$(date '+%F %T') $*" >> "$LOG"; }

LOCK=/home/sanyalnet/.arena.lock
exec 9>"$LOCK"
if ! flock -n 9; then
  log "another supervisor already running; exiting"
  exit 0
fi

log "supervisor starting (display $DISPLAY)"

while :; do
  # 1. web server
  if ! curl -s -o /dev/null --max-time 5 http://localhost:8000/index.html; then
    log "web server down; restarting"
    cd "$PROJ" || exit 1
    setsid nohup python3 tools/serve_nocache.py 8000 >/dev/null 2>&1 < /dev/null &
    sleep 3
  fi

  # 2. display sanity — if :0 is gone there is nothing we can do, just note it
  if ! xdpyinfo >/dev/null 2>&1; then
    log "display $DISPLAY unavailable; waiting"
    sleep 30
    continue
  fi

  # 3. browser
  if ! pgrep -f "user-data-dir=${PROFILE}" >/dev/null 2>&1; then
    log "browser down; launching arena"
    rm -rf "$PROFILE"
    setsid nohup chromium --disable-gpu \
      --user-data-dir="$PROFILE" --no-first-run \
      --disable-infobars --disable-session-crashed-bubble \
      --window-size=1300,900 --window-position=0,0 \
      --autoplay-policy=no-user-gesture-required \
      --app="$URL" >/dev/null 2>&1 < /dev/null &
    sleep 12
  fi

  sleep 30
done
