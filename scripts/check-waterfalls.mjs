#!/usr/bin/env node
/**
 * No endpoint waits for an answer it did not need.
 *
 * ── WHAT ELLIE REPORTED, TWICE ────────────────────────────────────────────
 * "May just be because it's a demo app, but the app takes a long time to load
 * when I refresh. Please thoroughly scan and see how we can optimize this."
 *
 * And then, of the first fix: "Good progress, please check again, every page,
 * can we make it faster?"
 *
 * She was right to ask again. The first round measured the home screen alone,
 * which is the shape of mistake CLAUDE.md names: a single-file scan is a lead,
 * not a conclusion. Measuring all of them found /api/tool-data at seven round
 * trips, worse than the home screen had been, and /api/notes at five.
 *
 * ── WHAT IT WAS AND IS ────────────────────────────────────────────────────
 *   /api/home        7.6 -> 4    five questions that needed only the user id
 *   /api/tool-data     7 -> 3    the partner's name, the workbook's order and
 *                                the couple's tools, none of which depends on
 *                                either of the others
 *   /api/notes         5 -> 4    the reader's own notes do not need their
 *                                profile
 *
 * ── WHY THIS GATE AND NOT A COMMENT ───────────────────────────────────────
 * The regression is invisible. Moving a fetch below the thing it does not
 * depend on costs a round trip, breaks nothing, fails no test, and is what
 * every future edit will do by default: a new query goes at the bottom with
 * an await in front of it. The number here is what notices.
 *
 * ── HOW IT IS MEASURED ────────────────────────────────────────────────────
 * By running each handler. Every fetch sleeps for one TICK, and the depth is
 * the longest chain of calls where each one starts only after an earlier one
 * finished.
 *
 * The first version divided elapsed time by TICK, which read 4.6 one run and
 * 4.8 the next and failed its own baseline the first time it was planted
 * against. Wall clock measures the machine as well as the code. Counting
 * layers in the waterfall measures only the shape, and the shape is the
 * subject.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The app's own load: fonts, the bundle, the splash. Those are an Expo
 * question and this is the server's half, which is the half that was
 * measurable and the half that was wrong.
 *
 * Not how LONG a query takes. A missing index would not show up here and is
 * not what this is about.
 *
 * Not the write paths. They are measured for CALLS, because a read put in
 * front of every save is a real cost and one was added here by accident while
 * making the read faster, but not for depth: a save that reads then writes is
 * two round trips by nature.
 */

const TICK = 40;

/**
 * What each endpoint is allowed, and why it is allowed that.
 *
 * `deep` is the longest chain of calls that had to wait for each other, and
 * every one of them is a real wait on a real phone. The reason beside each is
 * the chain that cannot be flattened, so a future edit knows what it is
 * arguing with rather than just seeing a number go red.
 *
 * `calls` is the total, because a round trip saved by splitting one query into
 * three is not a round trip saved.
 */
const BUDGETS = [
  {
    name: '/api/home',
    file: '../api/home.js',
    path: '/api/home?tzOffset=420',
    deep: 3,
    calls: 7,
    /* Auth, both profiles in one read, then the beta lookup. Everything else
       is asked for beside the profiles. Three here rather than two because
       the auth call is still in the chain in this harness: there is no key
       set to be had, so verify-token falls back to asking the server. In
       production it is checked in memory. */
    chain: 'auth, both profiles, beta lookup',
  },
  {
    /**
     * The same endpoint for a couple who have finished, which is the deeper
     * case and the one most people are in. It reads the stored results as
     * well, and that read does not wait on the beta lookup or the other way
     * round: both need the partner's row and neither needs the other, so they
     * are started together.
     *
     * Three here rather than two because the auth call is still in the chain
     * in this harness: there is no key set to be had, so verify-token falls
     * back to asking the server. In production it is checked in memory and
     * this chain is two.
     */
    name: '/api/home (finished couple)',
    file: '../api/home.js',
    path: '/api/home?tzOffset=420',
    /* Named rather than referenced: the fixtures are declared below this
       table and a const cannot be read before it exists. */
    profile: 'finished',
    deep: 3,
    calls: 8,
    chain: 'auth, both profiles in one read, then the results and the beta lookup together',
  },
  {
    name: '/api/tool-data',
    file: '../api/tool-data.js',
    path: '/api/tool-data',
    deep: 3,
    calls: 5,
    /* Auth, the profile, and then the partner's name, the workbook's order
       and the couple's tools together. Was seven deep, one per question.
       A couple opening the tools for the FIRST time seeds a row, which is two
       more round trips exactly once; the stub gives them a row, because every
       visit after the first has one. */
    chain: 'auth, profile, then three at once',
  },
  {
    name: '/api/notes',
    file: '../api/notes.js',
    path: '/api/notes',
    deep: 4,
    calls: 5,
    /* Auth, the profile, the shared notes it keys, the tags on what came
       back. The reader's own notes run beside the profile. */
    chain: 'auth, profile, shared notes, their tags',
  },
  {
    /**
     * The same endpoint, asked the way the Notes tab asks it.
     *
     * Ellie: "only load the previous 3 marks in the tile on notes page... but
     * those click to see pages don't have to load when the user initially opens
     * their notes page."
     *
     * A limit takes three things away from the screen that it used to count out
     * of the whole list: how many of the partner's notes are unread, the days
     * the journal streak is made of, and how many marks carry each tag. Those
     * are three more queries and they all go out beside the rows, so the depth
     * is what matters and it is unchanged. Both paths are measured, because the
     * budget for one says nothing about the other: the default path is the
     * marking layer on a results page and it must stay at five.
     */
    name: '/api/notes?limit=3',
    file: '../api/notes.js',
    path: '/api/notes?limit=3',
    deep: 4,
    calls: 8,
    chain: 'auth, profile, then the rows and the three figures at once, then their tags',
  },
  {
    name: '/api/results',
    file: '../api/results.js',
    path: '/api/results',
    deep: 3,
    calls: 3,
    chain: 'auth, profile, the stored results row',
  },
  {
    name: '/api/posts',
    file: '../api/posts.js',
    path: '/api/posts',
    deep: 2,
    calls: 5,
    chain: 'auth, then everything at once',
  },
  {
    name: '/api/notifications',
    file: '../api/notifications.js',
    path: '/api/notifications',
    deep: 2,
    calls: 2,
    chain: 'auth, the rows',
  },
];

/**
 * Writes, measured for CALLS only.
 *
 * Making the notes list faster put a notes query in front of every save: the
 * promise was started before the action was known, so nine write paths paid
 * for one read path. Depth is not the measure here, because a save that reads
 * and then writes is two round trips by nature.
 */
const WRITES = [
  {
    name: '/api/notes save',
    file: '../api/notes.js',
    path: '/api/notes',
    method: 'POST',
    body: { action: 'save', body: 'a note' },
    calls: 3,
    why: 'auth, the profile, the insert. A read of the whole list is not part of saving one.',
  },
  {
    name: '/api/notes tags',
    file: '../api/notes.js',
    path: '/api/notes?action=tags',
    calls: 3,
    why: 'auth, the profile, the tags. The notes list is a different request.',
  },
];

process.env.SUPABASE_URL = 'https://example.invalid';
process.env.SUPABASE_SERVICE_KEY = 'test-not-a-real-key';
process.env.SUPABASE_ANON_KEY = 'test-not-a-real-key';

const PROFILE = {
  id: 'u1', name: 'Lanae', pronouns: 'she/her', partner_name: 'Spencer',
  partner_profile_id: 'u2', invite_code: 'AAA111', pkg: 'premium',
  profile_setup_complete: true, email: 'a@example.com',
  ex1_answers: { en4: 4 }, ex2_answers: { a: 1 }, ex3_answers: {},
};

/**
 * ── AND THE SAME COUPLE, FINISHED ─────────────────────────────────────────
 * The fixture above is a premium couple part-way through, so `resultsReady` is
 * false and /api/home never reads the stored results at all. Its deepest chain
 * was therefore never the one it measured: an established couple adds that
 * read, and an established couple is everybody who has been here a while.
 *
 * Core owns the two exercises both of them have answers for, so this one is
 * finished without inventing three more sets of answers.
 */
/* A core buyer: core with no order behind it is refused at home (A191). */
const FINISHED = { ...PROFILE, pkg: 'core', entitlements: { hasGrant: true } };

/** Which profile the stub answers with, set per case before driving. */
let profileFixture = PROFILE;

/** The other half of the couple, from whichever fixture is in play. */
const PARTNER = () => ({
  ...profileFixture, id: 'u2', name: 'Spencer', invite_code: null,
  email: 'b@example.com', partner_profile_id: 'u1',
});

let calls = [];
let t0 = 0;
globalThis.fetch = async (u, init) => {
  const url = String(u && u.url ? u.url : u);
  const rec = {
    url: url.replace('https://example.invalid', '').split('?')[0],
    method: (init && init.method) || 'GET',
    start: Date.now() - t0,
    end: 0,
  };
  /**
   * ── THE KEY SET IS NOT A ROUND TRIP PER REQUEST ─────────────────────────
   * api/_lib/verify-token.js fetches the project's public key once per server
   * instance and keeps it, which is how it takes the auth round trip OFF
   * every request. Counting it here would report the fix as a regression.
   *
   * Not counted, and not stubbed either: letting it fail is what makes every
   * endpoint fall back to the auth call these fixtures already answer, which
   * is the path under test. See the comment in verify-token.js about having
   * no key set and therefore no opinion.
   */
  if (!/\.well-known\/jwks/.test(url)) calls.push(rec);
  await new Promise((r) => setTimeout(r, TICK));
  rec.end = Date.now() - t0;
  const body = /\/auth\/v1\/user/.test(url) ? { id: 'u1', email: 'a@example.com' }
    : /profiles\?id=eq\.u1/.test(url) ? [profileFixture]
    : /profiles\?id=eq\.u2/.test(url) ? [PARTNER()]
    /**
     * Both rows at once.
     *
     * api/partner-sync.js writes partner_profile_id on both rows, so "me and
     * whoever points back at me" is one query rather than two. The stub has to
     * answer it that way or the endpoint falls back to the second read and the
     * saving is invisible here.
     */
    : /profiles\?or=/.test(url) ? [profileFixture, PARTNER()]
    /* A finished couple has a stored results row, which is the read the
       part-way fixture never reaches. */
    : /\/couple_results/.test(url) ? [{ couple_type: 'WX', results: { rankedGaps: [{ dim: 'conflict' }] } }]
    : /\/profiles/.test(url) ? [profileFixture]
    /* A couple who have opened the tools before, which is everybody after the
       first visit. With no row the endpoint seeds one, and that is two more
       round trips that happen exactly once in a couple's life. */
    : /\/couple_tools/.test(url) ? [{ couple_key: 'k', checklist_data: {}, budget_data: {}, editing: {} }]
    : /\/notes/.test(url) ? [{ id: 'n1', body: 'x', updated_at: '2026-10-01T00:00:00Z' }]
    : [];
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
};

/**
 * How many layers deep the waterfall is.
 *
 * A call's layer is one more than the deepest call that had already finished
 * when it started. Calls that overlap share a layer. Nothing here reads the
 * clock except the stub's own sleep, so the answer is the same on any machine.
 */
function depthOf(records) {
  const layer = [];
  let deepest = 0;
  records.forEach((c, i) => {
    let under = 0;
    records.slice(0, i).forEach((p, j) => {
      if (p.end <= c.start + 2) under = Math.max(under, layer[j]);
    });
    layer[i] = under + 1;
    deepest = Math.max(deepest, layer[i]);
  });
  return deepest;
}

const fails = [];
const notes = [];

async function drive({ file, path, method, body, profile }) {
  profileFixture = profile === 'finished' ? FINISHED : PROFILE;
  let mod;
  try { mod = await import(file); }
  catch (e) { return { error: `could not be imported (${e.message})` }; }
  if (typeof mod.default !== 'function') return { error: 'has no default handler to drive' };

  calls = [];
  t0 = Date.now();
  const init = { headers: { authorization: 'Bearer test-token' } };
  if (method) {
    init.method = method;
    init.headers['content-type'] = 'application/json';
    init.body = JSON.stringify(body || {});
  }
  let res;
  try { res = await mod.default(new Request(`https://www.attune-relationships.com${path}`, init)); }
  catch (e) { return { error: `threw (${e.message})` }; }
  return { res, records: calls.slice() };
}

for (const spec of BUDGETS) {
  const out = await drive(spec);
  if (out.error) { fails.push(`${spec.name} ${out.error}.`); continue; }
  const payload = await out.res.json().catch(() => null);
  if (out.res.status !== 200) {
    fails.push(`${spec.name} answered ${out.res.status} against the stub, so nothing about its shape could be measured. ${JSON.stringify(payload).slice(0, 140)}`);
    continue;
  }

  const depth = depthOf(out.records);
  if (out.records.length > spec.calls) {
    fails.push(`${spec.name} makes ${out.records.length} upstream calls and made ${spec.calls} when this was written. Every one is a round trip on somebody's phone. If the extra one is necessary, raise the figure here and say why.`);
  }
  if (depth > spec.deep) {
    const waterfall = out.records.map((c) => `      ${String(c.start).padStart(4)}ms -> ${String(c.end).padStart(4)}ms  ${c.url}`).join('\n');
    fails.push(`${spec.name} is ${depth} round trips deep and its floor is ${spec.deep} (${spec.chain}). `
      + `Something is being awaited above a question that does not depend on it:\n${waterfall}\n`
      + '      Anything that needs only what is already in hand can be started beside the read above it and awaited where its answer is used.');
  }
  if (!out.records.length) fails.push(`${spec.name} made no upstream calls, so this case measures nothing.`);
  if (depth <= spec.deep && out.records.length <= spec.calls) {
    const overlapped = out.records.filter((c, i) => out.records.slice(0, i).some((p) => c.start < p.end - 2)).length;
    notes.push(`${spec.name}: ${out.records.length} calls, ${depth} deep, ${overlapped} overlapping`);
    /**
     * The waterfall for one passing case, on request.
     *
     * It already prints for a FAILING one, which is the common need. This is
     * for the other half: /api/home was reported at four deep both before and
     * after a change that was supposed to flatten it, and the dump is what
     * showed why. The fixture was a couple part-way through, so the read being
     * flattened never happened at all. A number that does not move is a
     * question about what was measured.
     *
     *   WATERFALL_DUMP='/api/home (finished couple)' node scripts/check-waterfalls.mjs
     */
    if (process.env.WATERFALL_DUMP && spec.name === process.env.WATERFALL_DUMP) {
      for (const c of out.records) console.log(`      ${String(c.start).padStart(4)} -> ${String(c.end).padStart(4)}  ${c.url}`);
    }
  }
}

for (const spec of WRITES) {
  const out = await drive(spec);
  if (out.error) { fails.push(`${spec.name} ${out.error}.`); continue; }
  if (out.records.length > spec.calls) {
    fails.push(`${spec.name} makes ${out.records.length} upstream calls and should make ${spec.calls}: ${spec.why} `
      + `It asked for: ${out.records.map((c) => `${c.method} ${c.url}`).join(', ')}.`);
  } else {
    notes.push(`${spec.name}: ${out.records.length} calls`);
  }
}

/* And the home payload is still the whole payload. A handler that got faster
   by dropping a field would pass every check above. */
{
  const out = await drive(BUDGETS[0]);
  const payload = out.res ? await out.res.json().catch(() => null) : null;
  const ANSWERED = ['ok', 'firstName', 'exercises', 'research', 'word',
    'state', 'primary', 'owned', 'dailyPush'];
  const PRESENT = ['alerts', 'pickUp', 'partnerName', 'badges', 'storycardStyle'];
  /* Present AND answered. `in` was the first test and a plant that set
     `word: null` walked through it: the key was there and the tile would
     have drawn nothing. A field is what it holds. */
  const missing = ANSWERED.filter((k) => {
    const v = (payload || {})[k];
    return v === undefined || v === null
      || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);
  });
  if (missing.length) {
    fails.push(`/api/home is missing, or sends nothing for, ${missing.join(', ')}. Faster is not a fix if the screen has less to draw.`);
  }
  const absent = PRESENT.filter((k) => !(k in (payload || {})));
  if (absent.length) {
    fails.push(`/api/home no longer carries ${absent.join(', ')} at all. A key the app reads and the server stopped sending is a screen that draws nothing and says nothing.`);
  }
}

for (const n of notes) console.log(`  ok  ${n}`);
if (fails.length) {
  console.error(`\ncheck-waterfalls: ${fails.length} problem${fails.length === 1 ? '' : 's'}\n`);
  for (const f of fails) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\n[check-waterfalls] ${BUDGETS.length} endpoints, each within the round trips its own data depends on, and ${WRITES.length} write paths that read nothing extra.`);
