#!/usr/bin/env bash
# Wake the overseer when the kimi turn goes quiet, or at a hard ceiling.
# Re-globs the newest wire log each poll (v1 bug: it was chosen once at start).
set -u
IDLE=${IDLE:-300}      # seconds of no wire growth == turn finished
CAP=${CAP:-1500}       # 25 min ceiling
POLL=30
t=0
G=~/.kimi-code/sessions/wd_snakes-and-ladders_*/session_*/agents/main/wire.jsonl
while [ "$t" -lt "$CAP" ]; do
  sleep "$POLL"; t=$((t+POLL))
  w=$(ls -1t $G 2>/dev/null | head -1)
  [ -z "$w" ] && continue
  age=$(( $(date +%s) - $(stat -c %Y "$w") ))
  sz=$(stat -c %s "$w")
  if [ "$age" -ge "$IDLE" ]; then
    echo "QUIET after ${t}s: wire idle ${age}s, size ${sz}"
    echo "WIRE=$w"
    exit 0
  fi
done
echo "CEILING ${CAP}s reached; wire size $(stat -c %s "$(ls -1t $G|head -1)")"
