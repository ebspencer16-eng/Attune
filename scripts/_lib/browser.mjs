/**
 * A very small headless-browser driver, with no dependencies.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * The render smoke test is the only end-to-end check on the results pipeline,
 * and it could not run outside one particular sandbox. It required Playwright
 * through a hardcoded absolute path, and a Chromium build at another hardcoded
 * absolute path:
 *
 *   createRequire('/home/claude/.npm-global/lib/node_modules/playwright/')
 *   executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
 *
 * Neither exists on a developer's machine. A test that can only run somewhere
 * nobody works is not a test, and this one guards the class of bug that builds
 * clean and throws at render.
 *
 * Adding Playwright would fix it and add a large dependency for one script. It
 * is not needed: Chrome speaks the DevTools Protocol over a WebSocket, and
 * Node has had a WebSocket client built in since v22. So this drives whatever
 * Chrome is already installed, and adds nothing to package.json.
 *
 * It implements only what the smoke test uses. It is not a browser automation
 * library and should not grow into one; if a second script needs this, that is
 * the moment to reconsider taking the dependency.
 */

import { spawn } from 'child_process';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Where Chrome is, asked of the environment rather than assumed.
 *
 * CHROME wins so CI can point at anything. Otherwise the usual install
 * locations on macOS and Linux, in order. Playwright's own downloaded browsers
 * are included so a machine that does have Playwright still works.
 */
export function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;

  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  ];
  return candidates.find((p) => existsSync(p)) || null;
}

/** One in-flight CDP call. */
let nextId = 1;

export async function launch({ width = 1280, height = 1200 } = {}) {
  const chrome = findChrome();
  if (!chrome) {
    throw new Error(
      'No Chrome found. Install Google Chrome, or set CHROME to a browser binary.\n'
      + 'Checked: /Applications/Google Chrome.app, /Applications/Chromium.app, /usr/bin/google-chrome, /usr/bin/chromium.');
  }

  // A throwaway profile, so this never touches the developer's real one and
  // never inherits its cookies, extensions or logged-in sessions.
  const profile = mkdtempSync(join(tmpdir(), 'attune-smoke-'));

  const proc = spawn(chrome, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  // Chrome prints the port it actually chose on stderr.
  const wsUrl = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Chrome did not report a debugging port within 20s')), 20000);
    let buf = '';
    proc.stderr.on('data', (chunk) => {
      buf += chunk.toString();
      const m = buf.match(/ws:\/\/[^\s]+/);
      if (m) { clearTimeout(timer); resolve(m[0]); }
    });
    proc.on('exit', (code) => { clearTimeout(timer); reject(new Error(`Chrome exited early (code ${code})`)); });
  });

  const socket = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error('Could not connect to Chrome')), { once: true });
  });

  const pending = new Map();
  const listeners = { pageerror: [], console: [] };
  let sessionId = null;

  socket.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params?.exceptionDetails;
      const text = d?.exception?.description || d?.text || 'unknown error';
      listeners.pageerror.forEach((fn) => fn(text));
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = (msg.params.args || [])
        .map((a) => a.value ?? a.description ?? '').join(' ');
      listeners.console.forEach((fn) => ({ type: msg.params.type, text }) && fn({ type: msg.params.type, text }));
    }
  });

  const send = (method, params = {}, useSession = true) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, ...(useSession && sessionId ? { sessionId } : {}) }));
  });

  // Attach to a page target so Runtime and Page events arrive.
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' }, false);
  ({ sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }, false));
  await send('Page.enable');
  await send('Runtime.enable');

  return {
    on(event, fn) { if (listeners[event]) listeners[event].push(fn); },

    async goto(url) {
      await send('Page.navigate', { url });
      // Wait for the load event, then settle. Playwright's networkidle is not
      // worth reimplementing: the caller already waits afterwards.
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 15000);
        const onMessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.method === 'Page.loadEventFired') {
            clearTimeout(timer);
            socket.removeEventListener('message', onMessage);
            resolve();
          }
        };
        socket.addEventListener('message', onMessage);
      });
    },

    /** Run a function in the page. `arg` is passed through as JSON. */
    /**
     * Run a script in every document this page loads, before its own scripts.
     *
     * Needed for stubbing an endpoint: `evaluate` after `goto` runs once the
     * app has already mounted and fired its requests, so a stub installed
     * there answers nothing. The render check's four Conflict pages were
     * reported as skipped for exactly that reason.
     */
    async onNewDocument(source) {
      await send('Page.addScriptToEvaluateOnNewDocument', { source });
    },

    async evaluate(fn, arg) {
      const expression = `(${fn.toString()})(${JSON.stringify(arg ?? null)})`;
      const res = await send('Runtime.evaluate', {
        expression, returnByValue: true, awaitPromise: true,
      });
      if (res.exceptionDetails) {
        throw new Error(res.exceptionDetails.exception?.description || 'evaluate failed');
      }
      return res.result?.value;
    },

    wait(ms) { return new Promise((r) => setTimeout(r, ms)); },

    /**
     * A PNG of the page, base64.
     *
     * `fullPage` captures beyond the fold by asking Chrome for the document's
     * own height, which is what a design review needs: the fold is not where
     * the page ends.
     */
    async screenshot({ fullPage = false } = {}) {
      let clip;
      if (fullPage) {
        const size = await send('Runtime.evaluate', {
          expression: `JSON.stringify({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight })`,
          returnByValue: true,
        });
        const { w, h } = JSON.parse(size.result.value);
        clip = { x: 0, y: 0, width: w, height: Math.min(h, 20000), scale: 1 };
      }
      const shot = await send('Page.captureScreenshot', {
        format: 'png',
        ...(clip ? { clip, captureBeyondViewport: true } : {}),
      });
      return shot.data;
    },

    async close() {
      try { socket.close(); } catch { /* already gone */ }
      try { proc.kill(); } catch { /* already gone */ }
      try { rmSync(profile, { recursive: true, force: true }); } catch { /* best effort */ }
    },
  };
}
