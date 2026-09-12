# What the legal pages promise, and what the code does

Found in the same sweep as `DELETION.md`, 12 September 2026, and it reads as a
companion to it. Deletion had enough in it to need its own page; this is the
rest of `public/legal.html` checked claim by claim.

Every line quoted below is published. Every line of code named is in the repo
today.

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
