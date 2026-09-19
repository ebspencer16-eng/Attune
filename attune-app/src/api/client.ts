/**
 * The only place the app talks to the server.
 *
 * Screens never call fetch. Every read goes through a function here with an
 * explicit return shape, because inline fetches in screens are how prototype
 * assumptions survive into production: a hardcoded field name, a response that
 * is fine until it times out, an auth header someone forgot on one call.
 *
 * Every function returns a discriminated result rather than throwing. Screens
 * have to handle the failure to get at the data, which is how you end up with
 * error states that exist instead of screens that spin forever.
 */

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export type ApiError =
  | { kind: 'offline' }
  | { kind: 'unauthorized'; detail?: string }
  | { kind: 'not_found'; detail?: string }
  | { kind: 'server'; status: number; message?: string };

// ── Shapes returned by the server. These mirror api/_lib/results.js and
//    api/home.js. If either changes, change these in the same commit.

export type DimensionScore = {
  self: number | null;
  blended: number | null;
  blend: { self: number; partner: number };
  axis: 'withdraw' | 'open' | null;
  weight: number | null;
  inverted: boolean;
};

export type IndividualProfile = {
  name: string | null;
  typeName: string;
  color: string;
  blurb: string;
  rows: { axis: string; label: string; value: string; score: number }[];
};

export type PersonResults = {
  name: string | null;
  typeCode: 'W' | 'X' | 'Y' | 'Z';
  axes: { withdraw: number | null; open: number | null };
  /** Position on the couple map, 0..1. From the server: the app never scores. */
  coords?: { open: number | null; engage: number | null };
  lowConfidence: boolean;
  blendedWithPartner: boolean;
  dimensions: Record<string, DimensionScore>;
};

/**
 * One dimension, ready to draw.
 *
 * Assembled by /api/results from the live dimension list, so this arrives for
 * every dimension that exists rather than the ones the app happens to know
 * about. `a` and `b` are the two partners' positions on a 1 to 5 scale.
 */
export type ResultDimension = {
  key: string;
  label: string;
  /** What each end of the scale means, e.g. Inward and Outward. */
  left: string | null;
  right: string | null;
  color: string | null;
  axis: 'withdraw' | 'open' | null;
  weight: number | null;
  /** Which Communication screen it belongs on. */
  domain: 'inner' | 'connection' | 'hard' | null;
  domainLabel: string | null;
  /** Self-report, 1 to 5. What the scales draw. */
  a: number | null;
  b: number | null;
  /**
   * The words for this dimension, exactly the website's.
   *
   * Only ever one of the two. `aligned` when the two landed close together,
   * `shift` when they did not, chosen by the server against the alignment
   * threshold so both surfaces make the same call. The app writes no copy of
   * its own about a dimension.
   */
  aligned?: string | null;
  shift?: string | null;
  /**
   * The blended score, which mixes each person's answers with their partner's
   * view of them. Used to derive the couple type. Deliberately not what the
   * scales draw: a mark under your own name should not move because of what
   * your partner said about you.
   */
  aBlended?: number | null;
  bBlended?: number | null;
  gap: number | null;
};

/**
 * The words. Attached by the server on read, never stored with the scores, so
 * fixing a typo reaches couples who finished before the fix.
 *
 * {U} and {P} are the two partners' names and are left in place: two people
 * read the same results and each is {U} in their own view.
 */
export type ResultsContent = {
  /**
   * Which side of `partners` the reader is.
   *
   * Stored results are keyed by the two user ids in sorted order, so `a` is
   * whichever id sorts lower, not whoever is reading. Never assume a is you.
   */
  viewer: 'a' | 'b';
  /** When a gap counts as wide. From the server, never redefined here. */
  alignmentThreshold: { gap: number; dims: number };
  coupleType: {
    id: string;
    name: string;
    tagline: string;
    description: string;
    /**
     * What the couple-type page prints, with near-axis overrides applied.
     * `description` is a different field and stays only as a fallback for a
     * payload written before this existed.
     */
    patterns?: string[];
    nuance: string;
    color: string;
    shade: string;
    /** "What comes naturally". Carries {U} and {P} placeholders. */
    strengths?: string[];
    /** "What's worth being aware of". Same placeholders. */
    stickingPoints?: string[];
    /** "Phrase to try": a title and the words to say. */
    tips?: { title: string; body: string   /** The quoted line, for the nested tile. */
    phraseTry?: string | null;
  }[];
  } | null;
  dimensions: ResultDimension[];
  names: { a: string | null; b: string | null };
  /** The couple map's four quadrants, named and coloured by the server. */
  mapQuadrants?: { code: 'W' | 'X' | 'Y' | 'Z'; name: string; color: string; fill: string }[];
  /**
   * How the storycards are presented: ratio, the opener's stripe, the wordmark
   * and the address. One copy, in api/_lib/storycard-style.js, which the
   * website imports directly.
   */
  storycardStyle?: {
    ratio: number; stripe: string[]; wordmark: string; siteLabel: string;
  };
  /** What the two axes mean, so the map reads as a finding and not a picture. */
  axes?: { id: string; label: string; color: string; desc: string }[];
  /** The small print under the couple map. Ellie's copy, from api/_axes.js. */
  mapCaption?: string[];
  /** Each partner's own placement, in words. Null until that person has one. */
  individualTypes?: {
    a: IndividualProfile | null;
    b: IndividualProfile | null;
  };
};

export type CoupleResults = {
  version: number;
  computedAt: string;
  coupleType: string;
  partners: { a: PersonResults; b: PersonResults };
  gaps: Record<string, number | null>;
  /** Widest gaps first. `label` is the customer-facing dimension name; the app
   *  renders that and never keeps its own map of dimension names. */
  rankedGaps: { dim: string; gap: number; label?: string }[];
  /** Present only when both partners answered Part 2. Never shown to customers. */
  understanding: unknown | null;
  /** Optional so an older cached payload still typechecks. */
  content?: ResultsContent;
};

/**
 * One highlight storycard.
 *
 * Words and numbers from the server, drawn by the app. Every field is
 * optional because the nine cards are genuinely different from each other;
 * `kind` says which shape to draw.
 */
export type HighlightCard = {
  id: string;
  kind: 'opener' | 'couple-type' | 'dimensions' | 'stat-pair' | 'stat-rings'
      | 'admired' | 'named-dimension' | 'quote' | 'sendoff';
  tone: string;
  accent?: string | null;
  eyebrow?: string;
  title?: string;
  lead?: string;
  body?: string | null;
  footer?: string;
  cta?: string;
  names?: { you: string; them: string };
  typeName?: string | null;
  typeLabel?: string;
  stat?: string;
  statLabel?: string;
  /** Stepped by the website's thresholds, from api/_lib/storycard-style.js. */
  statColor?: string;
  value?: string;
  quote?: string;
  /** Colours come with the call-outs: on that card the colour is the meaning. */
  callouts?: { label: string; value: string | null; color?: string; tint?: string; border?: string }[];
  rings?: { label: string; pct: number; color?: string }[];
  rows?: { name: string; admired: string | null }[];
  dimensions?: { key: string; label: string; left: string | null; right: string | null; a: number | null; b: number | null }[];
};

/**
 * The Communication action plan: three tiles, one per domain.
 *
 * From DIM_ACTION_ITEMS and DOMAIN_ALIGNED, resolved against the copy version
 * this couple's results were stamped with.
 */
export type CommsPlan = {
  tiles: {
    domain: string;
    label: string;
    color: string;
    dim: string;
    title: string | null;
    body: string | null;
    /** Only on the hardest domain, matching the website. */
    reflect?: string;
  }[];
  /**
   * The "this week" protocols are not here any more. The app draws them where
   * the website draws them, on What Comes Next, which arrives already grouped.
   * Declaring them here meant the app expected a field it never read.
   */
};

/** One item on the Reflection action plan, with the evidence tier behind it. */
export type ReflectionInsight = {
  title: string;
  body: string | null;
  action: string | null;
  tier: string | null;
};

/** One entry in the results spine. Both fields come from the server. */
export type ResultsSection = { id: string; label: string };

/**
 * The results navigation, two levels, from the server.
 *
 * A group with no children is a page. A group with children is a section whose
 * first child is its overview. Labels are the website's own, so the same
 * screen is called the same thing on both.
 */
/**
 * One entry in the results nav.
 *
 * `glance` marks a "results at a glance" page, which is drawn in a rounded
 * tile rather than full width. `ground` is that page's gradient and
 * `groundStops` is where each colour sits along it, both from
 * api/_lib/section-grounds.js, so the app is not holding a second copy of the
 * website's palette. It held one, and the Communication page was drawn in
 * Conflict's blue for as long as the app has had one.
 */
export type ResultsNavEntry = {
  id: string;
  label: string;
  color?: string;
  glance?: boolean;
  ground?: string[] | null;
  groundStops?: number[] | null;
};

export type ResultsNavGroup = ResultsNavEntry & {
  /** Used in the top row, where the full label will not fit. */
  shortLabel?: string;
  children?: ResultsNavEntry[];
};

/**
 * One expectation, as the two people answered it.
 *
 * `you` and `them` are already resolved to names by the server, which is where
 * the mirror lives: these questions are asked in the first person, so two
 * people answering "Primarily mine" have disagreed. The app never compares
 * these two strings itself.
 */
export type ExpectationRow = {
  key: string;
  kind: 'responsibility' | 'life';
  /**
   * What each of them grew up with, when they said. The website's
   * conversations table has an Expects and an Experienced column per person;
   * these are the second pair, and they were not on the payload at all.
   */
  youExperienced?: string | null;
  themExperienced?: string | null;
  /**
   * "Both of us" never arrives: where the exercise asked what Both meant, the
   * server sends that answer as the value. api/_lib/expectations.js decides.
   */
  category: string;
  item: string;
  prompt?: string | null;
  you: string;
  them: string;
  aligned: boolean;
};

/**
 * Physical Intimacy, as distances rather than answers.
 *
 * The server sends states, distances and copy, and never what either person
 * answered. scripts/check-intimacy-privacy.mjs fails the build if that ever
 * stops being true, so the app has nothing private to mishandle.
 */
export type IntimacyDimension = {
  /** The two ends of the scale, for the track on the dimension page. */
  poles?: [string, string] | string[] | null;
  /** The section id this belongs to, e.g. intimacy-comfort. */
  section: string;
  id: string;
  label: string;
  intro: string | null;
  state: 'aligned' | 'discuss' | 'different' | 'unspoken';
  /** How far apart, as a percentage of the scale. Null when unanswered. */
  distancePct: number | null;
  /**
   * 0 to 100. How close the two of you are, which is the distance inverted.
   * Null when one of you skipped the aspect: unanswered is not nought per
   * cent aligned.
   */
  alignedPct?: number | null;
  /**
   * The two averages, 0 to 1, for the overview row. The website plots each
   * partner on a track per dimension; the app only had the distance between
   * them, which reads as a score rather than as a comparison.
   */
  positions?: { you: number | null; them: number | null };
  /** The gradient the website paints this dimension's page, three stops. */
  ground?: string[];
  body: string | null;
  reason: string;
  prompt: string | null;
  /**
   * Both people's positions on each question in this dimension, 0 to 1.
   *
   * The exercise is sold as "answered independently, compared side by side",
   * and this is that comparison. A question either of them declined carries
   * null on that side and draws no mark, so declining stays invisible rather
   * than becoming its own signal.
   */
  questions?: {
    id: string;
    text: string;
    low: string;
    high: string;
    you: number | null;
    them: number | null;
  }[];
  /**
   * Questions that take more than one answer, with what each of them chose.
   *
   * ── WHY THEY ARE NOT IN `questions` ─────────────────────────────────────
   * Ellie: "can you make sure the what it's for question on physical intimacy
   * is pulling correctly?" It was not pulling at all. `iq_mean_for` asks what
   * physical intimacy is primarily about and takes up to two answers from a
   * list, so it has no position on a scale, so the row builder dropped it. The
   * What It Is For page showed two questions and neither was what it is for.
   *
   * A pair of choices against another pair is two answers to read, not a gap
   * to measure, so it arrives as lists and is drawn as lists.
   */
  picks?: {
    id: string;
    text: string;
    topic: string;
    you: string[];
    them: string[];
  }[];
};

export type IntimacyResults = {
  /** The label above every dimension prompt, from api/_intimacy-results-prose.js. */
  promptLabel?: string;
  /** Why the action plan is still shown when nothing is misaligned. */
  allAlignedNote?: string | null;
  dimensions: IntimacyDimension[];
  /**
   * The at-a-glance page's action plan: three, furthest apart first, aligned
   * dimensions left out. It was `conversations`, a longer list each surface
   * sliced its own way, which is why the site showed four items and the app
   * showed six.
   */
  actionPlan?: IntimacyDimension[];
};

/**
 * Relationship Reflection.
 *
 * Mostly free text, passed through as written. The product of this section is
 * reading what the other person wrote, so nothing here is summarised or
 * scored, and the app renders the words as they were typed.
 */
export type ReflectionRating = {
  key: string;
  question: string;
  /** The shorter name the at-a-glance page prints, from the questions file. */
  short?: string;
  /** How many points the scale has, for the blocks the glance page draws. */
  steps?: number;
  low: string;
  high: string;
  you: { index: number; label: string; pct: number };
  them: { index: number; label: string; pct: number };
  /** How many steps apart on a five-point scale. Not a grade. */
  gapSteps: number;
};

export type ReflectionResults = {
  names: { you: string; them: string };
  /**
   * The at-a-glance page's heading, the line under it, and the names of its
   * two parts. Built by the server, because the website built them inside
   * src/App.jsx and the app opened the same page with a different heading and
   * no line at all.
   */
  overview?: {
    /**
     * The two labels the at-a-glance page prints over its parts. `headline`
     * and `line` were here and are gone: the page is titled from pageTitles
     * like every other glance page, and the line under it said what the
     * ratings below it already said.
     */
    ratingsLabel: string;
    planLabel: string;
  };
  ratings: ReflectionRating[];
  admired: { you: string | null; them: string | null };
  priorities: { you: string[] | null; them: string[] | null };
  written: {
    key: string; question: string; category: string; you: string; them: string;
    /** The question to sit with, under the pair. */
    prompt?: string | null;
  }[];
  /** The headings Side by Side groups under, in the website's order. */
  storyCategories?: string[];
  /** The label over the question under each pair on Side by Side. */
  promptLabel?: string;
  /** Each Reflection page's heading and the line under it, from the server. */
  pages?: Record<string, { title: string; sub?: string; note?: string; eyebrowOwn?: string; aligned?: string }>;
};

/**
 * What Comes Next.
 *
 * Assembled by the server from the sections the reader has already seen, so
 * nothing here is a new claim about the couple. `section` is where each group
 * came from, which is where the app links back to.
 */
export type NextStepGroup = {
  id: string;
  label: string;
  section: string;
  /** The section's own colour, for the card's left edge. */
  color?: string;
  items: { title: string; body: string | null; say: string | null }[];
};

export type ExpectationsSummary = {
  /** What the life questions are called. One string, shared with the site. */
  answered: number;
  aligned: number;
  differences: number;
  categories: {
    /** The section id this bucket belongs to, e.g. exp-convo-2. */
    section: string;
    /** The category's own colour, for the tile's left edge. */
    color?: string | null;
    label: string;
    /** The category's own id, and the paragraph the page opens with. */
    intro?: string | null;
    /** True when the paragraph is written for this pairing rather than general. */
    introIsForPair?: boolean;
    rows: ExpectationRow[];
    answered: number;
    aligned: number;
    differences: number;
  }[];
};

export type ResultsResponse =
  | {
      ready: true;
      cached: boolean;
      results: CoupleResults;
      /**
       * Which sections these results contain, in order, with their names.
       *
       * The app used to build this list itself and reached six sections with
       * labels of its own invention, while the website showed up to
       * twenty-nine. Optional only so a cached response from before this
       * existed still renders.
       */
      sections?: ResultsSection[];
      /** The two-level nav. The app never groups the flat list itself. */
      nav?: ResultsNavGroup[];
      /** The storycards, in the order they are meant to be read. */
      highlights?: HighlightCard[];
      /** The Communication action plan. */
      commsPlan?: CommsPlan | null;
      /**
       * The three Communication domain pages, with the paragraph each opens
       * with and the gradient the website paints it. Top level, beside
       * commsPlan, not inside content: content is what withContent builds and
       * these are assembled by the handler.
       */
      commDomains?: {
        id: string; label: string; color: string; dims: string[];
        prose: string; ground: string[];
      }[];
      /**
       * How the storycards are presented. Top level beside highlights, which
       * is where the handler assembles it; the app read it from content and so
       * ran on its own fallback from the day it was added.
       */
      storycardStyle?: {
        ratio: number; stripe: string[]; wordmark: string; siteLabel: string;
      };
      /** Every Communication question with both answers and both cross-views. */
      commResponses?: {
        id: string; dimension: string; text: string; left: string; right: string;
        you: number | null; them: number | null;
        readOfYou: number | null; readOfThem: number | null;
      }[];
      /** The Reflection action plan. Null unless they own it and both finished. */
      reflectionPlan?: ReflectionInsight[] | null;
      /** What the couple owns, so nothing has to be inferred from the payload. */
      owned?: string[];
      /** Null until both partners have finished Expectations. */
      expectations?: ExpectationsSummary | null;
      /** Null unless they own Physical Intimacy and both have finished it. */
      intimacy?: IntimacyResults | null;
      /** Null unless they own Reflection and both have finished it. */
      reflection?: ReflectionResults | null;
      /** The closing page, assembled from the sections above. */
      whatComesNext?: { groups: NextStepGroup[] } | null;
      /**
       * The heading each page prints at the top of itself, and the strings
       * inside a page both surfaces print. Not the nav's label: the nav says
       * "Results at a glance" under a section heading, which reads correctly
       * there and says nothing at the top of a page. Both surfaces wrote their
       * own and they drifted, so the server sends one.
       */
      pageTitles?: Record<string, string> | null;
      pageCopy?: Record<string, string> | null;
    }
  | {
      ready: false;
      reason: string;
      self: PersonResults | null;
      partnerName?: string | null;
      /**
       * Which owned exercises are still outstanding, and whose they are.
       *
       * From api/_lib/results-gate.js, the one rule that decides this. Sent
       * because this response carries no per-exercise state of its own, so a
       * waiting screen here has nothing else to read.
       */
      waitingOn?: { key: string; label: string; who: 'you' | 'partner' | 'both' }[];
    };

export type HomeCard = {
  id: string;
  kind: string;
  title: string;
  body: string;
  cta: string;
  /** The website route. Kept for the site; the app routes on `app`. */
  deepLink: string;
  /**
   * Where this card goes in the app, decided server-side.
   *
   * `route` is a tab, optionally with the exercise to open. `external` is a
   * website URL for something the app has no screen for. The app used to push
   * deepLink directly, which is a web route the app has no concept of, so every
   * card did nothing at all.
   */
  // `settings` means the card lands on a tab and opens something on it.
  // "Finish setting up your profile" is home plus Settings, because the
  // editor lives there rather than on a route of its own.
  app?: {
    route?: string; exercise?: string; external?: string;
    settings?: boolean; feedback?: boolean;
    /** Open the results at the storycards rather than at the landing menu. */
    results?: boolean;
  };
  /**
   * A card that does something instead of going somewhere.
   *
   * 'nudge' posts to /api/partner-nudge. Generic on purpose: the app runs the
   * named action and does not branch on the card's kind, so another action can
   * be added server-side with one line here.
   */
  action?: string | null;
  disabled?: boolean;
};

/**
 * One unread alert, as the home endpoint sends it.
 *
 * Same shape as a card in the part that matters: a title, a line, and where
 * tapping it goes. That is deliberate, so the home screen routes an alert
 * through the same function it routes a card through.
 */
export type HomeAlert = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  deepLink: string | null;
  app?: HomeCard['app'];
  createdAt: string;
};

/**
 * One exercise, as the server describes it.
 *
 * Carries its own label and order, so no screen keeps a list of what exercises
 * exist. api/_exercises.js is the registry; this is that registry arriving.
 */
export type ExerciseState = {
  key: string;
  label: string;
  order: number;
  owned: boolean;
  mine: boolean;
  theirs: boolean;
  /** Whether the app can ask this exercise. From api/_exercises.js. */
  inApp?: boolean;
  /**
   * Part answered and put down. The column holding a half-finished exercise
   * has existed since the exercises did; nothing read it until someone left
   * one and was shown Start.
   */
  started?: boolean;
  answered?: number;
  total?: number;
  /** The name with room to breathe, for anywhere that is not a table column. */
  fullLabel?: string;
};

/** One purchasable thing, from api/_catalogue.js. Price is whole dollars. */
export type CatalogueItem = {
  /** 'exercise' lives on Insights; 'tool' lives on Resources. From the server. */
  kind?: 'exercise' | 'tool';
  key: string;
  label: string;
  blurb: string;
  price: number;
  /** One word, for the row of circles on Resources. */
  short?: string;
};

export type HomeResponse = {
  /**
   * Whether to offer the way into the admin. Not a permission: the admin still
   * asks for its own secret. See api/_lib/admins.js.
   */
  admin?: boolean;
  /**
   * The home tile's third row: something to return to. Two states, both
   * decided server-side in api/_lib/pick-up.js so the app renders one shape.
   * Null when there is neither a note nor a published post.
   */
  pickUp?: {
    kind: 'resume' | 'discover';
    label: string;
    title: string;
    preview: string | null;
    app?: { route?: string; external?: string };
    deepLink?: string;
  } | null;
  /** One research finding a day, with its citation. From api/_research.js. */
  research?: { id: string; title: string; body: string; source: string };
  /** Flat list of add-on keys this person owns, derived server-side. */
  owned?: string[];
  /** Everything purchasable. Keys match `owned`, so the two intersect directly. */
  catalogue?: CatalogueItem[];
  /** Per-exercise progress for both partners, keyed by exercise key. */
  exercises?: Record<string, ExerciseState>;
  /** The viewer's first name, for labelling their own column. */
  firstName?: string | null;
  /**
   * Both of these are now genuinely returned. They were declared here and never
   * sent, so every screen that used them silently got undefined: the status
   * table said "your partner" instead of a name, and Insights showed exercise
   * progress to couples whose results were ready.
   */
  resultsReady?: boolean;
  partnerName?: string | null;
  greeting: string;
  primary: HomeCard;
  secondary: HomeCard[];
  /**
   * Unread alerts, newest first, at most five. Absent from older payloads,
   * which is why it is optional rather than defaulted server-side.
   */
  alerts?: HomeAlert[];
  badges: { toolbox: number; insights: number; practice: number; notes: number };
  /**
   * The only place readiness is reported. There used to be an optional
   * top-level `resultsReady` declared here too, which the server has never
   * sent: it exists on the internal state object api/home.js passes to the
   * next-action engine, and never on the response. Insights read that phantom
   * field, so it was always undefined and the tab showed exercise progress to
   * couples whose results were ready and waiting.
   */
  state: { resultsReady: boolean; coupleType: string | null; partnerLinked: boolean };
};

// ── Client ─────────────────────────────────────────────────────────────────

/**
 * Where the product lives, for the app.
 *
 * www, not the apex. The apex 307-redirects, and React Native's fetch does not
 * carry the Authorization header across a redirect, so every request arrived
 * with no credentials. api/session.ts carries the longer version of that
 * story.
 *
 * Exported because five files in this app had their own copy of this string:
 * this one, session.ts, and the SITE constant in index, resources and
 * settings. They agreed, which is the only reason nothing broke.
 */
export const SITE_URL = 'https://www.attune-relationships.com';

let baseUrl = SITE_URL;
let getToken: () => Promise<string | null> = async () => null;
/**
 * What a refresh attempt concluded. Three answers, not two: see
 * refreshSession in api/auth.ts. 'unavailable' means we could not find out,
 * which must not be reported to a screen as being signed out.
 */
type RefreshOutcome = 'renewed' | 'signed-out' | 'unavailable';

let refresh: (() => Promise<RefreshOutcome>) | null = null;

/**
 * The refresh currently in flight, if any.
 *
 * Screens load several things at once: Notes asks for notes, tags and home
 * together. When the access token has expired all of those come back 401 at
 * once, and each one used to start its own refresh.
 *
 * Supabase rotates refresh tokens. The first refresh consumes the stored one
 * and returns a new one, so the others arrive holding a token that has already
 * been spent, fail, and report the person as signed out. The session was
 * refreshed successfully and they get bounced to sign-in anyway, which looks
 * exactly like an expiry that keeps happening for no reason.
 *
 * One refresh at a time. Everyone waiting on it gets the same answer.
 */
let refreshInFlight: Promise<RefreshOutcome> | null = null;

function refreshOnce(): Promise<RefreshOutcome> {
  if (!refresh) return Promise.resolve('signed-out');
  if (!refreshInFlight) {
    refreshInFlight = refresh().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

/**
 * Called once at startup. Keeps auth out of every call site.
 *
 * `refresh` is injected rather than imported. auth.ts already imports from
 * session.ts, and session.ts imports from here, so reaching back for it
 * directly would close a require cycle. The root layout owns both and hands it
 * in, which is also what makes it easy to leave out in a test.
 */
export function configureApi(opts: {
  baseUrl?: string;
  getToken: () => Promise<string | null>;
  refresh?: () => Promise<RefreshOutcome>;
}) {
  if (opts.baseUrl) baseUrl = opts.baseUrl.replace(/\/$/, '');
  getToken = opts.getToken;
  refresh = opts.refresh ?? null;
  refreshInFlight = null;
}

async function request<T>(path: string, init: RequestInit = {}, retrying = false): Promise<ApiResult<T>> {
  let token = await getToken();
  if (!token && !retrying) {
    // No access token is not the same as no session. The refresh token lives
    // in its own keychain entry, and SecureStore writes can fail
    // independently: setToken swallows a failed write and keeps the access
    // token in memory only, so killing the app can leave a valid refresh
    // token beside no access token at all.
    //
    // This returned unauthorized without ever trying, so the person was sent
    // to sign in while holding everything needed to continue. The 401 path
    // below has always refreshed; the empty path never did, which is the
    // harder case to notice because it needs no server round trip to fail.
    if (await refreshOnce() === 'renewed') token = await getToken();
  }
  if (!token) return { ok: false, error: { kind: 'unauthorized', detail: 'no token stored' } };

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
    });
  } catch {
    // No connection, DNS failure, or the request was cut off. Distinguished
    // from a server error because the screen's response differs: offline is
    // "show what we cached", a 500 is "something is wrong".
    return { ok: false, error: { kind: 'offline' } };
  }

  if (res.status === 401) {
    // A Supabase access token lasts about an hour, so this fires constantly in
    // normal use. refreshSession existed and was never called from anywhere,
    // which meant every session died after an hour and the only way back was
    // typing a password again.
    //
    // Once per request. If the refresh works the original call is replayed with
    // the new token; if it does not, this is genuinely signed out and the
    // screen should say so.
    if (!retrying && refresh) {
      // Shared, so several requests failing together cause one refresh rather
      // than a race where all but the first spend an already-used token.
      const outcome = await refreshOnce();
      if (outcome === 'renewed') return request<T>(path, init, true);
      /**
       * The refresh could not be carried out, which is not the same as the
       * session being over: a locked keychain, no connection, or Supabase
       * having a bad minute all land here.
       *
       * Reported as offline, because that is what every screen already does
       * the right thing with: keep the last good payload and say so. Reporting
       * it as unauthorized is what put a sign-in screen in front of Ellie on a
       * session that was fine, twice.
       */
      if (outcome === 'unavailable') return { ok: false, error: { kind: 'offline' } };
    }
    // Read the body: the endpoint distinguishes a missing token from an
    // invalid one, and those need different fixes.
    let detail = 'server returned 401';
    try { const b = await res.json(); if (b?.error) detail = String(b.error); } catch { /* no body */ }
    return { ok: false, error: { kind: 'unauthorized', detail } };
  }
  if (res.status === 404) {
    // The body is read here too. Every endpoint answers 404 for a signed-in
    // person with no profile row, and without the message that is
    // indistinguishable from a missing page, which is what the screen said.
    let detail;
    try { const b = await res.json(); if (b?.error) detail = String(b.error); } catch { /* no body */ }
    return { ok: false, error: { kind: 'not_found', detail } };
  }
  if (!res.ok) {
    // Read the body here too. It was read for 401 and thrown away for every
    // other failure, so a 500 arrived as a bare status with the server's own
    // explanation discarded. That is the exact moment the explanation matters.
    let message;
    try { const b = await res.json(); if (b?.error) message = String(b.error); } catch { /* no body */ }
    return { ok: false, error: { kind: 'server', status: res.status, message } };
  }

  try {
    const body = await res.json();
    if (body?.ok === false) {
      return { ok: false, error: { kind: 'server', status: res.status, message: body.error } };
    }
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, error: { kind: 'server', status: res.status, message: 'bad json' } };
  }
}

/** The landing screen, in one call. */
export function fetchHome() {
  /**
   * The reader's clock goes with the request.
   *
   * /api/home runs on the edge, where the server's clock is UTC, so the
   * greeting was picking the hour of a machine nobody lives on: noon in
   * Mountain Time is 18:00 UTC, which reads as "Good evening". The device
   * is the only thing that knows what time it is where the reader is, so it
   * says so. getTimezoneOffset() is minutes to add to local to reach UTC.
   */
  const tzOffset = new Date().getTimezoneOffset();
  return request<HomeResponse & { ok: true }>(`/api/home?tzOffset=${tzOffset}`);
}

/**
 * The couple's results. Server-computed and cached, so this is cheap to call
 * on every open. Not-ready is a success, not an error: one partner has simply
 * not finished, and the screen should say so rather than showing a failure.
 */
export function fetchResults() {
  return request<ResultsResponse & { ok: true }>('/api/results');
}

// ── The rest of the surface ────────────────────────────────────────────────
// Added once the endpoints existed. Same discipline: one function per
// endpoint, an explicit shape, and no fetch outside this file.

export type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  deep_link: string | null;
  subject_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type PostSummary = {
  id: string;
  title: string;
  subtitle: string | null;
  /** One of the four shelves, or null for uncategorised. */
  category: string | null;
  dimension_keys: string[];
  read_minutes: number | null;
  hero_color: string | null;
  /** An illustration for the card, when the post has one. */
  hero_image?: string | null;
  /** Search terms the server built from the title, shelf, tags and keywords. */
  search?: string;
  published_at: string;
  revision: number;
  read: boolean;
  /** On this reader's list. */
  saved?: boolean;
  /** The post changed since they read it, so it is worth resurfacing. */
  revised: boolean;
  /**
   * How many people have read it. The Featured sort's first key, counted by
   * the server: popularity is not something anyone types.
   */
  reads?: number;
  /**
   * Set when this is one of the website's In Practice pages rather than a row
   * in the posts table. The app opens it there and does not try to record a
   * read against an id the table has never heard of.
   */
  external?: string | null;
};

export type PostBlock = {
  id: string;
  type: 'paragraph' | 'heading' | 'quote' | 'list' | 'prompt';
  text: string;
  /**
   * The line above a tile: a callout's own label, or a numbered step's number
   * and title. Only the website's In Practice articles carry one, because only
   * their pages draw the shape.
   */
  label?: string | null;
  /** The work a research claim comes from, cited as the page cites it. */
  source?: string | null;
};

export type Post = PostSummary & { blocks: PostBlock[] };

/**
 * Put a post on this reader's list, or take it off.
 *
 * Answers with the state the reader should now see, so the screen never has to
 * work out what a second tap meant.
 */
export async function savePost(id: string, saved: boolean) {
  return request<{ ok: true; saved: boolean }>('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: saved ? 'save' : 'unsave', id }),
  });
}

export type Note = {
  id: string;
  /** Whose note it is. Present on every row, and the only way to tell a note
   *  the partner shared from one of your own once they are on the same screen. */
  owner_id: string;
  title: string | null;
  body: string;
  visibility: 'private' | 'shared';
  anchor_type: string | null;
  anchor_key: string | null;
  /** The wording of the anchored thing when the note was written. */
  anchor_context: string | null;
  /** RESULTS_VERSION at the time, so the app can tell that results have been
   *  recomputed since. Null on notes written before a version was recorded. */
  anchor_version: number | null;
  /** Tag ids on this note. Empty when it has none. */
  tagIds?: string[];
  /**
   * What kind of mark this is. A highlight and an underline carry a colour and
   * usually no body; a note carries words. All three anchor the same way, which
   * is why they are one table and not three.
   */
  kind?: 'note' | 'highlight' | 'underline';
  /** The palette key, from api/_lib/annotations.js. Null on a plain note. */
  color?: string | null;
  /** When the partner this was shared with first opened it. Null means unread. */
  opened_at?: string | null;
  created_at: string;
  updated_at: string;
};

/** In Practice feed. Drafts and scheduled posts are filtered server-side. */
/** The feed, plus the shelves it can be filtered by. */
export function fetchPosts() {
  return request<{ ok: true; posts: PostSummary[]; categories: string[] }>(
    '/api/posts?action=feed');
}

export function fetchPost(id: string) {
  return request<{ ok: true; post: Post }>(`/api/posts?action=post&id=${encodeURIComponent(id)}`);
}

export function markPostRead(id: string) {
  return request<{ ok: true; revision: number }>('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'read', id }),
  });
}

/**
 * Notes, annotations, and what the partner shared.
 *
 * Three lists rather than one: annotations are grouped by what they attach to,
 * and shared notes are read-only, so a screen that merged them would have to
 * pull them apart again.
 */
export function fetchNotes() {
  return request<{ ok: true; notes: Note[]; annotations: Note[]; sharedWithMe: Note[] }>(
    '/api/notes?action=list');
}

export type Tag = {
  id: string;
  name: string;
  color: string | null;
  /** 'dim:conflict', 'expcat:finances', 'intdim:frequency'. Null on a tag the
   *  person made themselves. This is what lets the app label an annotation's
   *  anchor without keeping its own copy of the dimension list. */
  standard_key: string | null;
  /** In the bin since this moment. Absent or null means live. */
  deleted_at?: string | null;
};

/**
 * Tags, and the reference data the notes screen needs alongside them.
 *
 * `tags` is the person's own list and starts empty. It used to arrive with
 * twenty-one seeded into it, which is what Ellie asked to be rid of.
 *
 * `standard` is what those seeded rows were actually for: the product's names
 * for the things a note can be attached to, so an annotation anchored to
 * `dim:conflict` can be read as "Conflict Style". Reference data, not tags.
 *
 * `sections` maps a results section id to its heading. It comes from the server
 * because five of those ids are generated from the expectations categories and
 * six from the intimacy dimensions, so a copy in the app goes stale the moment
 * either list changes.
 *
 * `suggestions` is the line under the add field.
 */
export function fetchTags() {
  return request<{
    ok: true;
    tags: Tag[];
    standard?: { standard_key: string; name: string; color: string | null }[];
    suggestions?: string[];
    /** What the add field says when it is empty. Built from `suggestions`. */
    tagPlaceholder?: string;
    sections?: Record<string, string>;
  }>('/api/notes?action=tags');
}

export function createNote(input: {
  body: string; title?: string; visibility?: 'private' | 'shared';
  anchorType?: string; anchorKey?: string; anchorContext?: string; anchorVersion?: number;
  /** Tags to attach. The server accepted these all along; nothing sent them. */
  tagIds?: string[];
  /**
   * What is being left on the text. The server validates kind and colour
   * together: a plain note takes no colour, a highlight or underline requires
   * one, and a colour the product does not offer is refused rather than
   * quietly becoming the default.
   */
  kind?: 'note' | 'highlight' | 'underline';
  color?: string | null;
}) {
  return request<{ ok: true; note: Note }>('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create', ...input }),
  });
}

/**
 * Edit your own note. The server filters on owner, so someone else's note
 * matches nothing rather than erroring in a way that confirms it exists.
 */
export function updateNote(input: {
  id: string; title?: string | null; body?: string;
  /** The full set of tags the note should end up with. Omit to leave them. */
  tagIds?: string[];
  /** Recolour a mark, or turn a highlight into an underline. Send both or
   *  neither: the server refuses one without the other, because a highlight
   *  with no colour cannot be drawn. */
  kind?: 'note' | 'highlight' | 'underline';
  color?: string | null;
}) {
  return request<{ ok: true; note: Note }>('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', ...input }),
  });
}

/**
 * Show a note to the partner, or stop.
 *
 * Separate from updateNote because it is a different decision with different
 * consequences, and folding it into a general save is how a note gets shared
 * by someone who only meant to fix a typo.
 */
export function shareNote(id: string, visibility: 'private' | 'shared') {
  return request<{ ok: true; note: Note }>('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'share', id, visibility }),
  });
}

/**
 * Mark a note your PARTNER shared with you as seen.
 *
 * The one write on this endpoint that touches a row you do not own, which is
 * the point: the reader is not the author. The server allows exactly one
 * column through, and check-note-open.mjs keeps the filter narrow.
 */
/**
 * A tag of the reader's own.
 *
 * Returns the existing tag when the name is already taken, rather than an
 * error: "I want a tag called Money" is satisfied either way, and arguing
 * about bookkeeping is not the product's job.
 */
export function createTag(name: string, color?: string | null) {
  return request<{ ok: true; tag: Tag }>('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'createTag', name, color: color ?? null }),
  });
}

/**
 * The two tools' saved state, from /api/tool-data.
 *
 * The website writes these columns straight from the browser with the user's
 * own Supabase session. The app has no Supabase client, so it goes through an
 * endpoint like everything else it saves.
 */
export type BudgetState = {
  incomes?: Record<string, string>;
  pooling?: string;
  expenses?: Record<string, string>;
  personal?: Record<string, string>;
  goals?: { id?: string; name?: string; target?: string; months?: string }[];
};

export type BudgetCategoryPayload = {
  id: string; label: string; icon?: string; group: string; items: string[];
};

export type BudgetCopy = {
  title: string; intro: string; step1: string; step1Intro: string;
  incomeLabel: string; poolingLabel: string;
  essentials: string; essentialsIntro: string;
  discretionary: string; discretionaryIntro: string;
  personalLabel: string; goals: string; goalsIntro: string; save: string;
};

export type ChecklistCopy = {
  title: string; intro: string; howItWorks: string;
  progress: string; notApplicable: string; areaDone: string;
};

export type ChecklistItem = { text: string; description?: string; links?: { label: string; href: string }[] };
export type ChecklistArea = {
  id: string; label: string; icon?: string; color: string; items: ChecklistItem[];
};

export type ToolData = {
  ok: true;
  owned: string[];
  /** The checklist's own content, from api/_checklist.js. Null when unowned. */
  areas: ChecklistArea[] | null;
  /** The page's own words, from api/_checklist.js. Null when unowned. */
  copy: ChecklistCopy | null;
  /** Each key is `${area.id}__${item.text}`. Absent means not started. */
  checklist: Record<string, true | 'na'> | null;
  budget: BudgetState | null;
  /**
   * The names the budget is keyed by, in the form the website wrote them.
   * Not firstName: a budget stores { [name]: amount }, so a shortened name
   * reads as a different person's column.
   */
  budgetNames: { you: string; them: string };
  /**
   * The workbook is a generated file, not a screen. Null when unowned; url is
   * null while it is still being made.
   */
  workbook: {
    url: string | null;
    fileName: string;
    copy: { ready: string; generating: string };
  } | null;
  /** The budget's content and words. Null when unowned. */
  budgetCategories: BudgetCategoryPayload[] | null;
  poolingModels: { id: string; label: string; desc: string }[] | null;
  budgetCopy: BudgetCopy | null;
};

export type ProfileSetupCopy = {
  title: string; why: string;
  yourName: string; yourNamePlaceholder: string;
  partnerName: string; partnerNamePlaceholder: string;
  partnerEmailPlaceholder: string;
};

/**
 * The five demographic questions, as the server sends them.
 *
 * Asked at signup on the website and, until now, nowhere in the app. Every
 * person who buys online and sets up in the app answered none of them, and
 * the admin's Demographics page is built on exactly these columns.
 *
 * `options` is [value, label]; the first is always the empty "Prefer not to
 * say", which is the answer someone gives by not choosing.
 */
export type AboutYou = {
  title: string;
  why: string;
  fields: { key: string; label: string; options: [string, string][] }[];
};

/**
 * Profile setup's labels.
 *
 * Unauthenticated on purpose: the app asks for these exactly when it has been
 * told it has no profile, so nothing else it can call will answer.
 */
export function fetchProfileSetupCopy() {
  return request<{ ok: true; copy: ProfileSetupCopy; aboutYou: AboutYou }>(
    '/api/create-profile', { method: 'GET' });
}

/**
 * Create this account's profile.
 *
 * No userId: the request carries a token and the server takes the id from it.
 * Creating a profile is not the same as editing one; the server refuses if a
 * row already exists.
 */
export function createProfile(input: {
  name: string; partnerName: string; partnerEmail?: string;
  pronouns?: string; partnerPronouns?: string;
  // The five from AboutYou. Keys match what /api/create-profile already
  // accepted long before anything sent them.
  ageRange?: string; relationshipStatus?: string; relationshipLength?: string;
  children?: string; signupSource?: string;
}) {
  return request<{ ok: true; created?: boolean; existed?: boolean }>('/api/create-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

/**
 * Edit the parts of a profile a person owns.
 *
 * The website writes to profiles directly through row-level security. The app
 * has no Supabase client and should not have one, so this is its only way, and
 * api/update-profile.js holds the whitelist of what may change.
 *
 * Send only what changed. A field absent from the body is left alone, which is
 * what lets one screen save a name without touching five demographic answers
 * it happens to be displaying.
 */
/** The editable fields as they stand, with the five questions to draw. */
export type EditableProfile = {
  name: string | null; pronouns: string | null;
  partnerName: string | null; partnerPronouns: string | null;
  ageRange: string | null; relationshipStatus: string | null;
  relationshipLength: string | null; children: string | null; signupSource: string | null;
};

export function fetchEditableProfile() {
  return request<{ ok: true; profile: EditableProfile; aboutYou: AboutYou }>('/api/update-profile');
}

export function updateProfile(input: {
  name?: string; pronouns?: string;
  partnerName?: string; partnerPronouns?: string;
  ageRange?: string; relationshipStatus?: string; relationshipLength?: string;
  children?: string; signupSource?: string;
}) {
  return request<{ ok: true; updated: Record<string, string | null> }>('/api/update-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

/** The feedback questions, as the server sends them. */
export type FeedbackForm = {
  copy: {
    title: string; cta: string; reassurance: string; scaleHeading: string;
    submit: string; submitting: string; privacy: string; thanks: string;
  };
  scale: string[];
  questions: { id: string; type: 'scale' | 'choice' | 'text'; label: string; options?: string[] }[];
};

/**
 * The questions Attune asks about itself.
 *
 * Unauthenticated, like the profile setup copy: it is seven question labels,
 * and the screen that asks them should not need a session to draw itself.
 */
export function fetchFeedbackForm() {
  return request<{ ok: true } & FeedbackForm>('/api/send-feedback');
}

/**
 * Send one set of answers.
 *
 * `source` is 'app_experience', which is what /api/get-feedback and the
 * admin's Feedback Overview already filter on. Nothing identifying is sent:
 * the endpoint has never taken a name or an email and this does not start.
 */
export function sendFeedback(input: {
  rating?: number | null;
  questionAnswers: Record<string, string | number>;
  message?: string | null;
  stage?: string | null;
  howHeard?: string | null;
}) {
  return request<{ ok: true }>('/api/send-feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'app_experience', ...input }),
  });
}

export function fetchToolData() {
  return request<ToolData>('/api/tool-data');
}

/**
 * Last write wins, which is what the website has always done.
 *
 * Returns the result rather than a boolean so a screen can tell a refused
 * write (not in your package) from a failed one, and say the right thing.
 */
export function saveToolData(tool: 'checklist' | 'budget', data: unknown) {
  return request<{ ok: true }>('/api/tool-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, data }),
  });
}

export function openSharedNote(id: string) {
  return request<{ ok: true; opened: number }>('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'open', id }),
  });
}

export function deleteNote(id: string) {
  return request<{ ok: true; deleted: number }>('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id }),
  });
}

/**
 * Delete this account, permanently.
 *
 * The user id is not passed in from a screen. The endpoint requires it and
 * checks it against the token, so it is read from the token here rather than
 * letting a caller hand in an id: a screen that can name the account it deletes
 * is a screen that can be made to name the wrong one.
 */
export async function deleteAccount(password?: string): Promise<ApiResult<{ ok: true }>> {
  const token = await getToken();
  if (!token) return { ok: false, error: { kind: 'unauthorized', detail: 'no token stored' } };

  // The subject claim of the JWT is the Supabase user id. Decoded rather than
  // fetched so deletion needs one round trip, not two.
  let userId: string | null = null;
  try {
    const payload = token.split('.')[1];
    const pad = payload.length % 4 ? '='.repeat(4 - (payload.length % 4)) : '';
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/') + pad);
    userId = JSON.parse(json)?.sub ?? null;
  } catch {
    userId = null;
  }
  if (!userId) return { ok: false, error: { kind: 'unauthorized', detail: 'token has no subject' } };

  return request<{ ok: true }>('/api/delete-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // The password is only sent when one was typed. An account created with
    // Google or Apple has none, and the server asks for one only when the
    // account has a password identity.
    body: JSON.stringify(password ? { userId, password } : { userId }),
  });
}

/**
 * How long a screen was open.
 *
 * The same measure the website sends from public/_track.js, under the same
 * keys: 'app:<view>', where the view names come from api/_exercises.js. So
 * "average time per exercise" is one calculation over both surfaces rather
 * than two that can disagree.
 *
 * Nothing identifying is sent. The endpoint takes the profile id from the
 * token, never from the body, and stores no device or session id, so two
 * events from the same person cannot be joined to each other.
 *
 * Failures are ignored on purpose: a measurement that interrupts the thing it
 * is measuring is worse than a gap in the measurement.
 */
export async function trackScreenTime(view: string, ms: number): Promise<void> {
  if (!view || !Number.isFinite(ms) || ms < 1000) return;
  try {
    const token = await getToken();
    await fetch(`${baseUrl}/api/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      // surface tells the Engagement page this came from iOS rather than the
      // portal, which files the same keys. It says nothing about the person.
      body: JSON.stringify({ kind: 'page_time', key: `app:${view}`, ms: Math.round(ms), surface: 'app' }),
    });
  } catch { /* a missed measurement is not worth a word to anyone */ }
}

export function fetchNotifications() {
  return request<{ ok: true; notifications: Notification[]; unread: number }>('/api/notifications');
}

/**
 * Tell a partner you are waiting on them.
 *
 * `sent: false` with reason 'cooldown' is a success: they nudged recently and
 * the server is declining to send a second one. The card greys itself out on
 * the same rule, so this is the case where two clients disagreed about the
 * date.
 */
export function nudgePartner() {
  return request<{ ok: true; sent: boolean; reason?: string; nudgedAt?: string }>('/api/partner-nudge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

/**
 * Put a tag in the bin, take it out again, or remove it for good.
 *
 * Two deaths on purpose: Ellie asked for a greyed row where deleted tags live
 * and a second, permanent delete from there that says it cannot be undone.
 */
/**
 * Build this couple's workbook now.
 *
 * Only for the reader's own couple: the endpoint takes the person from the
 * token and refuses a request that names anyone else. Slow by nature, because
 * it generates a document and uploads it, so the screen that calls it says so.
 */
export function buildWorkbook() {
  return request<{ ok: true; url: string | null; filename: string }>('/api/store-workbook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

export function deleteTag(id: string) {
  return request<{ ok: true; tag: Tag }>('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'deleteTag', id }),
  });
}

/**
 * Take a tag back out of the archive.
 *
 * The server has had `restoreTag` since tags could be deleted at all, and
 * nothing had ever called it: the app offered the bin and the permanent
 * delete and no way back, which made "archive" a word for a waiting room.
 * Ellie asked for an archive folder, and an archive you cannot take anything
 * out of is a bin with a longer name.
 */
export function restoreTag(id: string) {
  return request<{ ok: true; tag: Tag }>('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'restoreTag', id }),
  });
}

export function purgeTag(id: string) {
  return request<{ ok: true; deleted: number }>('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'purgeTag', id }),
  });
}

export function markNotificationRead(id?: string) {
  return request<{ ok: true; marked: number }>('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(id ? { action: 'read', id } : { action: 'read', all: true }),
  });
}


// ── Exercises ──────────────────────────────────────────────────────────────

export type QuestionItem = {
  id: string;
  /** Where the answer is stored. Part two stores under pv_<id>. */
  answerKey: string;
  dimension?: string;
  text: string;
  a: string;
  b: string;
  isPV?: boolean;
  /** The divider between answering about yourself and about your partner. */
  __partBreak?: boolean;
};

export type ExpectationsSet = {
  saved: SavedAnswers;
  exercise: { key: string; label: string; fullLabel?: string; shape: 'answers' | 'record'; view: string };
  /** The screen that opens this exercise, from api/_lib/exercise-intro.js. */
  intro?: { title: string; body: string[]; note?: string | null; cta: string } | null;
  /** The screen that closes it, from api/_lib/exercise-complete.js. */
  complete?: { title: string; body: string[]; cta: string } | null;
  names: { you: string; partner: string };
  childhoodStructures: { id: string; label: string; cols: string[] }[];
  /** `key` is the raw item text and is what the answer is stored under. `label`
   *  is the same text with names substituted, and is what a person reads. They
   *  differ because two partners substitute different names into one item. */
  categories: {
    id: string;
    label: string;
    /** The line under the category name, saying what to do on this page. */
    intro: string;
    /** Whether this category asks the growing-up row. Extended Family does not. */
    asksChildhood: boolean;
    items: { key: string; label: string }[];
  }[];
  futureCols: string[];
  futureColsDisplay: string[];
  futureDetailOpts: string[];
  /** The screen between part one and part two. */
  partTwo: string;
  /** What part one is called, so its counter can say which part you are in. */
  lifeLabel: string;
  /** The headings over the two rows of buttons, from the server. */
  growingUpLabel: string;
  futureLabel: string;
  /** What is asked once someone answers Both, and the same prompt once it is
   *  the thing holding the page up. */
  bothDetailLabel: string;
  bothDetailRequiredLabel: string;
  lifeQuestions: { id: string; topic: string; text: string; options: string[] }[];
};

/** Where this person got to last time, if anywhere. */
export type SavedAnswers = {
  answers: Record<string, unknown>;
  completedAt: string | null;
  /** Only on flat exercises: whether these are submitted answers or a partial. */
  complete?: boolean;
} | null;

export type QuestionSet = {
  saved: SavedAnswers;
  exercise: { key: string; label: string; fullLabel?: string; shape: 'answers' | 'record'; view: string };
  /** The screen that opens this exercise, from api/_lib/exercise-intro.js. */
  intro?: { title: string; body: string[]; note?: string | null; cta: string } | null;
  /** The screen that closes it, from api/_lib/exercise-complete.js. */
  complete?: { title: string; body: string[]; cta: string } | null;
  scale: { val: number; label: string }[];
  items: QuestionItem[];
  /** Every key a finished set contains, so the app never counts items itself. */
  expectedKeys: string[];
};

/**
 * The questions for one exercise.
 *
 * The app holds no question text of its own. A reworded question in two places
 * means two people answering different questions and being scored as though
 * they answered the same one.
 */
export function fetchQuestions(exercise: string) {
  return request<QuestionSet & { ok: true }>(
    `/api/questions?exercise=${encodeURIComponent(exercise)}`);
}

/**
 * Relationship Reflection: four kinds of question in one exercise.
 *
 * `type` says which. The app renders what an item says it is rather than
 * keeping a map of which id is which shape, so a new question of an existing
 * kind needs no app change.
 */
export type ReflectionQuestionSet = {
  saved: SavedAnswers;
  exercise: { key: string; label: string; fullLabel?: string; shape: 'answers' | 'record'; view: string };
  /** The screen that opens this exercise, from api/_lib/exercise-intro.js. */
  intro?: { title: string; body: string[]; note?: string | null; cta: string } | null;
  /** The screen that closes it, from api/_lib/exercise-complete.js. */
  complete?: { title: string; body: string[]; cta: string } | null;
  version: number;
  items: {
    id: string;
    type: 'scale' | 'text' | 'pick' | 'rank';
    category: string;
    text: string;
    /** Scales only. Answers are stored as the index into this list. */
    scaleLabels?: string[];
    /** Pick and rank only. */
    options?: string[];
    placeholder?: string;
  }[];
  /** Which ids must be answered. The app never decides this. */
  requiredIds: string[];
};

/**
 * Physical Intimacy.
 *
 * `variant` is resolved by the server from the profile, so both partners are
 * always asked the same wording. Every question carries its own "Prefer not to
 * say" option with a null value: declining is a real answer, stored and scored
 * differently from an unanswered one.
 */
export type IntimacyQuestionSet = {
  saved: SavedAnswers;
  exercise: { key: string; label: string; fullLabel?: string; shape: 'answers' | 'record'; view: string };
  /** The screen that opens this exercise, from api/_lib/exercise-intro.js. */
  intro?: { title: string; body: string[]; note?: string | null; cta: string } | null;
  /** The screen that closes it, from api/_lib/exercise-complete.js. */
  complete?: { title: string; body: string[]; cta: string } | null;
  /**
   * Which wording this couple is asked, or null when neither partner has
   * answered the framing question yet. The variant is the couple's own answer,
   * stored in the exercise's record: api/_lib/intimacy-framing.js.
   */
  variant: 'premarital' | 'married' | null;
  /** The framing question, sent only while it is still unanswered. */
  framing?: {
    eyebrow: string;
    title: string;
    note: string;
    options: { variant: 'premarital' | 'married'; label: string; sub: string }[];
  } | null;
  dimensions: { id: string; label: string }[];
  items: {
    id: string;
    dimension: string;
    kind: 'scale' | 'selfref' | 'multi';
    topic: string;
    text: string;
    /** Both wordings, so answering the framing question needs no second fetch. */
    texts?: { premarital: string; married: string };
    options: {
      label: string;
      value: string | number | null;
      labels?: { premarital: string; married: string };
    }[];
  }[];
  requiredIds: string[];
};

/**
 * Questions for any exercise whose payload shape the caller knows.
 *
 * One reader rather than one per exercise. /api/questions answers 501 with
 * notYetInApp for an exercise the app cannot ask, which arrives here as a
 * normal error rather than a crash.
 */
export function fetchExerciseQuestions<T>(exercise: string) {
  return request<T & { ok: true }>(
    `/api/questions?exercise=${encodeURIComponent(exercise)}`);
}

/**
 * What the website's workbook page needs to draw this couple's workbook.
 *
 * The app does not build a workbook or a PDF: it opens the page the website
 * renders, with the payload that page takes. See api/workbook-view.js.
 */
export type WorkbookView = {
  p1: string;
  p2: string;
  ct: string;
  ctTagline: string;
  ctColor: string;
  scores: Record<string, number>;
  partnerScores: Record<string, number>;
  expGaps: unknown[];
};

export async function fetchWorkbookView() {
  /**
   * The payload is unwrapped here rather than at the call site.
   *
   * `request` hands back the whole response body as `data`, so the endpoint's
   * own `data` field sits one level further in than it looks. Reading
   * `view.data.p1` therefore gave undefined, and the workbook page fell back
   * to its placeholders: the cover read "Partner A & Partner B" with a screen
   * full of correct data sitting one key away.
   */
  const res = await request<{ ok: true; data: WorkbookView }>('/api/workbook-view');
  if (!res.ok) return res;
  return { ok: true as const, data: res.data.data };
}

/** Expectations. A different shape from ex1, so it gets its own reader. */
export function fetchExpectations() {
  return request<ExpectationsSet & { ok: true }>('/api/questions?exercise=ex2');
}

/**
 * Save answers for an exercise.
 *
 * The user id is read from the token rather than passed in, for the same reason
 * deleteAccount does it: a screen that can name the account it writes to is a
 * screen that can be made to name the wrong one. The server checks it against
 * the token regardless.
 *
 * `completedAt` marks a finished set. Exercises that store a bare answers
 * object are done when they have keys; record-shaped ones are done only when
 * completedAt is set, which is why partial saves must leave it off.
 */
export async function saveExercise(input: {
  exercise: string;
  answers: Record<string, unknown>;
  completed?: boolean;
  /**
   * How the server stores this exercise, from /api/questions.
   *
   * 'answers' writes the object straight into <exercise>_answers and sets the
   * completed columns. 'record' writes the whole { answers, completedAt }
   * record into one column instead, which is what intimacy_data and
   * conflict_data hold.
   *
   * This matters more than it looks. Sending a record-shaped exercise the
   * flat way writes conflict_data with no completedAt, and a record-shaped
   * exercise is only done when completedAt is set, so it would save
   * successfully and never count as finished.
   */
  shape?: 'answers' | 'record';
  /**
   * Anything else that belongs in a record-shaped exercise's stored object.
   *
   * Physical Intimacy keeps the couple's framing answer here, which is where
   * the website has always kept it: the second partner inherits it, so it has
   * to live with the answers rather than on a profile.
   */
  record?: Record<string, unknown>;
}): Promise<ApiResult<{ ok: true }>> {
  const token = await getToken();
  if (!token) return { ok: false, error: { kind: 'unauthorized', detail: 'no token stored' } };

  let userId: string | null = null;
  try {
    const payload = token.split('.')[1];
    const pad = payload.length % 4 ? '='.repeat(4 - (payload.length % 4)) : '';
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/') + pad);
    userId = JSON.parse(json)?.sub ?? null;
  } catch {
    userId = null;
  }
  if (!userId) return { ok: false, error: { kind: 'unauthorized', detail: 'token has no subject' } };

  const completedAt = input.completed ? new Date().toISOString() : undefined;

  // A record-shaped exercise carries its own completedAt inside the record,
  // because the whole record lands in one column and there is nowhere else for
  // it to go.
  const payload = input.shape === 'record'
    ? { answers: input.answers, ...(input.record || {}), ...(completedAt ? { completedAt } : {}) }
    : input.answers;

  return request<{ ok: true }>('/api/save-exercise', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      exercise: input.exercise,
      answers: payload,
      ...(completedAt ? { completedAt } : {}),
      // Without this a partial save writes the answers column and sets the
      // completed flag, marking an exercise done that someone is halfway
      // through.
      ...(input.completed ? {} : { progress: true }),
    }),
  });
}

// ── Conflict Patterns ──────────────────────────────────────────────────────

/** One pattern, for the person reading. Never sent for the partner. */
export type ConflictPattern = {
  id: string;
  key: 'criticism' | 'contempt' | 'defensiveness' | 'stonewalling' | string;
  value: number | null;
  band: 'not_present' | 'occasional' | 'worth_watching' | 'worth_attention' | null;
};

/**
 * The three forced-A/B answers, as the letters the exercise stores.
 *
 * Typed as `number` for as long as this type existed, which is why the app
 * printed the wrong half of every one of them: the exercise stores 'A' or 'B'
 * and chipText compared the value to 0. Declaring the wrong type is worse than
 * declaring none, because tsc then enforces the mistake.
 */
export type ConflictOpenings = {
  start: string | null; middle: string | null; oldTopics: string | null;
};

export type ConflictSummary = {
  overall: number | null;
  patterns: ConflictPattern[];
  ranked: ConflictPattern[];
  flagged: string[];
  flaggedCount: number;
  strength: string | null;
  repairRanking: string[];
  openings: ConflictOpenings;
  reflection: string | null;
  appreciation: string | null;
};

/**
 * The partner's half. Deliberately has no pattern fields, and this type says so
 * rather than reusing ConflictSummary with everything marked optional: a type
 * that admits patterns is a type a screen can try to render.
 */
export type ConflictPartnerView = {
  name: string | null;
  overall: number | null;
  repairRanking: string[];
  openings: ConflictOpenings;
  strength: string | null;
  reflection: string | null;
  appreciation: string | null;
};

export type ConflictResults =
  | { ready: false; reason: string }
  | {
      ready: true;
      names: { you: string; partner: string };
      you: ConflictSummary;
      partner: ConflictPartnerView | null;
      partnerFinished: boolean;
      content: {
        /**
         * Per pattern: its label, its one-line definition, and a note per
         * frequency band. The definition was typed as part of the band map,
         * so the app could not read it and drew a pattern's name with nothing
         * saying what the pattern is.
         */
        patternCopy: Record<string, {
          label?: string;
          definition?: string;
          [band: string]: { note: string } | string | undefined;
        }>;
        patternActions: Record<string, { title: string; body: string }>;
        /** The awareness note a rare pattern gets, in place of an action. */
        patternNotes: Record<string, { title: string; body: string }>;
        bandColors: string[];
        frequencyLabels: string[];
        /** The c8 question text, labelling each person's reset answer. */
        resetQuestion: string;
        /** The two rows on What You Each Wrote, with the website's headings. */
        wroteRows: { key: string; label: string }[];
        /** The five c0 answers in order, derived from the question itself. */
        overallLabels: string[];
        snapshotRows: { id: string; field: string; label: string }[];
        openingChips: Record<string, { A: string; B: string }>;
        noActionNeeded: Record<string, string>;
        copy: Record<string, string>;
      };
    };

/**
 * Conflict Patterns results.
 *
 * The partner's patterns are not in this payload and must never be. The server
 * builds their half from an allowlist and a build gate checks it.
 */
export function fetchConflictResults() {
  return request<ConflictResults & { ok: true }>('/api/conflict-results');
}

/** One conflict question. `kind` says how to render it. */
export type ConflictQuestion = {
  id: string;
  section: string;
  kind: 'scale' | 'forcedAB' | 'frequency' | 'pickOne' | 'openText' | 'rank';
  text: string;
  a?: string;
  b?: string;
  options?: ({ value: number; label: string } | string)[];
  placeholder?: string;
  riskKey?: string;
};

export type ConflictQuestionSet = {
  saved: SavedAnswers;
  /**
   * Question ids that must be answered for the exercise to count as finished.
   * From CONFLICT_REQUIRED. The app must not decide this for itself: the server
   * is what reads the answers back and calls them complete or not.
   */
  requiredIds: string[];
  exercise: { key: string; label: string; fullLabel?: string; shape: 'answers' | 'record'; view: string };
  /** The screen that opens this exercise, from api/_lib/exercise-intro.js. */
  intro?: { title: string; body: string[]; note?: string | null; cta: string } | null;
  /** The screen that closes it, from api/_lib/exercise-complete.js. */
  complete?: { title: string; body: string[]; cta: string } | null;
  sections: { id: string; label: string; questions: string[] }[];
  frequencyOptions: { value: number; label: string }[];
  items: ConflictQuestion[];
};

export function fetchConflictQuestions() {
  return request<ConflictQuestionSet & { ok: true }>('/api/questions?exercise=conflict');
}
