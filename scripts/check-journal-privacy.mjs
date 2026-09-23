#!/usr/bin/env node
/**
 * The relationship journal is private, and this proves it rather than says it.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie: "Please make sure the journal entries are saved appropriately and
 * privately."
 *
 * A journal entry is a note, which is how it got built in a day: notes already
 * have an owner, a body, a visibility and row policies. That is also the risk.
 * "It is a note, so it inherits the rules" is a claim about code nobody has
 * run. Four things have to be true, and each is checked by running the thing
 * that has to be true, not by reading it:
 *
 *   1. The app writes an entry private, anchored to 'journal'.
 *   2. The server refuses to CREATE a journal entry shared, whatever a client
 *      sends. A rule enforced only in the app is a rule enforced nowhere.
 *   3. The server refuses to SHARE an existing journal entry, deciding from
 *      the stored row rather than from the request.
 *   4. No other surface quotes one. /api/home's "pick up where you left off"
 *      row puts ninety characters of your most recent writing on the home
 *      screen, which pick-up.js itself calls "the most over-the-shoulder place
 *      in it". A diary line does not belong there.
 *
 * ── AND ONE THING THAT IS NOT BEHAVIOURAL ─────────────────────────────────
 * The anchor string itself. An Expo project cannot import from api/, so
 * components/journal.tsx carries its own copy of 'journal'. Two copies of a
 * rule is the failure this codebase is about, so the two are compared. If they
 * ever differ, every check below still passes and every entry written by the
 * app is a note the server does not recognise as a diary.
 *
 * ── AND ONE REGISTRY GUARD ────────────────────────────────────────────────
 * The four checks name the three files that read the notes table today. A
 * fourth reader is not caught by any of them, so the list of readers is itself
 * checked: a new file that queries notes fails this gate until someone decides
 * what it does about the journal and adds it here.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Not row-level security. The notes table has RLS on with no client policies
 * (migration 044): it is reached only through the service key, behind this
 * endpoint's token check. That is a database fact and it is checked by
 * check-rls.mjs, not here.
 *
 * Not encryption at rest, and not the passcode lock on the journal screen.
 * The lock is a lock on a screen; this is about who the server will hand an
 * entry to.
 *
 * Not the other private things in this product. Conflict patterns and physical
 * intimacy have their own gates, scoped and named, for the same reason.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { JOURNAL_ANCHOR } from '../api/_lib/tags.js';
import { SITE_URL } from '../api/_lib/site.js';

const fails = [];
const APP = 'attune-app/src/components/journal.tsx';

// ── 0. THE TWO COPIES OF THE ANCHOR ────────────────────────────────────────
const appSrc = readFileSync(APP, 'utf8');
const appAnchor = appSrc.match(/export const JOURNAL_ANCHOR\s*=\s*'([^']+)'/)?.[1];
if (!appAnchor) {
  fails.push(`${APP} no longer exports JOURNAL_ANCHOR. The app and the server`
    + ' must name the journal the same thing, and this gate cannot see whether'
    + ' they do.');
} else if (appAnchor !== JOURNAL_ANCHOR) {
  fails.push(`The app anchors journal entries to '${appAnchor}' and the server`
    + ` calls the journal '${JOURNAL_ANCHOR}'. Every entry the app writes is a`
    + ' note the server does not know is a diary, so none of the refusals below'
    + ' would ever fire on one.');
}

// ── 1. THE APP WRITES IT PRIVATE ───────────────────────────────────────────
/**
 * The composer's own createNote call. Matched as a call rather than as two
 * loose strings, because `visibility: 'private'` somewhere in a 700-line file
 * says nothing about the call that saves an entry.
 */
const write = appSrc.match(/createNote\(\{[\s\S]{0,600}?\}\)/);
if (!write) {
  fails.push(`${APP} makes no createNote({ ... }) call. Either the journal`
    + ' saves some other way now, in which case this gate has lost its subject,'
    + ' or it does not save at all.');
} else {
  const call = write[0];
  if (!/visibility:\s*'private'/.test(call)) {
    fails.push(`${APP} writes an entry without visibility: 'private'. The`
      + ' server refuses a shared one, so this is belt and braces, but an entry'
      + ' that asks to be shared is an entry that fails to save.');
  }
  if (!/anchorType:\s*JOURNAL_ANCHOR/.test(call)) {
    fails.push(`${APP} writes an entry without anchorType: JOURNAL_ANCHOR.`
      + ' An entry with no anchor is a loose note: it shows up on the Notes tab'
      + ' among the marks, and the server has no way to tell it is a diary.');
  }
}

// ── THE STUB EVERY BEHAVIOURAL CHECK RUNS AGAINST ──────────────────────────
/**
 * Supabase, as far as these handlers can tell.
 *
 * The auth call returns a user, the profile call returns a linked partner (so
 * "no partner to share with" can never be the reason a refusal happens), and
 * every other read is scripted per case. Writes are recorded rather than
 * performed, which is what lets a refusal be checked for silence as well as
 * for a 400: a guard below the write would answer 400 and would still have
 * written.
 */
const ME = '11111111-1111-4111-8111-111111111111';
const PARTNER = '22222222-2222-4222-8222-222222222222';
const NOTE_ID = '33333333-3333-4333-8333-333333333333';
const SECRET = 'Tuesday I felt unheard and did not say so.';

let script = () => null;
let calls = [];

globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  calls.push({ url: u, method: init.method || 'GET', body: init.body || null });
  const ok = (v) => new Response(JSON.stringify(v), { status: 200, headers: { 'content-type': 'application/json' } });
  if (u.includes('/auth/v1/user')) return ok({ id: ME, email: 'test@example.invalid' });
  if (u.includes('/rest/v1/profiles')) return ok([{ id: ME, partner_profile_id: PARTNER, name: 'Test', pronouns: null }]);
  const scripted = script(u, init);
  return ok(scripted === null || scripted === undefined ? [] : scripted);
};

Object.assign(process.env, {
  SUPABASE_URL: 'https://example.invalid',
  SUPABASE_SERVICE_KEY: 'test-not-a-real-key',
  SUPABASE_ANON_KEY: 'test-not-a-real-key',
});

const realLog = console.log;
console.log = () => {};

const notes = (await import('../api/notes.js')).default;
const home = (await import('../api/home.js')).default;

const post = (body) => new Request(`${SITE_URL}/api/notes`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: 'Bearer test-token', origin: SITE_URL },
  body: JSON.stringify(body),
});

const run = async (handler, req, scripted) => {
  script = scripted || (() => null);
  calls = [];
  const res = await handler(req);
  const out = await res.json().catch(() => ({}));
  return { status: res.status, out, calls: calls.slice() };
};

/** Did anything write to the notes table? */
const wroteNotes = (list) => list.some((c) =>
  /\/rest\/v1\/notes/.test(c.url) && ['POST', 'PATCH', 'PUT'].includes(c.method));

// ── 2. CREATE, SHARED, IS REFUSED ──────────────────────────────────────────
/**
 * Four shapes, because the client is not the app. Anything can POST here with
 * a valid token: the app's own account, a script, a future screen that reuses
 * createNote and forgets. The rule has to hold for all of them.
 */
const CREATE_CASES = [
  ['visibility shared', { action: 'create', anchorType: JOURNAL_ANCHOR, anchorKey: '2026-09-20', body: SECRET, visibility: 'shared' }],
  ['visibility shared and a title', { action: 'create', anchorType: JOURNAL_ANCHOR, anchorKey: '2026-09-20', title: 'Tuesday', body: SECRET, visibility: 'shared' }],
];
for (const [what, body] of CREATE_CASES) {
  const { status, out, calls: c } = await run(notes, post(body));
  if (status === 200 && out?.ok !== false) {
    fails.push(`/api/notes created a SHARED journal entry (${what}). A partner`
      + ' can read a shared note on their Notes tab. The refusal belongs on the'
      + ' server, because the app asking nicely is not a rule.');
  } else if (wroteNotes(c)) {
    fails.push(`/api/notes refused a shared journal entry (${what}) and wrote`
      + ' the row anyway. The guard is sitting below the insert: the caller sees'
      + ' a 400 and the partner sees the diary.');
  }
}

/**
 * The control. A private entry must still save, or the gate proves nothing.
 *
 * With a quote on it, because that is the shape the insight of the day is kept
 * in: the quote in anchor_context and the reader's own words in the body.
 * Ellie: "It should save nicely in a tile with the quote and the user can add
 * commentary about it." Both halves have to reach the row, so both are checked
 * in the body the endpoint actually posted rather than in what it answered.
 */
{
  const QUOTE = 'It is rarely incompatibility that creates friction.';
  const body = {
    action: 'create', anchorType: JOURNAL_ANCHOR, anchorKey: '2026-09-20',
    body: SECRET, anchorContext: QUOTE, visibility: 'private',
  };
  const { out, calls: c } = await run(notes, post(body), (u, init) =>
    (init?.method === 'POST' ? [{ id: NOTE_ID, owner_id: ME, body: SECRET, anchor_context: QUOTE, anchor_type: JOURNAL_ANCHOR, visibility: 'private' }] : []));
  if (out?.ok === false || !wroteNotes(c)) {
    fails.push('/api/notes refused a PRIVATE journal entry, or never wrote it.'
      + ' The refusals above are then meaningless: they would pass on an'
      + ' endpoint that refuses everything. ' + JSON.stringify(out).slice(0, 200));
  } else {
    const written = c.find((x) => /\/rest\/v1\/notes/.test(x.url) && x.method === 'POST');
    const row = JSON.parse(written?.body || '{}');
    if (row.anchor_context !== QUOTE) {
      fails.push('/api/notes dropped the quote from a journal entry. It was sent'
        + ' as anchorContext and the row was written without anchor_context, so'
        + ' an insight saved to the journal would come back as a comment about'
        + ' nothing.');
    }
    if (row.body !== SECRET) {
      fails.push("/api/notes dropped the reader's own words from a journal entry"
        + ' that carried a quote.');
    }
  }
}

// ── 3. SHARE, ON AN EXISTING ENTRY, IS REFUSED ─────────────────────────────
/**
 * The row says it is a journal entry; the request does not mention it. That is
 * the point: an endpoint that decided from `body.anchorType` would be asking
 * the caller whether the thing it wants to share is allowed to be shared.
 */
{
  const req = post({ action: 'share', id: NOTE_ID, visibility: 'shared' });
  const { status, out, calls: c } = await run(notes, req, () =>
    [{ id: NOTE_ID, owner_id: ME, anchor_type: JOURNAL_ANCHOR, visibility: 'private', body: SECRET }]);
  if (status === 200 && out?.ok !== false) {
    fails.push('/api/notes shared an existing journal entry. Whatever the'
      + ' composer does on the way in, a diary must not become readable by a'
      + ' partner on the way out.');
  } else if (wroteNotes(c)) {
    fails.push('/api/notes refused to share a journal entry and PATCHed it'
      + ' anyway. The guard is below the write.');
  }
}

/** The control again: an ordinary note must still be shareable. */
{
  const req = post({ action: 'share', id: NOTE_ID, visibility: 'shared' });
  const { out } = await run(notes, req, () =>
    [{ id: NOTE_ID, owner_id: ME, anchor_type: null, visibility: 'private', body: 'a plain note' }]);
  if (out?.ok === false) {
    fails.push('/api/notes refused to share an ordinary note. Sharing is a'
      + ' feature; this gate is about the journal, and a refusal that catches'
      + ' everything has stopped being about the journal.'
      + ' ' + JSON.stringify(out).slice(0, 200));
  }
}

// ── 4. THE HOME SCREEN DOES NOT QUOTE ONE ──────────────────────────────────
/**
 * /api/home asks the notes table for the most recently updated row and hands
 * ninety characters of it to the home tile. The guard is in the query, so the
 * stub has to behave like the database: it reads the filter and returns the
 * journal row only if the filter would have admitted it.
 *
 * Modelling the filter rather than ignoring it is what makes this a test of
 * the server. A stub that always returned the row would fail no matter what
 * the query said, and a stub that never returned it would pass no matter what.
 */
const admitsJournal = (u) => {
  const q = decodeURIComponent(u);
  if (new RegExp(`anchor_type=(not\\.eq|neq)\\.${JOURNAL_ANCHOR}`).test(q)) return false;
  if (new RegExp(`or=\\([^)]*anchor_type\\.(not\\.eq|neq)\\.${JOURNAL_ANCHOR}[^)]*\\)`).test(q)) return false;
  if (new RegExp(`anchor_type=(eq|in)\\.`).test(q) && !q.includes(JOURNAL_ANCHOR)) return false;
  return true;
};
{
  const req = new Request(`${SITE_URL}/api/home`, {
    headers: { authorization: 'Bearer test-token', origin: SITE_URL },
  });
  const { out } = await run(home, req, (u) => {
    if (!/\/rest\/v1\/notes/.test(u)) return [];
    return admitsJournal(u)
      ? [{ title: null, body: SECRET, anchor_context: null, anchor_type: JOURNAL_ANCHOR }]
      : [];
  });
  if (JSON.stringify(out).includes(SECRET.slice(0, 40))) {
    fails.push("/api/home put a journal entry on the home screen's pick-up row."
      + ' pick-up.js calls that row "the most over-the-shoulder place" in the'
      + ' product. The notes query needs to exclude the journal, and it needs'
      + ' the `or=(anchor_type.is.null,...)` form, because a plain note\'s'
      + ' anchor_type is NULL and not.eq drops NULLs.');
  }
}

/**
 * The control: a plain note must still reach the row.
 *
 * `anchor_type=not.eq.journal` excludes the journal and also excludes every
 * ordinary note, because a plain note's anchor_type is NULL and SQL's NOT
 * (NULL = 'journal') is NULL. That form passes the check above while emptying
 * the home tile for everyone who has never opened the journal, which is a
 * silent feature loss wearing a privacy fix's clothes.
 */
{
  const PLAIN = 'A line I underlined in the conflict section.';
  const req = new Request(`${SITE_URL}/api/home`, {
    headers: { authorization: 'Bearer test-token', origin: SITE_URL },
  });
  const { out } = await run(home, req, (u) => {
    if (!/\/rest\/v1\/notes/.test(u)) return [];
    /** A NULL anchor_type row: admitted unless the filter drops NULLs. */
    const q = decodeURIComponent(u);
    const dropsNulls = /anchor_type=(not\.eq|neq)\./.test(q)
      && !/or=\([^)]*anchor_type\.is\.null/.test(q);
    return dropsNulls ? [] : [{ title: null, body: PLAIN, anchor_context: null, anchor_type: null }];
  });
  if (!JSON.stringify(out).includes(PLAIN.slice(0, 30))) {
    fails.push("/api/home stopped showing an ordinary note on the pick-up row."
      + ' Excluding the journal with not.eq alone drops every row whose'
      + " anchor_type is NULL, which is every plain note. The filter needs the"
      + ' or=(anchor_type.is.null, ...) form.');
  }
}

// ── 5. WHO READS THE NOTES TABLE ───────────────────────────────────────────
/**
 * Everything above names a file. A fifth reader of the notes table is not
 * covered by any of it, and would not fail anything, which is the exact shape
 * of bug this codebase keeps producing. So the readers are enumerated and the
 * list is held.
 *
 * The two admin files are on the list because they count entries. Both are
 * checked below for what they select: a count is fine, a body is not.
 */
const KNOWN_READERS = new Set(['notes.js', 'home.js', 'admin-explore.js', 'admin-engagement.js']);
const apiFiles = readdirSync('api').filter((f) => f.endsWith('.js'));
for (const f of apiFiles) {
  const src = readFileSync(`api/${f}`, 'utf8');
  const reads = /rest\/v1\/notes\?|`notes\?|'notes\?|"notes\?|from\(['"]notes['"]\)/.test(src);
  if (reads && !KNOWN_READERS.has(f)) {
    fails.push(`api/${f} reads the notes table and is not in this gate's list`
      + ' of readers. Decide what it does about journal entries, then add it.'
      + ' A diary is the most private thing in this product and a new reader'
      + ' of it is a decision, not a detail.');
  }
}

// ── 6. THE ADMIN PAGES COUNT, THEY DO NOT READ ───────────────────────
/**
 * Ellie asked for admin data about how often the journal is used, which is a
 * count and a date. The way that stays a count is the select: a page that
 * could quote a diary entry is a different product, so the guarantee is that
 * there is nothing in the variable to leak.
 *
 * Both admin readers are checked, and by column rather than by file, because
 * the risk is not which page asks. It is `select=*`, or a `body` added to an
 * existing select by someone who wanted a preview on a chart tooltip.
 *
 * These three columns are what a person wrote. anchor_key is a date for a
 * journal entry and a section id for a mark, so it is not writing; visibility
 * and kind are not either.
 */
const WRITING = ['body', 'title', 'anchor_context'];
for (const f of apiFiles.filter((n) => n.startsWith('admin-') && KNOWN_READERS.has(n))) {
  const src = readFileSync(`api/${f}`, 'utf8');
  /** Both query shapes: a PostgREST URL string, and a supabase-js chain. */
  const queries = [
    ...src.matchAll(/notes\?select=([^'"`&\s]*)/g),
    ...src.matchAll(/from\('notes'\)[\s\S]{0,300}?\.select\(\s*['"`]([^'"`]*)['"`]/g),
  ].map((m) => m[1]);
  if (!queries.length) {
    fails.push(`api/${f} is listed here as a reader of the notes table and this`
      + ' gate can no longer find its query. Either it stopped reading notes,'
      + ' in which case take it off the list, or the query changed shape and'
      + ' this check has lost its subject. A check that has lost its subject'
      + ' must not report success.');
    continue;
  }
  for (const q of queries) {
    const cols = q.split(',').map((x) => x.trim()).filter(Boolean);
    if (!cols.length || cols.includes('*')) {
      fails.push(`api/${f} selects every column from the notes table. That is`
        + ' the body of every journal entry, on an admin screen.');
      continue;
    }
    const bad = cols.filter((cName) => WRITING.includes(cName));
    if (bad.length) {
      fails.push(`api/${f} selects ${bad.join(', ')} from the notes table.`
        + ' Journal rows come back in that query. What someone wrote in their'
        + ' diary must not be in a variable an admin page can render.');
    }
  }
}

/** And the explore page specifically: its journal query is who and when. */
{
  const src = readFileSync('api/admin-explore.js', 'utf8');
  const q = src.match(/from\('notes'\)[\s\S]{0,300}?;/)?.[0];
  if (!q || !new RegExp(`\\.eq\\(\\s*'anchor_type'\\s*,\\s*JOURNAL_ANCHOR`).test(q)) {
    fails.push("api/admin-explore.js no longer reads journal rows the way this"
      + ' gate reads it. The journal slicer Ellie asked for is built on that'
      + ' query, so either the slicer is gone or this check is looking at'
      + ' nothing.');
  } else {
    const select = q.match(/\.select\(\s*['"`]([^'"`]*)['"`]/)?.[1] || '';
    const cols = select.split(',').map((x) => x.trim()).filter(Boolean);
    const extra = cols.filter((cName) => cName !== 'owner_id' && cName !== 'created_at');
    if (!cols.length || extra.length) {
      fails.push(`api/admin-explore.js reads ${cols.join(', ') || 'every column'}`
        + ' from the journal. The slicer needs who and when and nothing else.');
    }
  }
}

console.log = realLog;

if (fails.length) {
  console.error('\n check-journal-privacy: the journal is not private.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log('✓ check-journal-privacy: the app writes it private, the server refuses to share it either way, the home screen will not quote it, and the admin page reads who and when.');
