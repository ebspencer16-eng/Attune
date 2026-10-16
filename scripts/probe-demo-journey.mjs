#!/usr/bin/env node
/**
 * The journey a demo walks, driven end to end with the outside stubbed.
 *
 * Buy, set the account up, answer an exercise, finish it, read results. Each
 * step is a different endpoint and nothing checked them as one sequence. Every
 * upstream call is stubbed and counted, so a step that silently skips its write
 * shows up as a step that made no call.
 *
 *   node scripts/probe-demo-journey.mjs
 *
 * A probe, not a gate: it asserts nothing. It prints a status and a call count
 * per step for a person to read before a demo. The gates that hold these paths
 * to their rules are check-entitlement-flow, check-completion-reach,
 * check-results-gate and check-promo-totals.
 *
 * Three of its own request shapes were wrong on the first run and each read as
 * a broken endpoint: save-exercise wants `userId` in the body as well as the
 * bearer token, calculate-tax wants `customerAddress` rather than `address`,
 * and a beta code on a cart holding a paid add-on is MEANT to charge. The
 * lesson is the one CLAUDE.md keeps: when a sweep says something surprising,
 * the first hypothesis is the harness.
 */

process.env.SUPABASE_URL = 'https://example.invalid';
process.env.SUPABASE_SERVICE_KEY = 'test-not-a-real-key';
process.env.SUPABASE_SERVICE_ROLE = 'test-not-a-real-key';
process.env.SUPABASE_ANON_KEY = 'test-not-a-real-key';
process.env.STRIPE_SECRET_KEY = 'sk_test_not_real';
process.env.RESEND_API_KEY = 're_not_real';

const ROOT = '/Users/Ellie/Projects/unison/';
const ME = '11111111-1111-1111-1111-111111111111';
const PARTNER = '22222222-2222-2222-2222-222222222222';

let calls = [];
const rows = { profiles: [], orders: [], couples: [] };

globalThis.fetch = async (u, init) => {
  const url = String(u && u.url ? u.url : u);
  const method = (init && init.method) || 'GET';
  calls.push(`${method} ${url.replace('https://example.invalid', '').split('?')[0]}`);
  const j = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });

  if (/\/auth\/v1\/user/.test(url)) return j({ id: ME, email: 'designer@example.com' });
  if (/\/auth\/v1\/admin\/users/.test(url)) return j({ id: ME, email: 'designer@example.com' });
  if (/\/auth\/v1\//.test(url)) return j({ access_token: 'tok', user: { id: ME, email: 'designer@example.com' } });
  if (/stripe\.com/.test(url)) {
    if (/tax\/calculations/.test(url)) return j({ id: 'taxcalc_1', tax_amount_exclusive: 0, amount_total: 8900 });
    return j({ id: 'pi_1', client_secret: 'pi_1_secret', amount: 8900, status: 'requires_payment_method' });
  }
  if (/resend/.test(url)) return j({ id: 'email_1' });

  if (/\/rest\/v1\/profiles/.test(url)) {
    if (method === 'POST' || method === 'PATCH') { rows.profiles.push(url); return j([{ id: ME }]); }
    return j([{
      id: ME, email: 'designer@example.com', name: 'Designer', pronouns: 'she/her',
      partner_profile_id: PARTNER, partner_name: 'Partner', pkg: 'premium',
      profile_setup_complete: true, invite_code: 'AAA111',
      ex1_answers: {}, ex2_answers: {}, ex3_answers: {},
    }]);
  }
  if (/\/rest\/v1\/orders/.test(url)) {
    if (method === 'POST' || method === 'PATCH') { rows.orders.push(url); return j([{ id: 'o1' }]); }
    return j([{ id: 'o1', order_number: 'ATN-1', pkg: 'premium', email: 'designer@example.com',
      addon_reflection: true, addon_budget: true, addon_checklist: true, status: 'paid' }]);
  }
  if (/\/rest\/v1\//.test(url)) {
    if (method === 'POST' || method === 'PATCH') { rows.couples.push(url); return j([{}]); }
    return j([]);
  }
  return j({});
};

const step = async (label, file, { method = 'POST', body = null, query = '' } = {}) => {
  calls = [];
  const mod = await import(ROOT + 'api/' + file);
  const url = `https://www.attune-relationships.com/api/${file.replace(/\.js$/, '')}${query}`;
  const init = { method, headers: { authorization: 'Bearer tok', 'content-type': 'application/json' } };
  if (body) init.body = JSON.stringify(body);
  let res, text = '';
  try {
    res = await mod.default(new Request(url, init));
    text = await res.text();
  } catch (e) {
    console.log(`  BROKEN  ${label}: threw ${String(e.message).slice(0, 70)}`);
    return null;
  }
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { /* not json */ }
  const ok = res.status < 400 && (parsed === null || parsed.ok !== false);
  console.log(`  ${ok ? 'ok     ' : 'BROKEN '} ${label}: HTTP ${res.status}`
    + (parsed && parsed.error ? `  error="${String(parsed.error).slice(0, 60)}"` : '')
    + `  (${calls.length} upstream call(s))`);
  if (!ok && parsed) console.log(`           ${text.slice(0, 160)}`);
  return { res, text, parsed };
};

console.log('1. BUYING, with a beta code, which is what a demo uses');
for (const code of ['BETA-CORE', 'BETA-PREMIUM', 'ATTUNE-BETA-FEEDBACK', 'BETA-CORE-1']) {
  const out = await step(`promo ${code}`, 'create-payment-intent.js', {
    body: { promoCode: code, buyerEmail: 'designer@example.com',
      items: [{ pkgKey: code === 'BETA-PREMIUM' ? 'premium' : 'core', addonChecklist: true }] },
  });
  if (out && out.parsed) {
    /* Printed rather than guessed at: the first run invented field names and
       reported every beta code as "not free" on the strength of them. */
    const keys = Object.entries(out.parsed)
      .map(([k, v]) => `${k}=${typeof v === 'object' && v ? '{...}' : String(v).slice(0, 28)}`).join(' ');
    console.log(`           ${keys}`);
  }
}

console.log('\n2. A REAL CARD, one package, to prove the paid path still answers');
await step('premium, card', 'create-payment-intent.js', {
  body: { buyerEmail: 'designer@example.com', items: [{ pkgKey: 'premium' }] },
});
await step('tax on the same cart', 'calculate-tax.js', {
  body: { items: [{ pkgKey: 'premium' }],
    customerAddress: { country: 'US', postal_code: '80202', state: 'CO', city: 'Denver', line1: '1 Main St' } },
});

console.log('\n3. ACCOUNT SETUP');
await step('create-profile', 'create-profile.js', {
  body: { name: 'Designer', pronouns: 'she/her', email: 'designer@example.com' },
});
await step('home, first load', 'home.js', { method: 'GET' });

console.log('\n4. EXERCISES AND COMPLETION');
await step('save-exercise ex1', 'save-exercise.js', {
  /* userId in the body AND a bearer token: the endpoint takes the id from the
     token and refuses a body that disagrees with it. The first run of this
     sweep sent no userId and read the 400 as a break. */
  body: { userId: ME, exercise: 'ex1', answers: { en1: 4, en2: 2 } },
});
await step('save-exercise ex1, completing it', 'save-exercise.js', {
  body: { userId: ME, exercise: 'ex1', answers: { en1: 4, en2: 2 }, completedAt: '2026-10-16T00:00:00Z' },
});
await step('exercise-completed', 'exercise-completed.js', { body: { exercise: 'ex1' } });

console.log('\n5. RESULTS');
await step('results', 'results.js', { method: 'GET' });
await step('tool-data', 'tool-data.js', { method: 'GET' });
await step('notes list', 'notes.js', { method: 'GET', query: '?action=list&limit=3' });
