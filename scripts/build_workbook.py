"""
Attune Workbook Sample Generator
=================================
Generates a full workbook sample (cover + intro + snapshot + Part 1
dimensions + expectations + Parts 2-5) as a single HTML file.
Designed to mirror the page structure of api/generate-workbook.js so
the design can be ported back to the real generator once approved.

Two modes:

  Local sample (default):
    python3 build_workbook.py
    Writes /mnt/user-data/outputs/attune_workbook_sample.html using the
    hardcoded Maya & David sample data below.

  Service mode (production):
    python3 build_workbook.py --from-stdin > out.html
    Reads JSON from stdin matching the COUPLE shape (see sample below)
    and writes the rendered HTML to stdout. Used by the production
    workbook service. The caller is responsible for transforming the
    buildWorkbookPayload shape from src/App.jsx into the COUPLE shape
    documented below, and for converting the output HTML to PDF (the
    sibling render_workbook.mjs Playwright script does this).
"""
import sys
import json
from pathlib import Path

# ═══════════════════════════════════════════════════════════════════
# CONTENT DATA — mirrored from api/_workbook-content.js
# ═══════════════════════════════════════════════════════════════════

DIMS = ['energy','expression','needs','bids','conflict','repair','listening','love','stress','feedback']

DIM_META = {
    'energy':     {'label': 'Energy & Recharge',           'left': 'Inward',         'right': 'Outward',          'color': 'purple'},
    'expression': {'label': 'Emotional Expression',         'left': 'Guarded',        'right': 'Expressive',       'color': 'coral'},
    'needs':      {'label': 'How You Ask for Needs',        'left': 'Direct',         'right': 'Indirect',         'color': 'indigo'},
    'bids':       {'label': 'Bids for Connection',           'left': 'Reserved',       'right': 'Attuned',          'color': 'green'},
    'conflict':   {'label': 'Conflict Style',               'left': 'Engage quickly', 'right': 'Needs space first','color': 'indigo'},
    'repair':     {'label': 'How You Repair',               'left': 'Formal / verbal','right': 'Informal / warmth','color': 'coral'},
    'listening':  {'label': 'How You Listen',               'left': 'Reflective',     'right': 'Responsive',       'color': 'purple'},
    'love':       {'label': 'How Love Lands',               'left': 'Words',          'right': 'Actions & Presence','color': 'green'},
    'stress':     {'label': 'Communication Under Stress',   'left': 'Withdraw',       'right': 'Seek connection',  'color': 'indigo'},
    'feedback':   {'label': 'Giving & Receiving Feedback',  'left': 'Guarded',        'right': 'Open',             'color': 'coral'},
}

DIM_CONTENT = {
    'energy': {
        'measures': "How each of you recovers, socially, emotionally, physically. Inward: solitude recharges. Outward: connection recharges. This shapes your weekend default, how you decompress, and what a good evening looks like.",
        'closeText': "{U} and {P} recover in similar ways. This quietly removes friction, you're rarely on opposite ends after a hard week.",
        'gapText': "One of you recharges through solitude; the other through connection. After a long week, you're in very different places. Without a framework, the inward partner's need for quiet can read as withdrawal, and the outward partner's reach for people can feel exhausting.",
        'prompts': [
            "After a big social event, what does each of you need in the next 24 hours?",
            "When does one of you feel most energized, and when does the other feel most depleted?",
            "Is your current daily rhythm giving each person the kind of recovery they need?",
        ],
        'thisWeek': "Pick one upcoming situation likely to produce different energy states, a party, a family visit, a busy week. Before it happens, name what you'll each need afterward. Then check in.",
    },
    'expression': {
        'measures': "How freely each of you shares what's going on internally, not the content of feelings, but how naturally they surface. Expressive partners wear their emotional state; guarded partners process privately and share selectively.",
        'closeText': "{U} and {P} are operating in the same register. Neither tends to feel overwhelmed by too much sharing or starved by too little.",
        'gapText': "One of you shares as feelings arise; the other waits until they've processed. The expressive partner may experience the guarded one's silence as emotional unavailability. The guarded partner may experience the expressive one's openness as pressure.",
        'prompts': [
            "When something bothers you, at what point do you typically share it, immediately, after processing, or only when asked?",
            "When one of you is struggling, does the other know? Or is it usually carried privately?",
            "Is there a version of your emotional experience you share, and a version you hold back?",
        ],
        'thisWeek': "Each of you shares one thing you'd normally hold back or let pass, not something big, just something that's been sitting there. Notice what happens.",
    },
    'needs': {
        'measures': "How directly each partner communicates needs, whether they ask outright or signal indirectly. Direct communicators state needs explicitly. Indirect communicators hint, hope to be noticed, or pull back.",
        'closeText': "{U} and {P} communicate needs with similar directness. There are fewer unspoken expectations, and less of the resentment that builds when needs go unnamed.",
        'gapText': "One of you asks directly; the other signals. The direct partner may feel set up to fail, they can't respond to what they can't see. The indirect partner may feel chronically unseen.",
        'prompts': [
            "Think of the last time you needed something and didn't get it. Did you ask directly, or did you signal?",
            "Is there something you've needed for a while that you haven't said clearly? What's the barrier?",
            "Do you each know what the other needs right now? Has it been said, or are you guessing?",
        ],
        'thisWeek': "Each of you names one thing you need from the other this week, specifically, without softening. \"I need you to ___.\" Notice what it feels like to ask that clearly.",
    },
    'bids': {
        'measures': "How reliably each partner notices and responds to small, everyday bids for connection, a comment, a gesture, a look. These micro-moments are the primary currency of sustained intimacy.",
        'closeText': "{U} and {P} both notice and respond naturally to each other's small bids. This is one of the strongest predictors of relationship satisfaction over time.",
        'gapText': "One partner tends to miss bids, absorbed in tasks, not naturally tracking the relational current. The other tracks them instinctively. Repeated missed bids can feel like dismissal even when none is intended.",
        'prompts': [
            "Can you think of a recent moment when one of you reached for connection and the other wasn't available?",
            "Are there ways either of you reaches for the other that get regularly missed, not out of rejection, but out of being absorbed?",
            "What's the smallest thing each of you does that signals you want the other's attention?",
        ],
        'thisWeek': "Once a day this week, when one of you makes a small bid, says something minor, reaches out physically, checks in, the other stops what they're doing and acknowledges it specifically.",
    },
    'conflict': {
        'measures': "How each partner responds when something feels wrong, whether the instinct is to engage immediately or need space first. This is about timing, not care.",
        'closeText': "{U} and {P} move toward resolution with similar timing. This symmetry removes the most common friction point in conflict, the pursuer-withdrawer dynamic.",
        'gapText': "One of you needs to address things immediately; the other needs space first. Without a framework, the person who needs resolution reads the other's silence as avoidance. The person who needs space reads the other's urgency as pressure.",
        'prompts': [
            "When something is bothering you, what does your ideal next few hours look like?",
            "When one of you is clearly upset and pulls back, what does that feel like for the other? What does the other do?",
            "What agreement would make the next hard moment go better than the last?",
        ],
        'thisWeek': "When things are calm, not during conflict, tell each other: \"When I'm upset, what I need first is ___.\" Write it down. Refer to it next time.",
    },
    'repair': {
        'measures': "What each partner needs to feel genuinely repaired after conflict. One end needs explicit verbal acknowledgment. The other can move forward once the warmth is back, without needing the formal exchange.",
        'closeText': "{U} and {P} both know what \"okay again\" feels like and reach it in similar ways. This shortens the distance between conflict and repair.",
        'gapText': "One of you considers things resolved when warmth returns. The other isn't repaired until there's been an explicit conversation. The informal partner often considers things over before the formal partner is ready.",
        'prompts': [
            "After a hard argument, what does \"okay again\" actually feel like for you? How do you know when you're there?",
            "What would a repair conversation look like that actually works for both of you?",
            "Is there a past disagreement that never fully closed? What would it take to finish it?",
        ],
        'thisWeek': "After the next friction moment, however small, check in explicitly: \"Are we actually okay, or are we both just ready to be done?\" Name the difference out loud.",
    },
    'listening': {
        'measures': "How each of you shows you are listening. Reflective: you go quiet and stay with it. Responsive: you engage, ask, reflect back. Both are attention. They just look nothing alike from the outside.",
        'closeText': "{U} and {P} listen in similar ways. That works until one of you needs the other mode. Ask which one is wanted before you give it.",
        'gapText': "One of you listens by going quiet. The other listens by engaging and drawing it out. The quiet can read as absence. The questions can read as pressure. Neither is what is happening.",
        'prompts': [
            "When you are upset, do you want to be heard quietly or drawn out with questions?",
            "Has one of you ever read the other's quiet as checking out? What was actually going on?",
            "What is a small signal you could give that says 'I'm still with you' without breaking the silence?",
        ],
        'thisWeek': "Before the next hard conversation, say which one you want: presence or engagement. One sentence, before you start.",
    },
    'love': {
        'measures': "How each partner most naturally gives and receives affection. Specifically: does verbal expression land most deeply, or does love register more through presence, action, and shared experience?",
        'closeText': "{U} and {P} express and receive love through compatible channels. When care is expressed in a language the other naturally receives, the signal lands without translation.",
        'gapText': "One of you feels most loved through verbal affirmation; the other through presence, touch, or shared activity. Both may be genuinely expressing love, but in a language the other doesn't fully receive.",
        'prompts': [
            "When did each of you last feel genuinely loved by the other? What was happening?",
            "What does each of you do that makes the other feel most cared for, even if it's something small?",
            "Do you each know specifically how to make the other feel appreciated?",
        ],
        'thisWeek': "Each of you asks the other: \"What's one thing I do that makes you feel really loved that I might not realize has that effect?\" Then do more of it.",
    },
    'stress': {
        'measures': "How each partner's communication style shifts when they're overwhelmed, anxious, or depleted. Some people shut down; others become more urgent and seek reassurance. Neither is a statement about the relationship, it's a stress response.",
        'closeText': "{U} and {P} respond to stress in similar ways. This symmetry means neither partner is likely to be left alone in the way that matters most when pressure builds.",
        'gapText': "Under pressure, one of you shuts down; the other becomes more urgent and reaches for closeness. Without language for this, the seeking partner reads withdrawal as rejection; the withdrawing partner reads urgency as escalation.",
        'prompts': [
            "When either of you is really under pressure, what do you need from the other? Does the other know?",
            "How does each of you know when the other is struggling, even when they're not saying so?",
            "What's the most helpful thing someone can do when you're at your worst?",
        ],
        'thisWeek': "Next time one of you is clearly under pressure, the other asks: \"Do you need me to help fix something, or do you just need me to be here?\" Notice which answer comes back. Do that.",
    },
    'feedback': {
        'measures': "How comfortably each partner gives and receives direct, honest feedback. Guarded partners tend toward defensiveness. Open partners can engage with critical input without feeling attacked.",
        'closeText': "{U} and {P} are in a similar place on feedback. This creates a low-friction environment for honest conversations, things that need to be said, get said.",
        'gapText': "One of you avoids direct feedback; the other can engage with it. The open partner may feel like things go unsaid for too long. The guarded partner may feel like honest observations come as attacks, even when not intended that way.",
        'prompts': [
            "Is there something either of you does regularly that bothers the other that hasn't been said clearly? What's the barrier?",
            "When one of you offers a critical observation, what's the other's first instinct?",
            "What would make honest feedback easier in both directions?",
        ],
        'thisWeek': "Identify one small thing that bothered you recently that you let go without saying anything. Bring it up briefly, specifically: \"Hey, this thing last week, can I mention it?\" Notice what happens.",
    },
}

# WHEN_THIS_SHOWS_UP. Per-couple-type prose for each dimension.
# 10 dimensions × 10 couple types = 100 blurbs.
# Source of truth: api/_workbook-content.js. Loaded at module init so
# the Python builder and the production JS endpoint stay in sync.
import re as _re
import json as _json
from pathlib import Path as _Path
import base64 as _base64


# ─── Font embedding ─────────────────────────────────────────────────
# Font files are loaded from the npm @fontsource packages (installed in
# node_modules/) and embedded as base64 data URIs in @font-face rules.
# This makes the rendered HTML self-contained: zero network dependency
# on fonts.googleapis.com or fonts.gstatic.com. Critical for containerized
# rendering (Render, Docker) where egress to Google's CDN can be slow,
# blocked, or just inconsistent enough to produce inconsistent renders.
#
# Falls back to <link> tags if the npm packages aren't installed —
# preserves local-dev behavior for anyone who hasn't run `npm install`.

_FONT_FACES = [
    # (family, style, weight, fontsource subpath relative to node_modules)
    ('Playfair Display', 'normal', 400, '@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff2'),
    ('Playfair Display', 'italic', 400, '@fontsource/playfair-display/files/playfair-display-latin-400-italic.woff2'),
    ('Playfair Display', 'normal', 700, '@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff2'),
    ('Playfair Display', 'italic', 700, '@fontsource/playfair-display/files/playfair-display-latin-700-italic.woff2'),
    ('DM Sans', 'normal', 300, '@fontsource/dm-sans/files/dm-sans-latin-300-normal.woff2'),
    ('DM Sans', 'normal', 400, '@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2'),
    ('DM Sans', 'normal', 500, '@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff2'),
    ('DM Sans', 'normal', 600, '@fontsource/dm-sans/files/dm-sans-latin-600-normal.woff2'),
    ('DM Sans', 'normal', 700, '@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff2'),
    ('DM Mono', 'normal', 400, '@fontsource/dm-mono/files/dm-mono-latin-400-normal.woff2'),
    ('DM Mono', 'normal', 500, '@fontsource/dm-mono/files/dm-mono-latin-500-normal.woff2'),
]


def _build_font_face_block():
    """Return the <head> font-loading block.

    If the @fontsource npm packages are installed locally, emit @font-face
    rules with base64-embedded WOFF2 files (self-contained, no network
    dependency). Otherwise fall back to the original Google Fonts <link>
    tags (lets the script run in environments without npm install).

    Looks for fonts in two places, in order:
    1. ../node_modules/@fontsource/...  (when run from scripts/ in the
       repo root layout — local dev and the Docker /app/scripts layout)
    2. /app/node_modules/@fontsource/... (Docker fallback)
    """
    candidate_roots = [
        _Path(__file__).parent.parent / 'node_modules',
        _Path('/app/node_modules'),
    ]
    fontsource_root = None
    for root in candidate_roots:
        if (root / '@fontsource').exists():
            fontsource_root = root
            break

    if fontsource_root is None:
        # Network fallback. Used in environments where node_modules isn't
        # populated — local Python-only checkouts, etc. Production
        # service-mode renders should always hit the inline path.
        return (
            '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
            '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
            '<link href="https://fonts.googleapis.com/css2?'
            'family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&'
            'family=DM+Sans:wght@300;400;500;600;700&'
            'family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">'
        )

    # All required files must be present, otherwise something's wrong
    # with the install and we'd rather see the error than a half-fallback.
    missing = []
    for family, style, weight, subpath in _FONT_FACES:
        if not (fontsource_root / subpath).exists():
            missing.append(subpath)
    if missing:
        raise RuntimeError(f"Missing font files: {missing[:3]}... (run `npm install` to fetch @fontsource packages)")

    rules = []
    for family, style, weight, subpath in _FONT_FACES:
        font_bytes = (fontsource_root / subpath).read_bytes()
        b64 = _base64.b64encode(font_bytes).decode('ascii')
        rules.append(
            f"@font-face{{"
            f"font-family:'{family}';"
            f"font-style:{style};"
            f"font-weight:{weight};"
            f"font-display:block;"
            f"src:url(data:font/woff2;base64,{b64}) format('woff2');"
            f"}}"
        )
    return '<style>' + ''.join(rules) + '</style>'

def _load_when_this_shows_up():
    """Parse the WHEN_THIS_SHOWS_UP export from api/_workbook-content.js.

    The JS file is the single source of truth. Both the Python sample
    builder and the production JS endpoint should read from the same data.
    Extracted via a tolerant regex parse rather than a full JS parser
    because we only need the simple {dim: {type: "string"}} structure.
    """
    js_path = _Path(__file__).parent.parent / 'api' / '_workbook-content.js'
    text = js_path.read_text()
    m = _re.search(r'export const WHEN_THIS_SHOWS_UP\s*=\s*\{(.+?)\n\};', text, _re.DOTALL)
    if not m:
        raise RuntimeError("Could not locate WHEN_THIS_SHOWS_UP in api/_workbook-content.js")
    block = m.group(1)
    # Each top-level dim: { ...10 type entries... }
    dim_pattern = _re.compile(r'(\w+):\s*\{(.+?)\n\s{2}\}', _re.DOTALL)
    type_pattern = _re.compile(r'\b([WXYZ]{2}):\s*"((?:[^"\\]|\\.)*)"', _re.DOTALL)
    out = {}
    for dim_match in dim_pattern.finditer(block):
        dim_name = dim_match.group(1)
        body = dim_match.group(2)
        type_dict = {}
        for tm in type_pattern.finditer(body):
            type_id = tm.group(1)
            blurb = tm.group(2).encode().decode('unicode_escape')
            type_dict[type_id] = blurb
        out[dim_name] = type_dict
    return out

WHEN_THIS_SHOWS_UP_BY_TYPE = _load_when_this_shows_up()

# GAP_BLURBS. Per-dimension prose for each gap state.
# 10 dimensions × 3 gap states = 30 blurbs. Universal across couple types.
# These are the "first paragraph" in the dimension callout. The second
# paragraph is the couple-type blurb above. Voice: declarative, no em
# dashes, no hedging. Each blurb describes the gap mechanic itself.
#
# Source of truth: api/_workbook-content.js (GAP_BLURBS export). Loaded
# at module init so the Python builder and the production JS endpoint
# stay in sync.
def _load_gap_blurbs():
    """Parse GAP_BLURBS export from api/_workbook-content.js."""
    js_path = _Path(__file__).parent.parent / 'api' / '_workbook-content.js'
    text = js_path.read_text()
    m = _re.search(r'export const GAP_BLURBS\s*=\s*\{(.+?)\n\};', text, _re.DOTALL)
    if not m:
        raise RuntimeError("Could not locate GAP_BLURBS in api/_workbook-content.js")
    block = m.group(1)
    dim_pattern = _re.compile(r'(\w+):\s*\{(.+?)\n\s{2}\}', _re.DOTALL)
    state_pattern = _re.compile(r'(aligned|some_gap|notable_gap):\s*"((?:[^"\\]|\\.)*)"', _re.DOTALL)
    out = {}
    for dim_match in dim_pattern.finditer(block):
        dim_name = dim_match.group(1)
        body = dim_match.group(2)
        state_dict = {}
        for sm in state_pattern.finditer(body):
            state_id = sm.group(1)
            blurb = sm.group(2).encode().decode('unicode_escape')
            state_dict[state_id] = blurb
        out[dim_name] = state_dict
    return out

GAP_BLURBS = _load_gap_blurbs()

EXP_DOMAINS = [
    {'key': 'household',  'label': 'Visible Household Labor',  'color': 'gold',
     # Three alignment-state blurbs (75+/40-74/0-39)
     'compatibleText':   "Your expectations about who runs the household are broadly aligned. The division of labor probably feels chosen, not negotiated each week.",
     'discussText':      "You see the household differently in places. Some of these gaps are probably running in the background, costing more than you realize.",
     'differentText':    "You hold significantly different pictures of how the household runs. This is where most slow-build resentment in long relationships originates.",
     'thisWeek':  "Separately, list the household tasks you currently own, the ones you think the other owns, and the ones falling through the cracks. Compare the lists without judgment."},
    {'key': 'emotional',  'label': 'Emotional & Invisible Labor',  'color': 'coral',
     'compatibleText':   "You see the invisible work of the relationship in similar terms. The mental load, the remembering, the repair, you both clock it.",
     'discussText':      "Some of the invisible labor is being carried unevenly, and at least one of you may not fully see it. Worth surfacing before it accumulates.",
     'differentText':    "One of you is carrying significantly more of the invisible labor. This work is usually unacknowledged and unreciprocated, not from malice but from genuine unawareness.",
     'thisWeek':  "For one week, the partner who typically carries more mental load keeps a simple log, every act of invisible labor they perform. At the end of the week, share it. Don't frame it as an accusation. Just show what's there."},
    {'key': 'extended_family',  'label': 'Extended Family',  'color': 'plum',
     'compatibleText':   "You see the work of family across both sides as broadly shared. Visits, contact, gifts, neither of you is doing a job the other doesn't notice.",
     'discussText':      "You see the family-side work differently in places. Some of it is quietly carried by one of you, often along the lines of whose family it is. Worth saying out loud.",
     'differentText':    "You hold significantly different pictures of who's doing the family work. The unevenness usually surfaces as the holiday conversation that takes a year to actually have.",
     'thisWeek':  "Pick one upcoming family event, a visit, a holiday, a check-in call. Each of you names what you'd like the other to do, before the week of arrives."},
    {'key': 'money',  'label': 'Money, Work & Career',  'color': 'indigo',
     'compatibleText':   "Your orientations on money and career are broadly compatible. You probably move through major financial decisions without much friction.",
     'discussText':      "You diverge in places on how money should be held or whose work leads. These are the questions that compound, worth talking through with specifics.",
     'differentText':    "You hold significantly different views on money or career priority. Differences here tend to surface during big decisions, often when there is least time to discuss them.",
     'thisWeek':  "Each of you answers: \"The financial situation that would make me feel most secure is ___.\" Share them. Don't solve, just understand where each person's sense of security lives."},
    {'key': 'life',  'label': 'Life Together',  'color': 'green',
     'compatibleText':   "You picture the bigger questions of your life together in similar terms. Family, where you live, what matters, you are pointed in compatible directions.",
     'discussText':      "You picture some of the foundational pieces of your shared life differently. These are the assumptions worth saying out loud before time makes them harder to revisit.",
     'differentText':    "You hold significantly different pictures of the life you are building. Differences this large tend to compound, but only if they stay unspoken.",
     'thisWeek':  "Write down, separately, then share, one sentence about what you want your shared life to look like in five years. Don't edit for what you think the other wants to hear."},
]

# Domain icon glyphs (rendered in the page header).
DOMAIN_ICONS = {
    'household':       '⌂',
    'emotional':       '∞',
    'extended_family': '❦',
    'money':           '$',
    'life':            '❀',
}

# Universal row labels per domain. The values that appear next to
# each label come from each couple's actual exercise responses.
# Pulled from the v2 expectations content review doc that Ellie approved.
DOMAIN_ROWS = {
    'household': [
        'Cooking weeknights',
        'Grocery & meal planning',
        'Day-to-day tidying',
        'Home repairs & maintenance',
        'Family calendar',
        'Hosting & holidays',
        'Vacation planning',
    ],
    'emotional': [
        'Mental load',
        'Tracking how everyone is',
    ],
    # Extended Family rows are name-substituted at render time. The
    # placeholders {U} and {P} resolve to the user/partner names. Four
    # rows total, each tied to one of the four responsibility items in
    # App.jsx RESPONSIBILITY_CATEGORIES.extended_family.
    'extended_family': [
        "Visits with {U}'s family",
        "Visits with {P}'s family",
        "Gifting for {U}'s family",
        "Gifting for {P}'s family",
    ],
    'money': [
        'Day-to-day finances',
        'Long-term financial decisions',
        'Whose career is prioritized',
        'How we hold money',
        'Saving v spending',
        'Risk tolerance',
    ],
    'life': [
        'Children',
        'When family & partner conflict',
        'Where we live',
        'Social life',
        'Daily rhythm',
        'Faith & spirituality',
        'Core values & beliefs',
    ],
}

# Threshold helpers for alignment percentages.
def alignment_state(pct):
    """Return ('compatible'|'discuss'|'different', label) for a given percent."""
    if pct >= 75:
        return 'compatible', 'broadly compatible'
    if pct >= 40:
        return 'discuss', 'worth discussing'
    return 'different', 'significantly different expectations'

def alignment_text(domain, pct):
    """Return the right state-prose blurb from a domain dict."""
    state, _ = alignment_state(pct)
    if state == 'compatible':
        return domain['compatibleText']
    if state == 'discuss':
        return domain['discussText']
    return domain['differentText']

MOMENTS = [
    {'key': 'hard_workday',     'title': 'After a hard workday'},
    {'key': 'quiet_worry',      'title': "When they're worried but haven't said it"},
    {'key': 'during_conflict',  'title': 'During a disagreement'},
    {'key': 'after_conflict',   'title': 'After a disagreement'},
    {'key': 'wanting_closeness','title': 'When they want to feel close'},
    {'key': 'external_stress',  'title': 'When stress is coming from outside the relationship'},
]

# Working Knowledge content — 6 moments × 4 individual types (W/X/Y/Z).
# For cross-type couples, each partner gets their own page, drawn from
# the dict keyed by their individual type letter. Names are inserted
# at render via fill() — content uses {U} for the subject (the partner
# being described) and {P} for the other partner.
#
# Each moment has 5 fields:
#   moment / happening / not / works / phrase
#
# Voice:
#   Short declarative sentences. No em dashes. No hedging language.
#   "they/them/their" pronouns throughout for inclusivity. Neither end
#   of any dimension framed as better. Couple type described as a
#   dynamic, not a diagnosis.
#
# CONTENT STATUS:
#   W and X content is the original Maya/David Volume 01 prose, now
#   name-neutralized so any couple of those types renders correctly.
#   Y and Z content is a first draft based on the type definitions
#   (Y = Feeler, withdraw + open; Z = Protector, withdraw + guarded).
#   Both Y and Z drafts are flagged for LMFT review before launch.

# W = The Initiator (engage + open). Processes by talking, reaches outward.
MOMENTS_W = {
    'hard_workday':      {
        'moment':   "{U} gets home from a hard day and starts unpacking it the moment they walk in: the project, the people, the frustration.",
        'happening':"{U} processes by talking. They're not asking {P} to fix it; they're making sense of the day by hearing themselves say it. Once it's said, most of it's out of their system and they can move on.",
        'not':      "Don't problem-solve, don't try to redirect, don't go quiet halfway through.",
        'works':    "Listen actively. Reflect back what you heard. Match their energy and ask one or two follow-up questions. The relief comes from being heard, not from being fixed.",
        'phrase':   "Tell me more, what was the worst part?",
    },
    'quiet_worry':       {
        'moment':   "{U} has gone unusually quiet for half a day: no talking through their week, no debriefing the meeting.",
        'happening':"For {U}, silence is the signal that something is heavy enough that even the talking has stopped. They're not sulking; they're carrying something they haven't found words for yet.",
        'not':      "Don't ask 'what's wrong' as a one-shot question. It lands like pressure to perform an answer.",
        'works':    "Soften the entry. Sit near them without requiring conversation. Open with curiosity, not interrogation. Give them room to start when they're ready.",
        'phrase':   "You've been quiet today. I'm here when you want to talk, no rush.",
    },
    'during_conflict':   {
        'moment':   "Tension is rising. {U} is leaning in, wanting to address it now, surface the feelings, talk it through.",
        'happening':"{U} processes conflict outward. Holding it in feels worse than the conflict itself. They want to engage so the thing can move, not so it can escalate.",
        'not':      "Don't go silent or ask to 'talk later' without a specific time. Open-ended pauses register as withdrawal, not space.",
        'works':    "Stay engaged. If you genuinely need a beat, name it with a return time: 'I need 30 minutes, then let's pick this up.' Then come back on time.",
        'phrase':   "I want to work this out with you. Give me 20 minutes to think, then I'm in.",
    },
    'after_conflict':    {
        'moment':   "The hard part of the conversation is over. The room has cooled, but {U} is still circling, checking in, looking for closure.",
        'happening':"For {U}, repair isn't done until it's named. They need to hear that you're okay, that the two of you are okay. Warmth alone reads as 'maybe but not sure.'",
        'not':      "Don't assume warmth equals resolved. Don't skip the verbal close.",
        'works':    "Say it out loud, even if it feels obvious. A short, clear sentence ('we're good') does more than another hour of warmth.",
        'phrase':   "We're good. I love you. We worked it out.",
    },
    'wanting_closeness': {
        'moment':   "{U} is reaching: sitting closer, finding excuses to be in the same room, asking what you're up to this weekend.",
        'happening':"Closeness is one of the ways {U} feels the relationship is alive. The bids look casual; the meaning behind them isn't.",
        'not':      "Don't half-meet the bid. A distracted nod while you keep working reads as a no.",
        'works':    "Stop what you're doing for thirty seconds. Make eye contact. Match their energy briefly, even if you're going back to your task. The bid landing matters more than how long it lands for.",
        'phrase':   "Hey, hi. Come here for a sec, what's going on?",
    },
    'external_stress':   {
        'moment':   "{U} is dealing with something hard: a work crisis, a family thing, a deadline. They're reaching toward you for support.",
        'happening':"Under pressure, {U} reaches outward. They're not asking you to fix it; they're asking you to be present in it. Solitude is what makes the stress worse, not better.",
        'not':      "Don't disappear into your own work. Don't assume they'd rather be left alone.",
        'works':    "Be visibly available. Take one logistical thing off their plate without being asked, and tell them you did. Sit with them in the evening even if neither of you talks.",
        'phrase':   "I've got dinner tonight. You don't have to think about it.",
    },
}

# X = The Anchor (engage + guarded). Engages with conflict but processes
# emotion privately first; surfaces things once they're clarified.
MOMENTS_X = {
    'hard_workday':      {
        'moment':   "{U} gets home from a hard day, sets their bag down, and goes quiet for a while.",
        'happening':"{U} is processing internally. They're not shutting {P} out; they're getting their thoughts in order before they can say anything useful about them. The quiet IS the work.",
        'not':      "Don't pepper them with questions. Don't read the silence as withdrawal. Don't assume the quiet means something is wrong with the two of you.",
        'works':    "Give them 15-30 minutes of low-stimulation space. Make space without requiring conversation. They'll come find you when they're ready, and what they say will be considered.",
        'phrase':   "Take the time you need. I'm around when you want to talk.",
    },
    'quiet_worry':       {
        'moment':   "Something is clearly weighing on {U}, but they haven't said anything about it.",
        'happening':"{U} doesn't broadcast worry. They're working through it privately first. Until they've clarified what they actually think, the answer to 'what's wrong' is genuinely 'I'm not sure yet.'",
        'not':      "Don't push for an answer they don't have yet. Don't translate their silence into 'they're hiding something from me.'",
        'works':    "Name the observation, not the feeling. 'You've seemed off since Tuesday' lands cleanly because it's factual. Then give them space to respond on their own clock.",
        'phrase':   "You've been somewhere else this week. No rush. I'm just noticing.",
    },
    'during_conflict':   {
        'moment':   "Tension is rising. {U} wants to address it, but they're pulling on logic before feeling: facts first, framing second.",
        'happening':"{U} engages with conflict by getting the structure right. Once the logic is clear, the emotional layer becomes manageable. Skipping to feelings before the framing exists makes them feel ungrounded.",
        'not':      "Don't read their focus on logic as not caring. Don't try to force the emotional layer first when they're still organizing the framing.",
        'works':    "Match their sequence: agree on what the issue actually is, then surface the feelings. Both layers get covered, just in their order.",
        'phrase':   "Walk me through how you're seeing it. Then I'll tell you how it lands for me.",
    },
    'after_conflict':    {
        'moment':   "The conversation has ended. The logic is sorted out. {U} is moving forward like the thing is closed.",
        'happening':"For {U}, repair happens when the problem is solved. Once the working-through is done, they experience the thing as resolved. The verbal close-out feels redundant to them.",
        'not':      "Don't assume their moving on means they don't care. Don't withhold warmth waiting for a verbal close that they don't realize you need.",
        'works':    "Ask for the verbal close explicitly. They'll give it readily; they just don't realize it's missing. After that, trust that they mean it when they say it's done.",
        'phrase':   "Are we good? I just want to hear you say it.",
    },
    'wanting_closeness': {
        'moment':   "{U} is in the same room with you, doing their own thing, but consciously near you. Not bidding, exactly. Just present.",
        'happening':"For {U}, side-by-side presence is the closeness. They don't always need conversation to feel connected; the shared space is the thing. The reading you might call 'just sitting there' is, for them, an active form of being together.",
        'not':      "Don't read their quiet presence as disengagement. Don't assume they want to be left alone if they chose to be near you.",
        'works':    "Receive the presence. A hand on their arm, a small acknowledgment, that's enough. Don't require a conversation to make the closeness count.",
        'phrase':   "I like that you're here. We don't have to talk.",
    },
    'external_stress':   {
        'moment':   "{U} is dealing with something hard. They're working it internally, not bringing it into the room, not asking for help.",
        'happening':"Under stress, {U} goes inward. They're not refusing support; they're running the analysis. Once they have a plan, they'll surface what's relevant. Until then, talking about it can feel like adding load, not lifting it.",
        'not':      "Don't push them to talk through it. Don't take the silence as exclusion or as a sign you're not trusted.",
        'works':    "Take logistical things off their plate without asking. Be visibly available without requiring engagement. Tell them after the fact that you did the thing.",
        'phrase':   "I picked up groceries, one less thing. Take the night.",
    },
}

# Y = The Feeler (withdraw + open). Processes inwardly, but emotion shows
# in expression: face, tone, presence. Withdraws under pressure but tells
# you what they're feeling when there's room.
# DRAFT — pending LMFT review.
MOMENTS_Y = {
    'hard_workday':      {
        'moment':   "{U} gets home from a hard day, drops their things, and the day is on their face before any words come.",
        'happening':"{U} is feeling the day in their body before they can articulate it. The expression is honest but the words aren't ready yet. They want to be near you, not necessarily talking.",
        'not':      "Don't ask 'how was your day' and expect a clean answer. Don't read the heaviness as something you caused.",
        'works':    "Acknowledge what you see, then offer presence without requiring talk. 'Rough one?' lands. So does sitting nearby with no agenda. The words come later, in pieces.",
        'phrase':   "You look wiped. I'm here. No talking required.",
    },
    'quiet_worry':       {
        'moment':   "{U} has been off all week. They haven't said much, but the heaviness is there in the room.",
        'happening':"{U} feels things first and finds language for them slowly. The worry is real and present; they just haven't reached the words for it yet. They're not hiding it; they're still feeling it.",
        'not':      "Don't push for specifics they don't have. Don't tell them they're being too sensitive.",
        'works':    "Name what you're noticing gently. 'You've felt heavy this week' invites more than 'what's wrong.' Sit with whatever surfaces, even if it's tears before sentences.",
        'phrase':   "Something's been heavy. I see it. I'm not going anywhere.",
    },
    'during_conflict':   {
        'moment':   "Tension is rising. {U} is pulling back from the conversation, but their face hasn't gone neutral. The hurt is right there.",
        'happening':"{U} feels conflict in their body before they can think through it. They withdraw to protect the feeling, not to punish you. If they push past the withdrawal too soon, the words come out raw and wrong.",
        'not':      "Don't read the withdrawal as the silent treatment. Don't push them to articulate what they're feeling before they've named it for themselves.",
        'works':    "Acknowledge the feeling without demanding the explanation. 'I can see this hurt. Take what you need; we'll come back to it' gives them the room to find words.",
        'phrase':   "I see this landed hard. Let's pause. I'll be here when you're ready.",
    },
    'after_conflict':    {
        'moment':   "The hard part is over. {U} has gone quiet, but the residue is still on their face.",
        'happening':"For {U}, repair has to reach the feeling, not just the topic. Until the emotional charge has eased, they don't experience the thing as resolved, even if the issue itself is sorted.",
        'not':      "Don't move on too fast. Don't assume topic-resolution equals emotional-resolution.",
        'works':    "Give the feeling a name and a moment. 'That was hard for both of us' acknowledges it without re-litigating. Soft physical contact often does more than another conversation.",
        'phrase':   "That was hard. I love you. Come here.",
    },
    'wanting_closeness': {
        'moment':   "{U} is hovering: in the same room, doing nothing in particular, looking up when you look up.",
        'happening':"{U} reaches for closeness through presence and feeling, not always through asking. The bid is in the lingering, the eye contact, the just-being-near. Saying 'come sit with me' takes more vulnerability than the gesture suggests.",
        'not':      "Don't miss the soft bid because it's quiet. Don't make them ask out loud when they've already asked with their body.",
        'works':    "Read the gesture. Pat the seat next to you. Make eye contact and hold it for two extra seconds. The reach was already real; you're just confirming it.",
        'phrase':   "Come sit. I want you here.",
    },
    'external_stress':   {
        'moment':   "{U} is dealing with something hard from outside the relationship. They're carrying it in their face but not bringing it into words.",
        'happening':"Under pressure, {U} goes inward emotionally. The feelings are loud internally; the expression is half-volume. They want presence and steady ground, not problem-solving.",
        'not':      "Don't try to fix the outside thing. Don't take the heaviness personally.",
        'works':    "Be the steady ground. Make the meals, run the warm bath, hold the routine. Touch their shoulder when you walk past. Less talk, more presence.",
        'phrase':   "I've got the basics tonight. You don't have to carry anything else.",
    },
}

# Z = The Protector (withdraw + guarded). Processes inwardly, keeps the
# emotional state private. Self-contained; expression stays steady even
# when a lot is going on inside.
# DRAFT — pending LMFT review.
MOMENTS_Z = {
    'hard_workday':      {
        'moment':   "{U} gets home from a hard day, follows their normal routine, and reveals nothing.",
        'happening':"{U} contains hard days. The processing happens privately and at its own pace. Performing a debrief would actually make the day worse, not better. Steady routine is how they reset.",
        'not':      "Don't ask probing questions hoping to crack it open. Don't take the steadiness as a sign nothing's wrong.",
        'works':    "Hold the regular rhythm. Make eye contact when they pass through the room. Trust that they'll surface what they want surfaced, on their schedule.",
        'phrase':   "Glad you're home. Dinner's at seven.",
    },
    'quiet_worry':       {
        'moment':   "Something is going on for {U}, but you'd only know it from very small cues: a shorter answer, a longer pause, a missed text.",
        'happening':"{U} keeps worry close. They aren't hiding it from you so much as managing it themselves first. By the time they speak about something, they've usually already decided how they're handling it.",
        'not':      "Don't translate the small cues into a story about your relationship. Don't push for the worry before they've decided how to talk about it.",
        'works':    "Stay normal. Stay attentive. A simple 'I'm here, whenever' carries more than a probing question. When they do speak, listen without trying to solve.",
        'phrase':   "I noticed. I'm here whenever, no pressure.",
    },
    'during_conflict':   {
        'moment':   "Tension is rising. {U} has gone level: voice steady, language careful, conflict approached like a problem to manage.",
        'happening':"{U} stays composed in conflict by design. The composure is the strategy: emotional flooding makes things worse, so they keep their own temperature down. Inside the calm, real feelings are still moving; they're just not on the surface.",
        'not':      "Don't read the calm as not caring. Don't push for emotional volume to prove the thing matters.",
        'works':    "Match the temperature. Stay specific. Resolve the concrete piece in front of you; the feelings can come later, in private. Trust that 'fine' said calmly is sometimes the most honest version they have.",
        'phrase':   "Let's solve this piece. We can talk about the rest tonight.",
    },
    'after_conflict':    {
        'moment':   "The conversation is done. {U} returns to their evening like nothing major happened.",
        'happening':"For {U}, the resolution IS moving on. Re-opening the topic to confirm warmth would feel like re-running the conflict. Their normal-ness is the closure they're offering you.",
        'not':      "Don't keep checking in on whether you're 'really okay.' Don't read their normalcy as avoidance.",
        'works':    "Receive the normal as the close. A small physical gesture, sitting next to them, a hand on the back, lands cleanly without re-opening anything.",
        'phrase':   "Good talk. Glad we sorted it.",
    },
    'wanting_closeness': {
        'moment':   "{U} is doing something for you without making a thing of it: making coffee the way you like, fixing the thing on your car, sitting nearby while you're on a call.",
        'happening':"{U} offers closeness through action and steady presence. The verbal version of love is harder to reach for; the doing is the saying. If you watch what they do, the love is loud.",
        'not':      "Don't miss the offering because it isn't said. Don't push for words to confirm what the actions already proved.",
        'works':    "Receive the action and name what it meant: 'thanks for taking care of that, it mattered.' That kind of return is how the loop closes for them.",
        'phrase':   "I noticed you did that. Thank you.",
    },
    'external_stress':   {
        'moment':   "{U} is dealing with something hard outside the relationship. They've absorbed it and kept going. The shape of the day looks normal.",
        'happening':"Under pressure, {U} goes self-contained. Asking for help feels like adding cost, not relieving load. They'd rather hold it themselves and protect you from carrying it too.",
        'not':      "Don't pry for the details. Don't make them perform reassurance that they're 'fine.'",
        'works':    "Reduce ambient load without making it a transaction. Handle one normal thing without comment. Be physically present without requiring conversation. They feel supported when the friction quietly drops.",
        'phrase':   "I've got tonight. You don't have to do anything.",
    },
}

# Lookup table by individual type letter. Drives the cross-type code
# path in build_full_workbook. The same-type path uses the same letters
# but reads from MOMENTS_SHARED_* instead.
TYPE_MOMENTS = {
    'W': MOMENTS_W,
    'X': MOMENTS_X,
    'Y': MOMENTS_Y,
    'Z': MOMENTS_Z,
}

# Backward-compat aliases so any older imports still work
MOMENTS_FOR_W_MAYA = MOMENTS_W
MOMENTS_FOR_X_DAVID = MOMENTS_X

# ─── Same-type Working Knowledge content ────────────────────────────────
# When both partners share the same individual type (e.g., WW), the moments
# read symmetrically. No partner is the "subject" and the other the "responder".
# The phrasing addresses the dynamic between two same-type partners and the
# specific traps that show up when the shared wiring mirrors instead of balances.
#
# This block covers same-type W pairings (Initiator + Initiator). Three more
# blocks (XX, YY, ZZ) need to be written for the other same-type pairings.
MOMENTS_SHARED_W = {
    'hard_workday': {
        'moment':   "One of you walks in mid-story. The other is also full of the day. Both have something they want to land first.",
        'happening': "Two Ws come home wanting to externalize. The talking is the processing. Neither of you has finished the day until you've said it out loud. When you both arrive full at the same time, you can talk over each other instead of taking turns.",
        'not':      "Half-listening while waiting for your turn. The other person feels the half-attention and pushes harder, which makes you tune out more.",
        'works':    "Whoever walks in first gets ten minutes to download. The other holds the receiving role with full attention. Then switch. The container makes the listening easier.",
        'phrase':   "I need ten minutes to dump the day, then I'm yours.",
    },
    'quiet_worry': {
        'moment':   "One of you has gone unusually quiet. For Ws, silence at home is a flag. Something is heavy enough to interrupt the normal flow of talking.",
        'happening': "Two Ws are unusually attuned to each other's verbal patterns because both of you use words to feel okay. When one of you stops talking, the other notices fast. The risk is reading the silence wrong.",
        'not':      "Filling the silence with theories. 'Are you upset with me? Did something happen?' That's interrogation, not listening.",
        'works':    "Acknowledge the silence without trying to break it. Sit nearby. Make space without making demands. Let the other person come to language at their own pace.",
        'phrase':   "I notice you're quiet. No pressure. I'm here when you're ready.",
    },
    'during_conflict': {
        'moment':   "Tension is rising. Both of you are leaning in, both of you want to address it now, both of you are talking. The volume creeps up.",
        'happening': "Ws don't want conflict to sit. You both want it surfaced and resolved. That's the strength. The risk is two engaged Ws can talk over each other, escalate together, and lose the thread of the actual fight.",
        'not':      "Talking faster, louder, more. Neither of you stepping back because stepping back feels like losing. The argument is still happening but you've stopped hearing each other.",
        'works':    "When the volume rises, the first one to feel it calls a 30-minute reset. Not 'we're done talking,' just a pause. Come back with the same intensity but with one specific thing to resolve.",
        'phrase':   "I need 30 minutes. I'm not done, but I want to say this better.",
    },
    'after_conflict': {
        'moment':   "The hard part is over. You've both said what needed saying. The room is quieter, but the thing isn't quite closed yet.",
        'happening': "Both of you need verbal repair to feel done. A nod or a hug isn't enough. For Ws, the closure happens when one of you names it out loud.",
        'not':      "Assuming the other is done because you're done. Or circling back into it because the relief hasn't landed yet.",
        'works':    "One of you names the close. A short clear sentence. Not a recap, just a flag that you're both okay. The other confirms back.",
        'phrase':   "We're good. I love you. We worked it out.",
    },
    'wanting_closeness': {
        'moment':   "One of you is reaching. Sitting closer, asking what the other is up to, finding excuses to be in the same room.",
        'happening': "Bids for closeness in a W-W pair often look like conversation starters. Casual questions, light topics, low-stakes ramble. The actual ask is presence, not the topic.",
        'not':      "Half-meeting it. Answering the question while keeping your eyes on your screen. Two Ws can both be reaching at the same time and both miss the bid.",
        'works':    "Stop what you're doing for thirty seconds. Make eye contact. Match the energy briefly. The bid landing matters more than how long it lasts.",
        'phrase':   "Hey. What's going on with you right now?",
    },
    'external_stress': {
        'moment':   "One of you is dealing with something hard. Work, family, a deadline. They're reaching toward the relationship, not retreating from it.",
        'happening': "Under pressure, Ws reach outward. Not to be fixed. To be present in. The risk in a W-W pair is that when you're both stressed at the same time, both of you are reaching, and neither of you is anchored.",
        'not':      "Trading stress stories. Both venting at the same time, neither actually landing. You leave the conversation more wound up than you started.",
        'works':    "When you're both in it, one takes the anchoring role for an hour. Listen to the other's stress fully, hold it, then switch. Sequential, not parallel.",
        'phrase':   "Yours first tonight. I want to hear it before I bring mine in.",
    },
}

SITUATIONS = [
    {'key': 'quiet_night',       'title': 'At dinner on a quiet night',                 'blurb': 'Low-stakes depth.'},
    {'key': 'after_hard_week',   'title': 'After a hard week',                          'blurb': 'Mutual care.'},
    {'key': 'one_is_off',        'title': "When one of you is off but won't say why",   'blurb': 'Gentle excavation.'},
    {'key': 'before_hard',       'title': 'Before a difficult conversation',            'blurb': 'Setting it up.'},
    {'key': 'tired_of_logistics','title': "When you're tired of talking about logistics",'blurb': 'Romance restoration.'},
]

# Five prompts per situation, written in the Attune voice
SITUATION_PROMPTS = {
    'quiet_night': [
        "What's something you noticed this week that you didn't tell me about yet?",
        "What's one thing you're thinking about lately that I probably don't know?",
        "If you had a completely free Saturday next month, what would you actually want to do?",
        "What's a compliment about you that you don't quite believe?",
        "What's something small I could start doing that would make your weeks a little easier?",
    ],
    'after_hard_week': [
        "What was the hardest part of this week, not the busiest, the hardest?",
        "What do you need for the rest of tonight? I'll work around it.",
        "Is there anything you wish I'd noticed this week that I didn't?",
        "What would help you feel like yourself again tomorrow?",
        "Do you want to process out loud, or would distraction help more right now?",
    ],
    'one_is_off': [
        "Something feels off to me, and I'm not sure what. Do you know what it is?",
        "I'm not trying to fix anything. I just want to know what's there.",
        "If you could name one thing that's been sitting in the background, what would it be?",
        "Is it me, or is it something else? Either answer is okay.",
        "Do you want to talk now, or would it be easier later?",
    ],
    'before_hard': [
        "Before I say this, what do you need from me to hear it well?",
        "I want to talk about something hard. Can we agree we're on the same team first?",
        "This isn't urgent, but I want to bring it up when you have capacity. When's good?",
        "If this goes sideways, how do we want to come back to it?",
        "I've been sitting with something. Can I tell you what it is before we try to solve it?",
    ],
    'tired_of_logistics': [
        "What's something we used to do that I miss and haven't named?",
        "When did we last have a conversation that wasn't about the calendar?",
        "What's one thing we could take off our list this week, just to have time back?",
        "What do you actually think about, when you're not thinking about logistics?",
        "If we had one extra hour tomorrow with no obligations, how should we spend it?",
    ],
}

# ═══════════════════════════════════════════════════════════════════
# DEMO DATA — Maya & David, WX couple type ("The Jumpstart")
# ═══════════════════════════════════════════════════════════════════

COUPLE = {
    'u': 'Maya',   # user (W = The Initiator, engages, expresses)
    'p': 'David',  # partner (X = The Anchor, engages, processes privately)
    'together': 'Together, four years',
    'couple_type': {
        'id': 'WX',
        'name': 'The Jumpstart',
        'subtitle': 'initiator-anchor',
        'tagline': 'Both want resolution. Different approaches heading in the same direction.',
        'description': "{U} and {P} both move toward resolution when things get hard, you're pulling in the same direction. Where you differ is in how the internal experience travels: one processes outward, and one holds it closer. The destination is the same. The path there looks different.",
        'phrase_that_lands': "I need to process this out loud, bear with me. I don't have it figured out yet.",
    },
    # Edition number is no longer surfaced anywhere customer-visible per
    # Ellie's spec. Kept here for internal versioning only.
    'edition_internal': '0247',
    'date': 'April 2026',
    # WX scores. Both engage quickly (low conflict scores), but differ on
    # expression, repair style, listening, love, stress, feedback.
    'scores': {
        'energy':     (4.0, 3.4),  # both center-warm, small gap
        'expression': (4.5, 2.3),  # W open, X guarded, notable gap
        'needs':      (2.0, 2.2),  # both direct (low = direct), aligned
        'bids':       (4.3, 3.6),  # W more attuned, small gap
        'conflict':   (1.8, 2.0),  # both engage quickly, aligned
        'repair':     (4.0, 2.4),  # W informal/warmth, X formal/verbal, notable gap
        'listening':  (4.5, 2.8),  # W responsive, X reflective, notable gap
        'love':       (2.0, 4.2),  # W words, X actions, notable gap
        'stress':     (4.2, 1.8),  # W seek connection, X withdraw, notable gap
        'feedback':   (4.2, 2.5),  # W open, X guarded, notable gap
    },
    # Expectations alignment percentages per the new 5-domain model.
    # Computed in production from each row's match credit.
    'expectations': {
        'household':       82,
        'emotional':       48,
        'extended_family': 67,
        'money':           78,
        'life':            73,
    },
    # Per-domain row values. Keys MUST match DOMAIN_ROWS labels exactly.
    # Each value is what shows in the bold column on the workbook page.
    # In production: pulled from real exercise responses. For sample:
    # representative answers that demonstrate each alignment state.
    'expectations_detail': {
        'household': {
            'maya':  [('Cooking weeknights', 'Both of us'), ('Grocery & meal planning', 'Maya'), ('Day-to-day tidying', 'Both of us'), ('Home repairs & maintenance', 'David'), ('Family calendar', 'Maya'), ('Hosting & holidays', 'Both of us'), ('Vacation planning', 'Both of us')],
            'david': [('Cooking weeknights', 'Both of us'), ('Grocery & meal planning', 'Both of us'), ('Day-to-day tidying', 'Maya'), ('Home repairs & maintenance', 'David'), ('Family calendar', 'Both of us'), ('Hosting & holidays', 'Both of us'), ('Vacation planning', 'Maya')],
        },
        'emotional': {
            'maya':  [('Mental load', 'Maya'), ('Tracking how everyone is', 'Maya')],
            'david': [('Mental load', 'Both of us'), ('Tracking how everyone is', 'Both of us')],
        },
        'extended_family': {
            'maya':  [("Visits with Maya's family", 'Maya'), ("Visits with David's family", 'Both of us'), ("Gifting for Maya's family", 'Maya'), ("Gifting for David's family", 'Both of us')],
            'david': [("Visits with Maya's family", 'Maya'), ("Visits with David's family", 'David'), ("Gifting for Maya's family", 'Maya'), ("Gifting for David's family", 'David')],
        },
        'money': {
            'maya':  [('Day-to-day finances', 'Both of us'), ('Long-term financial decisions', 'Both of us'), ('Whose career is prioritized', 'Both of us'), ('How we hold money', 'Mostly combined'), ('Saving v spending', 'Lean saving'), ('Risk tolerance', 'Comfortable')],
            'david': [('Day-to-day finances', 'David'), ('Long-term financial decisions', 'Both of us'), ('Whose career is prioritized', 'Both of us'), ('How we hold money', 'Mostly combined'), ('Saving v spending', 'Lean saving'), ('Risk tolerance', 'Cautious')],
        },
        'life': {
            'maya':  [('Children', 'Want at least one'), ('When family & partner conflict', 'Side with partner'), ('Where we live', 'Strong preference'), ('Social life', 'Balanced'), ('Daily rhythm', 'Loose'), ('Faith & spirituality', 'Personal'), ('Core values & beliefs', 'Closely aligned')],
            'david': [('Children', 'Want at least one'), ('When family & partner conflict', 'Mediate'), ('Where we live', 'Wherever'), ('Social life', 'Quiet'), ('Daily rhythm', 'Loose'), ('Faith & spirituality', 'Personal'), ('Core values & beliefs', 'Closely aligned')],
        },
    },
}

# Compute the gap and alignment status for each dimension
def gap_status(score_u, score_p):
    gap = abs(score_u - score_p)
    if gap < 0.8:
        return 'aligned', gap
    elif gap < 1.5:
        return 'some_gap', gap
    else:
        return 'notable_gap', gap

# ═══════════════════════════════════════════════════════════════════
# UTILITIES
# ═══════════════════════════════════════════════════════════════════

def fill(text, u, p):
    """Substitute {U} and {P} placeholders with names."""
    return text.replace('{U}', u).replace('{P}', p)

def percent_position(score):
    """Map 1-5 score to 0-100% position."""
    return (score - 1) / 4 * 100

# ═══════════════════════════════════════════════════════════════════
# CSS — single source of truth for the design system
# ═══════════════════════════════════════════════════════════════════

CSS = r"""
:root{
  --cream:#FFFDF9; --cream-warm:#FBF6EE; --shell:#F8EDE0; --linen:#F1E5D2;
  --bone:#F5EFE3;
  --ink:#0E0B07; --graphite:#332A20; --slate:#5A4D3F; --muted:#8C7A68;
  --hairline:#E2D5C2; --hairline-soft:#EFE7DA;
  --coral:#E8673A; --coral-deep:#C2410C; --coral-tint:#FFF0E6; --coral-soft:#F08966;
  --indigo:#1B5FE8; --indigo-deep:#1E3A8A; --indigo-tint:#EBE9F8;
  --purple:#9B5DE5; --purple-deep:#6B2BB8; --purple-tint:#F3EEFF;
  --green:#10B981; --green-deep:#047857; --green-tint:#E7FAF1;
  --plum:#6B2C5A; --plum-tint:#F8EFF4;
  --navy:#2D2250;
  --gold:#C17F47; --gold-deep:#9B5D2A; --gold-tint:#FBF1E3;
  --hfont:'Playfair Display',Georgia,serif;
  --bfont:'DM Sans',system-ui,sans-serif;
  --mono:'DM Mono',ui-monospace,monospace;
}

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:16px}
body{
  background:#E8DDD0;
  font-family:var(--bfont);
  color:var(--ink);
  -webkit-font-smoothing:antialiased;
  padding:48px 24px;
}

/* ── PAGE FRAME ──────────────────────────────────────────────── */
.page{
  width:8.5in;
  height:11in;
  background:var(--cream);
  margin:0 auto 36px;
  position:relative;
  overflow:hidden;
  box-shadow:0 1px 2px rgba(0,0,0,.04), 0 24px 60px rgba(60,30,10,.18);
}
.page-inner{padding:.85in .9in}
.page-num{
  position:absolute;bottom:.4in;right:.9in;
  font-family:var(--mono);font-size:9.5px;letter-spacing:.18em;
  color:var(--muted);text-transform:uppercase;font-weight:500;
}
.page-running-head{
  position:absolute;top:.4in;left:.9in;right:.9in;
  display:flex;justify-content:space-between;align-items:baseline;
  font-family:var(--bfont);font-size:9.5px;letter-spacing:.22em;
  color:var(--muted);text-transform:uppercase;font-weight:600;
}

/* Common eyebrow */
.eyebrow{
  display:inline-flex;align-items:center;gap:14px;
  font-family:var(--bfont);font-size:10px;letter-spacing:.18em;
  text-transform:uppercase;font-weight:700;
}
.eyebrow::before{content:"";width:36px;height:1px;background:currentColor;flex-shrink:0}

.display-title{
  font-family:var(--hfont);font-weight:700;
  line-height:1.02;letter-spacing:-.028em;color:var(--ink);
}
.display-title em{font-style:italic;font-weight:700}

/* Section intro pages (Section A, Section B, etc.): live between part covers
   and content. Smaller heading + tighter top so they don't read as covers. */
.section-intro{
  margin-top:.42in;max-width:5.6in;
}
.section-intro-eye{margin-bottom:18px}
.section-intro-title{
  font-family:var(--hfont);font-weight:700;
  font-size:2.6rem;line-height:1.04;letter-spacing:-.022em;
  color:var(--ink);margin:0;
}
.section-intro-title em{font-style:italic;font-weight:700}
.section-intro-lead{
  font-family:var(--hfont);font-style:italic;font-size:1rem;
  line-height:1.55;color:var(--graphite);
  margin-top:1.1rem;
}
.section-intro-rule{
  height:1px;background:var(--hairline);
  margin:.42in 0 .26in;width:100%;
}
.section-intro-foot{
  font-family:var(--bfont);font-size:.86rem;line-height:1.7;
  color:var(--slate);margin:0;
}

/* ── COVER ───────────────────────────────────────────────────── */
.cover{
  background:linear-gradient(165deg,#1A1232 0%,#2D2250 50%,#1E3A6E 100%);
  color:white;
  overflow:hidden;
  position:relative;
}
.cover::before{
  content:"";position:absolute;inset:0;
  background:
    radial-gradient(ellipse 50% 35% at 80% 25%,rgba(232,103,58,.25),transparent 65%),
    radial-gradient(ellipse 45% 40% at 18% 75%,rgba(155,93,229,.22),transparent 60%);
  pointer-events:none;
}
.cover::after{
  content:"";position:absolute;inset:0;opacity:.18;pointer-events:none;
  background-image:radial-gradient(circle at 1px 1px,rgba(255,255,255,.4) 1px,transparent 0);
  background-size:14px 14px;
  mix-blend-mode:soft-light;
}
.cover-top-stripe{
  position:absolute;top:0;left:0;right:0;height:5px;
  background:linear-gradient(90deg,#E8673A 0%,#9B5DE5 50%,#1B5FE8 100%);
  z-index:2;
}
.cover-grid{
  position:relative;z-index:2;
  height:11in;display:grid;
  grid-template-rows:auto 1fr auto auto auto;
  padding:1in .9in .85in;
}
.cover-mark{
  display:flex;align-items:center;gap:14px;
  font-family:var(--bfont);font-size:11px;letter-spacing:.2em;
  text-transform:uppercase;font-weight:700;color:rgba(255,255,255,.85);
}
.cover-mark-rule{width:42px;height:1px;background:#E8673A}
.cover-edition{
  display:flex;justify-content:flex-end;align-items:flex-start;
  font-family:var(--mono);font-size:9.5px;letter-spacing:.16em;
  color:rgba(255,255,255,.5);text-transform:uppercase;
  margin-top:auto;margin-bottom:.4in;
}
.cover-edition span{margin-left:18px}
.cover-title-block{margin-top:auto}
.cover-tagline{
  font-family:var(--hfont);font-style:italic;font-weight:700;
  font-size:1.55rem;line-height:1.35;
  color:rgba(255,255,255,.85);
  max-width:6in;margin-bottom:.7in;letter-spacing:.005em;
}
.cover-title{
  font-family:var(--hfont);font-weight:700;
  font-size:7.4rem;line-height:.92;
  letter-spacing:-.03em;
  color:white;
}
.cover-title em{font-style:italic;font-weight:700;color:#FBA67E;display:block}
.cover-meta{
  margin-top:.55in;
  display:grid;grid-template-columns:1fr 1fr 1fr;gap:.3in;
  border-top:1px solid rgba(255,255,255,.18);
  padding-top:.35in;
}
.cover-meta-cell{display:flex;flex-direction:column;gap:6px}
.cover-meta-label{
  font-family:var(--bfont);font-size:9px;letter-spacing:.18em;
  text-transform:uppercase;color:rgba(232,103,58,.95);font-weight:700;
}
.cover-meta-value{
  font-family:var(--hfont);font-size:1.4rem;font-weight:700;
  color:white;letter-spacing:-.012em;line-height:1.1;
}
.cover-meta-value em{font-style:italic;color:rgba(255,255,255,.55);font-weight:400}
.cover-meta-sub{font-family:var(--bfont);font-size:11px;color:rgba(255,255,255,.55);margin-top:2px}

/* ── TOC ──────────────────────────────────────────────────────── */
.toc-page-header{
  padding-bottom:.32in;border-bottom:1px solid var(--ink);
  margin-bottom:.32in;
  display:flex;justify-content:space-between;align-items:baseline;
}
.toc-page-eye{color:var(--coral-deep)}
.toc-page-stamp{
  font-family:var(--mono);font-size:9.5px;letter-spacing:.18em;
  color:var(--muted);text-transform:uppercase;
}
.toc-page-title{
  font-family:var(--hfont);font-size:2.6rem;font-weight:700;
  line-height:1;letter-spacing:-.026em;color:var(--ink);
  margin-bottom:.28in;
}
.toc-page-title em{font-style:italic;color:var(--coral-deep);font-weight:700}

.toc-section{margin-bottom:.18in}
.toc-section-eye{
  display:flex;align-items:center;gap:14px;
  font-family:var(--bfont);font-size:9.5px;letter-spacing:.18em;
  text-transform:uppercase;font-weight:700;
  margin-bottom:6px;
}
.toc-section-eye::before{content:"";width:24px;height:1px;background:currentColor;flex-shrink:0}
.toc-section-title-row{
  display:grid;grid-template-columns:1fr auto;align-items:baseline;
  border-bottom:1px solid var(--ink);
  padding-bottom:5px;margin-bottom:4px;
}
.toc-section-title{
  font-family:var(--hfont);font-size:1.2rem;font-weight:700;
  letter-spacing:-.018em;color:var(--ink);line-height:1.15;
}
.toc-section-title em{font-style:italic;font-weight:700}
.toc-section-page{
  font-family:var(--mono);font-size:.92rem;font-weight:500;color:var(--ink);
}

.toc-row{
  display:grid;grid-template-columns:1fr auto;
  align-items:baseline;gap:14px;
  padding:3px 0;
  border-bottom:1px dotted var(--hairline);
}
.toc-row.indent{padding-left:.3in}
.toc-row.indent2{padding-left:.6in}
.toc-row-label{
  font-family:var(--hfont);font-size:.88rem;font-weight:400;
  color:var(--graphite);letter-spacing:-.008em;
}
.toc-row-label.italic{font-style:italic;color:var(--muted)}
.toc-row-page{
  font-family:var(--mono);font-size:9px;color:var(--muted);font-weight:500;
  letter-spacing:.04em;
}

.toc-part-eye-blue{color:var(--indigo-deep)}
.toc-part-eye-purple{color:var(--purple-deep)}
.toc-part-eye-orange{color:var(--coral-deep)}
.toc-part-eye-green{color:var(--green-deep)}

/* ── INTRO PAGE ──────────────────────────────────────────────── */
.intro-grid{
  display:grid;grid-template-columns:1.7fr 1fr;
  gap:.5in;
  margin-top:.4in;
  padding-top:.35in;
  border-top:1px solid var(--hairline);
}
.intro-display{
  font-size:3.6rem;letter-spacing:-.03em;
  margin-bottom:.32in;
}
.intro-display em{color:var(--coral-deep)}
.intro-lead{
  font-family:var(--hfont);font-style:italic;font-weight:700;
  font-size:1.1rem;line-height:1.5;color:var(--graphite);
  max-width:5in;margin-bottom:.3in;
}
.intro-body p{
  font-size:.86rem;line-height:1.7;color:var(--slate);
  font-weight:400;margin-bottom:.85em;
  max-width:4.6in;
}
.intro-body p:last-child{margin-bottom:0}
.intro-body strong{color:var(--ink);font-weight:600}
.intro-aside{
  background:var(--bone);
  padding:1.2rem 1.25rem;
  border-left:3px solid var(--coral-deep);
  align-self:start;
}
.intro-aside-title{
  font-family:var(--hfont);font-weight:700;font-size:1rem;
  letter-spacing:-.014em;margin-bottom:.55em;
}
.intro-aside p{
  font-size:.78rem;line-height:1.6;color:var(--slate);font-weight:400;
  margin-bottom:.7em;
}
.intro-aside p:last-child{margin-bottom:0}
.intro-aside-divider{
  height:1px;background:var(--hairline);margin:.75rem 0;
}
.intro-aside-cite{
  font-family:var(--bfont);font-size:9.5px;letter-spacing:.2em;
  text-transform:uppercase;font-weight:600;color:var(--muted);line-height:1.7;
}

/* ── SNAPSHOT ─────────────────────────────────────────────────── */
.snapshot-header{
  display:flex;justify-content:space-between;align-items:flex-end;
  padding-bottom:.14in;border-bottom:1px solid var(--hairline);
  margin-bottom:.16in;
}
.snapshot-title{font-size:2.2rem;letter-spacing:-.028em;line-height:1.04}
.snapshot-title em{color:var(--coral-deep)}
.snapshot-stamp{
  text-align:right;
  font-family:var(--mono);font-size:9px;letter-spacing:.16em;
  color:var(--muted);text-transform:uppercase;line-height:1.7;
  white-space:nowrap;
}
.snapshot-stamp strong{color:var(--ink);font-weight:500}
.snapshot-stamp-row{display:block;white-space:nowrap}

.couple-capsule{
  background:var(--bone);
  border:1px solid var(--hairline);
  padding:.6rem 1rem;margin-bottom:.16in;
  display:grid;grid-template-columns:auto 1fr;gap:1rem;align-items:center;
}
.couple-capsule-mark{
  width:50px;height:50px;border-radius:50%;
  background:linear-gradient(140deg,var(--coral-deep),var(--purple-deep));
  color:white;display:flex;align-items:center;justify-content:center;
  font-family:var(--hfont);font-size:1.3rem;font-weight:700;font-style:italic;
  letter-spacing:-.02em;flex-shrink:0;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.18);
}
.couple-capsule-text{display:flex;flex-direction:column;gap:2px}
.couple-capsule-eye{
  font-family:var(--bfont);font-size:8.5px;letter-spacing:.18em;
  text-transform:uppercase;font-weight:700;color:var(--coral-deep);
}
.couple-capsule-name{
  font-family:var(--hfont);font-size:1.2rem;font-weight:700;
  letter-spacing:-.018em;color:var(--ink);
}
.couple-capsule-name em{font-style:italic;color:var(--muted);font-weight:400}
.couple-capsule-sub{font-size:.78rem;color:var(--slate);line-height:1.45;font-weight:400}

.snap-section-title{
  font-family:var(--bfont);font-size:9px;letter-spacing:.18em;
  text-transform:uppercase;font-weight:700;color:var(--muted);
  margin-bottom:8px;
  padding-bottom:6px;border-bottom:1px solid var(--hairline);
}

/* Dimension table, tightened to fit all 10 dimensions on one page */
.dim-table{display:flex;flex-direction:column}
.dim-row{
  display:grid;grid-template-columns:1.7in 1fr;
  gap:.22in;align-items:center;
  padding:.04rem 0;
}
.dim-row-num{
  font-family:var(--mono);font-size:9px;letter-spacing:.06em;
  color:var(--muted);font-weight:500;
}
.dim-row-label{
  font-family:var(--hfont);font-size:.86rem;font-weight:700;
  letter-spacing:-.012em;color:var(--ink);line-height:1.15;display:block;margin-top:1px;
}
.dim-row-poles{
  font-family:var(--bfont);font-size:8.5px;color:var(--muted);
  display:flex;justify-content:space-between;line-height:1.1;
  letter-spacing:.04em;
}
.dim-row-scale{
  position:relative;height:24px;
  background:transparent;
}
.dim-row-scale-track{
  position:absolute;left:0;right:0;top:50%;height:1px;
  background:var(--hairline);transform:translateY(-50%);
}
.dim-row-scale-tick{
  position:absolute;top:50%;width:1px;height:5px;
  background:var(--hairline);transform:translateY(-50%);
}
.dim-row-scale-line{
  position:absolute;top:50%;height:1.5px;
  transform:translateY(-50%);
  z-index:1;
}
.dim-row-dot{
  position:absolute;top:50%;width:11px;height:11px;border-radius:50%;
  transform:translate(-50%,-50%);
  z-index:2;
  box-shadow:0 0 0 2px var(--cream);
}
.dim-row-dot.partner-a{background:var(--coral-deep)}
.dim-row-dot.partner-b{background:var(--indigo-deep)}

/* Snapshot section title row: title + legend on same line */
.snap-section-row{
  display:flex;justify-content:space-between;align-items:baseline;
  margin-top:.18in;padding-bottom:6px;
  border-bottom:1px solid var(--hairline);
}
.snap-section-row .snap-section-title{margin:0;border:none;padding:0}
/* Snapshot legend: dots + names, sits inline with the section title */
.snapshot-legend{
  display:flex;gap:1.2rem;
  font-family:var(--bfont);font-size:10px;color:var(--graphite);font-weight:600;
  text-transform:uppercase;letter-spacing:.08em;
}
.legend-dot{display:inline-flex;align-items:center;gap:6px}
.legend-dot::before{content:"";width:9px;height:9px;border-radius:50%}
.legend-sarah::before{background:var(--coral-deep)}
.legend-james::before{background:var(--indigo-deep)}

/* Expectations grid — 6 cards, one per domain */
.expectations-grid{
  display:grid;grid-template-columns:repeat(6,1fr);gap:10px;
  margin-top:.12in;
}
.exp-card{
  border:1px solid var(--hairline);
  padding:.8rem .65rem .85rem;
  display:grid;grid-template-rows:2.4em 1fr auto;
  row-gap:6px;
  background:var(--cream);
  position:relative;
}
.exp-card::before{
  content:"";position:absolute;top:0;left:0;right:0;height:3px;
}
.exp-card.aligned::before{background:var(--green-deep)}
.exp-card.partial::before{background:var(--gold)}
.exp-card.gap::before{background:var(--coral-deep)}
.exp-pct{
  font-family:var(--hfont);font-size:1.95rem;font-weight:700;
  letter-spacing:-.024em;line-height:1;color:var(--ink);
  align-self:end;
}
.exp-pct-suffix{font-size:1rem;color:var(--muted);font-weight:400;font-style:italic}
.exp-label{
  font-family:var(--bfont);font-size:9px;letter-spacing:.06em;
  text-transform:uppercase;font-weight:700;color:var(--graphite);
  line-height:1.3;align-self:start;
}
.exp-status{
  font-family:var(--bfont);font-size:8.5px;letter-spacing:.18em;
  text-transform:uppercase;font-weight:600;
  align-self:end;color:var(--muted);
}

/* ── PART DIVIDER ────────────────────────────────────────────── */
.part-divider{
  height:11in;
  display:flex;flex-direction:column;
  padding:1.2in .9in 1in;
  position:relative;
  color:white;
  overflow:hidden;
}
.part-divider.blue{
  background:linear-gradient(165deg,#0F1A3E 0%,#1B3A6E 50%,#1E3A8A 100%);
}
.part-divider.purple{
  background:linear-gradient(165deg,#2A1340 0%,#4A1F70 50%,#6B2BB8 100%);
}
.part-divider.orange{
  background:linear-gradient(165deg,#3D1A0A 0%,#7A2E15 50%,#C2410C 100%);
}
.part-divider.green{
  background:linear-gradient(165deg,#0A2E20 0%,#0E5240 50%,#047857 100%);
}
.part-divider::before{
  content:"";position:absolute;inset:0;
  background-image:radial-gradient(circle at 1px 1px,rgba(255,255,255,.15) 1px,transparent 0);
  background-size:14px 14px;
  pointer-events:none;
}
.part-divider::after{
  /* Giant background numeral */
  content:attr(data-num);
  position:absolute;
  bottom:-.4in;right:-.2in;
  font-family:var(--hfont);
  font-size:32rem;font-weight:400;
  font-style:italic;
  line-height:.85;
  letter-spacing:-.05em;
  color:rgba(255,255,255,.06);
  pointer-events:none;
  user-select:none;
}
.part-meta{
  display:flex;justify-content:space-between;align-items:baseline;
  padding-bottom:1.2rem;border-bottom:1px solid rgba(255,255,255,.25);
  position:relative;z-index:1;
}
.part-num{
  font-family:var(--mono);font-size:11px;letter-spacing:.18em;
  text-transform:uppercase;font-weight:700;color:white;
}
.part-of{
  font-family:var(--mono);font-size:11px;letter-spacing:.16em;color:rgba(255,255,255,.55);
}
.part-label{
  font-family:var(--bfont);font-size:11px;letter-spacing:.18em;
  text-transform:uppercase;font-weight:700;
  margin-top:1.2in;
  position:relative;z-index:1;
}
.part-divider.blue .part-label{color:#A5C4FF}
.part-divider.purple .part-label{color:#C4A5FF}
.part-divider.orange .part-label{color:#FFC0A5}
.part-divider.green .part-label{color:#A5F0D5}
.part-title{
  font-family:var(--hfont);font-size:4.4rem;font-weight:700;
  line-height:1.02;letter-spacing:-.026em;color:white;
  margin-top:.45rem;max-width:7in;
  position:relative;z-index:1;
}
.part-title em{font-style:italic;font-weight:700}
.part-divider.blue .part-title em{color:#A5C4FF}
.part-divider.purple .part-title em{color:#C4A5FF}
.part-divider.orange .part-title em{color:#FFC0A5}
.part-divider.green .part-title em{color:#A5F0D5}
.part-epigraph{
  margin-top:auto;padding-top:.85in;
  max-width:5.5in;
  border-top:1px solid rgba(255,255,255,.25);
  position:relative;z-index:1;
}
.part-epigraph-text{
  font-family:var(--hfont);font-style:italic;font-size:1.1rem;
  line-height:1.5;color:rgba(255,255,255,.92);font-weight:700;
  margin-bottom:.85rem;
}
.part-epigraph-cite{
  font-family:var(--bfont);font-size:9.5px;letter-spacing:.22em;
  text-transform:uppercase;font-weight:600;color:rgba(255,255,255,.55);
}
.part-divider .page-num{color:rgba(255,255,255,.4)}

/* ── DIMENSION PAGE ──────────────────────────────────────────── */
.dim-page{position:relative}
.dim-page::before{
  content:"";position:absolute;top:0;left:0;right:0;height:5px;
  background:var(--accent);
}
.accent-purple{--accent:#9B5DE5;--accent-deep:#6B2BB8;--accent-tint:#F3EEFF}
.accent-coral {--accent:#E8673A;--accent-deep:#C2410C;--accent-tint:#FFF0E6}
.accent-indigo{--accent:#1B5FE8;--accent-deep:#1E3A8A;--accent-tint:#EBE9F8}
.accent-green {--accent:#10B981;--accent-deep:#047857;--accent-tint:#E7FAF1}
.accent-gold  {--accent:#C17F47;--accent-deep:#9B5D2A;--accent-tint:#FBF1E3}
.accent-plum  {--accent:#6B2C5A;--accent-deep:#4A1F3F;--accent-tint:#F8EFF4}

.dim-header{
  display:grid;grid-template-columns:auto 1fr;gap:.4in;
  padding:.18in 0 .16in;
  border-bottom:1px solid var(--hairline);
}
.dim-numeral{
  font-family:var(--hfont);font-size:3.8rem;font-weight:400;
  line-height:.85;letter-spacing:-.04em;color:var(--accent-deep);
  font-variant-numeric:lining-nums;
  display:flex;align-items:flex-start;
}
.dim-numeral-of{
  font-family:var(--bfont);font-size:9px;font-weight:600;color:var(--muted);
  letter-spacing:.06em;margin-left:6px;margin-top:.55em;
}
.dim-meta{display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:4px}
.dim-eyebrow{color:var(--accent-deep);margin-bottom:8px}
.dim-title{
  font-family:var(--hfont);font-size:2.2rem;font-weight:700;
  line-height:1;letter-spacing:-.024em;color:var(--ink);
}
.dim-title em{font-style:italic;color:var(--accent-deep);font-weight:700}

/* Spectrum visualization */
.spectrum{
  margin-top:.16in;
  background:linear-gradient(135deg,var(--accent-tint) 0%,var(--cream) 100%);
  padding:.9rem 1.2rem 1.05rem;
  border:1px solid var(--hairline);
  position:relative;
}
.spectrum-head{
  display:flex;justify-content:space-between;align-items:baseline;
  margin-bottom:1.4rem;
}
.spectrum-pole{
  font-family:var(--bfont);font-size:9.5px;letter-spacing:.28em;
  text-transform:uppercase;font-weight:700;color:var(--muted);line-height:1.3;
}
.spectrum-pole-num{
  font-family:var(--mono);font-size:9px;color:var(--muted);
  font-weight:500;display:block;margin-top:2px;
}
.spectrum-pole.right{text-align:right}
.spectrum-track{
  position:relative;height:36px;margin:0 12px;
}
.spectrum-line{
  position:absolute;left:0;right:0;top:50%;height:1px;
  background:var(--ink);opacity:.18;
}
.spectrum-tick{
  position:absolute;top:50%;width:1px;height:8px;
  background:var(--ink);opacity:.18;transform:translateY(-50%);
}
.spectrum-tick-num{
  position:absolute;top:calc(50% + 12px);
  font-family:var(--mono);font-size:9px;color:var(--muted);
  transform:translateX(-50%);font-weight:500;
}
.spectrum-connector{
  position:absolute;top:50%;height:2px;
  background:var(--accent);transform:translateY(-50%);z-index:1;
}
.spectrum-marker{
  position:absolute;top:50%;
  transform:translate(-50%,-50%);
  z-index:2;
}
.spectrum-marker-dot{
  width:16px;height:16px;border-radius:50%;
  background:white;border:3px solid var(--accent-deep);
  box-shadow:0 4px 10px rgba(60,30,10,.15);
}
.spectrum-marker-tag{
  position:absolute;top:-22px;left:50%;transform:translateX(-50%);
  font-family:var(--bfont);font-size:.74rem;font-weight:600;
  color:var(--ink);white-space:nowrap;letter-spacing:0;
  max-width:1.6in;overflow:hidden;text-overflow:ellipsis;
}
.spectrum-marker-score{
  position:absolute;top:-38px;left:50%;transform:translateX(-50%);
  font-family:var(--mono);font-size:9px;font-weight:500;
  color:var(--muted);letter-spacing:.08em;white-space:nowrap;
}
/* Outward-anchored labels: prevents collision when markers are close.
   Left marker: labels right-aligned to dot edge, extending leftward.
   Right marker: labels left-aligned to dot edge, extending rightward. */
.spectrum-marker.is-left .spectrum-marker-tag,
.spectrum-marker.is-left .spectrum-marker-score{
  left:auto;right:calc(50% + 6px);transform:none;
}
.spectrum-marker.is-right .spectrum-marker-tag,
.spectrum-marker.is-right .spectrum-marker-score{
  left:calc(50% + 6px);transform:none;
}
.spectrum-foot{
  margin-top:1.1rem;display:flex;justify-content:space-between;align-items:center;
  padding-top:.8rem;border-top:1px solid var(--hairline);
}
.spectrum-gap-label{
  font-family:var(--bfont);font-size:9.5px;letter-spacing:.18em;
  text-transform:uppercase;font-weight:700;color:var(--accent-deep);
}
.spectrum-gap-value{
  font-family:var(--hfont);font-size:1.25rem;font-weight:700;
  color:var(--ink);letter-spacing:-.012em;
}
.spectrum-gap-meta{font-size:.76rem;color:var(--muted);font-weight:400;font-style:italic;margin-left:6px}

/* What this means + What this measures, equal width 50/50 */
.dim-body{
  margin-top:.18in;
  display:grid;grid-template-columns:1fr 1fr;
  gap:.28in;
}
.what-measures{
  padding-top:.12in;border-top:1px solid var(--hairline);
}
.what-measures-eye{color:var(--muted);margin-bottom:8px}
.what-measures p{
  font-size:.8rem;line-height:1.55;color:var(--slate);font-weight:400;
}

/* "What this means for your relationship" the type-specific main analysis */
.dim-analysis{
  background:var(--accent-tint);
  border-left:3px solid var(--accent-deep);
  padding:.75rem .9rem;
}
.dim-analysis-eye{color:var(--accent-deep);margin-bottom:6px}
.dim-analysis p{
  font-family:var(--hfont);font-size:.86rem;line-height:1.5;
  color:var(--graphite);font-weight:400;font-style:italic;letter-spacing:-.005em;
}

/* Reflection prompts */
.prompts-block{
  margin-top:.18in;padding-top:.14in;
  border-top:1px solid var(--hairline);
}
.prompts-eye{color:var(--accent-deep);margin-bottom:10px}
.prompts-list{
  display:flex;flex-direction:column;gap:0;
}
.prompt-row{
  display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:start;
  padding:6px 0;border-bottom:1px solid var(--hairline);
}
.prompt-row:last-child{border-bottom:none}
.prompt-num{
  font-family:var(--hfont);font-size:1.05rem;font-weight:700;
  color:var(--accent-deep);line-height:1.1;letter-spacing:-.012em;
  min-width:24px;
}
.prompt-text{
  font-family:var(--bfont);font-size:.82rem;line-height:1.5;
  color:var(--graphite);font-weight:400;
}

/* Try this week, tinted accent box with star icon */
.try-this-week{
  margin-top:.18in;
  background:var(--accent-tint);
  border-left:3px solid var(--accent-deep);
  padding:.7rem 1rem;
  display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:start;
}
.ttw-icon{
  font-family:var(--hfont);font-size:1.2rem;color:var(--accent-deep);
  font-weight:700;line-height:1;
}
.ttw-content{display:flex;flex-direction:column;gap:4px}
.ttw-eye{
  color:var(--accent-deep);font-size:9.5px;
  display:inline-block;letter-spacing:.18em;text-transform:uppercase;font-weight:700;
}
.ttw-eye::before{display:none}
.ttw-text{
  font-family:var(--bfont);font-size:.84rem;line-height:1.55;
  color:var(--ink);font-weight:400;
}

/* Write-in sections (commitment + notes) */
.writein-section{margin-top:.18in}
.writein-head{
  display:flex;justify-content:space-between;align-items:baseline;
  margin-bottom:6px;
}
.writein-eye{color:var(--accent-deep)}
.writein-hint{
  font-family:var(--bfont);font-size:11px;font-style:italic;
  color:var(--muted);font-weight:400;
}
.writein-area{
  /* Per editorial direction: no notebook lines. The eyebrow label above is the
     only affordance; the area below is reserved blank space for handwriting.
     Sized in em-units so the page reserves room consistent with prior height
     when --lines is set (default 3). */
  height:calc(1.55em * var(--lines, 3));
  margin-top:14px;
}

/* ── EXPECTATIONS PAGE ──────────────────────────────────────── */
.exp-page-header{
  display:grid;grid-template-columns:auto 1fr;gap:.4in;
  padding-bottom:.32in;border-bottom:1px solid var(--hairline);
}
.exp-page-icon{
  width:1.2in;height:1.2in;border:1px solid var(--hairline);
  background:linear-gradient(135deg,var(--accent-tint) 0%,#FFFDF9 100%);
  display:flex;align-items:center;justify-content:center;
  font-family:var(--hfont);font-size:2.6rem;font-weight:400;
  color:var(--accent-deep);
}
.exp-page-title{
  font-family:var(--hfont);font-size:2.6rem;font-weight:700;
  line-height:1;letter-spacing:-.024em;color:var(--ink);
}
.exp-page-title em{font-style:italic;color:var(--accent-deep);font-weight:700}
.exp-page-eye{color:var(--accent-deep);margin-bottom:10px}

.exp-side-by-side{
  margin-top:.3in;
  display:grid;grid-template-columns:1fr 1fr;
  border:1px solid var(--hairline);
  background:var(--cream);
  overflow:hidden;
}
.esbs-pane{padding:1.1rem 1.3rem 1.2rem;position:relative}
.esbs-pane.partner-a{background:linear-gradient(165deg,#FFF6EE 0%,var(--cream) 100%)}
.esbs-pane.partner-b{background:linear-gradient(165deg,#EEF1FA 0%,var(--cream) 100%);border-left:1px solid var(--hairline)}
.esbs-tag{
  display:inline-flex;align-items:center;gap:8px;
  font-family:var(--bfont);font-size:9.5px;letter-spacing:.18em;
  text-transform:uppercase;font-weight:700;
  margin-bottom:14px;
}
.esbs-tag::before{content:"";width:6px;height:6px;border-radius:50%}
.esbs-pane.partner-a .esbs-tag{color:var(--coral-deep)}
.esbs-pane.partner-a .esbs-tag::before{background:var(--coral-deep)}
.esbs-pane.partner-b .esbs-tag{color:var(--indigo-deep)}
.esbs-pane.partner-b .esbs-tag::before{background:var(--indigo-deep)}
.esbs-name{
  font-family:var(--hfont);font-size:1.35rem;font-weight:700;
  letter-spacing:-.018em;color:var(--ink);margin-bottom:.7em;
}
.esbs-list{display:flex;flex-direction:column;gap:0}
.esbs-item{
  display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;
  padding:8px 0;
  border-bottom:1px solid var(--hairline);
}
.esbs-item:last-child{border-bottom:none}
.esbs-item-label{
  font-family:var(--bfont);font-size:.78rem;
  color:var(--graphite);font-weight:500;
}
.esbs-item-value{
  font-family:var(--hfont);font-size:.88rem;font-weight:700;
  font-style:italic;color:var(--ink);letter-spacing:-.008em;
}
.exp-page-analysis{
  margin-top:.3in;padding-top:.2in;border-top:1px solid var(--hairline);
}
.exp-page-analysis-eye{color:var(--accent-deep);margin-bottom:10px}
.exp-page-analysis-title{
  font-family:var(--hfont);font-size:1.3rem;font-weight:700;
  letter-spacing:-.018em;color:var(--ink);margin-bottom:.55em;
}
.exp-page-analysis-title em{font-style:italic;color:var(--accent-deep);font-weight:700}
.exp-page-analysis p{
  font-family:var(--bfont);font-size:.86rem;line-height:1.65;color:var(--slate);
  font-weight:400;max-width:6.2in;
}

/* ── PART 2: WORKING KNOWLEDGE / MOMENTS ────────────────────── */
.wk-intro{
  padding-bottom:.18in;border-bottom:1px solid var(--hairline);
  margin-bottom:.2in;
}
.wk-eye{color:var(--purple-deep);margin-bottom:8px}
.wk-title{
  font-family:var(--hfont);font-size:2rem;font-weight:700;
  line-height:1.04;letter-spacing:-.022em;color:var(--ink);
  margin-bottom:.35em;
}
.wk-title em{font-style:italic;color:var(--purple-deep);font-weight:700}
.wk-lead{
  font-family:var(--hfont);font-style:italic;font-size:.95rem;
  line-height:1.5;color:var(--graphite);font-weight:400;max-width:6in;
}
/* Moment card, tightened so 4 fit on continuation page */
.moment-card{
  margin-bottom:.1in;
  padding-bottom:.08in;
  border-bottom:1px dotted var(--hairline);
}
.moment-card:last-child{border-bottom:none}
.moment-header{
  display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:baseline;
  border-bottom:1px solid var(--purple-deep);
  padding-bottom:5px;margin-bottom:6px;
}
.moment-num{
  font-family:var(--mono);font-size:10px;letter-spacing:.06em;
  color:var(--muted);font-weight:600;
}
.moment-title{
  font-family:var(--hfont);font-size:1.1rem;font-weight:700;
  letter-spacing:-.014em;color:var(--ink);line-height:1.2;
}
.moment-row{
  display:grid;grid-template-columns:115px 1fr;gap:14px;
  padding:2px 0;
}
.moment-row-label{
  font-family:var(--bfont);font-size:8.5px;letter-spacing:.18em;
  text-transform:uppercase;font-weight:700;
  padding-top:2px;
}
.moment-row-label.muted{color:var(--muted)}
.moment-row-label.purple{color:var(--purple-deep)}
.moment-row-label.coral{color:var(--coral-deep)}
.moment-row-label.green{color:var(--green-deep)}
.moment-row-label.indigo{color:var(--indigo-deep)}
.moment-row-text{
  font-family:var(--bfont);font-size:.76rem;line-height:1.45;
  color:var(--graphite);font-weight:400;
}
.moment-row-text.italic{font-style:italic;color:var(--indigo-deep);font-weight:500}

/* ── PART 3: WORKBOOK ──────────────────────────────────────── */
.wb-page-header{
  padding-bottom:.3in;border-bottom:3px solid var(--coral-deep);
  margin-bottom:.32in;
}
.wb-page-eye{color:var(--coral-deep);margin-bottom:10px}
.wb-page-title{
  font-family:var(--hfont);font-size:2.4rem;font-weight:700;
  line-height:1.02;letter-spacing:-.022em;color:var(--ink);
}
.wb-page-title em{font-style:italic;color:var(--coral-deep);font-weight:700}
.wb-page-sub{
  font-family:var(--hfont);font-style:italic;font-size:1rem;
  line-height:1.55;color:var(--muted);font-weight:400;margin-top:.4em;
}
.wb-prompt{margin-bottom:.28in}
.wb-prompt-q{
  display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:baseline;
  margin-bottom:6px;
}
.wb-prompt-num{
  font-family:var(--hfont);font-size:1.3rem;font-weight:700;
  color:var(--coral-deep);line-height:1;letter-spacing:-.014em;
}
.wb-prompt-text{
  font-family:var(--hfont);font-size:1.02rem;font-weight:700;
  line-height:1.3;color:var(--ink);letter-spacing:-.012em;
}
.wb-prompt-hint{
  font-family:var(--bfont);font-size:11px;font-style:italic;
  color:var(--muted);font-weight:400;margin-bottom:8px;padding-left:30px;
}

.focus-area-page-eye{
  font-family:var(--bfont);font-size:10px;letter-spacing:.18em;
  text-transform:uppercase;font-weight:700;color:var(--indigo-deep);
  margin-bottom:8px;
}
.focus-area-title{
  font-family:var(--hfont);font-size:2.2rem;font-weight:700;
  line-height:1.02;letter-spacing:-.022em;color:var(--ink);
  padding-bottom:.2in;border-bottom:3px solid var(--indigo-deep);
  margin-bottom:.32in;
}
.focus-area-section{margin-top:.28in}
.focus-area-section-eye{
  font-family:var(--bfont);font-size:10px;letter-spacing:.28em;
  text-transform:uppercase;font-weight:700;color:var(--indigo-deep);
  margin-bottom:8px;
}
.focus-area-twocol{display:grid;grid-template-columns:1fr 1fr;gap:.32in;margin-top:.18in}
.focus-area-col-label{
  font-family:var(--bfont);font-size:9.5px;letter-spacing:.22em;
  text-transform:uppercase;font-weight:700;color:var(--indigo-deep);
  margin-bottom:8px;
}

/* ── PART 4: CONVERSATION LIBRARY ───────────────────────────── */
.cl-page-header{
  padding-bottom:.3in;border-bottom:1px solid var(--hairline);
  margin-bottom:.32in;
}
.cl-page-eye{color:var(--purple-deep);margin-bottom:10px}
.cl-page-title{
  font-family:var(--hfont);font-size:2.4rem;font-weight:700;
  line-height:1.02;letter-spacing:-.022em;color:var(--ink);
}
.cl-page-title em{font-style:italic;color:var(--purple-deep);font-weight:700}

.situation-card{
  margin-bottom:.28in;padding-bottom:.24in;
  border-bottom:1px dotted var(--hairline);
}
.situation-card:last-child{border-bottom:none}
.situation-title{
  font-family:var(--hfont);font-size:1.35rem;font-weight:700;
  letter-spacing:-.016em;color:var(--ink);line-height:1.2;
}
.situation-blurb{
  font-family:var(--hfont);font-style:italic;font-size:.9rem;
  color:var(--muted);font-weight:400;margin-top:3px;margin-bottom:12px;
}
.situation-prompts{display:flex;flex-direction:column;gap:7px}
.situation-prompt{
  display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start;
  font-family:var(--bfont);font-size:.85rem;line-height:1.55;color:var(--graphite);
}
.situation-prompt::before{
  content:"•";color:var(--purple-deep);font-weight:700;font-size:1rem;line-height:1.2;
}

/* ── REFERENCE CARD (HALF-PAGE CUTOUT) ──────────────────────── */
/* ── REFERENCE CARD: navy card on tan page bg, partner names featured ── */
.refcard-page{
  background:#F0E6D6;
  position:relative;
  padding:0 !important;
  display:flex;flex-direction:column;
  align-items:center;
  height:11in;
}
.refcard-page > .page-inner{padding:0;width:100%}
/* Wrapper for the cuttable card so we can position the dashed border around it */
.refcard-cutout{
  position:relative;
  margin:.55in .9in .35in;
  padding:18px;
}
/* Dashed rectangle border that goes ALL FOUR SIDES of the card */
.refcard-cutout::before{
  content:"";
  position:absolute;inset:0;
  border:1.5px dashed var(--graphite);
  pointer-events:none;
}
/* Scissor icon clipped onto the top-left of the dashed rectangle */
.refcard-cutout::after{
  content:"✂";
  position:absolute;top:-1px;left:24px;
  background:#F0E6D6;padding:0 8px;
  font-size:13px;color:var(--graphite);
  line-height:14px;transform:translateY(-50%);
}
.refcard-cutline-label{
  position:absolute;top:-1px;right:24px;
  background:#F0E6D6;padding:0 8px;
  transform:translateY(-50%);
  font-family:var(--bfont);font-size:8px;letter-spacing:.2em;
  text-transform:uppercase;font-weight:600;color:var(--graphite);
  z-index:1;
}
/* The actual card. Cream paper, hairline rules, brand blue names. */
.refcard-card{
  background:var(--cream);
  padding:.35in .42in .36in;
  position:relative;
  border:1px solid var(--hairline);
  box-shadow:0 1px 0 rgba(0,0,0,.04);
  width:6.6in;
  color:var(--ink);
}
/* Top row: logo + wordmark on left, partner names large on right */
.refcard-top{
  display:flex;align-items:center;justify-content:space-between;
  gap:.4in;
  padding-bottom:.18in;
  border-bottom:1px solid var(--hairline);
}
.refcard-logo{
  display:flex;align-items:center;gap:10px;flex-shrink:0;
}
.refcard-logo-svg{display:block}
.refcard-logo-wordmark{
  display:flex;flex-direction:column;line-height:1;
}
.refcard-logo-name{
  font-family:var(--hfont);font-size:1.15rem;font-weight:700;
  color:var(--ink);letter-spacing:-.01em;line-height:1;
}
.refcard-logo-kicker{
  font-family:var(--bfont);font-size:8px;letter-spacing:.22em;
  text-transform:uppercase;font-weight:700;color:var(--muted);
  margin-top:4px;line-height:1;
}
.refcard-names{
  font-family:var(--hfont);font-size:2.1rem;font-weight:700;
  line-height:1;letter-spacing:-.02em;
  color:var(--indigo-deep);
  margin:0;
  text-align:right;
}
.refcard-names em{
  font-style:italic;font-weight:400;color:var(--muted);
}
/* Centered intention statement between top and bottom sections */
.refcard-middle{
  padding:.28in 0 .26in;
  border-bottom:1px solid var(--hairline);
  text-align:center;
}
.refcard-intention{
  font-family:var(--hfont);font-size:1.55rem;font-weight:400;
  font-style:italic;color:var(--ink);
  line-height:1.2;letter-spacing:-.012em;
  margin:0;
}
/* Bottom sections: phrase + work-on area, each with its own coral eyebrow */
.refcard-section{
  padding:.2in 0 .2in;
  border-bottom:1px solid var(--hairline);
}
.refcard-section:last-child{border-bottom:none;padding-bottom:0}
.refcard-section-eye{
  font-family:var(--bfont);font-size:9px;letter-spacing:.22em;
  text-transform:uppercase;font-weight:700;
  color:var(--coral-deep);
  display:block;margin-bottom:8px;
}
.refcard-phrase-text{
  font-family:var(--hfont);font-style:italic;font-weight:400;
  font-size:1.02rem;line-height:1.4;letter-spacing:-.006em;
  color:var(--graphite);
  margin:0;
}
/* Write-in area on the reference card. No lines per editorial direction;
   keep height so card layout reserves the same space. */
.refcard-workon-area{
  height:calc(1.6em * 3);
  margin-top:6px;
}
/* Below-card content sits on page bg */
.refcard-context{
  padding:0 .9in .35in;
  background:transparent;
  display:flex;flex-direction:column;
  width:100%;
}
.refcard-ctx-head{
  display:flex;justify-content:space-between;align-items:baseline;
  padding-bottom:.14in;border-bottom:1px solid var(--graphite);
  margin-bottom:.22in;
}
.refcard-ctx-eye{color:var(--graphite)}
.refcard-ctx-num{
  font-family:var(--mono);font-size:9px;letter-spacing:.18em;
  color:var(--graphite);text-transform:uppercase;
}
.refcard-ctx-title{
  font-family:var(--hfont);font-size:1.4rem;font-weight:700;
  line-height:1.1;letter-spacing:-.018em;color:var(--ink);
  margin-bottom:.45em;max-width:6in;
}
.refcard-ctx-title em{font-style:italic;color:var(--coral-deep);font-weight:700}
.refcard-ctx-body{
  font-family:var(--bfont);font-size:.82rem;line-height:1.6;
  color:var(--graphite);font-weight:400;max-width:5.5in;margin-bottom:.9em;
}
.refcard-ctx-tips{
  display:grid;grid-template-columns:repeat(3,1fr);gap:.3in;
  padding-top:.18in;border-top:1px solid var(--graphite);
}
.refcard-ctx-tip{display:flex;flex-direction:column;gap:5px}
.refcard-ctx-tip-label{
  font-family:var(--bfont);font-size:8.5px;letter-spacing:.22em;
  text-transform:uppercase;font-weight:700;color:var(--coral-deep);
}
.refcard-ctx-tip-text{
  font-family:var(--hfont);font-size:.8rem;line-height:1.4;
  color:var(--ink);font-weight:700;
}
/* "Explore Attune In Practice" callout, sits below tips */
.refcard-inpractice{
  margin-top:.32in;
  padding:.2in .26in;
  border:1px solid var(--graphite);
  background:rgba(255,253,249,.55);
  display:flex;flex-direction:column;gap:6px;
  border-left:3px solid var(--coral-deep);
}
.refcard-inpractice-eye{
  font-family:var(--bfont);font-size:8.5px;letter-spacing:.22em;
  text-transform:uppercase;font-weight:700;color:var(--coral-deep);
}
.refcard-inpractice-text{
  font-family:var(--hfont);font-style:italic;font-size:.88rem;
  line-height:1.45;color:var(--ink);font-weight:400;
}
.refcard-inpractice-text strong{
  font-style:normal;font-weight:700;font-family:var(--bfont);
  letter-spacing:.04em;font-size:.78rem;color:var(--coral-deep);
}
.refcard-mark-foot{
  margin-top:.18in;text-align:center;
  font-family:var(--bfont);font-size:9px;letter-spacing:.18em;
  text-transform:uppercase;font-weight:700;color:var(--graphite);opacity:.7;
}

/* PRINT */
@media print{
  body{padding:0;background:white}
  .page{margin:0;box-shadow:none;page-break-after:always}
}
"""

# ═══════════════════════════════════════════════════════════════════
# PAGE BUILDERS
# ═══════════════════════════════════════════════════════════════════

def build_cover():
    return f"""
<div class="page cover">
  <div class="cover-top-stripe"></div>
  <div class="cover-grid">
    <div class="cover-mark">
      <span class="cover-mark-rule"></span>
      <span>Attune Relationships · Volume 01</span>
    </div>
    <div></div>
    <div class="cover-title-block">
      <p class="cover-tagline">A guided record of how the two of you actually operate, where you align, where you don't, and what to do about both.</p>
      <h1 class="cover-title">Relationship<em>Workbook.</em></h1>
    </div>
    <div class="cover-meta">
      <div class="cover-meta-cell">
        <span class="cover-meta-label">Prepared for</span>
        <span class="cover-meta-value">{COUPLE['u']} <em>&amp;</em> {COUPLE['p']}</span>
        <span class="cover-meta-sub">{COUPLE['together']}</span>
      </div>
      <div class="cover-meta-cell">
        <span class="cover-meta-label">Couple type</span>
        <span class="cover-meta-value">{COUPLE['couple_type']['name']}</span>
        <span class="cover-meta-sub">Profile {COUPLE['couple_type']['id']} · §02</span>
      </div>
      <div class="cover-meta-cell">
        <span class="cover-meta-label">Date</span>
        <span class="cover-meta-value">{COUPLE['date']}</span>
        <span class="cover-meta-sub">Built from your answers</span>
      </div>
    </div>
    <div class="cover-edition" style="margin-top:.55in">
      attune-relationships.com<span>Built from your answers</span>
    </div>
  </div>
</div>
"""

def build_toc():
    """Detailed TOC, split across 2 pages so nothing is clipped.
    Page 1: Introduction + Part 01 (Communication + Expectations).
    Page 2: Parts 02-05.
    """
    # ── Page 1: Introduction + Part 01 (full) ──
    page1_rows = []
    page1_rows.append("""
    <div class="toc-section">
      <div class="toc-row"><span class="toc-row-label">Introduction</span><span class="toc-row-page">3</span></div>
      <div class="toc-row indent"><span class="toc-row-label italic">Your snapshot</span><span class="toc-row-page">4</span></div>
    </div>""")

    dims_with_pages = [(d, 7+i) for i, d in enumerate(DIMS)]
    exp_start_page = 7 + len(DIMS)
    exp_pages = [(e, exp_start_page+i) for i, e in enumerate(EXP_DOMAINS)]
    page1_rows.append(f"""
    <div class="toc-section">
      <div class="toc-section-eye toc-part-eye-blue">Part 01</div>
      <div class="toc-section-title-row">
        <h3 class="toc-section-title">A closer look at the dimensions that matter.</h3>
        <span class="toc-section-page">5</span>
      </div>
      <div class="toc-row indent"><span class="toc-row-label">Communication · 10 dimensions</span><span class="toc-row-page">7</span></div>""")
    for dim, p in dims_with_pages:
        page1_rows.append(f"""      <div class="toc-row indent2"><span class="toc-row-label">{DIM_META[dim]['label']}</span><span class="toc-row-page">{p}</span></div>""")
    page1_rows.append(f"""      <div class="toc-row indent"><span class="toc-row-label">Expectations · 6 domains</span><span class="toc-row-page">{exp_start_page}</span></div>""")
    for e, p in exp_pages:
        page1_rows.append(f"""      <div class="toc-row indent2"><span class="toc-row-label">{e['label']}</span><span class="toc-row-page">{p}</span></div>""")
    page1_rows.append("    </div>")

    # ── Page 2: Parts 02-05 ──
    page2_rows = []
    p2_start = exp_start_page + len(EXP_DOMAINS) + 1
    page2_rows.append(f"""
    <div class="toc-section">
      <div class="toc-section-eye toc-part-eye-purple">Part 02</div>
      <div class="toc-section-title-row">
        <h3 class="toc-section-title">Working knowledge.</h3>
        <span class="toc-section-page">{p2_start}</span>
      </div>
      <div class="toc-row indent"><span class="toc-row-label italic">What {COUPLE['p']} should know about {COUPLE['u']}</span><span class="toc-row-page">{p2_start+1}</span></div>
      <div class="toc-row indent"><span class="toc-row-label italic">What {COUPLE['u']} should know about {COUPLE['p']}</span><span class="toc-row-page">{p2_start+3}</span></div>
    </div>""")

    p3_start = p2_start + 5
    page2_rows.append(f"""
    <div class="toc-section">
      <div class="toc-section-eye toc-part-eye-orange">Part 03</div>
      <div class="toc-section-title-row">
        <h3 class="toc-section-title">Workbook &amp; journal.</h3>
        <span class="toc-section-page">{p3_start}</span>
      </div>
      <div class="toc-row indent"><span class="toc-row-label">Preparing together</span><span class="toc-row-page">{p3_start+1}</span></div>
      <div class="toc-row indent"><span class="toc-row-label">Focus area 1</span><span class="toc-row-page">{p3_start+2}</span></div>
      <div class="toc-row indent"><span class="toc-row-label">Focus area 2</span><span class="toc-row-page">{p3_start+3}</span></div>
      <div class="toc-row indent"><span class="toc-row-label">Focus area 3</span><span class="toc-row-page">{p3_start+4}</span></div>
      <div class="toc-row indent"><span class="toc-row-label italic">30-day check-in</span><span class="toc-row-page">{p3_start+5}</span></div>
    </div>""")

    p4_start = p3_start + 7
    page2_rows.append(f"""
    <div class="toc-section">
      <div class="toc-section-eye toc-part-eye-purple">Part 04</div>
      <div class="toc-section-title-row">
        <h3 class="toc-section-title">Conversation library.</h3>
        <span class="toc-section-page">{p4_start}</span>
      </div>""")
    for i, s in enumerate(SITUATIONS):
        page2_rows.append(f"""      <div class="toc-row indent"><span class="toc-row-label">{s['title']}</span><span class="toc-row-page">{p4_start + 1 + i//3}</span></div>""")
    page2_rows.append(f"""      <div class="toc-row indent"><span class="toc-row-label italic">A structured first conversation</span><span class="toc-row-page">{p4_start+3}</span></div>""")
    page2_rows.append("    </div>")

    p5_start = p4_start + 5
    page2_rows.append(f"""
    <div class="toc-section">
      <div class="toc-section-eye toc-part-eye-green">Part 05</div>
      <div class="toc-section-title-row">
        <h3 class="toc-section-title">Reference card.</h3>
        <span class="toc-section-page">{p5_start}</span>
      </div>
    </div>""")

    page1 = f"""
<div class="page">
  <div class="page-running-head"><span>Attune Relationships · {COUPLE['u']} &amp; {COUPLE['p']}</span><span>Contents</span></div>
  <div class="page-inner">
    <div style="margin-top:.3in" class="toc-page-header">
      <div class="eyebrow toc-page-eye">Contents</div>
      <span class="toc-page-stamp">{COUPLE['date']}</span>
    </div>
    <h1 class="toc-page-title">What's <em>in this workbook.</em></h1>
    {''.join(page1_rows)}
  </div>
  <div class="page-num">2</div>
</div>"""

    page2 = f"""
<div class="page">
  <div class="page-running-head"><span>Attune Relationships · {COUPLE['u']} &amp; {COUPLE['p']}</span><span>Contents · continued</span></div>
  <div class="page-inner">
    <div style="margin-top:.3in" class="toc-page-header">
      <div class="eyebrow toc-page-eye">Contents · continued</div>
      <span class="toc-page-stamp">Parts 02 to 05</span>
    </div>
    <h1 class="toc-page-title">The rest <em>of the workbook.</em></h1>
    {''.join(page2_rows)}
  </div>
  <div class="page-num">3</div>
</div>"""

    return page1 + page2

def build_intro(page_num):
    return f"""
<div class="page">
  <div class="page-running-head"><span>Attune Relationships · {COUPLE['u']} &amp; {COUPLE['p']}</span><span>Welcome</span></div>
  <div class="page-inner">
    <div class="eyebrow" style="color:var(--coral-deep);margin-top:.4in;">A note before you begin</div>
    <div class="intro-grid">
      <div>
        <h1 class="display-title intro-display">Built from your <em>specific answers.</em></h1>
        <div class="intro-body">
          <p class="intro-lead">Every observation, prompt, and weekly practice was selected because it reflects the particular two of you.</p>
          <p><strong>Part One</strong> is a closer look at the dimensions where the gap between you matters most, communication, conflict, repair, the small everyday currencies of closeness.</p>
          <p><strong>Part Two</strong> takes the same lens to the unspoken expectations about labor, money, and the future that quietly shape every long-term partnership.</p>
          <p><strong>Parts Three through Five</strong> are the working knowledge: a guided journal, a conversation library to flip to in real moments, and a single-page reference card you can keep somewhere you'll see it.</p>
          <p style="margin-top:1em;color:var(--graphite);font-weight:500;">Read independently before discussing. Your reflections will be most honest when you're not reading over each other's shoulders.</p>
        </div>
      </div>
      <aside class="intro-aside">
        <h3 class="intro-aside-title">A note on the scores</h3>
        <p>Neither end of any dimension is better. The gap between your scores is the thing worth understanding.</p>
        <p>A larger gap means more translation is required, and more to gain from explicit conversation.</p>
      </aside>
    </div>
  </div>
  <div class="page-num">{page_num}</div>
</div>
"""

def build_snapshot(page_num):
    """Snapshot, dimensions table + expectations grid.
    Per feedback: removed alignment column, removed gradient bg behind scales."""
    dim_rows = []
    for i, dim in enumerate(DIMS, 1):
        meta = DIM_META[dim]
        s_u, s_p = COUPLE['scores'][dim]
        pos_u = percent_position(s_u)
        pos_p = percent_position(s_p)
        # connector line spans from min to max
        line_left = min(pos_u, pos_p)
        line_width = abs(pos_u - pos_p)
        accent_color_var = f"var(--{meta['color']}-deep)"
        # determine color of the connector based on alignment
        status, gap = gap_status(s_u, s_p)
        opacity = '.55' if status != 'aligned' else '.45'
        dim_rows.append(f"""
      <div class="dim-row">
        <div>
          <span class="dim-row-num">{i:02d}</span>
          <span class="dim-row-label">{meta['label']}</span>
        </div>
        <div>
          <div class="dim-row-poles"><span>{meta['left']}</span><span>{meta['right']}</span></div>
          <div class="dim-row-scale">
            <div class="dim-row-scale-track"></div>
            <div class="dim-row-scale-tick" style="left:0%"></div>
            <div class="dim-row-scale-tick" style="left:25%"></div>
            <div class="dim-row-scale-tick" style="left:50%"></div>
            <div class="dim-row-scale-tick" style="left:75%"></div>
            <div class="dim-row-scale-tick" style="left:100%"></div>
            <div class="dim-row-scale-line" style="left:{line_left}%;width:{line_width}%;background:{accent_color_var};opacity:{opacity}"></div>
            <div class="dim-row-dot partner-a" style="left:{pos_u}%"></div>
            <div class="dim-row-dot partner-b" style="left:{pos_p}%"></div>
          </div>
        </div>
      </div>""")

    # Expectations cards
    exp_status_for = lambda pct: 'aligned' if pct >= 75 else ('partial' if pct >= 40 else 'gap')
    exp_cards = []
    for e in EXP_DOMAINS:
        pct = COUPLE['expectations'][e['key']]
        status_class = exp_status_for(pct)
        # short label for card
        short = {'household': 'Household', 'emotional': 'Emotional Labor',
                 'extended_family': 'Extended Family',
                 'money': 'Money & Career', 'life': 'Life Together',
                 }[e['key']]
        exp_cards.append(f"""
      <div class="exp-card {status_class}">
        <span class="exp-label">{short}</span>
        <span class="exp-pct">{pct}<span class="exp-pct-suffix">%</span></span>
        <span class="exp-status">Aligned</span>
      </div>""")

    n_notable = sum(1 for d in DIMS if gap_status(*COUPLE['scores'][d])[0] == 'notable_gap')

    return f"""
<div class="page">
  <div class="page-running-head"><span>Attune Relationships · {COUPLE['u']} &amp; {COUPLE['p']}</span><span>Snapshot</span></div>
  <div class="page-inner">
    <div class="snapshot-header" style="margin-top:.18in">
      <div>
        <div class="eyebrow" style="color:var(--coral-deep);margin-bottom:8px">At a glance</div>
        <h1 class="display-title snapshot-title">Where the two of you <em>actually are.</em></h1>
      </div>
      <div class="snapshot-stamp">
        <span class="snapshot-stamp-row"><strong>10</strong> dimensions</span>
        <span class="snapshot-stamp-row"><strong>6</strong> domains</span>
        <span class="snapshot-stamp-row"><strong>{n_notable}</strong> notable gaps</span>
      </div>
    </div>

    <div class="couple-capsule">
      <div class="couple-capsule-mark">{COUPLE['couple_type']['id']}</div>
      <div class="couple-capsule-text">
        <span class="couple-capsule-eye">Your couple type</span>
        <span class="couple-capsule-name">{COUPLE['couple_type']['name']} <em>· {COUPLE['couple_type']['subtitle']}</em></span>
        <span class="couple-capsule-sub">{fill(COUPLE['couple_type']['description'], COUPLE['u'], COUPLE['p'])}</span>
      </div>
    </div>

    <div class="snap-section-row">
      <div class="snap-section-title">Communication · 10 dimensions</div>
      <div class="snapshot-legend">
        <span class="legend-dot legend-sarah">{COUPLE['u']}</span>
        <span class="legend-dot legend-james">{COUPLE['p']}</span>
      </div>
    </div>
    <div class="dim-table">{''.join(dim_rows)}
    </div>

    <div class="snap-section-title" style="margin-top:.18in">Expectations · 6 domains</div>
    <div class="expectations-grid">{''.join(exp_cards)}
    </div>
  </div>
  <div class="page-num">{page_num}</div>
</div>
"""

def build_part_divider(num, label, title_html, color, epigraph, epigraph_cite, page_num):
    # epigraph_cite is accepted but no longer rendered. The epigraph text
    # now stands as a plain Attune statement, not a pseudo-quote.
    return f"""
<div class="page part-divider {color}" data-num="{num:02d}">
  <div class="part-meta">
    <span class="part-num">Part {num:02d}</span>
    <span class="part-of">five parts</span>
  </div>
  <div class="part-label">{label}</div>
  <h1 class="part-title">{title_html}</h1>
  <div class="part-epigraph">
    <p class="part-epigraph-text">{epigraph}</p>
  </div>
  <div class="page-num">{page_num}</div>
</div>
"""

def build_dimension_page(dim_id, dim_idx, page_num):
    """Mirror buildOneDimension: hero (numeral+title+spectrum+analysis),
    reflection prompts (3), try this week, what we want to try, our notes.

    The "What this means for your relationship" callout now renders two
    stacked paragraphs (Option A from the v2 spec): a gap-state paragraph
    (universal across couples) followed by a couple-type paragraph
    (specific to this couple). Both pulled from the data layer.
    """
    meta = DIM_META[dim_id]
    content = DIM_CONTENT[dim_id]
    u, p = COUPLE['u'], COUPLE['p']
    s_u, s_p = COUPLE['scores'][dim_id]
    status, gap = gap_status(s_u, s_p)

    # gap label for the side-meta string
    if status == 'aligned':
        gap_meta = ' well aligned'
    elif status == 'some_gap':
        gap_meta = ' some gap, worth noticing'
    else:
        gap_meta = ' a notable gap, worth real attention'

    # Paragraph 1: gap-state blurb. Universal across couples; describes
    # the gap mechanic itself.
    gap_text = GAP_BLURBS[dim_id][status]

    # Paragraph 2: couple-type blurb. Specific to this couple type.
    # Source: api/_workbook-content.js, loaded via WHEN_THIS_SHOWS_UP_BY_TYPE.
    # Content uses bracket placeholders like "[W partner name]" so reviewers
    # can see which partner is being referenced; substitute in real names at
    # build time. The first letter of the couple-type id maps to {U} (user),
    # the second letter to {P}.
    # Backward compat: legacy "the W" / "the X" shorthand is also supported.
    type_id = COUPLE['couple_type']['id']
    type_blurb = WHEN_THIS_SHOWS_UP_BY_TYPE[dim_id][type_id]
    # Same-type couples (WW, XX, ...) have "both of you" framing in source
    # content and don't need substitution. Cross-type couples do.
    if type_id[0] == type_id[1]:
        type_text = fill(type_blurb, u, p)
    else:
        type_text = type_blurb
        for letter, name in [(type_id[0], u), (type_id[1], p)]:
            # New bracket syntax.
            type_text = type_text.replace(f'[{letter} partner name]', name)
            # Legacy shorthand.
            type_text = type_text.replace(f'the {letter}', name)
            type_text = type_text.replace(f'The {letter}', name)
        type_text = fill(type_text, u, p)

    # 3 prompts (filled with names)
    prompts_html = ''
    for i, pr in enumerate(content['prompts'][:3], 1):
        prompts_html += f"""
        <div class="prompt-row">
          <span class="prompt-num">{i:02d}</span>
          <span class="prompt-text">{fill(pr, u, p)}</span>
        </div>"""

    pos_u = percent_position(s_u)
    pos_p = percent_position(s_p)
    connector_left = min(pos_u, pos_p)
    connector_width = abs(pos_u - pos_p)

    # Determine which marker is on left vs right for tag positioning
    if s_u < s_p:
        # u (Maya) on left, p (David) on right
        left_marker = (COUPLE['u'], s_u, pos_u)
        right_marker = (COUPLE['p'], s_p, pos_p)
    else:
        left_marker = (COUPLE['p'], s_p, pos_p)
        right_marker = (COUPLE['u'], s_u, pos_u)

    return f"""
<div class="page dim-page accent-{meta['color']}">
  <div class="page-running-head">
    <span>Part 01 · A closer look</span>
    <span>Dimension {dim_idx:02d} · {meta['label']}</span>
  </div>
  <div class="page-inner">
    <div class="dim-header" style="margin-top:.28in">
      <div class="dim-numeral">{dim_idx:02d}<span class="dim-numeral-of">/ 10</span></div>
      <div class="dim-meta">
        <div class="eyebrow dim-eyebrow">Communication · Dimension {['One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten'][dim_idx-1]}</div>
        <h1 class="dim-title">{meta['label'].split(' ', 1)[0]} <em>{' '.join(meta['label'].split(' ')[1:])}</em></h1>
      </div>
    </div>

    <!-- Spectrum -->
    <div class="spectrum">
      <div class="spectrum-head">
        <div class="spectrum-pole">{meta['left']}<span class="spectrum-pole-num">1.0</span></div>
        <div class="spectrum-pole right">{meta['right']}<span class="spectrum-pole-num">5.0</span></div>
      </div>
      <div class="spectrum-track">
        <div class="spectrum-line"></div>
        <div class="spectrum-tick" style="left:0%"></div><div class="spectrum-tick-num" style="left:0%">1</div>
        <div class="spectrum-tick" style="left:25%"></div><div class="spectrum-tick-num" style="left:25%">2</div>
        <div class="spectrum-tick" style="left:50%"></div><div class="spectrum-tick-num" style="left:50%">3</div>
        <div class="spectrum-tick" style="left:75%"></div><div class="spectrum-tick-num" style="left:75%">4</div>
        <div class="spectrum-tick" style="left:100%"></div><div class="spectrum-tick-num" style="left:100%">5</div>
        <div class="spectrum-connector" style="left:{connector_left}%;width:{connector_width}%"></div>
        <div class="spectrum-marker is-left" style="left:{left_marker[2]}%">
          <span class="spectrum-marker-score">{left_marker[1]:.1f}</span>
          <span class="spectrum-marker-tag">{left_marker[0]}</span>
          <div class="spectrum-marker-dot"></div>
        </div>
        <div class="spectrum-marker is-right" style="left:{right_marker[2]}%">
          <span class="spectrum-marker-score">{right_marker[1]:.1f}</span>
          <span class="spectrum-marker-tag">{right_marker[0]}</span>
          <div class="spectrum-marker-dot"></div>
        </div>
      </div>
    </div>

    <!-- What this measures + What this means for your relationship -->
    <div class="dim-body">
      <div class="what-measures">
        <div class="eyebrow what-measures-eye">What this measures</div>
        <p>{content['measures']}</p>
      </div>
      <div class="dim-analysis">
        <div class="eyebrow dim-analysis-eye">What this means for your relationship</div>
        <p>{gap_text}</p>
        <p style="margin-top:.45em">{type_text}</p>
      </div>
    </div>

    <!-- Reflection prompts (3) -->
    <div class="prompts-block">
      <div class="eyebrow prompts-eye">Reflection prompts</div>
      <div class="prompts-list">{prompts_html}
      </div>
    </div>

    <!-- Try this week -->
    <div class="try-this-week">
      <span class="ttw-icon">★</span>
      <div class="ttw-content">
        <span class="ttw-eye">Try this week</span>
        <p class="ttw-text">{fill(content['thisWeek'], u, p)}</p>
      </div>
    </div>

    <!-- Our notes (5 lines) -->
    <div class="writein-section">
      <div class="writein-head">
        <div class="eyebrow writein-eye">Our notes</div>
      </div>
      <div class="writein-area" style="--lines:5"></div>
    </div>
  </div>
  <div class="page-num">{page_num}</div>
</div>
"""

def build_expectation_page(domain, idx, page_num):
    """Render one of five expectation domain pages.

    Visual layout matches the v1 sample (side-by-side panes, alignment
    block, try-this-week, our-notes). Content sourcing is now keyed off
    the v2 domain model: universal row labels per DOMAIN_ROWS, values
    pulled from each partner's exercise responses, alignment state
    determined by the 75/40 thresholds in alignment_state().
    """
    u, p = COUPLE['u'], COUPLE['p']
    detail = COUPLE['expectations_detail'][domain['key']]
    pct = COUPLE['expectations'][domain['key']]
    state, state_label = alignment_state(pct)

    # Render each row. The row LABEL is universal (from DOMAIN_ROWS via
    # the data tuples). The VALUE on the right is the partner's answer.
    # fill() on the label resolves {U}/{P} placeholders that show up in
    # name-bearing domains like extended_family.
    # Keys in expectations_detail are lowercased partner names — for the
    # built-in sample they happen to be 'maya' and 'david', but in service
    # mode the transformer keys them by COUPLE['u'].lower() / [p].lower(),
    # so we look them up that way too.
    rows_u = detail.get(u.lower()) or detail.get('maya') or []
    rows_p = detail.get(p.lower()) or detail.get('david') or []
    items_a = ''.join(f'<div class="esbs-item"><span class="esbs-item-label">{fill(lab, u, p)}</span><span class="esbs-item-value">{val}</span></div>' for lab, val in rows_u)
    items_b = ''.join(f'<div class="esbs-item"><span class="esbs-item-label">{fill(lab, u, p)}</span><span class="esbs-item-value">{val}</span></div>' for lab, val in rows_p)

    analysis_text = fill(alignment_text(domain, pct), u, p)

    # Title split, italic on the second word.
    parts = domain['label'].split(' ', 1)
    title_word = parts[0]
    title_rest = parts[1] if len(parts) > 1 else ''

    icon = DOMAIN_ICONS.get(domain['key'], '·')
    domain_name_words = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']

    return f"""
<div class="page accent-{domain['color']}">
  <div class="page-running-head">
    <span>Part 01 · A closer look</span>
    <span>Expectations · Domain {idx:02d}</span>
  </div>
  <div class="page-inner">
    <div class="exp-page-header" style="margin-top:.28in">
      <div class="exp-page-icon">{icon}</div>
      <div style="display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:6px">
        <div class="eyebrow exp-page-eye">Expectations · Domain {domain_name_words[idx-1]}</div>
        <h1 class="exp-page-title">{title_word} <em>{title_rest}</em></h1>
      </div>
    </div>

    <div class="exp-side-by-side">
      <div class="esbs-pane partner-a">
        <span class="esbs-tag">{COUPLE['u']}'s expectations</span>
        <div class="esbs-list">{items_a}</div>
      </div>
      <div class="esbs-pane partner-b">
        <span class="esbs-tag">{COUPLE['p']}'s expectations</span>
        <div class="esbs-list">{items_b}</div>
      </div>
    </div>

    <div class="exp-page-analysis">
      <div class="eyebrow exp-page-analysis-eye">Where you are</div>
      <h2 class="exp-page-analysis-title">{pct}% aligned <em>· {state_label}</em></h2>
      <p>{analysis_text}</p>
    </div>

    <!-- Try this week -->
    <div class="try-this-week" style="margin-top:.28in">
      <span class="ttw-icon">★</span>
      <div class="ttw-content">
        <span class="ttw-eye">Try this week</span>
        <p class="ttw-text">{fill(domain['thisWeek'], u, p)}</p>
      </div>
    </div>

    <div class="writein-section">
      <div class="writein-head">
        <div class="eyebrow writein-eye">Our notes</div>
      </div>
      <div class="writein-area" style="--lines:4"></div>
    </div>
  </div>
  <div class="page-num">{page_num}</div>
</div>
"""

def build_working_knowledge_page(page_num, subject_name, other_name, type_letter, moments_data, page_label):
    """Working Knowledge: cross-type couple gets TWO pages per partner
    (3 moments each) so nothing is clipped by the 11in page constraint.
    Returns the concatenated HTML for both pages.
    """
    def render_card(i, m):
        d = moments_data.get(m['key'], {})
        # The prose contains {U} (the subject — the partner being described)
        # and {P} (the other partner, who reads the page). fill() resolves
        # those before they hit the HTML.
        return f"""
    <div class="moment-card">
      <div class="moment-header">
        <span class="moment-num">No. {i:02d}</span>
        <h3 class="moment-title">{m['title']}</h3>
      </div>
      <div class="moment-row">
        <span class="moment-row-label muted">The moment</span>
        <span class="moment-row-text">{fill(d.get('moment', ''), subject_name, other_name)}</span>
      </div>
      <div class="moment-row">
        <span class="moment-row-label purple">For {subject_name}</span>
        <span class="moment-row-text">{fill(d.get('happening', ''), subject_name, other_name)}</span>
      </div>
      <div class="moment-row">
        <span class="moment-row-label coral">What not to do</span>
        <span class="moment-row-text">{fill(d.get('not', ''), subject_name, other_name)}</span>
      </div>
      <div class="moment-row">
        <span class="moment-row-label green">What works</span>
        <span class="moment-row-text">{fill(d.get('works', ''), subject_name, other_name)}</span>
      </div>
      <div class="moment-row">
        <span class="moment-row-label indigo">Phrase that lands</span>
        <span class="moment-row-text italic">"{fill(d.get('phrase', ''), subject_name, other_name)}"</span>
      </div>
    </div>"""

    cards_first = ''.join(render_card(i, m) for i, m in enumerate(MOMENTS[:3], 1))
    cards_second = ''.join(render_card(i, m) for i, m in enumerate(MOMENTS[3:], 4))

    page1 = f"""
<div class="page">
  <div class="page-running-head">
    <span>Part 02 · Working Knowledge</span>
    <span>{page_label}</span>
  </div>
  <div class="page-inner">
    <div class="wk-intro" style="margin-top:.3in">
      <div class="eyebrow wk-eye">Working Knowledge</div>
      <h1 class="wk-title">What {other_name} should <em>know about {subject_name}.</em></h1>
      <p class="wk-lead">The six moments below are situations that recur in your relationship, each one with specific guidance for {other_name} on what's actually happening for {subject_name}, what to avoid, and what works.</p>
    </div>
    {cards_first}
  </div>
  <div class="page-num">{page_num}</div>
</div>"""

    page2 = f"""
<div class="page">
  <div class="page-running-head">
    <span>Part 02 · Working Knowledge · continued</span>
    <span>{page_label}</span>
  </div>
  <div class="page-inner">
    <div style="margin-top:.3in;margin-bottom:.18in">
      <div class="eyebrow wk-eye">Working Knowledge · continued</div>
      <p class="wk-lead" style="margin-top:.16in">Three more moments where {other_name} can offer {subject_name} the right kind of presence.</p>
    </div>
    {cards_second}
  </div>
  <div class="page-num">{page_num + 1}</div>
</div>"""

    return page1 + page2

def build_working_knowledge_same_type_page(page_num, u, p, type_letter, moments_data):
    """Working Knowledge — SAME TYPE variant. One shared section instead of two.
    Both partners share the wiring, so guidance is symmetric and frames the
    dynamic between two same-type partners rather than one-direction-to-the-other.
    Returns concatenated HTML for two pages (3 moments each) to match the
    cross-type page-count so the rest of the workbook layout is unchanged.
    """
    def render_card(i, m):
        d = moments_data.get(m['key'], {})
        # Same-type prose uses {U} and {P} as the two partners interchangeably.
        # fill() resolves them with the actual names.
        return f"""
    <div class="moment-card">
      <div class="moment-header">
        <span class="moment-num">No. {i:02d}</span>
        <h3 class="moment-title">{m['title']}</h3>
      </div>
      <div class="moment-row">
        <span class="moment-row-label muted">The moment</span>
        <span class="moment-row-text">{fill(d.get('moment', ''), u, p)}</span>
      </div>
      <div class="moment-row">
        <span class="moment-row-label purple">For both of you</span>
        <span class="moment-row-text">{fill(d.get('happening', ''), u, p)}</span>
      </div>
      <div class="moment-row">
        <span class="moment-row-label coral">Where you can get stuck</span>
        <span class="moment-row-text">{fill(d.get('not', ''), u, p)}</span>
      </div>
      <div class="moment-row">
        <span class="moment-row-label green">What works</span>
        <span class="moment-row-text">{fill(d.get('works', ''), u, p)}</span>
      </div>
      <div class="moment-row">
        <span class="moment-row-label indigo">A cue either of you can use</span>
        <span class="moment-row-text italic">"{fill(d.get('phrase', ''), u, p)}"</span>
      </div>
    </div>"""

    cards_first = ''.join(render_card(i, m) for i, m in enumerate(MOMENTS[:3], 1))
    cards_second = ''.join(render_card(i, m) for i, m in enumerate(MOMENTS[3:], 4))

    page_label = f"How you two should approach specific situations"

    page1 = f"""
<div class="page">
  <div class="page-running-head">
    <span>Part 02 · Working Knowledge</span>
    <span>{page_label}</span>
  </div>
  <div class="page-inner">
    <div class="wk-intro" style="margin-top:.3in">
      <div class="eyebrow wk-eye">Working Knowledge</div>
      <h1 class="wk-title">How you two should <em>approach specific situations.</em></h1>
      <p class="wk-lead">{u} and {p} share Type {type_letter}, so these moments land the same way for both of you. That's an asset and a risk. You understand each other's defaults instantly. You can also reinforce them when a different angle would help. Use these six situations as a mutual reference.</p>
    </div>
    {cards_first}
  </div>
  <div class="page-num">{page_num}</div>
</div>"""

    page2 = f"""
<div class="page">
  <div class="page-running-head">
    <span>Part 02 · Working Knowledge · continued</span>
    <span>{page_label}</span>
  </div>
  <div class="page-inner">
    <div style="margin-top:.3in;margin-bottom:.18in">
      <div class="eyebrow wk-eye">Working Knowledge · continued</div>
      <p class="wk-lead" style="margin-top:.16in">Three more situations. Same shared wiring, different shapes.</p>
    </div>
    {cards_second}
  </div>
  <div class="page-num">{page_num + 1}</div>
</div>"""

    return page1 + page2

def build_workbook_preparing(page_num):
    """Part 3 page 1: Preparing together."""
    prompts = [
        {'q': "What's the thing you want to say but haven't said yet?",
         'hint': 'e.g., "I\'ve been feeling overwhelmed but haven\'t named it."'},
        {'q': "What's been sitting with you most from this workbook?",
         'hint': 'e.g., "I didn\'t realize how differently we handle stress."'},
        {'q': "If one thing changed in how you two talk, what would you want it to be?",
         'hint': 'e.g., "I want to stop defaulting to \'fine\' when I\'m not."'},
    ]
    prompts_html = ''
    for i, p in enumerate(prompts, 1):
        prompts_html += f"""
    <div class="wb-prompt">
      <div class="wb-prompt-q">
        <span class="wb-prompt-num">{i}.</span>
        <span class="wb-prompt-text">{p['q']}</span>
      </div>
      <p class="wb-prompt-hint">{p['hint']}</p>
      <div class="writein-area" style="--lines:5"></div>
    </div>"""

    return f"""
<div class="page">
  <div class="page-running-head">
    <span>Part 03 · Workbook</span>
    <span>Preparing together</span>
  </div>
  <div class="page-inner">
    <div class="wb-page-header" style="margin-top:.32in">
      <div class="eyebrow wb-page-eye">Workbook · Page 01</div>
      <h1 class="wb-page-title">Preparing <em>together.</em></h1>
      <p class="wb-page-sub">A few questions to discuss and answer together before you pick what to focus on. No right answers. Write what comes up.</p>
    </div>
    {prompts_html}
  </div>
  <div class="page-num">{page_num}</div>
</div>
"""

def build_focus_area_page(num, page_num):
    """Part 3 pages 2-4: focus areas."""
    return f"""
<div class="page">
  <div class="page-running-head">
    <span>Part 03 · Workbook</span>
    <span>Focus area {num}</span>
  </div>
  <div class="page-inner">
    <div style="margin-top:.32in">
      <div class="focus-area-page-eye">Focus area {num}</div>
      <h1 class="focus-area-title">What we're focusing on.</h1>
    </div>

    <div class="focus-area-section">
      <div class="focus-area-section-eye">The dimension, expectation area, or pattern you want to work on</div>
      <div class="writein-area" style="--lines:2"></div>
    </div>

    <div class="focus-area-section">
      <div class="focus-area-section-eye">Why this matters to us</div>
      <div class="writein-area" style="--lines:4"></div>
    </div>

    <div class="focus-area-section">
      <div class="focus-area-section-eye">What we'll each try</div>
      <div class="focus-area-twocol">
        <div>
          <div class="focus-area-col-label" style="color:var(--coral-deep)">What {COUPLE['u']} will do</div>
          <div class="writein-area" style="--lines:5"></div>
        </div>
        <div>
          <div class="focus-area-col-label" style="color:var(--indigo-deep)">What {COUPLE['p']} will do</div>
          <div class="writein-area" style="--lines:5"></div>
        </div>
      </div>
    </div>

    <div class="focus-area-section">
      <div class="focus-area-section-eye">Timeline and check-in</div>
      <p class="wb-prompt-hint" style="padding-left:0;margin-bottom:8px">e.g., "small check-in every Sunday; revisit the whole thing in 30 days."</p>
      <div class="writein-area" style="--lines:5"></div>
    </div>
  </div>
  <div class="page-num">{page_num}</div>
</div>
"""

def build_30day_checkin(page_num):
    prompts = [
        "What changed (if anything) over the last 30 days?",
        "Did the focus areas we wrote down actually get attention? What got in the way?",
        "One small thing to try differently in the next 30 days.",
    ]
    prompts_html = ''
    for i, q in enumerate(prompts, 1):
        prompts_html += f"""
    <div class="wb-prompt">
      <div class="wb-prompt-q">
        <span class="wb-prompt-num">{i}.</span>
        <span class="wb-prompt-text">{q}</span>
      </div>
      <div class="writein-area" style="--lines:6"></div>
    </div>"""
    return f"""
<div class="page">
  <div class="page-running-head"><span>Part 03 · Workbook</span><span>30-day check-in</span></div>
  <div class="page-inner">
    <div class="wb-page-header" style="margin-top:.32in">
      <div class="eyebrow wb-page-eye">30-day check-in</div>
      <h1 class="wb-page-title">Come back <em>in a month.</em></h1>
      <p class="wb-page-sub">Answer honestly. Write in the workbook, that's what it's for.</p>
    </div>{prompts_html}
  </div>
  <div class="page-num">{page_num}</div>
</div>
"""

def build_conversation_library_page(page_num, situations_subset, is_first=True):
    cards = []
    for s in situations_subset:
        prompts = SITUATION_PROMPTS.get(s['key'], [])
        prompts_html = ''.join(f'<div class="situation-prompt">{pr}</div>' for pr in prompts)
        cards.append(f"""
    <div class="situation-card">
      <h3 class="situation-title">{s['title']}</h3>
      <p class="situation-blurb">{s['blurb']}</p>
      <div class="situation-prompts">{prompts_html}</div>
    </div>""")

    intro_html = ''
    if is_first:
        intro_html = """
    <div class="cl-page-header" style="margin-top:.32in">
      <div class="eyebrow cl-page-eye">Part 04 · Conversation Library</div>
      <h1 class="cl-page-title">Words for the situations <em>you'll actually find yourselves in.</em></h1>
    </div>"""

    return f"""
<div class="page">
  <div class="page-running-head"><span>Part 04 · Conversation Library</span><span>Situations</span></div>
  <div class="page-inner">{intro_html}{''.join(cards)}
  </div>
  <div class="page-num">{page_num}</div>
</div>
"""

def build_first_conversation_guide(page_num):
    phases = [
        {'num': 1, 'title': 'Opening', 'time': '10 min', 'color': 'coral', 'body': 'Each person answers these two questions out loud. Don\'t respond to each other yet, just listen.', 'prompts': ['What\'s one thing you were curious or nervous about going into these exercises?', f'What do you most want to understand better about {COUPLE["p"]} after doing this?']},
        {'num': 2, 'title': 'What Resonated', 'time': '15 min', 'color': 'indigo', 'body': 'Look at your Snapshot together. Each person takes a turn:', 'prompts': ['What result surprised you most?', 'What result felt most accurate?', 'Is there anything you disagree with or want to push back on?']},
        {'num': 3, 'title': 'Your Focus Areas', 'time': '20 min', 'color': 'green', 'body': 'Together, pick one to three things you want to focus on over the next month.', 'prompts': ['Say it out loud, name what you want to change and why.', 'Each person describes a recent moment where this showed up.', 'Write your commitment in the workbook. Small and specific beats ambitious and vague.']},
        {'num': 4, 'title': "What's Going Well", 'time': '10 min', 'color': 'purple', 'body': "It's easy to spend all the time on gaps. This phase is deliberate.", 'prompts': ['Name three specific things that have worked well, things you want to protect.', 'Each person names something the other does that they haven\'t said thank you for specifically.', 'Name one thing about how your partner is wired that you genuinely appreciate.']},
    ]
    phases_html = ''
    for ph in phases:
        prompts_html = ''.join(f'<div class="situation-prompt">{p}</div>' for p in ph['prompts'])
        phases_html += f"""
    <div class="situation-card">
      <h3 class="situation-title">Phase {ph['num']}, {ph['title']}</h3>
      <p class="situation-blurb">{ph['time']} · {ph['body']}</p>
      <div class="situation-prompts">{prompts_html}</div>
    </div>"""
    return f"""
<div class="page">
  <div class="page-running-head"><span>Part 04 · Conversation Library</span><span>A structured first conversation</span></div>
  <div class="page-inner">
    <div class="cl-page-header" style="margin-top:.32in">
      <div class="eyebrow cl-page-eye">A structured first conversation</div>
      <h1 class="cl-page-title">A guided <em>60-minute conversation.</em></h1>
    </div>{phases_html}
  </div>
  <div class="page-num">{page_num}</div>
</div>
"""

def build_reference_card(page_num):
    # The phrase comes from the couple type's first tip. If it's missing for any
    # reason, drop the whole section rather than printing an empty quote.
    _phrase = (COUPLE.get('couple_type', {}) or {}).get('phrase_that_lands') or ''
    _phrase = fill(_phrase, COUPLE['u'], COUPLE['p']).strip() if _phrase else ''
    phrase_block = (
        '<div class="refcard-section">'
        '<span class="refcard-section-eye">Phrase for the two of you</span>'
        f'<p class="refcard-phrase-text">&ldquo;{_phrase}&rdquo;</p>'
        '</div>'
    ) if _phrase else ''
    """Reference card, cream paper on tan page bg. v3 layout per Ellie's
    approved mockup (May 2026).

    Card layout (top to bottom):
      - Top row: Attune logo (left) + partner names large in indigo-deep (right)
      - Middle: "Understanding takes intention." centered italic
      - Section 1: "Phrase for the two of you" eyebrow + phrase_that_lands
      - Section 2: "What we're going to work on" eyebrow + lined write-in area

    Below the card (stays in the workbook, not cut out): "Keep this somewhere
    you'll see it" + tips + "Explore Attune In Practice" callout.
    """
    return f"""
<div class="page refcard-page">
  <!-- Cutout wrapper: dashed border on 4 sides goes around the card -->
  <div class="refcard-cutout">
    <span class="refcard-cutline-label">· cut along this line ·</span>
    <div class="refcard-card">

      <div class="refcard-top">
        <div class="refcard-logo">
          <svg class="refcard-logo-svg" width="60" height="44" viewBox="0 0 103 76" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="refcardLogoGrad" x1="0" y1="0" x2="103" y2="76" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#E8673A"/>
                <stop offset="100%" stop-color="#1B5FE8"/>
              </linearGradient>
            </defs>
            <path d="M14,4 L44,4 A9,9 0 0,1 53,13 L53,42 A9,9 0 0,1 44,51 L20,51 L6,61 L11,51 A6,6 0 0,1 5,45 L5,13 A9,9 0 0,1 14,4 Z" fill="url(#refcardLogoGrad)"/>
            <path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="white" opacity="0.93" transform="translate(13.16,11.3) scale(0.72)"/>
            <path d="M89,14 L59,14 A9,9 0 0,0 50,23 L50,52 A9,9 0 0,0 59,61 L83,61 L97,71 L92,61 A6,6 0 0,0 98,55 L98,23 A9,9 0 0,0 89,14 Z" fill="white" stroke="url(#refcardLogoGrad)" stroke-width="2.2" stroke-linejoin="round"/>
            <path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="url(#refcardLogoGrad)" transform="translate(58.16,21.3) scale(0.72)"/>
          </svg>
          <div class="refcard-logo-wordmark">
            <span class="refcard-logo-name">Attune</span>
            <span class="refcard-logo-kicker">Relationships</span>
          </div>
        </div>
        <h1 class="refcard-names">{COUPLE['u']} <em>&amp;</em> {COUPLE['p']}</h1>
      </div>

      <div class="refcard-middle">
        <p class="refcard-intention">Understanding takes intention.</p>
      </div>

      {phrase_block}

      <div class="refcard-section">
        <span class="refcard-section-eye">What we're going to work on</span>
        <div class="refcard-workon-area"></div>
      </div>

    </div>
  </div>

  <!-- Context info sits on the page bg (tan) below the card -->
  <div class="refcard-context">
    <div class="refcard-ctx-head">
      <div class="eyebrow refcard-ctx-eye">How to use the card</div>
      <span class="refcard-ctx-num">Page {page_num}</span>
    </div>
    <h2 class="refcard-ctx-title">Keep this <em>somewhere you'll see it.</em></h2>
    <p class="refcard-ctx-body">The reference card is built from your couple type. Cut along the dashed line above and write what the two of you want to focus on this week in the open box. Replace it each week, or carry the same one forward.</p>
    <div class="refcard-ctx-tips">
      <div class="refcard-ctx-tip">
        <span class="refcard-ctx-tip-label">Where to keep it</span>
        <span class="refcard-ctx-tip-text">Inside the medicine cabinet, on the fridge, in a wallet, anywhere you pass through routinely.</span>
      </div>
      <div class="refcard-ctx-tip">
        <span class="refcard-ctx-tip-label">When to look</span>
        <span class="refcard-ctx-tip-text">Before a hard conversation. After a friction moment. When the week has felt off and you're not sure why.</span>
      </div>
      <div class="refcard-ctx-tip">
        <span class="refcard-ctx-tip-label">When to update</span>
        <span class="refcard-ctx-tip-text">At your six-month check-in, you'll get a fresh card with what's shifted. Reorder anytime at attune-relationships.com.</span>
      </div>
    </div>

    <!-- "Explore Attune In Practice" callout, lives below tips, above footer -->
    <div class="refcard-inpractice">
      <span class="refcard-inpractice-eye">Explore Attune In Practice</span>
      <p class="refcard-inpractice-text">More tools, follow-ups, and conversations built around results like yours. <strong>attune-relationships.com/in-practice</strong></p>
    </div>

    <p class="refcard-mark-foot">attune-relationships.com</p>
  </div>
</div>
"""

# ═══════════════════════════════════════════════════════════════════
# COMPOSE FULL WORKBOOK
# ═══════════════════════════════════════════════════════════════════

def build_full_workbook(same_type=False, is_service=False):
    pages = []
    pn = 1

    # 1. Cover (no page number visible)
    pages.append(build_cover())
    pn = 2

    # 2. TOC (page 002)
    pages.append(build_toc())
    pn = 3

    # 3. Intro (003)
    pages.append(build_intro(pn))
    pn += 1

    # 4. Snapshot (004)
    pages.append(build_snapshot(pn))
    pn += 1

    # 5. Part 1 cover (005)
    pages.append(build_part_divider(
        1, 'A closer look',
        'The dimensions <em>that quietly shape</em> the way you operate.',
        'blue',
        "Most friction in long relationships isn't incompatibility. It's two people running on different blueprints, neither of which has been said out loud.",
        'From the Attune methodology · §03',
        pn,
    ))
    pn += 1

    # 6. Communication section header page (006) - light intro
    pages.append(f"""
<div class="page">
  <div class="page-running-head"><span>Part 01 · A closer look</span><span>Communication</span></div>
  <div class="page-inner">
    <div class="section-intro">
      <div class="eyebrow section-intro-eye" style="color:var(--indigo-deep)">Section A · Communication</div>
      <h1 class="section-intro-title">Ten dimensions of <em style="color:var(--indigo-deep)">how you talk to each other.</em></h1>
      <p class="section-intro-lead">Each dimension is a slice of how {COUPLE['u']} and {COUPLE['p']} actually communicate, energy, expression, conflict, repair, the small everyday currencies. Where you align, the answers come without translation. Where you don't, the gap is the conversation.</p>
      <div class="section-intro-rule"></div>
      <p class="section-intro-foot">For each dimension, you'll see the spectrum, where each of you sits, what the gap means, three reflection prompts, a small experiment for the week, and space to write what you want to try together.</p>
    </div>
  </div>
  <div class="page-num">{pn}</div>
</div>
""")
    pn += 1

    # 7. Communication dimensions (10 pages)
    for i, dim in enumerate(DIMS, 1):
        pages.append(build_dimension_page(dim, i, pn))
        pn += 1

    # 8. Expectations section header page
    pages.append(f"""
<div class="page">
  <div class="page-running-head"><span>Part 01 · A closer look</span><span>Expectations</span></div>
  <div class="page-inner">
    <div class="section-intro">
      <div class="eyebrow section-intro-eye" style="color:var(--gold-deep)">Section B · Expectations</div>
      <h1 class="section-intro-title">Six domains of <em style="color:var(--gold-deep)">what you each assume.</em></h1>
      <p class="section-intro-lead">Most friction in long-term partnerships isn't about communication style. It's about quietly mismatched assumptions, who's leading what, how money should be held, what the next five years look like. The exercise surfaced what each of you actually expects. The next six pages put those expectations side by side.</p>
    </div>
  </div>
  <div class="page-num">{pn}</div>
</div>
""")
    pn += 1

    # 9. Expectations pages (7 pages)
    for i, dom in enumerate(EXP_DOMAINS, 1):
        pages.append(build_expectation_page(dom, i, pn))
        pn += 1

    # 10. Part 2 cover
    pages.append(build_part_divider(
        2, 'Working knowledge',
        'Six moments. <em>Specific language</em> for each.',
        'purple',
        "Knowing another person isn't a single insight. It's a thousand small moments where you didn't have to ask, because you already knew.",
        'From the Attune methodology · §05',
        pn,
    ))
    pn += 1

    # 11. Working Knowledge — same-type or cross-type variant
    # COUPLE['couple_type']['id'] is a 2-letter string like 'WX', 'YZ', 'WW'.
    # The first letter is the user's individual type; the second is the
    # partner's. We drive everything off this — no hardcoded W/X.
    type_id = COUPLE['couple_type']['id']
    u_type = type_id[0]
    p_type = type_id[1]
    if same_type:
        # Same-type: one shared section. We only have content for shared W
        # right now (MOMENTS_SHARED_W). If/when MOMENTS_SHARED_X/Y/Z are
        # written, look them up by u_type the same way as TYPE_MOMENTS.
        pages.append(build_working_knowledge_same_type_page(
            pn,
            u=COUPLE['u'], p=COUPLE['p'],
            type_letter=u_type, moments_data=MOMENTS_SHARED_W,
        ))
        pn += 1
    else:
        # Cross-type: two pages, one per partner. Each page renders the
        # SUBJECT partner's content (the type letter that describes them).
        pages.append(build_working_knowledge_page(
            pn,
            subject_name=COUPLE['u'], other_name=COUPLE['p'],
            type_letter=u_type, moments_data=TYPE_MOMENTS[u_type],
            page_label=f"What {COUPLE['p']} should know about {COUPLE['u']}",
        ))
        pn += 1
        pages.append(build_working_knowledge_page(
            pn,
            subject_name=COUPLE['p'], other_name=COUPLE['u'],
            type_letter=p_type, moments_data=TYPE_MOMENTS[p_type],
            page_label=f"What {COUPLE['u']} should know about {COUPLE['p']}",
        ))
        pn += 1

    # 12. Part 3 cover
    pages.append(build_part_divider(
        3, 'Workbook',
        'Your <em>focus areas.</em> Your words. Your pace.',
        'orange',
        "Small and specific beats ambitious and vague. The thing you'll actually do is the thing you'll write down.",
        'From the Attune methodology · §07',
        pn,
    ))
    pn += 1

    # 13. Workbook — Preparing together
    pages.append(build_workbook_preparing(pn))
    pn += 1

    # 14. Focus areas 1, 2, 3
    for i in range(1, 4):
        pages.append(build_focus_area_page(i, pn))
        pn += 1

    # 15. 30-day check-in
    pages.append(build_30day_checkin(pn))
    pn += 1

    # 16. Part 4 cover
    pages.append(build_part_divider(
        4, 'Conversation library',
        'Words for the situations <em>you\'ll actually find yourselves in.</em>',
        'purple',
        "The right question, asked at the right time, does more than a hundred well-meaning statements.",
        'From the Attune methodology · §08',
        pn,
    ))
    pn += 1

    # 17. Conversation library — 5 situations split across 2 pages
    pages.append(build_conversation_library_page(pn, SITUATIONS[:3], is_first=True))
    pn += 1
    pages.append(build_conversation_library_page(pn, SITUATIONS[3:], is_first=False))
    pn += 1

    # 18. A structured first conversation
    pages.append(build_first_conversation_guide(pn))
    pn += 1

    # 19. Part 5 cover
    pages.append(build_part_divider(
        5, 'Reference card',
        'A <em>half-page summary.</em> Keep it somewhere you\'ll see it.',
        'green',
        "When something's hard and you don't have time to flip through the workbook, this is the page.",
        'Workbook · Part 05',
        pn,
    ))
    pn += 1

    # 20. Reference card (half-page cutout)
    pages.append(build_reference_card(pn))
    pn += 1

    # Compose final HTML. The "Demo data" banner is for design iteration
    # and sample renders only — for real customer payloads (service mode)
    # the body has no banner and no top padding.
    body_class = '' if is_service else ' class="has-banner"'
    banner_html = '' if is_service else f"""
<div class="sample-banner">
  <span>Attune Workbook · Full Sample · {COUPLE['u']} &amp; {COUPLE['p']}</span>
  <span>Demo data · Letter trim · {len(pages)} pages</span>
</div>
"""
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Attune Workbook, {COUPLE['u']} &amp; {COUPLE['p']}</title>
{_build_font_face_block()}
<style>{CSS}
.sample-banner{{
  position:fixed;top:0;left:0;right:0;
  background:var(--ink);color:white;
  padding:10px 20px;
  font-family:var(--bfont);font-size:11px;letter-spacing:.18em;
  text-transform:uppercase;font-weight:600;
  z-index:1000;display:flex;justify-content:space-between;align-items:center;
  box-shadow:0 2px 16px rgba(0,0,0,.15);
}}
.sample-banner span:last-child{{color:rgba(255,255,255,.55);font-size:10px}}
body.has-banner{{padding-top:96px}}
@media print{{.sample-banner{{display:none}}body.has-banner{{padding-top:0}}}}
</style>
</head>
<body{body_class}>
{banner_html}
{''.join(pages)}

</body>
</html>
"""
    return html

# ═══════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    # ── Service mode ────────────────────────────────────────────────
    # Read a COUPLE-shaped JSON payload from stdin, render the workbook
    # HTML, write to stdout. Used by the production workbook service.
    # The caller is responsible for transforming src/App.jsx's
    # buildWorkbookPayload output into the COUPLE shape (see SERVICE_INTEGRATION.md).
    if '--from-stdin' in sys.argv:
        try:
            payload = json.loads(sys.stdin.read())
        except json.JSONDecodeError as e:
            sys.stderr.write(f'Invalid JSON on stdin: {e}\n')
            sys.exit(1)
        # Validate the minimum required keys before swapping COUPLE so
        # the renderer doesn't blow up mid-page on a missing field.
        required = ['u', 'p', 'couple_type', 'scores', 'expectations', 'expectations_detail']
        missing = [k for k in required if k not in payload]
        if missing:
            sys.stderr.write(f'Payload missing required keys: {missing}\n')
            sys.exit(2)
        # Override the module-level COUPLE; build_full_workbook reads
        # from this global, so all downstream renders use the new data.
        globals()['COUPLE'] = payload
        same_type = ('--same-type' in sys.argv)
        # is_service=True suppresses the design-iteration "Demo data" banner
        # that's appropriate only for local sample renders.
        html = build_full_workbook(same_type=same_type, is_service=True)
        sys.stdout.write(html)
        sys.exit(0)

    # ── Local sample mode (default) ─────────────────────────────────
    # Cross-type sample (Maya W + David X)
    out = Path('/mnt/user-data/outputs/attune_workbook_sample.html')
    html = build_full_workbook(same_type=False)
    out.write_text(html)
    print(f'Wrote {out} ({len(html):,} chars)')

    # Same-type sample (Maya + David both pretending to be W, for visual review of new Working Knowledge variant)
    out2 = Path('/mnt/user-data/outputs/attune_workbook_sample_same_type.html')
    html2 = build_full_workbook(same_type=True)
    out2.write_text(html2)
    print(f'Wrote {out2} ({len(html2):,} chars)')
