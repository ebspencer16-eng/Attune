/**
 * The words a Communication dimension gets, given where two people landed.
 *
 * ── WHY THIS MOVED ────────────────────────────────────────────────────────
 * Both of these lived in src/App.jsx, so the copy on a Communication detail
 * page existed only inside the website bundle. The app had nothing real to
 * show on those screens, and what it did show was written for the app and
 * appears nowhere on the site.
 *
 * Two cases, genuinely different. Two people who landed close together get
 * advice about that. Two who landed apart get the shift that helps, chosen
 * from a 5x5 grid of where each of them sits and written naming the lower and
 * the higher of the two, which is why the names are arguments.
 */

import { contentFor } from '../_content/index.js';

/**
 * The copy snapshot, which the caller must supply.
 *
 * Both of these used to fall back to the current version when handed nothing.
 * That is the one behaviour the version stamp exists to prevent: a couple
 * reading copy that changed after they finished. Falling back is silent and
 * plausible, so it says so instead and the build gate stops it being reached.
 */
function snapshot(content, fn) {
  if (content) return content;
  console.error(`[dimension-copy] ${fn} called with no copy snapshot; falling back to current. `
    + "The caller must pass the couple's stamped contentVersion.");
  // eslint-disable-next-line no-restricted-syntax -- see check-content-version.mjs
  return contentFor(undefined);
}

export function alignedAdvice(dim, a, b, content) {
  const adv = snapshot(content, 'alignedAdvice').ALIGNED_ADVICE[dim];
  if (!adv) return null;
  if (typeof adv === "string") return adv;
  const na = Number(a), nb = Number(b);
  const avg = ((isNaN(na) ? 3 : na) + (isNaN(nb) ? 3 : nb)) / 2;
  return avg < 3 ? adv.low : adv.high;
}

export function getDimShift(dim, myScore, partScore, U, P, content) {
  // Buckets: 1=Strongly A (≤1.8), 2=Lean A (1.8-2.6), 3=Middle (2.6-3.4), 4=Lean B (3.4-4.2), 5=Strongly B (>4.2)
  const pos = s => s <= 1.8 ? 1 : s <= 2.6 ? 2 : s <= 3.4 ? 3 : s <= 4.2 ? 4 : 5;
  const mp = pos(myScore), pp = pos(partScore);
  const lo = Math.min(mp, pp), hi = Math.max(mp, pp);
  const loName = (mp <= pp) ? U : P;
  const hiName = (mp <= pp) ? P : U;
  const key = `${lo}_${hi}`;


  // SHIFTS is a function of the two names now that the copy lives in a
  // versioned snapshot module rather than in this closure.
  const _shifts = snapshot(content, 'getDimShift').SHIFTS(loName, hiName);
  if (!_shifts[dim]) return null;
  const fn = _shifts[dim][key];
  return fn !== undefined ? fn : null;
}
