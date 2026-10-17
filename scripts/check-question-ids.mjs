#!/usr/bin/env node
/**
 * Every name shaped like a question id resolves to a question.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * EXP_LIFE_KEYS in src/App.jsx named six categories and looked each one up as
 * `lq_<key>`. Five of the six ids did not exist. So five of six rows carried a
 * null partner answer and a meaningless alignment flag into the workbook,
 * which draws six rows of them, and it survived because every value it
 * produced is a valid value: a null answer and `aligned: false` is exactly
 * what an unanswered question looks like.
 *
 * check-life-keys-resolve came out of that and holds that one list. This is
 * the general form, over every question set and every surface, because the
 * next one of these will not be in a list called EXP_LIFE_KEYS.
 *
 * ── HOW A CANDIDATE IS RECOGNISED ─────────────────────────────────────────
 * Two matchers, because there are two ways to be nearly right, and each one
 * passed a plant the other caught:
 *
 *   a digit signature:  a8 is `^a[0-9]+$`, so a9 is a candidate
 *   a prefix:           lq_children gives `lq_`, so lq_money is a candidate
 *
 * Both are derived from the ids themselves rather than typed here, so a new
 * question set is covered the day it is added.
 *
 * Quoted literals AND property accesses, because `mine.a8` is how the code
 * actually reads an answer, and a scan of quoted strings alone walked past a
 * planted `mine.a9` twice.
 *
 * ── WHAT IS DELIBERATELY NOT A FINDING ────────────────────────────────────
 * The exercise keys, taken from the registry: `ex1` is shaped exactly like the
 * personality ids ex6, ex7 and ex8 and is not one of them. And a bare prefix,
 * which is a fragment being concatenated (`'iq_' + q.id`) rather than an id
 * that failed to resolve.
 */
const R = new URL('..', import.meta.url).pathname;
const { readdirSync, readFileSync, statSync } = await import('node:fs');
const { join } = await import('node:path');

const q = await import(R + 'api/_questions.js');
const a = await import(R + 'api/_anniversary-questions.js');
const i = await import(R + 'api/_intimacy-questions.js');
const c = await import(R + 'api/_conflict-questions.js');

const ids = new Map();   // id -> which set
const addAll = (arr, set) => (arr || []).forEach((x) => { if (x?.id) ids.set(x.id, set); });
addAll(q.PERSONALITY_QUESTIONS, 'PERSONALITY_QUESTIONS');
addAll(q.LIFE_QUESTIONS, 'LIFE_QUESTIONS');
addAll(q.RESPONSIBILITY_CATEGORIES, 'RESPONSIBILITY_CATEGORIES');
addAll(a.ANNIVERSARY_QUESTIONS, 'ANNIVERSARY_QUESTIONS');
addAll(i.INTIMACY_QUESTIONS, 'INTIMACY_QUESTIONS');
addAll(c.CONFLICT_QUESTIONS, 'CONFLICT_QUESTIONS');

/**
 * What a question id LOOKS like, derived from the ids rather than typed.
 *
 * A prefix list only catches lq_ and iq_, which leaves out en6, a8 and c0:
 * the first version of this checked 49 literals and was blind to two thirds of
 * the question sets. The signature is the id with its digits generalised, so
 * `en6` admits `en7` and `a8` admits `a9`, which is what a near miss looks
 * like.
 */
const signatures = new Map();   // signature source -> set name
for (const [id, set] of ids) {
  /* Escape first, generalise second. The other way round escapes the `+` the
     generalisation just inserted, giving ^a[0-9]\+$, which matches nothing: a
     plant of mine.a9 passed twice before this line was printed. */
  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, (m) => '\\' + m);
  const sig = `^${esc.replace(/[0-9]+/g, '[0-9]+')}$`;
  signatures.set(sig, set);
}
const SIGS = [...signatures].map(([src, set]) => [new RegExp(src), set]);

/**
 * And the prefixes, because a signature only generalises digits.
 *
 * `lq_children` gives the signature ^lq_children$, which says nothing about
 * `lq_money`: a plant of that walked through while the digit plant failed.
 * Two different ways for an id to be nearly right, so two matchers.
 */
const PREFIXES = new Map();
for (const [id, set] of ids) {
  const m = id.match(/^([a-z]+_)/);
  if (m) PREFIXES.set(m[1], set);
}


const PV = /^pv_/;   // the cross-view read of a personality question

/**
 * Names that are shaped like a question id and are not one.
 *
 * `ex1` is an exercise key, and the personality set really does contain ex6,
 * ex7 and ex8, so the shape cannot tell them apart. Taken from the registry
 * rather than typed, so a sixth exercise does not reopen this.
 */
const { EXERCISES } = await import(R + 'api/_exercises.js');
const NOT_QUESTIONS = new Set(EXERCISES.map((e) => e.key));
const files = [];
const walk = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (/node_modules|\.expo|dist|\.git/.test(p)) continue;
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (/\.(js|mjs|ts|tsx|jsx)$/.test(n)) files.push(p);
  }
};
walk(R + 'api'); walk(R + 'src'); walk(R + 'attune-app/src');

const findings = [];
const seen = [];
let literals = 0;
for (const f of files) {
  if (/_questions\.js$|_anniversary-questions\.js$|_conflict-questions\.js$|_intimacy-questions\.js$/.test(f)) continue;
  const src = readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));
  /* Quoted, and reached as a property. The first version read only quoted
     literals and walked straight past `mine.a8`, which is how the code
     actually reads an answer: a plant of `mine.a9` passed. */
  const sources = [
    ...src.matchAll(/['"`]([a-z][a-z0-9_]*)['"`]/g),
    ...src.matchAll(/\.([a-z][a-z0-9_]*)\b/g),
  ];
  for (const m of sources) {
    const lit = m[1];
    const bare = PV.test(lit) ? lit.slice(3) : lit;
    /* A bare prefix is a fragment being concatenated, `'iq_' + q.id`, not an
       id that failed to resolve. */
    if (PREFIXES.has(bare)) continue;
    const pre = bare.match(/^([a-z]+_)/)?.[1];
    const hit = SIGS.find(([re]) => re.test(bare))
      || (pre && PREFIXES.has(pre) ? [null, PREFIXES.get(pre)] : null);
    if (!hit) continue;
    literals += 1;
    seen.push(`${f.slice(R.length)}:${lit}`);
    if (ids.has(bare) || NOT_QUESTIONS.has(bare)) continue;
    const line = src.slice(0, m.index).split('\n').length;
    findings.push(`${f.slice(R.length)}:${line} names "${lit}", which looks like a ${hit[1]} id and is not one`);
  }
}
if (findings.length) {
  console.error('[check-question-ids] a name that looks like a question id does not resolve:');
  for (const x of findings) console.error(`  ${x}`);
  console.error('');
  console.error('Every value such a lookup produces is a valid value, which is why this is not');
  console.error('visible in the output: a null answer reads exactly like an unanswered question.');
  process.exit(1);
}

console.log(`[check-question-ids] ${literals} names shaped like a question id across`
  + ` ${new Set(seen.map((x) => x.split(':')[0])).size} files, all of them resolving to one of`
  + ` ${ids.size} questions in 6 sets.`);
