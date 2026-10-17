/**
 * The whole chain, on the answers the real screens actually store.
 *
 * ── WHY A PROBE AND NOT A GATE ────────────────────────────────────────────
 * Ellie: "focus on making sure everything from account setup wires correctly
 * into exercise and that exercise results populate correctly."
 *
 * Every fixture in this repo that stands in for a finished couple was typed by
 * hand, and a hand-typed answer set is a guess about what the product stores.
 * The first version of this sweep invented one and spent two runs finding out
 * that its own guesses were wrong: numbers where a pick stores an option
 * string, no completedAt where a record carries one. Those were the harness
 * being wrong, not the product, which is how it always starts.
 *
 * So the answers come from check-exercise-flow, which drives the real screens
 * in a real browser and now writes what it stored to a file:
 *
 *   npx vite preview --port 4173
 *   EXERCISE_FLOW_DUMP=/tmp/ex.json BASE=http://localhost:4173 \
 *     node scripts/check-exercise-flow.mjs
 *   node scripts/probe-exercise-chain.mjs /tmp/ex.json
 *
 * It is a probe rather than a gate because it needs that server and that run.
 *
 * ── WHAT IT ASKS ──────────────────────────────────────────────────────────
 * Those answers, on both partners' profiles, through the real /api/results
 * with only the network stubbed. Then:
 *
 *   1. the gate opens at all, which is the chain working end to end;
 *   2. nothing a reader sees carries a brace token, "undefined" or "NaN";
 *   3. every section the couple owns arrives with something in it.
 *
 * Over four couples: identical answers (alike on both axes, which is when
 * role tokens have no name to resolve to), a shifted partner, and setup half
 * filled in both ways, because a missing name is the other way prose breaks.
 */
import { readFileSync } from 'node:fs';

process.env.SUPABASE_URL ||= 'https://stub.local';
process.env.SUPABASE_SERVICE_KEY ||= 'stub-service-key';
process.env.SUPABASE_ANON_KEY ||= 'stub-anon-key';

const dumpPath = process.argv[2];
if (!dumpPath) {
  console.error('probe-exercise-chain: give it the file EXERCISE_FLOW_DUMP wrote.');
  process.exit(2);
}
const dump = JSON.parse(readFileSync(dumpPath, 'utf8'));
const WANTED = ['exercise1', 'exercise2', 'exercise3', 'intimacy', 'conflict'];
const missing = WANTED.filter((k) => !dump[k]?.value);
if (missing.length) {
  console.error(`probe-exercise-chain: the dump has no ${missing.join(', ')}. Refusing to report.`);
  process.exit(2);
}

/** Partner B: the same shapes, different numbers, so the axes differ. */
const shift = (v) => {
  if (typeof v === 'number') return Math.max(1, Math.min(5, 6 - v));
  if (Array.isArray(v)) return [...v].reverse();
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shift(x)]));
  return v;
};

const ME = 'aaaaaaaa-0000-0000-0000-000000000001';
const PT = 'aaaaaaaa-0000-0000-0000-000000000002';

const CASES = [
  { label: 'identical answers, both partners', shiftB: false, names: true },
  { label: 'partner answered differently', shiftB: true, names: true },
  { label: 'nobody set a name', shiftB: true, names: false },
  { label: 'no pronouns anywhere', shiftB: true, names: true, pronouns: ['', ''] },
];

const ALLOWED_TOKEN = /^\{[UP]\}$/;
const BAD = /\bundefined\b|\bNaN\b|\[object Object\]/;
const problems = [];
const IDENTIFIER_KEYS = new Set(['key', 'id', 'categoryId', 'anchor', 'slug', 'column', 'dimension']);
let strings = 0;
let sections = 0;

for (const c of CASES) {
  const [pa, pb] = c.pronouns || ['she/her', 'he/him'];
  const mk = (id, partnerId, name, partnerName, pr, ppr, doShift) => ({
    id,
    name: c.names ? name : null,
    partner_name: c.names ? partnerName : null,
    pronouns: pr,
    partner_pronouns: ppr,
    partner_profile_id: partnerId,
    pkg: 'premium',
    addon_reflection: true, addon_intimacy: true, addon_conflict: true,
    addon_budget: true, addon_checklist: true, addon_workbook: 'digital',
    ex1_answers: doShift ? shift(dump.exercise1.value) : dump.exercise1.value,
    ex2_answers: dump.exercise2.value,
    ex3_answers: dump.exercise3.value,
    ex3_completed: true,
    intimacy_data: dump.intimacy.value,
    conflict_data: dump.conflict.value,
  });
  const me = mk(ME, PT, 'Ellie', 'Preston', pa, pb, false);
  const partner = mk(PT, ME, 'Preston', 'Ellie', pb, pa, c.shiftB);

  globalThis.fetch = async (url, opts) => {
    const u = String(url);
    const reply = (body, status = 200) => new Response(JSON.stringify(body), {
      status, headers: { 'content-type': 'application/json' },
    });
    if (u.includes('/auth/v1/user')) return reply({ id: ME });
    if (u.includes(`/rest/v1/profiles?id=eq.${ME}`)) return reply([me]);
    if (u.includes(`/rest/v1/profiles?id=eq.${PT}`)) return reply([partner]);
    if (u.includes('/rest/v1/couple_results')) return reply([]);
    if (opts && opts.method && opts.method !== 'GET') return reply([{}]);
    return reply([]);
  };

  const handler = (await import('../api/results.js')).default;
  let body;
  try {
    const res = await handler(new Request('https://local/api/results', {
      headers: { Authorization: 'Bearer stub-token' },
    }));
    body = await res.json();
  } catch (e) {
    problems.push(`${c.label}: /api/results threw: ${e.message}`);
    continue;
  }

  if (!body?.ok) { problems.push(`${c.label}: not ok — ${body?.error}`); continue; }
  if (!body.ready) {
    problems.push(`${c.label}: the results gate is shut (${body.reason}),`
      + ` waiting on ${(body.waitingOn || []).map((w) => `${w.key}/${w.who}`).join(', ') || 'nothing it named'}.`
      + ' Both partners answered every exercise through the real screens, so this is the chain'
      + ' from an exercise to a set of results being broken.');
    continue;
  }

  /**
   * Identifiers are not copy, and one of them carries a token on purpose.
   *
   * An Extended Family responsibility is stored under the key
   * `extended_family__Planning visits with {userName}'s family`: the token is
   * part of the identifier, so both partners' answers land in the same slot
   * whatever they are called. The row's `item` beside it is the substituted
   * sentence, and that is the half a reader sees. The first run of this probe
   * reported all four of those keys as leaks, four times over, which is this
   * measurement not knowing the difference between a name and a sentence.
   */
  const IDENTIFIER = /\.(key|id|categoryId|anchor|slug|column|dimension)$|\.ids\[/;

  const found = [];
  (function walk(v, path) {
    if (typeof v === 'string') {
      if (IDENTIFIER.test(path)) return;
      strings += 1;
      for (const m of v.matchAll(/\{[A-Za-z_][A-Za-z0-9_]*\}/g)) {
        if (!ALLOWED_TOKEN.test(m[0])) found.push(`${path} carries ${m[0]} :: ${v.slice(0, 70)}`);
      }
      if (BAD.test(v)) found.push(`${path} reads "${v.slice(0, 70)}"`);
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
  })(body, 'payload');

  /* Every section the couple owns arrives with something in it. */
  const content = body.results?.content || {};
  const expect = [
    ['coupleType', content.coupleType],
    ['dimensions', content.dimensions],
    ['axes', content.axes],
    ['names', content.names],
    ['commDomains', body.commDomains],
    ['commResponses', body.commResponses],
    ['commsPlan', body.commsPlan],
    ['expectations', body.expectations || body.results?.expectations],
    ['reflectionPlan', body.reflectionPlan],
    ['reflection', body.reflection],
    ['intimacy', body.intimacy],
    ['highlights', body.highlights],
    ['nav', body.nav],
    ['whatComesNext', body.whatComesNext],
  ];
  /* Conflict Patterns is deliberately NOT in that list. It never comes back
     from /api/results: a partner's conflict answers are the one thing this
     product keeps from the other partner, so they have their own endpoint
     with its own allowlist. Asking for it here reported it missing four times
     over, which is the probe not knowing a privacy rule. */
  for (const [name, v] of expect) {
    sections += 1;
    const empty = v == null || (Array.isArray(v) && !v.length)
      || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
    if (empty) found.push(`${name} is ${v == null ? String(v) : 'empty'} for a couple who owns it`);
  }

  for (const f of found.slice(0, 8)) problems.push(`${c.label}: ${f}`);
  if (found.length > 8) problems.push(`${c.label}: ...and ${found.length - 8} more`);
}

/**
 * ── AND CONFLICT PATTERNS, WHICH COMES FROM SOMEWHERE ELSE ───────────────
 * Its answers never appear in /api/results: what one partner does under
 * pressure is the one thing this product keeps from the other, so it has its
 * own endpoint with its own allowlist. Which also means the chain from that
 * exercise to its results is a separate chain, and nothing above would notice
 * if it broke.
 */
{
  const me = {
    id: ME, name: 'Ellie', partner_name: 'Preston', partner_profile_id: PT,
    pkg: 'premium', addon_conflict: true,
    conflict_data: dump.conflict.value,
  };
  const partner = { ...me, id: PT, name: 'Preston', partner_name: 'Ellie', partner_profile_id: ME };
  globalThis.fetch = async (url) => {
    const u = String(url);
    const reply = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });
    if (u.includes('/auth/v1/user')) return reply({ id: ME });
    if (u.includes(`id=eq.${ME}`)) return reply([me]);
    if (u.includes(`id=eq.${PT}`)) return reply([partner]);
    return reply([]);
  };
  const handler = (await import('../api/conflict-results.js')).default;
  let body;
  try {
    const res = await handler(new Request('https://local/api/conflict-results', {
      headers: { Authorization: 'Bearer stub-token' },
    }));
    body = await res.json();
  } catch (e) {
    problems.push(`conflict: /api/conflict-results threw: ${e.message}`);
  }
  if (body && !body.ready) {
    problems.push(`conflict: not ready (${body.reason}) for a couple who both finished it`
      + ' in the real exercise.');
  } else if (body) {
    sections += 3;
    if (!body.you || !Object.keys(body.you).length) problems.push('conflict: nothing came back about your own patterns');
    if (!body.partner) problems.push('conflict: nothing came back about your partner at all');
    if (!body.partnerFinished) problems.push('conflict: the partner finished and the payload says they did not');
    (function walk(v, path) {
      if (typeof v === 'string') {
        strings += 1;
        if (/\{[A-Za-z_][A-Za-z0-9_]*\}/.test(v) && !ALLOWED_TOKEN.test(v.match(/\{[A-Za-z_][A-Za-z0-9_]*\}/)[0])) {
          problems.push(`conflict: ${path} carries a token :: ${v.slice(0, 70)}`);
        }
        if (BAD.test(v)) problems.push(`conflict: ${path} reads "${v.slice(0, 70)}"`);
      } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) {
        if (IDENTIFIER_KEYS.has(k)) continue;
        walk(x, `${path}.${k}`);
      }
    })(body, 'conflict');
  }
}

console.log(`[probe-exercise-chain] ${CASES.length} couples built from answers the real screens`
  + ` stored, ${strings} strings and ${sections} section checks over their payloads.`);
if (problems.length) {
  console.error(`${problems.length} finding(s):`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log('  nothing unresolved, nothing undefined, and every owned section arrived.');
