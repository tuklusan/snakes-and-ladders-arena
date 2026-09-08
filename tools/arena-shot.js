// Capture Snakes & Ladders Arena screenshots at fixed offsets after the start click.
// Marked by platform via PLATFORM_LABEL. Uses a TRUSTED CDP mouse click so the
// page's user-activation gate (start + audio unlock) is satisfied.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const URL_ = process.env.TARGET_URL || 'https://tuklusan.github.io/snakes-and-ladders-arena/';
const LABEL = process.env.PLATFORM_LABEL || 'unknown';
const OUT = process.env.OUT_DIR || 'shots';
const OFFSETS = (process.env.OFFSETS || '30,300,600').split(',').map(Number);

function playwrightChrome() {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const roots = [path.join(home, '.cache', 'ms-playwright'),
                 path.join(home, 'Library', 'Caches', 'ms-playwright'),
                 path.join(home, 'AppData', 'Local', 'ms-playwright')];
  for (const root of roots) {
    try {
      if (!fs.existsSync(root)) continue;
      for (const d of fs.readdirSync(root).filter(x => x.startsWith('chromium'))) {
        for (const rel of ['chrome-linux/chrome', 'chrome-win/chrome.exe',
                           'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
                           'chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium']) {
          const cand = path.join(root, d, rel);
          if (fs.existsSync(cand)) return cand;
        }
      }
    } catch (e) {}
  }
  return null;
}

function resolveChrome() {
  // setup-chrome's macOS arm64 chromium launches but never answers CDP, so
  // prefer Playwright's build where we ask for it.
  if (process.env.PREFER_PLAYWRIGHT) { const p = playwrightChrome(); if (p) return p; }
  const envp = process.env.CHROME_PATH;
  if (envp && fs.existsSync(envp)) return envp;
  const c = [
    '/usr/bin/google-chrome-stable','/usr/bin/google-chrome','/usr/bin/chromium-browser',
    '/usr/bin/chromium','/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
  ];
  for (const q of c) { try { if (fs.existsSync(q)) return q; } catch (e) {} }
  return playwrightChrome();
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const exe = resolveChrome();
  if (!exe) { console.error('NO_CHROME_FOUND on ' + LABEL); process.exit(78); }
  console.log('platform=' + LABEL + ' chrome=' + exe);
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: exe,
    headless: 'new',
    protocolTimeout: 1800000,
    args: ['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--hide-scrollbars',
           '--autoplay-policy=no-user-gesture-required','--window-size=1920,1080','--force-device-scale-factor=1'],
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('PAGE_ERR: ' + m.text().slice(0,150)); });
  await page.goto(URL_, { waitUntil: 'networkidle2', timeout: 90000 });

  const FIND = "[...document.querySelectorAll('button')].find(b=>/click to start/i.test(b.textContent||''))";
  await page.waitForFunction('!!(' + FIND + ')', { timeout: 60000 });
  const box = await page.evaluate(new Function('const b=' + FIND + '; const r=b.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height};'));
  console.log('start button at ' + JSON.stringify(box));

  await page.mouse.click(box.x + box.w / 2, box.y + box.h / 2);  // trusted gesture
  const t0 = Date.now();
  await page.waitForFunction('!(' + FIND + ')', { timeout: 45000 });
  console.log('arena started');

  // Dwell with a CDP keepalive: a silent 10-minute sleep lets a pending
  // protocol command age out (macOS runners failed with Network.enable timeout).
  const dwellUntil = async (deadline) => {
    while (Date.now() < deadline) {
      await sleep(Math.min(15000, deadline - Date.now()));
      try { await page.evaluate('1'); } catch (e) {}
    }
  };

  for (const s of OFFSETS) {
    const due = t0 + s * 1000 - Date.now();
    if (due > 0) await dwellUntil(t0 + s * 1000);
    const f = path.join(OUT, LABEL + '__t' + s + 's.png');
    await page.screenshot({ path: f });
    const moves = await page.evaluate("(document.querySelector('#commentary-content')||{}).childElementCount||0");
    console.log('captured ' + f + ' (commentary entries: ' + moves + ')');
  }
  await browser.close();
})().catch(e => { console.error('FAIL ' + LABEL + ': ' + e.message); process.exit(1); });
