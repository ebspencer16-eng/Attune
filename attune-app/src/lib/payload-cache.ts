/**
 * What the server last said, kept on the phone.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie: "My pages take a long long time to load every time I open the app.
 * Surely we can fix this, no other apps I use do this. Can we download
 * insights and notes and things once and then they live on the person's phone
 * and we don't have to re-download them every time?"
 *
 * Every screen asked the server on open and drew a spinner until the answer
 * came back, so a cold start on a train was a cold start every time. This
 * keeps the last good answer for each of a handful of endpoints and hands it
 * straight back, so a screen draws immediately and the request that is still
 * running updates it when it lands. Stale for a second, rather than empty for
 * five.
 *
 * ── WHAT IS KEPT, AND WHAT IS NOT ─────────────────────────────────────────
 * Kept: the home screen, the results, the In Practice list, and the tools.
 * Those are what a reader opens the app to look at and what takes the longest
 * to arrive.
 *
 * Not kept: anything from /api/notes. The journal is behind the phone's
 * passcode at Ellie's ask, and a copy of its text in a file beside the app is
 * a copy that is not behind anything. The same goes for the tags, which name
 * what somebody filed. Marking a page still asks the server, which is a small
 * request about one person's own rows.
 *
 * ── WHERE IT LIVES ────────────────────────────────────────────────────────
 * One JSON file in the app's own cache directory, which iOS may clear when
 * the device runs short of space. That is the right place for it: losing it
 * costs one slow open and nothing else.
 *
 * ── AND IT IS EMPTIED ON THE WAY OUT ──────────────────────────────────────
 * Signing out drops it. A phone is lent to somebody; the next person to sign
 * in must not meet the last one's results on screen while their own are
 * loading. `forgetEverything` is called from the same place the tokens are
 * cleared.
 */

import { Directory, File, Paths } from 'expo-file-system';

/** One cache entry: what it was, and when. */
type Entry = { at: number; data: unknown };

/**
 * The endpoints this covers, by the name a caller uses.
 *
 * A list rather than any string, so adding one is a decision. `notes` and
 * `tags` are deliberately not here; see the header.
 */
export type CacheKey = 'home' | 'results' | 'posts' | 'tools';

/**
 * How old an answer may be and still be drawn first.
 *
 * A week. The point is not freshness, which the request behind it provides a
 * second later; the point is that the screen has something to draw. Beyond a
 * week it is likely a different chapter of the couple's life, and a spinner is
 * more honest than a page from last month.
 */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const FILE = 'payload-cache.json';

let memory: Record<string, Entry> = {};
let loaded = false;
let writing: ReturnType<typeof setTimeout> | null = null;

function cacheFile(): File | null {
  try {
    const dir = new Directory(Paths.cache, 'attune');
    if (!dir.exists) dir.create({ intermediates: true });
    return new File(dir, FILE);
  } catch {
    /* A phone that will not give us a cache directory still runs the app; it
       just asks the server every time, which is what it did before. */
    return null;
  }
}

/**
 * Read the file into memory. Called once, before the tabs draw.
 *
 * Everything here is best effort: a cache that cannot be read is not an
 * error, it is an app that loads the way it used to.
 */
export async function primeCache(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const file = cacheFile();
    if (!file || !file.exists) return;
    const text = file.textSync();
    const parsed = JSON.parse(text) as Record<string, Entry>;
    if (parsed && typeof parsed === 'object') memory = parsed;
  } catch {
    memory = {};
  }
}

/** The last good answer for this key, if it is recent enough to draw. */
export function recall<T>(key: CacheKey): T | null {
  const hit = memory[key];
  if (!hit) return null;
  if (Date.now() - hit.at > MAX_AGE_MS) return null;
  return hit.data as T;
}

/** Keep an answer. Written to disk a moment later, so a burst costs one write. */
export function remember(key: CacheKey, data: unknown): void {
  memory[key] = { at: Date.now(), data };
  if (writing) clearTimeout(writing);
  writing = setTimeout(() => {
    writing = null;
    try {
      const file = cacheFile();
      if (!file) return;
      if (!file.exists) file.create();
      file.write(JSON.stringify(memory));
    } catch { /* out of space, or a sandbox that will not have it */ }
  }, 400);
}

/** Everything, gone. Called when a session ends. */
export function forgetEverything(): void {
  memory = {};
  if (writing) { clearTimeout(writing); writing = null; }
  try {
    const file = cacheFile();
    if (file?.exists) file.delete();
  } catch { /* nothing to do about it, and nothing depends on it */ }
}
