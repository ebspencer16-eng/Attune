#!/usr/bin/env node
/**
 * check-article-emails: the In Practice list is kept, and each new article is
 * emailed to it once.
 *
 * A204a. The signup saved nothing for as long as it existed; it saves through
 * /api/practice-subscribe now, and api/cron-new-articles.js emails the list
 * when an article appears in api/_in-practice.js.
 *
 * RUNS both endpoints against a stubbed database and Resend:
 *   1. the first run records every existing article and sends nothing;
 *   2. a new article is claimed, then sent to the active subscribers only,
 *      each with their own unsubscribe link;
 *   3. an article another run already claimed (409) sends nothing;
 *   4. a list that cannot be read answers 500 and gives the claim back;
 *   5. announcements that cannot be read answer 500, not "nothing new";
 *   6. signing up stores the address in lower case, and a failed store is a
 *      503, not a thank-you; the page says thanks only on a 200.
 *
 * Planted: the baseline branch removed (everyone gets every old article),
 * the claim removed, and the page back to thanking without asking. All
 * three fail it.
 */
import { readFileSync } from 'node:fs';
import { SITE_URL } from '../api/_lib/site.js';
import { IN_PRACTICE } from '../api/_in-practice.js';

Object.assign(process.env, { SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_KEY: 'k', RESEND_API_KEY: 're', CRON_SECRET: 'cron' });
const ROOT = new URL('..', import.meta.url).pathname;
const { default: cron } = await import('../api/cron-new-articles.js');
const { default: subscribe } = await import('../api/practice-subscribe.js');

const j = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });
const quiet = async (fn) => { const w = console.warn; console.warn = () => {}; try { return await fn(); } finally { console.warn = w; } };

async function run({ announced, claim = 201, people = 200 }) {
  const log = { emails: [], posts: [], deletes: [], subsQuery: null };
  globalThis.fetch = async (url, init = {}) => {
    const u = decodeURIComponent(String(url)); const m = init.method || 'GET';
    if (u.startsWith('https://api.resend.com')) { log.emails.push(JSON.parse(init.body)); return j({ id: 'e' }); }
    if (u.includes('article_announcements') && m === 'GET') return announced === 'fail' ? j({ message: 'x' }, 500) : j(announced.map((slug) => ({ slug })));
    if (u.includes('article_announcements') && m === 'POST') { log.posts.push(JSON.parse(init.body)); return claim === 201 ? j([{}], 201) : j({ message: 'dup' }, claim); }
    if (u.includes('article_announcements') && m === 'DELETE') { log.deletes.push(u); return new Response(null, { status: 204 }); }
    if (u.includes('article_announcements') && m === 'PATCH') return new Response(null, { status: 204 });
    if (u.includes('article_subscribers')) {
      log.subsQuery = u;
      return people === 200 ? j([{ email: 'a@example.com', token: '11111111-1111-4111-8111-111111111111' }, { email: 'b@example.com', token: '22222222-2222-4222-8222-222222222222' }]) : j({ message: 'x' }, 500);
    }
    return j([]);
  };
  const r = await quiet(() => cron(new Request(`${SITE_URL}/api/cron-new-articles`, { headers: { authorization: 'Bearer cron' } })));
  return { status: r.status, body: await r.json().catch(() => ({})), ...log };
}

const fails = [];
const all = IN_PRACTICE.map((a) => a.slug);
const allButOne = all.slice(1);
const fresh = IN_PRACTICE[0];

const first = await run({ announced: [] });
if (first.emails.length) fails.push(`the first run sent ${first.emails.length} emails; it should record the ${all.length} existing articles and send nothing`);
if ((first.posts[0] || []).length !== all.length) fails.push(`the first run recorded ${(first.posts[0] || []).length} of ${all.length} articles`);

const one = await run({ announced: allButOne });
if (one.emails.length !== 2) fails.push(`one new article and two subscribers sent ${one.emails.length} emails`);
if (!one.emails.every((m) => m.html.includes(`${SITE_URL}${fresh.path}`))) fails.push('the new-article email does not link to the article');
if (new Set(one.emails.map((m) => (m.html.match(/articles=([0-9a-f-]+)/) || [])[1])).size !== 2) fails.push('the two subscribers did not each get their own unsubscribe link');
if (!/unsubscribed_at=is\.null/.test(one.subsQuery || '')) fails.push('the list is read without leaving out people who unsubscribed');
if (!one.posts.some((p) => p.slug === fresh.slug)) fails.push('the article was sent without being claimed first');

const taken = await run({ announced: allButOne, claim: 409 });
if (taken.emails.length) fails.push(`an article another run had already claimed was sent again (${taken.emails.length} emails)`);

const noList = await run({ announced: allButOne, people: 500 });
if (noList.status !== 500) fails.push(`a list that could not be read answered ${noList.status}`);
if (!noList.deletes.some((u) => u.includes(fresh.slug))) fails.push('a list that could not be read kept the claim, so the article would never be announced');

const noAnn = await run({ announced: 'fail' });
if (noAnn.status !== 500 || noAnn.emails.length) fails.push(`announcements that could not be read answered ${noAnn.status} and sent ${noAnn.emails.length}`);

async function signUp(email, ok) {
  let body = null;
  globalThis.fetch = async (url, init = {}) => { body = JSON.parse(init.body); return ok ? new Response(null, { status: 201 }) : j({ message: 'x' }, 500); };
  const r = await quiet(() => subscribe(new Request(`${SITE_URL}/api/practice-subscribe`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) })));
  return { status: r.status, body };
}
const s1 = await signUp('Maya@Example.com', true);
if (s1.status !== 200 || s1.body?.email !== 'maya@example.com') fails.push(`signing up answered ${s1.status} and stored ${s1.body?.email}`);
const s2 = await signUp('maya@example.com', false);
if (s2.status !== 503) fails.push(`a sign-up that was not stored answered ${s2.status}`);

const page = readFileSync(`${ROOT}public/practice.html`, 'utf8');
const fn = (page.match(/async function handleSignup[\s\S]*?\n\}/) || [''])[0];
if (!/fetch\('\/api\/practice-subscribe'/.test(fn) || !/if \(!ok\)[^\n]*return;/.test(fn) || fn.indexOf('if (!ok)') > fn.indexOf("on the list")) {
  fails.push('the In Practice page thanks people for signing up without first hearing that the address was stored');
}

if (fails.length) {
  console.error('[check-article-emails] ' + fails.length + ' problem(s):');
  for (const x of fails) console.error('  ' + x);
  process.exit(1);
}
console.log(`[check-article-emails] the list is kept in lower case and only on a stored row; a first run records ${all.length} articles and sends nothing; a new one goes once, to the active list, each with their own way off; an unread list or record answers 500.`);
