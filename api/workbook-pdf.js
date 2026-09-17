/**
 * The workbook, as the PDF the website prints.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Ellie: "It shouldn't resize the web's pdf at all, this looks messed up."
 *
 * The app was opening public/workbook-render.html, which is the workbook the
 * website designs, and a phone showing a page laid out for paper is a page
 * squeezed onto a phone. A PDF is not: the viewer fits the page and the
 * document itself is untouched, which is what she has been asking for.
 *
 * ── HOW IT IS THE SAME PDF ────────────────────────────────────────────────
 * It prints the same page with the same print settings the website uses.
 * api/generate-pdf.js sends that page to Browserless with A4 and printBackground
 * when BROWSERLESS_TOKEN is set; the browser fallback prints the same page with
 * html2pdf. This renders it with headless Chrome, which is the same operation
 * without the paid service: one page, one set of print settings, one workbook.
 *
 * ── WHAT IT DOES NOT DO ───────────────────────────────────────────────────
 * It does not lay anything out. Every word and every rule on the page comes
 * from workbook-render.html. If the workbook changes there, it changes here,
 * which is the whole reason the app stopped building its own.
 */

export const config = { runtime: 'nodejs', maxDuration: 60 };

import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

import { SITE_URL } from './_lib/site.js';

/** Where Chrome is: the bundled one on the server, an installed one locally. */
async function browserOptions() {
  if (process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL) {
    return {
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    };
  }
  // Local: whatever Chrome this machine has, the same one the checks drive.
  const local = process.env.CHROME
    || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  return { args: ['--no-sandbox'], executablePath: local, headless: true };
}

export default async function handler(req, res) {
  const data = String(req.query?.data || '');
  if (!data) return res.status(400).json({ error: 'nothing to render' });

  // The page takes its payload in the query string, which is how the website
  // opens it too. Nothing else is accepted: this renders one page, ours.
  const target = `${SITE_URL}/workbook-render?data=${encodeURIComponent(data)}`;

  let browser = null;
  try {
    browser = await puppeteer.launch(await browserOptions());
    const page = await browser.newPage();
    /**
     * The paper's own size, in CSS pixels.
     *
     * The page lays itself out to the window, so printing it at Chrome's
     * default 800 by 600 put an A4 sheet around a 600 point tall cover: right
     * words, wrong proportions. A4 at 96dpi is 794 by 1123, which is the shape
     * the page was designed against.
     */
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.goto(target, { waitUntil: 'networkidle0', timeout: 45000 });
    // The page marks itself ready once its fonts and figures are drawn; the
    // Browserless path waits on the same class.
    await page.waitForSelector('.workbook-ready', { timeout: 15000 }).catch(() => {});
    /**
     * No margin here, because the page already has its own.
     *
     * Its print stylesheet sets `.page { padding: 0.75in 0.9in }`. Adding a
     * three quarter inch margin on top of that printed the cover as a narrow
     * column down the middle of the sheet with white all round it: the
     * document's own margins, twice. A full-bleed cover is the design, and it
     * only works if the sheet is the page.
     */
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      // The page says what a sheet is, in its own @page rule. Chrome's default
      // box is a few points smaller, which left a white band along the top and
      // side of a cover that is meant to bleed.
      preferCSSPageSize: true,
    });

    res.setHeader('Content-Type', 'application/pdf');
    // Inline, so the phone shows it rather than offering to save it. The
    // viewer's own share sheet is where saving and printing live.
    res.setHeader('Content-Disposition', 'inline; filename="Attune_Workbook.pdf"');
    res.setHeader('Cache-Control', 'private, max-age=0, no-store');
    return res.status(200).send(Buffer.from(pdf));
  } catch (e) {
    console.error('[workbook-pdf] could not render', e?.message);
    return res.status(500).json({ error: 'The workbook could not be rendered just now.' });
  } finally {
    // Chrome outlives the request otherwise, and a function that leaks a
    // browser runs out of memory on its third invocation.
    if (browser) await browser.close().catch(() => {});
  }
}
