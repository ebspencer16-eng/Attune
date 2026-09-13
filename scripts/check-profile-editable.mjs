// Fails the build when the app cannot edit what the product asks people for.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// "Finish setting up your profile" was a card on the app's home screen that
// opened the website, because Settings could not edit a name or pronouns.
// Ellie's direction is the opposite: "Ideally, a user purchases online then
// downloads the app and only uses the app from that point."
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// 1. Everything profile setup asks for can be changed afterwards. A question
//    somebody answers once and can never correct is worse than not asking: the
//    Demographics page then describes what people guessed the first time.
// 2. api/update-profile.js refuses anything else. The whitelist is the whole
//    of what it can touch, and it must not carry the package, the entitlements,
//    the partner link or any answers.
// 3. The card lands in the app rather than the browser.
//
// ── WHAT IT DOES NOT COVER ─────────────────────────────────────────────────
// partner_email, which is deliberately not editable: changing it means
// re-inviting somebody and unlinking a couple, which is not an edit to a
// profile and should not happen by way of one.

import { readFileSync } from 'fs';

import { ABOUT_YOU } from '../api/_lib/profile-setup-copy.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(`${ROOT}${f}`, 'utf8');
const strip = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|\s)\/\/[^\n]*/g, ' ');

const problems = [];
const api = strip(read('api/update-profile.js'));

// ── 1. Everything asked at signup can be corrected ────────────────────────
//
// Read from the same module the signup reads, so a question added there has to
// be editable the same day rather than the day somebody remembers this file.
if (!/ABOUT_YOU\.fields\.map/.test(api)) {
  problems.push(
    'api/update-profile.js does not build its whitelist from ABOUT_YOU.\n'
    + '      A question added to signup would then be answerable once and never\n'
    + '      correctable, and nothing would say so.');
}
const editor = read('attune-app/src/components/profile-editor.tsx');
if (!/about\.fields\.map/.test(editor)) {
  problems.push('the app\'s profile editor does not draw the questions the server sends, so it asks its own set.');
}
// Run the whitelist rather than grep for names in it.
//
// The five demographic keys are derived from ABOUT_YOU, so none of them
// appears in the file as a literal, and the first version of this check
// reported all five as uneditable. A gate matching a literal name is blind to
// anything reached through a registry, which is the rule CLAUDE.md states and
// this is the third time it has caught its own author.
const editable = await (async () => {
  const at = api.indexOf('const snake =');
  const end = api.indexOf('\n};', api.indexOf('const EDITABLE = {'));
  if (at < 0 || end < 0) return null;
  // file:// href, not a bare path: a data: module has no base to resolve a
  // path against, and the import failed silently until this said why.
  const copyModule = new URL('../api/_lib/profile-setup-copy.js', import.meta.url).href;
  const code = `import { ABOUT_YOU } from '${copyModule}';\n`
    + api.slice(at, end + 3) + '\nexport { EDITABLE };';
  try {
    const m = await import('data:text/javascript,' + encodeURIComponent(code));
    return m.EDITABLE;
  } catch (e) {
    console.error(`  (could not evaluate the whitelist: ${e?.message})`);
    return null;
  }
})();

if (!editable) {
  problems.push('the EDITABLE whitelist in api/update-profile.js could not be evaluated, so what it allows is unknown.');
} else {
  for (const f of ABOUT_YOU.fields) {
    if (editable[f.key]) continue;
    problems.push(`${f.key} is asked at signup and api/update-profile.js cannot change it.`);
  }
  for (const required of ['name', 'pronouns', 'partnerName', 'partnerPronouns']) {
    if (editable[required]) continue;
    problems.push(`${required} cannot be edited, and it is the thing people open Settings to change.`);
  }
}

// ── 2. Nothing else ───────────────────────────────────────────────────────
const FORBIDDEN = ['pkg', 'entitlements', 'partner_profile_id', 'email', 'invite_code',
  'ex1_answers', 'ex2_answers', 'ex3_answers', 'intimacy_data', 'conflict_data'];
const whitelist = (() => {
  const at = api.indexOf('const EDITABLE = {');
  if (at < 0) return null;
  return api.slice(at, api.indexOf('\n};', at));
})();
if (!whitelist) {
  problems.push('api/update-profile.js has no EDITABLE whitelist, so what it can write cannot be read off the file.');
} else {
  for (const f of FORBIDDEN) {
    if (!new RegExp(`['\`]${f}['\`]`).test(whitelist)) continue;
    problems.push(
      `api/update-profile.js can write ${f}.\n`
      + '      That is ownership, identity or answers, and none of it is a profile edit.');
  }
}

// ── 3. The card stays in the app ──────────────────────────────────────────
const nextAction = strip(read('api/_lib/next-action.js'));
if (!/view === 'profile'\)\s*return\s*\{\s*route:/.test(nextAction)) {
  problems.push(
    'the profile card has no route inside the app, so it opens the website.\n'
    + '      Settings can edit a profile now; the card should land there.');
}
const home = read('attune-app/src/app/index.tsx');
if (!/target\.settings/.test(home)) {
  problems.push('the app ignores the settings flag on a card target, so the profile card lands on home and stops.');
}

if (problems.length) {
  console.error('[check-profile-editable] the app cannot change what the product asked for:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  `[check-profile-editable] ${ABOUT_YOU.fields.length} questions asked at signup, all editable afterwards, `
  + 'nothing about ownership is, and the card stays in the app.');
