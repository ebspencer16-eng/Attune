/**
 * The parts every exercise screen has, written once.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie, of the arrows: "Do that on all exercises." Of the eyebrow: "Eyebrow
 * in top left on every question page across all exercises should say the full
 * name of the exercise in that exercise's appropriate color."
 *
 * Five screens carried their own version of both, which is why one of them had
 * a category where the exercise's name belongs and another had two centred
 * buttons where the other four now have arrows. A change asked for once should
 * not have to be made five times and remembered five times.
 */

import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Pressable } from '@/components/pressable';

import {
  AccentFallback, AccentFor, Colors, TabBarHeight, Palette, Radius, Spacing, Type,
 Fonts } from '@/constants/attune-theme';
import { CoverPage, useCoverCompact } from '@/components/cover-page';
import PageWash from '@/components/page-wash';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GROUP_ICON } from '@/components/results-menu';

const c = Colors.light;

/** The exercise's own colour, from the one place that maps them. */
export function exerciseColor(key?: string | null) {
  return (key && AccentFor[key]) || AccentFallback;
}

/**
 * The frame every exercise screen sits in: the safe area, the wash in the
 * exercise's own colour, and Close top right.
 *
 * It was a private `Shell` typed out five times, identical but for the key in
 * the wash, so the cover check (check-app-cover-fits) would have measured a
 * sixth copy rather than the one that ships. Each exercise still has a local
 * Shell, which is now one line handing its key to this.
 */
export function ExerciseShell({
  exerciseKey, onClose, children,
}: {
  exerciseKey: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      {/* Ellie: "Exercise screens should have a hue gradient like the learn and
          notes, but the hue gradient should be the exercise color." Its own
          colour, from the same place its progress bar and its arrows take
          theirs, so an exercise renamed or recoloured takes this with it. */}
      <PageWash tint={exerciseColor(exerciseKey)} />
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Spacing.xl, paddingTop: Spacing.md }}>
        <Pressable accessibilityRole="button" onPress={onClose} hitSlop={10}>
          <Text style={{ ...Type.body, color: c.textMuted }}>Close</Text>
        </Pressable>
      </View>
      {children}
    </SafeAreaView>
  );
}

/**
 * The name of the exercise, top left, in its own colour.
 *
 * The full name rather than the short one: this is a heading with a line to
 * itself, not a column in a three-column table.
 */
export function ExerciseEyebrow({
  exerciseKey, label, right,
}: { exerciseKey?: string | null; label: string; right?: string | null }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ ...Type.eyebrow, color: exerciseColor(exerciseKey), flex: 1 }} numberOfLines={1}>
        {label}
      </Text>
      {right ? (
        <Text style={{ ...Type.small, color: c.textMuted, marginLeft: Spacing.md }}>{right}</Text>
      ) : null}
    </View>
  );
}

/**
 * Back on the left, Next on the right, both as arrows.
 *
 * Ellie: "a small arrow on the left that says back and arrow on the right that
 * says next." The row keeps its shape when there is nothing to go back to, so
 * Next does not move between the first question and the second.
 */
export function ExerciseNav({
  onBack, onNext, nextLabel, disabled, busy, color,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  disabled?: boolean;
  busy?: boolean;
  color?: string;
}) {
  const tint = color || c.accent;
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginTop: Spacing.xl,
      }}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to the previous question"
          onPress={onBack}
          hitSlop={12}
          style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, paddingRight: Spacing.lg }}>
          <Text style={{ ...Type.body, color: c.textMuted }}>{'‹'}</Text>
          <Text style={{ ...Type.small, color: c.textMuted, fontWeight: '600' }}>Back</Text>
        </Pressable>
      ) : <View />}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={nextLabel}
        onPress={disabled ? undefined : onNext}
        accessibilityState={{ disabled: !!disabled }}
        hitSlop={12}
        style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, paddingLeft: Spacing.lg }}>
        {busy ? (
          <ActivityIndicator color={tint} />
        ) : (
          <>
            <Text style={{ ...Type.small, fontWeight: '700', color: disabled ? c.border : tint }}>
              {nextLabel}
            </Text>
            <Text style={{ ...Type.body, color: disabled ? c.border : tint }}>{'›'}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

/** What the server sends to open an exercise. */
export type ExerciseIntro = {
  title: string;
  body: string[];
  /** The preview tiles. Only Communication has them, and until now only the
   *  website drew them, because they were typed into src/App.jsx. */
  parts?: { eyebrow: string; title: string }[] | null;
  note?: string | null;
  cta: string;
};

/**
 * The screen that opens an exercise.
 *
 * ── WHY EVERY EXERCISE HAS ONE NOW ────────────────────────────────────────
 * Ellie: "Rel Relf jumps right in to the questioning and I don't like that.
 * Need the flow to match exactly for web and app."
 *
 * The website opens all five with a page like this and the app opened none of
 * them, which is two products rather than one. The words come from the server
 * so they cannot be a third version: api/_lib/exercise-intro.js.
 */
/**
 * The page an exercise opens on.
 *
 * ── IT IS A COVER NOW ─────────────────────────────────────────────────────
 * Ellie: "Mirror cover pages for exercises and results on both web and app."
 *
 * It was a plain centred column: eyebrow, title, prose, button. The results
 * chapters had a cover with a gradient frame and a large glowing mark, and an
 * exercise is the other half of the same pair, so it opens on the same page
 * now. The frame, the glow and the mark are CoverPage, shared with the results
 * cover rather than built twice.
 *
 * `resultsGroup` comes from the server, which reads it off the registry. The
 * mark an exercise wears is the mark its results chapter wears, and neither
 * surface works that mapping out for itself.
 *
 * It scrolls, which the results cover does not: an exercise's opening prose is
 * two or three sentences and a note, and a chapter's is its name.
 */
export function ExerciseOpening({
  exerciseKey, label, intro, onBegin, resultsGroup = null,
}: {
  exerciseKey?: string | null;
  label: string;
  intro: ExerciseIntro;
  onBegin: () => void;
  resultsGroup?: string | null;
}) {
  const tint = exerciseColor(exerciseKey);
  const safe = useSafeAreaInsets();
  return (
    /* ── IT CLEARS THE TAB BAR ─────────────────────────────────────────
       This said an exercise is "opened over the whole screen", so there was
       no bar to clear. It is not: insights.tsx draws the exercise in place
       of the tab's content, every tab screen draws under the native bar and
       pads by BottomTabInset, and so does the results cover. Without it the
       bottom of this cover, Start included, sat behind the bar.

       The bar this phone actually has, not BottomTabInset's fixed 84: that
       left an iPhone SE's covers 20 to 27 points short of fitting for the
       sake of a home indicator it does not have. */
    <CoverPage accent={tint} icon={resultsGroup ? GROUP_ICON[resultsGroup] : null}
      bottomInset={TabBarHeight + safe.bottom + Spacing.lg} scroll>
      <OpeningContents tint={tint} label={label} intro={intro} onBegin={onBegin} />
    </CoverPage>
  );
}

/**
 * What the cover holds. Its own component because it reads useCoverCompact,
 * which only answers inside the CoverPage: on a frame too short for even the
 * smallest glow, every gap here tightens a step.
 */
function OpeningContents({
  tint, label, intro, onBegin,
}: {
  tint: string;
  label: string;
  intro: ExerciseIntro;
  onBegin: () => void;
}) {
  /* Tight is the last step before scrolling. Each gap gives up a step more
     (A226): Ellie's longer second paragraph on the Physical Intimacy cover
     (A197) left an iPhone SE 15 points short with the old tight gaps. */
  const tight = useCoverCompact();
  return (
    <>
      <Text style={{ ...Type.eyebrow, color: tint, marginTop: tight ? Spacing.xs : Spacing.lg, textAlign: 'center' }}>{label}</Text>
      <Text style={{ ...Type.hero, color: c.textStrong, marginTop: tight ? Spacing.xs : Spacing.md, textAlign: 'center' }}>{intro.title}</Text>
      {intro.body.map((para) => (
        <Text key={para.slice(0, 24)} style={{ ...Type.body, color: c.textMuted, marginTop: tight ? Spacing.sm : Spacing.lg, lineHeight: 24, textAlign: 'center' }}>
          {para}
        </Text>
      ))}
      {/* ── THE PREVIEW TILES ─────────────────────────────────────────────
          The website has shown these on the Communication cover since it was
          written and the app has shown none, because they were typed into the
          website's renderer. They come from the server now and both surfaces
          draw the same two. An eyebrow and a heading, which is what Ellie
          asked for: "neither tile should have a description". */}
      {intro.parts && intro.parts.length ? (
        <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: tight ? Spacing.lg : Spacing.xl, width: '100%' }}>
          {intro.parts.map((part, i) => (
            <View
              key={part.eyebrow}
              style={{
                flex: 1, backgroundColor: c.surface, borderRadius: Radius.lg,
                borderWidth: 1, borderColor: tint + '33', padding: Spacing.md,
              }}>
              <Text style={{ ...Type.eyebrow, color: i === 0 ? tint : c.textMuted }}>{part.eyebrow}</Text>
              {/* 16pt broke "communicator" across two lines inside a tile half
                  a phone wide. The tile holds a short heading, not a title. */}
              <Text style={{ ...Type.small, fontFamily: Fonts.bodyBold, color: c.textStrong, marginTop: Spacing.xs, lineHeight: 18 }}>
                {part.title}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {intro.note ? (
        <Text style={{ ...Type.small, color: c.textMuted, marginTop: tight ? Spacing.lg : Spacing.xl, textAlign: 'center' }}>{intro.note}</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        testID="exercise-start"
        onPress={onBegin}
        style={{
          marginTop: tight ? Spacing.lg : Spacing.xxl, borderRadius: Radius.pill,
          paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl,
          alignItems: 'center', backgroundColor: tint,
        }}>
        <Text style={{ ...Type.cardTitle, color: Palette.white }}>{intro.cta}</Text>
      </Pressable>
    </>
  );
}

/** What the server sends to close an exercise. */
export type ExerciseCompletion = {
  title: string;
  body: string[];
  cta: string;
};

/**
 * The screen that closes an exercise.
 *
 * ── WHY EVERY EXERCISE HAS THE SAME ONE ───────────────────────────────────
 * Ellie: "Exercise complete page still needs a rebuild. Should say '[Exercise]
 * Complete' in bold, then keep the description as is, have the done button say
 * 'back to insights' and have all that content in the middle of the page like
 * the intro pages."
 *
 * Built like ExerciseOpening on purpose: same centring, same measure, same
 * button. Finishing an exercise should look like the mirror of starting it.
 * The tick above the name is the only thing here that is not on the opening
 * page, and it is the one thing this screen has to say at a glance.
 */
export function ExerciseComplete({
  exerciseKey, completion, onDone,
}: {
  exerciseKey?: string | null;
  completion: ExerciseCompletion;
  onDone: () => void;
}) {
  const tint = exerciseColor(exerciseKey);
  return (
    <ScrollView
      contentContainerStyle={{
        padding: Spacing.xl, paddingBottom: Spacing.xxxl, flexGrow: 1, justifyContent: 'center',
      }}>
      <View
        style={{
          width: 44, height: 44, borderRadius: 22, backgroundColor: tint,
          alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
        }}>
        <Text style={{ color: Palette.white, fontSize: 20, fontWeight: '700' }}>{'\u2713'}</Text>
      </View>
      <Text style={{ ...Type.hero, color: c.textStrong }}>{completion.title}</Text>
      {completion.body.map((para) => (
        <Text key={para.slice(0, 24)} style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.lg, lineHeight: 24 }}>
          {para}
        </Text>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={onDone}
        style={{
          marginTop: Spacing.xxl, borderRadius: Radius.md, paddingVertical: Spacing.lg,
          alignItems: 'center', backgroundColor: tint,
        }}>
        <Text style={{ ...Type.small, color: Palette.white, fontWeight: '700' }}>{completion.cta}</Text>
      </Pressable>
    </ScrollView>
  );
}

/**
 * Ranking, by tapping in order.
 *
 * ── WHY IT IS HERE ────────────────────────────────────────────────────────
 * Ellie: "Ranking question (Q10) should have the same functionality as the one
 * from rel relf, I want the options to move into their ordered list and become
 * colored once you select it."
 *
 * Two exercises ask for a ranking and each had written its own. Reflection
 * moved a chosen option into a list at the top; Conflict left it in place and
 * put a number beside it. This is Reflection's, in the exercise's own colour,
 * used by both.
 *
 * Not drag and drop. Reordering by dragging on a phone is fiddly enough that
 * people give up and accept whatever order they land on, which produces a
 * ranking nobody meant. Tapping in order is slower to describe and faster to
 * do, and tapping again takes it back.
 */
export function RankInOrder({
  options, order, onChange, color, hint,
}: {
  options: string[];
  order: string[] | null;
  onChange: (v: string[]) => void;
  color?: string;
  hint?: string;
}) {
  const picked = order ?? [];
  const remaining = options.filter((o) => !picked.includes(o));
  const tint = color || c.accent;

  return (
    <View style={{ marginTop: Spacing.lg }}>
      <Text style={{ ...Type.small, color: c.textMuted, marginBottom: Spacing.md }}>
        {hint || 'Tap the options in order, most important first. Tap an option again to remove it.'}
      </Text>

      {picked.map((o, i) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${o}, ranked ${i + 1}. Tap to take it back.`}
          key={o}
          onPress={() => onChange(picked.filter((p) => p !== o))}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
            paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
            borderRadius: Radius.md, marginBottom: Spacing.sm,
            backgroundColor: tint,
          }}>
          <Text style={{ ...Type.cardTitle, color: Palette.white }}>{i + 1}</Text>
          <Text style={{ ...Type.body, color: Palette.white, flex: 1 }}>{o}</Text>
        </Pressable>
      ))}

      {remaining.map((o) => (
        <Pressable
          accessibilityRole="button"
          key={o}
          onPress={() => onChange([...picked, o])}
          style={{
            paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
            borderRadius: Radius.md, marginBottom: Spacing.sm,
            backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
          }}>
          <Text style={{ ...Type.body, color: c.text }}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}
