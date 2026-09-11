# Attune — working agreement

Read this first, every session. It exists so a new session starts where the
last one stopped instead of relearning the project.

**Ellie is the founder and is not a developer.** Explain in plain terms, give
copy-pasteable commands one at a time, and never assume familiarity with git,
terminals or build tools. If something would be faster a different way, say so
rather than waiting to be asked.

**Ellie writes all customer-facing copy.** Every word a customer reads is
hers. **Carolina reviews after publication**, not before, so copy is never
blocked waiting on her. Neither of them is the LMFT.

This matters for routing. Do not hold a copy gap for review, and do not write
customer-facing copy yourself to fill one. Name the gap precisely, say what
shape the missing copy needs to be, and leave it for Ellie.

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

**That violation is fixed, and the fix is gated.** Three hardcoded lists once
lived in `attune-app/`: `EXERCISES` in `insights.tsx`, and `CATALOGUE` and
`CATEGORIES` in `resources.tsx`. All three are gone; the endpoints return the
lists and `check-app-derives.mjs` fails the build if an app-side copy comes
back.

The same shape keeps reappearing somewhere new, though, and it is now the most
common bug in this codebase by a distance. In one week: the couple map's small
print, the conflict overview's answer labels, the Side by Side headings, the
What You Each Wrote headings, "Talk about it", the three Reflection page
headers, the mark-placement numbers, the storycard grounds, and the
question-id-to-field mapping for conflict openings. Every one was copy or a
constant typed into `src/App.jsx`, which the app cannot import, so the app
either showed nothing or invented its own.

Two gates now cover it. `check-results-copy-reach.mjs` forbids a literal
sentence inside the website's results renderer: it has to come through a
variable, which means a module under `api/`. `check-storycard-fields.mjs` and
`check-unshown-answers.mjs` cover the other direction, where the server sends
something and a surface never reads it.

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

`npm run smoke` builds, serves, and renders every results section in whatever
Chrome is installed. It reports 25 of 25. It was never 26: the old hardcoded
list asked for `exp-convo-5`, and there have only ever been five expectations
categories, so the conversations are 0 to 4. The list derives from
`RESULTS_SECTIONS` now and cannot drift again.

**A gate that passes for the wrong reason is worse than no gate.** When you add
one, verify it by planting the bug it is meant to catch and watching it fail.

**If you find yourself building a fixture that mirrors an existing one, stop.**
That is the signal you are writing a second version of a rule rather than a
second half of it. Two gates that test the same thing slightly differently is
the same failure as two copies of a rule: they drift, and the weaker one wins
because it is the one that still passes.

The split that is worth having is by *what* is checked, not by how. When the
conflict privacy rule needed a second gate, the useful division was: one proves
the allowlist itself carries no pattern data, the other proves no endpoint
bypasses the allowlist. Neither could be deleted without losing coverage. A
second fixture would have been a rewrite with a different name.

**A gate matching on a literal name is blind to anything reached through a
registry.** This is the cost of the pattern the rest of this file argues for.
`api/home.js` selects every answer column through `EXERCISE_COLUMNS`, so the
string `conflict_data` appears nowhere in it, while the row it holds carries
that column. A privacy gate filtering files on the literal skipped the file
entirely, and a spread of that row into a response would have leaked conflict
patterns unseen.

Deriving the list is still right; it is what stops the list going stale. It
just means any scanner has to resolve the derivation too. When you write a gate
that looks for a column, a route, an exercise key or a package name, ask what
the indirection for that thing is, and match on both.

**Where a JSX comment cannot go.** Section-block markers are JSX comments, and
there are exactly two places they will not compile. Both fail loudly at build
time, so they cost minutes rather than being dangerous, but knowing them saves
the round trip:

    return (
      {/* marker */}          <- no. Nothing may sit between `return (` and
      <Layout>                   the root element. Put it inside the root.

    {items.map((x) => (
      {/* marker */}          <- no. A callback's return position takes one
      <Row key={x.id} />         expression. Put it above the `.map(`.

Everywhere else is fine: between siblings, before a conditional, inside a
fragment. When in doubt put the marker on the line above the block's outermost
element rather than inside it.

**Never write a file in the same expression that computes its contents.**

    open(p, 'w').write(build_the_string())     # do not

Python evaluates `open()` first, which truncates the file, and only then
evaluates the argument. If building the string raises, the file is left at
zero bytes and nothing was ever written. That emptied src/App.jsx, 15,710
lines, and only git had it. The pattern had worked all session because the
argument had never failed.

Compute the whole string, assert it is plausible, then open the file:

    out = build_the_string()
    assert len(out) > 400000
    with open(p, 'w') as f: f.write(out)

The assertion is not decoration. It caught the next bad edit the same day: a
brace-depth scan that miscounts self-closing tags returned no end position,
and the guard stopped it before it touched the file.

**Absence is also what deletion looks like.** Before reporting that something
is unreachable, missing or orphaned, check whether it was removed on purpose.
`git log -S` on the thing takes ten seconds and answers it.

`/how-it-works` and `/couple-types` were retired into `/methodology` in
5c1924e, which says so in its subject line, and every nav link to them was
replaced. Auditing the nav months later, I found two pages nothing linked,
reported them as "very close to orphaned", and they were put back into every
nav and footer on the strength of that framing. A deliberate retirement was
undone because the audit measured reachability and never asked intent.

An audit that only measures the current state cannot tell a gap from a
decision. When something is missing, the question is not just "should this be
here" but "was it taken out, and by whom, and why".

**When a check has been failing for a long time, the failure is not the
problem. Nobody noticing is.** `npm run check:docs` reported "18 of 27
generators failed" on every run, because nineteen of them wrote to a sandbox
path that does not exist on a developer's machine. None of that was a
generator being broken.

A tool that always reports eighteen failures is a tool nobody reads, and a real
break hides inside the noise. One did: the copy-review document had been
showing ten action items the product has never rendered, so ten pieces of copy
were reviewed and approved that nobody would ever see, while the nine that ship
went through no review at all.

Those were the same bug wearing two costumes. A tool nobody reads and a
document nobody can check are both places where confidence outruns evidence,
and the second was hiding inside the first. So: separate "broken" from
"unavailable here" in any check that shells out, and treat a long-standing
failure as a question about the check, not just about the thing it checks.

**State the method next to the number.** A precise figure invites less
scrutiny than a vague one, which is exactly backwards when the precision came
from one grep over one file.

"The app draws 8 of 21 highlight card fields" was wrong: it draws all 21. The
scan had read `results.tsx` and the storycards live in `highlight-cards.tsx`.
Nobody questioned the figure, including me, because 8 of 21 sounds like
something that was counted. "Most of them, from a scan of one file" would have
drawn the follow-up question that a specific number did not.

So: say where a number came from in the same sentence you say the number. A
single-file scan is a lead, not a conclusion.

**A new field on the compute path reaches new users only.** Results are
frozen: once a couple's row exists it is served back as it was written. So
anything the display needs, that can be derived from what is already stored,
has to be derived on the way out, in `withContent`, not added next to the
thing it comes from.

The couple map needed two coordinates per person. They were added in
`api/_lib/results.js` beside the axes they are computed from, which is where
they look like they belong, and the map then worked for nobody: every couple
who had already finished was being served a stored row without them. The only
people who would ever have seen a map are ones who had not finished yet.

Ask, of every field you add to results: does this reach a couple whose row was
written last year? If it is derived from something already in the row, put it
in `withContent`. If it genuinely cannot be derived, it needs a migration, and
that is a different and larger decision.

**A gate encodes a rule, not the current state.** Write it so the reason
survives: name the promise, and say what it deliberately does not cover.
`check-partner-privacy.mjs` is scoped to Conflict Patterns and says why
Physical Intimacy is out of scope, so nobody reads it as "partner data is
private" and either widens it into a feature or quietly loosens it.

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

Built: home, resources, insights, sign-in, notes, settings, all five exercises,
and the full results experience. The nav is two levels and comes from the
server (`resultsNav` in `api/_lib/results-sections.js`), matching the website's
sidebar; all 29 sections render, and `check-results-coverage.mjs` fails the
build if the server sends one the app cannot draw.

Not built: Highlights beyond the storycards, the post reader, notifications,
tab-bar badges, and Notes filtering.

---

## Ending a session

Leave the tree clean and pushed. If work is unfinished, append a short "where I
stopped" note to `HANDOFF.md`: what is done, what is half-done, what the next
step is. Ellie should never have to reconstruct state from a diff.
