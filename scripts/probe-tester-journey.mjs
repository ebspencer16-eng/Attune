/**
 * The whole way in: a code, an account, the exercises, the results.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie, with a design tester about to start: "is there anything here that is
 * open and will impede my design tester?" Every piece of that path has a gate
 * on it. Nothing ran them in order, on each other's real output, which is how
 * a cart that quoted $129 and charged $89 sat between two passing checks.
 *
 * Each step runs the real handler with only the network stubbed, and the next
 * step is given what the previous one actually produced: the order row the
 * promo path writes becomes the row the entitlements are computed from, which
 * becomes the profile the exercises are served to.
 *
 * A probe rather than a gate because it writes nothing and proves a journey
 * rather than a rule; the rules it crosses are each gated separately.
 *
 *   node scripts/probe-tester-journey.mjs
 */
process.env.SUPABASE_URL ||= 'https://stub.local';
process.env.SUPABASE_SERVICE_KEY ||= 'stub-service-key';
process.env.SUPABASE_SERVICE_ROLE ||= 'stub-service-key';
process.env.SUPABASE_ANON_KEY ||= 'stub-anon-key';
/* The payment endpoint refuses before it reads the promo code if there is no
   Stripe key, which is right on a real deployment and is not what this is
   about: a fully free code never reaches Stripe. The first run of this probe
   reported a full-bundle code unlocking two exercises of five, and all of that
   was this missing variable. */
process.env.STRIPE_SECRET_KEY ||= 'sk_test_stub';

const { EXERCISES } = await import('../api/_exercises.js');
const { ownsExercise } = await import('../api/_lib/results-gate.js');
const { computeEntitlements } = await import('../api/_lib/entitlements.js');
const { capabilitiesFor } = await import('../api/_lib/ownership.js');

const ME = 'aaaaaaaa-0000-0000-0000-000000000001';
const PARTNER = 'aaaaaaaa-0000-0000-0000-000000000002';
const CODE = 'ATTUNE-DESIGN-1';

const problems = [];
const say = (step, detail) => console.log(`  ${step.padEnd(34)} ${detail}`);

/** Every write the handlers attempt, so a step can be shown rather than assumed. */
let writes = [];
const stub = (routes) => {
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const method = (opts.method || 'GET').toUpperCase();
    const body = opts.body ? (() => { try { return JSON.parse(opts.body); } catch { return opts.body; } })() : null;
    if (method !== 'GET') writes.push({ u, method, body });
    for (const [match, reply] of routes) {
      if (u.includes(match)) {
        const out = typeof reply === 'function' ? reply(u, opts, body) : reply;
        return new Response(JSON.stringify(out ?? []), {
          status: 200, headers: { 'content-type': 'application/json' },
        });
      }
    }
    return new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } });
  };
};

// ── 1. The code, redeemed ─────────────────────────────────────────────────
const betaRow = {
  code: CODE, package_key: 'premium', active: true, max_uses: 1, uses_count: 0,
  includes_workbook: true, workbook_variant: 'digital', includes_intimacy: true,
  includes_reflection: true, includes_budget: true, includes_checklist: true,
  discount_mode: 'free', discount_value: 0, applies_to: 'package',
};
writes = [];
stub([['/rest/v1/beta_codes', [betaRow]]]);
const payIntent = (await import('../api/create-payment-intent.js')).default;
let paid;
try {
  const res = await payIntent(new Request('https://local/api/create-payment-intent', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      promoCode: CODE, pkgKey: 'premium', buyerName: 'Dana', buyerEmail: 'dana@example.com',
      partner1Name: 'Dana', partner2Name: 'Rio',
    }),
  }));
  paid = await res.json();
} catch (e) {
  problems.push(`redeeming ${CODE} threw: ${e.message}`);
}
const orderWrite = writes.find((w) => w.u.includes('/rest/v1/orders'));
if (!paid?.free) {
  problems.push(`${CODE} did not come back as a free order: ${JSON.stringify(paid).slice(0, 160)}`);
} else if (!orderWrite) {
  problems.push(`${CODE} was accepted and no order row was written, so nothing grants anything.`);
} else {
  say('1. code redeemed', `free order, row written with pkg_key=${orderWrite.body.pkg_key}`);
}

// ── 2. What that order grants ─────────────────────────────────────────────
const orderRow = orderWrite?.body || {};
const ent = computeEntitlements([{ ...orderRow, created_at: new Date().toISOString() }], null);
const owns = capabilitiesFor({ pkg: ent.pkg, entitlements: ent }).caps;
/* The capability for Relationship Reflection is called hasAnniversary, after
   the package that first carried it. Asking for `hasReflection` here returned
   undefined and reported a full-bundle code as unlocking four exercises of
   five, which was this probe not knowing the name. */
const ownedKeys = EXERCISES.filter((e) => ownsExercise(e, owns)).map((e) => e.key);
if (process.env.PROBE_DEBUG) {
  console.log('    ent:', JSON.stringify(ent));
  console.log('    caps:', JSON.stringify(owns));
}
say('2. what it unlocks', `${ownedKeys.join(', ')} (${ownedKeys.length} of ${EXERCISES.length})`);
if (ownedKeys.length !== EXERCISES.length) {
  problems.push(`a full-bundle code unlocks ${ownedKeys.length} of ${EXERCISES.length} exercises:`
    + ` missing ${EXERCISES.map((e) => e.key).filter((k) => !ownedKeys.includes(k)).join(', ')}.`
    + ' A design tester cannot see what they cannot open.');
}

// ── 3. The account ────────────────────────────────────────────────────────
writes = [];
stub([
  ['/auth/v1/user', { id: ME, email: 'dana@example.com' }],
  ['/rest/v1/orders', [{ ...orderRow, created_at: new Date().toISOString() }]],
  ['/rest/v1/profiles', []],
]);
const createProfile = (await import('../api/create-profile.js')).default;
let profileOut;
try {
  const res = await createProfile(new Request('https://local/api/create-profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: 'Bearer stub' },
    body: JSON.stringify({
      userId: ME, name: 'Dana', pronouns: 'she/her', partnerName: 'Rio',
      partnerPronouns: 'he/him', partnerEmail: 'rio@example.com',
      relationshipStatus: 'engaged', relationshipLength: '3-5', children: 'none',
      ageRange: '25-34', signupSource: 'friend',
    }),
  }));
  profileOut = await res.json();
} catch (e) {
  problems.push(`creating the account threw: ${e.message}`);
}
const profileWrite = writes.find((w) => w.u.includes('/rest/v1/profiles'));
if (!profileOut?.ok) problems.push(`create-profile answered ${JSON.stringify(profileOut).slice(0, 160)}`);
else if (!profileWrite) problems.push('create-profile answered ok and wrote no profile row.');
else say('3. account created', `profile written, pkg=${profileWrite.body.pkg || '(derived later)'}`);

/** The profile as the rest of the product will read it. */
const profile = {
  id: ME, name: 'Dana', pronouns: 'she/her', partner_name: 'Rio',
  partner_pronouns: 'he/him', partner_profile_id: PARTNER,
  pkg: ent.pkg, addon_reflection: ent.addonReflection, addon_budget: ent.addonBudget,
  addon_checklist: ent.addonChecklist, addon_intimacy: ent.addonIntimacy,
  addon_conflict: ent.addonConflict, addon_workbook: ent.addonWorkbook,
  relationship_status: 'engaged',
};

// ── 4. The first screen ───────────────────────────────────────────────────
stub([
  ['/auth/v1/user', { id: ME }],
  [`id=eq.${PARTNER}`, [{ ...profile, id: PARTNER, name: 'Rio', partner_name: 'Dana', partner_profile_id: ME }]],
  ['/rest/v1/profiles', [profile]],
]);
const home = (await import('../api/home.js')).default;
let homeBody;
try {
  const res = await home(new Request('https://local/api/home?tzOffset=0', { headers: { Authorization: 'Bearer stub' } }));
  homeBody = await res.json();
} catch (e) {
  problems.push(`the home screen threw: ${e.message}`);
}
if (!homeBody?.ok) problems.push(`/api/home answered ${JSON.stringify(homeBody).slice(0, 200)}`);
else {
  if (process.env.PROBE_DEBUG) console.log('    home keys:', Object.keys(homeBody).join(', '));
  /* `primary` and `secondary`, not `cards`: the first run of this read a key
     the payload does not have and reported a blank home screen. */
  const primary = homeBody.primary;
  const secondary = homeBody.secondary || [];
  /* `exercises` is keyed by exercise, not a list, so `.length` on it is
     undefined and reads as "none" — the third shape this probe guessed wrong
     about a payload it had not printed. */
  const listed = Object.keys(homeBody.exercises || {});
  say('4. first screen', `"${String(primary?.title || '').slice(0, 44)}"`
    + ` and ${secondary.length} more, ${listed.length} exercises listed`);
  if (!primary) problems.push('a new account opens the app with no card telling them what to do first.');
  if (listed.length !== ownedKeys.length) {
    problems.push(`the home screen lists ${listed.length} exercises for an account that owns`
      + ` ${ownedKeys.length}: ${listed.join(', ') || 'none'}.`);
  }
}

// ── 5. Every exercise it can open ─────────────────────────────────────────
const questions = (await import('../api/questions.js')).default;
let asked = 0;
for (const key of ownedKeys) {
  stub([
    ['/auth/v1/user', { id: ME }],
    [`id=eq.${PARTNER}`, [{ variant: null }]],
    ['/rest/v1/profiles', [profile]],
  ]);
  let body;
  try {
    const res = await questions(new Request(`https://local/api/questions?exercise=${key}`, {
      headers: { Authorization: 'Bearer stub' },
    }));
    body = await res.json();
  } catch (e) {
    problems.push(`${key} threw on open: ${e.message}`);
    continue;
  }
  if (!body?.ok) { problems.push(`${key} will not open: ${body?.error}`); continue; }
  const n = (body.items || body.questions || body.categories || []).length;
  if (!n) problems.push(`${key} opens with no questions in it.`);
  asked += 1;
}
say('5. exercises open', `${asked} of ${ownedKeys.length}, each with questions, an intro and a finish screen`);

// ── 6. Finishing one, as the app does ─────────────────────────────────────
writes = [];
stub([
  ['/auth/v1/user', { id: ME }],
  ['/rest/v1/profiles', [profile]],
]);
const save = (await import('../api/save-exercise.js')).default;
try {
  const res = await save(new Request('https://local/api/save-exercise', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: 'Bearer stub' },
    body: JSON.stringify({
      userId: ME, exercise: 'conflict',
      answers: { answers: { c0: 2 }, completedAt: new Date().toISOString() },
    }),
  }));
  const out = await res.json();
  if (!out?.ok) problems.push(`saving an exercise answered ${JSON.stringify(out).slice(0, 160)}`);
} catch (e) {
  problems.push(`saving an exercise threw: ${e.message}`);
}
const saved = writes.find((w) => w.u.includes('/rest/v1/profiles') && w.method !== 'GET');
if (!saved) problems.push('finishing an exercise wrote nothing to the profile.');
else say('6. an answer stored', `${Object.keys(saved.body || {}).join(', ').slice(0, 60)}`);

// ── 7. Results, once both have finished ───────────────────────────────────
const { readFileSync } = await import('node:fs');
let dump = null;
try {
  dump = JSON.parse(readFileSync(process.argv[2] || '/dev/null', 'utf8'));
} catch { /* optional */ }
if (!dump) {
  say('7. results', 'skipped: give me the EXERCISE_FLOW_DUMP file to drive this half');
} else {
  const full = {
    ...profile,
    ex1_answers: dump.exercise1.value, ex2_answers: dump.exercise2.value,
    ex3_answers: dump.exercise3.value, ex3_completed: true,
    intimacy_data: dump.intimacy.value, conflict_data: dump.conflict.value,
  };
  stub([
    ['/auth/v1/user', { id: ME }],
    [`id=eq.${PARTNER}`, [{ ...full, id: PARTNER, name: 'Rio', partner_name: 'Dana', partner_profile_id: ME }]],
    ['/rest/v1/couple_results', []],
    ['/rest/v1/profiles', [full]],
  ]);
  const results = (await import('../api/results.js')).default;
  const res = await results(new Request('https://local/api/results', { headers: { Authorization: 'Bearer stub' } }));
  const body = await res.json();
  if (!body?.ok) problems.push(`/api/results answered ${JSON.stringify(body).slice(0, 160)}`);
  else if (!body.ready) problems.push(`results stay shut for a couple who finished everything: ${body.reason}`);
  else say('7. results open', `${(body.nav || []).length} chapters, couple type ${body.results?.content?.coupleType?.id || '?'}`);
}

console.log('');
if (problems.length) {
  console.error(`[probe-tester-journey] ${problems.length} thing(s) in the way:`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log('[probe-tester-journey] the way in is clear: a code redeems, the account is created,'
  + ` every one of the ${ownedKeys.length} exercises opens, an answer is stored, and the results`
  + ' open once both partners have finished.');
