/**
 * Notes on the website: the real ones, from the real endpoint.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Ellie: "Need the note functionality and page built into the website
 * interface."
 *
 * The website already had a page called Notes. It was a notebook in
 * localStorage, with emoji tabs, five hardcoded prompts and a line at the top
 * that read "Saved to this device only". Meanwhile /api/notes has carried
 * notes, annotations, tags, sharing and per-note visibility since the app
 * shipped, and every one of those rows was invisible on a laptop. A person
 * could mark a sentence on their phone, open the same results on a desktop and
 * find neither the mark nor a way to make one.
 *
 * So this is not a new feature. It is the website reaching the data the app
 * has been writing.
 *
 * ── WHY IT IS A MODULE AND NOT MORE OF App.jsx ────────────────────────────
 * src/App.jsx is fifteen thousand lines and has been emptied once by a bad
 * edit. Everything here is self-contained and imported, which keeps the surgery
 * on that file down to an import and a swapped component.
 *
 * ── THE TWO HALVES ────────────────────────────────────────────────────────
 * `NotesView` is the page: your own notes, your marks grouped by the section
 * they sit on, what your partner shared, and your tags.
 *
 * `useResultsMarking` is the other half: select a sentence anywhere in the
 * results and a small toolbar offers the same five things the app's does, with
 * the same anchors, so a mark made on a laptop opens on the phone and the other
 * way round.
 *
 * ── ANCHORS ARE THE CONTRACT ──────────────────────────────────────────────
 * A mark is stored as anchor_type, anchor_key and anchor_context, and nothing
 * else finds it again. Those three are exactly what the app writes:
 * 'results_section', the section id, and the selected text. Getting any of them
 * wrong here would produce marks that only this surface can see, which is the
 * problem this module exists to end.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ANNOTATION_COLORS, DEFAULT_ANNOTATION_COLOR } from '../api/_lib/annotations.js';

const HFONT = "'Playfair Display', Georgia, serif";
const BFONT = "'DM Sans', -apple-system, system-ui, sans-serif";

const C = {
  ink: '#0E0B07',
  text: '#1E1610',
  muted: '#7A6753',
  clay: '#A66534',
  stone: '#E8DDD0',
  warm: '#FBF8F3',
  white: '#FFFFFF',
  accent: '#E8673A',
};

/** The palette a mark can wear, from the same module the app reads. */
const COLORS = ANNOTATION_COLORS;

/* ══ THE ENDPOINT ══════════════════════════════════════════════════════════
 *
 * One place that knows the shape of /api/notes, for the same reason the app
 * has one: five call sites each building their own body is five chances to
 * send an anchor the other surface cannot read.
 */

async function token() {
  try {
    const { supabase: sb, hasSupabase } = await import('./supabase.js');
    if (!hasSupabase) return null;
    const { data: { session } } = await sb.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

async function call(path, init) {
  const t = await token();
  if (!t) return { ok: false, error: 'signed-out' };
  try {
    const res = await fetch(path, {
      ...init,
      headers: { ...(init?.headers || {}), Authorization: `Bearer ${t}` },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.ok) return { ok: false, error: body?.error || `http ${res.status}` };
    return { ok: true, data: body };
  } catch (e) {
    return { ok: false, error: e?.message || 'network' };
  }
}

const post = (payload) => call('/api/notes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

export const notesApi = {
  list: () => call('/api/notes?action=list'),
  tags: () => call('/api/notes?action=tags'),
  create: (input) => post({ action: 'create', ...input }),
  update: (input) => post({ action: 'update', ...input }),
  share: (id, visibility) => post({ action: 'share', id, visibility }),
  remove: (id) => post({ action: 'delete', id }),
  createTag: (name) => post({ action: 'createTag', name }),
  open: (id) => post({ action: 'open', id }),
};

/* ══ MARKING THE RESULTS ═══════════════════════════════════════════════════ */

/** The five things a selection can become, in the order the app lists them. */
const ACTIONS = [
  { id: 'highlight', label: 'Highlight' },
  { id: 'underline', label: 'Underline' },
  { id: 'tag', label: 'Tag' },
  { id: 'note', label: 'Note' },
  { id: 'share', label: 'Share' },
];

/**
 * Select a sentence in the results and do something with it.
 *
 * ── HOW A SELECTION BECOMES AN ANCHOR ─────────────────────────────────────
 * The browser gives the selected text and where it is on screen. The anchor is
 * that text verbatim, which is what the app stores and what both surfaces
 * match on when they paint a mark back. No offsets: results copy is versioned
 * and regenerated, and an offset into a rewritten paragraph points at the
 * middle of a different word.
 *
 * ── WHY THE SELECTION IS READ ON mouseup AND NOT ON selectionchange ───────
 * selectionchange fires on every character as a drag grows, so a toolbar bound
 * to it flickers across the screen while someone is still choosing. mouseup is
 * the moment they finish, which is when the app shows its toolbar too.
 *
 * @param containerRef  the element holding the results prose
 * @param section       the results section id, which is the anchor key
 * @param onSaved       told about the new note, so a page can count it
 */
export function useResultsMarking({ containerRef, section, onSaved, enabled = true }) {
  const [sel, setSel] = useState(null);
  const [step, setStep] = useState(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [tags, setTags] = useState([]);
  const [picked, setPicked] = useState([]);
  const [colour, setColour] = useState(DEFAULT_ANNOTATION_COLOR);

  /** Tags are loaded once, when the first selection is made, not on mount. */
  const loadedTags = useRef(false);
  useEffect(() => {
    if (!sel || loadedTags.current) return;
    loadedTags.current = true;
    notesApi.tags().then((r) => { if (r.ok) setTags(r.data.tags || []); });
  }, [sel]);

  const close = useCallback(() => {
    setSel(null); setStep(null); setBody(''); setError(null); setPicked([]);
    try { window.getSelection()?.removeAllRanges(); } catch { /* nothing to clear */ }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const el = containerRef.current;
    if (!el) return undefined;

    const onUp = () => {
      const s = window.getSelection();
      const text = (s?.toString() || '').trim();
      // A click is a selection of nothing. Two characters is a slip.
      if (!s || s.isCollapsed || text.length < 3) { setSel(null); setStep(null); return; }
      // Only selections that begin inside the results.
      if (!el.contains(s.anchorNode)) return;
      /**
       * Viewport coordinates, and the toolbar is positioned fixed.
       *
       * The results live inside a `position: fixed` panel that scrolls
       * internally, so window.scrollY is zero there and page coordinates would
       * put the toolbar in the wrong place on every page but the first. A
       * viewport coordinate is right in both arrangements.
       */
      const rect = s.getRangeAt(0).getBoundingClientRect();
      setSel({ text, top: rect.top, left: rect.left + rect.width / 2 });
      setStep(null);
      setError(null);
    };

    document.addEventListener('mouseup', onUp);
    return () => document.removeEventListener('mouseup', onUp);
  }, [containerRef, enabled]);

  /**
   * One save for all five, exactly as the app does it.
   *
   * A highlight is a mark with a colour and no words; a note is words with no
   * colour; a share is a note the partner can read. The anchor is the same in
   * every case, which is the whole reason this is one function.
   */
  const save = useCallback(async (opts) => {
    if (!sel) return;
    setBusy(true);
    setError(null);
    const res = await notesApi.create({
      body: opts.kind === 'note' || opts.shared ? body.trim() : '',
      kind: opts.kind,
      color: opts.color ?? null,
      visibility: opts.shared ? 'shared' : 'private',
      anchorType: 'results_section',
      anchorKey: section,
      anchorContext: sel.text,
      tagIds: picked.length ? picked : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error === 'signed-out'
        ? 'Your session ended. Sign in and try again.'
        : 'That did not save. Try again.');
      return;
    }
    onSaved?.(res.data.note);
    close();
  }, [sel, body, picked, section, onSaved, close]);

  return {
    sel, step, setStep, body, setBody, busy, error,
    tags, picked, setPicked, colour, setColour, save, close,
    actions: ACTIONS,
  };
}

/** The toolbar that appears over a selection. */
export function MarkToolbar({ marking, partnerName }) {
  const {
    sel, step, setStep, body, setBody, busy, error,
    tags, picked, setPicked, colour, setColour, save, close,
  } = marking;
  if (!sel) return null;

  const panel = {
    position: 'fixed',
    top: sel.top - 12,
    left: sel.left,
    transform: 'translate(-50%, -100%)',
    background: C.white,
    border: `1px solid ${C.stone}`,
    borderRadius: 12,
    boxShadow: '0 8px 24px rgba(14,11,7,0.12)',
    padding: step ? '0.85rem' : '0.35rem',
    zIndex: 60,
    fontFamily: BFONT,
    maxWidth: 340,
  };

  const chip = (on) => ({
    padding: '0.35rem 0.7rem',
    borderRadius: 999,
    border: `1px solid ${on ? C.ink : C.stone}`,
    background: on ? C.ink : C.white,
    color: on ? C.white : C.text,
    fontSize: '0.72rem',
    cursor: 'pointer',
    fontFamily: BFONT,
  });

  return (
    <div style={panel} onMouseUp={(e) => e.stopPropagation()}>
      {!step ? (
        <div style={{ display: 'flex', gap: '0.15rem' }}>
          {marking.actions.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setStep(a.id)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: '0.4rem 0.6rem', fontSize: '0.72rem', color: C.text,
                fontFamily: BFONT, fontWeight: 600,
              }}>
              {a.label}
            </button>
          ))}
        </div>
      ) : null}

      {step === 'highlight' || step === 'underline' ? (
        <div>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.7rem' }}>
            {COLORS.map((col) => (
              <button
                key={col.key}
                type="button"
                aria-label={col.name}
                onClick={() => setColour(col.key)}
                style={{
                  width: 24, height: 24, borderRadius: 999, cursor: 'pointer',
                  background: col.wash,
                  border: `2px solid ${colour === col.key ? col.ink : 'transparent'}`,
                }}
              />
            ))}
          </div>
          <Primary
            busy={busy}
            label={step === 'highlight' ? 'Highlight it' : 'Underline it'}
            onClick={() => save({ kind: step, color: colour })}
          />
        </div>
      ) : null}

      {step === 'note' || step === 'share' ? (
        <div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={step === 'share' ? `Say something to ${partnerName}` : 'Write a note'}
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box', resize: 'vertical',
              border: `1px solid ${C.stone}`, borderRadius: 8, padding: '0.5rem',
              fontFamily: BFONT, fontSize: '0.8rem', color: C.text, marginBottom: '0.6rem',
            }}
          />
          <Primary
            busy={busy}
            label={step === 'share' ? `Send to ${partnerName}` : 'Save note'}
            onClick={() => save({ kind: 'note', shared: step === 'share' })}
          />
        </div>
      ) : null}

      {step === 'tag' ? (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.7rem' }}>
            {tags.length ? tags.filter((t) => !t.deleted_at).map((t) => {
              const on = picked.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPicked((p) => (on ? p.filter((x) => x !== t.id) : [...p, t.id]))}
                  style={chip(on)}>
                  {t.name}
                </button>
              );
            }) : (
              <span style={{ fontSize: '0.75rem', color: C.muted }}>
                No tags yet. Make one on the Notes page.
              </span>
            )}
          </div>
          <Primary busy={busy} label="File it" onClick={() => save({ kind: 'note' })} />
        </div>
      ) : null}

      {error ? (
        <div style={{ color: C.accent, fontSize: '0.72rem', marginTop: '0.5rem' }}>{error}</div>
      ) : null}

      {step ? (
        <button
          type="button"
          onClick={close}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: C.muted, fontSize: '0.7rem', marginTop: '0.5rem', padding: 0,
            fontFamily: BFONT,
          }}>
          Cancel
        </button>
      ) : null}
    </div>
  );
}

/**
 * Everything needed to mark a results page, wrapped around the results.
 *
 * ── WHY display: contents ─────────────────────────────────────────────────
 * The results are a fixed panel with its own flex layout, and a wrapper with a
 * box of its own would break it. `display: contents` puts the element in the
 * DOM tree without putting it in the layout, which is exactly what is wanted:
 * `contains()` works, so a selection can be tested for being inside the
 * results, and nothing moves.
 */
export function ResultsMarkingLayer({ section, partnerName, marks, onSaved, enabled = true, children }) {
  const ref = useRef(null);
  const marking = useResultsMarking({ containerRef: ref, section, onSaved, enabled });
  usePaintedMarks({ containerRef: ref, marks, section });
  return (
    <>
      <div ref={ref} style={{ display: 'contents' }}>{children}</div>
      <MarkToolbar marking={marking} partnerName={partnerName} />
    </>
  );
}

function Primary({ label, onClick, busy }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      style={{
        width: '100%', background: C.ink, color: C.white, border: 'none',
        borderRadius: 999, padding: '0.5rem 0.9rem', cursor: busy ? 'default' : 'pointer',
        fontSize: '0.76rem', fontWeight: 700, fontFamily: BFONT, opacity: busy ? 0.6 : 1,
      }}>
      {busy ? 'Saving' : label}
    </button>
  );
}

/**
 * Paint the marks that already exist onto the prose.
 *
 * ── HOW ───────────────────────────────────────────────────────────────────
 * Each mark knows the exact text it sits on. This walks the text nodes inside
 * the results, finds that text, and wraps it. Nothing is stored about where it
 * was: a sentence either still exists in the copy or it does not, and a mark
 * whose sentence has been rewritten simply does not draw, which is the same
 * rule the app follows.
 *
 * Wrapping is done with a Range rather than by rewriting innerHTML, because
 * the results are React's and rewriting their HTML underneath them is how a
 * page stops re-rendering.
 */
export function usePaintedMarks({ containerRef, marks, section, deps = [] }) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const mine = (marks || []).filter(
      (m) => m.anchor_type === 'results_section'
        && m.anchor_key === section
        && m.anchor_context,
    );
    if (!mine.length) return undefined;

    const painted = [];

    for (const m of mine) {
      const needle = m.anchor_context.trim();
      if (needle.length < 3) continue;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let node;
      let done = false;
      while (!done && (node = walker.nextNode())) {
        // Already inside a mark we painted: leave it alone rather than nest.
        if (node.parentElement?.dataset?.attuneMark) continue;
        const at = node.textContent.indexOf(needle);
        if (at < 0) continue;
        try {
          const range = document.createRange();
          range.setStart(node, at);
          range.setEnd(node, at + needle.length);
          const wrap = document.createElement('span');
          wrap.dataset.attuneMark = m.id;
          const tone = COLORS.find((x) => x.key === m.color) || COLORS[0];
          if (m.kind === 'underline') {
            wrap.style.borderBottom = `2px solid ${tone.ink}`;
          } else if (m.kind === 'highlight') {
            wrap.style.background = tone.wash;
            wrap.style.borderRadius = '3px';
          } else {
            // A note changes nothing about the words, which is the point of it.
            // The margin marker below is what says it is there.
            wrap.style.borderBottom = `2px dotted ${tone.ink}`;
          }
          wrap.title = m.body || 'Your note';
          range.surroundContents(wrap);
          painted.push(wrap);
          done = true;
        } catch {
          // A range that spans element boundaries cannot be wrapped. Skip it
          // rather than throw: an unpainted mark is a missing underline, and a
          // throw here takes the results page down.
          done = true;
        }
      }
    }

    return () => {
      for (const wrap of painted) {
        const parent = wrap.parentNode;
        if (!parent) continue;
        while (wrap.firstChild) parent.insertBefore(wrap.firstChild, wrap);
        parent.removeChild(wrap);
        parent.normalize();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, marks, section, ...deps]);
}

/* ══ THE PAGE ══════════════════════════════════════════════════════════════ */

const eyebrow = {
  fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase',
  color: C.clay, fontWeight: 700, fontFamily: BFONT, marginBottom: '0.75rem',
};

const card = {
  background: C.white, border: `1px solid ${C.stone}`, borderRadius: 14,
  padding: '1rem 1.1rem', marginBottom: '0.6rem',
};

function whenWritten(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * The Notes page.
 *
 * ── WHAT IT REPLACED ──────────────────────────────────────────────────────
 * A notebook in localStorage with three emoji tabs and five prompts written
 * into the component, under a line that said "Saved to this device only". It
 * shared nothing with the app: a note written on a phone was not here, and a
 * note written here was on one browser on one machine.
 *
 * ── WHY SECTIONS RATHER THAN A LIST ───────────────────────────────────────
 * Most of these are marks on a results page, and a mark's value is the
 * sentence it sits on. Listed by date they are a pile of fragments; listed
 * under the page they came from they are a reading history. The same decision
 * the app's Notes tab made.
 */
export function NotesView({ userName, partnerName, sectionLabels = {}, onOpenSection, onBack }) {
  const [notes, setNotes] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [shared, setShared] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [newTag, setNewTag] = useState('');

  const load = useCallback(async () => {
    const [n, t] = await Promise.all([notesApi.list(), notesApi.tags()]);
    if (!n.ok) {
      setFailed(n.error === 'signed-out'
        ? 'Sign in to see your notes.'
        : 'Your notes could not be loaded. Reload to try again.');
      setLoading(false);
      return;
    }
    setNotes(n.data.notes || []);
    setAnnotations(n.data.annotations || []);
    setShared(n.data.sharedWithMe || []);
    if (t.ok) setTags(t.data.tags || []);
    setFailed(null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /** Marks grouped by the page they sit on, in the order that page appears. */
  const bySection = useMemo(() => {
    const map = new Map();
    for (const a of annotations) {
      const key = a.anchor_key || 'elsewhere';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    }
    return [...map.entries()];
  }, [annotations]);

  const add = async () => {
    const text = draft.trim();
    if (!text) return;
    setBusy(true);
    const res = await notesApi.create({ body: text, kind: 'note', visibility: 'private' });
    setBusy(false);
    if (!res.ok) { setFailed('That did not save. Try again.'); return; }
    setDraft('');
    load();
  };

  const toggleShare = async (note) => {
    const next = note.visibility === 'shared' ? 'private' : 'shared';
    const res = await notesApi.share(note.id, next);
    if (!res.ok) { setFailed('That did not save. Try again.'); return; }
    const apply = (list) => list.map((n) => (n.id === note.id ? { ...n, visibility: next } : n));
    setNotes(apply);
    setAnnotations(apply);
  };

  const remove = async (note) => {
    // The browser's own confirm, deliberately: Ellie asked for "are you sure?
    // This action cannot be undone" and this is the one control on the page
    // that cannot be taken back.
    // eslint-disable-next-line no-alert
    if (!window.confirm('Are you sure? This action cannot be undone.')) return;
    const res = await notesApi.remove(note.id);
    if (!res.ok) { setFailed('That did not delete. Try again.'); return; }
    setNotes((l) => l.filter((n) => n.id !== note.id));
    setAnnotations((l) => l.filter((n) => n.id !== note.id));
  };

  const addTag = async () => {
    const name = newTag.trim();
    if (!name) return;
    const res = await notesApi.createTag(name);
    if (!res.ok) { setFailed('That tag did not save. Try again.'); return; }
    setNewTag('');
    const t = await notesApi.tags();
    if (t.ok) setTags(t.data.tags || []);
  };

  const Note = ({ note, readOnly = false }) => (
    <div style={card}>
      {note.anchor_context ? (
        <div style={{
          borderLeft: `3px solid ${(COLORS.find((x) => x.key === note.color) || COLORS[0]).ink}`,
          paddingLeft: '0.7rem', marginBottom: '0.6rem',
          fontSize: '0.8rem', color: C.muted, fontFamily: BFONT, lineHeight: 1.6,
        }}>
          {note.anchor_context}
        </div>
      ) : null}
      {note.body ? (
        <div style={{ fontSize: '0.88rem', color: C.text, fontFamily: BFONT, lineHeight: 1.65, fontStyle: 'italic' }}>
          {note.body}
        </div>
      ) : (
        <div style={{ fontSize: '0.8rem', color: C.muted, fontFamily: BFONT }}>
          {`A ${(note.kind || 'note')} with nothing written under it.`}
        </div>
      )}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.9rem', marginTop: '0.7rem',
        fontSize: '0.7rem', color: C.muted, fontFamily: BFONT,
      }}>
        <span>{whenWritten(note.created_at)}</span>
        {!readOnly ? (
          <>
            <button
              type="button"
              onClick={() => toggleShare(note)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: note.visibility === 'shared' ? C.accent : C.muted, fontFamily: BFONT, fontSize: '0.7rem', fontWeight: 700 }}>
              {note.visibility === 'shared' ? `Shared with ${partnerName}` : 'Private'}
            </button>
            {note.anchor_key && onOpenSection ? (
              <button
                type="button"
                onClick={() => onOpenSection(note.anchor_key)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: C.clay, fontFamily: BFONT, fontSize: '0.7rem', fontWeight: 700 }}>
                Open the page
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => remove(note)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: C.muted, fontFamily: BFONT, fontSize: '0.7rem', marginLeft: 'auto' }}>
              Delete
            </button>
          </>
        ) : null}
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: C.warm }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            style={{ background: 'transparent', border: 'none', color: C.muted, fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: BFONT, padding: 0, marginBottom: '1.75rem' }}>
            ← Back
          </button>
        ) : null}

        <h1 style={{ fontFamily: HFONT, fontSize: '2rem', fontWeight: 700, color: C.ink, lineHeight: 1.1, marginBottom: '0.5rem' }}>
          Notes
        </h1>
        <p style={{ fontSize: '0.85rem', color: C.muted, fontFamily: BFONT, lineHeight: 1.7, marginBottom: '2rem' }}>
          {/* Not "saved to this device only" any more, because it is not true
              any more: this is the same notebook the app writes to. */}
          Everything you have marked in your results, and anything you have written,
          on every device you sign in on.
        </p>

        {loading ? (
          <p style={{ fontSize: '0.85rem', color: C.muted, fontFamily: BFONT }}>Loading your notes.</p>
        ) : null}

        {failed ? (
          <p style={{ fontSize: '0.85rem', color: C.accent, fontFamily: BFONT, marginBottom: '1.5rem' }}>{failed}</p>
        ) : null}

        {!loading && !failed ? (
          <>
            {/* Write one that is not attached to anything. */}
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={eyebrow}>Write something</div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                placeholder="Anything you want to come back to"
                style={{
                  width: '100%', boxSizing: 'border-box', resize: 'vertical',
                  border: `1px solid ${C.stone}`, borderRadius: 12, padding: '0.8rem',
                  fontFamily: BFONT, fontSize: '0.88rem', color: C.text, background: C.white,
                }}
              />
              <button
                type="button"
                disabled={busy || !draft.trim()}
                onClick={add}
                style={{
                  marginTop: '0.6rem', background: draft.trim() ? C.ink : C.stone, color: C.white,
                  border: 'none', borderRadius: 999, padding: '0.5rem 1.2rem',
                  cursor: draft.trim() ? 'pointer' : 'default', fontSize: '0.78rem',
                  fontWeight: 700, fontFamily: BFONT,
                }}>
                {busy ? 'Saving' : 'Save note'}
              </button>
            </div>

            {bySection.length ? (
              <div style={{ marginBottom: '2.5rem' }}>
                <div style={eyebrow}>From your results</div>
                {bySection.map(([sectionId, list]) => (
                  <div key={sectionId} style={{ marginBottom: '1.5rem' }}>
                    <div style={{
                      fontFamily: HFONT, fontSize: '1rem', fontWeight: 700,
                      color: C.ink, marginBottom: '0.6rem',
                    }}>
                      {sectionLabels[sectionId] || sectionId}
                    </div>
                    {list.map((n) => <Note key={n.id} note={n} />)}
                  </div>
                ))}
              </div>
            ) : null}

            {notes.length ? (
              <div style={{ marginBottom: '2.5rem' }}>
                <div style={eyebrow}>Yours</div>
                {notes.map((n) => <Note key={n.id} note={n} />)}
              </div>
            ) : null}

            <div style={{ marginBottom: '2.5rem' }}>
              <div style={eyebrow}>{`From ${partnerName}`}</div>
              {shared.length
                ? shared.map((n) => <Note key={n.id} note={n} readOnly />)
                : (
                  <p style={{ fontSize: '0.82rem', color: C.muted, fontFamily: BFONT }}>
                    {`Nothing shared with you yet. When ${partnerName} shares a note it turns up here.`}
                  </p>
                )}
            </div>

            <div>
              <div style={eyebrow}>Tags</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.8rem' }}>
                {tags.filter((t) => !t.deleted_at).map((t) => (
                  <span
                    key={t.id}
                    style={{
                      padding: '0.35rem 0.8rem', borderRadius: 999,
                      border: `1px solid ${C.stone}`, background: C.white,
                      fontSize: '0.75rem', color: C.text, fontFamily: BFONT,
                    }}>
                    {t.name}
                  </span>
                ))}
                {!tags.filter((t) => !t.deleted_at).length ? (
                  <span style={{ fontSize: '0.8rem', color: C.muted, fontFamily: BFONT }}>
                    No tags yet.
                  </span>
                ) : null}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag"
                  style={{
                    flex: 1, border: `1px solid ${C.stone}`, borderRadius: 999,
                    padding: '0.45rem 0.9rem', fontFamily: BFONT, fontSize: '0.8rem',
                    color: C.text, background: C.white,
                  }}
                />
                <button
                  type="button"
                  onClick={addTag}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: C.accent, fontWeight: 700, fontSize: '0.78rem', fontFamily: BFONT,
                  }}>
                  Add
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default NotesView;
