#!/usr/bin/env node
/**
 * Rewriting a note's tags cannot empty them, and cannot lie about having saved.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * /api/notes rewrote a note's tag set by deleting every tag on the note and
 * then inserting the wanted set. Two requests, no transaction, and neither
 * result looked at. So a failed insert left the note with no tags at all, and
 * the endpoint answered ok: true with body.tagIds echoed back, which is what the
 * app draws from. The tags were on the screen and gone from the table until
 * something reloaded.
 *
 * Tags are how the Notes tab is organised. Losing all of them while being told
 * it worked is worse than not saving one.
 *
 * ── WHAT THIS CHECKS, AND WHY BEHAVIOURALLY ───────────────────────────────
 * The rule is about ORDER and about what happens on a failure, and neither is
 * visible in a read of the file: both versions are four lines that look
 * reasonable. So the handler is run against a stubbed network, the tag insert is
 * failed, and the requests it made are counted.
 *
 * Two promises:
 *   A failed insert must not be followed by a delete. Add first, then remove
 *   what is left over, so a failure leaves a superset and never an empty set.
 *   A failed tag write must not come back as ok: true.
 *
 * ── WHY THE STUB IS AT THE NETWORK LAYER ──────────────────────────────────
 * Same reason as check-progress-not-destructive: this handler reaches Supabase
 * through fetch, so fetch is the seam. A gate that disables the side effect
 * cannot see where the guard sits, and this gate is entirely about where things
 * sit relative to each other.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Not atomicity. There is no transaction across two Postgrest calls and this
 * does not pretend to add one. It checks that the failure mode is a tag too many
 * rather than none at all, which is the difference between a tidy-up and lost
 * work.
 *
 * Not the create path, where a failed tag write leaves the note itself intact.
 * That one reports tagsSaved and is checked by nothing here, deliberately: the
 * writing is safe, which is what someone would be upset to lose.
 */

const NOTE = '11111111-1111-4111-8111-111111111111';
const ME = '22222222-2222-4222-8222-222222222222';
const TAG_A = '33333333-3333-4333-8333-333333333333';
const TAG_B = '44444444-4444-4444-8444-444444444444';

process.env.SUPABASE_URL = 'https://stub.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'stub-service-key';
process.env.SUPABASE_ANON_KEY = 'stub-anon-key';

const { default: handler } = await import('../api/notes.js');

/**
 * @param {(url: string, init: object) => Response | null} intercept
 *        returns a Response to stand in for this request, or null for the default
 */
function stubFetch(intercept) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    const method = (init.method || 'GET').toUpperCase();
    calls.push({ url: u, method });

    const custom = intercept(u, init);
    if (custom) return custom;

    const body = (v) => new Response(JSON.stringify(v), { status: 200, headers: { 'Content-Type': 'application/json' } });

    if (u.includes('/auth/v1/user')) return body({ id: ME });
    if (u.includes('/rest/v1/profiles')) return body([{ partner_profile_id: null, name: 'Test', pronouns: null }]);
    // The PATCH on the note itself: one row back, so the handler gets past
    // "not found" and reaches the tags, which is the subject.
    if (u.includes('/rest/v1/notes')) return body([{ id: NOTE, anchor_key: null, anchor_type: null }]);
    if (u.includes('/rest/v1/note_tags')) return body([]);
    return body([]);
  };
  return calls;
}

const req = () => new Request('https://www.attune-relationships.com/api/notes?action=update', {
  method: 'POST',
  headers: { Authorization: 'Bearer stub-token', 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'update', id: NOTE, tagIds: [TAG_A, TAG_B] }),
});

const fails = [];
const tagCalls = (calls) => calls.filter((c) => c.url.includes('note_tags'));

// ── 1. The happy path: the insert comes before the delete ───────────────────
{
  const calls = stubFetch(() => null);
  const res = await handler(req());
  const payload = await res.json();
  const tags = tagCalls(calls);

  if (!payload.ok) {
    fails.push(`an ordinary tag rewrite failed: ${JSON.stringify(payload)}.`
      + ' Every case below is about a failure, so this one has to work or they'
      + ' prove nothing.');
  }
  const post = tags.findIndex((c) => c.method === 'POST');
  const del = tags.findIndex((c) => c.method === 'DELETE');
  if (post === -1) fails.push('a tag rewrite made no insert at all.');
  if (del === -1) fails.push('a tag rewrite never removed the tags that are no longer wanted.');
  if (post !== -1 && del !== -1 && post > del) {
    fails.push('the tags are deleted before they are inserted. A failed insert'
      + ' then leaves the note with no tags at all, and the whole set is gone'
      + ' rather than one tag being left behind. Add first, then remove what is'
      + ' left over.');
  }
  // And the delete must be narrowed to what is NOT wanted, or it takes the
  // rows the insert just wrote.
  const scoped = tags.find((c) => c.method === 'DELETE');
  if (scoped && !/tag_id=not\.in\./.test(scoped.url)) {
    fails.push('the delete is not narrowed to the tags that are no longer'
      + ` wanted, so it removes the ones just inserted:\n      ${scoped.url}`);
  }
}

// ── 2. The insert fails: nothing is deleted, and it says so ─────────────────
{
  const calls = stubFetch((u, init) => {
    if (u.includes('note_tags') && (init.method || '').toUpperCase() === 'POST') {
      return new Response('{"message":"stubbed failure"}', { status: 500 });
    }
    return null;
  });
  const res = await handler(req());
  const payload = await res.json();
  const deletes = tagCalls(calls).filter((c) => c.method === 'DELETE');

  if (deletes.length) {
    fails.push('the tag insert failed and the delete ran anyway, so every tag on'
      + ' the note is gone. That is the bug: the note keeps its writing and loses'
      + ' the only thing that files it.');
  }
  if (payload.ok) {
    fails.push('the tag write failed and the endpoint answered ok: true. The app'
      + ' draws the tags it asked for from that answer, so they are on the screen'
      + ' and not in the table until something reloads.');
  }
}

// ── 3. The delete fails: still not a success ────────────────────────────────
{
  stubFetch((u, init) => {
    if (u.includes('note_tags') && (init.method || '').toUpperCase() === 'DELETE') {
      return new Response('{"message":"stubbed failure"}', { status: 500 });
    }
    return null;
  });
  const payload = await (await handler(req())).json();
  if (payload.ok) {
    fails.push('removing the tags that are no longer wanted failed and the'
      + ' endpoint answered ok: true, so a tag the person unpicked stays on the'
      + ' note and nothing says so. Less costly than case 2 and still not true.');
  }
}

// ── 4. Clearing every tag still clears them ────────────────────────────────
{
  const calls = stubFetch(() => null);
  const res = await handler(new Request('https://www.attune-relationships.com/api/notes?action=update', {
    method: 'POST',
    headers: { Authorization: 'Bearer stub-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', id: NOTE, tagIds: [] }),
  }));
  const payload = await res.json();
  const del = tagCalls(calls).find((c) => c.method === 'DELETE');
  if (!payload.ok) fails.push('unpicking every tag failed.');
  if (!del) {
    fails.push('unpicking every chip removed nothing. An empty wanted set is a'
      + ' request to clear the tags, not a request to do nothing.');
  } else if (/not\.in\.\(\)/.test(del.url)) {
    fails.push('unpicking every tag sends an empty not.in list, which Postgrest'
      + ` does not accept, so nothing is removed:\n      ${del.url}`);
  }
}

if (fails.length) {
  console.error('\n check-tag-write-order: a note can lose every tag on it.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log('[check-tag-write-order] tags are added before the leftovers are'
  + ' removed, a failed tag write is never reported as a success, and clearing'
  + ' every chip still clears them.');
