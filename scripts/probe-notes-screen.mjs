#!/usr/bin/env node
/**
 * The Notes tab, driven for real, with data behind it.
 *
 * ── WHY THIS IS A PROBE AND NOT A GATE ────────────────────────────────────
 * It needs the Expo web server running and one line of src/app/_layout.tsx
 * swapped for a host that mounts this screen, because the layout renders
 * <AppTabs /> rather than a router slot. A check that edits app source and
 * restores it is a check that leaves the repo modified when it crashes, and
 * CLAUDE.md has five instances of that costing real work. So this is named
 * probe-, stays out of `npm run check`, and is run by hand:
 *
 *   npx expo start --web --port 8099
 *   (swap <AppTabs /> for a host that renders src/app/notes, see below)
 *   cd /Users/Ellie/Projects/unison && node scripts/probe-notes-screen.mjs
 *
 * ── WHAT IT ESTABLISHED ───────────────────────────────────────────────────
 * Ellie asked that Notes load three marks and nothing else, with ten behind a
 * tap and a tag's contents only when that tag opens. check-notes-paging proves
 * the endpoint's half. This proved the screen's, which no gate here can see:
 *
 *   on arrival          /api/notes?action=tags, /api/home, /api/notes?limit=3
 *   full list opened    /api/notes?action=list&limit=10
 *   tag opened          /api/notes?action=list&limit=10&tagId=t1
 *
 * and the four figures that moved off the phone and onto the payload all drew
 * from the payload: 212 recent, 37 shared with 9 unread, a 5 day streak, and
 * 14 against the tag. Counted on the phone, each would have read 2, 2, 2 and 3.
 *
 * It also answered the question the lazy-tab change raised, which reading
 * cannot: every screen now loads from useFocusEffect and nothing loads on
 * mount, so if that effect does not fire for the focused screen the tab is a
 * spinner for ever. Signed out it reaches the sign-in screen, which proves the
 * load ran, reached the server and reported back.
 *
 * ── TWO TRAPS, BOTH OF WHICH COST A RUN ───────────────────────────────────
 * `request()` returns unauthorized without fetching when there is no token, so
 * a stub installed over fetch answers nothing until the session module holds
 * one. expo-secure-store is not localStorage on web, so it cannot be seeded
 * from the browser: the probe host calls setToken, which caches in memory.
 *
 * And the stub is injected as a template literal, so every backslash in it
 * needs doubling. `/\/api\//` written with single backslashes becomes `//`,
 * which is a line comment, which silently removed the rest of the stub and
 * left the screen reporting "You're offline".
 */

import { launch } from '/Users/Ellie/Projects/unison/scripts/_lib/browser.mjs';

const page = await launch({ width: 430, height: 950 });

await page.onNewDocument(`
  (() => {
    const note = (id, over) => Object.assign({
      id, owner_id: 'me', title: '', body: 'body ' + id, visibility: 'private',
      anchor_type: null, anchor_key: null, anchor_context: null, anchor_version: null,
      kind: 'note', color: null, opened_at: null,
      created_at: '2026-10-10T00:00:00Z', updated_at: '2026-10-1' + (id.length % 5) + 'T00:00:00Z',
      tagIds: ['t1'],
    }, over || {});

    const NOTES = {
      ok: true,
      notes: [note('n1'), note('n2')],
      annotations: [note('a1', { anchor_type: 'results_section', anchor_key: 'communication', anchor_context: 'a sentence', kind: 'highlight', color: 'butter' })],
      sharedWithMe: [note('s1', { owner_id: 'partner', visibility: 'shared', opened_at: null }),
                     note('s2', { owner_id: 'partner', visibility: 'shared', opened_at: '2026-10-12T00:00:00Z' })],
      counts: { marks: 212, shared: 37, unopened: 9, journal: 5 },
      tagStats: { t1: { count: 14, latest: Date.parse('2026-10-14') } },
      journalDays: ['2026-10-16','2026-10-15','2026-10-14','2026-10-13','2026-10-12'],
      limited: true,
    };
    const TAGS = { ok: true, tags: [{ id: 't1', name: 'communicating needs', color: null, standard_key: null, deleted_at: null }],
      sections: {}, standard: [], tagPlaceholder: 'Add a tag' };
    const HOME = { ok: true, partnerName: 'Spencer', state: { partnerLinked: true },
      word: { word: 'Repair', part: 'noun', definition: 'What you do after things go wrong.', usage: 'We did the repair.' },
      cards: [], alerts: [] };

    const real = window.fetch.bind(window);
    window.fetch = async (u, init) => {
      const url = String(u && u.url ? u.url : u);
      if (/\\/api\\//.test(url)) window.__asked.push(url.replace(/^https?:\\/\\/[^/]+/, ''));
      const body = /\\/api\\/notes/.test(url) ? NOTES
        : /\\/api\\/notes\\?action=tags|action=tags/.test(url) ? TAGS
        : /\\/api\\/home/.test(url) ? HOME
        : /\\/api\\//.test(url) ? { ok: true } : null;
      if (/action=tags/.test(url)) return new Response(JSON.stringify(TAGS), { status: 200, headers: { 'content-type': 'application/json' } });
      if (body) return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
      return real(u, init);
    };
    /* expo-secure-store on web is localStorage, under the key the module uses.
       Seeding it is what makes the client send a request at all: request()
       returns unauthorized without fetching when there is no token, which is
       why the first version of this probe rendered the sign-in screen with a
       perfectly good stub behind it. */
    try { window.localStorage.setItem('attune.session.token', 'probe-token-not-real'); } catch {}
    /* Record every request the screen makes, so "it only loads when opened"
       can be measured rather than asserted. */
    window.__asked = [];
    window.__errors = [];
    window.addEventListener('error', (e) => window.__errors.push(String(e.message)));
    window.addEventListener('unhandledrejection', (e) => window.__errors.push('rejection: ' + String(e.reason)));
  })();
`);

await page.goto('http://localhost:8099');
await page.wait(4000);

const snap = async (label) => {
  const out = await page.evaluate(() => {
    const t = (document.body.innerText || '').replace(/\s+/g, ' ').trim();
    return JSON.stringify({ chars: t.length, text: t.slice(0, 420), errors: window.__errors || [], asked: window.__asked || [] });
  });
  const d = JSON.parse(out);
  console.log(`\n── ${label}: ${d.chars} chars, ${d.errors.length} error(s)`);
  console.log('   requests so far:', d.asked.join('  '));
  console.log('   ' + d.text.slice(0, 300));
  return d;
};

await snap('on arrival');

/* The arrow on the Recent peek. Found by its accessibility label, which is the
   same string a screen reader reads. */
const clicked = await page.evaluate(() => {
  const pick = [...document.querySelectorAll('[aria-label]')]
    .find((el) => /see all/i.test(el.getAttribute('aria-label') || ''));
  if (!pick) return JSON.stringify({ ok: false, labels: [...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).slice(0, 14) });
  pick.click();
  return JSON.stringify({ ok: true, label: pick.getAttribute('aria-label') });
});
console.log('\nclicked:', clicked);
await page.wait(1800);
await snap('after opening the full list');

const tagClick = await page.evaluate(() => {
  const pick = [...document.querySelectorAll('[aria-label]')]
    .find((el) => /communicating needs/i.test(el.getAttribute('aria-label') || ''));
  if (!pick) return JSON.stringify({ ok: false });
  pick.click();
  return JSON.stringify({ ok: true, label: pick.getAttribute('aria-label') });
});
console.log('\nclicked the tag:', tagClick);
await page.wait(1800);
await snap('after opening the tag');
await page.close();
