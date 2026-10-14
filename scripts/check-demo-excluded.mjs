#!/usr/bin/env node
/**
 * Demo accounts must not be counted in the admin.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie, having read that a quarter of the beta testers were non-binary:
 * "Alex and Sam were demos." Then: "Alex and sam and test profiles should not
 * be included in admin."
 *
 * So: no figure on any admin page counts a row marked `profiles.is_demo`, and
 * when the column is not there yet the page says it is counting them rather
 * than pretending otherwise.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * Two demo profiles were rows in `profiles` like anybody else, so they were
 * inside the couple types, the demographics, the engagement, the completion
 * funnel, the survey segments and all five CSV exports. With a handful of real
 * couples they were a large share of every number, and the one that surfaced
 * was a demographic breakdown that described us rather than customers.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * Two halves that cannot replace each other.
 *
 * PART 1 reads: every admin endpoint that touches `profiles` does it through
 * api/_lib/demo-accounts.js. That is the half that catches a NEW read added
 * next year, which no behavioural test can see because it does not know the
 * endpoint exists. It resolves the indirect spellings too: the table named in
 * a constant, a URL path, a template literal.
 *
 * PART 2 runs: three handlers are driven against a stubbed PostgREST holding
 * one demo row among three, and the demo must not appear in the answer. That
 * is the half that catches a filter that is present and wrong — applied to a
 * second query, applied after the rows are counted, or applied to the
 * demographics of a survey respondent while their answers stay in the charts.
 * Each handler is then driven again with the column missing, where it has to
 * answer 200 and say `demoFilterApplied: false`.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Not the product. A demo account signs in, answers exercises and reads its
 * results exactly like anybody else; `api/_lib/completion.js`, `push.js` and
 * `entitlements.js` read profiles on purpose and are out of scope. This is
 * about what the admin counts.
 *
 * Not which rows are demos. That is migration 082, which names them and
 * prints them back, and the column is editable afterwards. A gate cannot know
 * whether somebody called Alex is a customer.
 *
 * Not the two CSV exports' arithmetic, and not admin-explore's cube beyond its
 * profile read. Part 1 covers that they filter; what they then compute is
 * other gates' subject.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { parse } from '@babel/parser';
import { DIM_KEYS } from '../api/_type-engine.js';

const fails = [];
const notes = [];

/* ────────────────────────────────────────────────────────────────────────────
   PART 1 · Every admin read of profiles goes through the module
   ──────────────────────────────────────────────────────────────────────────── */

/* Endpoints are the top level of api/. The admin's are the admin-* ones plus
   orders.js, which checkAdminAuth also guards. Underscore files are libraries
   and api/_lib/demo-accounts.js is the module itself. */
const ADMIN_FILES = readdirSync('api')
  .filter((f) => f.endsWith('.js') && (f.startsWith('admin-') || f === 'orders.js'));

/** The module's three ways in. A read through any of them is filtered. */
const GATEWAYS = new Set(['selectProfiles', 'fetchProfiles', 'demoIds']);

/**
 * Finding the reads by asking Babel rather than by grepping.
 *
 * The first version of this part grepped for `from('profiles')` and reported
 * ONE read across every admin endpoint, with nine of them sitting in front of
 * it. It was telling the truth about the literal: once a read goes through
 * `selectProfiles(admin, (q) => q.select(...))` the table is named inside the
 * module and NOWHERE in the endpoint. The gate had been defeated by the fix it
 * was written for, which is this codebase's own lesson about a scanner and a
 * registry, pointed at a gate written an hour earlier.
 *
 * So a profiles read in an admin endpoint is now exactly a call to one of the
 * module's three functions, and that is what gets counted. The literal is only
 * looked for in order to forbid it: a table name outside a gateway call is a
 * read that went around the filter. The ancestor stack is what tells those
 * apart, through a destructured import, a hoisted query builder or a loop.
 */
function readsIn(src, file) {
  const ast = parse(src, {
    sourceType: 'module',
    plugins: ['topLevelAwait', 'importAssertions'],
    errorRecovery: true,
  });

  /** Reads that go through the module. */
  const viaModule = [];
  /** The table named anywhere else, which is a read around the filter. */
  const direct = [];

  /** 'profiles', `profiles?select=...`, '/rest/v1/profiles' — any spelling. */
  const namesTable = (node) => {
    if (node.type === 'StringLiteral') return /^profiles(\?|$)|rest\/v1\/profiles/.test(node.value);
    if (node.type === 'TemplateLiteral') {
      return node.quasis.some((q) => /^profiles(\?|$)|rest\/v1\/profiles/.test(q.value.cooked || ''));
    }
    return false;
  };

  const isGateway = (node) => node.type === 'CallExpression'
    && ((node.callee.type === 'Identifier' && GATEWAYS.has(node.callee.name))
      || (node.callee.type === 'MemberExpression'
        && node.callee.property.type === 'Identifier'
        && GATEWAYS.has(node.callee.property.name)));

  const line = (node) => (node.loc ? node.loc.start.line : 0);

  const walk = (node, stack) => {
    if (!node || typeof node.type !== 'string') return;
    if (isGateway(node)) {
      viaModule.push({ file, line: line(node), fn: node.callee.name || node.callee.property.name });
    }
    if (namesTable(node) && !stack.some(isGateway)) {
      direct.push({ file, line: line(node) });
    }
    const next = stack.concat([node]);
    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'leadingComments' || k === 'trailingComments') continue;
      const v = node[k];
      if (Array.isArray(v)) for (const c of v) walk(c, next);
      else if (v && typeof v === 'object' && typeof v.type === 'string') walk(v, next);
    }
  };
  walk(ast.program, []);
  return { direct, viaModule };
}

let filtered = 0;
for (const f of ADMIN_FILES) {
  const src = readFileSync(`api/${f}`, 'utf8');
  const { direct, viaModule } = readsIn(src, f);
  filtered += viaModule.length;
  if (direct.length) {
    fails.push(`api/${f} names the profiles table outside the module, at line${direct.length === 1 ? '' : 's'} ${direct.map((d) => d.line).join(', ')}. Every admin read of profiles goes through selectProfiles, fetchProfiles or demoIds, or Alex and Sam are back in the figures.`);
  }
  if (viaModule.length) {
    const how = [...new Set(viaModule.map((v) => v.fn))].join(', ');
    notes.push(`api/${f}: ${viaModule.length} profile read${viaModule.length === 1 ? '' : 's'} via ${how}`);
  }
}

/* Nine when this was written: admin-csv 5, admin-data 1, admin-explore 1,
   admin-typing 1, admin-survey 2 (the demographics and the demo ids),
   admin-engagement 1. Eleven in total. A number below nine means either a read
   was deleted, which is fine and the figure here should come down with it, or
   the walk has lost its subject, which is not. */
if (filtered < 9) {
  fails.push(`Found only ${filtered} filtered profile reads across the admin, and there were eleven when this was written. If reads were genuinely removed, lower this figure in the same commit. Otherwise the walk has lost its subject, and a gate that has lost its subject must not pass.`);
}

/* Comments explain bugs, and a comment quoting the shape being forbidden is
   not the shape. check-style-codes was failing a file for saying what went
   wrong; this one blanks them before any text match. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));
}

/* ────────────────────────────────────────────────────────────────────────────
   PART 2 · Drive the handlers
   ──────────────────────────────────────────────────────────────────────────── */

const ADMIN_SECRET = 'test-not-a-real-secret';
Object.assign(process.env, {
  SUPABASE_URL: 'https://example.invalid',
  SUPABASE_SERVICE_KEY: 'test-not-a-real-key',
  ADMIN_SECRET,
});

/** One answer set, so the engine has something to score. */
const answers = (v) => {
  const a = {};
  for (const ids of Object.values(DIM_KEYS)) for (const id of ids) a[id] = v;
  return a;
};

const REAL_A = {
  id: 'real-a', name: 'Lanae', email: 'lanae@example.com', invite_code: 'AAA111',
  partner_profile_id: 'real-b', joined_via_invite: false, pronouns: 'she/her',
  partner_pronouns: 'he/him', relationship_status: 'engaged', relationship_length: '1-3',
  children: 'no', signup_source: 'friend', pkg: 'premium', age_range: '25-34',
  ex1_answers: answers(4), ex2_answers: {}, ex3_answers: {}, created_at: '2026-01-01T00:00:00Z',
  is_demo: false,
};
const REAL_B = {
  ...REAL_A, id: 'real-b', name: 'Spencer', email: 'spencer@example.com',
  invite_code: null, partner_profile_id: 'real-a', joined_via_invite: true,
  pronouns: 'he/him', partner_pronouns: 'she/her', ex1_answers: answers(2),
};
/* The row that should never be counted. Its answers are the opposite end of
   every scale, so including it moves any average that touches it. */
const DEMO = {
  ...REAL_A, id: 'demo-alex', name: 'Alex', email: 'alex@demo.invalid',
  invite_code: 'ZZZ999', partner_profile_id: null, joined_via_invite: false,
  pronouns: 'they/them', partner_pronouns: 'they/them', relationship_status: 'married',
  relationship_length: '10+', ex1_answers: answers(1), is_demo: true,
};

const TABLES = {
  profiles: [REAL_A, REAL_B, DEMO],
  survey_responses: [
    { id: 'r-real', answers: { rating: 5 }, version: 'v', source: 'web', started_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-01T00:00:00Z', completed_at: '2026-02-01T00:00:00Z', couple_id: null, respondent_id: 'real-a', featured_question: null, featured_at: null },
    { id: 'r-demo', answers: { rating: 1 }, version: 'v', source: 'web', started_at: '2026-02-02T00:00:00Z', updated_at: '2026-02-02T00:00:00Z', completed_at: '2026-02-02T00:00:00Z', couple_id: null, respondent_id: 'demo-alex', featured_question: null, featured_at: null },
  ],
};

/** What the stub was asked for, so a missing filter is visible as well as wrong. */
let asked = [];
/** When true, any profiles request naming is_demo answers the way PostgREST does. */
let columnMissing = false;

/**
 * A PostgREST small enough to read and honest about what it does not do.
 * It applies the three filters these endpoints use on profiles and answers
 * every other table from the fixture unfiltered.
 */
function postgrest(rawUrl) {
  const u = new URL(rawUrl);
  const table = u.pathname.replace(/^.*\/rest\/v1\//, '').split('?')[0];
  asked.push(`${table}?${u.search.slice(1)}`);

  const params = [...u.searchParams.entries()].filter(([k]) => k !== 'select' && k !== 'order' && k !== 'limit');
  const names = params.map(([k]) => k);

  if (columnMissing && names.includes('is_demo')) {
    return new Response(JSON.stringify({
      code: '42703',
      message: 'column profiles.is_demo does not exist',
      details: null, hint: null,
    }), { status: 400, headers: { 'content-type': 'application/json' } });
  }

  let rows = (TABLES[table] || []).slice();
  for (const [k, v] of params) {
    if (v === 'not.is.true') rows = rows.filter((r) => r[k] !== true);
    else if (v === 'eq.true') rows = rows.filter((r) => r[k] === true);
    else if (v.startsWith('in.(')) {
      const set = new Set(v.slice(4, -1).split(',').map((x) => x.replace(/^"|"$/g, '')));
      rows = rows.filter((r) => set.has(String(r[k])));
    } else if (v.startsWith('eq.')) rows = rows.filter((r) => String(r[k]) === v.slice(3));
  }
  return new Response(JSON.stringify(rows), { status: 200, headers: { 'content-type': 'application/json' } });
}

globalThis.fetch = async (url) => {
  const s = String(url && url.url ? url.url : url);
  if (s.includes('/rest/v1/')) return postgrest(s);
  return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
};

const get = (path) => new Request(`https://www.attune-relationships.com${path}`, {
  headers: { authorization: `Bearer ${ADMIN_SECRET}` },
});

/** Does the answer carry the demo anywhere in it? */
const mentionsDemo = (payload) => {
  const text = JSON.stringify(payload);
  return /demo-alex|r-demo|"Alex"|alex@demo/.test(text);
};

const CASES = [
  {
    name: 'admin-typing',
    file: '../api/admin-typing.js',
    path: '/api/admin-typing',
    /* The individual count is the figure the non-binary bug showed up in. */
    expect: (p) => {
      const n = (p.individuals || []).length;
      if (n !== 2) return `counted ${n} individuals; the fixture holds 2 real people and 1 demo`;
      return null;
    },
  },
  {
    name: 'admin-survey',
    file: '../api/admin-survey.js',
    path: '/api/admin-survey',
    /* Both halves: the demo's answers go, not only their demographics. */
    expect: (p) => {
      const n = (p.responses || []).length;
      if (n !== 1) return `kept ${n} survey responses; one of the two is a demo's`;
      return null;
    },
  },
  {
    name: 'admin-data',
    file: '../api/admin-data.js',
    path: '/api/admin-data',
    expect: (p) => {
      const text = JSON.stringify(p.demographics || p);
      if (/they\/them/.test(text)) return 'the demographics still carry they/them, which only the demo answered';
      return null;
    },
  },
];

for (const c of CASES) {
  let mod;
  try { mod = await import(c.file); }
  catch (e) { fails.push(`${c.name}: could not be imported (${e.message}).`); continue; }
  const handler = mod.default;
  if (typeof handler !== 'function') { fails.push(`${c.name}: has no default handler to drive.`); continue; }

  /* With the column there. */
  asked = []; columnMissing = false;
  let res, payload;
  try { res = await handler(get(c.path)); payload = await res.json(); }
  catch (e) { fails.push(`${c.name}: threw (${e.message}).`); continue; }

  if (res.status !== 200) {
    fails.push(`${c.name}: answered ${res.status}, so nothing about the filter could be measured. ${JSON.stringify(payload).slice(0, 200)}`);
    continue;
  }
  const profileAsks = asked.filter((a) => a.startsWith('profiles?'));
  const unfiltered = profileAsks.filter((a) => !/is_demo/.test(a));
  if (!profileAsks.length) {
    fails.push(`${c.name}: never asked for profiles, so this case measures nothing.`);
  }
  if (unfiltered.length) {
    fails.push(`${c.name}: asked for profiles without naming is_demo: ${unfiltered.map((a) => a.slice(0, 90)).join(' | ')}`);
  }
  if (payload.demoFilterApplied !== true) {
    fails.push(`${c.name}: the column is there and it reported demoFilterApplied ${JSON.stringify(payload.demoFilterApplied)}. The page draws its banner off that.`);
  }
  if (mentionsDemo(payload)) {
    fails.push(`${c.name}: the demo account is somewhere in the answer.`);
  }
  const wrong = c.expect(payload);
  if (wrong) fails.push(`${c.name}: ${wrong}.`);
  if (!wrong) notes.push(`${c.name}: demo dropped, ${profileAsks.length} filtered profile read${profileAsks.length === 1 ? '' : 's'}`);

  /* And with it missing, which is every minute between a deploy and her
     running the migration. 400 on every admin page is not the answer. */
  asked = []; columnMissing = true;
  try { res = await handler(get(c.path)); payload = await res.json(); }
  catch (e) { fails.push(`${c.name}: threw with the column missing (${e.message}). That is the state between a deploy and migration 082.`); continue; }
  if (res.status !== 200) {
    fails.push(`${c.name}: answered ${res.status} with the column missing. The page has to keep working until migration 082 runs.`);
  } else if (payload.demoFilterApplied !== false) {
    fails.push(`${c.name}: the column is missing and it reported demoFilterApplied ${JSON.stringify(payload.demoFilterApplied)}, so the admin counts demos and says nothing.`);
  } else {
    notes.push(`${c.name}: column missing → 200 and demoFilterApplied false`);
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   PART 3 · The page says so
   ──────────────────────────────────────────────────────────────────────────── */

/* An endpoint that tells a page it counted demos, to a page that never reads
   it, is the same as not telling anybody. This is the direction
   check-unshown-answers covers for results: the server sends something and a
   surface never draws it. */

const admin = readFileSync('public/admin.html', 'utf8');
const adminBare = stripComments(admin);

/** The endpoints that send the flag, from the endpoints, not from a list. */
const SENDERS = ADMIN_FILES
  .filter((f) => /demoFilterApplied,/.test(stripComments(readFileSync(`api/${f}`, 'utf8'))))
  .map((f) => f.replace(/\.js$/, ''));

if (!SENDERS.length) {
  fails.push('No admin endpoint sends demoFilterApplied, so the page has nothing to read and this part measures nothing.');
}

/**
 * Every GET of a flag-sending endpoint, and the json() that reads it.
 *
 * Matching the name alone was not enough: the first version counted
 * noteDemoFilter calls against the number of senders, and deleting one of six
 * calls left five, which cleared a bar of five. So each read is found and
 * checked on its own, which is what "match the name with what follows it"
 * means here.
 */
let checked = 0;
for (const name of SENDERS) {
  const re = new RegExp(`/api/${name}\\b`, 'g');
  let seen = 0;
  for (const m of adminBare.matchAll(re)) {
    /* The window from the url to the end of the call that reads the body. */
    const after = adminBare.slice(m.index, m.index + 600);
    if (/method:\s*'POST'/.test(after.slice(0, 200))) continue;   // a write, no payload
    const json = after.match(/\w*\.?json\(\)/);
    if (!json) continue;
    seen += 1;
    checked += 1;
    /* To the end of the statement that reads the body, not to the json() call
       itself: fetchAdminData reads it in one .then and checks it in the next,
       and a window that stopped at the parenthesis called that a miss. */
    const semi = after.indexOf(';', json.index);
    const stmt = after.slice(0, semi < 0 ? json.index + json[0].length : semi);
    if (!/noteDemoFilter\s*\(/.test(stmt)) {
      const line = adminBare.slice(0, m.index).split('\n').length;
      fails.push(`admin.html line ${line} reads /api/${name} and does not pass the payload through noteDemoFilter, so that page draws figures that may count demos and says nothing.`);
    }
  }
  if (!seen) {
    fails.push(`admin.html never GETs /api/${name}, which sends demoFilterApplied. Either the page stopped reading that endpoint or this matcher has lost it.`);
  }
}
if (checked) notes.push(`admin.html: ${checked} payload read${checked === 1 ? '' : 's'} across ${SENDERS.length} endpoints, every one checked`);

/**
 * And the banner is drawn rather than merely named.
 *
 * `check-mark-artwork` asked whether a component carried four path strings and
 * passed with half a mark rendered. The class name appears in the stylesheet
 * and in the selector that protects it, so the question has to be what the
 * drawing function DOES: set that class on a node and put the node in the page.
 */
function bodyOf(src, decl) {
  const i = src.indexOf(decl);
  if (i < 0) return null;
  let depth = 0, j = src.indexOf('{', i);
  if (j < 0) return null;
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') depth += 1;
    else if (src[k] === '}') { depth -= 1; if (depth === 0) return src.slice(j, k + 1); }
  }
  return null;
}

const drawBody = bodyOf(adminBare, 'function syncDemoFilterBanner(');
if (!drawBody) {
  fails.push('public/admin.html has no syncDemoFilterBanner, so nothing draws the line when an endpoint says it counted demos. A gate that cannot find its subject must not pass.');
} else {
  if (!/className\s*=\s*['"][^'"]*demo-filter-banner/.test(drawBody)) {
    fails.push('syncDemoFilterBanner does not set the demo-filter-banner class on anything. The class in the stylesheet is not a banner on the page.');
  }
  if (!/(insertBefore|prepend|append|appendChild|insertAdjacentHTML)\s*\(/.test(drawBody)) {
    fails.push('syncDemoFilterBanner builds a banner and never puts it in the page.');
  }
  if (!/syncDemoFilterBanner\s*\(/.test(bodyOf(adminBare, 'function noteDemoFilter(') || '')) {
    fails.push('noteDemoFilter lowers the flag and never calls syncDemoFilterBanner, so the banner waits for something else to draw it.');
  }
  notes.push('admin.html: the banner is built, classed and inserted');
}

/* syncDemoBanner removes .demo-banner, and the filter line carries that class
   for its styling. It was removed by it for an afternoon. */
if (/querySelector\('\.demo-banner'\)/.test(adminBare)) {
  fails.push("syncDemoBanner selects '.demo-banner' plainly, which matches the demo-accounts line too and removes it as soon as a real order exists.");
}

/* ──────────────────────────────────────────────────────────────────────── */

for (const n of notes) console.log(`  ok  ${n}`);
if (fails.length) {
  console.error(`\ncheck-demo-excluded: ${fails.length} problem${fails.length === 1 ? '' : 's'}\n`);
  for (const f of fails) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\ncheck-demo-excluded: ok (${filtered} admin profile reads, every one through api/_lib/demo-accounts.js)`);
