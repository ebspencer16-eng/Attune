// Every href in every email the catalogue renders, and where it would land.
import { readFileSync, existsSync } from 'node:fs';
import { EMAIL_CATALOGUE } from '../../api/_lib/email-catalogue.js';
import { SITE_URL } from '../../api/_lib/site.js';
const ROOT = new URL('../..', import.meta.url).pathname;
const vercel = JSON.parse(readFileSync(ROOT + 'vercel.json', 'utf8'));
const sources = [...(vercel.rewrites || []), ...(vercel.redirects || [])].map((r) => r.source);
const routeKnown = (path) => {
  const p = path.split('?')[0].split('#')[0];
  if (p.startsWith('/api/')) return existsSync(ROOT + 'api/' + p.slice(5) + '.js') ? 'api' : null;
  if (existsSync(ROOT + 'public' + p) && !p.endsWith('/')) return 'file';
  if (existsSync(ROOT + 'public' + p + '.html')) return 'html';
  if (existsSync(ROOT + 'public' + p + '/index.html')) return 'dir';
  for (const s of sources) {
    const re = new RegExp('^' + s.replace(/:[a-z]+\*/gi, '.*').replace(/:[a-z]+/gi, '[^/]+').replace(/\(\.\*\)/g, '.*') + '$');
    if (re.test(p)) return 'route ' + s;
  }
  return null;
};
let n = 0;
for (const [key, e] of Object.entries(EMAIL_CATALOGUE)) {
  let mail; try { mail = await e.build(e.sample); } catch (err) { console.log(key, 'THROWS', err.message); continue; }
  const hrefs = [...String(mail.html).matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  for (const h of hrefs) {
    n++;
    if (h.startsWith('mailto:')) { console.log(key.padEnd(24), 'mailto', h); continue; }
    if (!h.startsWith(SITE_URL)) { console.log(key.padEnd(24), 'EXTERNAL', h); continue; }
    const path = h.slice(SITE_URL.length) || '/';
    const where = routeKnown(path);
    console.log(key.padEnd(24), where ? 'ok   ' : 'NONE ', path.slice(0, 110), where && where.startsWith('route') ? '' : '');
  }
}
console.log('hrefs', n);
