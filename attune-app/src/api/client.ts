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
  | { kind: 'not_found' }
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

export type CoupleResults = {
  version: number;
  computedAt: string;
  coupleType: string;
  partners: { a: PersonResults; b: PersonResults };
  gaps: Record<string, number | null>;
  rankedGaps: { dim: string; gap: number }[];
  /** Present only when both partners answered Part 2. Never shown to customers. */
  understanding: unknown | null;
};

export type ResultsResponse =
  | { ready: true; cached: boolean; results: CoupleResults }
  | { ready: false; reason: string; self: PersonResults | null; partnerName?: string | null };

export type HomeCard = {
  id: string;
  kind: string;
  title: string;
  body: string;
  cta: string;
  deepLink: string;
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
  resultsReady?: boolean;
  partnerName?: string | null;
  greeting: string;
  primary: HomeCard;
  secondary: HomeCard[];
  badges: { toolbox: number; insights: number; practice: number; notes: number };
  state: { resultsReady: boolean; coupleType: string | null; partnerLinked: boolean };
};

// ── Client ─────────────────────────────────────────────────────────────────

let baseUrl = 'https://attune-relationships.com';
let getToken: () => Promise<string | null> = async () => null;

/** Called once at startup. Keeps auth out of every call site. */
export function configureApi(opts: { baseUrl?: string; getToken: () => Promise<string | null> }) {
  if (opts.baseUrl) baseUrl = opts.baseUrl.replace(/\/$/, '');
  getToken = opts.getToken;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
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
    // Read the body: the endpoint distinguishes a missing token from an
    // invalid one, and those need different fixes.
    let detail = 'server returned 401';
    try { const b = await res.json(); if (b?.error) detail = String(b.error); } catch { /* no body */ }
    return { ok: false, error: { kind: 'unauthorized', detail } };
  }
  if (res.status === 404) return { ok: false, error: { kind: 'not_found' } };
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

/** Seeded on the first call, so this is also what creates them. */
export function fetchTags() {
  return request<{ ok: true; tags: Tag[] }>('/api/notes?action=tags');
}

export function createNote(input: {
  body: string; title?: string; visibility?: 'private' | 'shared';
  anchorType?: string; anchorKey?: string; anchorContext?: string; anchorVersion?: number;
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
export function updateNote(input: { id: string; title?: string | null; body?: string }) {
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
