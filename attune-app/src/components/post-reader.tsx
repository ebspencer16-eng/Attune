/**
 * One In Practice post, read in the app.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie: "I want all of these to open in app if the user is in the app."
 *
 * Tapping a post handed it to the system browser, which is the one place in
 * the app where reading something Attune wrote meant leaving Attune. The
 * endpoint has served the body since posts existed and nothing had drawn it:
 * fetchPost was declared in the client and called from nowhere.
 *
 * The twelve pieces that actually exist are pages on the website rather than
 * rows in the table, and they were the ones still opening in the browser.
 * Their bodies are generated from the pages into api/_in-practice-bodies.js
 * and served through the same endpoint, so this draws them too. Two block
 * fields only they carry: `label`, the line above a callout or a numbered
 * step, and `source`, the work a research claim cites.
 *
 * ── THE BLOCKS ────────────────────────────────────────────────────────────
 * A post is an ordered array of { id, type, text }, with five types. They are
 * the migration's own list, and an unknown type renders as a paragraph rather
 * than vanishing: a post that loses a section silently is worse than one that
 * shows a section plainly.
 *
 * ── READ STATE ────────────────────────────────────────────────────────────
 * Marked read on open, not on scroll. The feed uses it to stop resurfacing a
 * post, and someone who opened a piece and put it down has still seen it.
 */

import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { fetchPost, markPostRead, type ApiError, type Post, type PostBlock } from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import ScreenFrame from '@/components/screen-frame';
import {
  BottomTabInset, Colors, MaxContentWidth, Radius, Spacing, Type,
} from '@/constants/attune-theme';

const c = Colors.light;

function Block({ block, accent }: { block: PostBlock; accent: string }) {
  const t = block.text || '';
  if (!t.trim()) return null;

  if (block.type === 'heading') {
    return (
      <Text style={{ ...Type.title, color: c.textStrong, marginTop: Spacing.xxl }}>{t}</Text>
    );
  }
  if (block.type === 'quote') {
    return (
      <View
        style={{
          marginTop: Spacing.lg, paddingLeft: Spacing.lg,
          borderLeftColor: accent, borderLeftWidth: 3,
        }}>
        <Text style={{ ...Type.body, color: c.text, fontStyle: 'italic', lineHeight: 26 }}>{t}</Text>
      </View>
    );
  }
  if (block.type === 'list') {
    // One item per line, which is how the editor stores them.
    return (
      <View style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
        {t.split('\n').filter((l) => l.trim()).map((line, i) => (
          <View key={`${block.id}-${i}`} style={{ flexDirection: 'row', gap: Spacing.md }}>
            <Text style={{ ...Type.body, color: accent }}>•</Text>
            <Text style={{ ...Type.body, color: c.text, flex: 1, lineHeight: 25 }}>{line.trim()}</Text>
          </View>
        ))}
      </View>
    );
  }
  if (block.type === 'prompt') {
    return (
      <View
        style={{
          marginTop: Spacing.lg, padding: Spacing.lg, borderRadius: Radius.lg,
          backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
          borderLeftColor: accent, borderLeftWidth: 4,
        }}>
        {/* A callout's label, or a step's number and title. The website draws
            it above the tile's sentence and so does this. */}
        {block.label ? (
          <Text style={{ ...Type.eyebrow, color: accent, marginBottom: Spacing.sm }}>{block.label}</Text>
        ) : null}
        <Text style={{ ...Type.body, color: c.textStrong, lineHeight: 25 }}>{t}</Text>
        {/* A research claim cites its work. An article that cites its sources
            on the website and not here is two different articles. */}
        {block.source ? (
          <Text style={{ ...Type.small, color: c.textMuted, fontStyle: 'italic', marginTop: Spacing.sm }}>
            {block.source}
          </Text>
        ) : null}
      </View>
    );
  }
  // paragraph, and anything the editor grows later.
  return (
    <Text style={{ ...Type.body, color: c.text, marginTop: Spacing.lg, lineHeight: 26 }}>{t}</Text>
  );
}

export default function PostReader({ id, onClose }: { id: string; onClose: () => void }) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<ApiError | null>(null);

  const load = useCallback(async () => {
    const r = await fetchPost(id);
    if (!r.ok) { setFailed(r.error); setLoading(false); return; }
    setPost(r.data.post);
    setFailed(null);
    setLoading(false);
    // Not awaited: whether the receipt lands must never stand between someone
    // and the thing they tapped.
    markPostRead(id);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <ScreenFrame onBack={onClose} backLabel="Resources"><ScreenLoading label="Opening" /></ScreenFrame>;
  }
  if (failed || !post) {
    return (
      <ScreenFrame onBack={onClose} backLabel="Resources">
        <ScreenError
          error={failed || { kind: 'not_found', detail: 'post' }}
          onRetry={() => { setLoading(true); load(); }}
        />
      </ScreenFrame>
    );
  }

  const accent = post.hero_color || c.accent;

  return (
    <ScreenFrame onBack={onClose} backLabel="Resources">
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{
        paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg,
        paddingBottom: BottomTabInset + Spacing.xxl,
        maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
      }}>
      {/* The way out is the arrow in the frame now, not a Done link at the
          far right of the title. One control, in the corner every phone puts
          a back control in. */}
      <View>
        {post.category ? (
          <Text style={{ ...Type.eyebrow, color: accent, marginBottom: Spacing.xs }}>{post.category}</Text>
        ) : null}
        <Text style={{ ...Type.hero, color: c.textStrong }}>{post.title}</Text>
      </View>

      {post.subtitle ? (
        <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm, lineHeight: 24 }}>
          {post.subtitle}
        </Text>
      ) : null}

      {post.read_minutes ? (
        <Text style={{ ...Type.small, fontSize: 11, color: c.accent, marginTop: Spacing.sm }}>
          {`${post.read_minutes} min read`}
        </Text>
      ) : null}

      <View style={{ height: 2, backgroundColor: accent, opacity: 0.5, borderRadius: 2, marginTop: Spacing.lg }} />

      {(post.blocks || []).map((b) => <Block key={b.id} block={b} accent={accent} />)}
    </ScrollView>
    </ScreenFrame>
  );
}
