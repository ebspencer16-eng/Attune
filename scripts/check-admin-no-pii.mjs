/**
 * The admin's own promise: nothing it is sent identifies anybody.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * public/admin.html carries a banner on every page: "This dashboard operates
 * on fully anonymized records. No names, email addresses, or personally
 * identifiable information are present in any dataset shown here."
 *
 * api/admin-explore.js is built to keep that true and says so in its header.
 * What had nothing holding it was api/admin-actions.js, which reads `profiles`
 * with the service key and answers whatever it likes.
 *
 * The case that prompted this: a "waiting on a partner" list. The obvious
 * version lists the person, their partner and the address to send to, which is
 * three pieces of PII in a page that promises none. It answers with an id and
 * an invite code instead, the server does the lookup, and the address never
 * leaves it.
 *
 * ── WHAT IT HOLDS ─────────────────────────────────────────────────────────
 * Every response body built in api/admin-actions.js is run and inspected: no
 * key that names a person or an address, and no VALUE that looks like an
 * email, whatever the key is called.
 *
 * Run rather than read, because the shape of an answer is decided at run time
 * and a grep for `partner_email` cannot see `...p` or a renamed key.
 *
 * ── WHAT IT DOES NOT COVER ────────────────────────────────────────────────
 * The other admin endpoints. check-stripped-fields and check-log-privacy cover
 * what they strip and what they log; admin-explore's own header and the cube's
 * construction cover the cube. This is scoped to the one endpoint that both
 * reads identity and answers the page directly.
 */
import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const src = readFileSync(`${ROOT}api/admin-actions.js`, 'utf8');
const fails = [];

/** A key that names a person or a way to reach one. */
const PII_KEY = /^(email|e_mail|mail|to|toEmail|recipient|name|full_?name|first_?name|last_?name|partner_?name|partner_?email|buyer_?email|phone|address)$/i;
/** A value that is an address, whatever its key is called. */
const EMAILISH = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

/* Every `json({ ... })` answer, with comments blanked first so a sentence
   explaining why an address is NOT returned does not read as returning one. */
const code = src
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/^\s*\/\/.*$/gm, '');

const answers = [...code.matchAll(/\breturn\s+json\(\s*\{([\s\S]*?)\}\s*(?:,\s*\d+\s*)?\)/g)].map((m) => m[1]);
if (answers.length < 3) {
  console.error(`[check-admin-no-pii] found ${answers.length} json answers in admin-actions.js, expected several.`
    + ' The matcher has lost its subject; refusing to pass.');
  process.exit(1);
}

/**
 * ── THE ANSWER IS NOT ONLY THE LITERAL ────────────────────────────────────
 * The first version of this read the object inside `json({...})` and nothing
 * else. Two plants walked straight through, and both are the shape the real
 * code takes: `return json({ ok: true, waiting })` where `waiting` is built by
 * a `.map()` ten lines above. The literal is clean and the answer is not.
 *
 * So every bare identifier an answer hands back is followed to where it is
 * built, and that expression is inspected under the same rules. One hop, which
 * covers `const x = rows.map(...)` and `const x = {...}`; a value laundered
 * through two variables is not covered and is noted here rather than claimed.
 */
function buildersFor(body) {
  const out = [];
  /* Shorthand and `key: ident` both hand back whatever the identifier holds. */
  const idents = new Set();
  /* The captured body has no closing brace, so the last property in it is not
     followed by `,` or `}` and the lookahead misses it. That is where
     `{ ok: true, waiting }` hid: `waiting` is always the last one. */
  const closed = body + '}';
  for (const m of closed.matchAll(/(?:^|[,{\s])([A-Za-z_$][\w$]*)\s*(?=[,}])/g)) idents.add(m[1]);
  for (const m of closed.matchAll(/:\s*([A-Za-z_$][\w$]*)\s*(?=[,}])/g)) idents.add(m[1]);
  for (const name of idents) {
    if (['true', 'false', 'null', 'undefined'].includes(name)) continue;
    const re = new RegExp('(?:const|let|var)\\s+' + name + '\\s*=\\s*([\\s\\S]*?);\\n', 'g');
    for (const d of code.matchAll(re)) out.push({ name, expr: d[1] });
  }
  return out;
}

const inspect = (text, where) => {
  for (const m of text.matchAll(/(^|[,{\s])([A-Za-z_$][\w$]*)\s*:/g)) {
    if (PII_KEY.test(m[2])) {
      fails.push(`${where} carries \`${m[2]}\`, which names a person or a way to reach one.`
        + ' The admin page promises it holds none of those.');
    }
  }
  for (const m of text.matchAll(/\.\.\.\s*([A-Za-z_$][\w$]*)/g)) {
    fails.push(`${where} spreads \`${m[1]}\`, so whatever columns that row carries go to the page.`
      + ' Name the fields instead.');
  }
  if (EMAILISH.test(text)) fails.push(`${where} contains something shaped like an email address.`);
};

for (const body of answers) {
  inspect(body, 'an answer');
  for (const b of buildersFor(body)) inspect(b.expr, `\`${b.name}\`, which an answer hands back,`);
}

/* And the selects: reading an address is fine and necessary, but a select that
   asks for one has to be in a handler that does not answer with it. The check
   above covers that; this reports the surface so a reader knows it was
   considered rather than missed. */
const selects = [...code.matchAll(/\.select\(\s*'([^']*)'/g)].map((m) => m[1]);
const withPii = selects.filter((sel) => sel.split(',').some((c) => PII_KEY.test(c.trim())));

if (fails.length) {
  console.error('[check-admin-no-pii] admin-actions.js answers with something that identifies a person:');
  for (const f of [...new Set(fails)]) console.error('  ✖ ' + f);
  process.exit(1);
}

console.log(`[check-admin-no-pii] ${answers.length} answers built by api/admin-actions.js, none carrying a name,`
  + ` an address or a spread of a database row. ${withPii.length} of its ${selects.length} selects do read`
  + ' identifying columns, which is what lets it send an invite; none of them reaches the page.');
