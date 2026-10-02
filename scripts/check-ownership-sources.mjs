#!/usr/bin/env node
/**
 * Every endpoint asks the ownership rule the same question, with the same
 * facts in front of it.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * What an account owns lives in three places, on purpose: the profile's own
 * columns, the orders under it, and `profiles.entitlements`, which
 * api/_lib/entitlements.js computes as the grant-only union of all of them.
 * The website reads the blob. capabilitiesFor read only the columns.
 *
 * So an add-on bought at checkout, which lands on an order row and reaches the
 * blob, was visible on the website and invisible to every endpoint the app
 * calls. Ellie reported Physical Intimacy missing from the app three times.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 *   1. A grant that exists only in the blob is honoured, one case per
 *      capability. Run, not described.
 *   2. A grant that exists only in the columns is still honoured, so the fix
 *      cannot quietly become "the blob is the only source".
 *   3. Nothing in the blob can take an entitlement away.
 *   4. Every endpoint that calls capabilitiesFor selects the columns the rule
 *      reads. A column that is not selected arrives undefined, and undefined
 *      reads as "does not own it", which is the silent half of this bug: the
 *      rule is right and the caller handed it half a profile.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the blob is current. It is refreshed by /api/recompute-entitlements
 * and by the purchase flows, and a stale one costs nothing here because every
 * source is grant-only: the union can add access someone paid for and can
 * never remove access the columns grant.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { capabilitiesFor, OWNERSHIP_COLUMNS } from '../api/_lib/ownership.js';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

/** Capability, the blob's field for it, and the profile column for it. */
const GRANTS = [
  ['ownsReflection', 'addonReflection', 'addon_reflection'],
  ['ownsIntimacy', 'addonIntimacy', 'addon_intimacy'],
  ['ownsConflict', 'addonConflict', 'addon_conflict'],
  ['ownsBudget', 'addonBudget', 'addon_budget'],
  ['ownsChecklist', 'addonChecklist', 'addon_checklist'],
  ['ownsWorkbook', 'addonWorkbook', 'addon_workbook'],
];

for (const [owns, blobField, column] of GRANTS) {
  const fromBlob = capabilitiesFor({ pkg: 'core', entitlements: { pkg: 'core', [blobField]: true } });
  if (!fromBlob[owns]) {
    fails.push(`${owns}: the account's entitlements say it was bought and the rule says no. This is what hid a paid-for add-on from the app.`);
  }

  const fromColumn = capabilitiesFor({ pkg: 'core', [column]: true });
  if (!fromColumn[owns]) {
    fails.push(`${owns}: the profile column grants it and the rule says no.`);
  }

  // Grant-only: a blob that knows nothing must not undo a column.
  const both = capabilitiesFor({ pkg: 'core', [column]: true, entitlements: { pkg: 'core' } });
  if (!both[owns]) {
    fails.push(`${owns}: an entitlements blob with nothing in it took away what the column granted. Every source here is grant-only.`);
  }
}

// A package in the blob outranking the column's package still grants.
const premiumBlob = capabilitiesFor({ pkg: 'core', entitlements: { pkg: 'premium' } });
if (!premiumBlob.ownsConflict || !premiumBlob.ownsReflection) {
  fails.push('a premium package recorded in entitlements did not grant what premium bundles');
}

/** Every api file that asks the rule of a profile row. */
const files = readdirSync(`${ROOT}api`).filter((f) => f.endsWith('.js'));
for (const f of files) {
  const text = readFileSync(`${ROOT}api/${f}`, 'utf8');
  if (!/capabilitiesFor\s*\(/.test(text)) continue;

  /**
   * The selects this file makes against the profiles table, and only those.
   *
   * Reading `select=` anywhere in the file is not enough: api/store-workbook-pdf.js
   * asks the rule about order rows, and an order carries the same add-on
   * fields and no entitlements blob, so its select looked like an ownership
   * select and is not one.
   */
  const selects = [...text.matchAll(/profiles\?[^`'"]*select=([^`'"&]*)/g)].map((m) => m[1])
    // A select built from the rule's own list is the answer, whatever else
    // the file does. Checked per select rather than per file: importing the
    // list and then not using it in one of two selects is the shape a plant
    // found, and a file-level skip could not see it.
    .filter((sel) => !sel.includes('OWNERSHIP_COLUMNS'));
  // A select that already names an ownership column is one that means to ask
  // this question of a profile. A select of is_comp or partner_profile_id is
  // not, and this stays quiet about it.
  const asking = selects.filter((sel) => OWNERSHIP_COLUMNS.some((c) => new RegExp(`\\b${c}\\b`).test(sel)));
  if (!asking.length) continue;

  for (const sel of asking) {
    const missing = OWNERSHIP_COLUMNS.filter((c) => !new RegExp(`\\b${c}\\b`).test(sel));
    if (missing.length) {
      fails.push(`api/${f} reads a profile and asks the ownership rule, and its select is missing ${missing.join(', ')}. Use OWNERSHIP_COLUMNS rather than naming them.`);
    }
  }
}

/**
 * ── 4. THE WEBSITE READS NO FLAG ITS OWN `pkg` DOES NOT HAVE ──────────────
 * Ellie: "make sure all rows are present (I'm not seeing relationship
 * reflection)."
 *
 * The dashboard's Insights menu asked for `pkg.hasReflection`. That key does
 * not exist: the flag is `hasAnniversary`, which is what every other caller in
 * the file reads. So it was `undefined`, `undefined` is falsy, and the four
 * Relationship Reflection pages were quietly left out of the menu for every
 * couple who owns them.
 *
 * Nothing could have caught it. A missing property is not a missing name, so
 * check-server-undefined does not see it; it builds, it runs, and it reads as
 * "they do not own this", which is a perfectly ordinary thing for it to say.
 * That is the same shape as the five lq_ keys that named no question: when one
 * list indexes into another, the check is not that the list is right but that
 * every key resolves.
 *
 * Both sides are derived here. The keys come from the object literal and from
 * the package table it spreads; the reads come from the file. Writing either
 * one down would be the bug again.
 */
{
  const app = readFileSync(`${ROOT}src/App.jsx`, 'utf8');

  /** The braces of a named object literal, by depth. */
  const literal = (name) => {
    const at = app.indexOf(`${name} = {`);
    if (at === -1) return null;
    const open = app.indexOf('{', at);
    let depth = 0;
    for (let i = open; i < app.length; i += 1) {
      if (app[i] === '{') depth += 1;
      else if (app[i] === '}') {
        depth -= 1;
        if (depth === 0) return app.slice(open, i + 1);
      }
    }
    return null;
  };

  const pkgLiteral = literal('const pkg');
  const configLiteral = literal('pkgConfig');
  if (!pkgLiteral || !configLiteral) {
    fails.push('src/App.jsx no longer builds `pkg` from `pkgConfig` the way this expects.'
      + ' Refusing to pass: a gate that has lost its subject must never report success.');
  } else {
    const defined = new Set([
      ...[...pkgLiteral.matchAll(/(\bhas\w+)\s*:/g)].map((m) => m[1]),
      ...[...configLiteral.matchAll(/(\bhas\w+)\s*:/g)].map((m) => m[1]),
    ]);
    if (!defined.size) {
      fails.push('no ownership flags could be read out of `pkg`. Refusing to pass: a gate that'
        + ' has lost its subject must never report success.');
    }
    /* Comments quote the bug by name, so they come out before matching. */
    const code = app.replace(/\/\*[\s\S]*?\*\//g, ' ')
      .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
    const read = new Set([...code.matchAll(/\bpkg\.(has\w+)/g)].map((m) => m[1]));
    for (const name of [...read].sort()) {
      if (defined.has(name)) continue;
      fails.push(`src/App.jsx reads pkg.${name}, which \`pkg\` does not define.\n`
        + `      It is undefined, undefined is falsy, and the feature reads as unowned for\n`
        + '      everyone who owns it. Nothing errors and nothing looks wrong.');
    }
  }
}

if (fails.length) {
  console.error('[check-ownership-sources] the rule and its callers disagree about what an account owns:');
  for (const f of fails) console.error(`  ${f}`);
  process.exit(1);
}

console.log(`[check-ownership-sources] ${GRANTS.length} capabilities honoured from the blob and from the columns, and every endpoint selects all ${OWNERSHIP_COLUMNS.length} columns the rule reads.`);
