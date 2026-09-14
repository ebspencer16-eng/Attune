#!/usr/bin/env node
/**
 * Opening Notes must not write tags into anyone's account.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie: "I don't like our default tags. Just have a spot for people to 'add a
 * tag' then they see their own list." The first GET of /api/notes?action=tags
 * used to insert twenty-one rows, one per dimension, expectations category and
 * intimacy dimension, and that is what filled a new account's tag list with
 * names nobody chose.
 *
 * Two things have to hold, and the second is the reason this is not simply a
 * deletion:
 *
 *   1. The request writes nothing. Every write goes out through fetch, so the
 *      check is a POST to the tags table appearing in the calls that request
 *      makes.
 *
 *   2. The names still arrive. Those rows were doing a second job: an
 *      annotation stores `dim:conflict` and needs something to call it
 *      "Conflict Style". Dropping them without sending the dictionary would
 *      relabel every existing annotation as "Dim conflict", which is a worse
 *      bug than the one being fixed and a silent one.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * By calling the handler. A seeding branch that is present but unreachable
 * reads the same as one that is gone, and only running it tells them apart.
 * fetch is stubbed to answer as Supabase would for an account with no tags,
 * which is exactly the case that used to seed.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The rows already written to real accounts. Those are cleared by migration
 * 064, which Ellie runs, and no check here can see a database.
 */

import { SITE_URL } from '../api/_lib/site.js';

const calls = [];
const PROFILE = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'reader@example.invalid',
  pkg: 'premium',
  // Intimacy is add-on only on every package, so the flag rather than the
  // package is what puts the six intimacy names in the dictionary.
  addon_intimacy: true,
  partner_id: null,
};

globalThis.fetch = async (url, init) => {
  const u = String(url);
  calls.push({ url: u, method: init?.method || 'GET' });
  const body =
    u.includes('/auth/v1/user') ? { id: PROFILE.id }
    : u.includes('/rest/v1/profiles') ? [PROFILE]
    // The account this is about: signed in, and no tags of its own.
    : u.includes('/rest/v1/tags') ? []
    : [];
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
};

Object.assign(process.env, {
  SUPABASE_URL: 'https://example.invalid',
  SUPABASE_SERVICE_KEY: 'test-not-a-real-key',
  SUPABASE_ANON_KEY: 'test-not-a-real-key',
});

const realLog = console.log;
console.log = () => {};

const handler = (await import('../api/notes.js')).default;
const res = await handler(new Request(`${SITE_URL}/api/notes?action=tags`, {
  headers: { authorization: 'Bearer test-not-a-real-token' },
}));
const payload = await res.json().catch(() => null);

console.log = realLog;

const fails = [];

if (res.status !== 200 || !payload?.ok) {
  fails.push(`the request did not succeed: ${res.status} ${JSON.stringify(payload)?.slice(0, 200)}`);
}

const wrote = calls.filter((c) => c.method !== 'GET' && /\/rest\/v1\/tags/.test(c.url));
if (wrote.length) {
  fails.push(`opening Notes made ${wrote.length} write(s) to the tags table: ${wrote.map((w) => `${w.method} ${w.url}`).join(', ')}`);
}

if (payload?.tags?.length) {
  fails.push(`the response carried ${payload.tags.length} tag(s) for an account that has none`);
}

/**
 * The dictionary, by the keys an annotation actually anchors with. Compared
 * against the module rather than a list written here: a list would be a second
 * copy of the thing it is checking, which is the failure this repo keeps
 * having.
 */
const { standardTags } = await import('../api/_lib/tags.js');
const wanted = standardTags({ ownsIntimacy: true });
const sent = new Map((payload?.standard || []).map((t) => [t.standard_key, t]));
for (const t of wanted) {
  const got = sent.get(t.standard_key);
  if (!got) { fails.push(`${t.standard_key} ("${t.name}") is not in the names the endpoint sends, so a note anchored to it has no label`); continue; }
  if (got.name !== t.name) fails.push(`${t.standard_key} is sent as "${got.name}" and the product calls it "${t.name}"`);
}

if (!payload?.suggestions?.length) {
  fails.push('no suggestions were sent, so the line under the add field is empty');
}

if (fails.length) {
  console.error('[check-no-seeded-tags] opening Notes is not leaving the account alone:');
  for (const f of fails) console.error(`  ${f}`);
  process.exit(1);
}

console.log(`[check-no-seeded-tags] opening Notes writes nothing, sends no tags, and carries all ${wanted.length} names an annotation can anchor to.`);
