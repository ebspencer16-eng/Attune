// Fails the build when an add-on the entitlement engine grants cannot reach
// the UI.
//
// The client rebuilds its order object in about a dozen places: on sign-in,
// on entitlement recompute, on partner inheritance, from a stored order, from
// an order row. Each one lists the add-ons explicitly.
//
// When the How You Fight add-on was added, every one of those sites was
// missed. The database flag was set, the entitlement engine returned
// addonConflict correctly, and the exercise still never appeared, because the
// object the UI reads was assembled without it. Nothing failed and nothing
// logged.
//
// This compares the add-on fields the shared entitlement engine returns
// against the fields the client carries, so a granted add-on cannot silently
// stop at the boundary again.

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const engine = readFileSync(new URL('../api/_lib/entitlements.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

// What computeEntitlements returns, read from its return statement rather than
// restated here.
const ret = engine.match(/return \{ comp: false[\s\S]*?\};/);
if (!ret) {
  console.error('[check-entitlement-flow] could not find the computeEntitlements return.');
  process.exit(1);
}
const granted = [...new Set([...ret[0].matchAll(/\b(addon[A-Z]\w*)/g)].map(m => m[1]))].sort();

// Every line in App.jsx that assigns an add-on into an object literal.
const lines = app.split('\n');
const assignLines = lines
  .map((l, i) => ({ n: i + 1, l }))
  .filter(({ l }) => /\baddon[A-Z]\w*:\s/.test(l));

// Group by the object being built: a run of consecutive assigning lines.
const blocks = [];
let current = null;
for (const { n, l } of assignLines) {
  if (current && n <= current.end + 2) { current.end = n; current.text += '\n' + l; }
  else { current = { start: n, end: n, text: l }; blocks.push(current); }
}

const problems = [];
let serverSites = 0;
for (const b of blocks) {
  const present = granted.filter(k => new RegExp(`\\b${k}\\b`).test(b.text));
  // A block mentioning several add-ons is building an order object. One
  // mentioning a single add-on is usually a targeted read, not a rebuild.
  if (present.length < 2) continue;
  const missing = granted.filter(k => !present.includes(k));
  if (missing.length) problems.push({ line: b.start, missing });
}

if (problems.length) {
  console.error('[check-entitlement-flow] add-ons the engine grants but the client drops:');
  for (const p of problems) console.error(`  src/App.jsx:${p.line}  missing: ${p.missing.join(', ')}`);
  console.error(`  engine grants: ${granted.join(', ')}`);
  console.error('Add the missing field, or a purchased add-on will never appear in the UI.');
  process.exit(1);
}

// ── The profile grant source, client vs server ─────────────────────────────
// Both build a synthetic order row from the profile's own add-on columns. They
// are separate copies of the same list, and they drifted: the client omitted
// addon_conflict and addon_reflection, so an invitee whose grant lives only on
// their profile, which is every Partner B, resolved differently depending on
// whether the client or the server did the computing.
const grabProfileGrant = (text) => {
  const i = text.indexOf('order_num: null, pkg_key: profile.pkg');
  if (i < 0) return null;
  const j = text.indexOf('created_at: null', i);
  return [...new Set([...text.slice(i, j).matchAll(/addon_[a-z]+/g)].map(m => m[0]))].sort();
};
/**
 * ── AND THE SERVER'S OWN ORDER OBJECTS ────────────────────────────────────
 * Everything above reads src/App.jsx, and its summary line said "carried
 * through 11 order-building sites" while a twelfth, on the server, dropped an
 * add-on entirely: `normalizeItem` in api/create-payment-intent.js had no
 * addonConflict field, so a $40 exercise fell out of the charge, the tax
 * lines, the Stripe metadata and the order row that grants it. The promo
 * path's own row write was missing the same field.
 *
 * Same rule, more files, rather than a second gate.
 *
 * ── WHAT COUNTS AS AN ORDER OBJECT ────────────────────────────────────────
 * One that names the package: `pkgKey` or `pkg_key`. The first version asked
 * only whether an object mentioned two add-ons and reported nine findings,
 * every one of them something else: a sample payload for the email preview, an
 * analytics projection, a tax line builder reading flags it bills separately.
 * A gate that matches too much is not the safe direction, so the subject is
 * the thing that decides what somebody bought.
 *
 * Rows use snake_case and code uses camelCase, so both spellings count.
 */
{
  const snake = (k) => k.replace(/([A-Z])/g, (m) => '_' + m.toLowerCase());
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) { if (!/node_modules/.test(name)) walk(full); continue; }
      if (/\.(js|mjs)$/.test(name)) files.push(full);
    }
  };
  walk(new URL('../api', import.meta.url).pathname);

  /** The object literal containing this position, by brace depth. */
  const enclosing = (src, at) => {
    let depth = 0, open = -1;
    for (let i = at; i >= 0; i -= 1) {
      if (src[i] === '}') depth += 1;
      else if (src[i] === '{') { if (!depth) { open = i; break; } depth -= 1; }
    }
    if (open < 0) return null;
    depth = 0;
    for (let i = open; i < src.length; i += 1) {
      if (src[i] === '{') depth += 1;
      else if (src[i] === '}') { depth -= 1; if (!depth) return { open, text: src.slice(open, i + 1) }; }
    }
    return null;
  };

  for (const file of files) {
    const src = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/(^|[^:])\/\/[^\n]*/g, (m, pre) => pre + ' '.repeat(m.length - pre.length));
    const seen = new Set();
    /* A sample payload for the email preview is not an order the product
       writes. api/_lib/email-samples.js exists to show Ellie what an order
       email looks like; which add-ons that pretend order carries is a copy
       decision, not an entitlement one. Named here rather than skipped
       silently. */
    if (/email-samples\.js$/.test(file)) continue;
    /* `pkgKey:` and the shorthand `pkgKey,`. The first version wanted the
       colon, and normalizeItem writes the shorthand, so a plant that deleted
       addonConflict from the one object this whole check exists for passed. */
    for (const m of src.matchAll(/\b(pkgKey|pkg_key)\s*[:,}]/g)) {
      const obj = enclosing(src, m.index);
      if (!obj || seen.has(obj.open)) continue;
      seen.add(obj.open);
      const present = granted.filter((k) => new RegExp(`\\b(${k}|${snake(k)})\\s*:`).test(obj.text));
      if (present.length < 2) continue;      // not an object that carries add-ons
      serverSites += 1;
      const missing = granted.filter((k) => !present.includes(k));
      if (missing.length) {
        problems.push({
          line: `api/${file.slice(file.indexOf('/api/') + 5)}:${src.slice(0, obj.open).split('\n').length}`,
          missing,
        });
      }
    }
  }
}

if (problems.length) {
  console.error('[check-entitlement-flow] add-ons the engine grants but something drops:');
  for (const p of problems) {
    console.error(`  ${typeof p.line === 'string' ? p.line : `src/App.jsx:${p.line}`}  missing: ${p.missing.join(', ')}`);
  }
  console.error(`  engine grants: ${granted.join(', ')}`);
  console.error('Add the missing field, or a purchased add-on never reaches the person who paid.');
  process.exit(1);
}

const clientGrant = grabProfileGrant(app);
const serverGrant = grabProfileGrant(engine);
if (clientGrant && serverGrant && clientGrant.join(',') !== serverGrant.join(',')) {
  console.error('[check-entitlement-flow] the profile grant source differs between client and server:');
  console.error(`  client: ${clientGrant.join(', ')}`);
  console.error(`  server: ${serverGrant.join(', ')}`);
  console.error('An account will resolve differently depending on which one computes it.');
  process.exit(1);
}

console.log(`[check-entitlement-flow] ${granted.length} add-ons carried through`
  + ` ${blocks.filter((b) => granted.filter((k) => b.text.includes(k)).length >= 2).length} order-building`
  + ` sites in src/App.jsx and ${serverSites} under api/, the ones that name a package.`);
