#!/usr/bin/env node
/**
 * A reader is handed a workbook, or nothing. Never a different document.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * Ellie: "I tried to access the workbook on the site and it said builder is not
 * responding, then I tried on the app simulator and it still downloaded the
 * docx version."
 *
 * Two builders wrote into one folder, `workbooks/<orderNum>/`, and one column
 * recorded the result without recording which of them made it. A comment in
 * store-workbook-pdf.js claimed they were kept apart, and they never were.
 * `freshWorkbookUrl` listed that folder, took the newest name it found and
 * signed it. For every couple in the product the newest file was the Word
 * document, because the PDF service has never been deployed, so every reader
 * who asked for a workbook got the document Ellie describes as looking bad and
 * wants deleted.
 *
 * Nothing failed. A signed url came back and a file downloaded.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * The format lives in one place, api/_lib/workbook-format.js, and the link that
 * reaches a reader is only ever over a file of that format. When the folder
 * holds nothing of that format the answer is null, which puts the surface into
 * its not-ready state. That is the app's own principle applied one layer down:
 * "drawing a different document is worse than drawing none, because none is
 * visibly missing and a different one looks finished".
 *
 * ── HOW IT DECIDES ────────────────────────────────────────────────────────
 * By running freshWorkbookUrl against a stubbed Storage, over four folders: one
 * holding only the old Word file, one holding both with the Word file newer,
 * one holding only a PDF, and one empty. Reading the function cannot tell you
 * what it picks out of a list; running it can.
 *
 * ── AND THEN THE OTHER WAY A LINK REACHES A READER ────────────────────────
 * That was the whole of this gate, and it was aimed at the half that was
 * already correct. Ellie, weeks later, with the in-app browser open on
 * `Attune_Workbook_..._and_Preston.docx`, 40 KB.
 *
 * Minting is one of two producers. The other is reuse: api/tool-data.js and
 * src/App.jsx both fall back to the URL stored on the order row when minting
 * returns null, and minting returns null for exactly the couples whose folder
 * holds no PDF, which is every couple today. So the enforcing branch and the
 * bypassing branch sat in one expression and the bypass is the one that ran.
 *
 * CLAUDE.md says this twice: a rule kept in one place and skipped in the one
 * beside it, and a gate that reports success about code nobody runs. So every
 * surface that hands over a STORED link is checked too, by name, and each one
 * has to put that link through isWorkbookUrl.
 *
 * The three statements of the format are also compared, because the extension
 * used to be typed into the file name as `.docx` while the builder wrote a PDF,
 * so a workbook would have downloaded under a Word extension.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether a PDF can be built at all. It cannot today: the service at
 * WORKBOOK_SERVICE_URL answers `x-render-routing: no-server`, which is Render
 * saying nothing is deployed there. That is a deployment Ellie has to make and
 * it is in TASKS.md. This is about what happens to the file once it exists, and
 * about what happens to the reader while it does not.
 *
 * The .docx files already in Storage. They stay; they simply stop being
 * offered. Deleting them is Ellie's call and is not safe to take until a PDF
 * exists to replace them.
 */

import { readFileSync } from 'node:fs';

import { freshWorkbookUrl } from '../api/_lib/workbook-link.js';
import { workbookFileName } from '../api/_lib/workbook-copy.js';
import { WORKBOOK_EXT, WORKBOOK_MIME, isWorkbookFile, isWorkbookUrl } from '../api/_lib/workbook-format.js';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

// ── 1. The format is stated once ────────────────────────────────────────────
{
  const name = workbookFileName('Ellie', 'Sam');
  if (!isWorkbookFile(name)) {
    fails.push(`workbookFileName produced "${name}", which is not a .${WORKBOOK_EXT}.`
      + ' The name a reader saves the file under has to match the bytes inside it;'
      + ' it said .docx for a PDF for as long as both existed.');
  }
  const builder = readFileSync(`${ROOT}api/store-workbook-pdf.js`, 'utf8');
  for (const [what, pattern] of [
    ['a hard-coded .docx', /['"`][^'"`]*\.docx['"`]/],
    ['a hard-coded pdf extension', /Attune_Workbook_[^`]*\.pdf`/],
    ['a hard-coded pdf mime type', /['"]application\/pdf['"]/],
  ]) {
    if (pattern.test(builder)) {
      fails.push(`api/store-workbook-pdf.js still contains ${what}. The format belongs`
        + ' in api/_lib/workbook-format.js and nowhere else, because the last time it was'
        + ' written down twice the two copies disagreed.');
    }
  }
  if (WORKBOOK_MIME !== 'application/pdf') {
    fails.push(`WORKBOOK_MIME is ${WORKBOOK_MIME}; Storage and the browser both need the`
      + ' real type or the download opens as something else.');
  }
}

// ── 2. What actually gets signed ────────────────────────────────────────────
const SUPA = 'https://stub.supabase.co';
const KEY = 'stub-service-key';

/** Run freshWorkbookUrl against a folder holding exactly these names. */
async function pick(names) {
  const signed = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    const j = (v) => new Response(JSON.stringify(v), { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (u.includes('/storage/v1/object/list/')) {
      /* Newest first, which is the order the real call asks for. */
      return j(names.map((name) => ({ name })));
    }
    if (u.includes('/storage/v1/object/sign/')) {
      const file = decodeURIComponent(u.split('/').pop());
      signed.push(file);
      return j({ signedURL: `/object/sign/workbooks/x/${file}?token=stub` });
    }
    return j({});
  };
  const url = await freshWorkbookUrl({ supabaseUrl: SUPA, serviceKey: KEY, orderNum: 'ORD-1' });
  return { url, signed };
}

const DOCX = 'Attune_Workbook_Ellie_and_Sam.docx';
const PDF = `Attune_Workbook_Ellie_and_Sam.${WORKBOOK_EXT}`;

// The folder every couple in the product is actually in today.
{
  const { url, signed } = await pick([DOCX]);
  if (url || signed.length) {
    fails.push('a folder holding only the old Word file still produced a download link'
      + ` (${signed[0] || url}). That is the bug Ellie hit: "it still downloaded the docx`
      + ' version". With no workbook built, the answer is null and the surface says so.');
  }
}

// Both present, the wrong one newer. This is the ordering that made it invisible.
{
  const { url, signed } = await pick([DOCX, PDF]);
  if (!url || !signed.some((f) => isWorkbookFile(f))) {
    fails.push('with both a Word file and a workbook in the folder, and the Word file'
      + ' newer, no workbook was served. The newest file is not the same question as the'
      + ' newest workbook.');
  }
  if (signed.some((f) => !isWorkbookFile(f))) {
    fails.push(`the Word file was signed (${signed.find((f) => !isWorkbookFile(f))}) even`
      + ' though a real workbook was sitting beside it.');
  }
}

// The ordinary case.
{
  const { url, signed } = await pick([PDF]);
  if (!url || signed[0] !== PDF) {
    fails.push('a folder holding only a workbook did not produce a link to it, which'
      + ' would mean nobody can download a workbook at all.');
  }
}

// Nothing there yet.
{
  const { url } = await pick([]);
  if (url) fails.push(`an empty folder produced ${url} rather than null.`);
}

// ── 3. A stored link is held to the same rule ───────────────────────────────
{
  const live = (name) => {
    /* A signature that has not expired, so `signedUrlIsLive` is not what stops
       it. The question under test is the format, not the clock. */
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const payload = Buffer.from(JSON.stringify({ exp })).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `${SUPA}/storage/v1/object/sign/workbooks/ORD-1/${encodeURIComponent(name)}?token=h.${payload}.s`;
  };

  if (isWorkbookUrl(live(DOCX))) {
    fails.push('isWorkbookUrl accepts a link to a Word file, so every surface that reuses a'
      + ' stored link is free to hand one over.');
  }
  if (!isWorkbookUrl(live(PDF))) {
    fails.push('isWorkbookUrl rejects a link to a real workbook, which would mean nobody with'
      + ' a built workbook can open it.');
  }
  if (isWorkbookUrl(null) || isWorkbookUrl('') || isWorkbookUrl('not a url')) {
    fails.push('isWorkbookUrl accepts something that is not a link to anything. Unparseable has'
      + ' to fail toward "still building" rather than toward the wrong document.');
  }

  /**
   * Every surface that reuses a stored link puts it through that question.
   *
   * Matched on what the stored value is HANDED TO, not on the function name
   * appearing in the file: `isWorkbookUrl` imported and never called would read
   * as covered, which is the first way a gate gets defeated without deleting
   * anything.
   */
  const REUSERS = [
    { file: 'api/tool-data.js', value: 'row?.workbook_url' },
    { file: 'src/App.jsx', value: 'order?.workbookUrl' },
  ];
  for (const { file, value } of REUSERS) {
    const src = readFileSync(`${ROOT}${file}`, 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ')
      .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
    const esc = value.replace(/[.?*+^$[\]\\(){}|-]/g, '\\$&');
    const uses = [...code.matchAll(new RegExp(esc, 'g'))];
    if (!uses.length) {
      fails.push(`${file} no longer reads ${value}, which is the stored workbook link.`
        + ' Refusing to pass: a gate that has lost its subject must never report success.');
      continue;
    }
    if (!new RegExp(`isWorkbookUrl\\(\\s*${esc}\\s*\\)`).test(code)) {
      fails.push(`${file} hands ${value} to a reader without asking whether it points at a`
        + ' workbook.\n      Minting returns null for every couple with no PDF, so this'
        + ' fallback is the branch that\n      actually runs, and it served a .docx.');
    }
  }
}

if (fails.length) {
  console.error('\n check-workbook-format: a reader can be handed the wrong document.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log('[check-workbook-format] four folders: the old Word file is never served, a'
  + ' workbook beside it is, an empty folder answers null, and the extension in the file'
  + ' name is the one the builder writes. Both surfaces that reuse a STORED link ask the'
  + ' same question of it, which is the half this gate used to miss.');
