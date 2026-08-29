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
  | { kind: 'unauthorized' }
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

export type HomeResponse = {
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
  if (!token) return { ok: false, error: { kind: 'unauthorized' } };

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

  if (res.status === 401) return { ok: false, error: { kind: 'unauthorized' } };
  if (res.status === 404) return { ok: false, error: { kind: 'not_found' } };
  if (!res.ok) return { ok: false, error: { kind: 'server', status: res.status } };

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
