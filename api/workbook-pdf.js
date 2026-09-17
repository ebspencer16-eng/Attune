/**
 * The workbook, as a PDF the app can show.
 *
 * ── WHY A PDF ─────────────────────────────────────────────────────────────
 * Ellie, of the HTML version: "This looks bad. I just want the PDF to be
 * viewable through the app. People can download and print or they can zoom
 * in." A converted web page is a web page; a PDF is the thing people expect a
 * workbook to be, and iOS shows one inside the app with zoom, share and print
 * already on it.
 *
 * ── WHAT IT IS MADE OF ────────────────────────────────────────────────────
 * The document that was actually generated. api/generate-workbook.js writes
 * the .docx; this reads that file back, converts it, and sets it in the
 * product's own faces. There is no second copy of the workbook's words and
 * nothing to keep in step. See api/_lib/workbook-doc.js for what survives the
 * conversion and what does not.
 *
 * ── THE LINK IS THE CAPABILITY ────────────────────────────────────────────
 * It takes the signed storage URL the app already holds, minted per request by
 * api/_lib/workbook-link.js and good for an hour. Whoever can read the file
 * can read this, and nobody else. The URL is checked against the project's own
 * storage origin before anything is fetched: without that this is a
 * fetch-anything-you-like endpoint running on our domain.
 */

export const config = { runtime: 'nodejs' };

import { readFileSync } from 'node:fs';
import mammoth from 'mammoth';
/**
 * pdfmake 0.3 moved the printer.
 *
 * The package's own entry exports its virtual filesystem helpers; the class
 * that turns a document definition into a PDF is its own module. Importing the
 * package and calling it as a constructor fails at runtime rather than at
 * build, which is exactly the shape of failure this codebase keeps writing
 * gates about, so it is imported by name.
 */
/**
 * pdfmake, pinned to 0.2.
 *
 * 0.3 rearranged the package for the browser: its entry exports virtual
 * filesystem helpers, the printer moved into its own module, and that printer
 * returns a promise and expects a URL resolver the package entry sets up. All
 * of that fails at request time rather than at build, which is the shape of
 * failure this codebase keeps writing gates about. 0.2 is the server API:
 * construct with the fonts, get a stream back.
 */
import PdfPrinter from 'pdfmake';

import { workbookDocDefinition, TABLE_LAYOUT } from './_lib/workbook-doc.js';

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

/**
 * The faces, embedded.
 *
 * A PDF carries its own type, so these have to be in the file. They are the
 * app's own font files, copied to api/_fonts because a serverless function
 * cannot reach into the app's asset folder. Italics are mapped to the regular
 * face: pdfmake insists on all four, and there is no italic file here, so
 * italic passages come through upright rather than synthetically slanted.
 */
const face = (name) => readFileSync(new URL(`./_fonts/${name}`, import.meta.url));
let fonts = null;
function printer() {
  if (!fonts) {
    fonts = {
      DMSans: {
        normal: face('DMSans-Regular.ttf'),
        bold: face('DMSans-Bold.ttf'),
        italics: face('DMSans-Regular.ttf'),
        bolditalics: face('DMSans-Bold.ttf'),
      },
      Playfair: {
        normal: face('PlayfairDisplay-Bold.ttf'),
        bold: face('PlayfairDisplay-Bold.ttf'),
        italics: face('PlayfairDisplay-Bold.ttf'),
        bolditalics: face('PlayfairDisplay-Bold.ttf'),
      },
    };
  }
  return new PdfPrinter(fonts);
}

export default async function handler(req, res) {
  const file = String(req.query?.file || '');
  if (!file || !storageOriginAllowed(file)) {
    return res.status(400).json({ error: 'That workbook link cannot be opened. Ask for it again in the app.' });
  }

  try {
    const fetched = await fetch(file);
    if (!fetched.ok) {
      return res.status(404).json({ error: 'That workbook link has expired. Ask for it again in the app.' });
    }
    const buffer = Buffer.from(await fetched.arrayBuffer());
    const { value } = await mammoth.convertToHtml({ buffer });

    const doc = printer().createPdfKitDocument(
      workbookDocDefinition(String(value || '')),
      { tableLayouts: { attune: TABLE_LAYOUT } },
    );

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    const done = new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);
    });
    doc.end();
    await done;

    res.setHeader('Content-Type', 'application/pdf');
    // Inline, so the phone shows it rather than offering to save it, and
    // private, because it is one couple's document behind an hourly link.
    res.setHeader('Content-Disposition', 'inline; filename="attune-workbook.pdf"');
    res.setHeader('Cache-Control', 'private, max-age=0, no-store');
    return res.status(200).send(Buffer.concat(chunks));
  } catch (e) {
    console.warn('[workbook-pdf] could not build', e?.message);
    return res.status(500).json({ error: 'The workbook could not be opened. The file itself is still in the app.' });
  }
}
