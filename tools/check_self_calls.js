#!/usr/bin/env node
// Verifies that every this.foo() call resolves to a method or property defined
// on the same object.
//
// The cross-object checker (check_view_contract.js) only validates
// this.view.X(), this.model.X() and this.controller.X(). It passed cleanly
// while gameView contained:
//
//     this.startButtonElement.addEventListener('click', () => {
//         this._unlockAudioAndStart();          // defined nowhere
//     });
//
// That is the fifth time in this project a method has been called that does not
// exist. Each previous instance threw at runtime and took the page down; this
// one was dead code that never ran, which is arguably worse - a feature that
// looked implemented and was not.

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = ['src/js/gameView.js', 'src/js/gameController.js', 'src/js/gameModel.js'];

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// names that are language constructs, not methods
const RESERVED = new Set([
  'if', 'for', 'while', 'switch', 'catch', 'function', 'return',
  'typeof', 'new', 'constructor', 'super', 'this'
]);

let failures = 0;

for (const rel of files) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) continue;
  const src = fs.readFileSync(full, 'utf8');
  const clean = stripComments(src);

  // things defined on the object: class methods, and anything assigned to this.x
  const known = new Set();
  let m;
  const reMethod = /^[ \t]*(?:static[ \t]+)?(?:async[ \t]+)?([a-zA-Z_$][\w$]*)[ \t]*\(/gm;
  while ((m = reMethod.exec(src)) !== null) known.add(m[1]);
  const reAssign = /this\.([a-zA-Z_$][\w$]*)\s*=/g;
  while ((m = reAssign.exec(src)) !== null) known.add(m[1]);

  // things called on the object
  const called = new Set();
  const reCall = /this\.([a-zA-Z_$][\w$]*)\s*\(/g;
  while ((m = reCall.exec(clean)) !== null) called.add(m[1]);

  const missing = [...called].filter(n => !known.has(n) && !RESERVED.has(n)).sort();

  console.log(`\n${rel}  (${called.size} self-calls)`);
  if (!missing.length) {
    console.log('  ok       all resolve');
  } else {
    for (const n of missing) {
      console.log(`  MISSING  this.${n}()  - called but never defined`);
      failures++;
    }
  }
}

console.log('');
if (failures) {
  console.log(`FAIL - ${failures} self-call(s) do not resolve.`);
  process.exit(1);
}
console.log('PASS - every this.x() call resolves.');
