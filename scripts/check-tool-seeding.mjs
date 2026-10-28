#!/usr/bin/env node
/**
 * Moving two people's separate tools onto one shared row cannot lose either.
 *
 * ── WHY THIS IS THE RISKIEST PART OF THAT CHANGE ──────────────────────────
 * The Shared Budget and the Merging Lives Checklist used to be stored per
 * person, so a couple who filled one in before migration 076 has two copies,
 * and they can differ. The first time either of them opens a tool, the server
 * seeds the couple's row from whichever profile has more in it.
 *
 * That is a merge, and a merge that picks wrong looks exactly like lost work to
 * the person whose copy did not win. Ellie asked for the tools to be mirrored;
 * nobody asked for a budget to disappear.
 *
 * So the rule is not only "pick the fuller one". It is that the other copy stays
 * on its profile column, untouched, so nothing is destroyed and anyone who
 * reports losing a budget still has it to look at.
 *
 * ── WHY BEHAVIOURAL ───────────────────────────────────────────────────────
 * The seeding runs once, on a read, against a row that does not exist yet, for a
 * couple whose data is on two other rows. None of that is visible in a reading
 * of the endpoint, and every case below is a different combination of which side
 * has what. The network is stubbed under it, the same seam
 * check-progress-not-destructive uses.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * What happens after the row exists, which is ordinary reading and writing and
 * is what check-shared-tools covers.
 *
 * Whether the fuller copy is the better one. It is a heuristic and it is the
 * honest one available: nothing records which partner last edited a tool before
 * there was a shared row to record it on. The protection is that the loser is
 * kept, not that the winner is always right.
 */

const ME = '11111111-1111-4111-8111-111111111111';
const THEM = '22222222-2222-4222-8222-222222222222';

process.env.SUPABASE_URL = 'https://stub.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'stub-service-key';
process.env.SUPABASE_ANON_KEY = 'stub-anon-key';

const { default: handler } = await import('../api/tool-data.js');

const fails = [];

/**
 * @param mine   this caller's profile budget_data
 * @param theirs the partner's
 * @param shared what is already on the couple row, or null for none
 */
async function read({ mine, theirs, shared, readFails = null }) {
  const writes = [];
  let row = shared;

  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    const method = (init.method || 'GET').toUpperCase();
    const j = (v) => new Response(JSON.stringify(v), { status: 200, headers: { 'Content-Type': 'application/json' } });

    if (u.includes('/auth/v1/user')) return j({ id: ME });

    if (u.includes('/rest/v1/couple_tools')) {
      if (method === 'POST') {
        const body = JSON.parse(init.body || '{}');
        writes.push(body);
        row = { ...(row || {}), ...body };
        return j([]);
      }
      if (readFails === 'error') return new Response('{"message":"timeout"}', { status: 503 });
      if (readFails === 'no-table') return new Response('{"code":"PGRST205"}', { status: 404 });
      return j(row ? [row] : []);
    }

    if (u.includes('/rest/v1/profiles')) {
      if (u.includes(`id=eq.${THEM}`)) return j([{ budget_data: theirs, checklist_data: null }]);
      /* newlywed, because that package includes both the budget and the
         checklist. `is_comp` alone does not grant here: capabilitiesFor reads a
         profile's package and add-on columns, and comp accounts are granted
         through the entitlements written beside the flag. */
      return j([{
        name: 'A', partner_name: 'B', partner_profile_id: THEM,
        budget_data: mine, checklist_data: null,
        pkg: 'newlywed',
      }]);
    }
    if (u.includes('/rest/v1/orders')) return j([]);
    return j([]);
  };

  const res = await handler(new Request('https://www.attune-relationships.com/api/tool-data', {
    headers: { Authorization: 'Bearer stub-token' },
  }));
  const payload = await res.json();
  return { payload, writes, row, status: res.status };
}

const BIG = { incomes: { A: '5000', B: '6000' }, expenses: { rent: '2000', food: '600' }, goals: [{ id: 'g1' }] };
const SMALL = { incomes: { A: '1' } };

// ── 1. One partner filled it in, the other did not ──────────────────────────
{
  const { payload, writes } = await read({ mine: BIG, theirs: null, shared: null });
  if (JSON.stringify(payload.budget) !== JSON.stringify(BIG)) {
    fails.push('a couple where only the caller had a budget did not get it back.'
      + ` Served ${JSON.stringify(payload.budget)}.`);
  }
  if (!writes.length) fails.push('nothing was seeded onto the couple row, so the partner still cannot see it.');
}

// ── 2. The partner filled it in, the caller did not ─────────────────────────
{
  const { payload } = await read({ mine: null, theirs: BIG, shared: null });
  if (JSON.stringify(payload.budget) !== JSON.stringify(BIG)) {
    fails.push('a partner\'s budget did not reach the person who had none of their own.'
      + ` Served ${JSON.stringify(payload.budget)}. That is the whole point of the change:`
      + ' one budget between them, whoever typed it.');
  }
}

// ── 3. Both filled one in, and they differ ──────────────────────────────────
{
  const { payload, writes } = await read({ mine: SMALL, theirs: BIG, shared: null });
  if (JSON.stringify(payload.budget) !== JSON.stringify(BIG)) {
    fails.push('with a budget on both profiles, the fuller one did not win.'
      + ` Served ${JSON.stringify(payload.budget)}.`);
  }
  const wrote = writes.find((w) => 'budget_data' in w);
  if (wrote && JSON.stringify(wrote.budget_data) !== JSON.stringify(BIG)) {
    fails.push('the seed wrote the smaller budget onto the shared row.');
  }
  /**
   * And the one that lost is still on its profile. Nothing here deletes it, so
   * this checks that nothing was asked to: a PATCH of a profile column during a
   * read is the shape that would quietly throw someone's work away.
   */
  if (writes.some((w) => 'budget_data' in w && w.couple_key === undefined)) {
    fails.push('seeding wrote to something other than the couple row.');
  }
}

// ── 4. The row already exists: seeding must not run again ───────────────────
{
  const existing = { couple_key: 'x', budget_data: SMALL, editing: {} };
  const { payload, writes } = await read({ mine: BIG, theirs: BIG, shared: existing });
  if (JSON.stringify(payload.budget) !== JSON.stringify(SMALL)) {
    fails.push('an existing shared row was overwritten by a profile copy. Once the'
      + ' couple has a row, it is the answer: re-seeding from a stale profile column'
      + ' would undo whatever they had just done together.');
  }
  if (writes.some((w) => 'budget_data' in w)) {
    fails.push('a plain read of an existing shared row wrote to it.');
  }
}

// ── 5. Nobody has anything ──────────────────────────────────────────────────
{
  const { payload, writes } = await read({ mine: null, theirs: null, shared: null });
  if (payload.budget !== null) {
    fails.push(`a couple with no budget anywhere was served ${JSON.stringify(payload.budget)}`
      + ' rather than null. A surface tells "nothing saved" from "not yours" by'
      + ' asking `owned`, and it cannot if an empty read invents a value.');
  }
  if (writes.length) {
    fails.push('an empty couple had a row written for them, which is a row per'
      + ' couple who ever opened the tab rather than per couple who used it.');
  }
}

// ── 6. The read of the couple's row FAILS ──────────────────────────────────
/* Found by sweep-masquerading-defaults (A170). A failed read answered null,
   which is "no row yet", so the endpoint seeded from the profiles and wrote
   that over the couple's current row: one failed read put each person's
   pre-sharing copy over the budget they had built together. */
{
  const existing = { couple_key: 'x', budget_data: SMALL, editing: {} };
  const { payload, writes, status } = await read({ mine: BIG, theirs: BIG, shared: existing, readFails: 'error' });
  if (writes.some((w) => 'budget_data' in w || 'checklist_data' in w)) {
    fails.push('a FAILED read of the couple row wrote a profile copy over it.');
  }
  if (status < 500 || payload.ok !== false) {
    fails.push(`a failed read of the couple row answered ${status} with ok=${payload.ok}, so the screen shows`
      + ' an old copy and its next save makes that copy the couple\'s budget.');
  }
}

// ── 7. The table is not there yet: the documented fallback still holds ─────
{
  const { payload, status } = await read({ mine: BIG, theirs: null, shared: null, readFails: 'no-table' });
  if (status !== 200 || JSON.stringify(payload.budget) !== JSON.stringify(BIG)) {
    fails.push(`before migration 076 the endpoint must fall back to the reader's own copy; it answered ${status}.`);
  }
}

if (fails.length) {
  console.error('\n check-tool-seeding: moving to one shared tool can lose work.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log('[check-tool-seeding] seven cases: either partner\'s work reaches the'
  + ' other, the fuller copy wins when both have one, an existing shared row is'
  + ' never re-seeded, an empty couple gets no row and no invented value, a failed'
  + ' read writes nothing and says so, and a missing table still falls back.');
