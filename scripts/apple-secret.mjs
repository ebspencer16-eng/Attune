/**
 * Generate the Apple client secret Supabase asks for.
 *
 * Supabase's Apple panel has two fields: Client IDs, and Secret Key. The
 * Secret Key is not the .p8 file. It is a token signed *with* the .p8, and
 * Apple will not accept anything else.
 *
 * Supabase offers a generator on its docs page. This does the same thing
 * without the private key ever leaving this machine. An Apple signing key is
 * downloadable exactly once and authorises sign-in for every Attune account,
 * so it should not be pasted into a web page.
 *
 * Usage:
 *   node scripts/apple-secret.mjs ~/path/to/AuthKey_ABCD123456.p8 \
 *     --team HX5FX68K6L --key ABCD123456 --service com.attunerelationships.web
 *
 * The key id is also in the filename Apple gave you.
 *
 * ── THIS EXPIRES ──────────────────────────────────────────────────────────
 * Apple caps the secret at six months. When it lapses, Sign in with Apple
 * stops working for everyone, with no warning and no error anyone can act on.
 * Run this again with the same .p8 before then. The expiry date is printed
 * below the token so it can go in a calendar.
 */

import { readFileSync } from 'fs';
import { createSign } from 'crypto';

const args = process.argv.slice(2);
const p8Path = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1]?.startsWith('--') !== true);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : args[i + 1];
};

// Attune's own identifiers, so the everyday command is one short line.
//
// Everything below used to be typed out on the command line every time. That
// line was long enough to wrap when copied out of a terminal, and a wrapped
// line becomes two commands, the second of which is a key id being run as a
// program. Nothing here is a secret: the team id is already in app.json and
// CLAUDE.md, and the services id is a public client identifier.
const ATTUNE_TEAM_ID = 'HX5FX68K6L';
const ATTUNE_SERVICE_ID = 'com.attunerelationships.web';

// Apple names the download AuthKey_<KEYID>.p8, so the key id is already in
// hand. Asking for it again is asking to be given something else by mistake.
const keyIdFromFilename = (path) => (path || '').match(/AuthKey_([A-Z0-9]{10})\.p8$/)?.[1] || null;

const teamId = flag('team') || ATTUNE_TEAM_ID;
const keyId = flag('key') || keyIdFromFilename(p8Path);
const serviceId = flag('service') || ATTUNE_SERVICE_ID;

// Refuse anything that looks like the key itself rather than a path or an id.
//
// This happened: the contents of the .p8 were pasted in place of both the
// filename and the key id, which puts an Apple private key into a shell
// history and anywhere that command gets copied. The script cannot un-paste
// it, but it can refuse loudly and say what the two values actually are.
const looksLikeKeyMaterial = (v) =>
  !!v && (/BEGIN [A-Z ]*PRIVATE KEY/.test(v) || (v.length > 40 && /^MIG[A-Za-z0-9+/=]+$/.test(v.replace(/\s+/g, ''))));

for (const [label, value] of [['the .p8 path', p8Path], ['--key', keyId], ['--team', teamId], ['--service', serviceId]]) {
  if (looksLikeKeyMaterial(value)) {
    console.error(`\nStop. ${label} was given the contents of the private key itself.\n`);
    console.error('That key is now in your shell history and in anything you pasted');
    console.error('the command into. Revoke it at developer.apple.com under Keys and');
    console.error('create a new one. Nothing breaks: Sign in with Apple is not live yet.\n');
    console.error('Nothing here ever wants the contents of the file:');
    console.error('  the .p8 path  where the file is, e.g. ~/Downloads/AuthKey_ABCD123456.p8');
    console.error('  --key         the 10-character Key ID, the ABCD123456 in that filename');
    console.error('');
    process.exit(1);
  }
}

if (keyId && !/^[A-Z0-9]{10}$/.test(keyId)) {
  console.error(`\n--key should be the 10-character Key ID, like ABCD123456. Got ${keyId.length} characters.`);
  console.error('It is the part of the filename between AuthKey_ and .p8.\n');
  process.exit(1);
}

if (teamId && !/^[A-Z0-9]{10}$/.test(teamId)) {
  console.error(`\n--team should be your 10-character Team ID, like HX5FX68K6L. Got ${teamId.length} characters.\n`);
  process.exit(1);
}

if (!p8Path || !teamId || !keyId || !serviceId) {
  console.error('\nPoint this at the .p8 file Apple gave you:\n');
  console.error('  cd ~/Projects/unison');
  console.error('  node scripts/apple-secret.mjs ~/Downloads/AuthKey_ABCD123456.p8\n');
  if (p8Path && !keyId) {
    console.error(`Could not read a key id out of ${p8Path}.`);
    console.error('Apple names the file AuthKey_<KEYID>.p8. If it has been renamed,');
    console.error('add --key with the 10-character Key ID from developer.apple.com.\n');
  }
  process.exit(1);
}

let privateKey;
try {
  privateKey = readFileSync(p8Path.replace(/^~/, process.env.HOME), 'utf8');
} catch {
  console.error(`Could not read ${p8Path}. Check the path.`);
  process.exit(1);
}
if (!/BEGIN PRIVATE KEY/.test(privateKey)) {
  console.error(`${p8Path} does not look like an Apple .p8 signing key.`);
  process.exit(1);
}

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

const now = Math.floor(Date.now() / 1000);
// Apple's ceiling is 6 months. A day short of it, so a token generated and
// pasted a few minutes later is never rejected for being one second too long.
const exp = now + 15777000 - 86400;

const header = b64({ alg: 'ES256', kid: keyId });
const payload = b64({
  iss: teamId,
  iat: now,
  exp,
  aud: 'https://appleid.apple.com',
  sub: serviceId,
});

// ES256 signatures must be the raw r||s pair. Node defaults to DER for EC
// keys, which Apple rejects with an error that says nothing about encoding.
const signer = createSign('SHA256');
signer.update(`${header}.${payload}`);
const signature = signer.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');

console.log('');
console.log('Paste this into Supabase → Authentication → Providers → Apple → Secret Key:');
console.log('');
console.log(`${header}.${payload}.${signature}`);
console.log('');
console.log(`Expires ${new Date(exp * 1000).toDateString()}. Sign in with Apple stops`);
console.log('working that day unless this is run again. Put it in a calendar now.');
console.log('');
