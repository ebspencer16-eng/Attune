#!/usr/bin/env node
/**
 * The couple map's two controls, driven.
 *
 * ── WHAT THEY ARE ─────────────────────────────────────────────────────────
 * Ellie, B91: "remove 'your individual types' section entirely, add the
 * description of each person if you tap on the person's dot. Make it like a
 * pop up next to the dot. Tap outside the pop up tile to make it go away. Pop
 * up tile should have the paragraph from the individual type section but we
 * don't need the axes bars."
 *
 * And B92: "Put a light grey question mark icon in a circle next to Open and
 * Withdraw that pop up with the description of that axis. Remove axis
 * descriptions from below the chart."
 *
 * So two paragraphs that used to be printed on the page are now behind a tap,
 * and the whole value of the change depends on the tap working. A paragraph
 * nobody can open is a paragraph that has been deleted.
 *
 * ── WHY IT IS DRIVEN AND NOT READ ─────────────────────────────────────────
 * Every cheap version of this check passes on code that does nothing. The
 * strings are in the source either way: `interactive` could be false at the
 * call site, the state could never be set, the panel could render under the
 * map, the dismiss sheet could cover the control that opens it. All of those
 * read exactly like the working version. This file clicks.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * On the couple type page, at a phone width and at desktop:
 *
 *   the axis descriptions are NOT on the page to begin with;
 *   there is no "individual types" heading either;
 *   exactly two question marks, one per axis, at the pole api/_axes.js names;
 *   each one opens its own axis's sentence, and not the other's;
 *   a click elsewhere closes it;
 *   each dot opens a panel carrying that person's name, their individual type
 *     name and a paragraph, with no axis bars in it;
 *   a click elsewhere closes that too;
 *   and so does a tap on the map, which is a different mechanism: the sheet
 *     over the map rather than the listener on the document.
 *
 * The dot panel is also asked whether it is the thing at that point on the
 * screen, because a box says nothing about z-order: a panel drawn under the
 * map has the same rectangle as one drawn over it.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The app's half of the same change. An Expo component cannot be driven by
 * this harness; check-section-blocks holds the app to carrying both blocks,
 * and the panel itself was verified in the simulator.
 *
 * Nor where the panel sits on the screen, beyond being visible: "like a pop up
 * next to the dot" is a judgement about a picture and it is hers.
 */

import { launch } from './_lib/browser.mjs';
import { AXES } from '../api/_axes.js';

const BASE = process.env.BASE || 'http://localhost:4173';
const TYPE = process.env.TYPE || 'WX';
const PKG = process.env.PKG || 'premium';

const helped = AXES.filter((a) => a.helpAt && a.poles);
if (helped.length !== 2) {
  console.error(`[check-map-controls] api/_axes.js describes ${helped.length} axes with a help`
    + ' marker, and this page has two. Refusing to pass: a gate that has lost its subject'
    + ' must never report success.');
  process.exit(1);
}

const fails = [];

/**
 * ── WHY EVERY CLICK CARRIES COORDINATES ───────────────────────────────────
 * The results column pages back on a click in its left sixth and forward in
 * its right sixth, which is Ellie's own rule from the storycards. A
 * `new MouseEvent('click')` with no clientX is a click at x=0, so the first
 * version of this gate turned the page every time it tried to click away from
 * a panel, and every dismissal assertion passed because the couple type page
 * was no longer on screen. Passing for the wrong reason.
 *
 * So clicks land in the middle of the element, and after each one the gate
 * asks which section it is on. A navigation is a failure here, not a pass.
 */
/**
 * Click the middle of something, with coordinates.
 *
 * `what` is one of: { kind: 'heading' }, { kind: 'dot', label },
 * { kind: 'mark', label }, { kind: 'mapAway', label }. mapAway finds a point
 * over the map that is not the open panel and clicks through whatever is
 * there, which is the only way to tell a dismiss sheet from no sheet.
 */
function clickCentre(page, what) {
  return page.evaluate((w) => {
    const root = document.querySelector('[data-results-scroll]') || document.body;
    const find = () => {
      if (w.kind === 'heading') return root.querySelector('h1') || root;
      if (w.kind === 'dot') {
        return [...root.querySelectorAll('circle[role="button"]')]
          .find((n) => (n.getAttribute('aria-label') || '') === w.label) || null;
      }
      if (w.kind === 'mark') {
        return [...root.querySelectorAll('[role="button"]')]
          .find((n) => (n.getAttribute('aria-label') || '') === w.label) || null;
      }
      return root.querySelector('svg[aria-label^="Couple map"]') || null;
    };
    const el = find();
    if (!el) return false;
    const fire = (at, x, y) => {
      for (const type of ['mousedown', 'click']) {
        at.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
      }
    };

    /**
     * ── A POINT ON THE MAP THAT IS NOT THE PANEL ────────────────────────
     * "Tap outside the pop up tile" means outside the tile, and the tile is
     * over the map. The first version of this clicked the top middle of the
     * map, which for a dot near the top IS the panel, so a working dismiss
     * reported as broken. So: a grid over the map, skipping any point inside
     * the panel, inside a control, or inside the panel's own node, and the
     * click goes through whatever is actually at the one it picks. That is
     * what tells a dismiss sheet from no sheet.
     */
    if (w.kind === 'mapAway') {
      const b = el.getBoundingClientRect();
      const node = root.querySelector('[data-map-panel]');
      const panelNode = node ? { n: node, r: node.getBoundingClientRect() } : null;
      const pr = panelNode ? panelNode.r : null;
      /* The far left of the map first, deliberately. That point is inside the
         column's left sixth, which is its "page back" zone, so a dismissing
         tap there exercises both halves of the rule at once: the panel has to
         close AND the page must not turn. Removing the sheet's
         stopPropagation was a plant this gate passed while every tap was
         landing in the middle third. */
      for (const fy of [0.03, 0.5, 0.97]) {
        for (const fx of [0.01, 0.5, 0.2, 0.8]) {
          const x = Math.round(b.left + b.width * fx);
          const y = Math.round(b.top + b.height * fy);
          if (pr && x >= pr.left && x <= pr.right && y >= pr.top && y <= pr.bottom) continue;
          const at = document.elementFromPoint(x, y);
          if (!at) continue;
          if (at.closest && at.closest('[role="button"]')) continue;
          if (panelNode && (at === panelNode.n || panelNode.n.contains(at))) continue;
          fire(at, x, y);
          return true;
        }
      }
      return false;
    }

    const b = el.getBoundingClientRect();
    const x = Math.round(b.left + b.width / 2);
    const y = Math.round(b.top + Math.min(b.height / 2, 40));
    fire(el, x, y);
    return true;
  }, what);
}

/* One browser per width. `launch` applies the size through
   Emulation.setDeviceMetricsOverride, which is per page, and macOS enforces a
   minimum window width: a gate that asks for 390 by resizing gets 500 and
   measures a browser rather than a phone. */
for (const width of [390, 1280]) {
  const page = await launch({ width, height: 1400 });
  try {
    await page.goto(`${BASE}/`);
    await page.evaluate(() => localStorage.setItem(
      'attune_results_state',
      JSON.stringify({ activeResult: 'couple-type', highlightsSeen: true }),
    ));
    await page.goto(`${BASE}/?demo=1&type=${TYPE}&pkg=${PKG}&intimacy=1&conflict=1&view=results`);
    await page.wait(900);

    const where = `at ${width} points`;

    /* ── 1. NEITHER PARAGRAPH IS PRINTED ON THE PAGE ──────────────────────
       textContent, not innerText: this page uppercases its eyebrows, and a
       copy comparison is about what the code said. */
    const printed = await page.evaluate((descs) => {
      const el = document.querySelector('[data-results-scroll]') || document.body;
      const t = el.textContent || '';
      return {
        descs: descs.filter((d) => t.includes(d)),
        heading: /individual types/i.test(t),
        marks: [...el.querySelectorAll('[role="button"]')]
          .map((n) => n.getAttribute('aria-label') || '')
          .filter((l) => /^What .* means$/.test(l)),
        dots: [...el.querySelectorAll('circle[role="button"]')]
          .map((n) => n.getAttribute('aria-label') || ''),
      };
    }, AXES.map((a) => a.desc));

    if (printed.descs.length) {
      fails.push(`${where}: the axis description is still printed under the chart:`
        + ` "${printed.descs[0].slice(0, 50)}...". B92 removed it from the page; it belongs`
        + ' behind the question mark.');
    }
    if (printed.heading) {
      fails.push(`${where}: the page still says "individual types". B91 removed that section`
        + ' entirely; each person\'s paragraph is behind their dot.');
    }
    if (printed.marks.length !== 2) {
      fails.push(`${where}: ${printed.marks.length} question mark(s) on the map, and there`
        + ` should be two: ${helped.map((a) => a.poles[a.helpAt]).join(' and ')}.`);
    }
    if (printed.dots.length !== 2) {
      fails.push(`${where}: ${printed.dots.length} tappable dot(s) on the map, and there`
        + ' should be two, one per person.');
    }

    /* ── 2. EACH QUESTION MARK OPENS ITS OWN AXIS ─────────────────────── */
    for (const axis of helped) {
      const label = `What ${axis.label} means`;
      /* Click, wait, then read. The first version of this read in the same
         evaluate as the dispatch and reported every control dead: a React
         state update is not on screen by the time dispatchEvent returns, so
         the measurement was taken before the render it was measuring. */
      const clicked = await clickCentre(page, { kind: 'mark', label });
      await page.wait(250);
      const opened = clicked
        ? await page.evaluate((args) => {
          const el = document.querySelector('[data-results-scroll]') || document.body;
          const t = el.textContent || '';
          return { mine: t.includes(args.mine), other: t.includes(args.other) };
        }, { mine: axis.desc, other: AXES.find((a) => a.id !== axis.id).desc })
        : { missing: true };

      if (opened.missing) {
        fails.push(`${where}: no question mark labelled "${label}".`);
        continue;
      }
      if (!opened.mine) {
        fails.push(`${where}: the question mark beside ${axis.poles[axis.helpAt]} opened nothing.`
          + ` Its own sentence, "${axis.desc.slice(0, 40)}...", is not on the page after a click.`);
      }
      if (opened.other) {
        fails.push(`${where}: the question mark beside ${axis.poles[axis.helpAt]} opened both`
          + ' axes. One panel at a time.');
      }

      /* And a click away from it closes it. The page heading is as "outside"
         as anything gets. */
      await clickCentre(page, { kind: 'heading' });
      await page.wait(250);
      const closed = await page.evaluate((desc) => {
        const el = document.querySelector('[data-results-scroll]') || document.body;
        return {
          gone: !(el.textContent || '').includes(desc),
          on: (JSON.parse(localStorage.getItem('attune_results_state') || '{}') || {}).activeResult,
        };
      }, axis.desc);
      if (closed.on !== 'couple-type') {
        fails.push(`${where}: a click on the page heading navigated to ${closed.on}, so nothing`
          + ' here is a measurement of the panel closing.');
      } else if (!closed.gone) {
        fails.push(`${where}: the ${axis.id} panel stayed open after a click elsewhere on the`
          + ' page. Ellie: "Tap outside the pop up tile to make it go away."');
      }
    }

    /* ── 3. EACH DOT OPENS THAT PERSON'S PARAGRAPH ────────────────────── */
    for (const dotLabel of printed.dots) {
      const [name, typeName] = dotLabel.split(': ');
      /* With nothing open: the delta is the panel, and a previous person's
         panel still on screen would make it nearly zero. */
      await clickCentre(page, { kind: 'heading' });
      await page.wait(200);
      const before = await page.evaluate(() => {
        const el = document.querySelector('[data-results-scroll]') || document.body;
        return (el.textContent || '').length;
      });
      const tapped = (await clickCentre(page, { kind: 'dot', label: dotLabel })) ? before : null;
      await page.wait(250);
      const panel = tapped == null ? { missing: true } : await page.evaluate((args) => {
        const el = document.querySelector('[data-results-scroll]') || document.body;
        const after = el.textContent || '';
        /* The panel is the only thing that changed, so its words are what
           the page gained. Measuring a node as well, because a panel can be
           in the document and not on the screen: behind the map, at zero
           height, or parked off to the left the way the share card is.

           The biggest box containing the type name, not the innermost. The
           first version took the last match, which is the line of type
           itself: 20 points tall, so a working panel reported invisible. */
        /* The panel itself, by the handle it carries. Two earlier versions
           looked for it by geometry: the smallest box containing the type
           name (which is the line of type, 22 points tall, so a working
           panel read as invisible) and then the biggest box under 320 wide
           (which at a phone width is the map tile, so every point on the map
           read as inside the panel). A node a check can name is not a
           convenience here, it is the difference between measuring the thing
           and measuring something near it. */
        const node = el.querySelector('[data-map-panel="dot"]');
        const panel = node ? node.getBoundingClientRect() : null;
        const hit = node ? { n: node } : null;
        /* And it is the thing at that point on the screen. A box says nothing
           about z-order: a panel rendered under the map has exactly the same
           rectangle as one rendered over it. */
        const top = panel
          ? document.elementFromPoint(
            Math.round(panel.left + panel.width / 2),
            Math.round(panel.top + panel.height / 2),
          )
          : null;
        return {
          grew: after.length - args.before,
          hasName: after.includes(args.name),
          hasType: after.includes(args.typeName),
          visible: !!panel && panel.width > 120 && panel.height > 60
            && panel.right > 0 && panel.left < window.innerWidth,
          onTop: !!top && !!hit && (hit.n === top || hit.n.contains(top)),
          box: panel ? [Math.round(panel.left), Math.round(panel.top),
            Math.round(panel.width), Math.round(panel.height)] : null,
        };
      }, { name, typeName, before: tapped });

      if (panel.missing) { fails.push(`${where}: the dot labelled "${dotLabel}" vanished.`); continue; }
      if (!panel.hasName || !panel.hasType) {
        fails.push(`${where}: tapping ${name}'s dot did not show ${panel.hasName ? '' : 'their name'}`
          + `${!panel.hasName && !panel.hasType ? ' or ' : ''}${panel.hasType ? '' : 'their individual type'}.`);
      }
      /* A paragraph, not a label. The blurb is two sentences; the eyebrow and
         the type name together are well under a hundred characters. */
      if (panel.grew < 120) {
        fails.push(`${where}: tapping ${name}'s dot added ${panel.grew} characters to the page.`
          + ' The panel is supposed to carry the paragraph the individual types section used'
          + ' to show, which is two sentences.');
      }
      if (!panel.visible) {
        fails.push(`${where}: ${name}'s panel is in the document and not on the screen.`
          + ` The largest box under 320 wide carrying their type name is ${JSON.stringify(panel.box)}`
          + ' (left, top, width, height), and a panel is at least 120 by 60 inside the window.');
      } else if (!panel.onTop) {
        fails.push(`${where}: ${name}'s panel is behind something. The element at the middle of`
          + ' it is not part of it, so a reader taps the map rather than reading the panel.');
      }

      await clickCentre(page, { kind: 'heading' });
      await page.wait(250);
      const closed = await page.evaluate((args) => {
        const el = document.querySelector('[data-results-scroll]') || document.body;
        return {
          gone: !(el.textContent || '').includes(args.typeName),
          on: (JSON.parse(localStorage.getItem('attune_results_state') || '{}') || {}).activeResult,
        };
      }, { typeName });
      if (closed.on !== 'couple-type') {
        fails.push(`${where}: a click on the page heading navigated to ${closed.on}.`);
      } else if (!closed.gone) {
        fails.push(`${where}: ${name}'s panel stayed open after a click elsewhere.`);
      }

      /* ── AND A TAP ON THE MAP ITSELF ─────────────────────────────────
         The other half of "tap outside the pop up tile", and the half a
         document listener cannot do: the map is inside the component, so a
         tap on it is not outside anything as far as that listener is
         concerned. What closes it is the transparent sheet over the map.

         Removing that sheet was a plant this gate passed, because clicking
         the page heading still closed the panel. So the click goes through
         whatever is actually at a point over the map, which is the sheet when
         there is one and the chart when there is not. */
      /* Reopen it, then tap the map. Through whatever is at that point, which
         is the sheet when there is one and the chart when there is not.
         Deliberately the top middle of the map: the dots are inside it and
         the column's own paging zones are its outer sixths. */
      await clickCentre(page, { kind: 'dot', label: dotLabel });
      await page.wait(250);
      const tappedMap = await clickCentre(page, { kind: 'mapAway', label: typeName });
      if (!tappedMap) {
        fails.push(`${where}: could not find a point over the map that is not ${name}'s panel,`
          + ' so the tap-outside half of this check measured nothing.');
      }
      await page.wait(250);
      const onMap = await page.evaluate((args) => {
        const el = document.querySelector('[data-results-scroll]') || document.body;
        return {
          gone: !(el.textContent || '').includes(args.typeName),
          on: (JSON.parse(localStorage.getItem('attune_results_state') || '{}') || {}).activeResult,
        };
      }, { typeName });
      if (onMap.on !== 'couple-type') {
        fails.push(`${where}: a tap on the map navigated to ${onMap.on}. A tap that dismisses a`
          + ' panel must not also turn the page.');
      } else if (!onMap.gone) {
        fails.push(`${where}: ${name}'s panel stayed open after a tap on the map. The sheet that`
          + ' covers the map while a panel is open is what closes it; the document listener'
          + ' cannot, because the map is inside the component.');
      }
    }
  } finally {
    await page.close();
  }
}

if (fails.length) {
  console.error('\n check-map-controls: the couple map is not answering its taps.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log('[check-map-controls] at 390 and 1280 points: no axis description or individual'
  + ' types section printed on the page, two question marks opening their own axis, two dots'
  + " opening their own person's paragraph, and a click elsewhere closing whichever was open.");
