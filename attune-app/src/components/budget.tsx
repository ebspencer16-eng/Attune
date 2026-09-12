/**
 * The Shared Budget tool, in the app.
 *
 * ── WHERE EVERYTHING COMES FROM ───────────────────────────────────────────
 * The categories, the pooling models and every word arrive from
 * api/_budget.js through /api/tool-data. The only thing repeated in the app is
 * the arithmetic, in constants/budget.ts, because the reveal updates as you
 * type and a round trip per keystroke is not a budget tool.
 * check-budget-mirror.mjs runs both copies over the same budgets and fails the
 * build if a single figure differs.
 *
 * ── SAVING ────────────────────────────────────────────────────────────────
 * The website has a Save changes button. This does not: a phone keyboard
 * covers half the screen, and a button you have to scroll to find is a button
 * people lose work to. It saves when a field loses focus and when the screen
 * closes, and says so if a save did not land.
 *
 * ── THE REVEAL ────────────────────────────────────────────────────────────
 * Shown at the top rather than the bottom. On a laptop the numbers sit beside
 * the inputs; on a phone they cannot, and the figure someone is watching while
 * they type is the surplus. It follows the scroll instead of waiting at the
 * end of it.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  fetchToolData, saveToolData,
  type ApiError, type BudgetCategoryPayload, type BudgetCopy, type BudgetState,
} from '@/api/client';
import { bFmt, computeReveal } from '@/constants/budget';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import {
  BottomTabInset, Colors, MaxContentWidth, Radius, Spacing, Type, inputType,
} from '@/constants/attune-theme';

const c = Colors.light;

export default function Budget({ onClose }: { onClose: () => void }) {
  /**
   * The names come with the data, not from the caller.
   *
   * A budget stores incomes and personal spending as { [name]: amount }, so a
   * name is a key. The website writes the full profile name; /api/home sends
   * the first word of it. Passing the home version in would have put a
   * couple's figures under a key the website never reads, and overwritten
   * theirs on the next save.
   */
  const [you, setYou] = useState('You');
  const [them, setThem] = useState('Your partner');
  const [cats, setCats] = useState<BudgetCategoryPayload[] | null>(null);
  const [models, setModels] = useState<{ id: string; label: string; desc: string }[]>([]);
  const [copy, setCopy] = useState<BudgetCopy | null>(null);
  const [state, setState] = useState<BudgetState>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<ApiError | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  /** The last state written, so closing does not re-send an unchanged budget. */
  const savedRef = useRef<string>('');

  const load = useCallback(async () => {
    const res = await fetchToolData();
    if (!res.ok) { setFailed(res.error); setLoading(false); return; }
    setYou(res.data.budgetNames?.you || 'You');
    setThem(res.data.budgetNames?.them || 'Your partner');
    setCats(res.data.budgetCategories);
    setModels(res.data.poolingModels || []);
    setCopy(res.data.budgetCopy);
    const s = res.data.budget || {};
    setState(s);
    savedRef.current = JSON.stringify(s);
    setFailed(null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (next: BudgetState) => {
    const body = JSON.stringify(next);
    if (body === savedRef.current) return;
    const r = await saveToolData('budget', next);
    setSaveFailed(!r.ok);
    if (r.ok) savedRef.current = body;
  }, []);

  const put = (patch: Partial<BudgetState>) => setState((p) => ({ ...p, ...patch }));

  if (loading) return <ScreenLoading label="Getting your budget" />;
  if (failed || !cats || !copy) {
    return (
      <ScreenError
        error={failed || { kind: 'server', status: 0, message: 'no budget' }}
        onRetry={() => { setLoading(true); load(); }}
      />
    );
  }

  const rev = computeReveal(state, cats, you, them);
  const essentials = cats.filter((x) => x.group === 'essentials');
  const discretionary = cats.filter((x) => x.group !== 'essentials');

  const money = (label: string, value: string, onChange: (v: string) => void) => (
    <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm }}>
      <Text style={{ ...Type.small, color: c.text, flex: 1 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        onBlur={() => save(state)}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={c.textMuted}
        style={{
          ...inputType, color: c.textStrong, textAlign: 'right',
          minWidth: 96, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
          borderColor: c.border, borderWidth: 1, borderRadius: Radius.md,
          backgroundColor: c.surface,
        }}
      />
    </View>
  );

  const section = (title: string, intro: string, children: React.ReactNode) => (
    <View style={{ marginTop: Spacing.xxl }}>
      <Text style={{ ...Type.title, color: c.textStrong }}>{title}</Text>
      <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.xs, lineHeight: 20 }}>{intro}</Text>
      {children}
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg,
        paddingBottom: BottomTabInset + Spacing.xxl,
        maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md }}>
        <Text style={{ ...Type.hero, color: c.textStrong, flex: 1 }}>{copy.title}</Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => { save(state); onClose(); }}>
          <Text style={{ ...Type.small, color: c.accentQuiet, paddingTop: 6 }}>Done</Text>
        </Pressable>
      </View>
      <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm, lineHeight: 24 }}>{copy.intro}</Text>

      {/* ── THE NUMBERS, AT THE TOP ──────────────────────────────────────── */}
      <View
        style={{
          marginTop: Spacing.lg, backgroundColor: c.surface, borderColor: c.border,
          borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg,
        }}>
        {[
          ['Income', rev.totalIncome],
          ['Allocated', rev.totalAllocated],
          ['Left over', rev.surplus],
        ].map(([label, v]) => (
          <View key={String(label)} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
            <Text style={{ ...Type.small, color: c.textMuted }}>{label}</Text>
            <Text
              style={{
                ...Type.small, fontWeight: '700',
                color: label === 'Left over' && (v as number) < 0 ? '#B5546E' : c.textStrong,
              }}>
              {((v as number) < 0 ? '-' : '') + bFmt(v as number)}
            </Text>
          </View>
        ))}
      </View>

      {saveFailed ? (
        <Text style={{ ...Type.small, color: c.accentQuiet, marginTop: Spacing.md }}>
          That has not saved yet. It will try again when you leave the next field.
        </Text>
      ) : null}

      {section(copy.step1, copy.step1Intro, (
        <View style={{ marginTop: Spacing.md }}>
          <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.xs }}>{copy.incomeLabel}</Text>
          {[you, them].map((who) => money(
            who,
            state.incomes?.[who] || '',
            (v) => put({ incomes: { ...(state.incomes || {}), [who]: v } }),
          ))}

          <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginTop: Spacing.lg, marginBottom: Spacing.xs }}>
            {copy.poolingLabel}
          </Text>
          {models.map((m) => {
            const on = (state.pooling || 'proportional') === m.id;
            return (
              <Pressable
                key={m.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => { const next = { ...state, pooling: m.id }; setState(next); save(next); }}
                style={{
                  marginTop: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.md,
                  backgroundColor: c.surface,
                  borderColor: on ? c.accent : c.border, borderWidth: on ? 2 : 1,
                }}>
                <Text style={{ ...Type.small, fontWeight: '700', color: c.textStrong }}>{m.label}</Text>
                <Text style={{ ...Type.small, color: c.textMuted, marginTop: 2, lineHeight: 19 }}>{m.desc}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}

      {[[copy.essentials, copy.essentialsIntro, essentials] as const,
        [copy.discretionary, copy.discretionaryIntro, discretionary] as const,
      ].map(([title, intro, list]) => section(title, intro, (
        <View style={{ marginTop: Spacing.md }}>
          {list.map((cat) => (
            <View
              key={cat.id}
              style={{
                marginTop: Spacing.md, backgroundColor: c.surface, borderColor: c.border,
                borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg,
              }}>
              <Text style={{ ...Type.cardTitle, color: c.textStrong, marginBottom: Spacing.xs }}>{cat.label}</Text>
              {cat.items.map((item) => money(
                item,
                state.expenses?.[`${cat.id}__${item}`] || '',
                (v) => put({ expenses: { ...(state.expenses || {}), [`${cat.id}__${item}`]: v } }),
              ))}
            </View>
          ))}
        </View>
      )))}

      <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginTop: Spacing.xl, marginBottom: Spacing.xs }}>
        {copy.personalLabel}
      </Text>
      {[you, them].map((who) => money(
        who,
        state.personal?.[who] || '',
        (v) => put({ personal: { ...(state.personal || {}), [who]: v } }),
      ))}

      {section(copy.goals, copy.goalsIntro, (
        <View style={{ marginTop: Spacing.md }}>
          {(state.goals || []).map((g, i) => (
            <View
              key={g.id || i}
              style={{
                marginTop: Spacing.sm, backgroundColor: c.surface, borderColor: c.border,
                borderWidth: 1, borderRadius: Radius.md, padding: Spacing.lg,
              }}>
              <TextInput
                value={g.name || ''}
                onChangeText={(v) => put({ goals: (state.goals || []).map((x, j) => (j === i ? { ...x, name: v } : x)) })}
                onBlur={() => save(state)}
                placeholder="What for"
                placeholderTextColor={c.textMuted}
                style={{ ...inputType, color: c.textStrong, paddingVertical: Spacing.xs }}
              />
              {money('Target', g.target || '', (v) => put({ goals: (state.goals || []).map((x, j) => (j === i ? { ...x, target: v } : x)) }))}
              {money('Months', g.months || '', (v) => put({ goals: (state.goals || []).map((x, j) => (j === i ? { ...x, months: v } : x)) }))}
              <Pressable
                accessibilityRole="button"
                onPress={() => { const next = { ...state, goals: (state.goals || []).filter((_, j) => j !== i) }; setState(next); save(next); }}>
                <Text style={{ ...Type.small, color: c.accentQuiet, marginTop: Spacing.xs }}>Remove</Text>
              </Pressable>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => put({ goals: [...(state.goals || []), { id: `g_${Date.now()}`, name: '', target: '', months: '' }] })}
            style={{
              marginTop: Spacing.md, padding: Spacing.lg, borderRadius: Radius.md,
              borderColor: c.border, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center',
            }}>
            <Text style={{ ...Type.small, color: c.accentQuiet, fontWeight: '700' }}>Add a goal</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}
