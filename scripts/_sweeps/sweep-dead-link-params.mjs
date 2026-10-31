#!/usr/bin/env node
/**
 * sweep-dead-link-params: an internal link whose query parameter or #anchor
 * the page it opens never reads.
 *
 * The A235 shape: the app's locked-tool sheet opened /offerings?add=workbook.
 * Nothing on /offerings read `add`, so the reader landed at the top of the
 * shop rather than on what they had tapped. The link looked deliberate and
 * did nothing.
 *
 * Method. Every string literal in src/, api/, attune-app/src and public/
 * that is an internal path (starts with "/" or `${SITE...}/`) with a "?" or
 * "#". For each, the page it names: public/<page>.html, or the React app for
 * /app and /. A parameter counts as read when the page's source contains
 * `get('<name>')` / `get("<name>")` or `<name>=` handling in a URLSearchParams
 * walk; an anchor counts when the page has id="<anchor>" or builds it. Leads,
 * not verdicts: a parameter read by a shared script the page loads is looked
 * for in every /_*.js and cart.js it includes.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';

const ROOT = new URL('../..', import.meta.url).pathname;
const files = [];
const walk = (d, test) => {
  for (const f of readdirSync(`${ROOT}${d}`)) {
    const p = `${d}/${f}`;
    if (f === 'node_modules' || f.startsWith('.')) continue;
    if (statSync(`${ROOT}${p}`).isDirectory()) walk(p, test);
    else if (test(f)) files.push(p);
  }
};
walk('src', (f) => /\.(jsx?|mjs)$/.test(f));
walk('api', (f) => /\.(js|mjs)$/.test(f));
walk('attune-app/src', (f) => /\.(tsx?)$/.test(f));
walk('public', (f) => /\.(html|js)$/.test(f));

const pageSource = new Map();
function sourceOf(path) {
  if (pageSource.has(path)) return pageSource.get(path);
  let src = null;
  if (path === '/app' || path === '/' || path === '') {
    src = readFileSync(`${ROOT}src/App.jsx`, 'utf8') + readFileSync(`${ROOT}index.html`, 'utf8');
  } else {
    for (const c of [`public${path}.html`, `public${path}/index.html`, `public${path}`]) {
      if (existsSync(`${ROOT}${c}`) && statSync(`${ROOT}${c}`).isFile()) { src = readFileSync(`${ROOT}${c}`, 'utf8'); break; }
    }
    if (src) {
      for (const m of src.matchAll(/<script[^>]+src=["'](\/[^"']+\.js)["']/g)) {
        if (existsSync(`${ROOT}public${m[1]}`)) src += readFileSync(`${ROOT}public${m[1]}`, 'utf8');
      }
    }
  }
  pageSource.set(path, src);
  return src;
}

const seen = new Set();
let links = 0, unresolved = 0;
const out = [];
for (const f of files) {
  const code = readFileSync(`${ROOT}${f}`, 'utf8');
  const re = /["'`](?:\$\{[A-Z_]*SITE[A-Z_]*\})?(\/[a-z][a-z0-9/_-]*)([?#][^"'`\s<>]*)["'`]/gi;
  let m;
  while ((m = re.exec(code))) {
    const [, path, rest] = m;
    if (path.startsWith('/api/') || path.startsWith('/rest/') || path.startsWith('/assets/')) continue;
    const key = `${path}${rest}`;
    links++;
    const src = sourceOf(path.replace(/\/$/, ''));
    if (src == null) { unresolved++; continue; }
    const [q, hash] = rest.split('#');
    const params = q.startsWith('?') ? [...new URLSearchParams(q.slice(1)).keys()].filter((k) => !k.includes('$')) : [];
    const problems = [];
    for (const p of params) {
      const read = new RegExp(`get\\(\\s*['"\`]${p}['"\`]\\s*\\)|\\.${p}\\b.*(search|query)|['"\`]${p}['"\`]\\s*[),:]`).test(src);
      if (!read) problems.push(`?${p} unread`);
    }
    if (hash && !hash.includes('$')) {
      const has = new RegExp(`id=["'{]?["']?${hash}["']|['"\`]${hash}['"\`]`).test(src);
      if (!has) problems.push(`#${hash} not on the page`);
    }
    if (problems.length && !seen.has(key + problems)) {
      seen.add(key + problems);
      const line = code.slice(0, m.index).split('\n').length;
      out.push(`${f}:${line}  ${key}  -> ${problems.join(', ')}`);
    }
  }
}
console.log(out.join('\n'));
console.log(`\n${links} internal links with a parameter or anchor; ${unresolved} name a page this could not find; ${out.length} leads.`);
