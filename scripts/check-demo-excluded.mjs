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
 * Both halves of that. The first shipped and covered every read of `profiles`,
 * which left every figure computed from a DIFFERENT table counting demos:
 * their notes, their article reads, their page time, their orders, their
 * invited partner, their survey answers. The Engagement page answered two
 * article readers where one of the two was Alex.
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
 * PART 2 runs: four handlers are driven against a stubbed PostgREST holding
 * one demo row among three, and the demo must not appear in the answer. That
 * is the half that catches a filter that is present and wrong: applied to a
 * second query, applied after the rows are counted, or applied to the
 * demographics of a survey respondent while their answers stay in the charts.
 * Each handler is then driven again with the column missing, where it has to
 * answer 200 and say `demoFilterApplied: false`.
 *
 * PART 2 also COUNTS. The demo owns a note, an article read, a page event, an
 * order and a survey answer in the fixture, and every figure built from them
 * is checked against the figure one real person produces. Looking for the
 * demo's id could never have caught this: a count is a number, and the number
 * was simply one too high. That is the lesson of this gate and it is the
 * reason the fixture gives the demo rows in five other tables.
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

/** The module's ways in. A read through any of them is filtered. */
const GATEWAYS = new Set(['selectProfiles', 'fetchProfiles', 'demoOwners']);

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
    /* Not `://`, or every url in the file loses its closing quote. */
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, pre) => pre + m.slice(pre.length).replace(/[^\n]/g, ' '));
}

/* ────────────────────────────────────────────────────────────────────────────
   PART 1b · And every OTHER table whose rows belong to a person
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * The tables where a row is somebody's.
 *
 * B61 filtered `profiles` and stopped, so every figure built from one of these
 * went on counting demos. The static half matters more here than it does for
 * `profiles`: a behavioural test cannot see a table nobody has read yet, and
 * the next count added to the admin will be read from one of these.
 *
 * The value is the column that names the owner, for the message only.
 */
const OWNED_TABLES = {
  notes: 'owner_id',
  note_tags: 'note_id, through the note',
  tags: 'owner_id',
  post_reads: 'owner_id',
  page_events: 'owner_id, or nobody for an anonymous visit',
  orders: 'user_id, or buyer_email when there was no account',
  partner_sessions: 'invite_code',
  survey_responses: 'respondent_id',
  survey_codes: 'response_id, through the response',
  workbooks: 'user_id',
};

/** The module's ways of holding those rows to one set of people. */
const OWNER_RULES = ['ownedBy', 'withoutDemoOrders', 'demoOwners'];

/**
 * Endpoints that read an owned table and are not analytics. Empty since
 * api/orders.js, the one customer-facing reader that sat here, was removed
 * (A201b: nothing had called it since 27 October).
 */
const NOT_ANALYTICS = {};

/**
 * ── WHAT THIS HALF PROVES, AND WHAT IT DOES NOT ───────────────────────────
 * It proves that every analytics endpoint reading one of those tables has the
 * module in scope. That is the tripwire for an endpoint added next year, which
 * no behavioural test can see because it does not know the endpoint exists.
 *
 * It does NOT prove that each individual read is filtered. A per-read trace
 * was written and thrown away: the reads in api/admin-engagement.js arrive
 * through `await Promise.all([...])` and are destructured twice before they
 * are used, so a one-hop trace landed on the array and called five filtered
 * reads unfiltered. Widening it would have meant either a dataflow pass or an
 * "unresolved, so pass" branch, and the second is the escape hatch this
 * codebase has already been bitten by.
 *
 * What covers that is PART 2, which counts. The demo owns a note, a tag, an
 * article read, a page event, an order, an invite session and a survey answer
 * in the fixture, and every figure built from them is checked against the
 * figure one real person produces. A read that slips past this half shows up
 * there as a number one too high.
 */
function ownedReads(src, file) {
  const ast = parse(src, { sourceType: 'module', plugins: ['topLevelAwait'], errorRecovery: true });
  const found = [];

  const tableOf = (node) => {
    const lit = (v) => {
      for (const t of Object.keys(OWNED_TABLES)) {
        if (v === t || v.startsWith(`${t}?`) || v.includes(`rest/v1/${t}?`) || v.endsWith(`rest/v1/${t}`)) return t;
      }
      return null;
    };
    if (node.type === 'StringLiteral') return lit(node.value);
    if (node.type === 'TemplateLiteral') {
      for (const q of node.quasis) { const t = lit(q.value.cooked || ''); if (t) return t; }
    }
    return null;
  };

  const walk = (node) => {
    if (!node || typeof node.type !== 'string') return;
    const table = tableOf(node);
    if (table) found.push({ file, table, line: node.loc ? node.loc.start.line : 0 });
    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'leadingComments' || k === 'trailingComments') continue;
      const v = node[k];
      if (Array.isArray(v)) for (const c of v) walk(c);
      else if (v && typeof v === 'object' && typeof v.type === 'string') walk(v);
    }
  };
  walk(ast.program);
  return found;
}

let ownedChecked = 0;
for (const f of ADMIN_FILES) {
  const src = readFileSync(`api/${f}`, 'utf8');
  const reads = ownedReads(src, f);
  if (!reads.length) continue;
  const tables = [...new Set(reads.map((r) => r.table))].sort();

  if (NOT_ANALYTICS[f]) {
    notes.push(`api/${f}: ${reads.length} read${reads.length === 1 ? '' : 's'} of ${tables.join(', ')}, out of scope (${NOT_ANALYTICS[f]})`);
    continue;
  }
  ownedChecked += reads.length;

  const rules = OWNER_RULES.filter((r) => new RegExp(`\\b${r}\\s*\\(`).test(stripComments(src)));
  if (!rules.length) {
    fails.push(`api/${f} reads ${tables.join(', ')}, whose rows belong to a person, and names none of ${OWNER_RULES.join(', ')}. Every figure built from those rows counts the demo accounts, which is the half of B61 that shipped broken. If the read genuinely cannot be filtered, say so in NOT_ANALYTICS with a reason somebody can check.`);
    continue;
  }
  notes.push(`api/${f}: ${reads.length} reads of ${tables.join(', ')}, holding them with ${rules.join(' / ')}`);
}

/* 18 when this was written: engagement 6, explore 4, data 2, survey 5,
   csv 5, less the one in orders.js which is out of scope. A number below this
   means either a read was removed, which is fine and this figure comes down
   with it, or the walk has lost its subject, which is not. */
if (ownedChecked < 18) {
  fails.push(`Found only ${ownedChecked} reads of an owned table across the analytics endpoints, and there were 22 when this was written. If reads were removed, lower this figure in the same commit; otherwise the walk has lost its subject, and a gate that has lost its subject must not pass.`);
}

/* An endpoint named as out of scope that no longer reads one is an excuse
   nobody rechecked. */
for (const [f, why] of Object.entries(NOT_ANALYTICS)) {
  let src = '';
  try { src = readFileSync(`api/${f}`, 'utf8'); }
  catch { fails.push(`NOT_ANALYTICS names api/${f}, which is not in the tree.`); continue; }
  if (!ownedReads(src, f).length) {
    fails.push(`NOT_ANALYTICS excuses api/${f} (${why}) and it reads none of those tables any more. Delete the entry: an excuse nobody rechecks is how a real gap hides.`);
  }
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
  /* ex2_answers used to be an empty object here, which was enough while
     completed_couples was counted off partner_sessions. That figure is
     counted off these profiles now, and a couple with no expectations
     answers is not a finished couple, so both sides carry a real one. */
  ex1_answers: answers(4), ex2_answers: { household__Cooking: 'Both of us' }, ex3_answers: {},
  created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
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
  invite_code: 'ZZZ999', partner_profile_id: 'demo-b', joined_via_invite: false,
  pronouns: 'they/them', partner_pronouns: 'they/them', relationship_status: 'married',
  relationship_length: '10+', ex1_answers: answers(1), is_demo: true,
};
/**
 * The demo's partner, so the demo is a COUPLE and not a lone row.
 *
 * completed_couples counts pairs now. With the demo unpaired, leaving it in
 * or taking it out gave the same 1, and a figure that cannot tell those apart
 * proves nothing about exclusion: the right answer has to be 1 where the
 * wrong answer is 2. Same shape as every other row in this fixture.
 */
const DEMO_B = {
  ...DEMO, id: 'demo-b', name: 'Riley', email: 'riley@demo.invalid',
  invite_code: null, partner_profile_id: 'demo-alex', joined_via_invite: true,
  ex1_answers: answers(1), is_demo: true,
};

/**
 * The demo owns a row in every table the admin counts.
 *
 * One real person and one demo in each, so every figure built from them has a
 * right answer of 1 and a wrong answer of 2. That is what the count cases
 * below compare, and it is the shape no name-matching check can see.
 */
/* Two days ago, not a fixed date: the engagement headlines compare the last
   30 days against the 30 before, so a hardcoded timestamp falls out of the
   window as the months pass and every count silently becomes zero. The first
   version of this fixture used 2026-03-01 and measured nothing. */
const NOW = new Date(Date.now() - 2 * 86400000).toISOString();
const TABLES = {
  profiles: [REAL_A, REAL_B, DEMO, DEMO_B],
  notes: [
    { id: 'n-real', owner_id: 'real-a', anchor_type: 'results', anchor_key: 'overview', visibility: 'private', kind: 'highlight', created_at: NOW },
    { id: 'n-demo', owner_id: 'demo-alex', anchor_type: 'results', anchor_key: 'overview', visibility: 'private', kind: 'highlight', created_at: NOW },
  ],
  tags: [
    { id: 't-real', owner_id: 'real-a', name: 'worth rereading', standard_key: null },
    { id: 't-demo', owner_id: 'demo-alex', name: 'worth rereading', standard_key: null },
  ],
  note_tags: [
    { note_id: 'n-real', tag_id: 't-real' },
    { note_id: 'n-demo', tag_id: 't-demo' },
  ],
  posts: [{ id: 'p1', title: 'A piece' }],
  post_reads: [
    { post_id: 'p1', owner_id: 'real-a', read_at: NOW },
    { post_id: 'p1', owner_id: 'demo-alex', read_at: NOW },
  ],
  page_events: [
    { kind: 'results', key: 'overview', ms: 1000, owner_id: 'real-a', created_at: NOW, surface: 'web' },
    { kind: 'results', key: 'overview', ms: 9000, owner_id: 'demo-alex', created_at: NOW, surface: 'web' },
    /* Nobody's, on purpose: an anonymous visit to a marketing page. These must
       survive every filter here, or every marketing figure undercounts.
       The kinds are the ones the page actually counts: `visit` for the headline
       and `page_time` for the time chart. The first version of this fixture
       said `kind: 'page'`, which nothing counts, and reported a working page as
       broken. */
    { kind: 'visit', key: '/offerings', ms: 0, owner_id: null, created_at: NOW, surface: 'web' },
    { kind: 'page_time', key: '/offerings', ms: 500, owner_id: null, created_at: NOW, surface: 'web' },
  ],
  orders: [
    { id: 'o-real', user_id: 'real-a', buyer_email: 'lanae@example.com', pkg_key: 'premium', total: 295, created_at: NOW },
    { id: 'o-demo', user_id: 'demo-alex', buyer_email: 'alex@demo.invalid', pkg_key: 'premium', total: 295, created_at: NOW },
    /* A buyer with no account, named only by an email nobody marked. Real. */
    { id: 'o-guest', user_id: null, buyer_email: 'guest@example.org', pkg_key: 'core', total: 99, created_at: NOW },
    /* The demo named by email alone, having bought before it had an account,
       and the demo named by id alone, having paid with a different address.
       An order is the one table with two ways to name its buyer, so a filter
       that knows one of them lets the other through. */
    { id: 'o-demo-email', user_id: null, buyer_email: 'ALEX@demo.invalid', pkg_key: 'core', total: 99, created_at: NOW },
    { id: 'o-demo-id', user_id: 'demo-alex', buyer_email: 'work-card@example.org', pkg_key: 'core', total: 99, created_at: NOW },
  ],
  partner_sessions: [
    { invite_code: 'AAA111', ex1_answers: answers(4), ex2_answers: { a: 1 } },
    { invite_code: 'ZZZ999', ex1_answers: answers(1), ex2_answers: { a: 1 } },
  ],
  beta_codes: [],
  workbooks: [],
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

/**
 * The figures, and what one real person's worth of them looks like.
 *
 * `expect` returns a complaint or null. Every count here has a right answer of
 * 1 or 2 and a wrong answer one higher, because the fixture gives the demo
 * exactly one row in every table beside each real one.
 */
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
      const text = JSON.stringify(p.profiles || p);
      if (/they\/them/.test(text)) return 'the demographics still carry they/them, which only the demo answered';
      /* Orders: the real buyer and the guest, not the demo's test order. */
      const ords = (p.orders || []).map((o) => o.id).sort();
      if (ords.join(',') !== 'o-guest,o-real') {
        return `the orders are ${JSON.stringify(ords)}; expected the real buyer and the account-less guest only. o-demo is the demo's by id, o-demo-email is the demo's by email alone, and a guest named by an unmarked email is a customer`;
      }
      /* Invite sessions: the demo's invited partner is not a couple. */
      const couples = p.profiles && p.profiles.completed_couples;
      if (couples !== 1) return `completed_couples is ${couples}; one of the two invite sessions belongs to the demo`;
      return null;
    },
  },
  {
    name: 'admin-engagement',
    file: '../api/admin-engagement.js',
    path: '/api/admin-engagement',
    /**
     * This is the case that only a count can make. Every figure here is built
     * from a table other than `profiles`, keyed to a person by owner_id, and
     * all of it was counted whole: the page answered two article readers where
     * one of the two was Alex.
     */
    expect: (p) => {
      const readers = p.headlines && p.headlines.articleReaders && p.headlines.articleReaders.value;
      if (readers !== 1) return `articleReaders is ${readers}; one of the two post_reads rows is the demo's`;
      const article = ((p.learning && p.learning.articles && p.learning.articles.rows) || [])[0];
      if (!article) return 'no article row came back, so the read count could not be measured';
      if (article.reads !== 1) return `the article shows ${article.reads} reads; one of the two is the demo's`;
      /* And the rows that belong to nobody have to survive. An anonymous visit
         to a marketing page is not a demo's, and dropping it would undercount
         every marketing figure. Two kinds, because the headline and the time
         chart count different ones. */
      const visits = p.headlines && p.headlines.siteVisits && p.headlines.siteVisits.value;
      if (visits !== 1) return `siteVisits is ${visits}; the anonymous visit was dropped, and an owner-less page view belongs to nobody by design`;
      const marketing = p.timePerPage && p.timePerPage.marketing;
      if (!marketing || !marketing.rows || !marketing.rows.length) {
        return 'marketing time has no rows, so the anonymous page_time event was dropped with the demos';
      }
      /* Every collection this page counts, from the line the page prints. One
         real person's note, one tag, one read, and three events: theirs plus
         the two that belong to nobody. */
      const want = { profiles: 2, notes: 1, tags: 1, articleReads: 1, events: 3 };
      const got = p.rowsRead || {};
      for (const [k, v] of Object.entries(want)) {
        if (got[k] !== v) return `it is counting ${got[k]} ${k} and should be counting ${v}: the demo owns one row in each of those tables`;
      }
      return null;
    },
  },
  {
    name: 'admin-explore',
    file: '../api/admin-explore.js',
    path: '/api/admin-explore',
    /* The cube. Its rows are people, its orders are orders, and its surveys
       were every respondent including the ones no figure is about. */
    expect: (p) => {
      if (p.count !== 2) return `the cube holds ${p.count} rows; the fixture has 2 real people and 1 demo`;
      const ords = (p.orders || []).length;
      if (ords !== 2) return `the cube holds ${ords} orders; three of the five belong to the demo`;
      const sv = (p.surveys || []).length;
      if (sv !== 1) return `the cube holds ${sv} survey rows; one of the two is the demo's`;
      return null;
    },
  },
  {
    name: 'admin-csv (survey export)',
    file: '../api/admin-csv.js',
    path: '/api/admin-csv?type=feedback',
    text: true,
    /* A CSV, not JSON: one header line and one row, because one of the two
       answers is the demo's. The export deliberately writes no id, so the
       only way to see the demo in it is to count the lines. */
    expect: (text) => {
      const lines = String(text).trim().split('\n').filter(Boolean);
      if (lines.length !== 2) return `the survey export has ${lines.length} lines (a header and ${lines.length - 1} answers); one of the two answers is the demo's`;
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

  /* A CSV download answers text, not JSON. Read whichever it sends. */
  const read = (r) => (c.text ? r.text() : r.json());

  /* With the column there. */
  asked = []; columnMissing = false;
  let res, payload;
  try { res = await handler(get(c.path)); payload = await read(res); }
  catch (e) { fails.push(`${c.name}: threw (${e.message}).`); continue; }

  if (res.status !== 200) {
    fails.push(`${c.name}: answered ${res.status}, so nothing about the filter could be measured. ${String(c.text ? payload : JSON.stringify(payload)).slice(0, 200)}`);
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
  /* A download has no payload to carry the flag; the pages that draw figures
     do, and Part 3 holds every one of those to reading it. */
  if (!c.text && payload.demoFilterApplied !== true) {
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
  try { res = await handler(get(c.path)); payload = await read(res); }
  catch (e) { fails.push(`${c.name}: threw with the column missing (${e.message}). That is the state between a deploy and migration 082.`); continue; }
  if (res.status !== 200) {
    fails.push(`${c.name}: answered ${res.status} with the column missing. The page has to keep working until migration 082 runs.`);
  } else if (c.text) {
    notes.push(`${c.name}: column missing → 200`);
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
       and a window that stopped at the parenthesis called that a miss.

       ── AND BACKWARD TO THE START OF THAT STATEMENT ─────────────────────
       The window used to begin at the url, so it could only see a wrapper
       written AFTER the fetch. `noteDemoFilter(await fetch(url).then(...))`
       is the same rule honoured in the other order, and this reported it as
       a miss: a matcher that knows one spelling, which is this repo's most
       common gate fault. Bounded at the nearest `;` or `{` before the url so
       it cannot reach into the previous statement and find somebody else's
       call. */
    const head = adminBare.slice(0, m.index);
    const from = Math.max(head.lastIndexOf(';'), head.lastIndexOf('{')) + 1;
    const before = adminBare.slice(from, m.index);
    const semi = after.indexOf(';', json.index);
    const stmt = before + after.slice(0, semi < 0 ? json.index + json[0].length : semi);
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
