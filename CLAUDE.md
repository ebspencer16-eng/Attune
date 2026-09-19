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
| Launch flags: app live, store URL, physical | `api/_lib/flags.js` → generates `public/_flags.js` |
| Where the site lives | `SITE_URL` in `api/_lib/site.js`; the app's own copy is `SITE_URL` in `attune-app/src/api/client.ts` |
| Which views the website can draw | `RENDERABLE_VIEWS` in `src/App.jsx` |
| The unsubscribe link | `api/_lib/email-footer.js` |
| Package prices, digital and physical | `DIGITAL_PRICES` and `PHYSICAL_PRICES` in `api/_catalogue.js` |
| Add-on prices | `ADDON_PRICES` in `api/_catalogue.js` |
| What each email says | the `*_EMAILS` map in the module that sends it, joined by `api/_lib/email-catalogue.js` |
| Which emails anything actually sends | `api/_lib/email-triggers.js`, generated by `scripts/build-email-triggers.mjs` |
| Which in-app alerts anything actually raises | `api/_lib/notification-triggers.js`, generated by `scripts/build-notification-triggers.mjs` |
| How long a nudge lasts | `NUDGE_COOLDOWN_DAYS` in `api/_lib/next-action.js` |
| Who may make the server send mail | `guardMailOrigin` in `api/_lib/origin.js` |

---

## Gates

`npm run check` runs all of them, and `npm run build` runs them before
building. They exist because each one caught a real bug that shipped.

`npm run smoke` builds, serves, and then does three things in whatever Chrome
is installed: renders every results section and every view of the app (30 and
13), renders all 40 static pages including checkout, and drives every exercise
to its completion screen. It takes several minutes, which is why it is not part
of `npm run check`.

The section list derives from `RESULTS_SECTIONS`. It was once a hardcoded list
asking for `exp-convo-5`, and there have only ever been five expectations
categories, so the conversations are 0 to 4.

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

**A 500 is not a rejection, and a probe tells them apart.** Vercel's two
runtimes take different handlers: edge receives `(req)` and returns a
`Response`, Node receives `(req, res)` and writes to `res`. Mix them and the
function answers FUNCTION_INVOCATION_FAILED before any line in the file runs.

`api/admin-posts.js` shipped declaring `nodejs` and returning a Response, so
publishing an In Practice post from the admin has never once worked.
`api/admin-presets.js` declared no runtime, which means the same thing, and its
commit message promised it would "degrade gracefully" until its migration ran.
It degraded to a 500.

Neither was visible in the code, both were visible in one pass of curl over
every admin endpoint expecting 401s. Ten gave one and two gave 500. The same
afternoon, curl also showed that `/app` signed out returns four kilobytes of
markup with no readable text in it, and that three retired URLs answer 200 with
a blank shell. Reading found none of those.

`check-runtime-shape.mjs` covers the runtime half of it now. The habit is the
part worth keeping: when a surface is deployed, sweep it from outside before
reasoning about it from inside.

**A green build is not a claim that the names resolve.** `vite build` exits 0
on a file that reads a name nothing declares: esbuild treats an unresolved
identifier as a global and emits it. That was tested by planting one in
`src/App.jsx` and watching the build pass. So the website's 15,000-line
renderer had no cover at all for the most basic mistake in JavaScript, and it
had one: `completeLogin` built the partner invite URL from `inviteCode`, which
nothing in that scope declares, so a login with a partner email in the form
threw before `setLoading(false)` and the spinner never stopped.

Three more of the same shape were in `api/` and `public/`: a receipt template
reading three add-on flags it was never passed, the combined CSV export reading
`s` where the rest of the function says `p`, and a missing closing brace that
put `wbVariant` inside `_defaultAddons`, so any cart holding a workbook threw
on every price calculation. `node --check` passes all four, because none is a
syntax error. `check-server-undefined.mjs` asks Babel to resolve scopes and
fails on anything the program scope cannot bind.

**A gate that disables the side effect cannot see where the guard sits.** The
first version of `check-open-writes.mjs` ran the handlers with no Supabase
credentials, so the write was skipped, so moving the guard below the write
changed nothing and the plant passed. Giving the test env credentials that
reach a stubbed `fetch`, and counting the calls, is what made the ordering
visible. If a gate is about when something happens, the thing has to be able to
happen.

**Before building a renderer, find out whether one exists.** Ellie asked for
the workbook to open in the app. I converted the .docx into HTML, then into a
PDF, wrote a font pipeline for it, and shipped both. Her answer: "This does not
look like the workbook we render on the site. Please use the exact same pdf
builder."

`public/workbook-render.html` had been there the whole time. It is the
workbook: a designed page the website hands a payload to and prints, through
`api/generate-pdf.js` when Browserless is configured and html2pdf in the
browser when it is not. Two greps would have found it. Instead there were two
workbooks for a day, and the one the app showed was the wrong one.

The rule this file already states, pointed at myself: a second renderer of
anything is the same failure as a second copy of a rule. The question to ask
before writing one is not "how would I build this" but "what already builds
this", and the answer lives in `api/` and `public/` more often than it looks.

`check-workbook-view.mjs` now holds the one page to its two callers: the app's
payload, the website's payload and the keys the page reads are the same set,
and a caller that drops one fails the build rather than rendering a workbook
with a blank half.

**A page that shows people what the product does is a copy of the product.**
/email-preview held six hand-written mock-ups of emails while the product sent
nineteen from five modules. Five real emails had no preview at all, one
previewed an email retired months earlier, and the six it did show had drifted
in their subject lines and their sentences. Ellie writes every word a customer
reads, and that was the page she read them on.

The same shape as the copy-review document that listed ten action items the
product never rendered. Both are surfaces built to show the product that
quietly became a second draft of it. So: any surface that exists to display
what the product does has to read the product, not restate it. Every email is
now built through a named map in the module that sends it, with a sample beside
it, and the preview renders those.

It also has to say what it cannot show. Five of those emails have no trigger
anywhere; the page says so next to each, from a generated record, because a
list that mixes live copy with retired copy costs review attention on the wrong
half.

**A number that is right in one endpoint is not right.** `create-payment-intent`
priced premium at 198 and `calculate-tax` priced the same package at 295. The
checkout page reads only the tax figure back from the second, so the subtotal
stayed right while the tax beside it was computed on a base a hundred dollars
too high: quoted one amount, charged another. Neither file looked wrong on its
own. Found by listing every dollar amount on the site and asking which were not
in the price list, which took about a minute and is worth repeating for any
number a customer sees.

**A gate encodes a rule, not the current state.** Write it so the reason
survives: name the promise, and say what it deliberately does not cover.
`check-partner-privacy.mjs` is scoped to Conflict Patterns and says why
Physical Intimacy is out of scope, so nobody reads it as "partner data is
private" and either widens it into a feature or quietly loosens it.

**Plant the indirect form, not just the literal one.** Five of the
highest-stakes gates here were planted against in one sitting. All five
caught the shape the bug originally took and missed the shape a refactor
would produce:

| Gate | Caught | Missed |
|---|---|---|
| `check-partner-privacy` | `conflict_data` in a response | a loop over `EXERCISE_COLUMNS` into a response |
| `check-intimacy-privacy` | `intimacy_data` in a response | that, and `...partner` spread into a response |
| `check-entitlement-inputs` | `body.pkg` | `const { pkg } = body`, an aliased body, a loop over add-on names |
| `check-ownership-rule` | `pkg === 'premium'` | `BUNDLES[me.pkg]`, `['premium'].includes(pkg)` |
| `check-entitlement-bypass` | the read inline on the capability line | the same read hoisted one line up |
| `check-auth-headers` | `headers.get('authorization')` | the same in double quotes, as a property, or anywhere under `api/_lib` |

None of those misses is exotic. Hoisting a long expression out of an object
literal, destructuring a body, looping over a list instead of naming five
columns: they are what the code becomes when someone tidies it. The gate
was written against the bug as found, and the bug as found is the least
likely form for it to come back in.

So when you write a gate, write down the other ways to say the same thing
and plant each of them. If the rule is "X must not reach Y", the four to try
every time are: X named outright, X destructured, X reached through a list
or a lookup, and X assigned to a name one line earlier.

**A gate can point at the wrong copy of a duplicated rule, and then it is
worse than nothing, because it reports success about code nobody runs.**

Ellie, for the third time: "Percentages are cut off on some storycards." The
90% on the alignment card had lost the top ring of its %.

`check-card-type-clipping.mjs` was passing, and it was right to. It runs
`cardTypeNative` from `api/_lib/storycard-style.js`, which floors a line height
at the font's own line box and has since the second report. The app was never
calling it. An Expo project cannot import from `api/`, so
`highlight-cards.tsx` carries its own copy of the same arithmetic, and that
copy had no floor. Sixty point type in a fifty-four point box, clipped from
the top, on the one card built around a number.

Two copies of a rule is the failure this file is about. What was new is that
the check existed, was specific, was about exactly this, and was aimed at the
half that was already correct. So when a rule genuinely cannot be shared,
which is the case whenever the app needs something `api/` computes, the gate
has to execute *the copy that ships*. `check-card-type-clipping.mjs` now lifts
`t()` out of the app's TSX by brace depth, strips its types with esbuild, runs
it, and compares its answer to the server's at three card widths. It throws
rather than passing if it cannot find the function, because a gate that has
lost its subject must never report success.

The same week, in the other direction: `/api/notes` answers with `notes`, the
rows with no anchor, and `annotations`, every row anchored to a page.
`results.tsx` read `notes` and handed it to the marking layer, so no highlight,
no underline and no margin icon had ever drawn on a results page, on any
account, since the feature shipped. Nothing failed. The list was a real list
and it was the wrong one. The Learn tab read both and worked, which is why
marking an article looked fine and marking a results page never did.

Two similar names for two halves of one answer is the same shape as two copies
of a rule: nothing tells you which one you took. `check-annotation-source.mjs`
holds every caller of `fetchNotes()` to reading the anchored list.

**A plant that changed nothing proves nothing.** Nine more gates were planted
against afterwards and all nine held, but three of those runs reported a
clean pass on the first try because the string being replaced was not in the
file. `s.replace(needle, ...)` with a needle that does not match silently
returns the original, the gate passes on unmodified code, and the reading is
"this gate is blind" when the truth is "nothing was planted".

Two other bad plants pointed at the wrong thing entirely: changing a weight in
`api/_type-engine.js` did not break `check-scoring-mirror`, because both
surfaces import that file and therefore still agreed. The plant for an
agreement gate is a second copy, not a different value.

So assert the edit landed. `assert needle in s` before writing, and if a gate
passes under a plant, check the file changed before concluding anything about
the gate.

**Where the holes actually were.** Of the gates audited so far, the ones with
holes all matched on a literal name or a single shape. The ones that run the
code and compare the answers, `check-alignment-rule` over 81 answer pairs,
`check-conflict-privacy` building a real partnerView, `check-scoring-mirror`
against the engine, held under every plant. That is an argument for behavioural
gates wherever a rule can be executed rather than described.

Two things went wrong while fixing these, and both are the same mistake
pointed in different directions. Widening a matcher flagged real code
(`p` is an arrow parameter in half a dozen scopes; `acct` is the session
cache, not a toggle), and a sloppy body-extraction swallowed unrelated code
containing the exact word the guard looked for, so an unguarded grant read
as guarded. **A gate that matches too much is not the safe direction.** It
either gets loosened until it matches nothing, or it manufactures the
evidence it was meant to look for.

---

## Verification, non-negotiable

**Never claim a fix without evidence.** Show the diff, the test output, or a
screenshot.

Two habits learned the hard way on this project:

**The browser checks leak Chrome, and a saturated machine looks like a hang.**
`scripts/_lib/browser.mjs` spawns Chrome with `--remote-debugging-port` and
nothing reaps it when a run is interrupted. Three hundred of them accumulated
in one session, at which point `npm run smoke` stopped producing output for
twenty minutes at a time and read exactly like a broken check.

Fixed: `browser.mjs` now registers teardown on the process, so an exit, a
throw, a Ctrl-C or a `process.exit()` all kill Chrome and remove its temporary
profile. Verified by removing the reaper and watching eight processes survive
one script.

If any do escape, `pkill -f 'remote-debugging-port'` matches them and leaves a
real browser alone. `pkill -f 'Google Chrome for Testing'` does not match them
on this machine. Worth suspecting first when a browser check stops producing
output.

**`git checkout --` has now destroyed uncommitted work five times.** Four
were noted before; the fifth was today, undoing a planted bug in
`attune-app/src/api/client.ts` and taking an hour of unrelated edits in the
same file with it.

The fix is not to be more careful. It is to copy the file first and restore
from the copy:

    cp path/to/file /tmp/f.bak     # before planting
    ...plant, run the gate...
    cp /tmp/f.bak path/to/file     # restore

Every plant in this session used that pattern except the one that went wrong.

**The simulator can be driven, and the mapping is the trap.** Synthetic mouse
events through CGEvent (a twenty-line Swift binary) give press, hold, drag and
release, which is the only way to test a gesture without a finger. What cost
two hours was the coordinate mapping: the Simulator window's reported origin
and a scale derived from its width put every click about thirty points high.
Wide targets still worked, so taps on tabs and list rows succeeded and the
toolbar under test never did, which reads exactly like "the toolbar is not
tappable" and sent me through three rewrites of code that was already correct.

Calibrate before concluding anything: render two small coloured buttons a known
distance apart, click, and see which one fires. One round trip, and it turns a
guess into a measurement. `xcrun simctl io booted screenshot` plus a pixel scan
gives the target's exact position; the mapping from there is what has to be
measured rather than derived.

**After many hot reloads the app stops accepting touches.** Not a crash, not a
red screen: gestures through react-native-gesture-handler keep working and
every ordinary press stops. It looks exactly like the control you are testing
being broken. `xcrun simctl terminate booted host.exp.Exponent` and reopen the
exp:// URL before believing anything a tap did or did not do.

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
engine), `/api/results`, `/api/notes`, `/api/posts`, `/api/notifications`,
`/api/tool-data` (the checklist, the budget and the workbook file).

Specs: `app/SCREENS.md` (screen by screen), `app/ONBOARDING.md` (get started
through first dashboard), `app/README.md` (stack decisions, bootstrap).

```bash
cd attune-app
npx expo start --ios      # add --clear when a change does not appear
```

Identifiers: Team `HX5FX68K6L`, bundle `com.attunerelationships.app`.

**Builds go through EAS.** `attune-app/eas.json` has three profiles;
`production` is the one that reaches TestFlight, and it auto-increments the
build number, which is the thing Apple refuses a repeat of. Ellie runs the
build and submit commands herself, because they need her Expo account and her
Apple login: `app/TESTFLIGHT.md` is the walkthrough, written for her. The two
public Supabase values are EAS environment variables rather than repo files,
for the same reason `attune-app/.env` is gitignored.

The API base URL is `https://www.attune-relationships.com`. **Keep the www.**

Built: home, resources, insights, sign-in, notes, settings, all five exercises,
and the full results experience. The nav is two levels and comes from the
server (`resultsNav` in `api/_lib/results-sections.js`), matching the website's
sidebar; all 29 sections render, and `check-results-coverage.mjs` fails the
build if the server sends one the app cannot draw.

**The app does not hand off to the website any more.** Ellie: "Everything
should run in the app. Ideally, a user purchases online then downloads the app
and only uses the app from that point." So: the Starting Out checklist and the
Shared Budget run in the app against `/api/tool-data`; the workbook is a
generated .docx and the tile hands over the file, because its website page is
the page that SELLS it; profile setup happens in the app, with
`/api/create-profile` taking the id from a bearer token when one is present;
and In Practice posts are read in the app, though static In Practice pages
still open in the browser because they are not rows in the posts table.

Two rules came out of that and are gated. `check-app-does-not-sell.mjs`: no app
source may name a price, a checkout route, or the add-on purchase view.
`check-budget-mirror.mjs`: the budget's arithmetic is the one thing repeated in
the app, because its reveal updates as you type, so both copies are run over
the same budgets and any difference fails the build.

Not built: Highlights beyond the storycards, tab-bar badges, and Notes
filtering by source, author, or highlight versus commentary. The tag list has
its own sort, which is what was asked for.

**This list goes stale, and a stale map is worse than none**, because it is the
first thing every session reads. Four of the things it named have been built
for a while and it still said they had not: Settings edits a name and pronouns
through `ProfileEditor`, so the profile card routes in-app rather than to the
browser; the feedback card opens `Feedback` the same way; alerts are read on
the home screen; and the claim that "four server modules write notification
rows nobody reads" was wrong in both halves, since exactly one module wrote
them. Check a line here before repeating it.

Alerts, for what they are now: six kinds with copy in
`api/_lib/notifications.js`, four of them raised, recorded in the generated
`api/_lib/notification-triggers.js`. `new_post` and `results_ready` are
deliberately not raised: the home screen already carries a card for an unread
post and a card for results that are ready, and an alert above it saying the
same sentence is one prompt printed twice. They reach people as rows at the top
of the home tile, not behind a bell.
`check-notification-reach.mjs` fails the build if a kind loses its copy, its
destination, or the screen that draws it.

Still true, and worth knowing because the server already offers them: `/api/home`
sends a `badges` count per tab and nothing in the app reads it.

---

## Ending a session

Leave the tree clean and pushed. If work is unfinished, append a short "where I
stopped" note to `HANDOFF.md`: what is done, what is half-done, what the next
step is. Ellie should never have to reconstruct state from a diff.
