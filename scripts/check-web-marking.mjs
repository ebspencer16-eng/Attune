#!/usr/bin/env node
/**
 * Selecting a sentence on the website makes a mark, and the mark comes back.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Ellie: "Confirm note taking and mark making functions properly in the online
 * experience."
 *
 * It could not be confirmed by looking. Marking is `enabled={!isDemo}` on the
 * results page, which is right — there is no account in a demo to save to — so
 * the one path that renders results without signing in is the one path with
 * marking switched off. Every browser check in this repo runs signed out.
 *
 * And the stakes are known. The app's half of this was broken for months with
 * nothing failing: /api/notes answers with `notes` and `annotations`, the
 * screen read `notes`, and so no highlight, no underline and no margin marker
 * had ever drawn on a results page on any account. Nothing failed because a
 * real list was being read; it was the wrong real list.
 *
 * ── WHAT IT DRIVES ────────────────────────────────────────────────────────
 * The real module. ResultsMarkingLayer and MarkToolbar out of src/notes-web.jsx
 * are bundled with esbuild and mounted over a paragraph, with /api/notes
 * stubbed so the write is observable rather than real. Then: select, release,
 * read the toolbar, pick Highlight, pick a colour, save. Three things are
 * checked, and they are the three that were separately broken at some point:
 *
 *   1. the toolbar appears on a release, with all five actions
 *   2. the save reaches /api/notes as a `create` carrying the selected text
 *      verbatim as the anchor, which is what both surfaces match on
 *   3. a mark handed back to the layer is painted onto the words
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The endpoint. The write is stubbed here; api/notes.js is covered by
 * check-notes-parity and check-journal-privacy. This is about the half between
 * a cursor and the request.
 *
 * It also says nothing about the Notes page itself, which lists what was
 * written. That is a different surface and a different check.
 */

import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';

import { launch } from './_lib/browser.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

const dir = mkdtempSync(join(tmpdir(), 'attune-marking-'));

/**
 * A page with one paragraph and the real marking layer over it.
 *
 * The paragraph's words are the subject: the anchor a mark carries has to be
 * the text that was selected, character for character, because that is what
 * paints it back on a page whose copy is regenerated.
 */
const SENTENCE = 'Sarah moves toward resolution quickly and James needs a pause before he can.';

const harness = `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ResultsMarkingLayer } from ${JSON.stringify(`${ROOT}src/notes-web.jsx`)};

function Harness() {
  const [marks, setMarks] = useState([]);
  window.__marks = marks;
  window.__paint = (m) => setMarks((prev) => [m, ...prev]);
  return React.createElement(
    ResultsMarkingLayer,
    {
      section: 'couple-type',
      partnerName: 'James',
      marks,
      enabled: true,
      onSaved: (n) => setMarks((prev) => [n, ...prev]),
    },
    React.createElement('div', { 'data-results-scroll': '' },
      React.createElement('p', { id: 'subject' }, ${JSON.stringify(SENTENCE)})),
  );
}
createRoot(document.getElementById('root')).render(React.createElement(Harness));
`;

try {
  /**
   * The session, stubbed at the module boundary.
   *
   * notes-web's `call` asks ./supabase.js for an access token and returns
   * `signed-out` before it fetches anything when there is none, which is right
   * and is why this cannot be driven any other way. The stub is the smallest
   * thing that satisfies it: a token. Everything downstream of the request is
   * still the real module.
   */
  await build({
    plugins: [{
      name: 'stub-supabase',
      setup(b) {
        b.onResolve({ filter: /(^|\/)supabase\.js$/ }, () => ({ path: 'stub-supabase', namespace: 'stub' }));
        b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
          contents: 'export const hasSupabase = true;'
            + ' export const supabase = { auth: { getSession: async () =>'
            + ' ({ data: { session: { access_token: "test-token" } } }) } };',
          loader: 'js',
        }));
      },
    }],
    stdin: { contents: harness, resolveDir: ROOT, loader: 'jsx', sourcefile: 'harness.jsx' },
    bundle: true,
    format: 'iife',
    outfile: join(dir, 'harness.js'),
    loader: { '.jsx': 'jsx' },
    /* The automatic runtime, because notes-web.jsx writes JSX without importing
       React, the way every file in src/ does. The classic transform emits
       React.createElement into a module that never named React. */
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'silent',
  });
} catch (e) {
  console.error('[check-web-marking] the marking layer would not bundle, so nothing was driven:'
    + `\n  ${String(e.message || e).split('\n').slice(0, 4).join('\n  ')}`
    + '\n  Refusing to pass: a gate that has lost its subject must never report success.');
  rmSync(dir, { recursive: true, force: true });
  process.exit(1);
}

writeFileSync(join(dir, 'harness.html'), `<!doctype html><meta charset="utf-8">
<body style="margin:0;font-family:system-ui">
<div id="root"></div>
<script>
  window.onerror = function (m) { window.__err = String(m); };
  window.__calls = [];
  const real = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = (url, opts) => {
    const u = typeof url === 'string' ? url : (url && url.url) || '';
    let body = null;
    try { body = opts && opts.body ? JSON.parse(opts.body) : null; } catch (e) {}
    window.__calls.push({ u, body });
    const payload = u.indexOf('action=tags') !== -1 ? { tags: [] } : { ok: true, note: body };
    return Promise.resolve(new Response(JSON.stringify(payload), {
      status: 200, headers: { 'Content-Type': 'application/json' } }));
  };
</script>
<script src="./harness.js"></script>
`);

/*
 * Served rather than opened from disk. A file:// page reports every script
 * failure as the string "Script error." with no message and no line, so the
 * first version of this could say the harness had not rendered and nothing
 * about why. One origin, and the error is the error.
 */
const server = createServer((req, res) => {
  const name = (req.url || '/').split('?')[0] === '/' ? '/harness.html' : req.url.split('?')[0];
  try {
    const body = readFileSync(join(dir, name.replace(/^\//, '')));
    res.writeHead(200, { 'Content-Type': name.endsWith('.js') ? 'text/javascript' : 'text/html' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('no');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const page = await launch({ width: 1000, height: 700 });
const errors = [];
try {
  await page.goto(`http://127.0.0.1:${PORT}/harness.html`);
  await page.wait(700);

  const mounted = await page.evaluate(() => !!document.getElementById('subject'));
  if (!mounted) {
    const why = await page.evaluate(() => ({
      body: document.body.innerHTML.slice(0, 200),
      err: window.__err || null,
    }));
    console.error('[check-web-marking] the harness did not render, so nothing was driven.'
      + `\n  ${JSON.stringify(why)}`
      + ' Refusing to pass: a gate that has lost its subject must never report success.');
    server.close();
    process.exit(1);
  }

  // ── 1. A release over a selection brings the toolbar up ────────────────────
  const picked = await page.evaluate(() => {
    const p = document.getElementById('subject');
    const r = document.createRange();
    r.setStart(p.firstChild, 0);
    r.setEnd(p.firstChild, p.firstChild.textContent.length);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
    const box = r.getBoundingClientRect();
    document.dispatchEvent(new MouseEvent('mouseup', {
      bubbles: true, clientX: box.left + 4, clientY: box.bottom,
    }));
    return String(s);
  });
  await page.wait(400);

  const toolbar = await page.evaluate(() => {
    const panel = [...document.querySelectorAll('div')].find((d) => {
      const cs = getComputedStyle(d);
      return cs.position === 'fixed' && cs.zIndex === '60';
    });
    if (!panel) return null;
    return [...panel.querySelectorAll('button')]
      .map((b) => (b.getAttribute('aria-label') || b.textContent || '').trim());
  });

  if (!toolbar) {
    fails.push('releasing a selection brought up no toolbar, so nothing on the website can be'
      + ' marked at all.');
  } else {
    for (const want of ['Highlight', 'Underline', 'Tag', 'Note', 'Share']) {
      if (!toolbar.some((t) => t.includes(want))) {
        fails.push(`the toolbar has no ${want}. It offers: ${toolbar.join(', ') || '(nothing)'}.`);
      }
    }
  }

  // ── 2. Saving a highlight reaches the endpoint, anchored on the words ──────
  if (toolbar) {
    await page.evaluate(() => {
      const panel = [...document.querySelectorAll('div')]
        .find((d) => getComputedStyle(d).position === 'fixed' && getComputedStyle(d).zIndex === '60');
      const b = [...panel.querySelectorAll('button')]
        .find((x) => (x.getAttribute('aria-label') || x.textContent || '').trim().includes('Highlight'));
      if (b) b.click();
    });
    await page.wait(250);
    await page.evaluate(() => {
      const panel = [...document.querySelectorAll('div')]
        .find((d) => getComputedStyle(d).position === 'fixed' && getComputedStyle(d).zIndex === '60');
      const go = [...panel.querySelectorAll('button')]
        .find((x) => (x.textContent || '').trim() === 'Highlight it');
      if (go) go.click();
    });
    await page.wait(600);

    if (process.env.MARK_DEBUG) {
      console.log('panel after Highlight:', JSON.stringify(await page.evaluate(() => {
        const panel = [...document.querySelectorAll('div')]
          .find((d) => getComputedStyle(d).position === 'fixed' && getComputedStyle(d).zIndex === '60');
        return panel ? panel.innerText : '(no panel)';
      })));
    }

    const calls = await page.evaluate(() => window.__calls || []);
    const create = calls.find((c) => c.body && c.body.action === 'create');
    if (!create) {
      fails.push('saving a highlight sent no create to /api/notes. It sent:'
        + ` ${calls.map((c) => (c.body && c.body.action) || c.u).join(', ') || 'nothing'}.`);
    } else {
      const ctx = create.body.anchorContext || create.body.anchor_context || '';
      if (!ctx.includes('Sarah moves toward resolution')) {
        fails.push('the saved highlight does not carry the selected words as its anchor:\n'
          + `      sent: ${JSON.stringify(String(ctx).slice(0, 70))}\n`
          + '      Both surfaces match a mark back onto a page by its text. Without it the mark\n'
          + '      is written and can never be painted.');
      }
      if (create.body.kind !== 'highlight' && create.body.annotationKind !== 'highlight') {
        fails.push(`the saved mark is not a highlight: ${JSON.stringify(create.body).slice(0, 120)}`);
      }
    }
  }

  // ── 3. A mark handed back is painted on the words ─────────────────────────
  const painted = await page.evaluate((sentence) => {
    /* The row's own column names, which is what usePaintedMarks reads:
       anchor_type 'results_section', and `kind`/`color` rather than the
       annotation_* names the app's payload uses. Getting this wrong is the
       whole bug this check is about, one level up. */
    window.__paint({
      id: 'planted',
      anchor_type: 'results_section',
      anchor_key: 'couple-type',
      anchor_context: sentence,
      kind: 'highlight',
      color: 'butter',
      body: '',
    });
    return new Promise((res) => setTimeout(() => {
      const p = document.getElementById('subject');
      res({
        marks: p.querySelectorAll('mark').length,
        painted: !!p.querySelector('mark, [data-attune-mark]'),
        html: p.innerHTML.slice(0, 120),
      });
    }, 500));
  }, SENTENCE);

  if (!painted.painted) {
    fails.push('a mark handed to the layer was not drawn on the words:\n'
      + `      ${painted.html}\n`
      + '      This is the shape that was broken in the app for months with nothing failing:\n'
      + '      the list was real and it was the wrong list.');
  }

  if (errors.length) fails.push(`the page threw: ${errors.slice(0, 2).join(' | ')}`);
} finally {
  await page.close();
  server.close();
  rmSync(dir, { recursive: true, force: true });
}

if (fails.length) {
  console.error('\n check-web-marking: marking on the website does not work end to end.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log('[check-web-marking] a release brings up the toolbar with all five actions, saving a'
  + ' highlight reaches /api/notes anchored on the selected words, and a mark handed back is'
  + ' painted onto them.');
