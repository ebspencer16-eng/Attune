# Attune app: screen-by-screen build directions

Written to be picked up cold. Everything here is decided; nothing needs
relitigating before code is written.

Companion to `app/ONBOARDING.md` (get started through first dashboard) and
`app/README.md` (stack decisions and bootstrap commands).

---

## What is already built and tested

No app screen exists. Everything a screen would call does.

| Endpoint | Returns | Tests |
|---|---|---|
| `/api/home` | greeting, primary + secondary cards, badges, state | 26 in `next-action-test.mjs` |
| `/api/results` | frozen results, pinned to a content version | verified against real endpoints |
| `/api/notes` | notes, annotations, folders, tags, sharing | stubbed-DB suite |
| `/api/posts` | In Practice feed, single post, read marking | stubbed-DB suite |
| `api/_lib/next-action.js` | the priority ladder | 26 cases |
| `api/_lib/notifications.js` | push eligibility, rate limits | rules only |
| `app/src/api/client.ts` | typed client, discriminated `ApiResult<T>` | shapes verified |

**No scoring in the app.** Ever. Results come from `/api/results` already
computed. Two scorers drifting apart is the single most likely way this product
starts lying to people.

**No copy in the app** that a customer reads as results prose. That copy is
version-pinned per couple and lives server-side. The app renders what it is
given.

---

## Design language

Pull from the web, do not reinvent:

- **Display font** Playfair Display. **Body** DM Sans.
- **Ground** warm off-white `#FAF7F2`. **Ink** `#0E0B07`. **Muted** `#5C4A38`.
  **Stone** (borders) `#E8DDD0`.
- **Section accents**, used consistently and never decoratively:
  Communication `#E8673A`, Expectations `#1B5FE8`, Reflection `#10B981`,
  Physical Intimacy `#B5546E`, Conflict Patterns `#1B5FE8`.
- Cards: white, 1.5px stone border, 14px radius. Not shadows.
- Glance screens invert: coloured gradient ground, white text. Detail screens
  stay on the warm ground. That contrast is how the web signals "summary" vs
  "detail" and the app should keep it.

**One rule that matters more than the rest:** this product is read by two
people about their relationship, often side by side. Nothing animates for
delight, nothing celebrates a low score, and no screen is dense enough that
someone skims it. When in doubt, fewer words and more space.

---

## Tab 1: Home

Renders `/api/home` and nothing else. One primary card, up to two secondary.

The priority ladder is server-side and already ordered. The screen's only job
is to render the card kinds it may receive:

`profile_setup`, `own_exercise`, `nudge_partner`, `results_ready`,
`use_resource`, `new_post`, `revisit`, `feedback`, `all_caught_up`, and
`orientation` (added for first run, see ONBOARDING.md).

Each card is `{ id, kind, title, body, cta, deepLink, disabled? }`. Route on
`deepLink`. **Do not branch on `kind` for layout** beyond an accent colour, or
adding a card kind server-side becomes an app release.

Badges on the tab bar come from `badges` in the same response: toolbox,
insights, practice, notes.

---

## Tab 2: Insights (results)

`/api/results` returns one of three states. All three need a screen:

- **ready** → the results experience
- **not-ready** → who still has to finish what, from the same payload
- **401** → sign in

### Structure, matching the web exactly

Left nav becomes a section list. Each section: a **Results at a glance** screen
then **Detailed results** screens beneath it.

- Highlights (storycard reel, swipeable)
- Couple Type
- Communication → glance + 3 domain screens + per-dimension detail
- Expectations → glance + conversation screens
- Relationship Reflection (owned only)
- Physical Intimacy (owned only)
- **Conflict Patterns (owned only)** → glance, Your Conflict Snapshot, Your
  Patterns, What You Each Wrote
- What Comes Next

**Sections appear when owned and unlock when both partners finish.** Listed and
greyed, never absent: a section that vanishes reads as a bug, which is exactly
what happened on the web.

### Conflict Patterns specifically

Four screens. The privacy model is the part to get right.

**Glance.** Coloured gradient ground. Q1 as two labelled bars (how each partner
describes conflict resolution). Then the action plan: one tile per pattern at
Sometimes or above, eyebrow "One thing to try", title, body.

**Your Conflict Snapshot.** Two tiles. First, eyebrow "Conflict": three labelled
rows, question on the left, each partner's chip beside it. Second, eyebrow
"Repair": two columns, "What Ellie wants from Preston, in order", top three.

**Your Patterns.** The private one. An asterisked pink line above the card:
*Not visible to your partner. This is the one section that stays private,
always.* Then four patterns, worst first. Each: name, definition, frequency
label right-aligned above the bar in the bar's colour, colour-coded bar
(green/yellow/orange/red for Never/Rarely/Sometimes/Often), then advice tiered
by band: nothing at Never, "One thing to keep in mind" at Rarely, "One thing to
try" at Sometimes and Often.

**This screen must never render the partner's patterns.** Not behind a toggle,
not in a debug view. The server sends only the viewer's; keep it that way.

**What You Each Wrote.** Grouped by question, two answers side by side.

---

## Tab 3: In Practice

`/api/posts?action=feed`, then `?action=post&id=`. Posts are blocks with stable
ids: `paragraph`, `heading`, `quote`, `list`, `prompt`.

Render each block type distinctly. **Keep the block id on the rendered node**:
highlights anchor to block ids, and a highlight that cannot resolve its anchor
is worse than no highlight.

Mark read on open via `action=read`. The `revised` flag means the post changed
since they read it; surface that rather than silently showing new text.

---

## Tab 4: Notes

`/api/notes`. Three lists: your notes, your annotations grouped by what they
attach to, and what your partner shared with you.

Anchors are stable identifiers, never text offsets. `anchor_context` holds the
wording at the time; when it differs from current, show "this has been updated
since you wrote this" rather than pretending nothing moved.

Sharing is per note and off by default. **Only the author edits.** The server
enforces it; the UI should not offer it.

Tags seed on first open, 15 or 21 depending on whether intimacy is owned.

---

## Notifications and messages

Ellie asked for a place to see alerts from Attune and from a partner. Not built.

`api/_lib/notifications.js` decides what is *push-eligible*: `partner_finished`,
`results_ready`, `partner_nudged_you`, `partner_shared`, `new_post`, with a
4-day cooldown and 4/month cap.

**What is missing is storage.** There is no notifications table and no read
state, so an in-app list has nothing to read. That is a backend piece:
a `notifications` table (owner, kind, payload, created_at, read_at), a write on
each eligible event, and a `/api/notifications` endpoint. Roughly the size of
the posts work. Worth doing before the app needs the screen.

---

## Add-on promotion

Constrained by the purchase decision in ONBOARDING.md: **the app does not
sell.**

So promotion is a card, not a cart. An unowned add-on surfaces as a home card
or an Insights section teaser, and its CTA opens `/start` in the **system
browser**. No in-app selection, no cart state carried across.

The pop-up multi-select add-on picker Ellie described is a **web** feature. It
belongs on `/start`, where it can exist without Apple constraints, and the app
links to it.

---

## Build order

1. `apple-app-site-association` + entitlement (days to propagate; blocks deep links)
2. Auth + landing (ONBOARDING.md)
3. Profile setup
4. Home tab against `/api/home`
5. Insights: not-ready state, then glance screens, then detail
6. In Practice
7. Notes
8. Notifications: backend first, then screen

Steps 3 to 7 need no new backend. Step 8 does.

---

## Things that will bite

- **`esbuild` and TypeScript will not catch an undefined variable at render.**
  Four bugs this month built cleanly and threw on screen. Every screen gets
  opened in a simulator before it is called done.
- **Test the real path, not the demo path.** A whole day was lost because demo
  mode strips add-ons, so the section under test could never appear.
- **Any list of exercises derives from `api/_exercises.js`.** Hand-maintained
  copies of that list have caused more bugs here than anything else.
- **A record-shaped exercise (`{answers, completedAt}`) is done only when
  `completedAt` is set.** Bare-answers exercises are done when they have keys.
  Getting that backwards marks an exercise complete the moment it is opened.
