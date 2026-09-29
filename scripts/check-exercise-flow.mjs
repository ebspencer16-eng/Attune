// Completes an exercise end to end in a real browser and inspects what it
// stored. Rendering checks cannot see an exercise that accepts answers but
// saves them under the wrong key, stalls on one question type, or never
// reaches its completion screen.
//
//   node scripts/check-exercise-flow.mjs            # all four
//   node scripts/check-exercise-flow.mjs exercise2  # one
//
// Needs a preview server on BASE (default http://127.0.0.1:4173).
//
// It drives the UI the way a person does: pick a visible answer, press the
// forward control, repeat. It deliberately does NOT reach into React state, so
// a broken control surfaces as a stall rather than a false pass.

/**
 * ── IT RUNS ON A REAL MACHINE NOW ──────────────────────────────────────────
 * This required Playwright through a hardcoded path into one sandbox
 * (/home/claude/.npm-global/...) and a Chromium at /opt/pw-browsers. Neither
 * exists on Ellie's Mac, so the check could not run anywhere she works, was
 * wired into no npm script, and had sat unrunnable while claiming to be the
 * only end-to-end cover on the exercise save path.
 *
 * scripts/_lib/browser.mjs already drives whatever Chrome is installed, over
 * the DevTools protocol, with no dependency. check-render.mjs was moved onto
 * it for exactly this reason; this is the last holdout.
 *
 * ── WHAT IS AND IS NOT PROVEN ──────────────────────────────────────────────
 * The dependency is gone and the file runs on this machine: it launches, it
 * drives, it reports. What has NOT been demonstrated is a clean pass. Driving
 * fifty-four questions through a real browser takes long enough that it has
 * not been watched to the end here, so this is not in `npm run check` and is
 * not claimed to be green.
 *
 * Run it yourself with a preview up:
 *
 *   npx vite preview --port 4173
 *   BASE=http://127.0.0.1:4173 node scripts/check-exercise-flow.mjs exercise1
 *
 * One exercise at a time is the usable form. If it passes for all four, it is
 * worth adding to `npm run smoke`, which is where the other browser-driven
 * check lives; it does not belong in `npm run check`, which must stay fast and
 * runnable without a server.
 */
import { launch } from './_lib/browser.mjs';
import { PERSONALITY_QUESTIONS } from '../api/_questions.js';
import { INTIMACY_QUESTIONS } from '../api/_intimacy-questions.js';
import { readFileSync } from 'node:fs';
import { EXERCISES as REGISTRY } from '../api/_exercises.js';
import { exerciseComplete } from '../api/_lib/exercise-complete.js';

// `vite preview` binds to localhost, which resolves to ::1 first on macOS, so
// a default of 127.0.0.1 was refused on the only machine this has to run on.
// Every exercise then failed with "never wrote ...; last screen: This site
// can't be reached", which reads exactly like a broken exercise. That is why a
// clean pass had never been watched to the end.
const BASE = process.env.BASE || 'http://localhost:4173';

/**
 * How many answers a finished run stores, derived rather than typed.
 *
 * Communication had a floor of fifty-four beside it and the exercise stores
 * fifty: twenty-five questions, each in two parts. The questions were reworked
 * (migration 042 resets ex1 for exactly that reason) and the number beside the
 * check was not, so it reported a failing exercise that works. A number typed
 * next to the thing it describes is the defect this repo keeps finding, in a
 * file whose job is to find it.
 *
 * Expectations and Reflection keep a floor rather than a count: both branch on
 * what someone answers, so there is no single number to derive. A floor that
 * cannot drift is better than a total that can.
 */
const EX1_ANSWERS = PERSONALITY_QUESTIONS.length * 2;
const INTIMACY_ANSWERS = INTIMACY_QUESTIONS.length;

// pkg: the URL package needed for the exercise to be reachable at all.
// key:  where completed answers land in localStorage.
// min:  fewest answers a complete run must store.
// Known limitation: the Physical Intimacy multi-select screens ("select all
// that are true", "select up to two") do not enable their forward control from
// a synthetic click in this harness, so a run stalls at question 7 of 18. The
// screens work by hand; this is a harness gap, not a product bug, and it is
// flagged rather than silently skipped so nobody reads a pass as coverage.
/**
 * Which exercises this drives, from the registry.
 *
 * ── WHY IT IS NOT A LIST HERE ANY MORE ────────────────────────────────────
 * It was one, and it held four of the five. Conflict Patterns was absent
 * entirely, and the run ended by printing "4 exercises completed and stored
 * correctly", which is a precise number that sounds counted. Nobody questioned
 * it, including me. Conflict Patterns is the one add-on exercise, every beta
 * account owns it, and its answers are paragraphs rather than taps, so it was
 * the least covered and the most expensive to get wrong.
 *
 * The local map was even called EXERCISES, shadowing the name of the registry
 * that already knows the answer.
 *
 * Two things are genuinely the harness's own and stay here: which package to
 * open the browser as, and how many stored answers count as finished. Anything
 * in the registry without an entry is a loud failure rather than a silent
 * omission, which is the whole difference between this version and the last.
 */
const TUNING = {
  ex1:      { pkg: 'core',    min: EX1_ANSWERS },
  ex2:      { pkg: 'core',    min: 12 },
  ex3:      { pkg: 'premium', min: 8 },
  /**
   * ── WHY PHYSICAL INTIMACY USED TO STALL ─────────────────────────────────
   * It never started. The old note here said "multi-select screens need a real
   * pointer; stalls at Q7", which was a guess written from reading the questions,
   * and it was wrong in the way a guess usually is: it described a plausible
   * failure late in a flow that had never reached its first screen.
   *
   * Physical Intimacy is an add-on, not part of any package, so `hasIntimacy` is
   * false under every value `pkg` can take, premium included. `view === "intimacy"
   * && pkg.hasIntimacy` is therefore false, and the branch renders nothing: four
   * kilobytes of chrome around an empty main element. The driver saw no buttons,
   * reported no screens, and read exactly like an exercise that stalls.
   *
   * `grant` is the dev flag that turns the add-on on, set before the page loads.
   * If that flag is ever renamed this fails loudly with zero screens rather than
   * passing, which is the only reason naming it here is safe.
   */
  intimacy: { pkg: 'premium', min: INTIMACY_ANSWERS, grant: 'attune_dev_intimacy' },
  /**
   * ── WHY CONFLICT PATTERNS USED TO STALL ─────────────────────────────────
   * Three separate limitations in this driver, stacked on one exercise's
   * screens. Worth recording because the first two diagnoses were both wrong and
   * both were written from reading the code rather than from watching it run.
   *
   * Wrong once: "the Next button stays enabled while the minimum is unmet". It is
   * disabled, on both surfaces, and always was.
   *
   * Wrong twice: "a ranking reorders as you click, so an index points at a
   * different option each pass". True of the widget, and not what was happening.
   *
   * What it actually was, found by printing which button the forward rule picked:
   *   1. The cookie consent banner's buttons passed the answer filter, so the
   *      driver "answered" the banner and never looked at the question.
   *   2. `finish` matched unanchored, so "Notice how it connects..." read as a
   *      finish control and the run ended on a question.
   *   3. Items already placed in the ranked list were clicked again, taking them
   *      back out, so six placements never accumulated.
   *
   * None of it was specific to this exercise, which was Ellie's actual worry:
   * nothing about Conflict Patterns' code is different. It has a consent banner
   * over it, long option labels, and a ranking, and this driver could not handle
   * any of the three.
   */
  conflict: { pkg: 'premium', min: 8 },
};

const EXERCISES = {};
for (const e of REGISTRY) {
  const t = TUNING[e.key];
  if (!t) {
    console.error(`[check-exercise-flow] api/_exercises.js has ${e.key} (${e.label})`
      + ' and this harness has no entry for it, so a run would report a clean pass'
      + ' over an exercise it never opened. Add a pkg and a min to TUNING.');
    process.exit(1);
  }
  EXERCISES[e.view] = {
    pkg: t.pkg, min: t.min,
    /* `key` is the browser's storage key, which is what the stored-answer check
       reads. `regKey` is the registry's own id, which is what the shared copy
       modules are keyed by. They are different strings and confusing them gets
       you undefined rather than an error. */
    key: e.localKey, regKey: e.key, progress: e.progressKey, label: e.label,
    grant: t.grant,
  };
}

// Controls that move forward. Matching on the verb alone was not enough: the
// last screen of Expectations part 1 is labelled "ALL DONE →", which starts
// with neither. A trailing arrow is the reliable signal, with the verb list as
// a fallback for controls that have no arrow.
const FORWARD_ARROW = /→\s*$/;
const FORWARD_VERB = /(^|\s)(finish|all done|done|complete|submit|see (your )?results|continue|next|start|begin)/i;
// Controls that are never an answer.
// Reflection opens an account sheet over its intro, so these are on screen
// before the first question. Clicking one takes the run out of the exercise
// entirely, which is how it used to end on a sign-up form.
/**
 * Controls that are never an answer.
 *
 * ── AND THE CONSENT BANNER ────────────────────────────────────────────────
 * Accept and Decline were missing, so the cookie banner counted as a group of
 * answers on every screen of every exercise. On most screens that cost two
 * pointless clicks. On Conflict Patterns' ranking it cost the exercise: the
 * grid-fill fallback groups options by their parent, found two groups (the six
 * options and the banner), and a count above one makes it `continue`, so the
 * pick-and-rank fallback underneath it never ran. The ranking was toggled on and
 * off four hundred times instead.
 *
 * Measured rather than reasoned: a probe printed groups=2 sizes=[6,2] on that
 * screen, and the second group was Decline and Accept.
 *
 * No answer in the product starts with either word. Checked, across all 261
 * answer texts in the five exercises, rather than assumed.
 *
 * ── AND THE VERBS ARE WHOLE WORDS ─────────────────────────────────────────
 * They were prefixes, so `complete` matched Physical Intimacy's answer
 * "Completely at ease" and the driver refused to click it. That exercise has
 * been marked as not driveable with the reason "multi-select screens need a real
 * pointer; stalls at Q7", which was a guess: this is an option it would not
 * touch. Same root as Conflict Patterns, in the opposite direction. One pattern
 * claimed an answer as a control, the other refused an answer for looking like
 * one.
 *
 * A word boundary fixes both. The arrows keep their own alternative because a
 * boundary after a non-word character does not mean what it looks like.
 */
const NOT_AN_ANSWER = /^(?:←|→)|^(?:next|back|continue|start|begin|finish|all done|done|complete|submit|sign up|sign in|create account|dashboard|see|accept|decline)\b/i;

async function runOne(name) {
  const cfg = EXERCISES[name];
  // One browser per exercise, so a page that wedges cannot take the rest with
  // it. Cheap: the driver reuses the same Chrome binary.
  const page = await launch({ width: 900, height: 1300 });
  const errors = [];
  page.on('pageerror', (t) => errors.push(String(t)));
  page.on('console', (m) => {
    if (m.type === 'error' && !/403|404|Failed to load resource/.test(m.text)) errors.push(m.text);
  });

  /**
   * An add-on has to be granted before the page reads it, and it is read during
   * the first render, so this is a load of the origin purely to reach its
   * localStorage. `fresh=1` does not clear storage (it only declines to hydrate
   * answers from it), so the flag survives the navigation that follows.
   */
  if (cfg.grant) {
    await page.goto(`${BASE}/`);
    await page.wait(400);
    await page.evaluate((k) => { try { localStorage.setItem(k, '1'); } catch { /* private mode */ } }, cfg.grant);
  }

  await page.goto(`${BASE}/?fresh=1&pkg=${cfg.pkg}&view=${name}`);
  await page.wait(1400);

  // Close the sign-in modal if one opened.
  //
  // The exercises that need owning (Reflection, Physical Intimacy, Conflict
  // Patterns) are gated views, so arriving signed out opens the auth form over
  // the intro. That is right, and it is why a person sees it. The driver could
  // not tell the modal's buttons from the exercise's and answered "she/her" to
  // question one, forever. Communication and Expectations are in every package
  // and never showed it, which is why only Reflection failed.
  await page.evaluate(() => {
    const x = [...document.querySelectorAll('button')]
      .find((b) => b.innerText.trim() === '\u2715' || b.getAttribute('aria-label') === 'Close');
    if (x) x.click();
  });
  await page.wait(500);

  // Entry screen.
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => /^(start|begin)/i.test(x.innerText.trim()));
    if (b) b.click();
  });
  await page.wait(700);

  let answered = 0, screens = 0, stalls = 0, variant = 0;
  /* Set when the loop has read the module's title off the completion screen.
     The two minimal screens are clicked through, which navigates away from it,
     so the post-loop reading below would find an empty page and call that a
     missing title. */
  let titleConfirmed = false;
  const trail = [];
  for (let i = 0; i < 400; i++) {
    errors.length = 0;

    const acted = await page.evaluate((notAnswer) => {
      const re = new RegExp(notAnswer, 'i');
      // Below the site header, and long enough to be a real label. Without
      // this the grid/menu glyph in the header counts as an answer option and
      // clicking it derails the run.
      const visible = e => { const r = e.getBoundingClientRect();
        if (!(r.width > 0 && r.height > 0 && r.top > 95)) return false;
        // Not inside a fixed overlay that is parked off screen. The account
        // sheet is in the DOM from first paint with laid-out buttons on it:
        // "she/her", "he/him", "they/them". The driver picked one of those as
        // Reflection's first answer, clicked into nothing and stalled at
        // question one on every run. Bounding on the viewport instead was
        // worse: it excluded real options below the fold and broke a run that
        // had been passing.
        for (let n = e; n && n !== document.body; n = n.parentElement) {
          if (getComputedStyle(n).position !== 'fixed') continue;
          const q = n.getBoundingClientRect();
          if (q.top >= window.innerHeight || q.bottom <= 0) return false;
        }
        return true; };
      // Free-text screens: fill every field, then let the forward pass run.
      const fields = [...document.querySelectorAll('textarea, input[type=text]')].filter(visible);
      if (fields.length) {
        for (const el of fields) {
          if (el.value) continue;
          const set = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set;
          set.call(el, 'Test answer, written by the exercise-flow harness.');
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return 'text';
      }
      /**
       * Answer screens: click a middle option so runs are not all one extreme.
       *
       * ── EXCEPT SOMETHING ALREADY CHOSEN ─────────────────────────────────
       * A ranking draws a placed item with its position in front of it, and
       * clicking a placed item takes it back out. This step runs once per pass
       * and picks the middle of what it can see, so on a ranking it spent every
       * pass removing whichever item happened to be in the middle: the trail
       * showed "4\nSuggesting a pause" over and over, and the run ended with
       * 1181 clicks across 9 screens.
       *
       * A leading position is what marks an item as placed. No answer anywhere
       * in the product starts with a digit, checked across all 261 of them, so
       * this excludes placed items and nothing else.
       */
      const opts = [...document.querySelectorAll('button')]
        .filter(b => visible(b) && b.innerText.trim().length > 2 && !re.test(b.innerText.trim()) && !b.disabled
          && !/^\d/.test(b.innerText.trim()));
      if (opts.length) {
        const pick = opts[Math.floor(opts.length / 2)];
        const label = pick.innerText.trim().slice(0, 30);
        pick.click();
        return `option:${label}`;
      }
      return null;
    }, NOT_AN_ANSWER.source);

    if (typeof acted === 'string' && acted.startsWith('option')) {
      answered++;
      /* What it actually clicked, kept for the failure message.
         A run that ends somewhere unexpected used to report only the screen it
         ended on, which says nothing about how it got there: Conflict Patterns
         failed with "last screen: DASHBOARD" and finding out why meant driving
         the whole thing by hand in a throwaway script. The trail is the thing
         that was missing, so it is kept rather than reconstructed next time. */
      trail.push(acted.slice(7));
    }
    await page.wait(160);

    /**
     * What is on screen, before trying to move.
     *
     * ── WHY A FINGERPRINT AND NOT THE CLICK ─────────────────────────────────
     * `moved` used to mean "a forward control was found and clicked", which is
     * not the same as having moved. A pick-and-rank screen keeps its Next button
     * present and not `disabled` while the minimum is unmet, and its handler
     * simply returns. So the driver clicked Next, believed it had advanced, reset
     * the stall counter, and went round again: Conflict Patterns clicked the same
     * option 399 times and hit the iteration cap. Every fallback below is behind
     * `!moved`, so none of them ever ran.
     *
     * The screen's own text is the honest signal. If it did not change, nothing
     * happened, whatever was clicked.
     */
    const moved = await page.evaluate(({ arrow, verb }) => {
      const reArrow = new RegExp(arrow), reVerb = new RegExp(verb, 'i');
      const visible = e => { const r = e.getBoundingClientRect();
        if (!(r.width > 0 && r.height > 0 && r.top > 95)) return false;
        // Not inside a fixed overlay that is parked off screen. The account
        // sheet is in the DOM from first paint with laid-out buttons on it:
        // "she/her", "he/him", "they/them". The driver picked one of those as
        // Reflection's first answer, clicked into nothing and stalled at
        // question one on every run. Bounding on the viewport instead was
        // worse: it excluded real options below the fold and broke a run that
        // had been passing.
        for (let n = e; n && n !== document.body; n = n.parentElement) {
          if (getComputedStyle(n).position !== 'fixed') continue;
          const q = n.getBoundingClientRect();
          if (q.top >= window.innerHeight || q.bottom <= 0) return false;
        }
        return true; };
      const btns = [...document.querySelectorAll('button')]
        .filter(b => visible(b) && !b.disabled && !/^←/.test(b.innerText.trim()));
      // A finishing control wins over a plain Next.
      /**
       * ── A FINISHING CONTROL, NOT A SENTENCE CONTAINING ONE OF ITS WORDS ───
       * This was /(finish|all done|complete|submit|see )/i, unanchored, and the
       * trailing `see ` matched an ANSWER: Conflict Patterns' ranking question
       * offers "Naming that they see it from my side". So on that screen the
       * driver's forward step picked an option, clicked it, and reported that it
       * had moved. The ranking toggled on and off four hundred times and every
       * fallback that handles a ranking sits behind `!moved`, so none of them
       * ever ran.
       *
       * I diagnosed this twice from the code and was wrong both times, and the
       * answer took one probe that printed which button the rule picked and why.
       * Nothing is different about that exercise: it is an option whose words
       * happen to contain a word the driver was looking for.
       *
       * Anchored to the start of the label, and `see` narrowed to the phrase it
       * was for. A control is named by what it says, not by containing a verb
       * somewhere in the middle of a sentence.
       */
      const finish = btns.find(b => /^(finish|all done|complete|submit|see (your )?results)\b/i.test(b.innerText.trim()));
      const b = finish || btns.find(x => reArrow.test(x.innerText.trim())) || btns.find(x => reVerb.test(x.innerText.trim()));
      if (!b) return false;
      const label = b.innerText.trim().slice(0, 30);
      b.click();
      return label;
    }, { arrow: FORWARD_ARROW.source, verb: FORWARD_VERB.source });
    /* What it pressed to move on, in the trail beside what it answered. The
       answer trail is what found the misidentified button; this is the other
       half, and a run that leaves the exercise without finishing is exactly the
       case neither half alone can explain. */
    if (typeof moved === 'string') trail.push(`→ ${moved}`);

    await page.wait(300);

    // Grid screens answer many items at once (the who-does-what grid in
    // Expectations, the multi-selects in Physical Intimacy). One click per
    // screen never completes them, and the forward control stays inert while
    // items are missing, so a stall is the signal to fill everything visible.
    if (!moved) {
      const filled = await page.evaluate((notAnswer) => {
        const re = new RegExp(notAnswer, 'i');
        const visible = e => { const r = e.getBoundingClientRect();
        if (!(r.width > 0 && r.height > 0 && r.top > 95)) return false;
        // Not inside a fixed overlay that is parked off screen. The account
        // sheet is in the DOM from first paint with laid-out buttons on it:
        // "she/her", "he/him", "they/them". The driver picked one of those as
        // Reflection's first answer, clicked into nothing and stalled at
        // question one on every run. Bounding on the viewport instead was
        // worse: it excluded real options below the fold and broke a run that
        // had been passing.
        for (let n = e; n && n !== document.body; n = n.parentElement) {
          if (getComputedStyle(n).position !== 'fixed') continue;
          const q = n.getBoundingClientRect();
          if (q.top >= window.innerHeight || q.bottom <= 0) return false;
        }
        return true; };
        const opts = [...document.querySelectorAll('button')]
          .filter(b => visible(b) && b.innerText.trim().length > 2 && !re.test(b.innerText.trim()) && !b.disabled);
        // Group by parent: each row of a grid is its own set of choices.
        const groups = new Map();
        for (const b of opts) {
          const k = b.parentElement;
          if (!groups.has(k)) groups.set(k, []);
          groups.get(k).push(b);
        }
        let n = 0;
        for (const [, g] of groups) { g[Math.floor(g.length / 2)].click(); n++; }
        return n;
      }, NOT_AN_ANSWER.source);
      if (filled > 1) {
        answered += filled;
        await page.wait(250);
        stalls = 0;
        continue;
      }

      /* Labels this fallback has already clicked on this screen. A ranking
         reorders as you click, so the only stable handle on an option is its
         text. Reset per screen, below, when the run moves on. */
      const rankClicked = [];

      // Pick-and-rank screens (the Relationship Reflection priorities) keep the
      // forward control inert until enough items are chosen, and choosing one
      // reveals reorder controls rather than advancing. Keep adding until the
      // control comes alive.
      for (let k = 0; k < 14; k++) {
        const added = await page.evaluate(({ notAnswer, clicked }) => {
          const re = new RegExp(notAnswer, 'i');
          const visible = e => { const r = e.getBoundingClientRect();
        if (!(r.width > 0 && r.height > 0 && r.top > 95)) return false;
        // Not inside a fixed overlay that is parked off screen. The account
        // sheet is in the DOM from first paint with laid-out buttons on it:
        // "she/her", "he/him", "they/them". The driver picked one of those as
        // Reflection's first answer, clicked into nothing and stalled at
        // question one on every run. Bounding on the viewport instead was
        // worse: it excluded real options below the fold and broke a run that
        // had been passing.
        for (let n = e; n && n !== document.body; n = n.parentElement) {
          if (getComputedStyle(n).position !== 'fixed') continue;
          const q = n.getBoundingClientRect();
          if (q.top >= window.innerHeight || q.bottom <= 0) return false;
        }
        return true; };
          const chip = [...document.querySelectorAll('button')].filter(b =>
            visible(b) && !b.disabled && /^\+/.test(b.innerText.trim()));
          if (chip.length) { chip[0].click(); return true; }
          // Multi-selects toggle, so clicking the same option repeatedly turns
          // it on and off forever. Advance through distinct options instead.
          /**
           * ── BY LABEL, NOT BY INDEX ────────────────────────────────────────
           * A ranking reorders itself as you click: a chosen item moves into the
           * ranked list above the remaining ones, and clicking a ranked item
           * takes it back out. So opts[3] is a different option on every pass,
           * and driving by index put the same item in and out of the ranking
           * four hundred times without ever finishing it.
           *
           * Conflict Patterns' repair question is six options that all have to
           * be ranked. Clicking each label once, and never twice, completes it.
           */
          const opts = [...document.querySelectorAll('button')].filter(b =>
            visible(b) && !b.disabled && b.innerText.trim().length > 2 && !re.test(b.innerText.trim()));
          /**
           * ── AN ITEM'S LABEL CHANGES WHEN IT IS RANKED ────────────────────
           * A placed item is drawn with its position in front of it, so
           * "Suggesting a pause" becomes "4\nSuggesting a pause". Remembering
           * the raw text meant the placed version looked like a label this pass
           * had not seen, so it was clicked again, which takes it back out. The
           * trail showed "4\nSuggesting a pause" over and over.
           *
           * The position is what changed, so the position is what is stripped.
           */
          const nameOf = (b) => b.innerText.trim().replace(/^\d+\s*/, '');
          const fresh = opts.filter(b => !clicked.includes(nameOf(b)));
          if (!fresh.length) return false;
          const label = nameOf(fresh[0]);
          fresh[0].click();
          return label;
        }, { notAnswer: NOT_AN_ANSWER.source, clicked: rankClicked });
        if (!added) break;
        rankClicked.push(added);
        await page.wait(160);
        const nowMoved = await page.evaluate(() => {
          const visible = e => { const r = e.getBoundingClientRect();
        if (!(r.width > 0 && r.height > 0 && r.top > 95)) return false;
        // Not inside a fixed overlay that is parked off screen. The account
        // sheet is in the DOM from first paint with laid-out buttons on it:
        // "she/her", "he/him", "they/them". The driver picked one of those as
        // Reflection's first answer, clicked into nothing and stalled at
        // question one on every run. Bounding on the viewport instead was
        // worse: it excluded real options below the fold and broke a run that
        // had been passing.
        for (let n = e; n && n !== document.body; n = n.parentElement) {
          if (getComputedStyle(n).position !== 'fixed') continue;
          const q = n.getBoundingClientRect();
          if (q.top >= window.innerHeight || q.bottom <= 0) return false;
        }
        return true; };
          const b = [...document.querySelectorAll('button')]
            .filter(x => visible(x) && !x.disabled && !/^←/.test(x.innerText.trim()))
            .find(x => /→\s*$/.test(x.innerText.trim()) || /(next|all done|continue|finish)/i.test(x.innerText.trim()));
          if (!b) return false;
          b.click();
          return true;
        });
        if (nowMoved) { screens++; stalls = 0; break; }
      }
    }

    /**
     * ── THE COMPLETION SCREEN, AND ITS ONE BUTTON ───────────────────────────
     * An exercise ends on a screen that says it is finished and offers a single
     * control. Pressing that control is what calls onComplete, and onComplete is
     * what writes the answers, so a run that stops here has done the whole
     * exercise and saved none of it.
     *
     * The driver refused to press it. The button reads "Back to insights", and
     * anything starting with "back" is in NOT_AN_ANSWER because a back button is
     * not an answer. So it reached the end of Conflict Patterns, found nothing it
     * was willing to click, stalled three times and gave up, and the failure said
     * "never wrote attune_conflict", which reads like the exercise never ran.
     *
     * The title and the button both come from api/_lib/exercise-complete.js,
     * which both surfaces render, so the screen is recognised by asking that
     * module rather than by matching words. A sixth exercise is covered the day
     * it has an entry there.
     */
    /**
     * ── THE COMPLETION SCREEN IS CHECKED HERE, NOT IN A GATE OF ITS OWN ────
     * api/_lib/exercise-complete.js is the one home for what a finished
     * exercise says, and the app renders it whole: /api/questions serves it as
     * `set.complete` and exercise-chrome.tsx draws the three fields.
     *
     * The website's two minimal screens had typed their own. Both ended on a
     * button reading "Back to dashboard" where the module, and so the app, said
     * "Back to insights", and Conflict Patterns rendered the common footer in
     * place of its own last line, the one promising that a person's patterns
     * stay private. Same screen, two surfaces, two different endings.
     *
     * check-copy-has-one-home cannot see that: it forbids a sentence that has a
     * home being TYPED AGAIN somewhere, and these were different sentences,
     * which is the quieter half of the same failure.
     *
     * It is asserted here, on the rendered page, because this driver is already
     * standing on that screen having got there the way a person does. A second
     * harness to reach the same screen is the mirrored-fixture mistake CLAUDE.md
     * warns about, and a static scan cannot tell a rendered string from one in a
     * branch nobody takes.
     *
     * ── IT USED TO COVER THREE OF FIVE ───────────────────────────────────
     * Communication Styles, Expectations and Relationship Reflection kept their
     * own prose and buttons by ebb0b8a4's decision, and this checked only their
     * titles. Ellie settled it the other way: "I would rather them match the
     * app's setup." All five now render the module whole, so the exemption set
     * is gone rather than empty. An exemption nobody needs is one somebody
     * reaches for at the moment a real regression starts failing, which is the
     * same lesson as the `known` field this file used to carry.
     */
    const expected = exerciseComplete(cfg.regKey);
    const finishedNow = await page.evaluate(({ title, body, cta, whole: full }) => {
      const text = document.body.innerText;
      if (!text.includes(title)) return false;
      /* The title is the module's on every completion screen, minimal or not,
         and reaching this line has already proved it. */
      if (!full) return true;
      /**
       * textContent, not innerText.
       *
       * The website sets `text-transform: uppercase` on these buttons and
       * innerText reports what CSS renders, so the module's "Back to insights"
       * came back as "BACK TO INSIGHTS" and three exercises failed on a
       * difference that is not one. The module owns the words and the
       * stylesheet owns how they are set; this checks the words.
       */
      const b = [...document.querySelectorAll('button')]
        .find((x) => (x.textContent || '').trim() === cta);
      if (!b) return { missing: `a button reading "${cta}"` };
      const absent = body.filter((line) => !text.includes(line));
      if (absent.length) return { missing: `the line "${absent[0]}"` };
      b.click();
      return true;
    }, { ...expected, whole: true });
    if (finishedNow && finishedNow.missing) {
      await page.close();
      return {
        name,
        ok: false,
        why: `the completion screen for ${cfg.label} does not say what`
          + ` api/_lib/exercise-complete.js says. Missing: ${finishedNow.missing}.`
          + ' That module is what the app shows, so the two surfaces are ending the'
          + ' same exercise on different words.',
      };
    }
    if (finishedNow) {
      titleConfirmed = true;
      trail.push(`\u2713 ${expected.cta}`);
      await page.wait(400);
      break;
    }

    if (errors.length) {
      await page.close();
      return { name, ok: false, why: 'threw: ' + errors[0].slice(0, 120), answered };
    }
    if (moved) { screens++; stalls = 0; } else { stalls++; if (stalls > 2) break; }

    // Some exercises show a variant/intro screen mid-flow; count them so a
    // stall on one is distinguishable from a stall on a question.
    const done = await page.evaluate(k => {
      try { return !!JSON.parse(localStorage.getItem(k) || 'null'); } catch { return false; }
    }, cfg.key);
    if (done) break;
  }

  const stored = await page.evaluate(({ key, progress }) => {
    const read = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
    // Exercises store different shapes: Communication is flat, Expectations
    // nests life and responsibilities, Physical Intimacy wraps answers in a
    // record with a variant. Count leaves, not top-level keys.
    const leaves = (v) => {
      if (v == null) return 0;
      if (Array.isArray(v)) return 1;
      if (typeof v === 'object') return Object.values(v).reduce((n, x) => n + leaves(x), 0);
      return 1;
    };
    const done = read(key), part = read(progress);
    const count = o => o ? leaves(o.answers || o) : 0;
    return { completed: !!done, doneCount: count(done), progressCount: count(part) };
  }, { key: cfg.key, progress: cfg.progress });

  const tail = await page.evaluate(() =>
    document.body.innerText.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 4).join(' | '));

  /**
   * ── AND THE NAME IS READ OFF THE SCREEN, NOT OFF THE SOURCE ─────────────
   * The static check below proves src/App.jsx CALLS exerciseComplete for every
   * key. It cannot prove the call is what renders. Planted against, it passed
   * this:
   *
   *     {false && exerciseComplete("ex1").title}Communication Styles exercise complete
   *
   * which is the second of the two defeats CLAUDE.md records: disabling a branch
   * with a constant leaves every string in place, and a scanner looking for a
   * name finds it sitting in dead code. The first version of this gate reported
   * a clean pass on exactly the bug it was written for.
   *
   * So the rendered page has to carry the module's title, on all five screens,
   * whatever shape the rest of the screen is. Read here rather than in the loop
   * because inside the loop an absent title means "not finished yet" and out
   * here it means the screen is wrong.
   */
  const shouldSay = exerciseComplete(cfg.regKey).title;
  const saysIt = titleConfirmed
    || await page.evaluate((t) => document.body.innerText.includes(t), shouldSay);
  if (!saysIt) {
    await page.close();
    return { name, ok: false, answered, screens, stored,
      why: `finished ${cfg.label} and the screen never said "${shouldSay}", which is`
        + ' what api/_lib/exercise-complete.js calls it and therefore what the app'
        + ' says. The name on this screen is a hand-typed copy, or the call that'
        + ' should render it is in a branch nothing takes.' };
  }

  await page.close();

  if (!stored.completed) {
    /* The last few things it clicked, because the screen it ended on does not
       say how it got there. */
    const clicked = trail.length
      ? `\n        last: ${trail.slice(-10).map((t) => JSON.stringify(t)).join(', ')}`
      : '\n        clicked: nothing it recognised as an answer';
    return { name, ok: false, answered, screens, stored,
      why: `never wrote ${cfg.key} (progress held ${stored.progressCount}, answered ${answered}`
        + ` over ${screens} screens); last screen: ${tail.slice(0, 90)}${clicked}` };
  }
  if (stored.doneCount < cfg.min) {
    return { name, ok: false, answered, screens, stored,
      why: `stored ${stored.doneCount} answers, expected at least ${cfg.min}` };
  }
  return { name, ok: true, answered, screens, stored };
}

/**
 * ── EVERY COMPLETION SCREEN READS THE MODULE FOR ITS NAME ─────────────────
 * Before any browser starts, because this is a fact about the source and the
 * driver below cannot see it.
 *
 * The website has five completion screens. Two are the app's minimal page and
 * are checked on the rendered page below. The other three are richer by
 * decision: an upsell, a line that changes on whether the partner has finished,
 * a button that goes to results. ebb0b8a4 kept their prose deliberately and set
 * the boundary at the name: "The website's completion screens take the title
 * and keep their own prose and buttons."
 *
 * Four of the five did. Communication Styles typed its own, "Communication
 * Styles exercise complete", against the module's "Communication Styles
 * complete", and the two had already drifted by a word. Nothing could see it:
 * check-copy-has-one-home forbids a sentence with a home being typed AGAIN, and
 * a sentence that is merely DIFFERENT is invisible to it, which is the quieter
 * half of the same failure and the one that produced this.
 *
 * So the rule is a derivation, not a string match: the screen has to call
 * exerciseComplete for its own key. A hand-typed title that happens to match
 * today would pass a text comparison and drift tomorrow.
 *
 * Deleting a screen fails this rather than passing it, which is the point: a
 * gate that has lost its subject must never report success.
 */
{
  const app = readFileSync(`${new URL('..', import.meta.url).pathname}src/App.jsx`, 'utf8');
  const orphans = REGISTRY
    .map((e) => e.key)
    .filter((k) => !app.includes(`exerciseComplete("${k}")`) && !app.includes(`exerciseComplete('${k}')`));
  if (orphans.length) {
    console.error(`\n[check-exercise-flow] ${orphans.length} completion screen(s) in`
      + ` src/App.jsx do not take their name from api/_lib/exercise-complete.js:`
      + ` ${orphans.join(', ')}.\n\n  The module is what the app shows. A title typed`
      + ' out beside it is a second copy of a name that the registry already owns,'
      + ' and it drifts: Communication Styles said "exercise complete" where the'
      + ' module said "complete", on the same screen, for months.\n\n  Render'
      + ' {exerciseComplete("<key>").title} rather than the words.\n');
    process.exit(1);
  }
}

const only = process.argv[2];
const names = only ? [only] : Object.keys(EXERCISES);
let failed = 0;
for (const name of names) {
  const r = await runOne(name);
  const cfg = EXERCISES[name];
  if (r.ok) {
    console.log(`  ok    ${name.padEnd(10)} ${cfg.label.padEnd(24)} ${r.stored.doneCount} answers stored`);
  } else {
    failed++;
    console.error(`  FAIL  ${name.padEnd(10)} ${cfg.label}`);
    console.error(`        ${r.why}`);
  }
}


if (failed) {
  console.error(`\n[check-exercise-flow] ${failed} of ${names.length} exercises did not complete.`);
  process.exit(1);
}
/**
 * ── WHY THERE IS NO LONGER A WAY TO EXCUSE AN EXERCISE ────────────────────
 * There used to be a `known` field: an exercise could carry a sentence saying
 * why the driver could not get through it, and the run printed KNOWN beside it
 * and exited 0. Two exercises sat behind it, and the summary line counted them
 * as completions, so this file reported "5 exercises completed and stored
 * correctly" while driving three.
 *
 * Both of those sentences turned out to be wrong about their own exercise. One
 * blamed a multi-select widget on a flow that never rendered a screen; the other
 * blamed a ranking on three limitations in this driver. An excuse written from
 * reading the code is a guess, and once written it stops anyone looking.
 *
 * All five drive now, so the field is gone rather than unused. An unused escape
 * hatch is the thing someone reaches for at the moment a real regression starts
 * failing, which is exactly when it must not be there.
 */
console.log(`\n[check-exercise-flow] ${names.length} of ${names.length} exercises`
  + ' driven to completion and stored correctly.');
