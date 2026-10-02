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
  fetchToolData, saveToolData, markEditing,
  type ApiError, type BudgetCategoryPayload, type BudgetCopy, type BudgetState,
} from '@/api/client';
import { bFmt, computeReveal } from '@/constants/budget';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import ScreenFrame from '@/components/screen-frame';
import { useFlushOnUnmount } from '@/hooks/use-flush-on-unmount';
import { LOADING } from '@/constants/loading-copy';
import {
  BottomTabInset, Colors, MaxContentWidth, Radius, Spacing, Type, inputType, Palette} from '@/constants/attune-theme';

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

  /**
   * ── AND A SAVE ON THE WAY OUT ───────────────────────────────────────────
   * Every number here was written on the field's own onBlur, which is correct
   * for moving between fields and is not enough for leaving.
   *
   * Typing into a field and then tapping the back arrow, or the Learn tab,
   * unmounts this screen. iOS does not promise a TextInput's blur before an
   * unmount, so the last thing typed was simply gone: no error, no warning,
   * and the number was back to its old value next time the tool was opened.
   * The Done button did save first; the back arrow and the tab bar did not,
   * and those are the two ways most people leave a screen.
   *
   * A flush on unmount covers every exit at once, including the ones nobody
   * has thought of yet. It is cheap and idempotent: save returns immediately
   * when nothing has changed since the last write.
   *
   * The state is read from a ref rather than closed over, or the cleanup would
   * capture whatever the state was when the effect was created, which is the
   * empty budget.
   */
  useFlushOnUnmount(state, save, { ready: !loading });
  /**
   * Which fields the partner has open, polled while this screen is up.
   *
   * A poll rather than a live channel: the app deliberately carries no realtime
   * client, which is written down in api/auth.ts, and the website has to do the
   * same thing the same way. Six seconds against a server window of twelve, so a
   * marker appears within one cycle of them arriving and clears within one of
   * them leaving.
   */
  const [partnerEditing, setPartnerEditing] = useState<Record<string, boolean>>({});
  useEffect(() => {
    let stopped = false;
    const read = async () => {
      const r = await fetchToolData();
      if (!stopped && r.ok) setPartnerEditing((r.data.editing as Record<string, boolean>) || {});
    };
    void read();
    const iv = setInterval(() => { void read(); }, 6000);
    return () => { stopped = true; clearInterval(iv); };
  }, []);


  const put = (patch: Partial<BudgetState>) => setState((p) => ({ ...p, ...patch }));

  if (loading) return <ScreenFrame onBack={onClose} backLabel="Learn"><ScreenLoading label={LOADING.budget} /></ScreenFrame>;
  if (failed || !cats || !copy) {
    return (
      <ScreenFrame onBack={onClose} backLabel="Learn">
        <ScreenError
          error={failed || { kind: 'server', status: 0, message: 'no budget' }}
          onRetry={() => { setLoading(true); load(); }}
        />
      </ScreenFrame>
    );
  }

  const rev = computeReveal(state, cats, you, them);
  const essentials = cats.filter((x) => x.group === 'essentials');
  const discretionary = cats.filter((x) => x.group !== 'essentials');

  /**
   * One figure, and whoever else has it open.
   *
   * Ellie: "The budget should show your partner's icon or something in a text
   * box if they're currently editing that figure." The focus is reported, the
   * box takes the accent border while they are in it, and their initial sits on
   * the corner. `field` has to name the same box on both surfaces or the marker
   * lands on the wrong one, which check-shared-tools holds them to.
   */
  const money = (label: string, value: string, onChange: (v: string) => void, field?: string) => {
    const theirs = !!(field && partnerEditing[field]);
    return (
      <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm }}>
        <Text style={{ ...Type.small, color: c.text, flex: 1 }}>{label}</Text>
        <View>
          <TextInput
            value={value}
            onChangeText={onChange}
            onFocus={field ? () => { void markEditing(field); } : undefined}
            onBlur={() => { if (field) void markEditing(''); save(state); }}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={c.textMuted}
            style={{
              ...inputType, color: c.textStrong, textAlign: 'right',
              minWidth: 96, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
              borderColor: theirs ? c.accent : c.border, borderWidth: 1, borderRadius: Radius.md,
              backgroundColor: c.surface,
            }}
          />
          {theirs ? (
            <View
              accessibilityLabel={`${them} is editing this`}
              style={{
                position: 'absolute', top: -7, right: -7, width: 18, height: 18,
                borderRadius: 9, backgroundColor: c.accent, alignItems: 'center',
                justifyContent: 'center', borderWidth: 2, borderColor: c.background,
              }}>
              <Text style={{ ...Type.small, fontSize: 10, fontWeight: '700', color: Palette.white }}>
                {(them || 'P').trim().charAt(0).toUpperCase()}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  /**
   * One titled block.
   *
   * ── IT TAKES A KEY ──────────────────────────────────────────────────────
   * Ellie: "On insights page in app, I'm seeing a warning 'Each child in a list
   * should have a unique ke...'"
   *
   * It is this. Two of the four call sites are inside a `.map`, and a helper
   * that returns an element gives React no way to key it from outside: the key
   * has to be on the element the helper returns. The other two calls pass
   * nothing and are not in a list, which is why the warning appeared
   * intermittently and pointed at no file anyone was looking at.
   *
   * The warning surfaces wherever the app happens to be, because all four tabs
   * mount at launch, which is why it was reported from the Insights tab for a
   * component that belongs to Learn.
   */
  const section = (title: string, intro: string, children: React.ReactNode, key?: string) => (
    <View key={key} style={{ marginTop: Spacing.xxl }}>
      <Text style={{ ...Type.title, color: c.textStrong }}>{title}</Text>
      <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.xs, lineHeight: 20 }}>{intro}</Text>
      {children}
    </View>
  );

  return (
    <ScreenFrame onBack={() => { void save(state); onClose(); }} backLabel="Learn">
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
        {/* ── THE WEBSITE'S THREE NUMBERS, NOT THREE OTHERS ──────────────
            Ellie: "Budget tool in app needs to be the same flow as the web
            experience."

            This showed Income, Allocated and Left over. The website shows
            Monthly income, Left to allocate and Savings rate, and says "Over
            budget" when the third is negative. Two of the three numbers were
            the same with different names and the third was a different number,
            so the two tools disagreed about what a budget is for.

            Both surfaces already compute all of them: `computeReveal` is the
            one piece of arithmetic deliberately repeated in the app, and
            check-budget-mirror runs both copies over the same budgets. Only the
            choice of what to show differed. The labels come from the server
            now, so neither screen writes its own. */}
        {[
          [copy.statIncome, bFmt(rev.totalIncome), c.textStrong],
          [rev.surplus >= 0 ? copy.statLeft : copy.statOver,
            (rev.surplus >= 0 ? '' : '-') + bFmt(rev.surplus),
            rev.surplus >= 0 ? c.textStrong : '#B5546E'],
          [copy.statSavings, `${rev.savingsRate.toFixed(1)}%`, c.textStrong],
        ].map(([label, value, tint]) => (
          <View key={String(label)} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
            <Text style={{ ...Type.small, color: c.textMuted }}>{label}</Text>
            <Text style={{ ...Type.small, fontWeight: '700', color: tint as string }}>
              {value}
            </Text>
          </View>
        ))}
        {/* ── NO "UNSAVED CHANGES" LINE HERE ─────────────────────────────
            The website has one because it saves when you press Save changes.
            The app saves as you type, so there is no moment this would be true
            for, and a line that is never true is worse than no line. The save
            model is the one part of the flow that still differs between the
            two, and that is a decision rather than a bug; it is in TASKS.md. */}
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
            `income:${who}`,
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
      ), title))}

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
    </ScreenFrame>
  );
}
