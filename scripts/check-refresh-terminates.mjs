#!/usr/bin/env node
/**
 * A pull-to-refresh always stops, and no request can hang forever.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie: "when I pull down on the home page to refresh, it takes minutes."
 *
 * It was not minutes and it was not the server. Two faults, and either alone
 * produces a spinner that never stops:
 *
 * 1. No request in attune-app/src/api/client.ts carried a timeout. `fetch` with
 *    no signal does not fail on a stalled connection, it never settles, so the
 *    `catch` that turns a dropped request into "offline" never runs.
 *
 * 2. Three of the four tabs cleared `refreshing` on the happy path, after
 *    several awaits, with nothing to catch a throw. `fetchHome` shares one
 *    promise across tabs, which is exactly the shape that turns one bad request
 *    into every tab spinning at once.
 *
 * It reads as a slow server, which is why it survived: the one thing a person
 * cannot tell from outside is the difference between slow and never.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 * That every fetch in the client passes a signal, and that every screen holding
 * a `refreshing` flag clears it in a `finally`. A `finally` is the check rather
 * than "clears it somewhere" because somewhere is where all three of these
 * already cleared it.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * How long the timeout is. Twenty seconds is a judgement and a slow network is
 * not a bug; that it exists at all is the property.
 *
 * Whether the screen shows anything useful afterwards. check-read-failures
 * holds that.
 */

import { readdirSync, readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

/**
 * Comments out, before anything is matched.
 *
 * This file's own prose names `AbortSignal.timeout` to say why it must not be
 * used, and client.ts quotes Ellie on the bug. The first run of this gate
 * flagged client.ts for a static it mentions in a comment, which is the version
 * of a check that reports a problem it invented. A scan of source has to read
 * source.
 */
const codeOf = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

// ── 1. Every fetch in the client is given a signal ──────────────────────────
{
  const file = 'attune-app/src/api/client.ts';
  const src = codeOf(readFileSync(`${ROOT}${file}`, 'utf8'));
  const calls = [...src.matchAll(/\bfetch\s*\(/g)];
  if (!calls.length) {
    fails.push(`${file} makes no fetch calls at all. Refusing to pass: a gate that has lost`
      + ' its subject must never report success.');
  }
  for (const m of calls) {
    /* The call's own arguments, by paren depth. Reading a fixed window instead
       would find a neighbouring call's signal and call this one covered. */
    let depth = 0;
    let end = m.index;
    for (let i = m.index + m[0].length - 1; i < src.length; i += 1) {
      if (src[i] === '(') depth += 1;
      else if (src[i] === ')') {
        depth -= 1;
        if (depth === 0) { end = i; break; }
      }
    }
    const call = src.slice(m.index, end + 1);
    if (!/\bsignal\s*:/.test(call)) {
      const line = src.slice(0, m.index).split('\n').length;
      fails.push(`${file}:${line} calls fetch with no \`signal\`. A fetch with no timeout does`
        + ' not fail on a stalled connection, it never settles, and the screen waiting on it'
        + ' spins until something outside the app resets the socket.');
    }
  }
  if (!/AbortController/.test(src)) {
    fails.push(`${file} no longer builds an AbortController, which is where the timeout comes`
      + ' from. Refusing to pass: a gate that has lost its subject must never report success.');
  }
  /* AbortSignal.timeout is the obvious tidy-up and Hermes does not have the
     static, so it throws at the moment the network is already misbehaving. */
  if (/AbortSignal\s*\.\s*timeout/.test(src)) {
    fails.push(`${file} uses AbortSignal.timeout. Hermes does not carry that static, so this`
      + ' throws "undefined is not a function" exactly when the network is already bad.'
      + ' Build an AbortController and clear the timer instead.');
  }
}

// ── 2. Every screen with a refresh spinner clears it in a finally ───────────
{
  const dir = `${ROOT}attune-app/src/app/`;
  const screens = readdirSync(dir).filter((f) => f.endsWith('.tsx'));
  let checked = 0;
  for (const name of screens) {
    const src = codeOf(readFileSync(`${dir}${name}`, 'utf8'));
    if (!/setRefreshing\s*\(/.test(src)) continue;
    checked += 1;

    for (const m of [...src.matchAll(/setRefreshing\s*\(\s*false\s*\)/g)]) {
      /* The nearest enclosing block opener before this call. A clear that sits
         inside `finally {` is covered; one on the happy path is not. */
      const before = src.slice(0, m.index);
      const lastFinally = before.lastIndexOf('finally {');
      if (lastFinally === -1) {
        const line = before.split('\n').length;
        fails.push(`attune-app/src/app/${name}:${line} clears the refresh spinner outside any`
          + ' `finally`. Anything that throws above it leaves the spinner turning for the life'
          + ' of the screen.');
        continue;
      }
      /* And the finally has to still be open at this point: a clear after a
         closed finally block is back on the happy path. */
      let depth = 0;
      let open = false;
      for (let i = lastFinally + 'finally '.length; i < m.index; i += 1) {
        if (src[i] === '{') depth += 1;
        else if (src[i] === '}') depth -= 1;
        if (depth === 0 && i > lastFinally + 'finally '.length) { open = false; break; }
        open = true;
      }
      if (!open) {
        const line = before.split('\n').length;
        fails.push(`attune-app/src/app/${name}:${line} clears the refresh spinner after its`
          + ' `finally` block has closed, which is the happy path again.');
      }
    }
  }
  if (!checked) {
    fails.push('no screen under attune-app/src/app/ has a refresh spinner. Refusing to pass:'
      + ' a gate that has lost its subject must never report success.');
  }
}

if (fails.length) {
  console.error('\n check-refresh-terminates: a spinner can turn forever.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log('[check-refresh-terminates] every fetch in the client carries an abort signal, and'
  + ' every screen with a pull-to-refresh clears it in a finally.');
