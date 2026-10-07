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
| Whether a page has drawn every mark on it | `attune-app/src/constants/mark-reach.ts` |

---

## Gates

`npm run check` runs all of them, and `npm run build` runs them before
building. They exist because each one caught a real bug that shipped.

`npm run smoke` builds, serves, and then does three things in whatever Chrome
is installed: renders every results section and every view of the app, renders
every static page including checkout, and drives every exercise to its
completion screen. All five drive now, which was three until the driver learned
to ignore a consent banner, to anchor its idea of a finish button, and to leave
a ranked item where it put it. It takes several minutes, which is why it is not
part of `npm run check`.

The counts in that sentence used to be written out here and had gone stale, so
they are not any more. The run prints them.

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

**iOS does not slant a registered typeface, and says nothing.** `fontStyle:
'italic'` on a named family draws the upright face and reports no error, so
eighteen places in the app asked for italic and every one of them was upright,
including three Ellie had asked for by name months apart. It survived because
an upright face is a valid render: nothing was wrong enough to fail.

Italic is a family here, not a flag. `Fonts.bodyItalic`, `Fonts.bodyBoldItalic`
and `Fonts.displayItalic` in `attune-theme.ts`, each with a file in
`attune-app/assets/fonts` and a registration in `_layout.tsx`. A font file
ships in an EAS update like any other asset, so this needed no build.
`check-fonts.mjs` fails if the scale names a family nothing registers, which is
the same bug one weight at a time.

**A mark is a copy of the words, and the words live on the server.** A note is
anchored by `anchor_context`, the text it was made on, and the margin marker is
drawn by whichever `<Prose>` contains that text. So a copy edit in `api/`
orphans every mark made on that sentence, silently, and so does a paragraph
that is inside a collapsed section and therefore never rendered.

Enumerating the ways is a list that goes stale. The rule is inverted instead:
every rendered block reports what it drew, and anything anchored to the page
and unclaimed is a mark the reader cannot see. See `mark-reach.ts` and
`check-mark-reach.mjs`, which executes it rather than describing it.

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

All three are gone now: 1316f378 deleted how-it-works.html, couple-types.html
and the `/methodology` alias that pointed at the first of them, so a 404 on any
of the three is the current and correct answer. That sentence above described
`/methodology` as a live page for weeks after it stopped being one, which is
this file doing the thing it warns about four paragraphs down: a stale map is
worse than none, because it is the first thing every session reads.

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

**A key written twice in one object literal loses the first, silently, and a
gate that rebuilds the markup cannot see it.** The Learn block's budget is a
`minHeight`, which is the whole of that fix, and the style object already
carried `minHeight: 0` from when the budget was a `height`. The new line went in
above it, so the zero won and the block had no minimum at all for a day.

check-learn-gap passed the whole time. Its harness builds the block from the
budget expression lifted out of `src/App.jsx` rather than rendering that style
object, so it applied a budget the page did not. The rule this file already
states, now pointed at a gate I wrote: a gate aimed at the wrong copy reports
success about code nobody runs.

`check-duplicate-keys.mjs` asks Babel for every object expression and fails on a
plain key written twice. Its first version walked lines and counted braces and
reported three findings, two of which were the two branches of a ternary:
`cond ? { id } : { id }` is two objects with one key each, and no line-based
scan can tell those apart.

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

**The two ways a gate gets defeated without deleting anything.** Six gates
written in one session each passed a plant on the first attempt, and every one
failed the same two ways.

*Matching a name instead of what follows it.* `/payloadForCouple/` matches
`payloadForCoupleX`. `/beforeunload/` matches `xbeforeunload`. `/countAnswers/`
matches a file where the helper is still defined and the comparison is gone.
`/latest\.current/` matches a cleanup that reads it on one line and hands the
stale closure to the save on the next. Match the name with its call, its quotes,
or the argument it is given.

*Disabling a branch with a constant.* `if (false)` leaves every string, every
helper and every identifier exactly where it was, so any check that asks whether
something APPEARS still passes. `check-ab-scale` found this first and it has
recurred five times since. A guard is checked by what it compares.

So when a plant passes, the question is not "is this gate blind" but "did I
change what the gate reads, or only what it does". Both are worth planting, every
time.

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

**A plant can land and still prove nothing, if the test cannot sample it.**
Two plants against `check-feedback-mirror` passed on their first run and both
were the gate's fault rather than the code's.

The rule is a pair of thresholds at 0.75 and 1.5. The gate swept scores in
quarter steps, so when the plant moved the website's threshold to 0.80 there
was no sample point anywhere between the two values and nothing changed. The
needle was present, the file was different, the gate was blind. Sweeping a
round grid over a rule made of thresholds tests everywhere except the only
places that matter: choose the inputs either side of each line, by a hundredth,
rather than sweeping and hoping to land on one.

The second is worse and quieter. The gate lifted the website's copy of the ten
dimension labels and passed those same labels to the server's copy as its
input. So changing a label on the website changed both sides together, every
sentence that names one compared against itself, and the comparison was
vacuous. **When a gate compares two implementations, each one's data has to come
from its own side.** A fixture shared between them turns a comparison into an
assertion that a function equals itself.

**A file walk that does not recurse is the same blindness as a matcher that
knows one spelling.** check-chrome printed "one nav across 12 pages" for months
and was telling the truth about the twelve it could see: its `readdirSync` read
`public/` and nothing under it, so the seventeen In Practice pages in
`public/practice/` had never once been compared. They had drifted into a nav
offering /offerings twice under two labels and the FAQ page twice, one of those
as "Reviews", with no Wedding Registry at all.

Adding the directory also found a third piece of chrome that neither the nav
check nor the footer check had ever looked at: the mobile menu, pasted into two
dozen pages, which is the menu a customer on a phone actually uses. The half of
the nav that matters most was the half nothing watched.

So when a gate reports a count, ask what it counted. Eighteen gates here walk a
directory without recursing; most are scanning a flat one on purpose and say so,
and the one that was not said nothing either way. If a scan's scope is
deliberate, write the reason beside it, the way check-stripped-fields does:
"Endpoints are the top level of api/. Underscore files are libraries."

**A gate that reads a comment as code punishes a file for saying what went
wrong.** check-style-codes flagged track-type.js for carrying a four-letter code
pattern, and the pattern it found was quoted inside the comment explaining that
the four-letter pattern had been the bug. Blank comments before scanning, or the
cost of writing down what happened is a failing build.

**A gate that nothing runs is not a gate.** Two were sitting in `scripts/`
connected to nothing: `check-section-aliases`, which stops a page rename making
every mark on that page invisible, and `check-tab-reset`, which Ellie asked for
by name after finding the gesture on one tab and not the others. Both passed.
Neither had ever been in `package.json`; `git log -S` on the name finds no
commit that added or removed it. They were written, they were right, and for
months they proved nothing. `check-gates-run.mjs` fails the build on a
`check-*.mjs` that neither `npm run check` nor the smoke names.

**An escape hatch nobody needs is one somebody will use.**
`check-exercise-flow` let an exercise carry a sentence saying why it could not
be driven; the run printed KNOWN beside it and exited 0, counting it as a
completion. That is how the file reported "5 exercises completed and stored
correctly" while driving three. Both excuses turned out to be wrong about their
own exercise, because an excuse written from reading the code is a guess and
once written it stops anyone looking. All five drive now and the field is gone
rather than unused: the hatch is what someone reaches for at the moment a real
regression starts failing.

**A comment that describes a dead path is worse than no comment.**
`content.dimensions[].shift` carried "the same ones the website shows... so both
surfaces make the same call". Nothing reads those two fields. They were added
for the app and orphaned eleven days later by a redesign, and they use a
different threshold from the tile that replaced them. Because the comment read
as a description of the live path, the obvious next thought was that the website
disagreed with it, and an hour went into chasing a divergence that does not
exist. Prose beside code is not checked by anything, so when a path dies, the
sentence describing it is the part that goes on doing damage.

**Check the quotation against the page.** Six were organised under
"direct quotes from these publications, cited accurately". Two were not
quotations. The product showed "Contempt is the single greatest predictor of
divorce" under a researcher's byline, and that page says "Contempt is the worst
of the four horsemen. It is the number one predictor of divorce, but it can be
defeated." Both were fair readings and neither was a sentence anyone wrote.
`check-insight-provenance` had said in its own header that the wording "can be
checked by a person", and nobody was ever going to be that person.
`check-quotes-verbatim.mjs` opens the url, and reports a page it could not reach
separately from a page that contradicts us, because a machine with no route out
is not evidence about a quotation.

**Two surfaces agreeing is not the same as the payload being read.** Chasing
whether the website's results composition matches the server's turned up four
apparent divergences and every one dissolved under measurement: a couple type
that differed because the demo path types from four archetypes rather than from
the demo couple, so I had compared two different couples; blended scores against
self-report, where all three call sites use self-report; two thresholds that
belong to two different fields; and couple-type prose the website drops, which
the app drops identically and which `git log -S` shows was retired at Ellie's
ask. What the exercise did find is prose the server ships that neither surface
renders. The question to ask of a payload field is not only "do both surfaces
agree about it" but "does either one draw it".

**An app fix is not delivered until an update is published.** Ellie, on three
app fixes: "Not seeing any difference here on my phone. I've cleared the app 4
times." She was right and clearing was never going to help. The last update on
the production channel was ten app commits earlier, so none of them was on her
phone, and I had been reporting them as done on evidence from a simulator.

Ask Expo rather than reasoning about it. The update server is public and answers
in one curl:

    curl -s -D - -o /dev/null -H "expo-platform: ios" \
      -H "expo-runtime-version: 1.0.0" -H "expo-channel-name: production" \
      -H "expo-protocol-version: 1" -H "accept: multipart/mixed" \
      https://u.expo.dev/<projectId>

`createdAt` in the manifest is when the running bundle was published; compare it
against `git log --since` over `attune-app/src`. Publishing needs her Expo
account, so the useful thing to hand her is the one command and the count of
commits she cannot see. Settings, at the bottom of the app, shows the running
bundle's date, which is how she can answer "am I on the latest" herself.

Two launches, not one: the update downloads in the background on the first and
runs on the second, which is why repeated force-quits look like nothing is
happening.

**Serving the newest file is not serving the right file.** Ellie: "it still
downloaded the docx version". Both workbook builders write into
`workbooks/<orderNum>/`, despite a comment claiming they were kept apart, and
the link builder listed that folder and signed whatever was newest. For every
couple that was the Word file, because no PDF had ever been built. One column
recording a result without recording which builder made it.

When two producers write to one place, the format is part of the identity. It
lives in `api/_lib/workbook-format.js` now and the link is only ever minted over
a file of that format; anything else answers null, which puts the surface into
its not-ready state. A missing workbook is visibly missing and the wrong one
looks finished.

**innerText reports what CSS renders.** The website sets `text-transform:
uppercase` on its buttons, so a gate comparing a button against the copy module
saw "BACK TO INSIGHTS" against "Back to insights" and failed three exercises on
a difference that was not one. Use `textContent` when comparing words: the
module owns the wording and the stylesheet owns how it is set. The same trap
caught a probe of mine an hour later, so it is worth knowing twice.

**Before asking her a question, search the repo for her own earlier words.** I
had a question drafted asking which two screens "section 2" and "section 3"
meant, and the answer was sitting in a comment in `src/App.jsx`, quoting her
from a previous round: "Maybe section 3 of dashboard on site could have the
content from learn and notes on the app?" Her instructions are quoted all over
this codebase, deliberately, and `grep` over them answers a surprising share of
what looks like it needs asking. Asking a question she has already answered
spends her attention twice.

**TASKS.md is updated before the work, not after it.** Ellie: "Every single time
I send a message, your first step should be updating tasks.md with DETAILED
action items for yourself. Then, work through the list, then, adjust the tasks.md
file appropriately and send it back to me for my responsibilities."

That process was already written in the file, in those three steps, and I had not
been following it. Working first and recording afterwards is how an item gets
recorded as whatever it turned into rather than as what she asked for.

**Design and copy belong in section 3, never section 4.** Section 4 is "done and
verified", and what verifies a row there is a check. Nothing can check whether a
screen looks right, so a design pass filed there is a pass nobody will ever
look at.

This is how a whole request disappeared. She asked for the dashboard's section 2
to look like the app's Insights tab and section 3 to look like the Learn tab. I
added a progress ring and an insight card, filed it in section 4 as done and
verified, and she found out it had not happened by looking at the site: "Not only
are those not done, but they never appeared in tasks as open or ready for review.
This is not ok."

Two failures at once, and the second is worse. Under-delivering is visible and
gets corrected. Filing something as verified takes it off both of our lists.

**"Make it look like X" is not "add one element from X".** The ring and the card
were both real improvements and neither was the request. When an instruction
names a thing to mirror, go and read that thing, list what makes it recognisable,
and do those. For a screen that is usually the ground, the type on it, and the
shape of the blocks, in that order of what a person notices.

**Never ask her to paste a secret.** Ellie: "If you want me to do that in the
future you have to tell me instead of just saying 'send it to me'." I asked her
to paste a Google Books key into chat, used it, and then told her it should not
be in a transcript, which is backwards. The ask is always:

    put it in Vercel as NAME and tell me it is set

and then read it from `process.env` at run time. The one exception is a value
that is not a credential, like a hostname, and even then the better question is
usually one she can answer from a dashboard without revealing anything.

**`eas update` publishes the folder, not the branch.** She published twice, the
Settings date moved both times, and the app on her phone was still days old,
because the command sends whatever is checked out locally. The pull is in the
npm script now, which does not help the first time: the script that pulls only
runs once you have pulled it. So the instruction to hand her is always three
lines, `git pull` included, and the way to tell whether it worked is the layout
in front of her rather than the date, which moves either way.

**A JSX comment cannot sit between `{cond && (` and the element**, for the same
reason it cannot sit between `return (` and the root. This file already said so
about `return`; the guard form catches people the same way. Put the comment
above the whole expression.

**When an edit to src/App.jsx goes wrong, restore and replay rather than
patching the patch.** Two bad insertions into a 15,000-line JSX file cost more
to unpick than to redo: the second repair removed a `)}` belonging to something
else and left the tree unbalanced in a different place. Keep a copy before the
first edit, and when a structural change misfires, go back to that copy and
re-run the whole sequence as one script with its checks. The script is cheap to
re-run and reasoning about half-applied JSX is not.

**A rule applied where a value is minted is not applied where a stored one is
reused.** The workbook is a PDF, and `freshWorkbookUrl` filtered the folder to
PDFs. The surface that hands it over then did this:

    url: fresh || (signedUrlIsLive(row.workbook_url) ? row.workbook_url : null)

Minting returns null for exactly the couples whose folder holds no PDF, which
was every couple, so the branch that enforced the rule and the branch that
bypassed it were one expression and the bypass is the one that ran. Ellie
watched a 40 KB `.docx` open in the app while `check-workbook-format` passed,
because that gate tested the minting function: the half that was already right.

So for any rule about what a value may be, find every producer of that value.
A fresh one and a cached one are two producers. A gate pointed at one of them
reports success about code nobody runs.

**A constant that exists is not a thing that is drawn.** The first
`check-mark-artwork` asked whether the component carried the favicon's four
paths. Deleting the `<path>` that draws the right bubble leaves `BUBBLE_R`
declared, so every string was still carried and the component rendered half a
mark. The gate counts what is drawn now. The same shape: a helper imported and
never called, a constant declared and never passed. Ask what the code DOES with
the name, not whether the name is there.

**curl against the live site can be answered by Vercel's bot checkpoint, and it
looks like a thin page.** A sweep of all forty routes reported sensible-looking
text lengths, and several of those were the checkpoint rather than the page:
`/offerings` came back with one `href` on it. It is intermittent and arrives
after a burst of requests. Send a browser user agent, and grep the body for
`security-checkpoint` before believing any measurement taken from outside.

**innerText reports what CSS renders, and this has now cost three probes.**
The site sets `text-transform: uppercase` on eyebrows and buttons, so a check
for "From In Practice" or "Back to insights" fails against text that is
character for character correct. It has fooled a gate, a probe of my own an hour
later, and a third probe the next day. Use `textContent` when comparing words,
or match case-insensitively when the string is a label. The rule: innerText is
what a person sees, textContent is what the code said, and copy comparisons are
about the second.

**A hand-typed list beside a shared one is always the shorter list.** The
website carried `BLOG_POSTS`, six In Practice articles typed into src/App.jsx,
while api/_in-practice.js held twelve and is what the app is served. So the two
surfaces offered different libraries and the website's was half. One of the six
was not an article: `/practice/understanding-each-other` is the section index
that lists the Understanding Each Other pieces, offered under the tag "Read" as
though it were something to read.

Both found by building a list of the articles for someone else to work from,
which is the usual way. A list of a thing is where the thing's inconsistencies
show up: the same exercise turned up two different names for one In Practice
section, and one book cited two ways in the quotations.

**A key list typed by hand is a key list nobody checked against the keys.**
`EXP_LIFE_KEYS` in src/App.jsx names six categories and looks each one up as a
life-question answer, `lq_<key>`. Five of the six ids do not exist: the real
questions are lq_location, lq_faith, lq_values, lq_finances and so on. So five
of six rows have carried a null partner answer and a meaningless alignment flag
into the legacy `expGaps`, which public/workbook-render.html draws six rows of.

It survived because every value it produces is a valid value. A null answer and
`aligned: false` is what an unanswered question looks like, so the output was
indistinguishable from a couple who had not finished.

The general shape: when one list indexes into another, the check is not that the
list is right but that every key in it resolves. That is two lines and it would
have caught this, the exercise-to-chapter mapping, and the In Practice article
that pointed at a section index.

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

**"Is my fix on the site" is answered by a marker, not by a hash.** Ellie, of a
round of fixes: "I don't think what I'm seeing on the site is current. I've
refreshed, hard refreshed, checked the deployment status." The site was current,
and settling that first changed what the rest of the round meant: two things she
was looking at were still broken rather than undeployed.

The asset hash is not the answer. Vercel builds with `VITE_SUPABASE_*` set and a
developer's machine does not, so a local build legitimately hashes differently
from a correct deploy. What works is a string only the new code has: pick one,
build the PREVIOUS commit too and count it there, then count it in the bundle
the live site serves. `readMinutes` was 14 at HEAD, 12 one commit earlier, and
14 live. A marker you have not checked against the previous commit is a guess;
the first one I tried was a colour that is still used in seven other places.

Her own replies are evidence too, and cheaper. She had approved two items from
the newest commit, which she could only have seen on a current site.

**A green build here is not a deploy.** `npx vite build` passed every time
while Vercel had been failing for two commits, so two rounds of Ellie's fixes
were not on the site and the only symptom was that they were not there.

src/App.jsx imported a `.ts` file from `attune-app/`, which is the right
instinct and the wrong extension: vite runs a `.ts` through esbuild, esbuild
reads the nearest tsconfig, and `attune-app/tsconfig.json` extends
`expo/tsconfig.base`. The website's own `npm ci` installs the root package
only, so that resolves to nothing off this machine. A developer has
`attune-app/node_modules` and never sees it.

Two habits out of it. Vercel's build command is in `vercel.json` and is NOT
`npm run build`, so run that command, in a clone, after `npm ci`:

    git clone . /tmp/x && cd /tmp/x && npm ci && <buildCommand from vercel.json>

And when a change does not appear on the site, check whether the build ran
before checking anything else. I re-fetched the asset hash four times over
twelve minutes before asking that question.

**A JSX comment cannot sit between `{cond ? (` and the element**, for the same
reason it cannot sit after `return (` or `{cond && (`. Three forms of one rule
now, so the general statement: any parenthesis opening a single JSX expression
takes the element and nothing before it.

**Backticks in a comment inside a template literal end the string.** A CSS
comment inside a `<style>` template that wrote a word in backticks closed the
literal, and the build failed on the next word with a message about a brace. A
comment inside a template is still inside the string.

**A constant hides a key from a gate that matches literals.**
`check-localstorage-keys` scans for `localStorage.setItem('attune_...')` and
reported "all covered" while `localStorage.setItem(SURVEY_DISMISSED, '1')`
wrote a key registered nowhere, so it would have survived every sign-out on a
shared browser. It resolves `const NAME = 'attune_...'` now. Same shape as
`EXERCISE_COLUMNS` hiding `conflict_data`: when a scanner looks for a string,
ask what the indirection for that string is.

**Code below an early return does not run, and nothing says so.** A helper
added to `public/_flags.js` went inside the app-banner block, which returns on
`document.getElementById('root')`. On /app it was never defined, both its
readers fell back to their safe answer, and the privacy banner stopped drawing
entirely. Every file read correctly and nothing threw. Loading the page and
asking for the function is what showed it, which is the argument for a gate
that drives rather than one that reads.

**A gate that compares inputs is not comparing the thing.** check-scoring-mirror
held the website's scorer to the engine on which questions belong to which
dimension and which are reverse-worded, and never ran either of them. That is
the half that was wrong somewhere else: `api/admin-data.js` scored the same
questions, with the same ten dimensions, and took a plain average where the
engine takes a weighted one. Its flipped set was `new Set()`, empty, under a
comment saying the flip "is handled by the shared scorer rather than here" —
true of a shared scorer that file was not calling.

The two disagreed by up to 1.25 of a point on a one-to-five scale. Ellie reads
the admin to find out what customers are like.

Both gates run the code now. When a check is about two implementations of one
rule, the question is whether they give the same ANSWER, and the inputs are at
best a cheap first half. Sweep varied inputs, too: a weighting difference
vanishes when every answer in a dimension is the same, so a tidy fixture of
all-3s proves nothing.

**One rule in three places inside one file, each knowing a different subset.**
`api/create-payment-intent.js` worked a cart's price out three times:
`addonsTotal` knew all five "this add-on is bundled free" flags, `subtotalDollars`
knew the workbook, and `itemsTotalCents` knew none. So a promo bundling an
add-on free charged for it, and a bundled workbook was quoted right and billed
anyway. Worse, `buildTaxLineItems` — the lines that go to Stripe, whose
`amount_total` is charged ahead of every local total — had no line for Conflict
Patterns at all, so an ordinary order containing it came back forty dollars
short of its own quote.

The invariant worth holding anywhere money is computed: **the lines sent to the
processor add up to what the cart says is owed.** That one assertion catches a
missing line, a double-counted one, a mispriced one, and the original 198/295
bug this file is known for.

**`grep` for a function name defined twice.** It took one command to find the
second scorer, and the same command found two more copies of the flipped-question
set. A rule with two implementations is this codebase's whole failure mode, and
the cheapest version of looking for it is:

    grep -rn "^\(export \)\?function " api/ | awk ... | sort | uniq -d

**A gate's own baseline can swallow the thing it measures.** Teaching
check-render to notice a view that renders nothing took three attempts. Counting
characters could not tell Notes, which draws one deliberate sentence, from a page
that drew nothing. Counting words against a baseline taken from a view that does
not exist was worse: an unknown view falls through to the results page, so every
word of the results copy became the definition of "empty" and four working views
were reported broken. Print the baseline before trusting any set a check compares
against.

What worked was asking the DOM: the text of the one region the app renders views
into, with fixed overlays removed. An empty view draws 16 characters there and
the dashboard draws 0, while the thinnest real view draws 43.

**And it had been reporting on two pages it never rendered.** `?view=home`
cannot render signed out, and `checklist` is gated on a capability PKG_CAPS
grants to newlywed alone while the run drove everything at premium. Both said
ok, because the only assertion was that nothing threw, and a page that renders
nothing throws nothing. Drive each view at a package that owns it, and report
the one that cannot be rendered as not rendered.

**`space-between` hands back any gap you carve out.** Ellie asked three times
for room between the insight's buttons and the In Practice sheet. Twice I made
the number bigger and nothing moved: the block above the sheet is a flex column
with `justify-content: space-between` and a height equal to its whole budget, so
its last child is pushed flush to its bottom edge, and every point taken out of
the quotation's budget was more space for that rule to spread. A gap that has to
survive a layout belongs in padding on the container, which spreading cannot
reach. Three reports is the signal that the number was never the subject.

**A harness that is wrong about the layout reports a working page as broken.**
This cost two rounds in one stretch. check-learn-peek's first version took the
first article tile as the first thing below the fold, when the head is a ROW and
four featured tiles sit beside the heading inside the peek; it reported the peek
as six times too big. The gap harness gave a block `flex: 1` beside a tall
sibling, so it collapsed to its own padding and measured a 2 point gap that is
really 56. Before believing a measurement, check the harness reproduces the
page's own structure.

**Never pipe a build to /dev/null.** `npx vite build > /dev/null 2>&1` hid a JSX
comment sitting between `return (` and its element, so the bundle never changed
and three rounds of measurement were against a stale one. Grep the output for
`built in` or check the exit code; the error is the cheap part.

**Check a promise everywhere it is made, not only where it was first broken.**
check-category-colors said "both surfaces draw it" and checked the tiles on each
surface. The website's results sidebar painted all six categories one green, and
that sidebar is the one place the six sit side by side, so it was the only place
Household and Financial looked like the same thing. The gate was true about the
two places it looked and wrong about the claim it printed.

**Values that agree today are the ones nothing watches.** One cross-surface sweep
found a section with two names, two sections with two colours, and the two
people's colours restated in the app with nothing holding them to the website's.
Only the first two had drifted. The third was the same bug waiting, and the
reason to gate it is that it looked fine.

**Reconciling N differences between two implementations leaves N more.** What
Comes Next was built twice and Ellie, reading both, picked halves: eight
instructions, each of which would have meant another comparison in the gate. The
answer was to make the website call the server's builder. When a list of
differences arrives, that is the signal to converge rather than to reconcile.

**When an instruction reverses an earlier one, keep both quotes in the gate.**
She asked for the comms rows to carry the website's Try line, which a gate
forbade; told that it would put content on that page that appears nowhere else
in the app, she reversed it. Both quotes are in check-plans-agree now, because
the round trip is a better argument for the rule than the original bug was.

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

**`npm run check` drives Chrome too, so do not run it beside `npm run smoke`.**
Four checks in `npm run check` launch a browser. Starting the smoke and then
running the check produces two Chromes competing on a machine already at load
average five, and the smoke stops producing output part-way down the section
list: exactly the hang signature above, from a cause that is nobody's bug. It
cost twenty-five minutes and a kill before the penny dropped.

Run one at a time. If the smoke has gone quiet, check `uptime` and
`pgrep -f 'remote-debugging-port' | wc -l` before suspecting the code. Note that
`pgrep -c` is not a flag on macOS: it errors, and `pgrep -fc x || echo 0` then
prints a confident zero, which is worse than no count. Use `| wc -l`.

**`vite preview` binds `localhost`, not `127.0.0.1`.** `scripts/smoke.mjs` says
so in a comment and it is still the easiest half-hour to lose: curl to
127.0.0.1:4173 returns 000 while the server is serving perfectly.

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

**A Simulator with no window still takes screenshots, and that looks exactly
like a dead control.** `xcrun simctl io booted screenshot` goes through the
device, so it keeps working when the Simulator app has no window open. Synthetic
taps go through System Events and need one: they fail with "Can't get window 1 of
process Simulator", and if that error is swallowed the only symptom is a screen
that does not change. Twice in one session that read as "the control I am testing
is broken".

Check it before concluding anything about a tap:

    osascript -e 'tell application "System Events" to count windows of process "Simulator"'

Zero means the problem is the window, not the app. Reopening it is not reliable
from a script; `open -a Simulator`, the Window menu and a device reboot all
failed here, so the honest move is to say the screen could not be driven rather
than to keep tapping at nothing.

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
