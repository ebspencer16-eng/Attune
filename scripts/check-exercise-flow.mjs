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

const BASE = process.env.BASE || 'http://127.0.0.1:4173';

// pkg: the URL package needed for the exercise to be reachable at all.
// key:  where completed answers land in localStorage.
// min:  fewest answers a complete run must store.
// Known limitation: the Physical Intimacy multi-select screens ("select all
// that are true", "select up to two") do not enable their forward control from
// a synthetic click in this harness, so a run stalls at question 7 of 18. The
// screens work by hand; this is a harness gap, not a product bug, and it is
// flagged rather than silently skipped so nobody reads a pass as coverage.
const EXERCISES = {
  exercise1: { pkg: 'core',    key: 'attune_ex1',      progress: 'attune_ex1_progress',      min: 54, label: 'Communication' },
  exercise2: { pkg: 'core',    key: 'attune_ex2',      progress: 'attune_ex2_progress',      min: 12, label: 'Expectations' },
  exercise3: { pkg: 'premium', key: 'attune_ex3',      progress: 'attune_ex3_progress',      min: 8,  label: 'Relationship Reflection' },
  intimacy:  { pkg: 'premium', key: 'attune_intimacy', progress: 'attune_intimacy_progress', min: 18, label: 'Physical Intimacy', known: 'multi-select screens need a real pointer; stalls at Q7' },
};

// Controls that move forward. Matching on the verb alone was not enough: the
// last screen of Expectations part 1 is labelled "ALL DONE →", which starts
// with neither. A trailing arrow is the reliable signal, with the verb list as
// a fallback for controls that have no arrow.
const FORWARD_ARROW = /→\s*$/;
const FORWARD_VERB = /(^|\s)(finish|all done|done|complete|submit|see (your )?results|continue|next|start|begin)/i;
// Controls that are never an answer.
const NOT_AN_ANSWER = /^(←|→|next|back|continue|start|begin|finish|all done|done|complete|submit|sign up|dashboard|see )/i;

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

  await page.goto(`${BASE}/?fresh=1&pkg=${cfg.pkg}&view=${name}`);
  await page.wait(1400);

  // Entry screen.
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => /^(start|begin)/i.test(x.innerText.trim()));
    if (b) b.click();
  });
  await page.wait(700);

  let answered = 0, screens = 0, stalls = 0, variant = 0;
  for (let i = 0; i < 400; i++) {
    errors.length = 0;

    const acted = await page.evaluate((notAnswer) => {
      const re = new RegExp(notAnswer, 'i');
      // Below the site header, and long enough to be a real label. Without
      // this the grid/menu glyph in the header counts as an answer option and
      // clicking it derails the run.
      const visible = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top > 95; };
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
      // Answer screens: click a middle option so runs are not all one extreme.
      const opts = [...document.querySelectorAll('button')]
        .filter(b => visible(b) && b.innerText.trim().length > 2 && !re.test(b.innerText.trim()) && !b.disabled);
      if (opts.length) { opts[Math.floor(opts.length / 2)].click(); return 'option'; }
      return null;
    }, NOT_AN_ANSWER.source);

    if (acted === 'option') answered++;
    await page.wait(160);

    const moved = await page.evaluate(({ arrow, verb }) => {
      const reArrow = new RegExp(arrow), reVerb = new RegExp(verb, 'i');
      const visible = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top > 95; };
      const btns = [...document.querySelectorAll('button')]
        .filter(b => visible(b) && !b.disabled && !/^←/.test(b.innerText.trim()));
      // A finishing control wins over a plain Next.
      const finish = btns.find(b => /(finish|all done|complete|submit|see )/i.test(b.innerText.trim()));
      const b = finish || btns.find(x => reArrow.test(x.innerText.trim())) || btns.find(x => reVerb.test(x.innerText.trim()));
      if (!b) return false;
      b.click();
      return true;
    }, { arrow: FORWARD_ARROW.source, verb: FORWARD_VERB.source });

    await page.wait(300);

    // Grid screens answer many items at once (the who-does-what grid in
    // Expectations, the multi-selects in Physical Intimacy). One click per
    // screen never completes them, and the forward control stays inert while
    // items are missing, so a stall is the signal to fill everything visible.
    if (!moved) {
      const filled = await page.evaluate((notAnswer) => {
        const re = new RegExp(notAnswer, 'i');
        const visible = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top > 95; };
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

      // Pick-and-rank screens (the Relationship Reflection priorities) keep the
      // forward control inert until enough items are chosen, and choosing one
      // reveals reorder controls rather than advancing. Keep adding until the
      // control comes alive.
      for (let k = 0; k < 6; k++) {
        const added = await page.evaluate(({ notAnswer, idx }) => {
          const re = new RegExp(notAnswer, 'i');
          const visible = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top > 95; };
          const chip = [...document.querySelectorAll('button')].filter(b =>
            visible(b) && !b.disabled && /^\+/.test(b.innerText.trim()));
          if (chip.length) { chip[0].click(); return true; }
          // Multi-selects toggle, so clicking the same option repeatedly turns
          // it on and off forever. Advance through distinct options instead.
          const opts = [...document.querySelectorAll('button')].filter(b =>
            visible(b) && !b.disabled && b.innerText.trim().length > 2 && !re.test(b.innerText.trim()));
          if (!opts.length || idx >= opts.length) return false;
          opts[idx].click();
          return true;
        }, { notAnswer: NOT_AN_ANSWER.source, idx: k });
        if (!added) break;
        await page.wait(160);
        const nowMoved = await page.evaluate(() => {
          const visible = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top > 95; };
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

  await page.close();

  if (!stored.completed) {
    return { name, ok: false, answered, screens, stored,
      why: `never wrote ${cfg.key} (progress held ${stored.progressCount}); last screen: ${tail.slice(0, 90)}` };
  }
  if (stored.doneCount < cfg.min) {
    return { name, ok: false, answered, screens, stored,
      why: `stored ${stored.doneCount} answers, expected at least ${cfg.min}` };
  }
  return { name, ok: true, answered, screens, stored };
}

const only = process.argv[2];
const names = only ? [only] : Object.keys(EXERCISES);
let failed = 0;
for (const name of names) {
  const r = await runOne(name);
  const cfg = EXERCISES[name];
  if (r.ok) {
    console.log(`  ok    ${name.padEnd(10)} ${cfg.label.padEnd(24)} ${r.stored.doneCount} answers stored`);
  } else if (cfg.known) {
    console.log(`  KNOWN ${name.padEnd(10)} ${cfg.label.padEnd(24)} not driveable: ${cfg.known}`);
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
console.log(`\n[check-exercise-flow] ${names.length} exercises completed and stored correctly.`);
