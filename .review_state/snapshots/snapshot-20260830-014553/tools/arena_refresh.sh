#!/usr/bin/env bash
# Restart the arena browser whenever the served source is newer than the
# running browser process.
#
# The arena browser loads index.html once and holds that build until it is
# restarted. The server reads from disk, so the SERVED code moves forward with
# every edit while the WINDOW stays frozen. That gap has twice been mistaken for
# a regression - once as "r46 looked better", once as "the commentary auto
# scroll is not visible".
#
# Run from the arena supervisor loop, or on demand.
set -u
PROJ=/home/sanyalnet/SOFTWARE-DEVELOPMENT/snakes-and-ladders
PAT=arenapro[f]

pid=$(pgrep -f "$PAT" | head -1)
if [ -z "$pid" ]; then
  echo "no arena browser running; supervisor will launch one"
  exit 0
fi

# epoch seconds the browser started
started=$(date -d "$(ps -o lstart= -p "$pid")" +%s 2>/dev/null) || exit 0

# newest mtime among the sources the page actually loads
newest=0
for f in "$PROJ"/index.html "$PROJ"/src/js/*.js "$PROJ"/src/css/*.css; do
  [ -f "$f" ] || continue
  m=$(stat -c %Y "$f")
  [ "$m" -gt "$newest" ] && newest=$m
done

if [ "$newest" -gt "$started" ]; then
  age=$(( newest - started ))
  echo "source is ${age}s newer than the browser; restarting so the window shows the current build"
  kill -9 "$pid" 2>/dev/null
  # the supervisor relaunches within ~30s
else
  echo "browser is current (started $(date -d @$started '+%H:%M:%S'), newest source $(date -d @$newest '+%H:%M:%S'))"
fi
