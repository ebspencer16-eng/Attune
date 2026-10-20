/* READ ONLY probe. Drives the real Learn tab and reports what the insight is
   actually set at, because every gate near this one mounts a piece of the page
   rather than the page. */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { launch } from './_lib/browser.mjs';

const DIST = new URL('../dist/', import.meta.url).pathname;
const PORT = 4199;
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.woff2':'font/woff2' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = join(DIST, url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
  if (!existsSync(p) || !extname(p)) p = join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const WINDOWS = [[1280, 800], [1440, 900], [1280, 1200], [390, 844]];
for (const [w, h] of WINDOWS) {
  const page = await launch({ width: w, height: h });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?demo=1&pkg=premium&intimacy=1&conflict=1&view=home`);
    await new Promise((r) => setTimeout(r, 2500));
    // Reach the Learn tab the way a reader does.
    const clicked = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const b = btns.find((x) => (x.textContent || '').trim().toLowerCase() === 'learn');
      if (!b) return 'no learn tab';
      b.click(); return 'ok';
    });
    await new Promise((r) => setTimeout(r, 2500));
    const out = await page.evaluate(() => {
      const all = [...document.querySelectorAll('*')];
      const q = all.find((e) => {
        const cs = getComputedStyle(e);
        return cs.webkitLineClamp && cs.webkitLineClamp !== 'none' && (e.textContent || '').length > 60;
      });
      if (!q) return { found: false, sample: document.body.innerText.slice(0, 90).replace(/\n/g, ' | ') };
      const cs = getComputedStyle(q);
      return {
        found: true,
        clamp: cs.webkitLineClamp,
        fontSize: cs.fontSize,
        scrollH: q.scrollHeight,
        clientH: q.clientHeight,
        truncated: q.scrollHeight > q.clientHeight + 1,
        chars: (q.textContent || '').length,
      };
    });
    console.log(`${w}x${h}  click:${clicked}  ${JSON.stringify(out)}`);
  } finally { await page.close(); }
}
server.close();
