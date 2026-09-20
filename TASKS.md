# Tasks

Four sections, and they hand work back and forth.

**1. Needs you** is everything blocked on you: a migration to run, a credential
to supply, a decision to make, a question to answer. Nothing here moves until
you touch it, so it goes first.

**2. Open** is my list. Things to build or fix, none of them waiting on you.

**3. For you to review** is the softer half of your list: things built and
working that I cannot confirm on my own, because they need an eye or a phone.
Looking at them is the whole job.

**4. Done and verified** is the record, with the evidence for each line.

The difference between 1 and 3 is whether anything is blocked. A migration that
has not run means a column is missing and a chart is empty; an unreviewed
design means nothing at all until you dislike it. Section 1 used to hold only
my questions, which is why three migrations sat in section 3 where they read
as optional. They were not.

**A status is a claim and needs evidence.** Section 4 names the check, the
browser run or your own word. Nothing sits in section 3 that a check could
have proved instead.

---

## 1. Needs you

Everything here is blocked on something only you can do. A migration I am
not allowed to run, a credential I do not have, a decision that is yours.
Nothing in here is waiting on me.

Ids never change, so R28 stays R28 wherever it sits. Tell me "R28 run" or
"O5 leave it" and I move it on.

### Run these in the SQL editor

I deliver migrations and you run them. That is deliberate and it is in
CLAUDE.md, so anything new sits here until you do.

**Nothing waiting.** 072 is run.

| # | Migration |
|--|--|

### Decide these

| # | Decision |
|--|--|
| O7 | **Nothing to do unless you want to change it. Answer when you have a view.** Every page has a hidden tag telling Google which address is the real one, and all thirty-odd of them say `attune-relationships.com` while the site actually serves from `www.attune-relationships.com`. Google follows the redirect, so nothing is broken today. Changing them is a small SEO risk either way, which is why I have not done it on my own: search rankings attach to one address, and moving the tags moves which one. My recommendation is to leave it until closer to launch and then change them all at once. |
| O1 | **No action needed until the app is in the App Store.** When it is, tell me and I change two lines: `APP_LIVE = true` and the store link. That turns on the download buttons and the app mentions across the site, all of which read from those two lines. |
| O16 | **No action needed until the app is in the App Store.** Right, as you say. When it is live, download numbers need an App Store Connect API key, an issuer id and a private key from your Apple developer account, and I will tell you exactly where to click. Two things on the Engagement page are waiting on it and both say so on the page. |

### Answer these

**Nothing waiting.** Q11 is answered: any page, and it is R214.

| # | Question |
|--|--|

## 2. Open

My list. Things to build or fix, none of them waiting on you.

When you send me a list, or when a sweep turns something up, it appears here.

**Nothing open.** The batch of 24 September is built and is in section 3.

## 3. For you to review

Things that are built, shipped and working, that I cannot confirm on my own.
Design and copy need your eye; the rest needs a phone.

Nothing that a check can prove is in here. Those live in section 4 with the
name of the check that proves them.

**Ids are stable.** Tell me "R7 verified" or "R7, no, the glow is still too
subtle" and I move it to section 4 or open it in section 2. They are not in
any order; work through them however suits.

### Design, and whether it looks right

The batch of 24 September first, then the batch of 23 September.

| # | Review |
|--|--|
| O303 | **The menu, four changes.** No hairlines. A bullet on Highlights, Couple Type, Exercise results and What Comes Next, sitting in the column the exercises' icons use, so the four names and the five icons share one left edge. The pages inside a dropdown are italic and the rows are tighter. |
| O304 | **A softer orange.** #C2410C was a burnt orange and read as the loudest ground in the app; both stops are a shade lighter and a shade less saturated. |
| O305 | **Storycard 1 fits.** Both her lines sit on one row each. The 300-point maxWidth never bound: the card's own padding left 256 points whatever it said, so the measure is a share of the card now, which also means it holds at every phone width rather than the one it was measured on. And yes, the eyebrow went up with everything else, by more than the rest; it is up again here since you asked. |
| O306 | **Card 6 is even.** Any straight line through a rectangle's centre halves it, so the split is the centre point and nothing else. The text is inset from the corners. Moving the square shifted which slice of the gradient the card could see and turned the navy bright; the stops are derived from the placement now, so the next time it moves they move with it. |
| O307 | **Card 4.** "Your communication styles are", on one line. Your two labels, word for word. And the sunrise is fifty-six rings rather than twenty-six, each far fainter: the peak brightness is unchanged and written down as a number, so the count can change again without the sunrise getting brighter. |
| O308 | **The cover icon and glow.** Larger and lighter: `weight` is a separate control from `size`, and asking for a bigger symbol alone would have made the strokes heavier. The glow is fifty-two rings over a wider field at half the peak, so it is a tint rather than a disc. |
| O309 | **The ratings page takes the Comms treatment.** The track is the same white the Slider on every communication page uses; the single label when you both land on the same answer was the cream page's ink, which on the green was not readable at all. |
| O310 | **Conflict and Repair are legible.** Those two eyebrows were the muted clay the cream pages use, on a ghost panel over the section's blue. |
| O311 | **Talk about it is white.** That page runs navy to green, so no single accent is right on all of it. |
| O312 | **What Comes Next italicises the words.** The sentence is two fields now, who and what they wrote, because a renderer cannot find the join in one string without restating the rule that put it there. |
| O313 | **The home icons are brighter.** The brand orange is made for cream; inside a ghost tile on the navy it lost most of its contrast. |
| O314 | **The mark is its old size.** It was not a size change. The two generated marks came back 485 by 228 with 176 points of transparent padding on the right, because a full-page capture is never narrower than the window, and React Native's `contain` fits the canvas rather than the picture. Nothing showed it: a PNG viewer draws transparent as nothing. The capture asks for an exact box now, and the lockup's box is the mark's own 103 by 76. |
| O315 | **Card 3 is your four, in your order.** Emotional Expression, Communicating Needs, Conflict Style, Feedback. It used to pick four by spread, which meant no two couples saw the same card. |
| O316 | **Every italic in the app was upright, and now none of them are.** Not something you asked for; found while doing O303. iOS does not slant a registered typeface on request, it draws the upright face and reports nothing, and DM Sans was bundled without its italics. So eighteen places asked for italic and got none, including three you had asked for by name: the map caption, the Side by Side quotes, and the Try prompts. Both DM Sans italic faces are bundled now and those fifteen places name the face rather than the flag. Three are still upright and cannot be fixed the same way: they are Playfair, which is bundled Bold only. Say the word and I will add that file too. |
| O271 | **"Exercise results" sits with Highlights, and its contents sit inside it.** The heading now starts on the same left edge as the Highlights and Couple Type labels, and the five exercises step in from it: their icons sit on that edge and their names come after. One number, derived once, feeds all three indents. The longest label may now take two lines rather than trailing off, which is what stops it truncating on a narrower phone than the one I tested on. |
| O274 | **The Insights landing is the Attune orange.** Not a wash on cream any more: the same shape the home screen's blue is, a two-shade gradient edge to edge with the lockup and the hero in white and the menu in a white tile on it. The two grounds are one decision, `BlueGround` and `OrangeGround` a line apart. This is the item I am least sure you will like at full strength; if it is too much, the dial is those two hex values. |
| O276 | **The storycard type is up about a tenth**, every role, from the shared scale both surfaces read. |
| O279 | **Card 6, rebuilt.** Diagonal from the bottom left to the top right, orange above it, navy below, a whole sentence in each corner, all Playfair. The first attempt got the other diagonal; the placement is derived from the corner it has to pass through now rather than nudged into place. |
| O281 | **Card 4, redesigned.** Attune blue, a circular orange glow rising from the bottom middle, "Ellie and Preston's communication styles are" over "90% aligned", then the one strength and where you differ. The explore line is gone. |
| O287 | **The covers.** Large icon, no circle, a glow of the section's colour behind it. No line under the title. A gradient hairline in a rounded rectangle around the page, inset from the screen, and it clears the tab bar at the foot rather than running under it. |
| O289 | **The hero is level with the count.** The count used to be a full-width row above the hero, so it pushed every hero down and could never be beside it. It takes no height at all now, which also means every hero on every page starts in the same place. |
| O290 | **The Overall and How you feel right now tiles are ghost.** |
| O291 | **Your Conflict Snapshot** is ghost, with the spacing tightened. The two names above the pills were still the pill colours, which on that ground were barely colours; they are light now. |
| O294 | **The opacity is flipped on Side by Side.** The quotes carry the panel; the question and the prompt sit on the ground with nothing behind them. |
| O296 | **What Comes Next quotes them.** "Ellie wrote: [what you wrote]" and the same for Preston. It is built on the way out of the results, so it reaches couples whose results were written months ago rather than only new ones. |
| O300 | **The home icons are orange.** |

| # | Review |
|--|--|
| R210 | **The Insights nav, rebuilt.** A landing page of coloured bands, one per section, in the website's own colours. Opening one closes the others and lists its pages. Inside a page: a hamburger top left that drops the same menu, a line saying Section: page, and back and forward at the foot. The two rows of chips are gone. Nothing you read changed, only how you get to it. |
| R195 | **Sign in is on the blue with the lockup.** Built but not seen: forcing that screen with the app signed in turned out to need a plant that broke the root layout, and I would rather tell you that than imply I looked at it. You will see it the first time you sign out, and I will look properly next time the tester needs signing in. |
| R190 | **Admin, from Settings.** Only for the addresses in ADMIN_EMAILS, opening inside the app rather than in Safari. Waiting on O209. |
| R183 | **Two things I could not tap myself:** the shelf arrows and the Saved/Read pills. My synthetic taps have been landing about sixty points off on that screen all afternoon, which is a known trap in this project and not evidence of anything. The code is straightforward and it builds; please try them and tell me if either does nothing. |
| R175 | **Articles can carry an illustration.** The card draws it when a post has one. Until then the ground is tinted by shelf, with the mark in the corner, so a card without a picture looks intentional rather than broken. Adding pictures is a content job: the column is there and the admin accepts it, so the moment you have artwork it appears. |
| R173 | **The workbook opens in the browser and builds itself.** Your call, and the simpler one: the app opens the website's workbook page with a flag that makes the browser build the PDF straight away, with the same builder and the same options a customer gets on the website. One file, one builder, no server renderer. The page says "Building your workbook" for the second it takes. |
| R2 | **App insights and results.** Every section the website has, drawn the same way: couple type and its map, the storycards, comms, expectations, reflection, intimacy, conflict. 28 sections now: the reflection action plan and Conversations Worth Having were both removed from both surfaces. |

### Copy, and whether the words are yours

| # | Review |
|--|--|
| R10 | **Privacy policy.** Everything in it, including the paragraph I wrote about the engagement measurements. |
| R11 | **Terms of service.** |
| R12 | **The effective dates on both**, which still read "TODO before publishing". Only you can set them. |

### Behaviour, which has to be used rather than looked at

You asked whether these have to wait for the App Store. Almost none of them
do. Each one now opens with what it needs, so you can tell at a glance
whether it is something you can do this afternoon in the simulator.

The simulator is a real copy of the app: taps, drags, text selection and the
keyboard all work, with the mouse standing in for a finger. What it cannot do
is be a phone that has been closed for a day, or have a real Apple ID, or
receive a notification from Apple's servers.

| # | Review |
|--|--|
| R20 | **A real device, and time.** Sign in, close the app, come back tomorrow. The simulator can do the first two; the point of this one is the third, and a simulator that has been asleep is not a phone that has been in a bag overnight. |


## 4. Done and verified

| Verified by you | What |
|--|--|
| O272 | **The icons lost their dots.** Coloured glyph, nothing behind it.
| O273 | **The whole menu fits one screen** with the dropdowns shut. Screenshotted to confirm it.
| O275 | **The unfinished state.** Your hero line word for word, on the same orange, with the exercise status table under it.
| O277 | **Card 2's axis labels.** Large and white now, and the four individual type names came off the map, which is what was crowding them.
| O278 | **Card 3's poles are beside the rows**, left and right, not underneath.
| O280 | **Tapping the left third goes back.** The last card does not advance on tap, because it has its own button.
| O282 | **The Physical Intimacy storycard is gone.**
| O283 | **Card 8 lost its "as you explore your results" paragraph.**
| O284 | **The last card** is the full orange-to-blue gradient with one white button in the middle.
| O285 | **Highlights is not offered the first time** you reach the menu from the cards. It is there every time after.
| O286 | **The page arrows** have a hairline edge and a shadow, so they read as glass on a white tile rather than as a hole in it.
| O288 | **Every non-cover page has its count**, top right.
| O292 | **Your Patterns** is ghost and the type on it is legible.
| O293 | **And the type follows the tile.** Two more found while doing it: the partner's brand blue is unreadable as small type on the navy tiles, so type on a dark ground now takes a lifted blue while filled dots keep the brand one; and the Insights waiting screens went white with the ground.
| O295 | **And it takes the Conflict page's layout.** No outer card per pair. An orange eyebrow with a hairline running off to the right of it, level with the middle of the words; the question as a heading; the two quotes under it; the prompt in orange below.
| O297 | **The greeting fits one line** for names of ordinary length.
| O298 | **Insight of the day is a hero on Learn**, and the tile under it lost its eyebrow.
| O299 | **The home icons are out of their circles.**
| O301 | **The mark on home is the inverse**, the right bubble on white.
| O302 | **The mark everywhere else is ghost**, the left heart cut out so the page shows through it rather than painted white.
| O239 | The Vercel security challenge, and where the toggle lives |
| R212 | Home: the glass tile and the greeting |
| R211 | Results are ready opens the storycards |
| R200 | Notes has a ground of its own |
| R203 | The home tile is a ghost bubble |
| R202 | Sharing says Attune Relationships, with the lockup as the thumbnail |
| R198 | "Yours to explore" is now "Resources" |
| R199 | The third row capitalises like the other two |
| R213 | Type is darker throughout |
| R201 | The percentage on the storycards has its top back |
| R207 | Your lost note, and why it was lost |
| R208 | A mark opens |
| R209 | A deleted tag goes into a closed Archive |
| R204 | The third row of the home tile capitalises |
| O249 | **The exercises are indented further**, icon and all, so the row moves in rather than the label moving away from its icon. |
| O250 | **The name and the arrow do different things.** Tapping the exercise opens its cover; tapping the chevron opens the list, and the list no longer repeats the cover. |
| O251 | **Six intimacy pages are two.** How it happens: Frequency, Initiating, Adventurousness. What makes it work: Comfort & Safety, Communication, What It Is For. |
| O252 | **Built like the Communication pages.** No intro paragraph, an orientation tile of three rows, one Talk about it prompt from whichever aspect the two of you are furthest apart on, and the side-by-side behind a dropdown. Ties break in the order you listed, because that order is what the grouping is written in. |
| O253 | **What makes it work leads with the choices.** The third row is the chips rather than a bar, decided by the server so both surfaces pick the same row. |
| O254 | **Two questions changed, both surfaces.** "What does intimacy most mean in your marriage now" is gone. "When you're emotionally disconnected" is in Comfort & Safety. That also settles O238 without new copy: What It Is For now has only its multi-answer question, so there is no position to plot on an axis that did not measure it. |
| O255 | **Old marks still resolve.** The six retired page ids alias to the two that replaced them, the anchor validator accepts them, and `check-section-aliases` fails the build if one is left pointing nowhere. Without it every mark anyone had made on an intimacy page would have gone quiet. |
| O256 | **The covers are louder**: the section's icon at size in its own colour on a disc, the name under it, and the brand's own orange-into-indigo rule. |
| O257 | **And they have a "See insights" button** into the overview. |
| O258 | **Both conflict tiles are tighter.** Each had a margin above a rule and a padding below it, which is thirty-two points between two short rows. |
| O259 | **The two pills are off the detail pages.** The badge stays on the at-a-glance action plan, which is the one place it does real work. |
| O260 | **The invisible tile.** It was #F4F7FF with white type on it: the page moved onto a dark gradient and everything in the tile was converted except the tile. |
| O261 | **The conflict pages have a page count.** They are the one section whose pages live in their own file, which is the only reason they did not: the count is computed from the nav and was never passed across. StepCount is its own file now, so there is one of it. |
| O262 | **What You Each Wrote has its tile.** That function has two returns, the empty state and the page, and the conversion replaced the first. So the empty state got the dark tile and the page stayed a bare scroll on cream with type already turned white for a tile it never got. |
| O263 | **Relationship Reflection is two rows again**, what you each wrote for yourselves. This reverses what I did two days ago at your ask; the note in the code says it was asked for twice, so nobody quietly changes it back. |
| O264 | **The eyebrow and the pole labels are readable.** They were white at a third opacity, which is about two to one on that ground. |
| O265 | **So are "Ellie admires" and "Preston admires."** They were each person's own mark colour, which is chosen to read on cream. |
| O266 | **That tile is tighter.** |
| O267 | **The "what this looks like in your relationship" tile is gone**, app and site, and out of the block spec so neither surface is held to drawing it. |
| O268 | **The count reserves its height on every page**, so a page with one and a page without start their titles on the same line. That is what had the expectations pages sitting lower than the rest. |
| O269 | **No "explore more resources" arrow when you own everything.** It pointed at the offerings page, so someone who had bought it all was being sent to a shop with nothing in it for them. Derived from the catalogue, so a new resource brings the link back on its own. |
| O270 | **Colour on the three plain tabs.** The menu's rows stay cream, which you asked for, and the colour is in the icon: the section's hue behind it at a tenth, the same shape the home tile's rows use. An open section carries its colour down the left edge. Learn has the brand wash it never had, and every wash is stronger than it was, because it is doing a job now rather than decorating. |
| O240 | **The exercises sit under a heading of their own**, indented, with "Exercise results" above them. Not italic, and that is a limit rather than a choice: only PlayfairDisplay-Bold is bundled, there is no italic face, and iOS draws nothing at all rather than slanting one. Say the word and I will add the italic font file; it is a build, not an update. |
| O241 | **The menu is Attune's colours only.** Every row carried a gradient of its section's colour; the icon is the one coloured thing now. |
| O242 | **The arrows are larger again**, half as big again as last time. |
| O243 | **The map caption is italic, small, and under the eyebrow** rather than under the map, where it read as a conclusion drawn from what you had just looked at. |
| O244 | **The four type names are off the map**, on the storycard and the couple type page, on both surfaces. The quadrant tints stay, so the map still has regions; it no longer tells each of you which one you are. |
| O245 | **The section line follows you**, and the section you are on stays centred. Measured rather than counted, because the names are different lengths and abbreviate together. |
| O246 | **Every exercise has a cover page**: its name on its own colour, tinted into the cream, and that ground carries through every page of the section behind the tiles. The tint is stronger than it was, because it is doing a job now rather than decorating. |
| O247 | **The overview is 1/4.** It only says "Overview" at the top, since the cover carried the name two taps earlier, and it is counted with the detail pages. The cover is not counted: it is the door, and a door is not one of four rooms. |
| O248 | **Relationship Reflection reads.** Three panels were still cream with dark type on them, left from when those pages were cream; they are ghost tiles now. Two headings were still dark ink, above panels that had already been converted, which is the same miss twice. The same heading on the Conflict pages had it too. |
| O213 | **The landing is a table of contents now.** The colour left the ground and went into the icon, which is what you suggested: each row is cream with a hairline under it and a wash of its section's colour fading out across it. Nothing is a block. |
| O214 | **The landing is not hero type.** Playfair still, a shade above body size. |
| O215 | **Nothing trails off.** Physical Intimacy Expectations is the longest label the product has and it sits on one line on the narrowest phone. |
| O216 | **Only the exercises carry an icon**, in the exercise's own colour. Highlights, Couple Type and What Comes Next are ways of reading results rather than things you answered, and a glyph on them made five sections read as eight equal things. Gated both ways, so the ninth icon cannot arrive and these three cannot get one back by accident. |
| O217 | **The step count is top right**, on every detail page in every section. |
| O218 | **The section line is above the tile.** Grey, bullet separated, the one you are on in orange, and tapping one opens that section's overview. It abbreviates when a couple has more than five sections, all of them together: a line mixing "Expectations" with "Rel. Refl." reads as a typo rather than a choice. |
| O219 | **The dropdown arrows are larger.** |
| O220 | **The hamburger menu is cream**, with hairline dividers and the section colours in the icons. Same component as the landing, so the two cannot drift. |
| O221 | **It is narrow and hangs off the hamburger**, measured from the button rather than pinned to the screen. |
| O222 | **"At a glance" is "Overview" everywhere**, and the overview pages are titled "Expectations Overview", "Communication Styles Overview" and so on. Nav and page titles, app and site. |
| O223 | **What comes next.** Your hero, both surfaces. |
| O224 | **"Unique" is out of the couple type hero**, both surfaces. |
| O225 | **One line under the couple map**, yours, both surfaces. It is derived on the way out rather than stored, so it reaches couples who finished last year as well as new ones. |
| O226 | **Your three Communication paragraphs**, in the module both surfaces read. |
| O227 | **Communication Styles is capitalised.** |
| O228 | **Sharing the insight says "Insight of the day".** Everything else still shares as Attune Relationships. |
| O229 | **The margin icon costs the text nothing.** No reserved width, no disc, just the icon, sitting in the padding the tile already has. It has been outside the block, then inside it, and this is the third arrangement and the one that satisfies both things you asked for: findable on every page, and not moving a single line of type. |
| O230 | **Relationship Reflection and Conflict Patterns detail pages are on their section's ground**, the same gradient their overview page uses, with the type flipped to read on it. |
| O231 | **Communication counts only what it asks for.** A tile exists for all three domains whether or not there is anything to do in one, so your page said three and showed two blank rows. The count is the rows, so filtering the rows fixed both. |
| O232 | **Relationship Reflection carries its own action plan.** It was taking one written answer and making two rows of it. It now takes the plan its overview page draws, with both of your own words underneath. |
| O233 | **Conflict Patterns carries yours.** It was one hardcoded sentence, on the argument that the patterns are private so nothing about them should repeat. That confused two promises: they are private from your partner, not from you, and this page is built per reader. Same selection the overview makes. |
| O234 | **The intimacy question, and what was actually wrong.** Your missing answer was a copy edit. Answers are stored as the words that were on the button, and commit 6b00d10 renamed "One of several ways" to "One of several ways we stay close", which is the option you had chosen. From that commit your answer matched nothing and your mark did not draw. Five options have been reworded since the exercise shipped and every one of them silently dropped the answers already given under the old wording. Retired wordings now resolve, and `check-answer-labels` fails the build if another edit is made without recording the old words. The lookup also existed twice, so fixing one copy left the results page still dropping it; there is one now. Separately, the multi-answer question is drawn at all for the first time. What was left was the axis, and the regroup settled it: see O254. |
| O235 | **Notes on the website.** The page that was there kept a notebook in localStorage under a line that said "Saved to this device only". It reads the real endpoint now: your marks grouped by the page they sit on, what you have written, what your partner shared, your tags, sharing and delete. And you can mark results prose on a laptop: select a sentence and the same five actions the app offers appear, writing the same anchors, so a mark made on a laptop opens on the phone. Existing marks paint back onto the words. |
| O236 | **Questions about Notes and colour**, at the foot of this document rather than in a reply, so they survive the session. Five of them, and one of them changes what the others are worth. |
| O237 | **Three directions for the app's colour**, same place, with what each one costs. |
| R220 | **The Insights nav, your nine.** The arrows are two chevrons in glass, fixed at the bottom corners and on the page rather than in a bar. The Section: page line is gone; the hamburger is the whole of that row now. Every page is in a tile, the landing included. The landing's colours are the exercise colours and its labels are the exercises' full names, both read from the one registry that decides what exercises exist, so the section you answer and the section you read are the same colour and the same name. Eight new icons, all outlined. And the wash behind every page is its section's colour, which is the cohesion you asked about: Expectations reads blue on all seven of its pages. |
| R221 | **The step counts are back, on every detailed page.** Only the expectations conversations had one, counted inside that page from its own list, which is why no other section could have one. It comes from the nav now, so Communication, Physical Intimacy, Relationship Reflection and Conflict all have it at once. At-a-glance pages are not counted: 1/3 means the three detail pages, which is what it meant on the website. |
| R222 | **The mark sheet, your five.** Quote first, then the label and the date, then the note in italics. The private toggle is the switch the note editor uses rather than a second control doing the same job in a different shape, and tagging is a tag-and-plus at the other end of that row, with the chips opening under it. The warning I could not reproduce by reading; the sheet is rebuilt, so tell me if it is still there. |
| R223 | **The "what it's for" question was never shown, on either surface.** You were right to ask. It takes up to two answers from a list, so it has no position on a scale, so the row builder dropped it and the page named after the question never asked it. It draws now, as two sets of chips. Two things fell out of fixing it: the app stores a multi-answer as an internal key rather than the words, so it would have printed "closeness" at you, and the privacy gate stopped the change until I could prove the field can only ever carry an option from the list. Please check your own answer reads right. |
| R224 | **The dashboard should be there the moment you open the app.** Measured: warm, the endpoint answers in a third of a second; cold, it took between one and three and a half, three times running, and a function nobody has called for an hour is always cold. The app asked on every launch and drew a spinner until it came back. It keeps the last one now and draws that first. The first launch after installing still waits once. |
| R225 | **Every results page pinches to zoom**, up to three times. Past that a line is wider than the screen and reading becomes a sideways scroll. |
| R226 | **The website's type is darker too.** 188 places across 29 files, both hues, the same values the app now uses. |
| R197 | The background runs the length of the page |
| R194 | Each exercise has its own wash |
| R196 | A cold-start crash, found by accident and fixed |
| R191 | The lockup is in one place on every screen |
| R192 | The wash is behind the results too |
| R193 | The mark is on every waiting screen |
| R184 | The lockup is larger and in the website's face |
| R185 | Cards are the same height |
| R186 | Share on the insight of the day and on the storycards |
| R187 | The cream pages have a ground |
| R188 | The search field no longer clips its own text |
| R189 | Search reads the articles, not just the titles |
| R180 | The Learn tab, rebuilt to your order |
| R181 | The lockup is on every tab |
| R182 | Colour |
| R179 | Today's work is on your phone already |
| R174 | The Learn tab |
| R176 | Search |
| R177 | Share, through the phone's own sheet |
| R178 | The Insights tab is a lightbulb |
| R170 | The margin icon sits on the mark's own line |
| R171 | That warning is gone |
| R172 | Updates reach an installed build without rebuilding |
| R130 | Both intimacy framings, your seven rewordings |
| R131 | Every exercise's opening page, your words, both surfaces |
| R132 | Every loading line, your five changes |
| R140 | Expectations asks the page the site asks |
| R141 | Continue Expectations opens the exercise |
| R137 | The opening page appears for Expectations |
| R138 | An exercise in progress is counted properly |
| R139 | The household page's arrows |
| R123 | An opening page for every exercise, both surfaces |
| R167 | Private or shared on the note itself |
| R168 | Physical Intimacy asks the couple |
| R163 | Expects or Experienced, by a switch |
| R164 | The finding and the mark centred in the gap |
| R113 | The status table's columns line up |
| R114 | No sign-in flash on a tab you have not visited |
| R115 | A and B side by side, arrows, fixed positions |
| R106 | The note screen is gone |
| R107 | The selection is one block |
| R108 | The top of an article can be marked |
| R109 | The workbook builds when you ask for it |
| R159 | "Both of us" gone from the results |
| R160 | The opener's second line fits |
| M71 | The test couple's Expectations answers, repaired |
| R156 | An exercise asked for by name opens |
| R148 | Part two: Responsibilities |
| R151 | Every responsibilities page starts at the top |
| R152 | A completion page for every exercise |
| R154 | Seed data in the product's own vocabulary |
| R142 | Part one says which part it is |
| R145 | The progress circle sweeps round |
| R147 | Start on all ten opening pages, and the not-therapy line back |
| R128 | The status table: a count, a wedge, and Communication styles |
| M70 | The test couple's relationship status, run |
| R133 | The line under every intimacy question, gone |
| R134 | Select all that apply, italic and on its own line |
| R135 | Progress bars in their exercise colours |
| R136 | Conflict's ranking, like Reflection's |
| R124 | One eyebrow and one set of arrows |
| R125 | Question 6 of 50, both surfaces |
| R126 | The part two screen |
| R127 | Reflection's two lines gone, selections green |
| R129 | Expectations in the website's order |
| R117 | Continue Communication, with the count |
| R118 | The weight on the answer choices |
| R119 | Communication styles, and its completion line |
| R120 | Part two in italics |
| R121 | The Next arrow, no longer dead while saving |
| R122 | One scale, read by both surfaces |
| R110 | The eleven home lines |
| R111 | Both deletion emails |
| M68 | The sign-in repair, run |
| M69 | The deleted-partner account, run |
| R103 | The alert copy, in Ellie's words |
| R104 | Generated prose lists as the standing practice |
| R17 | The workbook moment blocks |
| R25 | The workbook wording that names both people |
| R74 | The alert copy list |
| M67 | The test couple, run |
| R101 | The workbook lines, with no email promised |
| R93 | A new mark drawing without a reload |
| R96 | "All" stopping at the last ten |
| R97 | The space before In Practice |
| R99 | A tag has two deaths |
| R88 | Pick up where you left off, as one tile |
| R92 | One Resources section, and the way out |
| R34 | Insights tab, tapped twice |
| R55 | The same gesture on the other three tabs |
| R85 | The seven colour names, with old marks keeping theirs |
| R86 | The cream toolbar |
| R87 | The bin, grey until the selection is on a mark |
| R89 | Tag rows: icon, colour, count, arrow |
| R91 | No line under the share toggle |
| R82 | The dashboard reading an exercise as unfinished |
| R83 | White names on the reflection action plan tiles |
| R80 | Press, hold, drag, release, and the toolbar |
| R81 | Paragraph spacing, everywhere text can be marked |
| R66 | Selecting a fragment, the way it was asked for |
| Q2 | The dot and eyebrow. Gone after a hard refresh |
| R79 | The endpoint and page sweep, and the two Sign in links |
| R78 | The reminder card, for couples who own Conflict Patterns |
| R77 | The order confirmation relay, closed and verified from outside |
| R73 | Alerts, reaching the home screen at last |
| R75 | "Send them a reminder", which now sends one |
| R76 | In Practice and results ready: alerts deliberately off |
| R68 | The checklist opening closed |
| R69 | Intimacy side by side, as the communication rows |
| R70 | Conflict at a glance saying private to you |
| R71 | The white tip label, and pole titles that wrap |
| R72 | What Comes Next carrying each section's own plan |
| R67 | The reflection action plan tiles, on the ground |
| R57 | Physical Intimacy at a glance, as percentages |
| R58 | The back arrow, and the headings clear of the status bar |
| R59 | The add a tag field, with its examples in it |
| R60 | No orange rule under the expectations page titles |
| R63 | Conflict at a glance, with colour in it |
| R64 | The intimacy action plan: top two plus ties |
| R65 | The pole labels on the bar centre line |
| R52 | The Notes empty states, in their tiles |
| R3 | The app notes tab |
| R5 | The website marketing pages |
| R35 | The fade at the edge of a scrolling row |
| R36 | Closed: no longer applicable |
| R8 | The couple map, both surfaces |
| R47 | The connecting lines, curved and even |
| R48 | The couple map at 72% of the storycard |
| R49 | The Conflict Snapshot as a table |
| R51 | Two answers at the same point, evenly either side of the bar |
| R37 | Communication at a glance in its own purple into orange |
| R31 | The tile on every at a glance page |
| R9 | The Engagement tab, as it stands |
| R4 | The app resources tab |
| R6 | The website results pages |
| R38 | The storycards: the marks carry initials and step apart, the two clipped figures are whole, and the Life & Values ring is right. The map is still too small, which is O83 |
| R42 | Your Patterns matches the site. The Conflict Snapshot does not, which is O87 |
| R43 | Sort by, and what it offers. Its menu is too heavy, which is O88 |
| R45 | Physical Intimacy is in the app |
| M64 | Migration 064: the default tags, cleared out of accounts that already had them |
| M65 | Migration 065: so an In Practice article read in the app can be marked read |
| R28 | Migration 062: the qr columns and the policy that let anyone read order rows |
| R29 | Migration 063: row level security on admin_presets |
| R26 | Migration 061: the surface column, so app and site can be told apart |
| R14 | The partner-deleted notification line |
| R15 | The EU consent banner sentence |
| R16 | The delete-account password prompt |
| R18 | The waiting copy, in situ on both surfaces |
| R19 | The founders note, as it reads on the page |
| R21 | Scrolling on insights and results, on a device |


### Verified in code rather than by eye

Everything below was in the old "done, not verified" list and is provable
without you looking at anything. The check that proves each one runs on every
build.

| Verified | By |
|--|--|
| What Comes Next collects the same six sections on both surfaces | the server had five and not the same five: Conflict but no Communication, while the website had Communication and no Conflict. `check-what-comes-next.mjs`, planted |
| The payload carries nothing either surface leaves undrawn | protocols and widest were the last two; both are consumed where they are used now, and `check-app-draws-payload.mjs` has an empty exemption list |
| The six values neither surface drew are no longer computed or sent | gone from the payload, the app's types and the one test that asserted on one |
| A storycard is the same size on a laptop, a phone and in the download | the text sizes against the card rather than the browser window; 16 of 135 nodes moved, all of them to the size the app already used |
| The app draws the action plan note the site shows | `tile.reflect` arrived on the payload and nothing drew it; `check-app-draws-payload.mjs` now fails on any results field the app never names, planted three ways |
| Both people's placement dots are visible when they gave the same rating | the app drew them at the same point at the same size, so the second covered the first; `check-overlapping-marks.mjs`, planted twice |
| The phone's pill nav offers every section the sidebar does | it had five of eight and no Conflict Patterns at all; rendered at 420px it now shows Type & Map, Comms, Expectations, Refl., Intimacy, Conflict, What's Next. `check-mobile-nav.mjs` |
| Phrases to try is three shaded tiles with a phrase in each, on both | rendered on the site: the section heading then three quoted phrases, no outer tiles, no mode labels, no eyebrows |
| The reflection action plan page is gone from both surfaces | one removal in api/_lib/results-sections.js took it out of the nav on both; 29 sections render clean |
| The site's at-a-glance action plan is what each of you wrote | it was a derived list; it is now the answer to "one thing I want to work on", the same question the app uses |
| The expectations tip tiles read "A tip for [name] and [name]" on both | one string in `PAGE_COPY`, sent on the payload and passed into the page |
| No results page anywhere carries a page dot and eyebrow | the last two were reflection pages; `check-page-eyebrows.mjs` was blind to them because the name came through a constant, and now matches the shape as well. Planted both ways |
| The four at-a-glance titles you named are the same on both surfaces | `PAGE_TITLES` in api/_lib/results-sections.js, sent on the results payload; neither surface writes a page heading of its own for these four |
| "Where you each land" is "Communication style overview" on both | `PAGE_COPY.commPlacements`, read by both |
| The reflection ratings page is "How you each view the relationship" | one string in api/_lib/reflection-results.js, which both surfaces already read |
| The storycard rule is the same orange-to-indigo gradient on both | it was solid orange in the app; the gradient and its size come from the payload now |
| The mark sits beside the wordmark on both | the app had the word alone; it uses the PNG the rest of the app already ships |
| Both surfaces draw each person in the same colour | the partner dot was a lighter blue in the app; `PERSON_COLORS` is shared and both read it |
| No endpoint answers 500 to a body it should refuse | `check-body-parsing.mjs`, 343 calls across 53 endpoints, planted three ways |
| Unmatched URLs answer a real 404 on the live site | checked from outside: /gift-cards, /lmft-booking and a nonsense path all 404, the real pages still 200 |
| The 404 page renders and offers six ways back | loaded it in a browser on the live site |
| Every one of the nine storycards is sized from the shared scale on both surfaces | `check-storycard-type.mjs`: 30 roles, no type written anywhere in the website's card region, and no role either surface leaves undrawn |
| Converting the website changed nothing on screen | 135 text nodes captured from all ten cards in a browser before and after, identical three times |
| The couple type page is titled "[name] and [name]'s unique relationship dynamic" | your wording, in `PAGE_COPY.coupleTypeTitle`, read by both surfaces |
| The placement dots on the overview pages are bigger | 10px to 13px in the app, which is the size the site draws |
| The dividing line is back under the expectations page heading in the app | it stayed on the site throughout |
| The expectations intro tile has room above it | a full step of spacing between the page title and the tile |
| Tapping Insights while already on Insights returns to Highlights | iOS reports a repeat tap as an ordinary tab selection, so what separates the two is whether the screen was focused when the press arrived |
| The reading time reads "6 min read", in orange | in the article row and at the top of the article |
| The "Swipe >" label is gone and the fade carries it | `EdgeFadedRow` draws each fade only when there is something past that edge, which covers the results nav too |
| In Practice articles are read in the app | all twelve were pages on the website that the app handed to the browser. Their bodies are generated from those pages into `api/_in-practice-bodies.js`; `check-in-practice-bodies.mjs` proves every word of every article reaches the app and nothing else does, planted three ways |
| The tag list starts empty, with an add field and five suggestions | opening Notes used to write twenty-one tags into the account. It writes nothing now, and the names an annotation is read through are sent as reference data instead, derived from the live lists on every request. `check-no-seeded-tags.mjs` runs the endpoint and proves all three, planted three ways |
| Every results page is the same colour on both surfaces | it was not: the website paints Communication purple into the brand orange and the app painted it in Conflict's blue, because six page gradients were typed on both surfaces and five pairs happened to agree. One copy now, in `api/_lib/section-grounds.js`; `check-section-grounds.mjs`, planted four ways |
| Physical Intimacy's Conversations page is cream, as it is on the site | it was in the section's dark gradient, which the site keeps for at a glance and the dimension pages |
| A repeat tap on Insights cannot silently stop working | the handle it goes through is cleared only by the screen that set it; two screens overlapping for a moment would have left it null for the rest of the session |
| Every results at a glance page is a rounded tile, detail pages are full width | your call, and my view is that it is the right one: a tile has edges, and edges claim that what is inside is the whole of something, which is true of an overview and false of a three-screen scroll. One component, `glance-tile.tsx`, so the five cannot drift |
| Relationship Reflection looks like the site, page for page | the at-a-glance heading and its line were built inside src/App.jsx and are now built once for both; the two detail pages were dark in the app and light on the site, and are light; What you each admire moved to the page the site puts it on; the ranking shows every item |
| Conflict's at a glance page is in the same tile | the detail pages already matched, bar a white card wrapped round two cream quote cards |
| Unmatched URLs answer 404 rather than 200 with an empty shell | the catch-all is gone from `vercel.json`; `check-route-targets.mjs` fails if it or anything as wide comes back, planted twice |
| The app and the website size a storycard from the same numbers | `check-storycard-type.mjs`, 17 roles, planted seven ways |
| The app home tile draws its icons in orange | one line, and a disabled row keeps the muted brown |
| The workbook download link is never handed over expired | `check-workbook-link.mjs`, 9 link shapes, planted four ways; the stored link was signed for 7 days and served forever |
| Every table in the schema has row level security | `check-rls-policies.mjs`, both halves, planted six ways in total |
| One six-month check-in email, the cron one | the browser-triggered copy is gone from the sender, the app and the trigger record; `check-email-preview.mjs` shows 13 emails, all triggered |
| No surviving RLS policy lets a stranger read personal data | `check-rls-policies.mjs`, replayed in migration order, planted four ways |
| Both workbook variants render, same type and different types | `check-workbook-renders.mjs`, planted three ways; the same-type one had been broken since this morning |
| All 27 review-document generators build | `check-doc-generators.mjs`, now part of `npm run check`; seven were reading constants out of src/App.jsx that had moved into modules |
| The reflection review shows its keyword lists, and says when one is gone | the names are read from the module rather than typed, so a missing list prints as missing instead of empty |
| The five emails nothing sends are gone | `check-email-preview.mjs`: 14 emails, every one with a trigger |
| The gift cards are retired | the designer, both card templates, the print sheet, the generator, the card endpoint, the claim endpoint and the claim path through signup. All five signup screens render character for character as before |
| A rejected database query is reported rather than drawn as a zero | `check-query-failures.mjs`, planted four ways; this is why the Engagement page read empty |
| Every tile on the Engagement page has its own slicer | 12 of them, rendered in a browser; payloads cached per cut |
| The visit numbers say they are visits, not unique visitors | on the headline tile and on the chart beside it |
| One set of package prices everywhere | `check-package-prices.mjs`, 9 tables, planted four ways; the tax endpoint was quoting premium at $295 against a $198 charge |
| The admin no longer prices anniversary at 159 or premium at 299 | corrected to the catalogue, and the gate above holds it there |
| Every email the product sends is rendered by the code that sends it, on one page | `check-email-preview.mjs`, 19 emails, planted four ways |
| The preview page holds no email copy of its own | same gate: an object with a subject and a body in that file fails the build |
| The record of which emails are actually triggered is current | `build-email-triggers.mjs` generates it, `check-email-triggers.mjs` fails if it drifts |
| Every scheduled email carries an unsubscribe link with the recipient's own id | `check-unsubscribe.mjs`, now rendered end to end from a profile row rather than read statically |
| The ten endpoint emails and the four order cases are unchanged by the refactor | snapshotted before and after, byte for byte identical |
| Every route in vercel.json lands on a file that exists | `check-route-targets.mjs`, 80 routes, planted four ways |
| Two routes pointing at files deleted in 97cacb6 are gone from vercel.json | `check-route-targets.mjs`; note /lmft-booking still answers 200 with the app shell, because the catch-all takes anything left, which is O5 and yours |
| Clicking Reviews lands on the reviews, not the top of the FAQ | faq.html scrolls to the section it already had an id for |
| Nothing in the tree names a domain that is not ours | `check-site-origin.mjs`, 383 files, planted four ways |
| The cart can price a workbook add-on again | in a browser: threw ReferenceError before, returns 108 after, which is the 89 package plus the 19 digital workbook |
| The combined CSV export can build a row | `s` was an undeclared name in four lines of it; `check-server-undefined.mjs` |
| An order arriving without line items still sends its receipt and setup link | three add-on flags were read and never passed; `check-server-undefined.mjs` |
| A login with a partner email in the form completes | it built the invite URL from an undeclared name and threw before the spinner stopped; `check-server-undefined.mjs` |
| No file under api/, public/ or src/ reads a name nothing declares | `check-server-undefined.mjs`, 139 files, planted six ways |
| Neither open write endpoint stores a row for an empty POST | `check-open-writes.mjs`, 14 bodies, and it counts outbound calls so a guard below the write is caught |
| The Engagement page is the layout you asked for: headline tiles, funnel and acquisition, five time charts, two Learning tables, two notes charts | rendered in Chrome: 9 canvases, 2 tables, 5 slicers, no console errors |
| Every view on the page reads one slicer, the same one the rest of the admin uses | the slice is applied server-side in `api/admin-engagement.js` before anything aggregates |
| No tile on the page draws a chart without first checking the measure was collected, and every gap says why | `check-engagement-honesty.mjs`, planted against three ways and caught all three |
| App time and site time can be told apart | `surface` on every event, sent by `public/_track.js` as `site` and by the app client as `app` |
| Results time is filed per section on both surfaces | `app:results:<section>` from the website, `useScreenTime(results:<id>)` from the app |
| Privacy policy, terms, data policy and EULA exist and are linked from every footer | `check-internal-links.mjs`, 908 links |
| "Your privacy choices" exists and Global Privacy Control is read server-side | `Sec-GPC` in `api/privacy-choices.js`; `check-consent-gate.mjs` |
| The privacy notice reaches every customer-facing page | `check-notice-reach.mjs`, 34 pages |
| Sign-in survives a tab switch, a locked keychain and an empty token | `check-session-recovery.mjs` |
| A link to something you own opens the sign-in form rather than a blank page | `check-gated-views.mjs`, 6 views |
| No results page repeats its own name as an eyebrow | `check-page-eyebrows.mjs`, 15 names |
| Expectations detail pages draw a dividing line, not a progress bar | `check-no-progress-bars.mjs` |
| Every results nav link resolves, including Life & Values | `check-nav-targets.mjs`, 30 links |
| All 30 results sections have a screen in the app | `check-results-coverage.mjs` |
| Every storycard field the server sends is drawn by the app | `check-storycard-fields.mjs`, 9 cards |
| Both surfaces score from the same questions with the same flips | `check-scoring-mirror.mjs`, 10 dimensions |
| Conflict and Reflection answers are drawn by both surfaces | `check-unshown-answers.mjs` |
| The waiting copy is one source and both surfaces mirror it | `check-waiting-copy.mjs`, 5 sentences |
| `pkg` cannot come from a request body | `check-entitlement-inputs.mjs`, `api/create-profile.js` |
| Conflict and intimacy answers never reach a partner's payload | `check-partner-privacy.mjs`, `check-intimacy-privacy.mjs` |
| `generate-card` fails closed without `CARD_SECRET` | 4 references in `api/generate-card.js` |
| Sign-in does not tell an attacker which half was wrong | `api/account-signup.js`, single message |
| Every exercise is answerable in the app and stores under the right key | `check-exercise-flow.mjs` in `npm run smoke` |
| Every package's add-ons are one rule | `check-pkg-rules.mjs`, generated from `PKG_CAPS` |
| The checklist and budget run in the app against one copy of their content | `check-tool-content.mjs`, `check-budget-mirror.mjs` |
| In Practice: all 12 articles reach the app | `check-in-practice.mjs` |
| The app does not sell | `check-app-does-not-sell.mjs` |


| # | Task | Verified by |
|--|--|--|
| — | `/api/admin-posts` and `/api/admin-presets` had never answered: 500 on every request since the day each shipped | Live, 401 now; `check-runtime-shape.mjs`, 2 plants |
| — | Nothing drew the 40 static pages, checkout included | `check-static-render.mjs` in `npm run smoke`, 2 plants |
| — | `save-exercise` kept its own list of exercises | Reads `api/_exercises.js`; every write verified against the old branching |
| — | Five copies of the site's address, disagreeing; the apex in two printed QR templates | `check-site-origin.mjs`, 3 plants, 347 files |
| — | Twelve In Practice articles linked to a page retired twice | `check-internal-links.mjs`, 2 plants; 908 links checked |
| — | `/app` signed out, and any unknown `?view=`, rendered a blank page | Confirmed live at 28 and 0 chars; now the sign-in form. `check-app-views.mjs`, 4 plants |
| — | In Practice, profile and feedback cards opened blank pages | Same gate; verified in a browser before and after |
| — | `check-exercise-flow` had never passed | Passes 3 of 3 driveable exercises; wired into `npm run smoke` |
| — | The browser checks leaked Chrome until the machine stalled | `scripts/_lib/browser.mjs` reaps on exit; verified both ways, and `npm run smoke` now runs end to end leaking nothing |
| — | The .docx printed "[PLACEHOLDER: ...]" in 7 places, including all 25 Conversation Library questions | `check-workbook-prose.mjs`, 3 plants; every key verified to resolve |
| — | The questionnaire is back on the website, at the end of What Comes Next | Rendered in a browser: four rating buttons, all seven questions, submit and the privacy line |
| — | Nothing in the product asked for feedback; three surfaces reported on it | `check-feedback-reachable.mjs`, 3 plants; the app asks now |
| — | The app can edit a profile | `check-profile-editable.mjs`, 4 plants; `check-profile-columns.mjs` widened to see columns named through a map |
| — | Four of the five engagement measures are collected and drawn | `check-tracking-consent.mjs` (5 plants), `check-engagement-honesty.mjs` (3 plants), aggregation tested over a sample |
| — | All 12 In Practice articles reach the app, six as placeholders | `check-in-practice.mjs`, 3 plants; excerpt now optional |
| — | 22 customer-facing pages showed no privacy notice, including the portal and every In Practice article | `check-notice-reach.mjs`, 2 plants; one notice on the portal, no duplicate app bar, checked in a browser |
| — | The surviving partner's results survive, anonymised | `check-results-survive-deletion.mjs`, 4 plants, run over a real payload. **Needs migration 059.** |
| — | Engagement tab, between Explore and Demographics | Renders in a browser; 4 of your 9 measures are live, 5 say what collecting them would take. `check-engagement-honesty.mjs`, 3 plants |
| — | Analytics tiles drew empty charts instead of saying they were empty | One change in `mkChart`, so it covers every chart on every tab |
| — | The EU/UK consent banner was a US notice with no Accept | `check-consent-gate.mjs`, 3 plants; a decline now stops Sentry |
| — | Deleting an account asked for no password | `check-delete-reauth.mjs`, 3 plants |
| — | Deletion told neither the person nor their partner | `check-deletion-notices.mjs`, 3 plants |
| — | Nothing recorded a consent event | `check-consent-record.mjs`, 2 plants. **Needs migration 058 run.** |
| — | The payment-records paragraph described retention we do not do | Amended; `check-em-dashes` and `check-copy-tokens` clean |
| — | The app's profile setup asked none of the five demographic questions | `check-demographics-capture.mjs`, 3 plants |
| — | Launch flags lived in four places by hand | `check-flags.mjs`, 4 plants |
| — | Profile setup could spin forever on a failed read | `check-read-failures.mjs`, 3 plants |
| — | Scheduled email carried no unsubscribe link | `check-unsubscribe.mjs`, 4 plants (2 of which it missed until fixed) |
| — | Dashboard reloading itself | Ellie's screenshot: 75s, 0 renders and 0 fetches in the last 5s |
| — | "Start shared budgeting" opened a 28-character blank page | `check-gated-views.mjs`; 1214 chars where there were 28 |
| — | Five of six category tiles had no colour | `check-category-colors.mjs`, 2 plants |
| — | Starting Out checklist runs in the app | `check-tool-content.mjs`, 3 plants |
| — | Shared Budget runs in the app | `check-budget-mirror.mjs` (4 plants), `check-budget-names.mjs` |
| — | Workbook opens as a file; the app cannot sell | `check-app-does-not-sell.mjs`, 1 plant |
| — | Account setup happens in the app | Endpoint derives the id from a token |
| — | In Practice posts read in the app | First renderer of post blocks on either surface |
| — | Life & Values on the site | Ellie: "L&V working" (it was the reload loop) |
| — | Expectations progress bar becomes a dividing line, site | `check-no-progress-bars.mjs`, 1 plant |
| — | "Explore something new" row | Already built in `api/_lib/pick-up.js`; I had reported it missing in error |
| 78.6 | For whatever reason the site just brought back the how it works and couple types pages, those were deleted lo... | the files are deleted |
| 81.9 | Couple type page is STILL showing different content from what we do on the site. I’m frustrated by this at th... | check-results-copy-reach |
| 96.11 | I’ve asked for this already, but please wire in the in-practice content so that I can see how this is built. | fetchPosts wired |
| 99.2 | A concern - my results on the site look different from my results in the app (looking at expectations, we wer... | check-scoring-mirror |
| 105.4 | Scorecard 2 is very different on the app than it is on the website. Do a thorough scan of code and renderings... | check-storycard-fields |
| 105.10 | Now our dashboard says Preston’s conflict exercise is pending. He’s completed it. Make sure this bug is fixed | check-results-gate |
| 105.11 | Even though his conflict is missing, we can access our results, only conflict results are gated. That’s an is... | check-results-gate |
| 105.14 | I want to be able to select text and have a small popup menu that has icons for highlight, underline, tag, no... | Ellie: "word range selection is fine" |
| 105.20 | Notes tab organization: | built to the spec in this message |
| 108.4 | No info filled in on our app’s relationship reflection pages | check-results-coverage |
| 108.7 | On the detailed pages’ sliding bars, when the dots offset they’re slightly too far apart. Can we bring them t... | check-position-units |
| 108.12 | Conflict exercises working on app but not on web | check-stripped-fields |
| 113.1 | My dashboard, again, showed that ex1 was incomplete. I signed out then signed back in and it fixed itself, bu... | check-results-gate |
| 113.4 | Remove ‘what you expect’ eyebrow from expectations results at a glance page | check-page-eyebrows |
| 113.5 | Remove ‘Physical intimacy expectations’ eyebrow from intimacy results at a glance page | check-page-eyebrows |
| 113.6 | Remove ‘conflict patterns’ eyebrow and dot from top left of conflict results at a glance page | check-page-eyebrows |
| 113.7 | Remove eyebrow text in top left of each conflict detailed page | check-page-eyebrows |
| 113.8 | Left nav calls it ‘what you both wrote’ and page hero is ‘what you each wrote’ . I assume the app uses the sa... | one title in nav and hero, grep clean |
| 116.4 | Storycards still look different than the ones online. Killing me. Check font, coloring, all visuals, etc. Am ... | check-fonts |
| 116.6 | Issue that I just noticed - the dimensions on the comms results at a glance page are in the wrong order. Make... | check-dimension-order |
| 116.11 | Physical Intimacy is still missing from the top nav. Am I viewing an old version of the simulator? | nav comes from the server |
| 132.4 | We need to make sure the app pipes in the welcome back, good morning, etc. messages appropriately - it’s noon... | check-greeting-clock |

---

---

## Design: where I think this goes, and what I need from you

You asked for thought partnership rather than another pass, so this is
questions and options rather than a redesign. It lives here rather than in a
reply so it survives the session.

### The one thing I believe is doing most of the damage

Every reference you sent has something made by a person in it. The task app has
illustration. The food app has photography. Even the flat colour-block one has a
drawn magnifying glass. Attune is type and gradient from the first screen to the
last, and I think that, more than any layout, is what reads as generated.

The Learn cards already accept artwork and there is none, so every card falls
back to a tinted ground with the mark in the corner. That is the largest single
lever available and it is not a code job.

**Question 1.** Is there any budget or appetite for imagery, of any kind? It
does not have to be photography. A set of six or eight simple drawn marks, one
per results section, would carry the whole app. Answer this one and it changes
what the rest of these are worth.

### Questions about Notes, since that is the screen you called boring

Notes is a filing cabinet: a list, a list of tags, an empty state. Every other
tab has a subject. Notes has storage.

**Question 2.** What is the Notes tab *for*, in a sentence? I can think of three
answers and they build differently. "Everything I marked, so I can find it
again" is a library and wants search and filtering. "What we are working on
right now" is a worklist and wants the three most recent things and a way to
tick one off. "A record of us paying attention to this" is a history and wants
dates, volume, and the shape of it over time.

**Question 3.** Should Notes show your partner's shared notes as prominently as
your own, or is it your room with a letterbox in it? Right now it is the second
and does not say so.

**Question 4.** Is there anything you would want to *do* from Notes other than
read? Turn a mark into a conversation to have. Send one to the other person with
a question attached. Mark one as done.

### Three directions I could take the app's colour, and what each costs

These are alternatives, not a list to pick all of.

**A. Sections own the app, not just the results.** Today the Insights pages
carry a section's colour and nothing else does. This would mean a note about
Expectations carries blue wherever it appears: in Notes, on the home tile, in
Learn. The product would feel like five coloured rooms. Cost: the colours stop
meaning "you are in this section" and start meaning "this thing is about that
section", which is a bigger claim and harder to keep true.

**B. One accent, used rarely and always for the same thing.** The opposite:
cream, ink and the orange, with the orange reserved strictly for "this is the
thing to do next". Sections keep colour only inside Insights. This is the
quietest and the most confident, and it is closest to how the website reads.
Cost: less colour, not more, which is not what you asked for.

**C. Warmth rather than colour.** Keep the palette, change the surfaces: paper
grain, a slight tint on the cream, cards with a real edge rather than a hairline,
the display face used at larger sizes in more places. Makes the app feel printed
instead of drawn. Cost: it is a lot of small changes and none of them will
screenshot well on their own.

**Question 5.** Which of those three is closest to what you pictured when you
said "more color and branding"?

### Two smaller things I would do regardless, if you want them

- **A dark tab bar.** The light one is the most generic element on any screen,
  and every reference you sent has a dark or high-contrast one.
- **A segmented arc instead of a flat bar** for alignment, like the calorie
  gauge in the food app. Same number, considerably less stock.

### And one answer to a question you asked

**Did we shrink the font to fit the tiles?** No. The type on every results page
is the size it was; the tile took its width from the page's own margins, which
were already there. The only thing that got smaller is the landing page's
section names, which were hero-sized and are now a shade above body size,
because you asked for that. Nothing in the results reads smaller than it did.

## How this is kept

**An approved table comes out.** Ellie: "When I have approved a review point
for which you built a review table below sec3, please remove the associated
table as I have already reviewed it." A table that has done its job costs
review attention on the wrong half of the document, which is the failure the
tables exist to prevent. The builders are in git history, so the next one is a
few lines rather than a rewrite.

1. A list arrives. This file is updated first, before any work.
2. Work happens.
3. This file is updated again, then handed back for review.
4. A general ask ("remove all X") gets a search across both surfaces and a
   gate, not the edits the message happened to name.
5. Every content change to one surface is mirrored on the other (msg 79).
6. Anything blocked on Ellie goes in section 1, whatever kind of thing it is.
   A migration is not a review item: until it runs, a column is missing and a
   chart is empty. Three of them sat in section 3 reading as optional.

---

## The old section 3

Every individual ask from the first 135 messages, 184 of them, lived here as
its own row. They are all either verified above, folded into a review item, or
long since shipped and superseded. The full list is in git:

    git show 75e002c:TASKS.md

Nothing was thrown away. It was too long to read, which made it useless as a
list of what to do next, which is the only thing a task file is for.
