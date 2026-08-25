#!/usr/bin/env bash
# Full acceptance sweep. Run after a round goes quiet.
#
# Includes the LONG overflow measurement, because the commentary-crushes-dice
# bug only appears after ~10 lines (~45s). Short samples pass on a broken build:
# the 9-second harness did exactly that for several rounds.
set -u
cd /home/sanyalnet/SOFTWARE-DEVELOPMENT/snakes-and-ladders || exit 1

# the harness is the client's instrument; restore it if it was edited
git checkout -- diag_accept.html 2>/dev/null

C="chromium --headless --disable-gpu"   # no: unnecessary here

echo "=== contract ==="
node tools/check_view_contract.js >/dev/null 2>&1 && echo "PASS" || { echo "FAIL"; node tools/check_view_contract.js 2>&1 | grep MISSING; }

echo "=== rules ==="
node testGameLogicNode.js 2>&1 | tail -1

echo "=== harness ==="
timeout 140 $C --user-data-dir=/tmp/va_h --virtual-time-budget=45000 \
  --window-size=900,650 --dump-dom http://localhost:8000/diag_accept.html 2>/dev/null \
  | sed -n '/<pre id="out">/,/<\/pre>/p' | sed 's/<[^>]*>//g' > /tmp/va_h.txt
echo "$(grep -c '^PASS' /tmp/va_h.txt)/$(grep -cE '^(PASS|FAIL)' /tmp/va_h.txt)"
grep '^FAIL' /tmp/va_h.txt

echo "=== error gate x3 ==="
for i in 1 2 3; do
  printf "  run%s: " "$i"
  timeout 200 $C --user-data-dir=/tmp/va_e$i --virtual-time-budget=120000 \
    --window-size=1400,900 --dump-dom http://localhost:8000/diag_errors.html 2>/dev/null \
    | sed -n '/<pre id="out">/,/<\/pre>/p' | sed 's/<[^>]*>//g' | grep '^errors'
done
timeout 200 $C --user-data-dir=/tmp/va_ed --virtual-time-budget=120000 \
  --window-size=1400,900 --dump-dom http://localhost:8000/diag_errors.html 2>/dev/null \
  | sed -n '/<pre id="out">/,/<\/pre>/p' | sed 's/<[^>]*>//g' | sed -n '/distinct errors/,$p' | head -5

echo "=== long overflow watch (90s of play) ==="
cat > /tmp/va_ov.html <<'HTML'
<!doctype html><meta charset=utf-8>
<iframe id=f src="index.html" width="700" height="600" style="border:0"></iframe><pre id=out>x</pre>
<script>
var rows=[];
setTimeout(function(){
  var t=0;
  var iv=setInterval(function(){
    t++;
    var d=document.getElementById("f").contentDocument;
    var dc=d.getElementById("dice-container"), cp=d.getElementById("right-commentary-panel"),
        cc=d.getElementById("commentary-content");
    if(dc&&cp){
      var dr=dc.getBoundingClientRect(), cr=cp.getBoundingClientRect();
      var sh=cc?cc.scrollHeight:0, ch=cc?cc.clientHeight:0;
      rows.push((t*10)+"s lines="+(cc?cc.children.length:0)
        +" diceH="+dr.height.toFixed(0)+" cmtT="+cr.top.toFixed(0)
        +" scrollH="+sh+" clientH="+ch+(sh>ch?" SCROLLS":(cc&&cc.children.length>9?"  <<GROWING":"")));
    }
    if(t>=9){clearInterval(iv);document.getElementById("out").textContent=rows.join("\n");}
  },10000);
},8000);
</script>
HTML
cp /tmp/va_ov.html ./va_ov.html
timeout 220 $C --user-data-dir=/tmp/va_o --virtual-time-budget=160000 \
  --window-size=760,650 --dump-dom http://localhost:8000/va_ov.html 2>/dev/null \
  | sed -n '/<pre id="out">/,/<\/pre>/p' | sed 's/<[^>]*>//g'
rm -f ./va_ov.html

echo "=== git ==="
git log --oneline -1
echo "dirty: $(git status --porcelain | wc -l)"
git fetch -q origin 2>/dev/null
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/master 2>/dev/null)" ] && echo "origin: IN SYNC" || echo "origin: BEHIND"
echo "=== DONE ==="
