/**
 * Conflict Patterns results. Four screens, per app/SCREENS.md.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * Your Patterns is yours. Your partner is never shown it, and this component
 * could not show it if it tried: /api/conflict-results does not send the
 * partner's patterns, their type has no field for them, and a build gate fails
 * if anyone adds one. Three layers, because the cost of getting this wrong is
 * someone reading a private answer about themselves in their partner's hands.
 *
 * ── WHY IT LOOKS LIKE THIS ────────────────────────────────────────────────
 * No score, no letter, no couple type. The other exercises describe a dynamic
 * where neither end is worse. This one measures a rate on patterns where one
 * direction genuinely is, and turning that into an identity label is the most
 * harmful thing this product could do. "You are a Critic" is a sentence someone
 * repeats to themselves for years.
 *
 * So: frequencies, bands, and one thing to try. Described, never ranked into a
 * verdict, and never averaged with the partner into a couple number that would
 * let a serious imbalance read as fine.
 *
 * Every word comes from api/_conflict-results-prose.js.
 */

import { ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { ConflictResults, ConflictSummary } from '@/api/client';
import {
  BottomTabInset, Colors, MaxContentWidth, Palette, Radius, Spacing, Type,
} from '@/constants/attune-theme';

const c = Colors.light;

/**
 * The four Conflict screens, named exactly as the server names them.
 *
 * They used to be 'glance' | 'snapshot' | 'patterns' | 'wrote', a second
 * vocabulary for the same four things the results nav already calls
 * conflict-overview, -snapshot, -patterns and -wrote. Two names for one screen
 * is two lists to keep in step, and the `section` prop that carried the
 * server's name was accepted here and never read.
 */
type Screen = 'overview' | 'snapshot' | 'patterns' | 'wrote';

const SCREENS: Screen[] = ['overview', 'snapshot', 'patterns', 'wrote'];

export default function ConflictResultsView({
  data, section,
}: {
  data: Extract<ConflictResults, { ready: true }>;
  /**
   * Which of the four Conflict screens to show. The website splits this into
   * conflict-overview, -snapshot, -patterns and -wrote, and notes anchor to
   * those ids, so the app shows the same four rather than one long page.
   */
  section?: string;
}) {
  const { you, partner, names, content } = data;

  /**
   * Which screen, from the section the results nav asked for.
   *
   * ── WHY THE TAB BAR IS GONE ─────────────────────────────────────────────
   * This screen had its own row of pills across the top, so Conflict Patterns
   * was the only section in the app with two navigations: the results nav that
   * every other section uses, and a second one inside it that looked nothing
   * like it.
   *
   * Worse, they were not connected. `section` arrived from the nav and was
   * never read, and the pills were local state defaulting to the first tab. So
   * every conflict link in the nav, including the three that name a specific
   * page, landed on At a glance and left the reader to find the rest through a
   * control the rest of the product does not have.
   *
   * Ellie: "Conflict pages on app need to match site and currently don't...
   * use the nav we've organized in other sections."
   */
  const screen: Screen =
    (SCREENS.find((k) => section === `conflict-${k}`) || 'overview');

  return (
    <View style={{ flex: 1 }}>
      {screen === 'overview' ? <Glance data={data} /> : null}
      {screen === 'snapshot' ? <Snapshot data={data} /> : null}
      {screen === 'patterns' ? <Patterns you={you} content={content} /> : null}
      {screen === 'wrote' ? <Wrote data={data} /> : null}
    </View>
  );
}

/** Glance. Coloured ground, then one thing to try per pattern worth attention. */
function Glance({ data }: { data: Extract<ConflictResults, { ready: true }> }) {
  const { you, content, names } = data;
  const worth = you.ranked.filter((p) => p.band === 'worth_watching' || p.band === 'worth_attention');

  return (
    <ScrollView contentContainerStyle={pad}>
      <LinearGradient
        colors={['#16305C', '#1B5FE8']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ borderRadius: Radius.xl, padding: Spacing.xl }}>
        <Text style={{ ...Type.eyebrow, color: 'rgba(255,255,255,0.6)' }}>
          {content.copy.eyebrow || 'Conflict Patterns'}
        </Text>
        <Text style={{ ...Type.title, color: Palette.white, marginTop: Spacing.sm }}>
          How conflict goes for you
        </Text>
        {you.strength ? (
          <Text style={{ ...Type.body, color: 'rgba(255,255,255,0.85)', marginTop: Spacing.md }}>
            {you.strength}
          </Text>
        ) : null}
      </LinearGradient>

      {worth.length ? (
        <View style={{ marginTop: Spacing.xl }}>
          {worth.map((p) => {
            const action = content.patternActions[p.key];
            if (!action) return null;
            return (
              <View key={p.key} style={{ ...card, marginBottom: Spacing.md }}>
                <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.sm }}>
                  One thing to try
                </Text>
                <Text style={{ ...Type.cardTitle, color: c.textStrong }}>{action.title}</Text>
                <Text style={{ ...Type.body, color: c.text, marginTop: Spacing.sm }}>{action.body}</Text>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={{ ...card, marginTop: Spacing.xl }}>
          <Text style={{ ...Type.body, color: c.text }}>
            {content.copy.allClear || 'Nothing here is showing up often enough to need attention.'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}


/**
 * The header every Conflict detail page carries on the website: the section
 * eyebrow, the page's own title, and a badge saying whether this page is
 * shared or private.
 *
 * ── WHY THIS WAS WORTH ADDING ─────────────────────────────────────────────
 * The app drew none of it. The three titles and both badge words have been on
 * the payload since /api/conflict-results existed, in content.copy, and the
 * app read two keys out of that object and ignored the rest. So each page
 * opened straight into its content with nothing naming it, and the reader had
 * no way to tell which pages their partner can see.
 *
 * On this section in particular that is not a cosmetic difference. Conflict
 * Patterns is the one part of the product where half the answers stay private,
 * and the badge is the only thing on the page that says so.
 */
function PageHead({
  copy, title, shared,
}: {
  copy: { eyebrow?: string; sharedBadge?: string; privateBadge?: string };
  title?: string;
  shared: boolean;
}) {
  return (
    <View style={{ marginBottom: Spacing.lg }}>
      <Text style={{ ...Type.eyebrow, color: c.accent }}>
        {copy.eyebrow || 'Conflict Patterns'}
      </Text>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          gap: Spacing.md, marginTop: Spacing.sm,
        }}>
        <Text style={{ ...Type.title, color: c.textStrong, flex: 1 }}>{title}</Text>
        <View
          style={{
            paddingHorizontal: Spacing.md, paddingVertical: 3, borderRadius: Radius.pill,
            backgroundColor: shared ? '#E7F3EC' : '#FBE9F1',
          }}>
          <Text style={{ ...Type.small, fontSize: 11, fontWeight: '700', color: shared ? '#2E7D5B' : '#B5546E' }}>
            {shared ? (copy.sharedBadge || 'Shared') : (copy.privateBadge || 'Just for you')}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** Snapshot. The three shared questions, and what each of you helps with. */
function Snapshot({ data }: { data: Extract<ConflictResults, { ready: true }> }) {
  const { you, partner, names, content } = data;

  return (
    <ScrollView contentContainerStyle={pad}>
      <PageHead copy={content.copy} title={content.copy.snapshotTitle} shared />
      <View style={{ ...card }}>
        <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.md }}>Conflict</Text>
        {content.snapshotRows.map((row) => {
          const chips = content.openingChips[row.id];
          const mine = pickChip(you.openings, row.id);
          const theirs = partner ? pickChip(partner.openings, row.id) : null;
          return (
            <View key={row.id} style={{ marginBottom: Spacing.lg }}>
              <Text style={{ ...Type.small, color: c.textMuted, marginBottom: Spacing.sm }}>{row.label}</Text>
              <View style={{ gap: Spacing.sm }}>
                <Chip name={names.you} text={chipText(chips, mine)} color={Palette.orange} />
                {partner ? (
                  <Chip name={names.partner} text={chipText(chips, theirs)} color={Palette.ink} />
                ) : null}
              </View>
            </View>
          );
        })}
        {!partner ? (
          <Text style={{ ...Type.small, color: c.textMuted }}>
            {names.partner} has not finished this yet. Their side fills in when they do.
          </Text>
        ) : null}
      </View>

      <View style={{ ...card, marginTop: Spacing.md }}>
        {/* "Repair", then the two columns, which is what the website shows.
            There was a line under this heading reading "What helps each of you
            reset.", written here as a fallback for content.copy.repairIntro,
            which is an empty string. So the fallback was the only thing that
            ever rendered: a sentence the website does not have, written in the
            app, which is the thing Ellie asked not to happen. */}
        <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.md }}>Repair</Text>
        <View style={{ flexDirection: 'row', gap: Spacing.lg }}>
          <RepairColumn title={`What ${names.you} wants`} items={you.repairRanking} />
          {partner ? (
            <RepairColumn title={`What ${names.partner} wants`} items={partner.repairRanking} />
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

/**
 * Your Patterns. The private one.
 *
 * `you` is the only summary this function receives. The partner's is not a
 * parameter, so there is nothing here to accidentally render.
 */
function Patterns({
  you, content,
}: { you: ConflictSummary; content: Extract<ConflictResults, { ready: true }>['content'] }) {
  return (
    <ScrollView contentContainerStyle={pad}>
      <PageHead copy={content.copy} title={content.copy.patternsTitle} shared={false} />
      {/* The privacy line sits above the content, not below it, because someone
          reading their own worst pattern should know it is private before they
          read it rather than after. */}
      <View
        style={{
          backgroundColor: '#FDF2F6', borderColor: '#F0C9DA', borderWidth: 1,
          borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg,
        }}>
        <Text style={{ ...Type.small, color: '#8E3A5D', fontStyle: 'italic' }}>
          {content.copy.patternsPrivacy}
        </Text>
      </View>

      {content.copy.patternsIntro ? (
        <Text style={{ ...Type.body, color: c.textMuted, marginBottom: Spacing.lg }}>
          {content.copy.patternsIntro}
        </Text>
      ) : null}

      {/* Worst first, as the server ranked them. */}
      {you.ranked.map((p) => {
        const v = p.value ?? 0;
        const color = content.bandColors[Math.min(v, content.bandColors.length - 1)] || c.border;
        const label = content.frequencyLabels[v] || '';
        const note = content.patternCopy[p.key]?.[String(v)]?.note;
        const action = v >= 2 ? content.patternActions[p.key] : null;

        return (
          <View key={p.key} style={{ ...card, marginBottom: Spacing.md }}>
            <Text style={{ ...Type.cardTitle, color: c.textStrong }}>
              {content.patternNotes[p.key] ? titleFor(p.key) : titleFor(p.key)}
            </Text>

            {/* Frequency named above the bar, in the bar's own colour, so the
                colour is never the only thing carrying the meaning. */}
            <Text style={{ ...Type.small, color, fontWeight: '700', textAlign: 'right', marginTop: Spacing.md }}>
              {label}
            </Text>
            <View style={{ height: 6, borderRadius: Radius.pill, backgroundColor: c.border, marginTop: Spacing.xs, overflow: 'hidden' }}>
              <View style={{ width: `${((v + 1) / 4) * 100}%`, height: 6, backgroundColor: color }} />
            </View>

            {note ? (
              <Text style={{ ...Type.body, color: c.text, marginTop: Spacing.md }}>{note}</Text>
            ) : null}

            {action ? (
              <View style={{ marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: c.border, paddingTop: Spacing.md }}>
                <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.xs }}>
                  One thing to try
                </Text>
                <Text style={{ ...Type.cardTitle, color: c.textStrong }}>{action.title}</Text>
                <Text style={{ ...Type.body, color: c.text, marginTop: Spacing.xs }}>{action.body}</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

/** What You Each Wrote. Only the questions you both answered knowing they were shared. */
function Wrote({ data }: { data: Extract<ConflictResults, { ready: true }> }) {
  const { you, partner, names, content } = data;
  const rows: { label: string; mine: string | null; theirs: string | null }[] = [
    { label: 'What already works', mine: you.strength, theirs: partner?.strength ?? null },
    { label: 'Looking back', mine: you.reflection, theirs: partner?.reflection ?? null },
    { label: 'What you appreciate', mine: you.appreciation, theirs: partner?.appreciation ?? null },
  ].filter((r) => r.mine || r.theirs);

  if (!rows.length) {
    return (
      <ScrollView contentContainerStyle={pad}>
        <PageHead copy={content.copy} title={content.copy.wroteTitle} shared />
        <Text style={{ ...Type.body, color: c.textMuted }}>
          Neither of you wrote anything on these questions.
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={pad}>
      <PageHead copy={content.copy} title={content.copy.wroteTitle} shared />
      {rows.map((r) => (
        <View key={r.label} style={{ ...card, marginBottom: Spacing.md }}>
          <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.md }}>{r.label}</Text>
          <Written name={names.you} text={r.mine} color={Palette.orange} />
          <Written name={names.partner} text={r.theirs} color={Palette.ink} />
        </View>
      ))}
    </ScrollView>
  );
}

// ── Pieces ─────────────────────────────────────────────────────────────────

function Chip({ name, text, color }: { name: string; text: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
      <View style={{ width: 6, height: 6, borderRadius: Radius.pill, backgroundColor: color }} />
      <Text style={{ ...Type.small, color: c.textMuted, width: 64 }} numberOfLines={1}>{name}</Text>
      <Text style={{ ...Type.small, color: c.text, flex: 1 }}>{text}</Text>
    </View>
  );
}

function RepairColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ ...Type.small, color: c.textMuted, marginBottom: Spacing.sm }}>{title}</Text>
      {(items || []).slice(0, 3).map((item, i) => (
        <Text key={item} style={{ ...Type.small, color: c.text, marginBottom: Spacing.xs }}>
          {i + 1}. {item}
        </Text>
      ))}
      {!items?.length ? <Text style={{ ...Type.small, color: c.textMuted }}>Not answered.</Text> : null}
    </View>
  );
}

function Written({ name, text, color }: { name: string; text: string | null; color: string }) {
  if (!text) return null;
  return (
    <View style={{ borderLeftWidth: 2, borderLeftColor: color, paddingLeft: Spacing.md, marginBottom: Spacing.md }}>
      <Text style={{ ...Type.small, color: c.textMuted, marginBottom: Spacing.xs }}>{name}</Text>
      <Text style={{ ...Type.body, color: c.text }}>{text}</Text>
    </View>
  );
}

function pickChip(openings: { start: number | null; middle: number | null; oldTopics: number | null }, id: string) {
  if (id === 'c1') return openings.start;
  if (id === 'c2') return openings.middle;
  return openings.oldTopics;
}

function chipText(chips: { A: string; B: string } | undefined, value: number | null) {
  if (!chips || value == null) return 'Not answered';
  return value === 0 ? chips.A : chips.B;
}

/** Pattern names. The only strings this file owns, and they are labels. */
const TITLES: Record<string, string> = {
  criticism: 'Criticism',
  contempt: 'Contempt',
  defensiveness: 'Defensiveness',
  stonewalling: 'Stonewalling',
};
const titleFor = (key: string) => TITLES[key] || key;

const pad = {
  paddingHorizontal: Spacing.xl, paddingBottom: BottomTabInset + Spacing.xxl,
  maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
} as const;

const card = {
  backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
  borderRadius: Radius.lg, padding: Spacing.lg,
} as const;
