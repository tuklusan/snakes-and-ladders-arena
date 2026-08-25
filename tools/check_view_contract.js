#!/usr/bin/env node
// Verifies the controller -> view contract: every this.view.X() the controller
// calls must actually exist on GameView.
//
// This exists because the same defect has occurred four times in this project:
// the roll button, the turn indicator, onReset, and now onGameWin and
// onTurnChange - each a method or element removed while its callers remained.
// Each time it threw at runtime and took the whole page down, and each time it
// was found by a human looking at a blank screen. It is a static fact and a
// machine should check it.
//
// Exits non-zero if any called method is missing.

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const controllerSrc = fs.readFileSync(path.join(root, 'src/js/gameController.js'), 'utf8');
const viewSrc = fs.readFileSync(path.join(root, 'src/js/gameView.js'), 'utf8');
const modelSrc = fs.readFileSync(path.join(root, 'src/js/gameModel.js'), 'utf8');

function calledOn(src, receiver) {
  const re = new RegExp('this\\.' + receiver + '\\.([a-zA-Z_$][\\w$]*)\\s*\\(', 'g');
  const out = new Set();
  let m;
  while ((m = re.exec(src)) !== null) out.add(m[1]);
  return [...out].sort();
}

function definesMethod(src, name) {
  // class method:  name(...)  /  async name(...)
  const asMethod = new RegExp('^\\s*(?:async\\s+)?' + name + '\\s*\\(', 'm');
  // assigned:  this.name = function / arrow
  const asProp = new RegExp('this\\.' + name + '\\s*=', 'm');
  return asMethod.test(src) || asProp.test(src);
}

let failures = 0;

function checkContract(label, callerSrc, receiver, calleeSrc) {
  const called = calledOn(callerSrc, receiver);
  if (!called.length) return;
  console.log(`\n${label}  (${called.length} methods called)`);
  for (const name of called) {
    if (definesMethod(calleeSrc, name)) {
      console.log(`  ok       ${name}`);
    } else {
      console.log(`  MISSING  ${name}`);
      failures++;
    }
  }
}

checkContract('controller -> view', controllerSrc, 'view', viewSrc);
checkContract('controller -> model', controllerSrc, 'model', modelSrc);
checkContract('view -> model', viewSrc, 'model', modelSrc);
checkContract('view -> controller', viewSrc, 'controller', controllerSrc);

console.log('');
if (failures) {
  console.log(`FAIL - ${failures} called method(s) do not exist. This throws at runtime.`);
  process.exit(1);
}
console.log('PASS - every cross-object call resolves to a real method.');
