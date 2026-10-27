/**
 * Every static page loaded in a browser, and what its console says.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Reading a page finds a plausible script. Loading it finds the one that
 * throws. Nothing in `npm run check` opens most of these: the chrome gates
 * compare markup across pages and never ask whether the JavaScript on them
 * runs.
 *
 * ── WHAT IT CANNOT SEE, AND IT IS THE INTERESTING PART ────────────────────
 * A throw inside a try/catch. public/offerings.html called a function that
 * dereferenced four missing elements on every load, and the console was
 * silent because the call sat in `try { } catch(e) { }` with a comment saying
 * "elements may not all exist on every render". So a clean run here is worth
 * exactly what it says and no more: nothing reached the console.
 *
 * The harness itself is checked on every run, by loading a page that throws
 * on purpose. A console sweep that cannot see an error reports every page as
 * healthy, which is the most confident way to be wrong.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, extname } from 'node:path';
import { launch } from '../_lib/browser.mjs';

const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json',
  '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.woff2':'font/woff2', '.ico':'image/x-icon' };
const srv = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/home.html';
  if (!extname(p)) p += '.html';
  const f = join(process.cwd(), 'public', p);
  if (!existsSync(f)) { res.writeHead(404); res.end('not here'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'text/plain' });
  res.end(readFileSync(f));
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const PORT = srv.address().port;

const CANARY = 'public/_sweep-canary.html';
writeFileSync(CANARY, '<!doctype html><title>c</title><body>x</body><script>sweepCanaryUndefined();</script>');

/* Recursing on purpose. The seventeen In Practice pages live in
   public/practice/, and a walk that stops at the top level is the blindness
   that let their nav drift into offering /offerings twice under two labels
   with no Wedding Registry at all. */
const found = [];
(function walk(dir, prefix) {
  for (const e of readdirSync(join('public', dir), { withFileTypes: true })) {
    if (e.isDirectory()) { walk(join(dir, e.name), prefix + e.name + '/'); continue; }
    if (e.name.endsWith('.html') && !e.name.startsWith('_')) found.push(prefix + e.name);
  }
})('.', '');
const pages = ['_sweep-canary.html', ...found.sort()];
const page = await launch({ width: Number(process.env.W || 1280), height: 900 });
const errs = [];
page.on('console', (m) => { const t = (m && (m.text || m.message)) || String(m); if (!m || m.type === 'error' || m.level === 'error') errs.push(String(t).slice(0, 140)); });
page.on('pageerror', (e) => errs.push('UNCAUGHT: ' + String((e && (e.message || e.text)) || e).slice(0, 140)));

let canaryFired = false;
const bad = [];
for (const name of pages) {
  errs.length = 0;
  await page.goto(`http://127.0.0.1:${PORT}/${name}`);
  await new Promise((r) => setTimeout(r, 700));
  const text = await page.evaluate(() => document.body.innerText.trim().length);
  const seen = [...new Set(errs)];
  if (name === '_sweep-canary.html') { canaryFired = seen.length > 0; continue; }
  if (seen.length || text < 40) bad.push({ name, text, seen });
}
unlinkSync(CANARY);
srv.close();

console.log('[sweep-page-console]');
if (!canaryFired) {
  console.error('  The canary page did not report its error, so this sweep can see nothing. Refusing to pass.');
  process.exit(1);
}
console.log(`  ${pages.length - 1} pages loaded; the canary error was seen, so the harness works.`);
if (!bad.length) { console.log('  Every page rendered text and reached the console with nothing.'); process.exit(0); }
for (const b of bad) {
  console.log(`  ${b.name}  text:${b.text}`);
  for (const e of b.seen) console.log('      ' + e);
}
process.exit(0);
