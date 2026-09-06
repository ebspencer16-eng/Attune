# Attune — working agreement

Read this first, every session. It exists so a new session starts where the
last one stopped instead of relearning the project.

**Ellie is the founder and is not a developer.** Explain in plain terms, give
copy-pasteable commands one at a time, and never assume familiarity with git,
terminals or build tools. If something would be faster a different way, say so
rather than waiting to be asked.

**Carolina** handles content review with Ellie.

---

## What this is

A couples assessment platform. Two partners answer independently, and the
product shows them the gap between their answers.

- **Site:** attune-relationships.com (React + Vite on Vercel, auto-deploys on push to main)
- **App:** `attune-app/` (Expo SDK 57, React Native, iOS first)
- **Database:** Supabase
- **Repo:** github.com/ebspencer16-eng/Attune

---

## Non-negotiables

**Editorial voice, for anything a customer reads.** Short declarative
sentences. No em dashes. No hedging (perhaps, might, it seems). No AI tells
(delve, navigate the complexities, leverage, robust). Neither end of any
dimension is better than the other; the gap is the subject. Couple type is a
dynamic, not a diagnosis. When in doubt, write it shorter, then cut a word.

**Never run database writes.** Deliver SQL as a numbered migration in
`supabase/migrations/`. Ellie runs it in the Supabase SQL Editor herself. This
is deliberate and she owns it.

**Never commit secrets.** Not tokens, not keys, not in code, docs or commit
messages. `attune-app/.env` is gitignored and stays that way.

**Never push code that has not built.** `npm run check` and `npx vite build`
for the site. For the app, run it in the simulator.

**The app does not sell.** Get Started opens the website in the system browser.
An app that builds a cart and hands it to external payment is what Apple
rejects for. See `app/ONBOARDING.md`.

**The app never scores anything.** Results come from `/api/results` already
computed. Two scorers drifting apart is how this product starts lying to
people.

---

## The failure that keeps happening

Almost every serious bug here has been the same shape: **one rule maintained by
hand in several places, where nothing checks that they agree.**

Package inclusion lived in four places. The exercise list lived in a dozen.
Auth header casing differed between endpoints. A column existed on one table
and was selected from another. Each looked fine in isolation and failed
silently in combination.

So: **derive, do not restate.** Before adding a second copy of any rule, ask
whether it can read the first. If it genuinely cannot, add a gate.

Existing single sources of truth:

| Rule | Lives in |
|---|---|
| What exercises exist | `api/_exercises.js` |
| What each package includes | `PKG_CAPS` in `api/_lib/entitlements.js` → generates `public/_pkg-rules.js` |
| Alignment threshold | `ALIGNMENT_THRESHOLD` in `api/_lib/results.js` |
| Dimensions, weights, scoring | `api/_type-engine.js` |

---

## Gates

`npm run check` runs all of them, and `npm run build` runs them before
building. They exist because each one caught a real bug that shipped.

`npm run smoke` renders 26 results sections in a headless browser.

**A gate that passes for the wrong reason is worse than no gate.** When you add
one, verify it by planting the bug it is meant to catch and watching it fail.

---

## Verification, non-negotiable

**Never claim a fix without evidence.** Show the diff, the test output, or a
screenshot.

Two habits learned the hard way on this project:

**Verify the result, not the intent.** Edits by string-match have silently
matched nothing more than once while being reported as applied. Read the file
back.

**When it crosses a network boundary, ask the network first.** A sign-in bug
cost four rounds of code reading and simulator restarts. One `curl` found it: a
307 redirect from the apex domain to www was stripping the auth header. Reach
for `curl` before theorising.

**Test the real path, not the demo path.** `?demo=1` strips add-ons, so a
section under test could never appear. A day was lost to that.

---

## App development

Everything the app calls is built and tested: `/api/home` (26-case priority
engine), `/api/results`, `/api/notes`, `/api/posts`, `/api/notifications`.

Specs: `app/SCREENS.md` (screen by screen), `app/ONBOARDING.md` (get started
through first dashboard), `app/README.md` (stack decisions, bootstrap).

```bash
cd attune-app
npx expo start --ios      # add --clear when a change does not appear
```

Identifiers: Team `HX5FX68K6L`, bundle `com.attunerelationships.app`.

The API base URL is `https://www.attune-relationships.com`. **Keep the www.**

Built: home, resources, insights, sign-in. Placeholder: notes. Not built: the
results experience, which is the largest remaining piece.

---

## Ending a session

Leave the tree clean and pushed. If work is unfinished, append a short "where I
stopped" note to `HANDOFF.md`: what is done, what is half-done, what the next
step is. Ellie should never have to reconstruct state from a diff.
