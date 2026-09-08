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

import {
  twoPartEx1, EX1_SCALE, RESPONSIBILITY_CATEGORIES, LIFE_QUESTIONS,
  CHILDHOOD_STRUCTURES, substName,
} from './_questions.js';
import { EXERCISES } from './_exercises.js';
import {
  conflictQuestionsInOrder, CONFLICT_SECTIONS, FREQUENCY_OPTIONS, CONFLICT_INTRO,
  CONFLICT_REQUIRED,
} from './_conflict-questions.js';

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: HEADERS });


/**
 * Where this person got to last time.
 *
 * The app saves progress on every answer and, until this existed, had no way to
 * read it back. Someone who stopped at question forty restarted at question
 * one, and their forty answers sat in a column nothing ever looked at.
 *
 * Columns come from the registry rather than being spelled out, so a new
 * exercise is readable here without anyone remembering to add it.
 *
 * A record-shaped exercise keeps everything in one column, including its
 * completedAt. A flat one keeps finished answers and in-progress answers apart,
 * and finished wins: someone who completed an exercise and opened it again
 * should see what they actually submitted, not a stale partial save.
 */
async function savedAnswers(exercise, profile) {
  if (!profile) return null;
  if (exercise.shape === 'record') {
    const record = profile[exercise.column];
    if (!record) return null;
    return { answers: record.answers || {}, completedAt: record.completedAt || null };
  }
  const done = profile[exercise.column];
  if (done && Object.keys(done).length) return { answers: done, completedAt: null, complete: true };
  const partial = profile[`${exercise.key}_progress`];
  if (partial && Object.keys(partial).length) return { answers: partial, completedAt: null, complete: false };
  return null;
}

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

    const svc = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    // Every answer column, plus the progress slots, read once. Derived from the
    // registry so this does not go stale when an exercise is added.
    const answerCols = EXERCISES.map(e => e.column);
    const progressCols = EXERCISES.filter(e => e.shape !== 'record').map(e => `${e.key}_progress`);
    const profCols = ['name', 'partner_name', ...answerCols, ...progressCols].join(',');
    const profRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=${profCols}`, { headers: svc });
    const profile = (await profRes.json().catch(() => []))?.[0] || null;

    // The exercise has to be one the registry knows about. Anything else is a
    // typo or a probe, and answering it with an empty list would look like an
    // exercise with no questions rather than a bad request.
    const exercise = EXERCISES.find(e => e.key === key);
    if (!exercise) return json({ ok: false, error: `unknown exercise: ${key}` }, 400);

    // The registry decides what the app can ask. Refusing here from the same
    // flag /api/home reports means the two cannot drift into saying different
    // things about the same exercise.
    if (!exercise.inApp) {
      return json({
        ok: false,
        error: `${exercise.label} is not answerable in the app yet`,
        notYetInApp: true,
      }, 501);
    }

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
        saved: await savedAnswers(exercise, profile),
      });
    }

    if (key === 'ex2') {
      // Expectations asks about two people by name, so the options cannot be
      // assembled without knowing who they are. Read from the profile rather
      // than taken from the request: a caller that can name the couple is a
      // caller that can put someone else's name on the answers.
      const you = (profile?.name || '').trim() || 'You';
      const partner = (profile?.partner_name || '').trim() || 'Your partner';

      return json({
        ok: true,
        exercise: { key: exercise.key, label: exercise.label, shape: exercise.shape },
        names: { you, partner },

        // Who raised you decides what the "growing up" column is called.
        childhoodStructures: CHILDHOOD_STRUCTURES,

        // Items carry their raw text as the key and their readable text as the
        // label. The key has to stay raw: two partners substitute different
        // names into the same item, and a key that moved with the name would
        // stop lining up between them.
        categories: RESPONSIBILITY_CATEGORIES.map(cat => ({
          id: cat.id,
          label: cat.label,
          items: cat.items.map(item => ({
            key: item,
            label: substName(item, you, partner),
          })),
        })),

        futureCols: [you, partner, 'Both of us', "Doesn't apply to us"],
        futureColsDisplay: [you, partner, 'Both', 'N/A'],
        // Shown when someone answers "Both of us", because both rarely means
        // exactly half and the difference is the interesting part.
        futureDetailOpts: [
          'Genuinely 50/50',
          `Usually ${you}, sometimes ${partner}`,
          `Usually ${partner}, sometimes ${you}`,
        ],

        lifeQuestions: LIFE_QUESTIONS.map(q => ({
          id: q.id,
          topic: substName(q.topic, you, partner),
          text: substName(q.core || q.text, you, partner),
          options: (q.options || []).map(o => substName(o, you, partner)),
        })),
        saved: await savedAnswers(exercise, profile),
      });
    }

    if (key === 'conflict') {
      // Conflict asks six different kinds of question. They are sent as they
      // are, each carrying its own kind, so the app renders what a question
      // says it is rather than keeping a map of which id is which shape.
      return json({
        ok: true,
        exercise: { key: exercise.key, label: exercise.label, shape: exercise.shape },
        intro: CONFLICT_INTRO || null,
        sections: CONFLICT_SECTIONS,
        frequencyOptions: FREQUENCY_OPTIONS,
        items: conflictQuestionsInOrder(),
        /**
         * What has to be answered for this to count as finished.
         *
         * The server decides, because it is the server that decides. The app
         * treated the two free-text questions as optional, so someone could
         * skip them, press Finish, and get completedAt written. The exercise
         * then read Done while isConflictComplete returned false, so the
         * summary was null and the results never opened. Done on one screen and
         * permanently not ready on the next, with nothing explaining why.
         */
        requiredIds: CONFLICT_REQUIRED,
        saved: await savedAnswers(exercise, profile),
      });
    }

    // The remaining exercises are not answerable in the app yet. Saying so is
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
