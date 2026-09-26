#!/usr/bin/env node
/**
 * A partner can join an invite from either surface.
 *
 * ── THE GAP IT CAME FROM ──────────────────────────────────────────────────
 * The app had no invite step at all. It never called /api/partner-sync, and
 * its createProfile could not send a code, so someone invited who installed
 * the app first made an account with nothing joining it to their partner's and
 * had to find their way to the website to be linked.
 *
 * Nothing failed. There was no error and no empty screen: the account worked,
 * the exercises worked, and the couple simply did not exist. That is the worst
 * shape a gap can take, because the only way to notice is to try it.
 *
 * Found by sweeping the path Ellie's beta actually takes, one partner on each
 * surface, rather than by anything reporting it.
 *
 * ── WHAT JOINING AN INVITE IS ─────────────────────────────────────────────
 * Two calls, and both surfaces have to make both:
 *
 *   1. GET /api/partner-sync?inviteCode=X   resolve the code to the inviter.
 *   2. POST { action: 'link', inviteCode, partnerBId }   after the profile
 *      exists, because the server checks the id it is linking has a row.
 *
 * A surface that makes the first and not the second tells someone their invite
 * is valid and then leaves them unlinked, which is worse than not offering it.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Not whether the link succeeds, which needs two real accounts and a database.
 * Not the website's own invite screens, which predate this and have their own
 * flow. What it holds is that neither surface can lose a half of the pair.
 *
 * And not every PATH to the capability. The website links from two places, a
 * sign-up and a sign-in, and this proves the surface can link rather than that
 * both routes into it still do. A plant that disabled one of the two passed,
 * which is worth knowing rather than papering over: counting call sites would
 * turn a refactor that merges them into a failure, and a gate that fails on
 * correct code is the one that gets deleted.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

/** The endpoint has to offer both halves, or neither surface can do anything. */
const sync = readFileSync(`${ROOT}api/partner-sync.js`, 'utf8');
if (!/searchParams\.get\('inviteCode'\)/.test(sync)) {
  fails.push('api/partner-sync.js no longer resolves an invite code on GET,'
    + ' which is how both surfaces check a code before asking for anything'
    + ' else. Refusing to pass on a check whose subject has moved.');
}
if (!/action\s*!==\s*'link'/.test(sync)) {
  fails.push("api/partner-sync.js no longer takes action 'link'.");
}

const SURFACES = [
  {
    who: 'the app',
    files: ['attune-app/src/api/client.ts', 'attune-app/src/components/profile-setup.tsx'],
    lookUp: /partner-sync\?inviteCode=/,
    link: /action:\s*'link'/,
    /* And the code has to reach the profile row, or the admin and the digest
       cannot tell an invitee from a buyer.

       On the value being sent, not the name: the field is declared in the API
       client's type as well, and matching the identifier alone passed a plant
       that stopped sending it and left the declaration behind. */
    records: /joinedViaInvite:\s*true/,
  },
  {
    who: 'the website',
    files: ['src/App.jsx'],
    /**
     * No lookup required, and this is a real difference rather than an
     * oversight. The website is reached by clicking the invite link, so the
     * code arrives in the URL and the link itself is the proof: there is
     * nothing to check before the form because nothing was typed.
     *
     * The app has no link to be reached by until the store listing exists, so
     * its code is typed or pasted, and a typed code has to be checked before
     * someone fills in a form for it.
     *
     * Demanding the lookup of both would have been a gate insisting on a step
     * one surface does not need, which is how a gate gets loosened until it
     * matches nothing.
     */
    lookUp: null,
    link: /action:\s*'link'/,
    records: /joinedViaInvite|joined_via_invite/,
  },
];

for (const s of SURFACES) {
  const src = s.files.map((f) => readFileSync(`${ROOT}${f}`, 'utf8')).join('\n');
  if (s.lookUp && !s.lookUp.test(src)) {
    fails.push(`${s.who} never looks an invite code up, so someone typing one`
      + ' finds out whether it was right only after they have filled in a form.');
  }
  if (!s.link.test(src)) {
    fails.push(`${s.who} never links the account to the invite. The account is`
      + ' created and the couple is not, which is the gap this check exists for:'
      + ' nothing errors and nothing is empty, the two people simply never meet.');
  }
  if (!s.records.test(src)) {
    fails.push(`${s.who} does not mark an account as having joined by invite,`
      + ' so the admin and the beta digest count an invitee as a buyer.');
  }
}

if (fails.length) {
  console.error('\n check-invite-path: a partner can be left unlinked.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log('[check-invite-path] both surfaces resolve an invite code, link the'
  + ' account to it, and record that it joined by invite.');
