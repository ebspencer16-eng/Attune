#!/usr/bin/env node
/**
 * Put Ellie's copy-review decisions into the product (A187).
 *
 *   node scripts/_sweeps/copy-review/apply.mjs <dir of decision JSON files>
 *
 * The directory is what `read_db` writes with `out_dir`: one <id>.json per row
 * she has decided, {choice: proposed|edited|current, text}. A row already in
 * applied.json is skipped, so this can run as often as she works.
 *
 * Each decision replaces the row's `current`, which the audit copied verbatim
 * from the file, with her text, in every file that sentence appears in.
 *
 * ── THE ONE THING THAT CAN GO WRONG ───────────────────────────────────────
 * Her text goes inside a JavaScript string. An apostrophe typed into a
 * single-quoted string ends it. So the quote that encloses the sentence is
 * found in the source, and any of that quote in her text is escaped. Every
 * edited JS file is then parsed; one that no longer parses is put back and
 * the row reported, never committed broken.
 *
 * A sentence that is no longer in its file (an earlier edit overlapped it, or
 * the copy moved) is reported and left for a person.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { parse } from '@babel/parser';

const HERE = new URL('.', import.meta.url).pathname;
const ROOT = new URL('../../../', import.meta.url).pathname;
const dir = process.argv[2];
if (!dir || !existsSync(dir)) { console.error('usage: apply.mjs <decisions dir>'); process.exit(2); }

const rows = JSON.parse(readFileSync(`${HERE}rows.json`, 'utf8'));
const ledgerPath = `${HERE}applied.json`;
const ledger = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, 'utf8')) : {};

const files = [];
const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = `${d}/${e.name}`; if (e.isDirectory()) walk(p); else if (e.name.endsWith('.json')) files.push(p); } };
walk(dir);

/** The quote character enclosing position i of src, or null in JSX text. */
function enclosingQuote(src, i) {
  const lineStart = src.lastIndexOf('\n', i - 1) + 1;
  let q = null;
  for (let k = lineStart; k < i; k++) {
    const ch = src[k];
    if (src[k - 1] === '\\') continue;
    if (q) { if (ch === q) q = null; }
    else if (ch === '"' || ch === "'" || ch === '`') q = ch;
  }
  if (q) return q;
  // A template literal can open on an earlier line.
  const before = src.slice(0, i);
  const ticks = (before.match(/(?<!\\)`/g) || []).length;
  return ticks % 2 === 1 ? '`' : null;
}
const escapeFor = (text, q) => {
  if (!q) return text;
  let out = text.replace(/\\(?![\\'"`$n])/g, '\\\\');
  out = out.replace(new RegExp(`(?<!\\\\)${q === '`' ? '`' : q}`, 'g'), `\\${q}`);
  return out;
};

const done = [], skipped = [], failed = [];
const touched = new Set();
for (const f of files.sort()) {
  const id = f.split('/').pop().replace(/\.json$/, '');
  if (ledger[id]) continue;
  const d = JSON.parse(readFileSync(f, 'utf8'));
  const body = d.data || d;
  if (id.startsWith('b-')) { skipped.push(`${id}: a Behavior to try tile, built separately`); continue; }
  const row = rows[id];
  if (!row) { failed.push(`${id}: not a row in rows.json`); continue; }
  if (body.choice === 'current') { ledger[id] = { choice: 'current', at: Date.now() }; done.push(`${id}: kept as it is`); continue; }
  const text = String(body.text ?? '').trim();
  if (!text) { failed.push(`${id}: decided with no text`); continue; }
  if (text === row.current) { ledger[id] = { choice: body.choice, at: Date.now() }; done.push(`${id}: unchanged text`); continue; }

  const backups = {};
  let hits = 0, broke = null;
  for (const rel of row.files) {
    const path = `${ROOT}${rel}`;
    const src = readFileSync(path, 'utf8');
    let out = '', from = 0, n = 0, at;
    while ((at = src.indexOf(row.current, from)) !== -1) {
      out += src.slice(from, at) + escapeFor(text, enclosingQuote(src, at));
      from = at + row.current.length; n += 1;
    }
    if (!n) continue;
    out += src.slice(from);
    backups[path] = src;
    writeFileSync(path, out);
    hits += n;
    if (/\.(m?js|jsx|tsx?)$/.test(rel)) {
      try { parse(out, { sourceType: 'module', plugins: ['jsx', 'typescript'] }); }
      catch (e) { broke = `${rel} no longer parses (${e.message.split('\n')[0]})`; }
    }
  }
  if (broke || !hits) {
    for (const [p, src] of Object.entries(backups)) writeFileSync(p, src);
    failed.push(`${id}: ${broke || 'the live sentence is not in ' + row.files.join(', ') + ' any more'}`);
    continue;
  }
  for (const p of Object.keys(backups)) touched.add(p.replace(ROOT, ''));
  ledger[id] = { choice: body.choice, at: Date.now() };
  done.push(`${id}: ${hits} place(s)`);
}
writeFileSync(ledgerPath, JSON.stringify(ledger, null, 1) + '\n');
console.log(JSON.stringify({ applied: done, skipped, failed, touched: [...touched] }, null, 1));
