/**
 * What becomes true the moment a couple's results open.
 *
 * ── WHY IT IS A MODULE ────────────────────────────────────────────────────
 * It was inside api/save-exercise.js, which is how the APP finishes an
 * exercise. The website does not finish one that way: it writes the answers
 * straight to Supabase from the browser with the user's own session, and only
 * falls back to that endpoint when RLS blocks the write.
 *
 * So everything that happens at the moment of completion happened for app
 * completions and not for website ones. The partner heard nothing, and the
 * workbook was built by a block in src/App.jsx that needs the buyer's order in
 * that same browser's storage, which the invited partner never has.
 *
 * Ellie: "make sure workbook begins generating once results are complete."
 * Both ways of completing, one trigger.
 *
 * ── WHY IT IS SAFE TO CALL TWICE ──────────────────────────────────────────
 * The transition test below fires once per couple by construction, and
 * recordNotification refuses a duplicate of its own accord. The workbook is
 * the one side effect that would cost something to repeat, so it asks the
 * couple's folder whether a workbook is already there.
 */

import { EXERCISE_COLUMNS } from '../_exercises.js';
import { capabilitiesFor, OWNERSHIP_COLUMNS } from './ownership.js';
import { resultsGate, doneFromProfile } from './results-gate.js';
import { recordNotification, pushOnly } from './notifications.js';
import { freshWorkbookUrl } from './workbook-link.js';
import { SITE_URL } from './site.js';

/**
 * Tell both partners when a completion was the last one outstanding.
 *
 * ── WHY THE RULE IS NOT RESTATED HERE ─────────────────────────────────────
 * Whether results are open is decided by api/_lib/results-gate.js and nowhere
 * else. That file exists because the rule was once written three times and the
 * three disagreed. This is a fourth caller, not a fourth copy.
 *
 * ── HOW "IT JUST BECAME READY" IS KNOWN WITHOUT A SECOND READ ─────────────
 * The profile is read after the write, so it already carries this completion.
 * Running the gate a second time with this one exercise flipped back to false
 * is the state a moment ago. Ready now and not ready then is the transition,
 * and it happens exactly once per couple. Without that test, anyone editing an
 * answer months later would re-announce results that have been open all along.
 *
 * ── ONE ROW, NOT TWO ──────────────────────────────────────────────────────
 * Only the partner hears about it. The person who just finished is holding the
 * phone: the home screen already offers them "Your results are ready", from
 * the card engine, and an alert above it saying the same sentence is one
 * prompt printed twice. I built it the other way first and a screenshot of the
 * home screen settled it.
 *
 * So results_ready has copy and no caller, recorded as such beside new_post.
 * The only event it would fit is a couple becoming ready without either of
 * them doing anything, and the one place that could happen, partner-sync
 * linking two accounts, links a partner who has just arrived and answered
 * nothing.
 */
export async function announceCompletion({ admin, userId, exerciseKey }) {
  const cols = ['id', 'name', 'pronouns', 'partner_pronouns', 'partner_profile_id', ...OWNERSHIP_COLUMNS, ...EXERCISE_COLUMNS].join(',');

  const { data: me } = await admin.from('profiles').select(cols).eq('id', userId).maybeSingle();
  if (!me?.partner_profile_id) return;
  const { data: them } = await admin.from('profiles').select(cols).eq('id', me.partner_profile_id).maybeSingle();
  if (!them?.id) return;

  /**
   * The exercise flags, not the whole capability object.
   *
   * This passed `capabilitiesFor(me)` straight through, and the registry gates
   * an optional exercise on `hasConflict` / `hasIntimacy` / `hasAnniversary`,
   * which live one level down in `caps`. So the gate saw no optional exercise
   * at all and called a couple complete on Communication and Expectations
   * alone: the partner was told their results were ready while the app's home
   * screen, reading the right half, still showed them waiting on Conflict
   * Patterns. api/home.js and api/results.js both pass `caps`; so does this.
   * results-gate.js reads either shape now, and this is still the right one.
   */
  const pkg = capabilitiesFor(me);
  const flags = pkg.caps;
  const mine = doneFromProfile(me);
  const theirs = doneFromProfile(them);

  const now = resultsGate({ pkg: flags, mine, theirs, partnerLinked: true });
  if (!now.ready) return;
  const before = resultsGate({
    pkg: flags, theirs, partnerLinked: true,
    mine: { ...mine, [exerciseKey]: false },
  });
  if (before.ready) return;

  const firstName = (n) => (n || '').trim().split(/\s+/)[0] || null;
  await recordNotification({
    ownerId: them.id,
    kind: 'partner_finished',
    subjectId: me.id,
    copy: {
      partnerName: firstName(me.name),
      // The alert is about me, so it takes my pronouns. What my partner wrote
      // down about me is the fallback, and they/them is the fallback for that.
      partnerPronouns: me.pronouns || them.partner_pronouns,
    },
  });

  /**
   * And a push to both of them, which is Ellie's results_ready copy.
   *
   * ── WHY A PUSH AND NOT A ROW ────────────────────────────────────────────
   * The home screen already carries a results card, and her earlier
   * instruction was that an alert above it saying the same sentence is one
   * prompt printed twice. That has not changed. A push is the other case: it
   * reaches the one who is not looking at the screen.
   *
   * Both partners, because her sentence addresses both: "Both you and
   * [Partner] have completed your Attune exercises." The one who has just
   * tapped the last answer is holding the phone, and the rule in
   * shouldNotify that will not push something they have already seen is what
   * spares them the duplicate, rather than a second decision here.
   */
  const firstOf = (n) => (n || '').trim().split(/\s+/)[0] || null;
  for (const [who, other] of [[me, them], [them, me]]) {
    await pushOnly({
      ownerId: who.id,
      kind: 'results_ready',
      copy: { partnerName: firstOf(other.name) },
    }).catch(() => {});
  }

  // The other thing that becomes true at this moment.
  await makeWorkbook({ me, pkg });
}

/**
 * Build the workbook, now that there is enough to build one from.
 *
 * ── WHY HERE ──────────────────────────────────────────────────────────────
 * Ellie: "I clicked workbook and it said generating now, we'll email you when
 * it's ready. But shouldn't this have been generated immediately when our
 * results are done? Shouldn't it be there already?"
 *
 * It should. Generation ran in the browser, from a block in src/App.jsx that
 * needs the buyer's order in that browser's storage and both partners
 * finished. A couple who finish and only ever open the app got the waiting
 * sentence for ever, and there was no email behind it either: the only
 * workbook email in the product is a discount offer to people who do not own
 * one.
 *
 * This is the same moment the couple's results open, which is the earliest
 * moment a workbook can be honest about what it contains.
 *
 * ── WHY IT CALLS AN ENDPOINT RATHER THAN DOING IT ─────────────────────────
 * The generator is a Node function that produces a .docx and uploads it, and
 * this runs on edge. The website's own trigger does exactly this, and the
 * admin key is what tells store-workbook the payment was already established.
 *
 * Failure is logged and dropped. The answers are saved and the results are
 * open; a missing workbook is a thing to retry, not a reason to fail the save
 * someone is waiting on.
 */
async function makeWorkbook({ me, pkg }) {
  if (!pkg?.ownsWorkbook) return;

  /**
   * Already built, so leave it alone.
   *
   * Both completion paths can reach this for the same couple, and a second
   * build costs a cold start on the render service and forty seconds of it.
   * `freshWorkbookUrl` answers null unless the couple's folder holds a file of
   * the one format a workbook is, which is the same rule the download obeys:
   * api/_lib/workbook-format.js. A .docx left over from the old builder is not
   * a workbook and does not stop this.
   */
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE
                  || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    const owners = [me.id, me.partner_profile_id].filter(Boolean)
      .map((id) => `user_id.eq.${id}`).join(',');
    const orderNum = await fetch(
      `${supabaseUrl}/rest/v1/orders?or=(${owners})&select=order_num&order=created_at.desc&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    ).then((r) => (r.ok ? r.json() : [])).then((rows) => rows?.[0]?.order_num || null)
      .catch(() => null);
    if (orderNum) {
      const already = await freshWorkbookUrl({ supabaseUrl, serviceKey, orderNum })
        .catch(() => null);
      if (already) return;
    }
  }

  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    console.warn('[completion] no ADMIN_API_KEY, so no workbook was generated');
    return;
  }
  try {
    const r = await fetch(`${SITE_URL}/api/store-workbook-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
      body: JSON.stringify({ userId: me.id }),
    });
    if (!r.ok) {
      console.warn('[completion] workbook generation said', r.status, (await r.text().catch(() => '')).slice(0, 200));
    }
  } catch (e) {
    console.warn('[completion] workbook generation failed:', e?.message);
  }
}
