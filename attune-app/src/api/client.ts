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

export type PersonResults = {
  name: string | null;
  typeCode: 'W' | 'X' | 'Y' | 'Z';
  axes: { withdraw: number | null; open: number | null };
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
    nuance: string;
    color: string;
    shade: string;
  } | null;
  dimensions: ResultDimension[];
  names: { a: string | null; b: string | null };
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

/** One entry in the results spine. Both fields come from the server. */
export type ResultsSection = { id: string; label: string };

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
      /** What the couple owns, so nothing has to be inferred from the payload. */
      owned?: string[];
    }
  | { ready: false; reason: string; self: PersonResults | null; partnerName?: string | null };

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
  app?: { route?: string; exercise?: string; external?: string };
  disabled?: boolean;
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
};

/** One purchasable thing, from api/_catalogue.js. Price is whole dollars. */
export type CatalogueItem = {
  key: string;
  label: string;
  blurb: string;
  price: number;
};

export type HomeResponse = {
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

let baseUrl = 'https://attune-relationships.com';
let getToken: () => Promise<string | null> = async () => null;
let refresh: (() => Promise<boolean>) | null = null;

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
let refreshInFlight: Promise<boolean> | null = null;

function refreshOnce(): Promise<boolean> {
  if (!refresh) return Promise.resolve(false);
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
  refresh?: () => Promise<boolean>;
}) {
  if (opts.baseUrl) baseUrl = opts.baseUrl.replace(/\/$/, '');
  getToken = opts.getToken;
  refresh = opts.refresh ?? null;
  refreshInFlight = null;
}

async function request<T>(path: string, init: RequestInit = {}, retrying = false): Promise<ApiResult<T>> {
  const token = await getToken();
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
      const renewed = await refreshOnce();
      if (renewed) return request<T>(path, init, true);
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
  return request<HomeResponse & { ok: true }>('/api/home');
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
  published_at: string;
  revision: number;
  read: boolean;
  /** The post changed since they read it, so it is worth resurfacing. */
  revised: boolean;
};

export type PostBlock = { id: string; type: 'paragraph' | 'heading' | 'quote' | 'list' | 'prompt'; text: string };

export type Post = PostSummary & { blocks: PostBlock[] };

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
};

/**
 * Tags, and the reference data the notes screen needs alongside them.
 *
 * `sections` maps a results section id to its heading. It comes from the server
 * because five of those ids are generated from the expectations categories and
 * six from the intimacy dimensions, so a copy in the app goes stale the moment
 * either list changes. Seeded on the first call, so this is also what creates
 * the tags.
 */
export function fetchTags() {
  return request<{ ok: true; tags: Tag[]; sections?: Record<string, string> }>(
    '/api/notes?action=tags');
}

export function createNote(input: {
  body: string; title?: string; visibility?: 'private' | 'shared';
  anchorType?: string; anchorKey?: string; anchorContext?: string; anchorVersion?: number;
  /** Tags to attach. The server accepted these all along; nothing sent them. */
  tagIds?: string[];
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
export async function deleteAccount(): Promise<ApiResult<{ ok: true }>> {
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
    body: JSON.stringify({ userId }),
  });
}

export function fetchNotifications() {
  return request<{ ok: true; notifications: Notification[]; unread: number }>('/api/notifications');
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
  exercise: { key: string; label: string; shape: 'answers' | 'record' };
  names: { you: string; partner: string };
  childhoodStructures: { id: string; label: string; cols: string[] }[];
  /** `key` is the raw item text and is what the answer is stored under. `label`
   *  is the same text with names substituted, and is what a person reads. They
   *  differ because two partners substitute different names into one item. */
  categories: { id: string; label: string; items: { key: string; label: string }[] }[];
  futureCols: string[];
  futureColsDisplay: string[];
  futureDetailOpts: string[];
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
  exercise: { key: string; label: string; shape: 'answers' | 'record' };
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
    ? { answers: input.answers, ...(completedAt ? { completedAt } : {}) }
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

export type ConflictSummary = {
  overall: number | null;
  patterns: ConflictPattern[];
  ranked: ConflictPattern[];
  flagged: string[];
  flaggedCount: number;
  strength: string | null;
  repairRanking: string[];
  openings: { start: number | null; middle: number | null; oldTopics: number | null };
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
  openings: { start: number | null; middle: number | null; oldTopics: number | null };
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
        patternCopy: Record<string, Record<string, { note: string }>>;
        patternActions: Record<string, { title: string; body: string }>;
        patternNotes: Record<string, string>;
        bandColors: string[];
        frequencyLabels: string[];
        snapshotRows: { id: string; label: string }[];
        snapshotProse: Record<string, string>;
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
  exercise: { key: string; label: string; shape: 'answers' | 'record' };
  intro: string | null;
  sections: { id: string; label: string; questions: string[] }[];
  frequencyOptions: { value: number; label: string }[];
  items: ConflictQuestion[];
};

export function fetchConflictQuestions() {
  return request<ConflictQuestionSet & { ok: true }>('/api/questions?exercise=conflict');
}
