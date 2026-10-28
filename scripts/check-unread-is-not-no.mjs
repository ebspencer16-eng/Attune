#!/usr/bin/env node
/**
 * A read that failed is not an answer about a person.
 *
 * ── THE FAMILY ────────────────────────────────────────────────────────────
 * A167 was the website drawing "Pending" for a partner whose answers had not
 * arrived yet. The A170 sweep found the server doing the same thing in five
 * more places, each one turning `null` from a failed read into a sentence:
 *
 *   /api/home              a partner we could not read -> has done nothing
 *   /api/results           -> partner_not_found, the deleted account's answer
 *   /api/conflict-results  -> your partner has not finished
 *   /api/privacy-choices   -> you never opted out of research
 *   /api/survey            -> you have answered nothing (and the next save
 *                             wiped what you had)
 *   /api/tool-data         -> the couple has no shared budget (and a seed
 *                             wrote an old copy over theirs)
 *   /api/notes             -> you have no partner, so their shared notes vanish
 *   /api/questions         -> nothing saved, so a finished exercise restarts
 *   /api/admin-posts       -> a new post, so saving an edit UNPUBLISHED a live
 *                             article and orphaned every note anchored to it
 *
 * The first three, survey and tool-data are held by check-couple-link-mutual,
 * check-survey and check-tool-seeding, beside the rules they belong to. This
 * holds the four that had no gate of their own: conflict results, privacy
 * choices, notes, exercise questions and the admin's post editor, both run against a stubbed database, both ways. A failed read is
 * refused, and a read that succeeds and finds nothing still answers, so an
 * endpoint that refuses everything cannot pass.
 */
import { SITE_URL } from '../api/_lib/site.js';

const ME = '11111111-1111-4111-8111-111111111111';
const PT = '22222222-2222-4222-8222-222222222222';
Object.assign(process.env, {
  SUPABASE_URL: 'https://example.invalid',
  SUPABASE_SERVICE_KEY: 'test-not-a-real-key',
  SUPABASE_ANON_KEY: 'test-not-a-real-key',
});

const fails = [];
const ok = (v) => new Response(JSON.stringify(v), { status: 200, headers: { 'content-type': 'application/json' } });
const down = () => new Response('{"message":"timeout"}', { status: 503, headers: { 'content-type': 'application/json' } });
const quiet = async (fn) => {
  const l = console.log; const e = console.error; const w = console.warn;
  console.log = () => {}; console.error = () => {}; console.warn = () => {};
  try { return await fn(); } finally { console.log = l; console.error = e; console.warn = w; }
};
let writes = [];
const call = async (handler, path, route, init = {}) => {
  writes = [];
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const method = (opts.method || 'GET').toUpperCase();
    if (method !== 'GET') writes.push({ u, method });
    if (u.includes('/auth/v1/user')) return ok({ id: ME, email: 't@example.invalid' });
    return route(u, method) || ok([]);
  };
  const res = await quiet(() => handler(new Request(`${SITE_URL}${path}`, {
    headers: { authorization: 'Bearer t', 'content-type': 'application/json', origin: SITE_URL },
    ...init,
  })));
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

// ── conflict results: the partner fallback read ────────────────────────────
{
  const conflict = (await import('../api/conflict-results.js')).default;
  const me = { id: ME, partner_profile_id: PT, name: 'A', pkg: 'premium', addon_conflict: true,
    conflict_data: { answers: {}, completedAt: 1 } };
  const viaPair = (u) => (u.includes('/rest/v1/profiles') && u.includes('or=') ? ok([me]) : null);
  const failed = await call(conflict, '/api/conflict-results', (u) => viaPair(u)
    || (u.includes(`/rest/v1/profiles?id=eq.${PT}`) ? down() : null));
  if (failed.status < 500 || failed.body.ok !== false) {
    fails.push(`conflict-results answered ${failed.status} (ready=${failed.body.ready}, reason=${failed.body.reason})`
      + ' when the partner could not be read. That reads as a partner who has not finished.');
  }
  const absent = await call(conflict, '/api/conflict-results', (u) => viaPair(u)
    || (u.includes(`/rest/v1/profiles?id=eq.${PT}`) ? ok([]) : null));
  if (absent.status >= 500) {
    fails.push(`conflict-results answered ${absent.status} for a partner row that is genuinely absent.`);
  }
}

// ── privacy choices: the stored choice ─────────────────────────────────────
{
  const privacy = (await import('../api/privacy-choices.js')).default;
  const failed = await call(privacy, '/api/privacy-choices', (u) => (u.includes('/rest/v1/privacy_preferences') ? down() : null));
  if (failed.status < 500 || failed.body.ok !== false) {
    fails.push(`privacy-choices answered ${failed.status} with ok=${failed.body.ok} when the stored choice could not be read,`
      + ' so somebody who opted out of research is shown as opted in.');
  }
  const held = await call(privacy, '/api/privacy-choices', (u) => (u.includes('/rest/v1/privacy_preferences')
    ? ok([{ owner_id: ME, opt_out_research: true, source: 'page' }]) : null));
  if (held.status !== 200 || held.body.ok !== true) {
    fails.push(`privacy-choices answered ${held.status} for a choice it could read.`);
  } else if (!JSON.stringify(held.body).includes('true')) {
    fails.push('privacy-choices read an opt-out and did not report it.');
  }
}

// ── notes: the reader's own profile, which carries the partner link ────────
{
  const notes = (await import('../api/notes.js')).default;
  const failed = await call(notes, '/api/notes', (u) => (u.includes('/rest/v1/profiles') ? down() : null));
  if (failed.status < 500 || failed.body.ok !== false) {
    fails.push(`notes answered ${failed.status} when the reader's profile could not be read, so the partner`
      + ' link vanished and their shared notes read as none.');
  }
  const fine = await call(notes, '/api/notes', (u) => (u.includes('/rest/v1/profiles') ? ok([{ partner_profile_id: PT, name: 'A' }]) : null));
  if (fine.status >= 500) fails.push(`notes answered ${fine.status} for a profile it could read.`);
}

// ── exercise questions: what the reader has already answered ───────────────
{
  const questions = (await import('../api/questions.js')).default;
  const failed = await call(questions, '/api/questions?exercise=ex1', (u) => (u.includes('/rest/v1/profiles') ? down() : null));
  if (failed.status < 500 || failed.body.ok !== false) {
    fails.push(`questions answered ${failed.status} when the reader's profile could not be read, so an exercise`
      + ' they have finished opens as a fresh start and finishing it again replaces their answers.');
  }
  const fine = await call(questions, '/api/questions?exercise=ex1', (u) => (u.includes('/rest/v1/profiles') ? ok([{ id: ME, pkg: 'core' }]) : null));
  if (fine.status >= 500) fails.push(`questions answered ${fine.status} for a profile it could read.`);
}

// ── the admin post editor: the saved post it is about to overwrite ─────────
{
  process.env.ADMIN_SECRET = 'test-admin-secret';
  const posts = (await import('../api/admin-posts.js')).default;
  const save = { method: 'POST', headers: {
    authorization: 'Bearer test-admin-secret', 'content-type': 'application/json',
    origin: SITE_URL,
  }, body: JSON.stringify({ action: 'save', id: 'a-live-post', title: 'T', blocks: [{ id: 'b1', type: 'paragraph', text: 'x' }] }) };
  const failed = await call(posts, '/api/admin-posts', (u, m) => (u.includes('/rest/v1/posts') && m === 'GET' ? down() : null), save);
  const wrotePost = writes.some((w) => w.u.includes('/rest/v1/posts'));
  if (wrotePost || failed.status < 500) {
    fails.push(`admin-posts ${wrotePost ? 'wrote the post' : `answered ${failed.status}`} when the saved post could not be read.`
      + ' Saved as new, a live article is unpublished and every reader\'s note on it is orphaned.');
  }
  const fine = await call(posts, '/api/admin-posts', (u, m) => (u.includes('/rest/v1/posts') && m === 'GET'
    ? ok([{ blocks: [{ id: 'b1' }], revision: 2, published_at: '2026-10-01T00:00:00Z' }])
    : (u.includes('/rest/v1/posts') ? ok([{ id: 'a-live-post' }]) : null)), save);
  if (fine.status !== 200) fails.push(`admin-posts refused a save (${fine.status}) whose post it could read.`);
}

if (fails.length) {
  console.error('check-unread-is-not-no FAILED');
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log('[check-unread-is-not-no] conflict results, privacy choices, notes and the post editor refuse a read that'
  + ' failed and answer one that succeeded, so none of them turns a timeout into a statement about somebody, and the'
  + ' editor writes nothing over a post it could not read. Home, results, survey and the shared tools are held beside'
  + ' their own rules.');
