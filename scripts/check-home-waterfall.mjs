#!/usr/bin/env node
/**
 * The home screen does not wait for answers it did not need.
 *
 * ── WHAT ELLIE REPORTED ───────────────────────────────────────────────────
 * "May just be because it's a demo app, but the app takes a long time to load
 * when I refresh. Please thoroughly scan and see how we can optimize this."
 *
 * ── WHAT IT WAS ───────────────────────────────────────────────────────────
 * Measured with every upstream call pegged at a fixed latency, so the wall
 * clock IS the critical path: /api/home made eight calls and was 7.6 round
 * trips deep. Only one pair overlapped. It asked for the profile, waited, the
 * partner, waited, the orders, waited, the newest article, waited, the notes,
 * waited, the alerts. Five of those questions needed nothing but the id that
 * came back with the token.
 *
 * It is 4.4 deep now, with the same eight calls and a byte-identical payload.
 *
 * ── WHY THIS GATE AND NOT A COMMENT ───────────────────────────────────────
 * The regression is invisible. Moving a fetch below the thing it does not
 * depend on costs a round trip, breaks nothing, fails no test, and is what
 * every future edit to this file will do by default: a new query goes at the
 * bottom with an await in front of it. The number here is what notices.
 *
 * ── HOW IT IS MEASURED ────────────────────────────────────────────────────
 * By running the handler. Every fetch sleeps for one TICK, and the depth is
 * the longest chain of calls where each starts only after an earlier one
 * finished. That is a property of the shape of the code and not of this
 * machine, which is why it is counted rather than timed.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The app's own load: fonts, the bundle, the splash. Those are an Expo
 * question and this is the server's half, which is the half that was
 * measurable and the half that was wrong.
 *
 * Not how LONG a query takes. A missing index would not show up here and is
 * not what this is about.
 */

const TICK = 40;

/** The floor the data model allows: auth, profile, partner, orders. */
const FLOOR = 4;
/**
 * What is allowed before this fails.
 *
 * The floor itself, because layers are whole numbers: there is no slack to
 * give and none to take. Every one of them is a real wait on a real phone,
 * and the difference between 4 and 8 is what Ellie reported.
 */
const MAX_DEPTH = FLOOR;

/** Eight when this was written. A ninth needs a reason, not a silent await. */
const MAX_CALLS = 8;

process.env.SUPABASE_URL = 'https://example.invalid';
process.env.SUPABASE_SERVICE_KEY = 'test-not-a-real-key';
process.env.SUPABASE_ANON_KEY = 'test-not-a-real-key';

const PROFILE = {
  id: 'u1', name: 'Lanae', pronouns: 'she/her', partner_name: 'Spencer',
  partner_profile_id: 'u2', invite_code: 'AAA111', pkg: 'premium',
  profile_setup_complete: true, email: 'a@example.com',
  ex1_answers: { en4: 4 }, ex2_answers: { a: 1 },
};

const calls = [];
let t0 = 0;
globalThis.fetch = async (u) => {
  const url = String(u);
  const rec = { url: url.replace('https://example.invalid', '').split('?')[0], start: Date.now() - t0, end: 0 };
  calls.push(rec);
  await new Promise((r) => setTimeout(r, TICK));
  rec.end = Date.now() - t0;
  const body = /\/auth\/v1\/user/.test(url) ? { id: 'u1', email: 'a@example.com' }
    : /profiles\?id=eq\.u1/.test(url) ? [PROFILE]
    : /profiles\?id=eq\.u2/.test(url) ? [{ ...PROFILE, id: 'u2', name: 'Spencer', invite_code: null, email: 'b@example.com' }]
    : [];
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
};

const { default: handler } = await import('../api/home.js');

t0 = Date.now();
const res = await handler(new Request('https://www.attune-relationships.com/api/home?tzOffset=420', {
  headers: { authorization: 'Bearer test-token' },
}));

/**
 * How many layers deep the waterfall is.
 *
 * A call's layer is one more than the deepest call that had already finished
 * when it started. Calls that overlap share a layer. Nothing here reads the
 * clock except the stub's own sleep, so the answer is the same on any machine.
 *
 * The first version divided elapsed time by TICK, which read 4.6 one run and
 * 4.8 the next and failed its own baseline the first time it was planted
 * against. Wall clock measures the machine as well as the code.
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
const payload = await res.json().catch(() => null);

const fails = [];

if (res.status !== 200) {
  fails.push(`/api/home answered ${res.status} against the stub, so nothing about its shape could be measured. ${JSON.stringify(payload).slice(0, 160)}`);
} else {
  const depth = depthOf(calls);

  if (calls.length > MAX_CALLS) {
    fails.push(`/api/home makes ${calls.length} upstream calls and made ${MAX_CALLS} when this was written. Every one of them is a round trip on somebody's phone. If the ninth is necessary, raise the figure here and say why.`);
  }

  if (depth > MAX_DEPTH) {
    const waterfall = calls.map((c) => `      ${String(c.start).padStart(4)}ms -> ${String(c.end).padStart(4)}ms  ${c.url}`).join('\n');
    fails.push(`/api/home is ${depth} round trips deep and the floor is ${FLOOR}: auth, then the profile, then the partner, then the beta lookup. `
      + `Something is being awaited above a question that does not depend on it. The waterfall:\n${waterfall}\n`
      + '      Anything that needs only the signed-in id can be asked for in the `early` block beside the profile read.');
  }

  /* And the answer is still the whole answer. A handler that got faster by
     dropping a field would pass every check above. */
  /**
   * Two lists, because null is a real answer for some of these.
   *
   * ANSWERED is what the screen cannot draw without: the greeting's name, the
   * exercises, the insight, the word, the state the engine computed. A null
   * there means a query was dropped.
   *
   * PRESENT is where null is the truth. pickUp is null for somebody with no
   * notes and no unread article, which is most people on their first day, and
   * demanding a value would be demanding the fixture rather than the code.
   */
  const ANSWERED = ['ok', 'firstName', 'exercises', 'research', 'word',
    'state', 'primary', 'owned', 'dailyPush'];
  const PRESENT = ['alerts', 'pickUp', 'partnerName', 'badges', 'storycardStyle'];
  const want = ANSWERED;
  const absent = PRESENT.filter((k) => !(k in (payload || {})));
  if (absent.length) {
    fails.push(`the payload no longer carries ${absent.join(', ')} at all. A key the app reads and the server stopped sending is a screen that draws nothing and says nothing.`);
  }
  /* Present AND answered. `in` was the first test and a plant that set
     `word: null` walked through it: the key was there and the tile would
     have drawn nothing. A field is what it holds. */
  const missing = want.filter((k) => {
    const v = (payload || {})[k];
    return v === undefined || v === null
      || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);
  });
  if (missing.length) {
    fails.push(`the payload is missing, or sends nothing for, ${missing.join(', ')}. Faster is not a fix if the screen has less to draw.`);
  }

  if (!fails.length) {
    const overlapped = calls.filter((c, i) => calls.slice(0, i).some((p) => c.start < p.end - 2)).length;
    console.log(`  ok  ${calls.length} upstream calls, ${overlapped} of them overlapping something earlier`);
    console.log(`  ok  ${depth} round trips deep against a floor of ${FLOOR}`);
  }
}

if (fails.length) {
  console.error(`\ncheck-home-waterfall: ${fails.length} problem${fails.length === 1 ? '' : 's'}\n`);
  for (const f of fails) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('\n[check-home-waterfall] the home screen waits for four round trips, which is what its data actually depends on.');
