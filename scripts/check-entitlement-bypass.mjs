// Fails the build when a paid capability can be granted from the client.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// Ellie: "Physical Intimacy is still missing from the top nav. Am I viewing an
// old version of the simulator?"
//
// She was not. The website was showing her a section the app correctly hid.
//
// Physical Intimacy is add-on only: no package bundles it, and the server
// decides ownership from profiles.addon_intimacy. The website had a second
// route to the same capability, a localStorage key called
// attune_dev_intimacy, which granted it anywhere including production. One key
// set by hand unlocked a twenty dollar add-on, the exercise and the results
// both, and it is deliberately excluded from the sign-out clear so it survived
// signing out and switching accounts.
//
// So it was two bugs wearing one costume. A paid feature obtainable for free
// on the live site, and a reason the two products disagreed about what someone
// owns, reported as the app missing something when the app was right.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// That no capability flag on the website is satisfied by reading localStorage
// or a query parameter without first ruling out the production host.
//
// Demo mode is exempt where it is genuinely demo: `?demo=` renders a fixture
// couple with fixture answers and buys nobody anything. The test is that the
// demo parameter is present, not merely that a query string was read.

import { readFileSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
const src = readFileSync(ROOT + 'src/App.jsx', 'utf8');

const problems = [];

/**
 * Every capability flag the website computes.
 *
 * ── WHY NOT FROM PKG_CAPS ─────────────────────────────────────────────────
 * That was the first version and it had a hole exactly where the bug was.
 * PKG_CAPS lists what each PACKAGE bundles, and Physical Intimacy is bundled
 * by none of them: it is add-on only, so `hasIntimacy` appears nowhere in it.
 *
 * So the gate derived its list from a source that structurally could not
 * contain the one capability being bypassed, and passed while the ungated
 * toggle sat in front of it. Found by planting the toggle back and watching it
 * pass, which is the only reason this is not still true.
 *
 * The honest source is the object the website actually builds: whatever it
 * computes a `has` flag for is a capability, whether or not a package bundles
 * it.
 */
const pkgBlock = (() => {
  const at = src.indexOf('  const pkg = {');
  if (at === -1) return '';
  return src.slice(at, src.indexOf('\n  };', at));
})();
if (!pkgBlock) {
  problems.push('cannot find the website\'s pkg object; refusing to pass.');
}
const CAPS = [...new Set([...pkgBlock.matchAll(/^\s*(has\w+):/gm)].map((m) => m[1]))];
if (CAPS.length < 3) {
  problems.push(`only found ${CAPS.length} capability flags on the website, which is too few to be right.`);
}

for (const cap of CAPS) {
  // The line that decides this capability on the website.
  const re = new RegExp(`^\\s*${cap}:\\s*(.+)$`, 'gm');
  for (const m of src.matchAll(re)) {
    const expr = m[1];
    const line = src.slice(0, m.index).split('\n').length;

    const readsStorage = /localStorage\.getItem/.test(expr);
    const readsQuery = /URLSearchParams|location\.search/.test(expr);
    if (!readsStorage && !readsQuery) continue;

    // A demo-scoped grant is fine: fixture data, nobody's real answers.
    const demoScoped = /q\.get\(['"]demo['"]\)|_demoParam/.test(expr);
    if (readsQuery && !readsStorage && demoScoped) continue;

    // A storage grant has to rule out production first. It may do that inline
    // or through a named helper; either way the hostname has to be consulted.
    const guardedInline = /hostname/.test(expr);
    const helper = expr.match(/(\w*[Dd]ev\w*)\(\)/);
    const guardedByHelper = helper
      && new RegExp(`function ${helper[1]}\\([^)]*\\)[^}]*hostname`, 's').test(src);

    if (readsStorage && !guardedInline && !guardedByHelper) {
      problems.push(
        `src/App.jsx:${line} grants ${cap} from localStorage with no production guard.\n`
        + `      ${expr.trim().slice(0, 100)}\n`
        + '      A key set by hand would unlock a paid add-on on the live site, and\n'
        + '      would put the website and the app into permanent disagreement about\n'
        + '      what this person owns.');
    }
  }
}

// And the helper, if there is one, must actually name the production hosts
// rather than testing something that happens to be false in development.
if (/function devIntimacyGrant/.test(src)) {
  if (!/PRODUCTION_HOSTS\s*=\s*\[[^\]]*attune-relationships\.com/.test(src)) {
    problems.push(
      'the production host list no longer names attune-relationships.com, so the\n'
      + '      developer toggle would be open on the live site.');
  }
}

if (problems.length) {
  console.error('[check-entitlement-bypass] a paid capability can be granted from the client:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('Ownership is the server\'s answer. A client-side override is a testing');
  console.error('convenience off production and a bypass on it, and the only difference');
  console.error('is which machine it runs on.');
  process.exit(1);
}

console.log(
  `[check-entitlement-bypass] ${CAPS.length} capabilities; no client-side grant `
  + 'reaches production.');
