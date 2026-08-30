#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Known browser globals (minimal set) - add uppercase ones
const knownGlobals = new Set([
  'window', 'document', 'console', 'performance', 'navigator', 'location',
  'localStorage', 'sessionStorage', 'history', 'alert', 'setTimeout', 'clearTimeout',
  'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame',
  'fetch', 'Promise', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Function',
  'Date', 'RegExp', 'Error', 'Math', 'JSON', 'parseInt', 'parseFloat', 'isNaN',
  'isFinite', 'encodeURI', 'decodeURI', 'encodeURIComponent', 'decodeURIComponent',
  'HTMLElement', 'HTMLDivElement', 'HTMLImageElement', 'HTMLAudioElement', 'Event',
  'MouseEvent', 'KeyboardEvent', 'TouchEvent', 'WheelEvent', 'ClipboardEvent',
  'FocusEvent', 'InputEvent', 'CustomEvent', 'UIEvent', 'EventTarget', 'Node',
  'Element', 'Text', 'DocumentFragment', 'NodeList', 'HTMLCollection',
  'SVGElement', 'SVGSVGElement', 'SVGPathElement', 'SVGPoint', 'SVGMatrix',
  // Uppercase constants
  'NaN', 'Infinity', 'undefined', 'null', 'true', 'false'
]);

// Function to strip comments and string literals from source code
function stripCommentsAndStrings(code) {
  // Remove single line comments
  code = code.replace(/\/\/.*/g, '');
  // Remove block comments (non-nested)
  code = code.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove string literals (single and double quotes, template literals)
  code = code.replace(/(["'])(?:(?!\1).|\\(?:\r\n|[\s\S]))*\1/g, '');
  code = code.replace(/`(?:[^`\\]|\\(?:\r\n|[\s\S]))*`/g, '');
  return code;
}

// Function to extract declared identifiers from code (crude)
function extractDeclaredIdentifiers(code) {
  const declared = new Set();
  // Match const, let, var declarations
  const varPattern = /\b(?:const|let|var)\s+([^;{]+)/g;
  let match;
  while ((match = varPattern.exec(code)) !== null) {
    const decl = match[1];
    // Split by commas and handle destructuring crudely: just take identifiers before =
    const parts = decl.split(',');
    for (const part of parts) {
      // Remove anything after = or :
      const identifier = part.split(/[=:]/)[0].trim();
      // Remove array brackets and object braces crudely
      const clean = identifier.replace(/[\[\]{}]/g, '').trim();
      if (clean) {
        declared.add(clean);
      }
    }
  }
  // Match function declarations
  const funcPattern = /\bfunction\s+([^(\s]+)/g;
  while ((match = funcPattern.exec(code)) !== null) {
    declared.add(match[1]);
  }
  // Match class declarations
  const classPattern = /\bclass\s+([^(\s]+)/g;
  while ((match = classPattern.exec(code)) !== null) {
    declared.add(match[1]);
  }
  // Match static fields in class: static FIELD = value;
  const staticFieldPattern = /\bstatic\s+([A-Z_][A-Z0-9_]*)\s*=/g;
  while ((match = staticFieldPattern.exec(code)) !== null) {
    declared.add(match[1]);
  }
  // Match class fields (instance) but we don't need them for uppercase constants
  // We'll ignore for now.

  return declared;
}

// Function to find all identifiers in code (after stripping comments and strings) with positions
function findIdentifiersWithPositions(code) {
  const identifierRegex = /\b[A-Za-z_$][A-Za-z0-9_$]*\b/g;
  const identifiers = [];
  let match;
  while ((match = identifierRegex.exec(code)) !== null) {
    identifiers.push({
      name: match[0],
      start: match.index,
      end: match.index + match[0].length
    });
  }
  return identifiers;
}

// Main
const srcDir = path.join(__dirname, '..', 'src', 'js');
const files = [];

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
}
walkDir(srcDir);

let errorCount = 0;

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  const stripped = stripCommentsAndStrings(code);
  const declared = extractDeclaredIdentifiers(stripped);
  const identifierMatches = findIdentifiersWithPositions(stripped);

  for (const match of identifierMatches) {
    const { name, start, end } = match;
    // Skip if preceded by a dot (property access)
    if (start > 0 && stripped[start - 1] === '.') {
      continue;
    }
    // Skip if followed by a colon (object literal key or property definition)
    let after = end;
    while (after < stripped.length && /\s/.test(stripped[after])) {
      after++;
    }
    if (after < stripped.length && stripped[after] === ':') {
      continue;
    }
    // Only check uppercase constants (like PAUSE_DURATION)
    if (/^[A-Z_][A-Z0-9_]*$/.test(name)) {
      if (!declared.has(name) && !knownGlobals.has(name)) {
        console.error(`${file}: Undeclared identifier '${name}'`);
        errorCount++;
      }
    }
  }
}

if (errorCount > 0) {
  process.exit(1);
} else {
  console.log('No undeclared uppercase identifiers found.');
  process.exit(0);
}