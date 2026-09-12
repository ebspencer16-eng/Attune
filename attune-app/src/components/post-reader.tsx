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
        <Text style={{ ...Type.body, color: c.textStrong, lineHeight: 25 }}>{t}</Text>
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

  if (loading) return <ScreenLoading label="Opening" />;
  if (failed || !post) {
    return (
      <ScreenError
        error={failed || { kind: 'not_found', detail: 'post' }}
        onRetry={() => { setLoading(true); load(); }}
      />
    );
  }

  const accent = post.hero_color || c.accent;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{
        paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg,
        paddingBottom: BottomTabInset + Spacing.xxl,
        maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md }}>
        <View style={{ flex: 1 }}>
          {post.category ? (
            <Text style={{ ...Type.eyebrow, color: accent, marginBottom: Spacing.xs }}>{post.category}</Text>
          ) : null}
          <Text style={{ ...Type.hero, color: c.textStrong }}>{post.title}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onClose} hitSlop={12}>
          <Text style={{ ...Type.small, color: c.accentQuiet, paddingTop: 6 }}>Done</Text>
        </Pressable>
      </View>

      {post.subtitle ? (
        <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm, lineHeight: 24 }}>
          {post.subtitle}
        </Text>
      ) : null}

      {post.read_minutes ? (
        <Text style={{ ...Type.small, fontSize: 11, color: c.textMuted, marginTop: Spacing.sm }}>
          {`${post.read_minutes} min`}
        </Text>
      ) : null}

      <View style={{ height: 2, backgroundColor: accent, opacity: 0.5, borderRadius: 2, marginTop: Spacing.lg }} />

      {(post.blocks || []).map((b) => <Block key={b.id} block={b} accent={accent} />)}
    </ScrollView>
  );
}
