# Making the AES-256 claim true

The privacy policy now says: *"Your answers are encrypted with AES-256 while
stored, and everything travels over HTTPS."*

The HTTPS half is already true. Vercel and Supabase both refuse plain HTTP.

The AES-256 half is almost certainly true today, but **nobody has confirmed
it in writing**, and a security claim in a privacy policy is one you have to be
able to prove. These are the steps, cheapest first.

---

## Step 1: Confirm what Supabase already does (30 minutes, no code)

Supabase runs on AWS. Database volumes and backups are encrypted at rest with
AES-256 by the platform. If that is true on your plan, the claim is accurate as
written and you are done.

What to do:

1. Sign in to Supabase, open your project, go to **Settings → Compute and Disk**.
2. Look for disk encryption. Screenshot it.
3. Open a support ticket, or email your Supabase contact, and ask exactly this:

   > Please confirm in writing whether data at rest for our project, including
   > database volumes and automated backups, is encrypted with AES-256, and
   > whether that applies on our current plan.

4. Save the reply in your legal folder next to the policy. That reply is your
   evidence if anyone ever asks.

**If they confirm it:** the policy sentence stands. Nothing to build. Put the
date of their confirmation in the same folder and re-check it once a year.

**If they do not confirm AES-256 specifically:** either change the policy
wording to match what they will confirm, or do Step 2.

---

## Step 2: Encrypt the answer columns yourself (a day of work, only if Step 1 fails)

This encrypts the answers inside the database, so they are unreadable even to
someone holding a database backup. It is stronger than Step 1 and it is real
work, so only do it if Step 1 does not get you a confirmation.

The columns that hold answers are the ones in `api/_exercises.js`:
`ex1_answers`, `ex2_answers`, `ex3_answers`, `intimacy_data`, `conflict_data`.

Rough shape of the work:

1. Turn on the `pgsodium` extension in Supabase (**Database → Extensions**).
2. Create an encryption key in Supabase Vault. Never put it in the repo.
3. Add an encrypted column beside each answer column.
4. Write a migration that copies existing rows into the encrypted columns.
5. Change every read and write of those columns to go through the encrypted
   ones. `scripts/check-exercise-registry.mjs` will tell you which files touch
   them, which is the point of that gate.
6. Only once every row is copied and every reader is switched, drop the old
   columns in a separate migration.

**The order matters.** Dropping the plaintext columns before every reader is
switched loses answers, and answers are the product.

---

## What this does not cover

Encryption at rest does not protect against a stolen login, a leaked service
key, or a bug that shows one person another person's data. Those are handled by
row-level security and by keeping `SUPABASE_SERVICE_KEY` out of the repo and out
of the browser, which is already the case.

---

## Until Step 1 is confirmed

The claim is in the policy because you asked for it, and it is very likely
accurate. It is not yet evidenced. Get the confirmation before the policy is
published, or soften the sentence to say data is encrypted at rest without
naming a cipher.
