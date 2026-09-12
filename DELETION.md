# What deletion does, and what we published that it does

Found in a sweep on 12 September 2026. Nothing here is a guess about intent:
every claim below is the published policy on one side and the line of code on
the other.

The published **Data Retention and Deletion Policy** is live in
`public/legal.html`. It makes five promises about account deletion. The code
in `api/delete-account.js` keeps one of them.

---

## 1. The partner does not lose everything. They do.

**Published:**

> If one partner deletes their account, we will anonymize that partner's
> responses in the joint results display. The other partner retains access to
> their own responses and the portions of the joint results derived solely
> from their own answers.

> Joint results are anonymized and your partner loses access to result
> sections that required both partners' data.

**What happens:** the remaining partner loses all of it, including the parts
derived solely from their own answers.

Two lines do it, neither of them written with deletion in mind:

- `supabase/migrations/043_couple_results.sql` declares both partner columns
  `references public.profiles(id) on delete cascade`. Deleting either person
  deletes the couple's one frozen results row. That commit, d3b7d7d, is about
  serving results from cache; its message says nothing about deletion, and the
  cascade reads as the default that was typed rather than a decision that was
  taken.
- `api/delete-account.js` step 4 nulls the other partner's
  `partner_profile_id`, by design, so they are no longer linked to a person
  who is gone.

`api/results.js` then asks `resultsGate({ ..., partnerLinked: true })` with the
link now null, answers `ready: false`, and the app shows the waiting screen.
So someone who paid, finished every exercise and read their results opens the
app and is told they are waiting on a partner who no longer has an account.
Nothing says what happened.

Results are frozen, which is what makes this permanent rather than a bad
afternoon: the row was the only copy, and there is no recompute path that can
run without the other person's answers.

**This is not a decision that needs making.** The policy already made it, in
public, and the code does something else.

## 2. "Your partner is notified that you have deleted your account"

Nothing notifies them. `api/delete-account.js` contains no notification insert
and no email; the word appears nowhere in the file. The `notifications` table
exists (migration 049) and four other files write to it.

## 3. "You will receive a confirmation email"

Twice, in two sections. No email is sent. Note for whoever builds it: the
address has to be read before step 6, because step 6 deletes the auth user and
with it the only copy of the address.

## 4. "Confirm deletion with your password"

Neither surface asks for one. The app calls `deleteAccount()` from a confirm
sheet in `attune-app/src/components/settings.tsx`; the website posts straight
to the endpoint from `src/App.jsx`. Both are a tap and a confirm.

Either the flow gains a password step or the policy stops promising one. That
is a real choice, not an oversight to correct: a password step is friction on
a thing people are entitled to do.

## 5. Deletion is otherwise thorough

Worth saying, because the rest of this document is failures. Every table that
holds a person's own content — notes, tags, annotations, folders,
notifications, post reads, saved posts, privacy preferences — hangs off
`profiles(id) on delete cascade`, and `profiles` cascades from the auth user.
Deleting the auth user in step 6 takes all of it. Orders, workbook files in
storage, and feedback attribution are handled explicitly because their foreign
keys do not cascade. The research archive is skipped unless the person opted
in, and an unreadable preference is treated as opt-out.

---

## What is needed, and from whom

**From Ellie, a decision on 4:** password step, or amend the policy.

**From Ellie, the words for 2 and 3:** what the partner's notification says,
and what the confirmation email says. Both are customer-facing, so both are
hers. The shapes:

- *Partner notification.* One line, in the app and by email. It has to say
  that the other person deleted their account, and what that means for what
  they can still see. It cannot name a reason, because we do not know one.
- *Confirmation email.* What was deleted, what survives (the de-identified
  research copy, if they did not opt out; payment and consent records, for the
  periods section 2 gives), and the address to write to.

**Not from Ellie, once 1 is scoped:** making the code keep promise 1 is a
build, not a fix. It needs, at least:

- a migration changing the two foreign keys so the row survives one partner;
- a way to mark the row as half-orphaned, and the deleted partner's name and
  identifying fields removed from the stored payload rather than left in it;
- a branch in `resultsGate` for "partner deleted", which is not the same state
  as "waiting on a partner";
- a version of the results experience that draws only the sections derived
  from one person's answers, on both surfaces;
- the copy for that state, which is Ellie's.

Until then the honest thing is that the sentence in the policy is not true,
and a lawyer should see this page.
