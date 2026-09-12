/**
 * The Starting Out checklist, in the app.
 *
 * ── WHAT THIS IS AND IS NOT ───────────────────────────────────────────────
 * It is the website's checklist, on a phone. Every word on it, including the
 * areas and the items, arrives from api/_checklist.js through /api/tool-data.
 * Nothing here is written in the app, and the only strings in this file are
 * the two failure lines at the bottom, which the website has no equivalent of
 * because a browser tab does not go offline mid-tap.
 *
 * ── THE THREE STATES ──────────────────────────────────────────────────────
 * An item is done, not applicable, or neither, and tapping cycles through
 * them in that order. That is the website's behaviour and it is not obvious,
 * which is why the page explains itself in a note rather than leaving people
 * to discover it.
 *
 * ── SAVING ────────────────────────────────────────────────────────────────
 * Every tap writes. Optimistically, because a checkbox that waits for a round
 * trip feels broken, and the whole state is small enough that sending it in
 * full is simpler than diffing and cannot half-save. A failed write says so
 * and leaves the tick where the person put it: the next tap retries the lot.
 */

import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import {
  fetchToolData, saveToolData,
  type ApiError, type ChecklistArea, type ChecklistCopy,
} from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import {
  BottomTabInset, Colors, MaxContentWidth, Palette, Radius, Spacing, Type,
} from '@/constants/attune-theme';

const c = Colors.light;

type State = Record<string, true | 'na'>;

/** The website's icon per area, by the same ids. */
const AREA_ICON: Record<string, string> = {
  namechange: 'signature',
  finances: 'banknote',
  insurance: 'shield',
  estate: 'doc.text',
  taxes: 'percent',
  home: 'house',
};

const keyFor = (areaId: string, text: string) => `${areaId}__${text}`;

export default function Checklist({ onClose }: { onClose: () => void }) {
  const [areas, setAreas] = useState<ChecklistArea[] | null>(null);
  const [copy, setCopy] = useState<ChecklistCopy | null>(null);
  const [state, setState] = useState<State>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<ApiError | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetchToolData();
    if (!res.ok) { setFailed(res.error); setLoading(false); return; }
    setAreas(res.data.areas);
    setCopy(res.data.copy);
    setState((res.data.checklist || {}) as State);
    setFailed(null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /**
   * Unchecked to done to not applicable and back, the website's cycle.
   *
   * The next state is computed from the current one and written in the same
   * breath, so the request always carries the whole list rather than a patch.
   */
  const toggle = useCallback((key: string) => {
    setState((prev) => {
      const cur = prev[key];
      const next: State = { ...prev };
      if (!cur) next[key] = true;
      else if (cur === true) next[key] = 'na';
      else delete next[key];

      saveToolData('checklist', next).then((r) => setSaveFailed(!r.ok));
      return next;
    });
  }, []);

  if (loading) return <ScreenLoading label="Getting your checklist" />;
  if (failed || !areas || !copy) {
    return (
      <ScreenError
        error={failed || { kind: 'server', status: 0, message: 'no checklist' }}
        onRetry={() => { setLoading(true); load(); }}
      />
    );
  }

  const total = areas.reduce((n, a) => n + a.items.length, 0);
  const done = Object.keys(state).length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{
        paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg,
        paddingBottom: BottomTabInset + Spacing.xxl,
        maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md }}>
        <Text style={{ ...Type.hero, color: c.textStrong, flex: 1 }}>{copy.title}</Text>
        <Pressable accessibilityRole="button" onPress={onClose} hitSlop={12}>
          <Text style={{ ...Type.small, color: c.accentQuiet, paddingTop: 6 }}>Done</Text>
        </Pressable>
      </View>

      <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm, lineHeight: 24 }}>
        {copy.intro}
      </Text>

      {/* The count, and a bar that is a count rather than a target. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.lg }}>
        <View style={{ flex: 1, height: 6, borderRadius: Radius.pill, backgroundColor: c.border, overflow: 'hidden' }}>
          <View style={{ width: `${total ? (done / total) * 100 : 0}%`, height: 6, backgroundColor: c.accent }} />
        </View>
        <Text style={{ ...Type.small, color: c.textMuted }}>{`${done}/${total} ${copy.progress}`}</Text>
      </View>

      <View
        style={{
          flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg,
          backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
          borderRadius: Radius.md, padding: Spacing.lg,
        }}>
        <View style={{ width: 18, height: 18, borderRadius: 5, borderColor: c.accentQuiet, borderWidth: 2, marginTop: 2 }} />
        <Text style={{ ...Type.small, color: c.textMuted, flex: 1, lineHeight: 20 }}>{copy.howItWorks}</Text>
      </View>

      {saveFailed ? (
        <Text style={{ ...Type.small, color: c.accentQuiet, marginTop: Spacing.md }}>
          That tick has not saved yet. It will try again on the next one.
        </Text>
      ) : null}

      {areas.map((area) => {
        const areaDone = area.items.filter((it) => state[keyFor(area.id, it.text)]).length;
        const allDone = areaDone === area.items.length;
        return (
          <View
            key={area.id}
            style={{
              marginTop: Spacing.lg, backgroundColor: c.surface,
              borderColor: c.border, borderWidth: 1, borderRadius: Radius.lg, overflow: 'hidden',
            }}>
            <View
              style={{
                flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
                padding: Spacing.lg, borderBottomColor: c.border, borderBottomWidth: 1,
              }}>
              <SymbolView
                name={(AREA_ICON[area.id] || 'checklist') as never}
                size={20}
                tintColor={area.color}
                fallback={<View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: area.color }} />}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ ...Type.cardTitle, color: c.textStrong }}>{area.label}</Text>
                <Text style={{ ...Type.small, fontSize: 11, color: c.textMuted }}>
                  {`${areaDone}/${area.items.length} ${copy.progress}`}
                </Text>
              </View>
              {allDone ? (
                <Text style={{ ...Type.small, fontSize: 11, fontWeight: '700', color: area.color }}>
                  {copy.areaDone}
                </Text>
              ) : null}
            </View>

            {area.items.map((item) => {
              const key = keyFor(area.id, item.text);
              const v = state[key];
              const isDone = v === true;
              const isNA = v === 'na';
              const expanded = open === key;
              const hasDetail = !!(item.description || item.links?.length);
              return (
                <View key={item.text} style={{ borderBottomColor: c.border, borderBottomWidth: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: Spacing.lg }}>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isDone }}
                      onPress={() => toggle(key)}
                      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, flex: 1, paddingVertical: Spacing.md }}>
                      <View
                        style={{
                          width: 20, height: 20, borderRadius: 5, marginTop: 1,
                          borderWidth: 2,
                          borderColor: isDone ? area.color : isNA ? c.textMuted : c.border,
                          backgroundColor: isDone ? area.color : 'transparent',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                        {isDone ? <Text style={{ color: Palette.white, fontSize: 12, fontWeight: '700' }}>✓</Text> : null}
                        {isNA ? <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: '700' }}>–</Text> : null}
                      </View>
                      <Text
                        style={{
                          ...Type.body, flex: 1,
                          color: isDone || isNA ? c.textMuted : c.text,
                          textDecorationLine: isDone ? 'line-through' : 'none',
                        }}>
                        {item.text}
                        {isNA ? (
                          <Text style={{ ...Type.small, color: c.textMuted }}>{`  ${copy.notApplicable}`}</Text>
                        ) : null}
                      </Text>
                    </Pressable>
                    {hasDetail ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setOpen(expanded ? null : key)}
                        hitSlop={10}
                        style={{ paddingVertical: Spacing.md, paddingLeft: Spacing.md }}>
                        <Text style={{ color: c.textMuted, fontSize: 13 }}>{expanded ? '▴' : '▾'}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {expanded && item.description ? (
                    <Text
                      style={{
                        ...Type.small, color: c.textMuted, lineHeight: 20,
                        paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
                      }}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}
