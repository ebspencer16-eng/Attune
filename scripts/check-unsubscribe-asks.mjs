#!/usr/bin/env node
/**
 * check-unsubscribe-asks: opening an unsubscribe link asks; only a POST
 * unsubscribes, and every scheduled email says where to POST.
 *
 * Opening the link used to do it. Mail security scanners open every link in
 * an email before the person sees it, so people behind one were unsubscribed
 * by a machine and stopped getting check-ins without choosing to (A205). And
 * no scheduled email carried List-Unsubscribe, which Gmail and Yahoo have
 * required of bulk senders since 2024.
 *
 * RUNS /api/unsubscribe with the database stubbed:
 *   1. a GET, for an account and for the In Practice list, touches nothing
 *      and draws a form that posts back to the same address;
 *   2. a POST flips the account's opt-in, or stamps the list row;
 *   3. a POST the database refuses answers 503, never a 200 page;
 * and READS the three scheduled senders: every send passes the person, and
 * the request body carries listUnsubscribeHeaders. (check-article-emails
 * runs the article sender and asserts the header on what it sent.)
 *
 * Planted: the GET acting again, the 503 back to 200, and one cron's send
 * dropping the person. All three fail it.
 */
import { readFileSync } from 'node:fs';
import { SITE_URL } from '../api/_lib/site.js';
import { unsubscribeUrl, listUnsubscribeHeaders } from '../api/_lib/email-footer.js';

Object.assign(process.env, { SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_KEY: 'k' });
const ROOT = new URL('..', import.meta.url).pathname;
const { default: unsubscribe } = await import('../api/unsubscribe.js');
const UID = '11111111-1111-4111-8111-111111111111';
const TOKEN = '22222222-2222-4222-8222-222222222222';

async function hit(method, query, dbStatus = 204) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => { calls.push({ url: decodeURIComponent(String(url)), m: init.method || 'GET', body: init.body }); return new Response(null, { status: dbStatus }); };
  const quiet = console.error; console.error = () => {};
  const r = await unsubscribe(new Request(`${SITE_URL}/api/unsubscribe?${query}`, { method, ...(method === 'POST' ? { body: 'List-Unsubscribe=One-Click', headers: { 'content-type': 'application/x-www-form-urlencoded' } } : {}) }));
  console.error = quiet;
  return { status: r.status, html: await r.text(), calls };
}

const fails = [];
const acct = unsubscribeUrl(UID).split('?')[1];
for (const [what, q] of [['an account', acct], ['the In Practice list', `articles=${TOKEN}`]]) {
  const g = await hit('GET', q);
  if (g.calls.length) fails.push(`opening the link for ${what} wrote to the database (${g.calls.length} call); a mail scanner opening it unsubscribes the person`);
  const form = g.html.match(/<form method="post" action="([^"]+)"/);
  if (!form) fails.push(`opening the link for ${what} drew no form that posts`);
  else if (form[1].replace(/&amp;/g, '&') !== `/api/unsubscribe?${q}`) fails.push(`the form for ${what} posts to ${form[1]}, not back to its own address`);
}
const pa = await hit('POST', acct);
if (pa.status !== 200 || !pa.calls.some((c) => c.m === 'PATCH' && c.url.includes(`profiles?id=eq.${UID}`) && /"email_opt_in":false/.test(c.body))) fails.push(`a POST for an account answered ${pa.status} and did not turn off its emails`);
const pl = await hit('POST', `articles=${TOKEN}`);
if (pl.status !== 200 || !pl.calls.some((c) => c.m === 'PATCH' && c.url.includes(`article_subscribers?token=eq.${TOKEN}`))) fails.push(`a POST for the In Practice list answered ${pl.status} and did not take the row off`);
for (const [what, q] of [['an account', acct], ['the In Practice list', `articles=${TOKEN}`]]) {
  const d = await hit('POST', q, 500);
  if (d.status !== 503) fails.push(`a POST for ${what} the database refused answered ${d.status}; a mail app's one-click request reads only the status`);
}

const h = listUnsubscribeHeaders(unsubscribeUrl(UID));
if (h['List-Unsubscribe'] !== `<${unsubscribeUrl(UID)}>` || h['List-Unsubscribe-Post'] !== 'List-Unsubscribe=One-Click') fails.push(`listUnsubscribeHeaders answered ${JSON.stringify(h)}`);
if (listUnsubscribeHeaders('mailto:x@example.com')['List-Unsubscribe-Post']) fails.push('a mailto was given the one-click POST header, which it cannot answer');

for (const [file, who] of [['api/cron-checkin.js', 'user'], ['api/cron-survey-nudge.js', 'u']]) {
  const src = readFileSync(`${ROOT}${file}`, 'utf8').replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, '');
  const sends = src.match(/await sendEmail\([^)]*\)/g) || [];
  const withPerson = sends.filter((c) => new RegExp(`,\\s*${who}\\.id\\)$`).test(c));
  if (!sends.length) fails.push(`${file}: no sendEmail call found; the gate has lost its subject`);
  if (withPerson.length !== sends.length) fails.push(`${file}: ${sends.length - withPerson.length} of ${sends.length} sends do not pass the person, so their email has no one-click unsubscribe`);
  if (!/body: JSON\.stringify\(\{ from:[^\n]*headers: listUnsubscribeHeaders\(unsubscribeUrl\(userId\)\)/.test(src)) fails.push(`${file}: the Resend request does not carry listUnsubscribeHeaders`);
}

if (fails.length) {
  console.error('[check-unsubscribe-asks] ' + fails.length + ' problem(s):');
  for (const f of fails) console.error('  ' + f);
  process.exit(1);
}
console.log('[check-unsubscribe-asks] opening an unsubscribe link (account or In Practice) writes nothing and asks; a POST does it, and a refused one answers 503; the check-in and survey-nudge sends each carry one-click unsubscribe headers for their person.');
