#!/usr/bin/env node
/**
 * "Six of fifty" is counted from the list the exercise actually asks.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * api/_lib/exercise-progress.js reports how far into an exercise someone is, so
 * a status row can say "in progress" with a number rather than "Start". Ellie
 * asked for it: "I exited after only a few questions of ex1, but I expected the
 * status table to say in progress or something."
 *
 * Its total for Relationship Reflection came from REFLECTION_QUESTIONS, which is
 * five. The exercise asks fourteen. ANNIVERSARY_QUESTIONS is the list
 * /api/questions serves and the list both screens walk through;
 * REFLECTION_QUESTIONS is derived from ANALYTICS_TEXT, a five-question subset
 * whose only other caller is the admin explorer.
 *
 * So anybody past the fifth question of Reflection was shown "9 of 5".
 *
 * Two plausible names for two different lists in the same file, one a subset of
 * the other. Nothing tells you which one you took. That is the shape of
 * /api/notes answering with both `notes` and `annotations` while results.tsx
 * read the wrong one, and of any rule kept in two places.
 *
 * ── WHY IT IS BEHAVIOURAL ─────────────────────────────────────────────────
 * The honest answer to "how many questions does this exercise ask" is however
 * many /api/questions serves, because that is the list the screen renders. So
 * the endpoint is called, for every exercise in the registry, and its answerable
 * items are counted and compared. No list is restated here.
 *
 * A gate that instead imported the question modules and added them up would be a
 * second implementation of questionCount, which is the failure it is guarding
 * against.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Expectations. It is the one exercise with no flat list: the endpoint sends five
 * separate arrays, because the screen is five parts with a grid in the middle,
 * and there is no single number to compare against. Its total is computed from
 * the same modules the screen reads, which is the best available, and it is
 * excluded here by shape rather than by name, so an exercise that grows a flat
 * list is covered the day it does.
 *
 * Not whether the total is the number a person would count. A question with two
 * halves, asked about yourself and about your partner, counts as two, which is
 * what Communication does and why its total is a hundred rather than fifty. That
 * is a judgement about copy, and the check only holds the two sides to agreeing.
 */

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://stub.supabase.co';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'stub-service-key';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'stub-anon-key';

const { EXERCISES } = await import('../api/_exercises.js');
const { questionCount, progressFor } = await import('../api/_lib/exercise-progress.js');
const { default: handler } = await import('../api/questions.js');

const USER = '11111111-1111-4111-8111-111111111111';

/** The network, stubbed under the endpoint. Same seam as the other write gates. */
globalThis.fetch = async (url) => {
  const u = String(url);
  const j = (v) => new Response(JSON.stringify(v), { status: 200, headers: { 'Content-Type': 'application/json' } });
  if (u.includes('/auth/v1/user')) return j({ id: USER });
  if (u.includes('/rest/v1/profiles')) {
    // married, so Expectations picks its anniversary wording rather than failing
    // on a missing status. No stored answers: this is about the question list.
    return j([{ name: 'A', partner_name: 'B', relationship_status: 'married', partner_profile_id: null }]);
  }
  return j([]);
};

const fails = [];
let compared = 0;
const skipped = [];

/**
 * An exercise nothing knows about has no total, not a made-up one.
 *
 * This is the `default` branch, which no key in the registry reaches today, so
 * nothing below compares it: changing it to 99 was planted and passed. It becomes
 * reachable the moment a sixth exercise is added without a case here, and the
 * difference between "0 of 0", which is visibly nothing, and "3 of 99", which
 * reads like a real total, is the difference between a gap and a lie.
 */
if (questionCount('not-an-exercise') !== 0) {
  fails.push(`questionCount returns ${questionCount('not-an-exercise')} for an`
    + ' exercise it has never heard of. An unknown exercise has no total, and a'
    + ' number there would be printed beside a real count of answers.');
}

for (const e of EXERCISES) {
  const res = await handler(new Request(`https://www.attune-relationships.com/api/questions?exercise=${e.key}`, {
    headers: { Authorization: 'Bearer stub-token' },
  }));
  const payload = await res.json();

  if (payload.ok === false) {
    fails.push(`/api/questions refused ${e.key} (${e.label}): ${payload.error}.`
      + ' Either the exercise cannot be asked, which is a bigger problem than this'
      + ' gate, or this stub no longer resembles a profile.');
    continue;
  }

  /**
   * A flat list of questions, if this exercise has one. Part breaks are layout,
   * not questions: Communication sends fifty-one items and asks fifty.
   */
  if (!Array.isArray(payload.items)) {
    /**
     * Expectations has no flat list: five arrays, because the screen is five
     * parts with two grids in it. So the comparison is the other invariant, and
     * it is the one that caught this exercise's own version of the bug.
     *
     * A complete answer set must land exactly on the total. Its total counted
     * every responsibility item once, and the exercise asks each of them twice,
     * once about how the two of them split it now and once about how it was
     * growing up, plus the question that opens part two. So somebody who had
     * answered all of it and not yet pressed finish read "37 of 32".
     *
     * The blob below is built from the endpoint's own arrays. It is a fixture,
     * not a second implementation of the total: it says what a finished
     * Expectations looks like, and questionCount still has to agree with it.
     * What it cannot check is the nesting itself, which is written down in
     * attune-app/src/components/expectations.tsx and in the website, and is the
     * one part of this exercise a check does not reach.
     */
    const complete = {};
    if (Array.isArray(payload.lifeQuestions)) {
      complete.life = Object.fromEntries(payload.lifeQuestions.map((q) => [q.id, 'an answer']));
    }
    if (Array.isArray(payload.categories)) {
      complete.responsibilities = {};
      complete.childhood = {};
      for (const c of payload.categories) {
        for (const item of c.items || []) {
          const key = `${c.id}__${item.key ?? item.id ?? item}`;
          complete.responsibilities[key] = 'Both of us';
          if (c.asksChildhood !== false) complete.childhood[key] = 'Both';
        }
      }
      /* The refinement a "Both" answer opens. Present on every item here, which
         is the case that made the old count overshoot. */
      complete.bothDetail = { ...complete.responsibilities };
      complete.childhoodBothDetail = { ...complete.childhood };
    }
    if (Array.isArray(payload.childhoodStructures) && payload.childhoodStructures.length) {
      complete.childhoodStructure = payload.childhoodStructures[0].id;
    }

    if (!Object.keys(complete).length) {
      skipped.push(`${e.key} (no flat item list and nothing to build a complete`
        + ` answer set from; it sends ${Object.keys(payload).filter((k) => Array.isArray(payload[k])).join(', ')})`);
      continue;
    }

    const p = progressFor({ [e.column]: null, [`${e.key}_progress`]: complete }, e);
    compared += 1;
    if (p.answered !== p.total) {
      fails.push(`a fully answered ${e.label} reports ${p.answered} of ${p.total}.`
        + (p.answered > p.total
          ? ' A progress row that counts past its own total is showing a number nobody'
            + ' can make sense of, and it happens to whoever answers everything and'
            + ' closes the screen before pressing finish.'
          : ' The total counts questions the exercise does not ask, so it can never'
            + ' be reached.'));
    }
    continue;
  }
  const served = payload.items.filter((i) => !i.__partBreak).length;
  const counted = questionCount(e.key);
  compared += 1;

  if (counted !== served) {
    fails.push(`questionCount('${e.key}') says ${counted} and /api/questions serves`
      + ` ${served} questions for ${e.label}. The status row reads "N of ${counted}"`
      + ` while the screen walks through ${served}, so`
      + (counted < served
        ? ` anyone past question ${counted} is shown a total smaller than where they are.`
        : ' the exercise can never reach the total it is measured against.'));
  }
}

if (!compared) {
  console.error('[check-question-counts] compared nothing. Every exercise either'
    + ' refused or has no flat item list, which is not the shape of this product.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  for (const s of skipped) console.error(`  skipped: ${s}`);
  process.exit(1);
}

if (fails.length) {
  console.error('\n check-question-counts: a progress total counted from the wrong list.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`[check-question-counts] ${compared} exercises counted from the list the`
  + ` endpoint serves${skipped.length ? `; skipped ${skipped.join(', ')}` : ''}.`);
