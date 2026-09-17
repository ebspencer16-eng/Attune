#!/usr/bin/env node
/**
 * Writes a migration that creates a couple you can sign in as.
 *
 * ── WHY A GENERATOR AND NOT A HAND-WRITTEN FILE ───────────────────────────
 * Ellie: "Can you build me a fake login with a partner who has already
 * completed their exercises, so that I can go through the full process in the
 * simulator?"
 *
 * The answers have to be real enough that the results engine produces a couple
 * type, every section renders, and the workbook builds. Typing five answer
 * blobs by hand and hoping is how a test account turns into an afternoon of
 * debugging the test account. So they are generated from the question
 * registries, which means a question added tomorrow is answered too, and the
 * generator runs the scoring engine over the pair before it writes anything.
 *
 * ── WHY IT IS A MIGRATION ─────────────────────────────────────────────────
 * CLAUDE.md: never run database writes. This writes rows, so it is SQL for
 * Ellie to run, and it is re-runnable: every insert is ON CONFLICT DO NOTHING
 * and the profile update is idempotent.
 */

import { writeFileSync } from 'node:fs';

import { PERSONALITY_QUESTIONS, RESPONSIBILITY_CATEGORIES, LIFE_QUESTIONS } from '../api/_questions.js';
import { INTIMACY_QUESTIONS } from '../api/_intimacy-questions.js';
import { conflictQuestionsInOrder, FREQUENCY_OPTIONS } from '../api/_conflict-questions.js';
import { REFLECTION_QUESTIONS } from '../api/_anniversary-questions.js';
import { coupleResults } from '../api/_lib/results.js';
import { resultsGate } from '../api/_lib/results-gate.js';
import { EXERCISES } from '../api/_exercises.js';
import { getOrComputeResults } from '../api/_lib/results-store.js';

// Fixed ids so the file can be run twice and mean the same couple.
const TESTER_ID = '11111111-1111-4111-8111-111111111111';
const PARTNER_ID = '22222222-2222-4222-8222-222222222222';
const TESTER_EMAIL = 'tester@attune-relationships.com';
const PARTNER_EMAIL = 'tester-partner@attune-relationships.com';
const PASSWORD = 'AttuneTest2026';

/**
 * A third account: someone whose partner deleted.
 *
 * Ellie: "I need to preview the results view for a user whose partner deleted.
 * Can you build me a login for this?"
 *
 * It cannot be made by deleting the tester's partner, because that would take
 * the walkthrough with it. So it is its own couple, finished, with the results
 * row that survives a deletion and the marker on the profile that tells the
 * product which of the two states this is.
 */
const SURVIVOR_ID = '33333333-3333-4333-8333-333333333333';
const GONE_ID = '44444444-4444-4444-8444-444444444444';
const SURVIVOR_EMAIL = 'tester-alone@attune-relationships.com';

/** A value that is stable per question and not the same for both people. */
const pick = (id, offset) => {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ((h + offset) % 5) + 1;
};

function ex1For(offset) {
  const out = {};
  for (const q of PERSONALITY_QUESTIONS) {
    out[q.id] = pick(q.id, offset);
    // Part two asks the same questions about the other person.
    out[`pv_${q.id}`] = pick(`pv${q.id}`, offset);
  }
  return out;
}

function ex2For(offset) {
  const responsibilities = {};
  for (const cat of RESPONSIBILITY_CATEGORIES) {
    for (const item of cat.items) {
      const v = pick(`${cat.id}${item}`, offset) % 3;
      responsibilities[`${cat.id}__${item}`] = v === 0 ? 'me' : v === 1 ? 'partner' : 'shared';
    }
  }
  const life = {};
  for (const q of LIFE_QUESTIONS) {
    const opts = q.options || q.choices || null;
    life[q.id] = Array.isArray(opts) && opts.length
      ? String(opts[pick(q.id, offset) % opts.length]?.value ?? opts[pick(q.id, offset) % opts.length])
      : `A sample answer for ${q.topic || q.id}.`;
  }
  return { responsibilities, life, childhood: {}, childhoodStructure: null };
}

function ex3For(offset) {
  const out = {};
  for (const q of REFLECTION_QUESTIONS || []) {
    out[q.id] = q.kind === 'scale'
      ? pick(q.id, offset)
      : `A sample answer for ${q.topic || q.id}, written so the reflection pages have words to show.`;
  }
  return out;
}

/**
 * Intimacy answers are 0 to 1 on a named scale, not 1 to 5.
 *
 * Its scales carry their own option values, including a null for "prefer not
 * to say", and the multi-selects are arrays of option keys. Answering them
 * with a number out of five would put every dimension off the end of its own
 * bar, which is a wrong picture rather than a missing one.
 */
function intimacyFor(offset) {
  const answers = {};
  for (const q of INTIMACY_QUESTIONS) {
    const opts = (q.options || []).filter((o) => o.value != null);
    const n = pick(q.id, offset);
    if (q.kind === 'multi') {
      // Two of them, so the "what helps" pages have more than one chip.
      answers[q.id] = opts.slice(n % Math.max(opts.length - 1, 1), (n % Math.max(opts.length - 1, 1)) + 2)
        .map((o) => o.value);
    } else if (opts.length) {
      answers[q.id] = opts[n % opts.length].value;
    } else {
      answers[q.id] = n;
    }
  }
  return { answers, variant: 'married', completedAt: new Date().toISOString() };
}

/**
 * Conflict answers take six shapes, and each one has to be the right type.
 *
 * A string where the results engine expects a frequency draws a blank bar
 * rather than an error, which is exactly the kind of test data that costs an
 * afternoon. The kinds come from the question itself, so a new one added to
 * the exercise is answered in its own shape rather than as prose.
 */
function conflictFor(offset) {
  const answers = {};
  for (const q of conflictQuestionsInOrder()) {
    const n = pick(q.id, offset);
    switch (q.kind) {
      case 'scale':
      case 'pickOne': {
        const opts = q.options || [];
        const o = opts[n % Math.max(opts.length, 1)];
        answers[q.id] = typeof o === 'object' ? o.value : o;
        break;
      }
      case 'forcedAB':
        answers[q.id] = n % 2 ? 'a' : 'b';
        break;
      case 'frequency':
        answers[q.id] = FREQUENCY_OPTIONS[n % FREQUENCY_OPTIONS.length].value;
        break;
      case 'rank':
        // A ranking is the options in an order, and any order is a valid one.
        answers[q.id] = [...(q.options || [])].reverse();
        break;
      default:
        answers[q.id] = `A sample answer for ${q.id}, long enough to read like something a person typed.`;
    }
  }
  return { answers, completedAt: new Date().toISOString() };
}

const partner = {
  ex1: ex1For(1), ex2: ex2For(2), ex3: ex3For(3),
  intimacy: intimacyFor(4), conflict: conflictFor(5),
};
// The tester answers nothing: going through the exercises is the point.
const tester = { ex1: null, ex2: null, ex3: null, intimacy: null, conflict: null };

// ── Prove it before writing it ─────────────────────────────────────────────
const results = coupleResults({
  aAnswers: partner.ex1, bAnswers: ex1For(9), aName: 'Partner', bName: 'Tester',
});
if (!results?.coupleType) {
  console.error('[build-test-couple] the engine produced no couple type from these answers.');
  process.exit(1);
}
const gate = resultsGate({
  pkg: { hasAnniversary: true, hasIntimacy: true, hasConflict: true },
  mine: Object.fromEntries(EXERCISES.map((e) => [e.key, false])),
  theirs: Object.fromEntries(EXERCISES.map((e) => [e.key, true])),
  partnerLinked: true,
});
if (gate.ready) {
  console.error('[build-test-couple] results open with the tester having answered nothing, which is wrong.');
  process.exit(1);
}

/**
 * The frozen results row for the survivor's couple, built by the product.
 *
 * Not written out by hand: the row's shape belongs to api/_lib/results-store.js
 * and a seed that guesses it is a seed that renders a blank results screen.
 * The store is handed a database that finds nothing and remembers what it was
 * asked to write, which is exactly what a first computation does.
 */
const survivorEx1 = ex1For(6);
const goneEx1 = ex1For(7);
let frozenRow = null;
await getOrComputeResults({
  db: {
    read: async () => null,
    write: async (row) => { frozenRow = row; },
  },
  aId: SURVIVOR_ID, bId: GONE_ID,
  aAnswers: survivorEx1, bAnswers: goneEx1,
  aName: 'Solo', bName: 'Departed',
});
if (!frozenRow?.results?.coupleType) {
  console.error('[build-test-couple] no frozen results row was produced for the survivor.');
  process.exit(1);
}

const j = (o) => (o == null ? 'null' : `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`);

const sql = `-- Migration 067: a couple you can sign in as
-- ============================================================================
-- GENERATED by scripts/build-test-couple.mjs. Regenerate rather than edit.
--
-- Ellie: "Can you build me a fake login with a partner who has already
-- completed their exercises, so that I can go through the full process in the
-- simulator?"
--
--   Sign in as   ${TESTER_EMAIL}
--   Password     ${PASSWORD}
--
-- That account owns everything: premium plus every add-on. It has answered
-- nothing, which is the point. Its partner, ${PARTNER_EMAIL},
-- has finished all five exercises, so results unlock the moment you finish
-- yours and the workbook builds itself at that moment.
--
-- ── WHAT IT WRITES ────────────────────────────────────────────────────────
--   two rows in auth.users and their auth.identities, so both can sign in
--   two rows in public.profiles, linked to each other
--   one row in public.orders carrying premium and every add-on
--
-- Everything is ON CONFLICT DO NOTHING, so running it twice changes nothing.
-- To start the walkthrough again, run the reset at the bottom, which clears
-- the tester's own answers and leaves the partner's alone.
--
-- Run in the Supabase SQL Editor and click Run.
-- ============================================================================

-- ── The two accounts ───────────────────────────────────────────────────────
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  -- ── WHY THE EMPTY STRINGS ───────────────────────────────────────────
  -- Supabase's auth service reads these as text, not as nullable text. A
  -- row inserted without them has nulls, and every sign-in for that user
  -- fails inside the service before it ever checks the password: the app
  -- shows "something went wrong on our end" and the log says nothing
  -- useful. They are empty strings on a real signup too.
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token,
  reauthentication_token
)
values
  ('00000000-0000-0000-0000-000000000000', '${TESTER_ID}', 'authenticated', 'authenticated',
   '${TESTER_EMAIL}', crypt('${PASSWORD}', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
   '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '${PARTNER_ID}', 'authenticated', 'authenticated',
   '${PARTNER_EMAIL}', crypt('${PASSWORD}', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
   '', '', '', '', '', '', '', '')
on conflict (id) do nothing;

-- Supabase looks an email sign-in up through identities, not through
-- auth.users alone. Without these rows the password is right and the sign-in
-- still fails.
--
-- Wrapped, because this table's columns have changed across Supabase versions:
-- provider_id arrived later, and older projects have an id column with no
-- default. If it cannot be written the notice says so and everything else in
-- this file still lands; the accounts then need the identity added by hand, or
-- through the dashboard's own "add user".
do $$
begin
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values
    ('${TESTER_ID}', '${TESTER_ID}',
     '{"sub":"${TESTER_ID}","email":"${TESTER_EMAIL}","email_verified":true,"phone_verified":false}'::jsonb,
     'email', now(), now(), now()),
    ('${PARTNER_ID}', '${PARTNER_ID}',
     '{"sub":"${PARTNER_ID}","email":"${PARTNER_EMAIL}","email_verified":true,"phone_verified":false}'::jsonb,
     'email', now(), now(), now())
  on conflict do nothing;
exception when others then
  raise notice 'identities not written (%), sign-in may need one added by hand', sqlerrm;
end $$;

-- ── The two profiles ───────────────────────────────────────────────────────
-- relationship_status decides which wording Physical Intimacy Expectations
-- uses: eleven of its eighteen questions are asked one way of a couple who are
-- already intimate and another way of a couple who are not yet, and anything
-- that is not married or remarried gets the second. A test couple with no
-- status was being asked the whole exercise the wrong way round.
insert into public.profiles (id, email, name, pronouns, partner_name, partner_pronouns, partner_email, pkg, relationship_status, profile_setup_complete)
values
  ('${TESTER_ID}', '${TESTER_EMAIL}', 'Tester', 'they/them', 'Testpartner', 'they/them', '${PARTNER_EMAIL}', 'premium', 'married', true),
  ('${PARTNER_ID}', '${PARTNER_EMAIL}', 'Testpartner', 'they/them', 'Tester', 'they/them', '${TESTER_EMAIL}', 'premium', 'married', true)
on conflict (id) do nothing;

-- Linked to each other, owning everything. Written as an update as well as an
-- insert so a second run repairs a half-made couple rather than skipping it.
update public.profiles set
  partner_profile_id = '${PARTNER_ID}',
  partner_joined = true,
  pkg = 'premium',
  addon_reflection = true, addon_intimacy = true, addon_conflict = true,
  addon_budget = true, addon_checklist = true, addon_workbook = true,
  profile_setup_complete = true
where id = '${TESTER_ID}';

update public.profiles set
  partner_profile_id = '${TESTER_ID}',
  partner_joined = true,
  joined_via_invite = true,
  pkg = 'premium',
  addon_reflection = true, addon_intimacy = true, addon_conflict = true,
  addon_budget = true, addon_checklist = true, addon_workbook = true,
  profile_setup_complete = true,
  ex1_answers = ${j(partner.ex1)},
  ex1_completed = true, ex1_completed_at = now(),
  ex2_answers = ${j(partner.ex2)},
  ex2_completed = true, ex2_completed_at = now(),
  ex3_answers = ${j(partner.ex3)},
  ex3_completed = true, ex3_completed_at = now(),
  intimacy_data = ${j(partner.intimacy)},
  conflict_data = ${j(partner.conflict)}
where id = '${PARTNER_ID}';

-- ── The order that pays for it ─────────────────────────────────────────────
-- Wrapped for the same reason: the profile columns above already grant
-- everything, so a missing column here costs the order row and nothing else.
do $$
begin
  insert into public.orders (order_num, user_id, buyer_email, pkg_key, addon_reflection, addon_intimacy, addon_conflict, addon_budget, addon_checklist, addon_workbook)
  values ('TEST-COUPLE-001', '${TESTER_ID}', '${TESTER_EMAIL}', 'premium', true, true, true, true, true, true)
  on conflict do nothing;
exception when others then
  raise notice 'order row not written (%), the profile grants still stand', sqlerrm;
end $$;

-- ── Start the walkthrough again ────────────────────────────────────────────
-- Uncomment and run to clear the tester's own answers, leaving the partner's.
--
-- update public.profiles set
--   ex1_answers = null, ex1_completed = false, ex1_completed_at = null, ex1_progress = null,
--   ex2_answers = null, ex2_completed = false, ex2_completed_at = null, ex2_progress = null,
--   ex3_answers = null, ex3_completed = false, ex3_completed_at = null, ex3_progress = null,
--   intimacy_data = null, conflict_data = null, results_last_opened_at = null
-- where id = '${TESTER_ID}';
-- delete from public.couple_results
--  where partner_a in ('${TESTER_ID}', '${PARTNER_ID}')
--     or partner_b in ('${TESTER_ID}', '${PARTNER_ID}');

-- ── Verification ───────────────────────────────────────────────────────────
select
  (select count(*) from auth.users where id in ('${TESTER_ID}', '${PARTNER_ID}'))        as accounts,
  (select count(*) from auth.identities where user_id in ('${TESTER_ID}', '${PARTNER_ID}')) as identities,
  (select count(*) from public.profiles where id in ('${TESTER_ID}', '${PARTNER_ID}'))   as profiles,
  (select partner_profile_id from public.profiles where id = '${TESTER_ID}')             as tester_partner,
  (select ex1_completed and ex2_completed and ex3_completed
     from public.profiles where id = '${PARTNER_ID}')                                    as partner_finished;
`;

writeFileSync(new URL('../supabase/migrations/067_test_couple.sql', import.meta.url), sql);

/**
 * The survivor is a file of its own, because 067 has already been run.
 *
 * A migration that changes after it has been run is not a migration: the
 * number stops meaning a state of the database. So the account for previewing
 * a deleted partner is 069, additive and re-runnable like the rest.
 */
const survivorSql = `-- Migration 069: an account whose partner deleted
-- ============================================================================
-- GENERATED by scripts/build-test-couple.mjs. Regenerate rather than edit.
--
-- Ellie: "I need to preview the results view for a user whose partner deleted.
-- Can you build me a login for this?"
--
--   Sign in as   ${SURVIVOR_EMAIL}
--   Password     ${PASSWORD}
--
-- Finished, owning everything, with results that open and the other person's
-- name taken out of them on the way. That is what the retention policy
-- promises and what migration 059 made true.
--
-- It is a separate couple rather than a deletion of 067's partner, because
-- deleting that partner would take the walkthrough with it.
--
-- Needs 067 and 068 first, for no reason except that they make the same kind
-- of account and 068 explains the empty strings below.
--
-- Run in the Supabase SQL Editor and click Run. Safe to run more than once.
-- ============================================================================

-- ── The account ────────────────────────────────────────────────────────────
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token,
  reauthentication_token
)
values
  ('00000000-0000-0000-0000-000000000000', '${SURVIVOR_ID}', 'authenticated', 'authenticated',
   '${SURVIVOR_EMAIL}', crypt('${PASSWORD}', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
   '', '', '', '', '', '', '', '')
on conflict (id) do nothing;

do $$
begin
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values ('${SURVIVOR_ID}', '${SURVIVOR_ID}',
    '{"sub":"${SURVIVOR_ID}","email":"${SURVIVOR_EMAIL}","email_verified":true,"phone_verified":false}'::jsonb,
    'email', now(), now(), now())
  on conflict do nothing;
exception when others then
  raise notice 'survivor identity not written (%)', sqlerrm;
end $$;

insert into public.profiles (id, email, name, pronouns, partner_name, pkg, profile_setup_complete)
values ('${SURVIVOR_ID}', '${SURVIVOR_EMAIL}', 'Solo', 'they/them', 'Departed', 'premium', true)
on conflict (id) do nothing;

-- ── Finished, owning everything, and alone ─────────────────────────────────
-- partner_deleted_at is what the product reads to tell "my partner left" from
-- "I never had one". Those are the same absence and very different screens,
-- and before migration 059 this person was shown the second one.
update public.profiles set
  partner_profile_id = null,
  partner_deleted_at = now(),
  partner_joined = false,
  pkg = 'premium',
  addon_reflection = true, addon_intimacy = true, addon_conflict = true,
  addon_budget = true, addon_checklist = true, addon_workbook = true,
  profile_setup_complete = true,
  ex1_answers = ${j(survivorEx1)},
  ex1_completed = true, ex1_completed_at = now(),
  ex2_answers = ${j(partner.ex2)},
  ex2_completed = true, ex2_completed_at = now(),
  ex3_answers = ${j(partner.ex3)},
  ex3_completed = true, ex3_completed_at = now(),
  intimacy_data = ${j(partner.intimacy)},
  conflict_data = ${j(partner.conflict)}
where id = '${SURVIVOR_ID}';

-- ── The frozen results row, which is what survives a deletion ──────────────
-- Built by the product's own results store rather than written out here: the
-- shape belongs to api/_lib/results-store.js, and a seed that guesses it is a
-- seed that renders an empty results screen. partner_b is null, which is what
-- 059 made the deletion do.
insert into public.couple_results (partner_a, partner_b, version, content_version, couple_type, results, answers_hash, computed_at, frozen_at, updated_at, deleted_partner_at)
values (
  '${SURVIVOR_ID}', null,
  ${frozenRow.version}, ${frozenRow.content_version},
  '${frozenRow.couple_type}',
  ${j(frozenRow.results)},
  '${frozenRow.answers_hash}',
  now(), now(), now(), now()
)
on conflict do nothing;

-- ── Verification ───────────────────────────────────────────────────────────
select
  (select count(*) from auth.users where id = '${SURVIVOR_ID}')                    as account,
  (select partner_deleted_at is not null from public.profiles where id = '${SURVIVOR_ID}') as marked_deleted,
  (select partner_profile_id is null from public.profiles where id = '${SURVIVOR_ID}')     as no_partner_link,
  (select count(*) from public.couple_results where partner_a = '${SURVIVOR_ID}')  as frozen_results;
`;
writeFileSync(new URL('../supabase/migrations/069_deleted_partner_account.sql', import.meta.url), survivorSql);
console.log(
  `[build-test-couple] wrote 067_test_couple.sql and 069_deleted_partner_account.sql: ${PERSONALITY_QUESTIONS.length} ex1 answers, `
  + `${Object.keys(partner.ex2.life).length} life answers, ${Object.keys(partner.intimacy.answers).length} intimacy, `
  + `${Object.keys(partner.conflict.answers).length} conflict. Couple type from these answers: ${results.coupleType}.`,
);
