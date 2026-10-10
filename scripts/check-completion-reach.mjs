/**
 * Fails the build when finishing an exercise does not reach the one thing that
 * happens at the moment a couple's results open.
 *
 * ── WHAT HAPPENED ──────────────────────────────────────────────────────────
 * Two things fire when the last exercise is finished: the partner is told, and
 * the workbook is built. Both lived inside api/save-exercise.js, which is how
 * the APP finishes an exercise. The website does not go through it: it writes
 * the answers straight to Supabase with the user's own session and only falls
 * back to that endpoint when RLS blocks the write.
 *
 * So for every couple who finished on the website, the partner heard nothing.
 * The workbook was built by two other blocks in src/App.jsx instead, and they
 * sent different payloads: one built the whole thing, the other sent names, two
 * score sets and a couple type, with none of the expectations or
 * responsibilities data in it. Which document a couple got depended on which
 * block ran last. Both needed the buyer's order in that browser's storage, so
 * an invited partner finishing on their own laptop built nothing, and a couple
 * who only ever open the app built nothing ever.
 *
 * Ellie: "make sure workbook begins generating once results are complete."
 *
 * ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
 * 1. The trigger fires at the transition and nowhere else. Run, not read:
 *    three couples, one not ready, one that just became ready, one that was
 *    already ready, and the alert and the build happen only in the middle one.
 * 2. Both ways of finishing reach it. The app's endpoint calls it directly;
 *    every exercise the website can finish is followed by the call that tells
 *    the server, and that call is not sitting behind a constant.
 * 3. Nothing else builds a workbook automatically. A surface may build one
 *    because a reader asked for it. A surface that builds one on its own is a
 *    second producer of a file that has one name.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ────────────────────────────────────
 * Whether the build SUCCEEDS. That is the render service's business and it is
 * allowed to be down; what must not happen is nobody asking it.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import { EXERCISES } from '../api/_exercises.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
/* Comments are not code. Mine name the very things this gate looks for. */
const code = (f) => read(f)
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const problems = [];

// ── 1. It fires at the transition, and only there ─────────────────────────
{
  process.env.SUPABASE_URL = 'https://stub.invalid';
  process.env.SUPABASE_SERVICE_KEY = 'stub-key';
  process.env.ADMIN_API_KEY = 'stub-admin';

  const { announceCompletion } = await import('../api/_lib/completion.js');

  /* A couple who own everything, so no capability can quietly excuse a miss. */
  const OWNS = {
    pkg: 'premium',
    addon_reflection: 'yes', addon_intimacy: 'yes', addon_conflict: 'yes',
    addon_budget: 'yes', addon_checklist: 'yes', addon_workbook: 'digital',
    entitlements: null,
  };
  const answered = Object.fromEntries(EXERCISES.map((e) => [
    e.column, e.shape === 'record' ? { answers: { a: 1 }, completedAt: 1 } : { q1: 3 },
  ]));
  const profile = (id, partner, done) => ({
    id, name: id === 'A' ? 'Avery' : 'Blake', pronouns: 'she/her',
    partner_pronouns: 'he/him', partner_profile_id: partner,
    ...OWNS,
    ...Object.fromEntries(EXERCISES.map((e) => [e.column, done.includes(e.key) ? answered[e.column] : null])),
  });

  const allKeys = EXERCISES.map((e) => e.key);
  /**
   * `told` and `onFile` are the two idempotency guards, tested rather than
   * assumed. The transition test alone cannot stop a retake re-announcing: a
   * couple who are complete and re-answer Communication look, for a moment,
   * exactly like a couple who have just finished it for the first time. What
   * actually stops it is the duplicate rule inside recordNotification and the
   * question makeWorkbook asks the couple's folder, and both of those are
   * easy to lose in a refactor while every other test still passes.
   */
  const cases = [
    { what: 'still waiting on one exercise',
      mineDone: allKeys, theirsDone: allKeys.filter((k) => k !== 'conflict'),
      exerciseKey: 'ex1', alert: false, build: false },
    { what: 'the last one outstanding',
      mineDone: allKeys, theirsDone: allKeys, exerciseKey: 'conflict', alert: true, build: true },
    { what: 'a retake, with the partner already told',
      mineDone: allKeys, theirsDone: allKeys, exerciseKey: 'ex1',
      told: true, alert: false, build: true },
    { what: 'a retake, with the workbook already on file',
      mineDone: allKeys, theirsDone: allKeys, exerciseKey: 'ex1',
      onFile: true, alert: true, build: false },
  ];

  for (const { what, mineDone, theirsDone, exerciseKey, alert: wantAlert, build: wantBuild,
               told = false, onFile = false } of cases) {
    const alerts = [];
    const builds = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url, opts = {}) => {
      const u = String(url);
      if (/\/rest\/v1\/notifications/.test(u) && (opts.method || 'GET') === 'POST') {
        alerts.push(JSON.parse(opts.body));
        return new Response('{}', { status: 201 });
      }
      if (/\/rest\/v1\/notifications/.test(u)) {
        /* What the person has already been sent, which is what the duplicate
           rule reads. An hour ago, so inside its day-long window. */
        return new Response(JSON.stringify(told ? [{
          kind: 'partner_finished', subject_id: 'A',
          created_at: new Date(Date.now() - 3600e3).toISOString(),
        }] : []), { status: 200 });
      }
      if (/store-workbook-pdf/.test(u)) { builds.push(opts.body); return new Response('{}', { status: 200 }); }
      if (/\/rest\/v1\/orders/.test(u)) {
        /* An order number is what lets the folder be looked at at all. */
        return new Response(JSON.stringify(onFile ? [{ order_num: 'A-1001' }] : []), { status: 200 });
      }
      if (/\/storage\/v1\/object\/list\/workbooks/.test(u)) {
        return new Response(JSON.stringify([{ name: 'Attune_Workbook.pdf' }]), { status: 200 });
      }
      if (/\/storage\/v1\/object\/sign\//.test(u)) {
        return new Response(JSON.stringify({ signedURL: '/storage/v1/signed/x.pdf' }), { status: 200 });
      }
      return new Response('[]', { status: 200 });
    };
    const rows = { A: profile('A', 'B', mineDone), B: profile('B', 'A', theirsDone) };
    const admin = {
      from: () => ({
        select: () => ({
          eq: (_c, id) => ({ maybeSingle: async () => ({ data: rows[id] || null }) }),
        }),
      }),
    };
    try {
      await announceCompletion({ admin, userId: 'A', exerciseKey });
    } catch (e) {
      problems.push(`announceCompletion threw on "${what}": ${e?.message}`);
    }
    globalThis.fetch = realFetch;

    const fired = alerts.length > 0;
    const built = builds.length > 0;
    if (wantAlert && !fired) {
      problems.push(`${what}: the partner is not told. That is the only moment anything`
        + ' announces results, so nobody is ever told.');
    }
    if (wantBuild && !built) {
      problems.push(`${what}: no workbook build is started. Ellie asked for the workbook to`
        + ' begin generating once results are complete, and this is where that happens.');
    }
    if (!wantAlert && fired) {
      problems.push(`${what}: the partner is told anyway. Editing an answer months later`
        + ' re-announces results that have been open all along.');
    }
    if (!wantBuild && built) {
      problems.push(`${what}: a workbook build is started anyway, which is a cold start and`
        + ' forty seconds of a paid render service for nothing.');
    }
    if (wantAlert && fired && alerts[0]?.owner_id !== 'B') {
      problems.push(`${what}: the alert went to ${alerts[0]?.owner_id} rather than the partner.`
        + ' The person holding the phone already has the card on their home screen.');
    }
  }
}

// ── 2. Both ways of finishing reach it ────────────────────────────────────
{
  const saveEx = code('api/save-exercise.js');
  if (!/announceCompletion\s*\(/.test(saveEx)) {
    problems.push('api/save-exercise.js does not call announceCompletion, so an exercise'
      + ' finished in the app announces nothing and builds nothing.');
  }

  const site = code('src/App.jsx');
  /* Every call, with the key it passes, and the line it sits on. */
  const calls = [...site.matchAll(/notifyCompleted\(\s*([^)]*)\)/g)]
    .map((m) => ({ arg: m[1].trim(), at: m.index }));
  if (!calls.length) {
    problems.push('nothing in src/App.jsx tells the server an exercise was finished.'
      + ' The website saves answers itself, so without this the moment a couple becomes'
      + ' complete passes unobserved.');
  }
  const lineOf = (i) => site.slice(0, i).split('\n').length;
  const lines = site.split('\n');
  for (const c of calls) {
    /* A call behind a constant is not a call. check-ab-scale found this shape
       first and CLAUDE.md records five recurrences since. */
    const line = lines[lineOf(c.at) - 1] || '';
    if (/\bfalse\b/.test(line)) {
      problems.push(`the notifyCompleted call on line ${lineOf(c.at)} is guarded by a constant,`
        + ' so it reads as present and never runs.');
    }
  }
  /* Covered: a literal 'key', or the template that covers the numbered three. */
  const literal = new Set(calls.map((c) => c.arg.replace(/^['"]|['"]$/g, '')));
  const hasTemplate = calls.some((c) => /^`ex\$\{/.test(c.arg));
  for (const e of EXERCISES) {
    const covered = literal.has(e.key) || (hasTemplate && /^ex\d$/.test(e.key));
    if (!covered) {
      problems.push(`finishing ${e.label} on the website tells the server nothing:`
        + ` no notifyCompleted call passes '${e.key}'.`);
    }
  }
}

// ── 3. One automatic producer ─────────────────────────────────────────────
{
  /**
   * Who may post to the builder, and why.
   *
   * An entry here is a promise that the call is behind a person asking for a
   * workbook, or that it IS the single automatic trigger. A new file appearing
   * in this list is the second-producer bug returning, which cost a couple
   * half a workbook once already.
   */
  const ALLOWED = {
    'api/_lib/completion.js': 'the one automatic trigger, at the moment results open',
    'src/workbook-download.js': 'the reader pressed download and there is no file yet',
    'attune-app/src/api/client.ts': 'the same, from the app',
  };
  /**
   * Naming the route is not calling it.
   *
   * Two files carry it as data rather than code: env-inventory records which
   * file reads which environment variable, and notification-triggers is a
   * generated record of where each alert is raised, which now includes the
   * file that announces a finished workbook. Both were flagged by this check
   * on the day they first mentioned the builder, which is the gate matching a
   * literal and being right about the letters and wrong about the meaning.
   */
  const NOT_A_CALLER = [
    'api/_lib/env-inventory.js',
    'api/_lib/notification-triggers.js',
  ];
  const SURFACES = ['src', 'public', 'api', 'attune-app/src'];
  const { readdirSync, statSync } = await import('fs');
  const found = [];
  for (const dir of SURFACES) {
    (function walk(d) {
      for (const f of readdirSync(join(ROOT, d))) {
        const rel = join(d, f);
        if (statSync(join(ROOT, rel)).isDirectory()) {
          if (/node_modules|\.expo|ios|android|dist/.test(rel)) continue;
          walk(rel);
          continue;
        }
        if (!/\.(js|jsx|ts|tsx|html)$/.test(f)) continue;
        if (rel === 'api/store-workbook-pdf.js') continue;   // it IS the builder
        if (NOT_A_CALLER.includes(rel)) continue;
        if (code(rel).includes('store-workbook-pdf')) found.push(rel);
      }
    })(dir);
  }
  for (const f of found) {
    if (ALLOWED[f]) continue;
    problems.push(`${f} posts to the workbook builder and is not one of the known producers.`
      + '\n      If a reader asked for it, add it to the list in this file with that reason.'
      + '\n      If it fires on its own, it is a second automatic producer: two of those sent'
      + '\n      two different payloads and the couple got whichever finished last.');
  }
  for (const f of Object.keys(ALLOWED)) {
    if (found.includes(f)) continue;
    problems.push(`${f} is listed here as a workbook producer and no longer builds one.`
      + ' Either it moved, in which case point this list at where it went, or the'
      + ' reason it was allowed is gone and the entry should be too.');
  }
}

if (problems.length) {
  console.error('[check-completion-reach] finishing an exercise does not reach the trigger:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log('[check-completion-reach] the trigger fires at the transition only, both surfaces'
  + ` reach it for all ${EXERCISES.length} exercises, and one producer builds a workbook.`);
