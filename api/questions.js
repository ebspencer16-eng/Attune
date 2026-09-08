/**
 * /api/questions
 *
 * The questions an exercise asks, so the app can render an exercise without
 * carrying its own copy of the content.
 *
 *   GET ?exercise=ex1  the Communication questions, both parts, plus the scale
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * The website imports the question modules directly, because it is built from
 * the same repository. The iOS app cannot: it is a separate package with its
 * own bundle. Without this endpoint the only way to ask these questions in the
 * app is to paste them into it, and then a reworded question exists in two
 * places with nothing checking they agree. That is the failure this project
 * keeps having, and here it would mean two people answering different
 * questions and being scored as though they had answered the same one.
 *
 * Authenticated. The questions are the product, and an open endpoint hands the
 * whole assessment to anyone who asks.
 *
 * Answers are written through /api/save-exercise, not here.
 */

export const config = { runtime: 'edge' };

import { twoPartEx1, EX1_SCALE } from './_questions.js';
import { EXERCISES } from './_exercises.js';

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: HEADERS });

export default async function handler(req) {
  if (req.method !== 'GET') return json({ ok: false, error: 'GET only' }, 405);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || serviceKey;
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: 'Server not configured' }, 500);

  const token = (req.headers.get('authorization') || req.headers.get('Authorization') || '')
    .replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ ok: false, error: 'missing auth token' }, 401);

  try {
    const uRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    });
    if (!uRes.ok) return json({ ok: false, error: 'invalid auth token' }, 401);
    const user = await uRes.json().catch(() => null);
    if (!user?.id) return json({ ok: false, error: 'invalid auth token' }, 401);

    const url = new URL(req.url);
    const key = url.searchParams.get('exercise') || 'ex1';

    // The exercise has to be one the registry knows about. Anything else is a
    // typo or a probe, and answering it with an empty list would look like an
    // exercise with no questions rather than a bad request.
    const exercise = EXERCISES.find(e => e.key === key);
    if (!exercise) return json({ ok: false, error: `unknown exercise: ${key}` }, 400);

    if (key === 'ex1') {
      const items = twoPartEx1();
      return json({
        ok: true,
        exercise: { key: exercise.key, label: exercise.label, shape: exercise.shape },
        scale: EX1_SCALE,
        // The break between answering about yourself and answering about your
        // partner. Sent as an item rather than a count so the app does not have
        // to know that part one happens to be 25 questions long.
        items,
        // What a finished set looks like, so the app can tell done from partial
        // without counting items itself.
        expectedKeys: items.filter(i => !i.__partBreak).map(i => i.answerKey),
      });
    }

    // The other exercises are not answerable in the app yet. Saying so is
    // better than returning an empty list, which reads as a bug.
    return json({
      ok: false,
      error: `${exercise.label} is not answerable in the app yet`,
      notYetInApp: true,
    }, 501);
  } catch (e) {
    console.error('[questions] failed:', e);
    return json({ ok: false, error: 'questions unavailable' }, 500);
  }
}
