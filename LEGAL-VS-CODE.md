# What the legal pages promise, and what the code does

Found in a sweep on 12 September 2026, claim by claim against
`public/legal.html`. Deletion had enough in it to be a page of its own for a
month; it is the second half of this file now, folded in on 2026-10-10 because
two files for one conversation with one lawyer is one more than the
conversation needs.

Every line quoted below is published.

**Read the next section before the rest of this file.** Everything below it
was true when it was written and most of it is not true now: all four of the
first half's findings and all five of the deletion half's have been built or
settled since. The claims are kept because the history is the useful part for
whoever reads this, not because they describe the product today.

---

## Where this stands, 2026-10-17

Re-measured claim by claim. Each line names the evidence, so nothing here has
to be taken on trust.

| What this file reported | Where it stands now |
|---|---|
| 1. Consent records promised for seven years, none kept | **Built.** `consent_events` (migration 058) holds a timestamped row with a one-way hash of the address rather than the address, written from `api/stripe-webhook.js` at checkout and `api/create-profile.js` at account creation, through `api/_lib/consent.js`. The row loses its link to the profile on deletion and survives, which is what "retained even after account deletion" asks for. |
| 2. Payment records promised for seven years, we delete ours | **Settled in the copy.** The published paragraph now says Stripe holds the transaction and that deleting an account deletes our order row, which is what the code does. |
| 3. The EU and UK banner is a US notice | **Built.** `/api/region` answers where the visitor is, the notice becomes a consent gate where consent is required, and a refusal stops error reporting and tracking. Held by check-consent-gate, check-region-once and check-tracking-consent. |
| 4. The app sees no notice | **Built.** `index.html` loads `/_flags.js`. check-notice-reach: 33 customer-facing pages, every one loads it. |
| Deletion 1. The surviving partner loses every result | **Built.** The frozen row survives, the departed partner's name is gone from it and the survivor's results stay. check-results-survive-deletion. |
| Deletion 2, 3, 4 | **Built**, recorded at the end of this file. |
| Deletion 5. Deletion is otherwise thorough | **Still true, and measured again today.** Every table that holds a row belonging to a person either cascades with the account or loses the link to it: 17 tables, nothing left carrying a name. |

**What is genuinely open**, and all of it is a question rather than a defect:

- Whether the consent record's design satisfies the published promise: a hash
  rather than an address, kept for seven years, the link to the account
  dropped at deletion.
- Whether the banner's behaviour satisfies GDPR consent, as built.
- Whether the survey's fine print covers quoting an answer, where nothing
  published carries a name. This is R12 in TASKS.md.
- The retention table lists seven categories of data. The product also keeps a
  relationship journal, annotations and tags, saved and read articles, and
  product analytics tied to an account while it exists. All of them go when
  the account does, so nothing outlives the promise; whether the table should
  name them is a copy question for Ellie and a completeness question for a
  lawyer.

---

## 1. Consent records are promised for seven years. None are kept.

**Published**, in the retention table:

> Records of user consent events (when each partner accepted Terms and Privacy
> Policy). Retained for 7 years from the consent date for legal compliance
> purposes. These records are retained even after account deletion.

Nothing records an acceptance. There is no checkbox at checkout, no column,
and no table. The EULA on the same page takes a different position, that
buying is the act of agreeing:

> By purchasing or accessing Assessment Content, you agree to the terms of this
> EULA.

On that reading the order row is the nearest thing we have to a consent
record, which makes the second sentence worse rather than better:
`api/delete-account.js` step 3 deletes the person's orders outright. Nothing
survives account deletion, and the policy says these records specifically do.

Two ways out, and they are different sizes. Record the event, which means a
table, a write at checkout and at account creation, and a decision about what
to do for everyone who bought before it existed. Or amend the paragraph to
describe what the EULA already says: that purchase is the agreement and the
order is the record, for as long as the order exists.

## 2. Payment records are promised for seven years. We delete ours.

**Published:**

> Payment records. Transaction ID, amount, date, and last four digits of the
> payment method. Retained for 7 years from the date of transaction to comply
> with financial regulations.

We store no last four. Nothing in the schema or the webhook records card
digits, which is the right call and not what the sentence says.

The rest, transaction id and amount and date, is on the order row, and step 3
of deletion removes it. So the seven years is not ours to promise.

**The money is not lost.** Payments run through Stripe and Stripe keeps the
transaction record on its own schedule, independent of anything we delete. The
defect is that the paragraph describes Attune's retention and Attune does not
retain it. A bookkeeper asked to reconcile a deleted customer's purchase would
have to go to Stripe, which is fine, but it is not what the page says.

## 3. The EU and UK consent banner is a US notice, and the app has neither.

**Published:**

> If you are accessing the Service from the European Union or United Kingdom, a
> consent banner will be presented to you upon first visit.

What exists is a privacy **notice** at the bottom of the page, built in
`public/_flags.js`, and its comment argues clearly for why it is not a consent
gate:

> US state privacy law is opt-out: consent is not required before storing what
> the site already stores, so a wall that blocks the page until someone clicks
> Accept would be asking permission we do not need and cannot honour a refusal
> of.

That reasoning is right for the US and this page is not about the US. The
banner has no Accept button, and it does not vary by where the visitor is.

There is a second half to it. `_flags.js` is included by nine static pages:
home, offerings, checkout, faq, contact, legal, gift cards, wedding registry
and privacy choices. It is not in `index.html`, so the React application never
loads it. Somebody who follows a link straight to `/app` and stays there, which
is now the intended path for every customer after purchase, sees no notice at
all.

## 4. Deletion

Five more claims, one of which loses a paying customer's results. Separate
page: `DELETION.md`.

---

## What is needed, and from whom

All four are Ellie's calls, because each one is a choice between changing the
product and changing published words, and the words are hers.

1. **Consent records:** record the event, or amend the paragraph to match the
   EULA. The second is a paragraph; the first is a table, two write paths and a
   decision about existing customers.
2. **Payment records:** amend to say the payment record lives with our payment
   processor. Or stop deleting orders at account deletion, which trades a
   correct sentence for keeping a shipping address after someone asked us to
   forget them. The first is better.
3. **The banner:** either the sentence describes the notice we actually show,
   or the notice becomes a real consent gate for EU and UK visitors, which
   needs geolocation, a stored preference, and something that honours a
   refusal.
4. **The app sees no notice.** This one is not a legal question. `index.html`
   can include `_flags.js` the way the static pages do. Worth doing whichever
   way 3 goes, so it is listed as work rather than a question.

A lawyer should see this page and `DELETION.md` together. The legal bundle in
`public/legal.html` describes a more careful product than the one that exists,
which is the safer direction to be wrong in for a customer and the worse one
to be wrong in for us.

---

# What deletion does, and what we published that it does

Found in a sweep on 12 September 2026. Nothing here is a guess about intent:
every claim below is the published policy on one side and the line of code on
the other.

The published **Data Retention and Deletion Policy** is live in
`public/legal.html`. It makes five promises about account deletion. The code
in `api/delete-account.js` keeps one of them.

---

### 1. The partner does not lose everything. They do.

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

### 2. "Your partner is notified that you have deleted your account"

Nothing notifies them. `api/delete-account.js` contains no notification insert
and no email; the word appears nowhere in the file. The `notifications` table
exists (migration 049) and four other files write to it.

### 3. "You will receive a confirmation email"

Twice, in two sections. No email is sent. Note for whoever builds it: the
address has to be read before step 6, because step 6 deletes the auth user and
with it the only copy of the address.

### 4. "Confirm deletion with your password"

Neither surface asks for one. The app calls `deleteAccount()` from a confirm
sheet in `attune-app/src/components/settings.tsx`; the website posts straight
to the endpoint from `src/App.jsx`. Both are a tap and a confirm.

Either the flow gains a password step or the policy stops promising one. That
is a real choice, not an oversight to correct: a password step is friction on
a thing people are entitled to do.

### 5. Deletion is otherwise thorough

Worth saying, because the rest of this document is failures. Every table that
holds a person's own content — notes, tags, annotations, folders,
notifications, post reads, saved posts, privacy preferences — hangs off
`profiles(id) on delete cascade`, and `profiles` cascades from the auth user.
Deleting the auth user in step 6 takes all of it. Orders, workbook files in
storage, and feedback attribution are handled explicitly because their foreign
keys do not cascade. The research archive is skipped unless the person opted
in, and an unreadable preference is treated as opt-out.

---

### What is needed, and from whom

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

---

### What was built, 12 September 2026

Ellie answered on all four questions. Three are done:

**4, the password step.** Both surfaces ask for one, and
`api/delete-account.js` verifies it before it touches anything, for accounts
that have one. Google and Apple sign-ins have no password to confirm with, so
the check is gated on the account having an email identity rather than on
whether the field arrived. A wrong password answers 403, not 401: they are
authenticated and the request is refused. `check-delete-reauth.mjs`.

**2, the partner notification.** A row in `notifications` and an email. The
email is what reaches them today, because no app screen reads the list yet.
Their `email_opt_in` is honoured at the send.

**3, the confirmation email.** Sent to the address read in step 0, before the
auth user is deleted, and sent in step 7, after it. A confirmation sent first
is a lie if the delete then fails. `check-deletion-notices.mjs` proves that
ordering, because getting it wrong is silent: the mail simply goes to
undefined.

The wording of both emails is in `api/_lib/deletion-emails.js`, and the
notification's is one case in `api/_lib/notifications.js`. It is mine, and
Ellie's to edit.

**1 is still open**, and it is the one that costs a customer: the remaining
partner still loses every result rather than keeping the parts derived from
their own answers. Scoped above. Not started.

