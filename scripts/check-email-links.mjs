// Fails the build when an outbound email links to the apex domain.
//
// ── WHY THE HOST MATTERS IN AN EMAIL ───────────────────────────────────────
// attune-relationships.com answers every request with a 307 to
// www.attune-relationships.com. A browser follows that without anyone
// noticing, which is why nineteen apex links sat in the outbound emails and
// every one of them "worked" when clicked.
//
// An image in an HTML email is not a browser. Mail clients and image proxies
// vary in whether they follow a redirect for a remote image, and the one apex
// link that is an image is the Attune wordmark at the top of every email we
// send. A logo that fails to load in some clients and not others is the kind
// of thing nobody reports and everybody sees.
//
// CLAUDE.md already carries the rule for the app: "The API base URL is
// https://www.attune-relationships.com. Keep the www." It was for a worse
// version of the same problem, a 307 stripping the Authorization header. This
// is the same host, the same redirect, and the same instruction.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// No file that sends mail contains an apex URL. It says nothing about links
// inside the site, where a relative path is the normal thing and a redirect
// costs nothing.

import { readFileSync, readdirSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;

/** Files that put a URL in front of a customer by email. */
const SENDERS = readdirSync(`${ROOT}api`)
  .filter((f) => f.endsWith('.js'))
  .filter((f) => {
    const s = readFileSync(`${ROOT}api/${f}`, 'utf8');
    return /resend\.com|from:\s*`Attune|FROM_EMAIL/i.test(s);
  });

if (SENDERS.length < 3) {
  console.error(`[check-email-links] only found ${SENDERS.length} senders; refusing to pass.`);
  process.exit(1);
}

const APEX = /https:\/\/attune-relationships\.com/g;
const problems = [];

for (const f of SENDERS) {
  const src = readFileSync(`${ROOT}api/${f}`, 'utf8');
  const hits = src.match(APEX);
  if (!hits) continue;
  problems.push(
    `api/${f} sends ${hits.length} apex link${hits.length === 1 ? '' : 's'}.\n`
    + '      Every one 307s to www. A browser follows that; an email client\n'
    + '      loading a remote image may not.');
}

if (problems.length) {
  console.error('[check-email-links] an email links to the apex domain:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`[check-email-links] ${SENDERS.length} senders; every outbound link keeps the www.`);
