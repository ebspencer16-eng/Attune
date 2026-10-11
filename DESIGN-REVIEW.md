# Attune, looked at twice: once as a graphic designer, once as a UX designer

Ellie asked for a critique of the site and the app, design and functionality,
with recommendations. This is it. Nothing here is built. Every item ends with
what I would do and roughly what it costs, and you can take them one at a time.

## How I looked, so you can discount the parts I could not see

**The website.** Every page captured at 390 points (an iPhone) and 1280 (a
laptop), full page, through a headless Chrome: the twelve marketing and
checkout pages, the dashboard, and the results sections.

**The app.** Four tabs, live, on the iOS simulator: Home, Insights, Learn,
Notes. Everything else in the app I have only read, and I say so where it
matters.

**Two things I had to fix before any of it was worth looking at.**

The capture tool was asking Chrome for a 360 point window and getting a 500
point one, because macOS enforces a minimum window width. Every check in this
repo that believed it was looking at a phone was looking at a 500 point
browser, including the one that printed "37 pages at two phone widths" eight
days ago. Both of its widths were the same width, and it was not a phone's.
That is fixed, and the first real run at 320 points found two pages drawing
content past the right edge where it is cut off rather than scrollable: the
add-on tiles on the packages page, and three charts in the admin. Both fixed.

A headless page's animation clock does not run. Anything that fades in sits at
opacity zero in a screenshot for ever, so my first capture of the results
highlights was an empty card, and I nearly reported it as a blank page. It was
the camera. Animations are turned off for captures now.

The numbers below come from those captures and from the code. Where I am
inferring rather than measuring, I say so.

---

# Part one: as a graphic designer

## 1. There is no photography and no illustration. Anywhere.

Every picture area in this product is a tinted rectangle with the mark in the
corner. On the app's home screen, two of them take up a third of the screen.
On the website's hero and its three step cards, the images are grey wireframes
of a form: bars standing in for text, a box standing in for a chart.

This is the largest single difference between how Attune looks and how the
products it is competing with look. It is also the one you have already been
asked about once, in D12, and have not answered: every reference you sent has
something made by a person in it.

**What I would do.** Pick one of three, in rising order of cost:

- **Nothing new, used better.** The couple map, the storycards and the
  dimension sliders are the most distinctive things this product draws. Use
  real ones as the hero image rather than wireframes of a generic form. Free,
  and it also means the homepage shows the product instead of a diagram of a
  product. Half a day.
- **One illustrator, six drawings.** Two for the homepage, one per package,
  one for the workbook cover. A consistent hand across the brand. This is the
  version that changes how the site feels.
- **Photography.** The most expensive and the least differentiated: everyone
  selling to couples uses the same stock pictures of couples.

I would take the first now whatever you decide about the other two.

## 2. Two colours have crept in that are not yours

The brand is orange, indigo, cream and the five exercise colours. Three places
draw a lavender that is in none of them: step 02 on the homepage, one quadrant
of the couple map, and the two add-on icons on the dashboard's Resources page.
CLAUDE.md already records a lavender being removed once for exactly this
reason.

**What I would do.** Replace all three with the indigo. One line each.

## 3. There are two primary buttons

The nav's "Get started" is a black pill. The page's "GET STARTED" is an orange
pill. They are the same action, one above the other, in two colours.

On the packages page there are three ways to add something to a cart: an orange
text link with an arrow in the package tiles, a filled orange button in the
custom panel, and a tile that has neither because it is bundled.

**What I would do.** One primary: the orange pill. The nav's becomes the same
pill, smaller. The text links in the package tiles become small filled buttons,
so the thing a person is scanning for looks the same everywhere. Half a day.

## 4. The settings gear is the loudest thing on three of the four app screens

It is a saturated system blue circle with a white cog, top right, on every tab.
On the Insights tab, which is peach, it is the only strong colour on the
screen. It reads as an iOS control someone left in rather than part of Attune.

**What I would do.** Make it the same ghost treatment the rest of the app's
chrome uses: the mark's own warm grey, no fill, or a glass circle on the washes
that have one. An hour.

## 5. Both surfaces have a hole in the middle of a screen

The app's Home screen has about 200 points of nothing between "Good afternoon,
Ellie" and the four quick tiles, and the greeting wraps to two lines, which you
have asked about before. The Insights tab has the menu in the top half and 40
per cent of the screen empty below it. The website's hero has the same shape of
gap between the headline and the illustration.

This is not an argument for filling them. It is an argument for deciding what
they are: on Home the gap is where an image would go, and on Insights the
screen would look composed if the menu card simply ran to the bottom.

**What I would do.** Home: either the greeting gets the room (one line, larger)
or the picture goes in the gap. Insights: let the menu card fill the screen.
Both are small. Half a day for the pair.

## 6. The small print is unreadable in 181 places, and that is a brand decision

Measured, not judged: 187 runs of text across 37 pages are below the readable
contrast ratio, and the biggest group is the brand orange used as small print.
That is B19 in TASKS.md with a table of fifteen examples and one example of
each. Thirteen of the fifteen I would just take.

## 7. The type is good and the scale has a hole in it

Playfair for display, DM Sans for body, and the pairing is right. What is
missing is the middle: a marketing page goes from a 44 point hero to 14 point
body with almost nothing between, so every section reads as either a shout or a
paragraph. The results pages have the middle sizes and look better for it.

**What I would do.** Add one step: a 20 to 24 point standfirst under each
section heading on the marketing pages. It is a CSS class and about an hour, and
it makes the long pages scannable.

---

# Part two: as a UX designer

## 8. The product asks for feedback twice, and the first time is before you have read anything

The moment the storycards are marked seen, a modal opens over the results:
"How would you rate your Attune experience?", six questions. The person has at
that point read nine cards and no sections.

Then at the end of What Comes Next, which is the last page of the whole results
experience, there is a second questionnaire: "How was your experience?", seven
different questions.

Two asks, two question sets, and the one that interrupts comes first.

**What I would do.** Keep the one at the end, where it belongs, and make the
modal fire from the same place: when someone reaches What Comes Next, or on
their second visit. It is a condition, not a rebuild. Two hours.

## 9. The tab bar sits on top of the content on two tabs

On Learn, the search field is half behind it and the fourth article tile is cut
through. On Notes, the sentence inside the empty tags box is cut in half. Both
scroll containers need bottom padding equal to the bar's height.

**What I would do.** One shared constant for the bar's height, added as bottom
padding to every tab's scroll view. An hour, and it is the kind of thing that
makes an app feel finished.

## 10. The couple map does not say what it means

It is the single most distinctive thing the product draws, it takes the whole
first screen of the Couple Type page, and a reader gets: four pastel quadrants
with no key, two axis labels rotated 90 degrees, two dots with names on them, a
dotted line between them with no label, and one line of small grey text saying
"Placement calculated based on 10 dimension scores."

The gap between those two dots is the entire thesis of this product. It is
drawn as the faintest thing on the page and never named.

**What I would do.** Three changes, in order of value:

1. Label the gap. The line between the dots gets the one sentence that says
   what their distance means. That sentence is yours to write.
2. Turn the axis labels the right way up and put them outside the box.
3. Either give the quadrants names, or make them one colour. Four unexplained
   colours read as four categories nobody told you about, and the grey one
   reads as disabled.

Half a day, plus your sentence.

## 11. Checkout never says what happens next

A two person product has one genuinely confusing moment: the second person. The
checkout page takes both first names, takes the money, and never says that an
invite goes to the partner, how, or what the buyer does if their partner does
not answer it.

**What I would do.** One line under the names step, in your words, saying what
the partner will receive and when. Fifteen minutes once the sentence exists.

## 12. The wallet divider can appear with no wallet above it

In my capture, the checkout showed a "PAYMENT" rule, then empty space, then "OR
PAY WITH CARD", then the card fields. The express checkout block shows itself
when Stripe says a wallet is available, and mounts the button separately: if
the button renders empty, which is what I saw, the divider is left saying "or"
against nothing.

I saw this in headless Chrome, which is unusual, so treat it as worth checking
on a real phone rather than as proven. The fix is the same either way.

**What I would do.** Show the divider only when the button has a height. An
hour including testing it on a device.

## 13. The packages page is four small boxes on a phone

The most consequential decision on the whole site is presented as a two by two
grid of tiles about 180 points wide, each holding a name that wraps to two
lines, a price, one sentence and a link. Below it, a four column comparison
table at 390 points.

Two of the four packages are the same price ($139) with different names, and
the tiles do not say who each is for in a way you can scan.

**What I would do.** On a phone, one package per row, full width, ordered, with
the recommended one marked. The comparison table becomes a per-package list of
what is included, because a four column table on a phone is a table nobody
reads. One day.

## 14. A new couple opens the app and sees empty boxes

Home: two prompt cards whose picture areas are empty tinted rectangles. Notes:
"Nothing yet", "Nothing shared with you yet", and a dashed box saying "Add a
tag to get started". Insights before results: a status list.

Every one of those is correct and the sum is an app that looks unfinished at
exactly the moment someone decides whether it was worth the money.

**What I would do.** Give the three empty states something to do rather than
something to say. The Notes tab's two empty cards could be one card with the
word of the day in it, which is already the best thing on that screen. Half a
day.

## 15. Smaller things, each under an hour

- **Three of the five exercise icons are hearts**, two of them in different
  colours. Communication is a speech bubble and Expectations is a clipboard;
  the other three need to be as distinct as those two are.
- **"Tap to begin"** is on the first results card on a laptop, where you click.
- **The phone nav hides "Get started"** behind the hamburger while the desktop
  nav keeps it visible. The primary action on the site disappears on the device
  most people arrive on.
- **The stats row on the homepage wraps two and one** on a phone, leaving 91%
  alone on its own line, centred under a two column row.
- **"Physical Intimacy Expectations" is indented** under Relationship Reflection
  in the results sidebar, so it reads as a sub-section of it. The data has them
  as siblings; this is the sidebar drawing it wrong. Measured off the capture at
  1280 points: its bullet sits 28 points right of the bullets above and below
  it.

## 16. The dashboard's reading list and the app's Learn tab are two designs of one thing

You asked for this once already, in L2: "I want the site's in practice to look
exactly like the app's. That means the same visuals, coloring, etc." That was
done for the marketing page at /practice. The dashboard's own Resources page
was not, and it is the one a customer actually lives in.

Side by side:

| | App, Learn tab | Website, dashboard Resources |
|--|--|--|
| Heading | In Practice, Featured publications | RESOURCES, "Keep going." |
| Articles | four tiles in a grid, each with a bookmark | twelve flat rows, each an eyebrow, a title and an arrow |
| Read state | "Saved 0" and "Read 6" as counted pills | nothing |
| Search | yes | no |
| Tools | three cards at the top | two add-on cards with prices |

The same twelve articles, two layouts, and the better one is in the app.

**What I would do.** Make the dashboard's Resources page draw the app's Learn
tab: the tool cards, the counted pills, the tiles with bookmarks, the search.
The components exist on the website already, because the marketing page got
them in L2. One day, and it is the same instruction you have given once.

---

# What I would do, in order

If you take nothing else, take the first three. They are cheap and two of them
are things a customer hits in the first ten minutes.

| | What | Why it is first | Cost |
|--|--|--|--|
| 1 | Move the feedback modal to the end of the results | It interrupts the thing it is asking about | 2 hours |
| 2 | Tab bar stops covering content | It is the most visible unfinished thing in the app | 1 hour |
| 3 | One primary button | Two colours for one action, on the same screen | half a day |
| 4 | Label the gap on the couple map | It is the product's whole argument, drawn as a dotted line | half a day + your sentence |
| 5 | Real product images in the hero and the step cards | The homepage currently shows wireframes of a form | half a day |
| 6 | Packages: one per row on a phone | The most consequential screen is the most cramped | 1 day |
| 7 | The 13 contrast fixes in B19 | Measured, not taste | 2 hours |
| 8 | The two stray lavenders, the gear, the empty bands | Tidying, all small | half a day |
| 9 | What happens after checkout, in one line | The one thing a two person product has to explain | your sentence |
| 10 | The small things in 15 | Each under an hour | 1 day for all five |
| 11 | The dashboard's Resources page becomes the app's Learn tab | You asked for this once and it was done on the wrong page | 1 day |

## What I would not change

**The word of the day.** "Resentment: the bill for everything you did not say."
It is the best piece of design in either surface and it is doing work no other
screen is doing.

**The type pairing.** Playfair and DM Sans, and the restraint with which the
display face is used.

**The results sidebar's hierarchy.** Two levels, named sections, the detail
pages italic under a quiet heading. It is a good solution to a genuinely hard
information problem and it survived being rebuilt twice.

**The exercise cards.** Completed ones take the exercise's colour and say what
was captured; unfinished ones stay white and say Start. That is a status list
doing its job without a progress bar in sight.

**The storycards.** Nine of them, each a different composition, all legible at
a glance. They are the most finished thing here.
