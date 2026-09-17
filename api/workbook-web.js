/**
 * The workbook, as a page.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Ellie: "Can it open as a page in the app?" The workbook is a Word document,
 * built by api/generate-workbook.js out of docx paragraphs and tables, and
 * nothing in the app can draw one. Handing the file to iOS works, but it reads
 * as being thrown out of the product to read your own workbook.
 *
 * She chose the middle option: "Web version of the workbook opening in an
 * in-app experience is ok for now."
 *
 * ── WHY IT CONVERTS RATHER THAN RE-RENDERS ────────────────────────────────
 * The obvious build is a second renderer over the same payload: HTML where the
 * generator writes docx. That is two and a half thousand lines of layout kept
 * in step by hand, which is the failure this codebase is organised against,
 * and the first couple to get a workbook whose web version says something else
 * would never know which one was right.
 *
 * So this converts the document that was actually generated. There is one
 * workbook; this is that workbook, with our type and colours on it. A change
 * to the generator shows up here with nothing to update.
 *
 * ── THE LINK IS THE CAPABILITY ────────────────────────────────────────────
 * It takes the signed storage URL the app already holds, which is minted per
 * request by api/_lib/workbook-link.js and expires in an hour. No new way in:
 * whoever can read the file can read this page, and nobody else.
 *
 * The URL is checked against the Supabase project's own origin before anything
 * is fetched. Without that this is a fetch-anything-you-like endpoint running
 * on our domain, which is the bug this kind of handler is famous for.
 */

export const config = { runtime: 'nodejs' };

import mammoth from 'mammoth';

/** Only the project's own storage. Anything else is a probe. */
function storageOriginAllowed(url) {
  const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  if (!base) return false;
  try {
    const want = new URL(base);
    const got = new URL(url);
    return got.protocol === 'https:'
      && got.hostname === want.hostname
      && got.pathname.includes('/storage/v1/object/');
  } catch {
    return false;
  }
}

/** The page's own type and colours, so it reads as Attune rather than as Word. */
const STYLE = `
  :root {
    --ink: #1E1610; --muted: #8C7A68; --cream: #FFFDF9; --warm: #FBF8F3;
    --stone: #E8DDD0; --orange: #E8673A; --indigo: #1B5FE8;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--cream); color: var(--ink);
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 16px; line-height: 1.7; -webkit-text-size-adjust: 100%;
  }
  main { max-width: 44rem; margin: 0 auto; padding: 2rem 1.25rem 5rem; }
  h1, h2, h3, h4 { font-family: 'Playfair Display', Georgia, serif; line-height: 1.2; }
  h1 { font-size: 2rem; margin: 2.5rem 0 1rem; }
  h2 { font-size: 1.5rem; margin: 2.25rem 0 0.75rem; }
  h3 { font-size: 1.15rem; margin: 1.75rem 0 0.5rem; }
  h4 { font-size: 1rem; margin: 1.5rem 0 0.5rem; }
  p { margin: 0 0 1rem; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  ul, ol { padding-left: 1.25rem; margin: 0 0 1rem; }
  li { margin: 0 0 0.4rem; }
  /* The document lays a lot out in tables. On a phone they have to scroll
     rather than squeeze, or every cell becomes two characters wide. */
  .table-wrap { overflow-x: auto; margin: 0 0 1.25rem; -webkit-overflow-scrolling: touch; }
  table { border-collapse: collapse; width: 100%; font-size: 0.9rem; }
  td, th { border: 1px solid var(--stone); padding: 0.5rem 0.65rem; vertical-align: top; text-align: left; }
  tr:nth-child(even) td { background: var(--warm); }
  img { max-width: 100%; height: auto; }
  hr { border: 0; border-top: 1px solid var(--stone); margin: 2rem 0; }
  /* ── THE DOCUMENT'S OWN HEADINGS ────────────────────────────────────────
     Fourteen of the workbook's headings are real Word headings and the rest
     are big bold runs in ordinary paragraphs, which is fine in Word and comes
     through here as a paragraph containing nothing but bold text. Styling that
     shape gives those lines back their weight without guessing at anything:
     a bold run inside a sentence is not :only-child. */
  p > strong:only-child {
    display: block; font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.15rem; line-height: 1.3; margin: 1.75rem 0 0.25rem;
  }
  .masthead {
    border-bottom: 1px solid var(--stone); padding: 1.25rem 1.25rem 1rem;
    font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase;
    color: var(--muted); background: var(--warm);
  }
  .fail { padding: 3rem 1.5rem; text-align: center; color: var(--muted); }
`;

const page = (title, inner) => `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
<style>${STYLE}</style>
</head><body>
<div class="masthead">Attune · Your workbook</div>
<main>${inner}</main>
</body></html>`;

export default async function handler(req, res) {
  const file = String(req.query?.file || '');
  if (!file || !storageOriginAllowed(file)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send(page('Workbook',
      '<div class="fail"><p>This link cannot be opened. Ask for the workbook again from the app and it will mint a new one.</p></div>'));
  }

  try {
    const fetched = await fetch(file);
    if (!fetched.ok) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(404).send(page('Workbook',
        '<div class="fail"><p>That workbook link has expired. Ask for it again from the app.</p></div>'));
    }
    const buffer = Buffer.from(await fetched.arrayBuffer());
    const { value } = await mammoth.convertToHtml({ buffer });
    // Tables scroll rather than squeeze on a phone, so each one is wrapped.
    const body = String(value || '').replace(/<table/g, '<div class="table-wrap"><table')
      .replace(/<\/table>/g, '</table></div>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Private: this is one couple's document, minted for one hour.
    res.setHeader('Cache-Control', 'private, max-age=0, no-store');
    return res.status(200).send(page('Your workbook', body));
  } catch (e) {
    console.warn('[workbook-web] could not render', e?.message);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(page('Workbook',
      '<div class="fail"><p>The workbook could not be opened as a page. The file itself is still in the app.</p></div>'));
  }
}
