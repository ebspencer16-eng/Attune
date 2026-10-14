#!/usr/bin/env node
/**
 * The packages page and the checkout describe the same four packages.
 *
 * ── WHAT HAPPENED ──────────────────────────────────────────────────────────
 * Ellie: "Make the 4 package overview tiles on the packages page match the
 * tile content on the get started checkout popup."
 *
 * They did not. /offerings described each package in a sentence of its own
 * while /start listed what was in it, so the two pages a customer reads either
 * side of a decision said different things about the same thing. Premium's
 * first line said "Everything in the Assessment" where the other three said
 * "Attune Assessment", which is the same package named two ways on one screen.
 *
 * ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
 * For each of the four packages, both pages carry the same name, the same
 * price, and the same list of what is included, in the same order. The lists
 * are read out of the two files rather than written down here: a list in a
 * gate is a third copy, and the third copy is the one that goes stale.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ────────────────────────────────────
 * The long package cards further down /offerings, which carry a fuller
 * description on purpose, and the badges, which are a visual label rather than
 * a claim about what you get.
 */

import { readFileSync } from 'node:fs';

import { DIGITAL_PRICES } from '../api/_catalogue.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(`${ROOT}${f}`, 'utf8');

/** The four, by the key the catalogue and both pages use. */
const PACKAGES = ['core', 'newlywed', 'anniversary', 'premium'];

/** Everything between a tile's opening div and its closing one. */
function tileBlocks(html, openPattern) {
  const out = {};
  for (const m of html.matchAll(openPattern)) {
    const key = m.groups.key;
    let depth = 0;
    let i = m.index;
    while (i < html.length) {
      if (html.startsWith('<div', i)) depth += 1;
      else if (html.startsWith('</div>', i)) {
        depth -= 1;
        if (depth === 0) { out[key] = html.slice(m.index, i + 6); break; }
      }
      i += 1;
    }
  }
  return out;
}

const strip = (t) => t.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/** The ticked lines in a tile, in order. */
const features = (block) => [...block.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => strip(m[1]));
const nameOf = (block, cls) => {
  const m = new RegExp(`<div class="${cls}"[^>]*>([\\s\\S]*?)</div>`).exec(block);
  return m ? strip(m[1]) : null;
};

const problems = [];

/* /start names its tiles by id; /offerings names them by the package its
   add-to-cart call passes, which is the same key in both cases. */
const start = tileBlocks(read('public/start.html'),
  /<div class="pkg-tile[^"]*" id="tile-(?<key>core|newlywed|anniversary|premium)"/g);
const offerings = tileBlocks(read('public/offerings.html'),
  /<div class="pov-tile[^"]*" onclick="scrollToPkg\('#pkg-(?<key>core|newlywed|anniversary|premium)'\)/g);

for (const key of PACKAGES) {
  if (!start[key]) problems.push(`/start has no tile for ${key}. Refusing to pass: a gate that has lost its subject must never report success.`);
  if (!offerings[key]) problems.push(`/offerings has no overview tile for ${key}.`);
  if (!start[key] || !offerings[key]) continue;

  const sName = nameOf(start[key], 'pkg-name');
  const oName = nameOf(offerings[key], 'pov-name');
  if (sName !== oName) {
    problems.push(`${key} is called "${oName}" on /offerings and "${sName}" on /start.`);
  }

  const sFeat = features(start[key]);
  const oFeat = features(offerings[key]);
  if (!oFeat.length) {
    problems.push(`${key}'s overview tile on /offerings lists nothing that is in the package.`);
  } else if (sFeat.join(' | ') !== oFeat.join(' | ')) {
    problems.push(`${key} is described differently on the two pages:\n`
      + `      /offerings: ${oFeat.join(' · ')}\n`
      + `      /start:     ${sFeat.join(' · ')}`);
  }

  const price = `$${DIGITAL_PRICES[key]}`;
  for (const [page, block] of [['/offerings', offerings[key]], ['/start', start[key]]]) {
    if (!block.includes(price)) {
      problems.push(`${key} does not show ${price} on ${page}, which is what api/_catalogue.js charges.`);
    }
  }
}

/* And the first line of every tile that builds on the Assessment names it the
   same way. This is the specific thing she asked for. */
for (const key of ['newlywed', 'anniversary', 'premium']) {
  const first = features(start[key] || '')[0];
  if (first && first !== 'Attune Assessment') {
    problems.push(`${key}'s first line on /start is "${first}". The three packages that build on`
      + ' the Assessment name it the same way: "Attune Assessment".');
  }
}

if (problems.length) {
  console.error('[check-package-tiles] the two pages describe the packages differently:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('These are the two screens a customer reads either side of deciding. The');
  console.error('words are Ellie\'s; what this holds is that there is one set of them.');
  process.exit(1);
}

console.log(`[check-package-tiles] ${PACKAGES.length} packages: the same name, the same price and`
  + ' the same contents on /offerings and /start.');
