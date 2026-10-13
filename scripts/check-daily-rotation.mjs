#!/usr/bin/env node
/**
 * The word and the insight change at the reader's midnight, not at ours.
 *
 * ── WHAT ELLIE SAW ─────────────────────────────────────────────────────────
 * "Why am I seeing different insight of the day and different word+definition
 * on my app on my phone vs on my simulator on the same day?"
 *
 * Because it was not the same day to us. Both were picked with
 * `Math.floor(now.getTime() / 86400000)`, which counts days from the epoch in
 * UTC and turns over at 00:00Z: 5pm in California, 8pm in New York. Everyone
 * in the United States got a new word in the late afternoon, and two devices
 * opened either side of that hour disagreed while plainly being on the same
 * day.
 *
 * The arithmetic is timezone-independent, so it made no difference whether the
 * pick happened in a browser or on the server. Both rolled at 5pm.
 *
 * ── WHAT THIS CHECKS, BY RUNNING IT ───────────────────────────────────────
 * 1. One reader, one day, twenty-four hours: the same word and the same
 *    insight at every hour of it. This is the half that was broken.
 * 2. The next day is a different one, in four timezones. A rotation that never
 *    moves passes the first test perfectly.
 * 3. Two readers an ocean apart, at the same instant, each get the day they
 *    are standing in rather than ours.
 * 4. The server is told which day that is. /api/home runs on the edge, where
 *    the clock is UTC and knows nothing about the reader, so a call with no
 *    argument there is the original bug written again.
 */

import { readFileSync } from 'node:fs';

import { dayNumber, dayNumberForOffset, dayKey } from '../api/_lib/day-number.js';
import { wordOfTheDay } from '../api/_words.js';
import { insightOfTheDay } from '../api/_insights.js';

const ROOT = new URL('..', import.meta.url).pathname;
const problems = [];

/** Minutes to add to local time to reach UTC, as getTimezoneOffset reports. */
const ZONES = [
  ['Los Angeles', 420], ['New York', 240], ['London', 0],
  ['Berlin', -60], ['Sydney', -660],
];

/**
 * The two rotations, separately.
 *
 * They were one joined string, and a plant that froze the word passed: the
 * insight still moved, so the pair still differed day to day. Two rotations
 * need two answers, or one of them can stop and the other covers for it.
 */
const PICKS = [
  ['the word', (day) => wordOfTheDay(day).word || wordOfTheDay(day).term],
  ['the insight', (day) => insightOfTheDay(day).body.slice(0, 60)],
];

// ── 1 and 2. A day is a day, and the next one is not ─────────────────────
for (const [place, off] of ZONES) {
  /* Local midnight on an arbitrary Tuesday, as an absolute instant. */
  const localMidnightUtcMs = Date.UTC(2026, 9, 13, 0, 0) + off * 60000;
  for (const [what, of] of PICKS) {
    const seen = new Set();
    for (let hour = 0; hour < 24; hour += 1) {
      seen.add(of(dayNumberForOffset(off, localMidnightUtcMs + hour * 3600000)));
    }
    if (seen.size !== 1) {
      problems.push(`in ${place} ${what} changes ${seen.size} times during one day.`
        + ' A reader who opens the app in the afternoon and again after dinner is shown two'
        + ' different things and told it is the same day.');
    }
    const today = of(dayNumberForOffset(off, localMidnightUtcMs + 12 * 3600000));
    const tomorrow = of(dayNumberForOffset(off, localMidnightUtcMs + 36 * 3600000));
    if (today === tomorrow) {
      problems.push(`in ${place} ${what} is the same tomorrow as today, so that rotation has`
        + ' stopped moving. A daily thing that never changes passes the test above perfectly.');
    }
  }
}

// ── 3. Two readers, one instant, their own days ──────────────────────────
{
  /* 7pm in Los Angeles is 2am the next day in London. */
  const instant = Date.UTC(2026, 9, 13, 2, 0);
  const la = dayNumberForOffset(420, instant);
  const london = dayNumberForOffset(0, instant);
  if (la === london) {
    problems.push('a reader in Los Angeles at 7pm and a reader in London at 2am the next'
      + ' morning are given the same day. They are not on the same day.');
  }
  if (london - la !== 1) {
    problems.push(`London is ${london - la} days from Los Angeles at that instant, which is wrong.`);
  }
}

// ── 4. The surfaces ──────────────────────────────────────────────────────
{
  const home = readFileSync(`${ROOT}api/home.js`, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  for (const fn of ['insightOfTheDay', 'wordOfTheDay']) {
    if (new RegExp(`${fn}\\(\\s*\\)`).test(home)) {
      problems.push(`api/home.js calls ${fn}() with no day. It runs on the edge, where the clock`
        + " is UTC and knows nothing about the reader, so that is the original bug rewritten.");
    }
    if (!new RegExp(`${fn}\\(readerDay\\)`).test(home)) {
      problems.push(`api/home.js does not pass the reader's day to ${fn}.`);
    }
  }
  if (!/dayNumberForOffset\(tzOffset\)/.test(home)) {
    problems.push("api/home.js no longer derives the reader's day from the offset their device"
      + ' sends, so either it has a new source for it or it has stopped having one.');
  }

  /* The website runs in the reader's own browser, so no argument is right
     there: dayNumber reads a Date's LOCAL parts. What must not happen is a
     surface doing the epoch arithmetic itself again. */
  for (const rel of ['src/App.jsx', 'src/notes-web.jsx', 'api/_words.js', 'api/_insights.js']) {
    const src = readFileSync(`${ROOT}${rel}`, 'utf8');
    if (/getTime\(\)\s*\/\s*86400000/.test(src)) {
      problems.push(`${rel} counts days from the epoch itself. That is UTC, whichever machine it`
        + ' runs on, and it is what turned the word over at 5pm in California.');
    }
  }
}

// ── 5. The key the app writes and the number it becomes agree ────────────
{
  const d = new Date(2026, 9, 13, 23, 30);
  if (dayNumber(dayKey(d)) !== dayNumber(d)) {
    problems.push('a day written as a key and the same day read from a Date are different days.');
  }
}

// ── 6. And the path the WEBSITE takes, which is a Date and no offset ─────
//
// Everything above passes a number, so the branch that reads a Date was not
// exercised at all, and a plant that put the epoch arithmetic back passed.
// The website calls these in the reader's own browser with no argument, so
// this is the half that matters there: a Date is read by its LOCAL parts,
// whatever timezone the machine running it happens to be in.
{
  const lateNight = new Date(2026, 9, 13, 23, 30);
  const earlyMorning = new Date(2026, 9, 13, 0, 30);
  const nextDay = new Date(2026, 9, 14, 0, 30);
  for (const [what, of] of PICKS) {
    if (of(dayNumber(lateNight)) !== of(dayNumber(earlyMorning))) {
      problems.push(`${what} changes between half past midnight and half past eleven on one`
        + ' calendar day, which is the website reading the clock in UTC rather than locally.');
    }
    if (of(dayNumber(nextDay)) === of(dayNumber(lateNight))) {
      problems.push(`${what} does not change at the reader's own midnight.`);
    }
  }
}

if (problems.length) {
  console.error('[check-daily-rotation] the day turns over somewhere other than the reader\'s midnight:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`[check-daily-rotation] one word and one insight per reader per day, held steady`
  + ` across 24 hours in ${ZONES.length} timezones, changing at each reader's own midnight,`
  + ' and the server is told which day that is.');
