import React, { useState, useEffect, useLayoutEffect, useRef } from "react";


// ── Mobile detection hook ─────────────────────────────────────────────────────
function useMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}


const C = {
  cream: "#FFFDF9", warm: "#FBF8F3", stone: "#E8DDD0",
  clay: "#C17F47", bark: "#7C4D28", deep: "#14100A",
  text: "#1E1610", muted: "#8C7A68", accent: "#C17F47",
  ink: "#0E0B07",
  // Dimension accent palette -- used on exercise cards
  dAccent: ["#E8673A","#1B5FE8","#2AB07F","#E040A0","#F5A623","#9B5DE5","#00B4CC","#E8503A"],
};
const font = { display: "'Playfair Display', Georgia, serif", body: "'DM Sans', system-ui, sans-serif" };
const FONT_LINK = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600;700&display=swap";

// -- 8-DIMENSION PERSONALITY QUESTIONS (5 each = 40 total) --
// ── INTENTIONAL COLOR SCHEMA ──────────────────────────────────────────────────
// Purple  #9B5DE5  = Your Inner Worlds     (energy, expression, closeness)
// Orange  #E8673A  = How You Connect       (love, needs, bids)
// Blue    #1B5FE8  = When Things Get Hard  (conflict, stress, repair, feedback)
// Green   #10B981  = The Life You're Building (expectations domains)
// ─────────────────────────────────────────────────────────────────────────────
const DIM_META = {
  // INNER WORLDS — purple
  energy:      { label: "Energy & Recharge",              emoji: "", ends: ["Inward","Outward"],            color: "#9B5DE5", bg: "#F3EEFF", dark: "#5B21B6", domain: "inner" },
  expression:  { label: "Emotional Expression",           emoji: "", ends: ["Internal","External"],         color: "#9B5DE5", bg: "#F3EEFF", dark: "#5B21B6", domain: "inner" },
  closeness:   { label: "Closeness & Independence",       emoji: "", ends: ["Autonomous","Enmeshed"],       color: "#9B5DE5", bg: "#F3EEFF", dark: "#5B21B6", domain: "inner" },
  // CONNECTION — orange
  love:        { label: "How Love Lands",                 emoji: "", ends: ["Words","Actions"],             color: "#E8673A", bg: "#FFF3EE", dark: "#C2410C", domain: "connection" },
  needs:       { label: "How You Ask For What You Need",  emoji: "", ends: ["Direct","Indirect"],           color: "#E8673A", bg: "#FFF3EE", dark: "#C2410C", domain: "connection" },
  bids:        { label: "Responding to Bids",             emoji: "", ends: ["Reserved","Attuned"],          color: "#E8673A", bg: "#FFF3EE", dark: "#C2410C", domain: "connection" },
  // HARD MOMENTS — blue
  conflict:    { label: "Conflict Style",                 emoji: "", ends: ["Engage","Withdraw"],           color: "#1B5FE8", bg: "#EEF3FF", dark: "#1E3A8A", domain: "hard" },
  stress:      { label: "Communication Under Stress",     emoji: "", ends: ["Withdraw","Seek"],             color: "#1B5FE8", bg: "#EEF3FF", dark: "#1E3A8A", domain: "hard" },
  repair:      { label: "How You Repair",                 emoji: "", ends: ["Formal","Informal"],           color: "#1B5FE8", bg: "#EEF3FF", dark: "#1E3A8A", domain: "hard" },
  feedback:    { label: "Giving & Receiving Feedback",    emoji: "", ends: ["Guarded","Open"],              color: "#1B5FE8", bg: "#EEF3FF", dark: "#1E3A8A", domain: "hard" },
};

const DIMS = ["energy","expression","needs","bids","conflict","repair","closeness","love","stress","feedback"];

// Gap -> label system (playful/warm/direct mix by degree)
// Dimension-aware label pool -- each dimension has its own voice

// -- Results font constants --
const RFONT = "'Syne', sans-serif";
const BFONT = "'DM Sans', sans-serif";
const HFONT = "'Playfair Display', Georgia, serif";
const FONT_URL = "https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap";


const PERSONALITY_QUESTIONS = [
  // ── Chapter 1: How you're wired (9) — energy, expression, love, closeness ──
  { id:"en1", dimension:"energy",     text:"After a long week, you reset by:", a:"Time alone. Quiet is what restores you.", b:"Being with people you love. Connection is what recharges you." },
  { id:"ex1", dimension:"expression", text:"When you're upset, you tend to:", a:"Go quiet. You process internally before you're ready to share.", b:"Let it show. Your partner usually knows exactly how you're feeling." },
  { id:"lv1", dimension:"love",       text:"You feel most loved when your partner:", a:"Tells you. Words — spoken or written, specific and sincere — land most deeply.", b:"Shows you. Presence, touch, acts of care, and shared time speak louder than words." },
  { id:"en2", dimension:"energy",     text:"When you're working through something hard, you tend to:", a:"Think it through privately first, then share once you've landed somewhere.", b:"Talk it out. Saying it aloud is how you figure out what you think." },
  { id:"ex2", dimension:"expression", text:"Emotional openness in a relationship means:", a:"Sharing thoughtfully — not everything needs to be said, just the things that matter.", b:"Your partner having access to what's going on inside you, in real time." },
  { id:"lv2", dimension:"love",       text:"You show love primarily by:", a:"Expressing it, verbally and explicitly.", b:"Doing things. Showing up, making things easier, creating moments of closeness." },
  { id:"cl2", dimension:"closeness",  text:"When it comes to friendships and social lives, you:", a:"Need your own. Separate friendships and pursuits are part of how you stay yourself.", b:"Prefer mostly shared. Doing things together is how you want to spend your time." },
  { id:"en4", dimension:"energy",     text:"When your partner needs alone time, your instinct is:", a:"Respect it immediately.", b:"Check in. Silence can feel like something's wrong." },
  { id:"ex4", dimension:"expression", text:"Your partner being able to read your mood:", a:"Isn't something you expect. You'd rather just say what you need directly.", b:"Matters to you. Being seen without having to explain feels like closeness." },

  // ── Chapter 2: How you connect and what you need (7) — bids, needs, love ──
  { id:"bd1", dimension:"bids",       text:"Small everyday moments of connection — a squeeze of the hand, a brief check-in, a shared look:", a:"Are nice but not something you track or depend on.", b:"Matter a lot. They're how you feel close day to day." },
  { id:"nd1", dimension:"needs",      text:"When you need something from your partner, you expect them to:", a:"Wait to be told. You don't expect them to know unless you say so.", b:"Pick up on it. A partner who knows you well should be able to tell." },
  { id:"lv5", dimension:"love",       text:"In ordinary day-to-day life, you feel closest to your partner when:", a:"You're talking. Conversation is the thread that keeps you close.", b:"You're simply together. Shared presence, physical closeness, doing life side by side." },
  { id:"bd3", dimension:"bids",       text:"In your relationship, you tend to:", a:"Wait for your partner to initiate small moments of connection.", b:"Reach for connection often — through small gestures, check-ins, or brief touches." },
  { id:"nd3", dimension:"needs",      text:"Going without something you need rather than asking for it:", a:"Rarely happens. Asking feels natural to you.", b:"Is something you do more than you'd like." },
  { id:"bd4", dimension:"bids",       text:"When you reach for a small moment of connection and your partner doesn't respond:", a:"You let it go easily. It doesn't stay with you.", b:"You notice. It can leave you feeling a little distant or unseen." },
  { id:"nd5", dimension:"needs",      text:"Articulating what you need from a partner feels:", a:"Straightforward. You can usually name it.", b:"Harder than it should be, even when you know something's missing." },

  // ── Chapter 3: When things get hard (6) — conflict, stress ──
  { id:"cf1", dimension:"conflict",   text:"When something feels off between you, you:", a:"Want to address it as soon as possible. Leaving things unresolved sits heavily with you.", b:"Need time before you can engage. Space first, conversation later." },
  { id:"st1", dimension:"stress",     text:"When you're overwhelmed or under real pressure, you:", a:"Go quiet and withdraw. You need space before you can engage with anyone, including your partner.", b:"Reach outward. You become more communicative and need reassurance and contact to regulate." },
  { id:"cf2", dimension:"conflict",   text:"Once you're in conflict, you tend to:", a:"Stay engaged, even when it's uncomfortable. You'd rather push through than step back.", b:"Need to step away. You can't access your best self when you're activated." },
  { id:"st2", dimension:"stress",     text:"When you're stressed, what you need most from your partner is:", a:"Space and no pressure to talk. Being left alone to recover is what actually helps.", b:"Presence and acknowledgment. Knowing they're there and that they see it is what helps most." },
  { id:"cf5", dimension:"conflict",   text:"You can engage productively in conflict when:", a:"You feel emotionally safe enough to stay in it. Tone and approach matter a lot to you.", b:"The issue is on the table. You can work through discomfort to get to resolution." },
  { id:"st5", dimension:"stress",     text:"When you're already stressed, the thing most likely to make it harder is:", a:"Being pushed to talk or engage before you're ready.", b:"Silence or distance from your partner. Feeling like they've withdrawn or stopped trying to reach you." },

  // ── Chapter 4: Making things right (6) — repair, feedback ──
  { id:"rp1", dimension:"repair",     text:"When you've upset your partner, your instinct is to:", a:"Address it explicitly. Name what happened and apologize directly.", b:"Show it through actions. Come back with warmth and let that speak." },
  { id:"fb1", dimension:"feedback",   text:"When your partner does something that bothers you, you:", a:"Tend to let it go or hint at it. Direct feedback feels risky or unkind.", b:"Usually say something. You'd rather address it than carry it." },
  { id:"rp2", dimension:"repair",     text:"When you've been hurt, you feel ready to move forward when:", a:"Your partner has named what happened and shown they understand.", b:"The tension has lifted and things feel okay between you again." },
  { id:"fb2", dimension:"feedback",   text:"When your partner gives you honest critical feedback, your immediate reaction is:", a:"Defensive. Even when you know they mean well, your first instinct is to push back.", b:"Relatively open. You can usually hear it without feeling attacked, at least initially." },
  { id:"rp3", dimension:"repair",     text:"After a conflict, you need repair to happen:", a:"Relatively quickly. Unresolved tension sitting overnight or longer is hard for you.", b:"When it's ready. You can hold unresolved tension without it consuming you." },
  { id:"fb5", dimension:"feedback",   text:"You can receive feedback from your partner most easily when:", a:"The tone is calm and the timing feels considered. Approach makes all the difference for you.", b:"It's direct and specific. You'd rather have it straight than carefully managed." },
];



// -- INLINE CHOICE (replaces dropdowns) --
function InlineChoice({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
      {options.map(opt => {
        const sel = value === opt;
        const short = opt.replace(" did it","").replace("Doesn't apply to us","N/A").replace("Both of us","Both");
        return <button key={opt} onClick={() => onChange(opt)} style={{ padding: "0.22rem 0.55rem", border: ("1px solid " + (sel ? C.clay : C.stone)), background: sel ? "rgba(184,150,110,0.12)" : "transparent", color: sel ? C.deep : C.muted, fontSize: "0.7rem", cursor: "pointer", fontFamily: font.body, borderRadius: 2, whiteSpace: "nowrap", fontWeight: sel ? 500 : 300, transition: "all 0.12s" }}>{short}</button>;
      })}
    </div>
  );
}

// -- EXERCISE 2 --
function ExpectationsExercise({ partnerName, userName = "Partner A", onComplete, isAnniversary = false, isRevisited = false }) {
  const activeLifeQs = isRevisited ? LIFE_QUESTIONS_REVISITED : isAnniversary ? LIFE_QUESTIONS_ANNIVERSARY : LIFE_QUESTIONS;
  const [phase, setPhase] = useState("intro");
  const [catIndex, setCatIndex] = useState(0);
  const [childhoodStructure, setChildhoodStructure] = useState(null);
  const [answers, setAnswers] = useState({ responsibilities: {}, childhood: {}, bothDetail: {}, childhoodBothDetail: {}, life: {} });
  const [lifeQ, setLifeQ] = useState(0);
  const setLife = (id, value) => setAnswers(a => ({ ...a, life: { ...a.life, [id]: value } }));
  const lifeAnswered = activeLifeQs.every(q => answers.life?.[q.id]);

  if (phase === "intro") return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "3rem 1rem 2rem", animation: "fadeIn 0.5s ease" }}>
      <link href={FONT_LINK} rel="stylesheet" />
      <style>{'@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}'}</style>
      <p style={{ fontSize: "0.62rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#1B5FE8", marginBottom: "1.25rem", fontFamily: font.body }}>Exercise 02 . What You Expect</p>
      <h2 style={{ fontFamily: font.display, fontSize: "clamp(2rem,5vw,2.8rem)", fontWeight: 700, color: C.ink, lineHeight: 1.1, marginBottom: "1.5rem" }}>
        All frustrations in a relationship<br /><em style={{ fontStyle: "italic", color: "#1B5FE8" }}>trace back to an unmet expectation.</em>
      </h2>
      <p style={{ fontSize: "0.95rem", color: C.muted, lineHeight: 1.85, fontFamily: font.body, fontWeight: 300, marginBottom: "1.75rem" }}>
        {isRevisited
          ? "One part, no responsibilities section this time. Just the life and values questions, revisited. See what's shifted, what's stayed the same, and what that means for where you are now."
          : isAnniversary
          ? "Two parts. First, how you each feel about the things that shape your shared life, family, values, money, conflict, connection. Then, who has each been quietly assuming handles what."
          : "Two parts. First, life and values questions — children, finances, where you live, how you handle conflict and repair. Then, who you expect to handle what across household, financial, career, and emotional responsibilities. You'll also share who did each of these in your childhood home, which helps explain why you each carry the expectations you do."
        }
      </p>
      <p style={{ fontSize: "0.88rem", color: C.muted, lineHeight: 1.75, fontFamily: font.body, fontWeight: 300, marginBottom: "2.5rem", borderLeft: ("3px solid " + (C.stone)), paddingLeft: "1rem" }}>
        {isRevisited
          ? "There's no right direction for things to shift. Answer honestly, not how you think you should feel, but how you actually do. You'll see both sets of answers together once you've both finished."
          : isAnniversary
          ? "Answer honestly, not how you think you should feel, but how you actually do. You'll see your answers alongside your partner's only after you've both finished."
          : "Sometimes expectations go unmet because they were never said. Sometimes they were said but heard differently. Either way, seeing them side by side is the point. Answer for yourself — you'll see your answers alongside your partner's only after you've both finished."
        }
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: ("1px solid " + (C.stone)), paddingTop: "1.5rem" }}>
        <p style={{ fontSize: "0.72rem", color: C.muted, fontFamily: font.body }}>{isRevisited ? "~10 minutes · life questions only" : "~15 minutes · 2 parts"}</p>
        <button onClick={() => setPhase("life")}
          style={{ background: "#1B5FE8", color: "white", border: "none", padding: "0.9rem 2.25rem", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: font.body, borderRadius: 10, fontWeight: 600 }}>
          Start →
        </button>
      </div>
    </div>
  );

  if (phase === "childhood-setup") {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "3rem 0 2rem", animation: "fadeIn 0.5s ease" }}>
        <link href={FONT_LINK} rel="stylesheet" />
        <style>{"@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}"}</style>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#1B5FE8", marginBottom: "1.25rem", fontFamily: font.body }}>Exercise 02 · Before we start</p>
        <h2 style={{ fontFamily: font.display, fontSize: "clamp(1.5rem,4vw,2.2rem)", fontWeight: 700, color: C.ink, lineHeight: 1.1, marginBottom: "0.85rem" }}>
          Who were the primary adults<br /><em style={{ fontStyle: "italic", color: "#1B5FE8" }}>in your home growing up?</em>
        </h2>
        <p style={{ fontSize: "0.88rem", color: C.muted, lineHeight: 1.75, fontFamily: font.body, fontWeight: 300, marginBottom: "2rem" }}>
          This shapes how you answer the next section, and helps us give you more meaningful context in your results.
        </p>
        <button onClick={() => { setPhase("life"); setLifeQ(activeLifeQs.length - 1); }}
        style={{ background: "transparent", border: "none", color: C.muted, fontSize: "0.72rem", cursor: "pointer", fontFamily: font.body, padding: "0 0 1rem", textAlign: "left" }}>
        ← Back to Part 1
      </button>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {CHILDHOOD_STRUCTURES.map(s => (
            <button key={s.id}
              onClick={() => { setChildhoodStructure(s.id); setPhase("responsibilities"); }}
              style={{ background: "white", border: ("1.5px solid " + C.stone), borderRadius: 12, padding: "0.85rem 1.25rem", textAlign: "left", cursor: "pointer", fontFamily: font.body, fontSize: "0.88rem", color: C.ink, transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.clay; e.currentTarget.style.background = "rgba(184,150,110,0.05)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.stone; e.currentTarget.style.background = "white"; }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "responsibilities") {
    const structure = CHILDHOOD_STRUCTURES.find(s => s.id === childhoodStructure) || CHILDHOOD_STRUCTURES[0];
    const childCols = structure.cols;
    const futureCols = [userName, partnerName, "Both of us", "Doesn't apply to us"];
    const futureColsDisplay = [userName, partnerName, "Both", "N/A"];
    const careerCols = ["Primarily mine", "Balanced", "Primarily my partner's", "Doesn't apply"];
    const careerColsDisplay = ["Mine", "Balanced", "Theirs", "N/A"];
    const futureLabel = isAnniversary ? "In our home" : "In our future home";
    const GRID = "2fr repeat(4, 40px) repeat(4, 40px)";
    const MIN_W = 580;
    const HEADER_PX = 72;

    const setResp = (catId, item, value) => {
      const key = catId + "__" + item;
      // If switching away from Both, clear the detail
      setAnswers(a => ({ ...a, responsibilities: { ...a.responsibilities, [key]: value }, bothDetail: value !== "Both of us" ? { ...a.bothDetail, [key]: undefined } : a.bothDetail }));
    };
    const getResp = (catId, item) => answers.responsibilities?.[(catId + "__" + item)];
    const setBothDetail = (catId, item, value) => {
      const key = catId + "__" + item;
      setAnswers(a => ({ ...a, bothDetail: { ...a.bothDetail, [key]: value } }));
    };
    const getBothDetail = (catId, item) => answers.bothDetail?.[(catId + "__" + item)];
    const setChild = (catId, item, value) => {
      const key = catId + "__" + item;
      setAnswers(a => ({ ...a, childhood: { ...a.childhood, [key]: value }, childhoodBothDetail: value !== "Both" ? { ...a.childhoodBothDetail, [key]: undefined } : a.childhoodBothDetail }));
    };
    const getChild = (catId, item) => answers.childhood?.[(catId + "__" + item)];
    const setChildBothDetail = (catId, item, value) => {
      const key = catId + "__" + item;
      setAnswers(a => ({ ...a, childhoodBothDetail: { ...a.childhoodBothDetail, [key]: value } }));
    };
    const getChildBothDetail = (catId, item) => answers.childhoodBothDetail?.[(catId + "__" + item)];

    const totalItems = RESPONSIBILITY_CATEGORIES.reduce((n, c) => n + c.items.length, 0);
    const answeredItems = RESPONSIBILITY_CATEGORIES.reduce((n, c) => n + c.items.filter(item => {
      const resp = getResp(c.id, item);
      if (!resp) return false;
      if (resp === "Both of us" && !getBothDetail(c.id, item)) return false;
      return true;
    }).length, 0);
    const allAnswered = answeredItems === totalItems;
    const pct = Math.round((answeredItems / totalItems) * 100);

    const hdrTxtChild  = { fontSize: "0.54rem", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: font.body, fontWeight: 700, textAlign: "center", color: "#7C4D28" };
    const hdrTxtFuture = { fontSize: "0.54rem", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: font.body, fontWeight: 700, textAlign: "center", color: "#1B3A8C" };

    return (
      <div>
        <link href={FONT_LINK} rel="stylesheet" />

        {/* Progress bar + title */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
            <p style={{ fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: C.clay, fontFamily: font.body }}>Your Expectations, Part 2 of 2</p>
            <span style={{ fontSize: "0.65rem", color: allAnswered ? "#10b981" : C.muted, fontFamily: font.body, fontWeight: allAnswered ? 600 : 400 }}>
              {allAnswered ? "✓ All answered" : (answeredItems + " / " + totalItems)}
            </span>
          </div>
          <div style={{ height: 3, background: C.stone, borderRadius: 2 }}>
            <div style={{ height: "100%", width: (pct + "%"), background: allAnswered ? "#10b981" : C.clay, borderRadius: 2, transition: "width 0.3s" }} />
          </div>
        </div>

        <h2 style={{ fontFamily: font.display, fontSize: "1.45rem", fontWeight: 700, color: C.ink, marginBottom: "0.2rem", lineHeight: 1.1 }}>Who handles what?</h2>
        <p style={{ fontSize: "0.78rem", color: C.muted, fontFamily: font.body, fontWeight: 300, marginBottom: "1rem" }}>For each responsibility, select who handled it growing up, and who you expect to handle it in your relationship.</p>
        <div style={{ background: "#FBF8F3", border: "1px solid #E8DDD0", borderRadius: 12, padding: "0.85rem 1rem", marginBottom: "1.25rem", display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
          <div style={{ fontSize: "0.9rem", flexShrink: 0, marginTop: "0.05rem" }}>📖</div>
          <p style={{ fontSize: "0.73rem", color: C.muted, fontFamily: font.body, fontWeight: 300, lineHeight: 1.65, margin: 0 }}>
            This list is representative, not exhaustive. For a deeper breakdown tailored to your results, the{" "}
            <a href="/offerings" style={{ color: "#E8673A", fontWeight: 600, textDecoration: "none" }}>Personalized Workbook</a>
            {" "}includes detailed breakdowns built directly from your answers.
          </p>
        </div>

        {/* Scrollable sheet */}
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 260px)", border: ("1px solid " + C.stone), borderRadius: 14, boxShadow: "0 2px 16px rgba(14,11,7,0.07)" }}>
          <div style={{ minWidth: MIN_W }}>

            {/* FROZEN COLUMN HEADERS */}
            <div style={{ position: "sticky", top: 0, zIndex: 20, borderRadius: "13px 13px 0 0", overflow: "hidden", boxShadow: "0 2px 8px rgba(14,11,7,0.08)" }}>
              <div style={{ display: "grid", gridTemplateColumns: GRID }}>
                {/* Item name col header */}
                <div style={{ background: "#F5F0EA", padding: "0.75rem 0.85rem", borderRight: "1.5px solid #E0D4C4", display: "flex", alignItems: "flex-end" }}>
                  <span style={{ fontSize: "0.52rem", letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, fontFamily: font.body, fontWeight: 600 }}>Responsibility</span>
                </div>
                {/* Growing up section header — warm amber tone */}
                <div style={{ gridColumn: "2 / 6", background: "linear-gradient(135deg, #FDF0E3, #F5E4CE)", padding: "0.55rem 0.4rem 0.45rem", borderRight: "1.5px solid #E0C9A8" }}>
                  <div style={{ fontSize: "0.52rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "#A0622A", fontFamily: font.body, marginBottom: "0.35rem", textAlign: "center", fontWeight: 700 }}>Growing up</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.15rem" }}>
                    {childCols.map(c => <div key={c} style={hdrTxtChild}>{c}</div>)}
                  </div>
                </div>
                {/* Future home section header — cool blue tone */}
                <div style={{ gridColumn: "6 / 10", background: "linear-gradient(135deg, #E8EFFF, #D8E6FF)", padding: "0.55rem 0.4rem 0.45rem" }}>
                  <div style={{ fontSize: "0.52rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "#1B3A8C", fontFamily: font.body, marginBottom: "0.35rem", textAlign: "center", fontWeight: 700 }}>{futureLabel}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.15rem" }}>
                    {futureColsDisplay.map(c => <div key={c} style={hdrTxtFuture}>{c}</div>)}
                  </div>
                </div>
              </div>
            </div>

            {/* CATEGORIES + ROWS */}
            {RESPONSIBILITY_CATEGORIES.map((cat, ci) => (
              <div key={cat.id}>
                {/* Sticky category divider */}
                <div style={{ position: "sticky", top: HEADER_PX, zIndex: 10, background: "#F0EDE8", borderTop: ci > 0 ? ("1.5px solid " + C.stone) : "none", borderBottom: ("1px solid " + C.stone) }}>
                  <div style={{ padding: "0.35rem 0.85rem" }}>
                    <span style={{ fontSize: "0.58rem", letterSpacing: "0.16em", textTransform: "uppercase", color: C.clay, fontFamily: font.body, fontWeight: 700 }}>{cat.label}</span>
                  </div>
                </div>

                {/* Item rows */}
                {cat.items.map((item, ii) => {
                  const childVal = getChild(cat.id, item);
                  const futureVal = getResp(cat.id, item);
                  const childBothDetail = getChildBothDetail(cat.id, item);
                  const futureBothDetail = getBothDetail(cat.id, item);
                  const isLastRow = ii === cat.items.length - 1;
                  const showChildExpand = childVal === "Both";
                  const showFutureExpand = futureVal === "Both of us";
                  const futureColors = { [userName]: "#E8673A", [partnerName]: "#1B5FE8", "Both of us": "#2AB07F", "Doesn't apply to us": C.stone, "Primarily mine": "#E8673A", "Balanced": "#2AB07F", "Primarily my partner's": "#1B5FE8", "Doesn't apply": C.stone };
                  const activeFutureCols = cat.id === 'career' ? careerCols : futureCols;
                  const childDetailOpts = ["Genuinely 50/50", ("Usually " + childCols[0] + ", sometimes " + childCols[1]), ("Usually " + childCols[1] + ", sometimes " + childCols[0])];
                  const futureDetailOpts = ["Genuinely 50/50", ("Usually " + userName + ", sometimes " + partnerName), ("Usually " + partnerName + ", sometimes " + userName)];
                  const needsDetail = showFutureExpand && !futureBothDetail;
                  return (
                    <div key={item} style={{ borderBottom: isLastRow ? "none" : ("1px solid " + C.stone + "60") }}>
                      {/* Main grid row */}
                      <div style={{ display: "grid", gridTemplateColumns: GRID, background: futureVal ? "rgba(184,150,110,0.04)" : "white", transition: "background 0.15s" }}>
                        {/* Item label */}
                        <div style={{ padding: "0.65rem 0.85rem", borderRight: ("1px solid " + C.stone + "50"), display: "flex", alignItems: "center" }}>
                          <p style={{ fontSize: "0.78rem", color: C.ink, fontFamily: font.body, lineHeight: 1.35, margin: 0 }}>{item}</p>
                        </div>
                        {/* Childhood option buttons */}
                        {childCols.map((col, ci2) => {
                          const sel = childVal === col;
                          const isLastChild = ci2 === childCols.length - 1;
                          return (
                            <div key={col} style={{ padding: "0.45rem 0.2rem", display: "flex", alignItems: "center", justifyContent: "center", borderRight: isLastChild ? "1.5px solid #E0C9A8" : "none" }}>
                              <button onClick={() => setChild(cat.id, item, col)} title={col}
                                style={{ width: 22, height: 22, borderRadius: "50%", border: ("2px solid " + (sel ? "#A0622A" : "#D4C0A8")), background: sel ? "#A0622A" : "transparent", cursor: "pointer", transition: "all 0.12s", flexShrink: 0, padding: 0 }}>
                              </button>
                            </div>
                          );
                        })}
                        {/* Future home option buttons */}
                        {activeFutureCols.map((col, fi) => {
                          const sel = futureVal === col;
                          const fc = futureColors[col] || C.stone;
                          const disp = col === "Both of us" ? "Both" : col === "Doesn't apply to us" ? "N/A" : col;
                          return (
                            <div key={col} style={{ padding: "0.45rem 0.2rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <button onClick={() => setResp(cat.id, item, col)} title={col}
                                style={{ width: 22, height: 22, borderRadius: "50%", border: ("2px solid " + (sel ? fc : "#C8D8F0")), background: sel ? fc : "transparent", cursor: "pointer", transition: "all 0.12s", flexShrink: 0, padding: 0 }}>
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* ── Childhood "Both" inline expansion ── */}
                      {showChildExpand && (
                        <div style={{ background: "#FBF8F3", borderTop: ("1px solid " + C.stone + "60"), padding: "0.55rem 0.85rem 0.6rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                          <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.clay, fontFamily: font.body, fontWeight: 700, marginBottom: "0.2rem" }}>Growing up, a bit more specifically:</p>
                          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                            {childDetailOpts.map(opt => {
                              const sel = childBothDetail === opt;
                              return (
                                <button key={opt} onClick={() => setChildBothDetail(cat.id, item, opt)}
                                  style={{ padding: "0.3rem 0.65rem", border: ("1.5px solid " + (sel ? C.clay : C.stone)), background: sel ? "rgba(193,127,71,0.15)" : "white", color: sel ? "#6B4226" : C.muted, fontSize: "0.68rem", borderRadius: 999, cursor: "pointer", fontFamily: font.body, fontWeight: sel ? 600 : 400, transition: "all 0.12s", whiteSpace: "nowrap" }}>
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* ── Future "Both of us" inline expansion ── */}
                      {showFutureExpand && (
                        <div style={{ background: needsDetail ? "rgba(42,176,127,0.06)" : "rgba(42,176,127,0.03)", borderTop: ("1px solid rgba(42,176,127,0.25)"), padding: "0.55rem 0.85rem 0.6rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                          <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#1a8a63", fontFamily: font.body, fontWeight: 700, marginBottom: "0.2rem" }}>
                            {needsDetail ? "A bit more specifically, required to continue:" : "In your future home, a bit more specifically:"}
                          </p>
                          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                            {futureDetailOpts.map(opt => {
                              const sel = futureBothDetail === opt;
                              return (
                                <button key={opt} onClick={() => setBothDetail(cat.id, item, opt)}
                                  style={{ padding: "0.3rem 0.65rem", border: ("1.5px solid " + (sel ? "#2AB07F" : "rgba(42,176,127,0.4)")), background: sel ? "#2AB07F" : "white", color: sel ? "white" : "#1a8a63", fontSize: "0.68rem", borderRadius: 999, cursor: "pointer", fontFamily: font.body, fontWeight: sel ? 600 : 400, transition: "all 0.12s", whiteSpace: "nowrap" }}>
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Continue */}
        <div style={{ marginTop: "1.5rem" }}>
          {/* Exit workbook callout */}
          <div style={{ background: "#FBF8F3", border: "1px solid #E8DDD0", borderRadius: 12, padding: "0.85rem 1rem", marginBottom: "1.25rem", display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
            <div style={{ fontSize: "0.9rem", flexShrink: 0, marginTop: "0.05rem" }}>📖</div>
            <p style={{ fontSize: "0.73rem", color: C.muted, fontFamily: font.body, fontWeight: 300, lineHeight: 1.65, margin: 0 }}>
              These categories cover the most common sources of misaligned expectations, not every possible responsibility. Where you and your partner differ most, the{" "}
              <a href="/offerings" style={{ color: "#E8673A", fontWeight: 600, textDecoration: "none" }}>Personalized Workbook</a>
              {" "}goes deeper within each category with additional topics to work through together.
            </p>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => setPhase("life")}
              style={{ background: "transparent", border: ("1.5px solid " + C.stone), color: C.muted, padding: "0.65rem 1.25rem", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: font.body, borderRadius: 8 }}>
              ← Back
            </button>
            <button onClick={() => allAnswered && onComplete({ ...answers, childhoodStructure })}
              style={{ background: allAnswered ? "#4CAF50" : C.stone, color: "white", border: "none", padding: "0.75rem 2rem", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: allAnswered ? "pointer" : "default", fontFamily: font.body, borderRadius: 10, fontWeight: 600, transition: "background 0.2s", boxShadow: allAnswered ? "0 3px 16px rgba(76,175,80,0.45)" : "none" }}>
              {allAnswered ? "All done →" : ((totalItems - answeredItems) + " left to answer")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -- Life questions phase state (moved to top to obey React hooks rules) --
  const lq = activeLifeQs[lifeQ];
  const lqSel = answers.life?.[lq?.id];
  const lqIsLast = lifeQ === activeLifeQs.length - 1;
  const lqProgress = (lifeQ + 1) / activeLifeQs.length;

  return (
    <div>
      <link href={FONT_LINK} rel="stylesheet" />
      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
        <div style={{ flex: 1, height: 3, background: C.stone, borderRadius: 2 }}>
          <div style={{ height: "100%", width: ((lqProgress * 100) + "%"), background: C.clay, borderRadius: 2, transition: "width 0.4s ease" }} />
        </div>
        <span style={{ fontSize: "0.7rem", color: C.muted, fontFamily: font.body, whiteSpace: "nowrap" }}>{lifeQ + 1} / {LIFE_QUESTIONS.length}</span>
      </div>

      {/* Category + question */}
      <p style={{ fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: C.clay, marginBottom: "0.25rem", fontFamily: font.body }}>Your Expectations, Part 1 of 2</p>
      <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, marginBottom: "0.85rem", fontFamily: font.body }}>{lq.category}</p>
      <p style={{ fontFamily: font.display, fontSize: "1.25rem", fontWeight: 400, color: C.ink, lineHeight: 1.6, marginBottom: "1.75rem" }}>{lq.text}</p>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "2rem" }}>
        {lq.options.map(opt => {
          const isSel = lqSel === opt;
          return (
            <button key={opt} onClick={() => { setLife(lq.id, opt); }}
              style={{ padding: "0.9rem 1.25rem", border: ("2px solid " + (isSel ? C.clay : C.stone)), background: isSel ? "rgba(184,150,110,0.12)" : "white", color: isSel ? C.ink : C.muted, fontSize: "0.88rem", cursor: "pointer", fontFamily: font.body, borderRadius: 12, transition: "all 0.15s", fontWeight: isSel ? 500 : 300, textAlign: "left" }}
              onMouseEnter={e => { if (!isSel) { e.currentTarget.style.borderColor = C.clay+"66"; e.currentTarget.style.background = "rgba(184,150,110,0.05)"; }}}
              onMouseLeave={e => { if (!isSel) { e.currentTarget.style.borderColor = C.stone; e.currentTarget.style.background = "white"; }}}>
              {opt}
            </button>
          );
        })}
      </div>

      {/* Nav */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button onClick={() => lifeQ > 0 ? setLifeQ(n => n-1) : setPhase("intro")}
          style={{ background: "transparent", border: ("1.5px solid " + (C.stone)), color: C.muted, padding: "0.7rem 1.4rem", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: font.body, borderRadius: 8 }}>
          ← Back
        </button>
        {lqIsLast
          ? <button onClick={() => lqSel && (isRevisited ? onComplete({ ...answers, childhoodStructure }) : setPhase("childhood-setup"))}
              style={{ background: lqSel ? "#4CAF50" : C.stone, color: "white", border: "none", padding: "0.7rem 1.8rem", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: lqSel ? "pointer" : "default", fontFamily: font.body, borderRadius: 8, fontWeight: 600, boxShadow: lqSel ? "0 3px 16px rgba(76,175,80,0.45)" : "none" }}>
              All done →
            </button>
          : <button onClick={() => lqSel && setLifeQ(n => n+1)}
              style={{ background: lqSel ? C.ink : C.stone, color: "white", border: "none", padding: "0.7rem 1.8rem", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: lqSel ? "pointer" : "default", fontFamily: font.body, borderRadius: 8 }}>
              Next →
            </button>
        }
      </div>
    </div>
  );
}


// -- JOINT OVERVIEW -- unified landing page for both exercises --

// ─────────────────────────────────────────────────────────────────────────────
// COUPLE TYPE SYSTEM
// 24 types derived from 10 communication dimensions + expectations alignment
// + specific life question answers. Each type scored; highest wins.
// ─────────────────────────────────────────────────────────────────────────────

// Pronoun helper — module-level so all components can use it
const pronoun = (p, form) => {
  const map = { "she/her": { sub: "she", obj: "her", pos: "her", ref: "herself" }, "he/him": { sub: "he", obj: "him", pos: "his", ref: "himself" }, "they/them": { sub: "they", obj: "them", pos: "their", ref: "themselves" } };
  return (map[p] || map["they/them"])[form] || "they";
};


function getStyleCode(scores) {
  // 6-axis style code: E/I · X/G · F/S · C/A · D/H · Q/T
  const e = (scores.energy      || 3) > 3.0  ? 'E' : 'I';  // Outward / Inward
  const x = ((scores.expression || 3) + (scores.feedback || 3)) / 2 > 3.0 ? 'X' : 'G'; // Expressive / Guarded
  const f = (scores.conflict    || 3) < 3.0  ? 'F' : 'S';  // Fast-engage / Space-first
  const c = (scores.closeness   || 3) > 3.0  ? 'C' : 'A';  // Close-seeking / Autonomous
  const d = (scores.needs       || 3) > 3.0  ? 'D' : 'H';  // Direct / Hint (needs directness)
  const q = (scores.repair      || 3) < 3.0  ? 'Q' : 'T';  // Quick-gesture / Talk-through (repair style)
  return e + x + f + c + d + q;
}

function getCodeLabel(code) {
  const labels = {
    E: 'Outward', I: 'Inward',
    X: 'Expressive', G: 'Guarded',
    F: 'Fast to resolve', S: 'Needs space first',
    C: 'Close-seeking', A: 'Independent',
    D: 'Direct', H: 'Indirect',
    Q: 'Gesture-led repair', T: 'Talk-through repair',
  };
  return [
    { axis: 'Energy',     letter: code[0], label: labels[code[0]] },
    { axis: 'Expression', letter: code[1], label: labels[code[1]] },
    { axis: 'Conflict',   letter: code[2], label: labels[code[2]] },
    { axis: 'Closeness',  letter: code[3], label: labels[code[3]] },
    { axis: 'Needs',      letter: code[4], label: labels[code[4]] },
    { axis: 'Repair',     letter: code[5], label: labels[code[5]] },
  ];
}

// Score-based couple type derivation using all 10 communication dimensions.
// Each type has a signature across the full dimension space; the best-scoring type wins.
// This replaces the priority-chain couplePairToTypeId to avoid 44% concentration on one type.

// ═══════════════════════════════════════════════════════════════════════════════
// NEW COUPLE TYPING ENGINE — 4 individual types, 10 couple pairings
// ═══════════════════════════════════════════════════════════════════════════════

// Compute individual type from dimension scores
// Engage/Withdraw axis: Conflict (55%) + Stress (30%) + Repair (15%)
//   High withdraw_score (≥3.4) = Withdraw; Low (≤2.6) = Engage
// Open/Guarded axis: Expression (45%) + Feedback (30%) + Needs (25%)
//   High open_score (≥3.4) = Open; Low (≤2.6) = Guarded
function computeIndividualType(scores) {
  const s = scores || {};
  const withdrawScore = (s.conflict || 3) * 0.55 + (s.stress || 3) * 0.30 + (s.repair || 3) * 0.15;
  const openScore     = (s.expression || 3) * 0.45 + (s.feedback || 3) * 0.30 + (s.needs || 3) * 0.25;

  // Coordinates for couple map: x = open (0=Guarded,1=Open), y = engage (0=Withdraw,1=Engage)
  const openCoord    = (openScore - 1) / 4;      // 0..1
  const engageCoord  = 1 - (withdrawScore - 1) / 4; // 0..1 (inverted: high withdraw = bottom)

  // Type assignment: use whichever side the score falls on (even slightly)
  const isEngage  = withdrawScore <= 3.0;
  const isOpen    = openScore    >= 3.0;

  const typeCode = isEngage && isOpen  ? "W"
                : isEngage && !isOpen  ? "X"
                : !isEngage && isOpen  ? "Y"
                :                        "Z";

  return { typeCode, withdrawScore, openScore, openCoord, engageCoord };
}

// Look up couple pairing from two type codes
function getCoupleTypeNew(typeA, typeB) {
  // Normalize to alphabetical order
  const key = [typeA, typeB].sort().join("");
  return NEW_COUPLE_TYPES.find(t => t.id === key) || NEW_COUPLE_TYPES[0];
}

// Full derivation using new engine (replaces old deriveCoupleType for couple-map page)
function deriveNewCoupleType(myS, partS) {
  const typeInfoA = computeIndividualType(myS);
  const typeInfoB = computeIndividualType(partS);
  const pairingType = getCoupleTypeNew(typeInfoA.typeCode, typeInfoB.typeCode);
  return { ...pairingType, typeInfoA, typeInfoB };
}

// Individual type metadata
const INDIVIDUAL_TYPES = {
  W: { code: "W", name: "The Initiator", color: "#E8673A", fill: "#FFF4F0", axis1: "Engage", axis2: "Open",
       desc: "Moves toward resolution. Processes and expresses relatively freely.",
       wired: "You move toward connection when things need addressing — you don't wait for an opening, you create one. You process outward, which means the people close to you usually know where you stand without having to ask. This makes you easy to know, and relatively easy to be in productive conflict with.",
       typeDesc: "You engage quickly and express freely — which means the people close to you usually know where they stand, and they know where you stand too. You don't make them guess. Under pressure, you tend to reach toward the relationship rather than away from it, which can be genuinely stabilizing. The thing to stay aware of: your speed to engage can feel like a lot when someone else needs more time to get there." },
  X: { code: "X", name: "The Anchor", color: "#1B5FE8", fill: "#EFF1FF", axis1: "Engage", axis2: "Guarded",
       desc: "Pushes toward resolution. Processes internally, shares selectively.",
       wired: "You move toward resolution rather than away from it — when something needs addressing, you don't avoid the conversation. You process before you speak, which means your perspective is usually considered by the time it comes out. This makes you direct and deliberate, but sometimes harder to read in the middle of something.",
       typeDesc: "You engage with problems directly but process privately before speaking — which means you tend to arrive at conversations with something considered to say. You don't react out loud. Under pressure, you want resolution, but you need your own thinking to be in order first. The thing to stay aware of: your internal processing can look like distance to someone who expresses more freely." },
  Y: { code: "Y", name: "The Feeler", color: "#7C3AED", fill: "#F5F0FF", axis1: "Withdraw", axis2: "Open",
       desc: "Needs space first. Carries and expresses feeling when ready.",
       wired: "You need space to process before you can fully show up to a hard conversation — this isn't avoidance, it's how you get to something honest. You're emotionally expressive when you're ready, and the people close to you get real feeling when it comes. What you bring most is depth: you don't stay on the surface.",
       typeDesc: "You process before you can share — not because you're holding back, but because you need the space to understand what's actually true for you before you can say it. You're emotionally present and expressive when you get there. Under pressure, you need time, and pushing you before you're ready usually produces something incomplete. The thing to stay aware of: your withdrawal before sharing can read as avoidance to someone who engages more quickly." },
  Z: { code: "Z", name: "The Protector", color: "#6B7280", fill: "#F4F5F6", axis1: "Withdraw", axis2: "Guarded",
       desc: "Withdraws and holds things close. Real depth and feeling running quiet beneath the surface.",
       wired: "You process privately and share selectively — there's usually more going on internally than what's visible from the outside. When you do speak, it carries weight precisely because you don't offer it carelessly. What you bring is steadiness: you don't react quickly, which means you don't create unnecessary chaos.",
       typeDesc: "You carry things privately and surface them selectively — which means there's usually more going on internally than what's visible. You don't perform your inner life, and you don't dump it on the people around you. Under pressure, you go quiet and go deep. The thing to stay aware of: the people who love you most sometimes struggle to know what you're carrying, which can make them feel shut out without you intending it." },
};

// Per-couple-type, per-person perspective for profile pages (Option B)
// Keys: coupleTypeId -> [personA_perspective, personB_perspective]
// typeA is always alphabetically first in the pairing ID.
// For same-type pairings (WW, XX, YY, ZZ), both perspectives are the same.
const PARTNER_PERSPECTIVE = {
  WW: [
    // Both W
    "You're with someone who shows up the same way you do — who reaches toward things rather than away from them, and who processes outwardly. The warmth between you runs in both directions without anyone having to coax it. What to watch: when you're both feeling something intensely, the intensity can feed itself. One of you naming 'I think we're amplifying each other right now' is usually enough to bring the temperature back down.",
    "You're with someone who shows up the same way you do — who reaches toward things rather than away from them, and who processes outwardly. The warmth between you runs in both directions without anyone having to coax it. What to watch: when you're both feeling something intensely, the intensity can feed itself. One of you naming 'I think we're amplifying each other right now' is usually enough to bring the temperature back down.",
  ],
  XX: [
    // Both X
    "You're with someone who also engages directly but processes privately — which means neither of you dumps unprocessed feeling on the other. There's a shared efficiency between you. What to watch: because neither of you expresses freely in the moment, things can go unnamed longer than they should. You can both be carrying something without the other knowing it. A habit of asking 'is there anything on your mind?' goes further than waiting for signals.",
    "You're with someone who also engages directly but processes privately — which means neither of you dumps unprocessed feeling on the other. There's a shared efficiency between you. What to watch: because neither of you expresses freely in the moment, things can go unnamed longer than they should. You can both be carrying something without the other knowing it. A habit of asking 'is there anything on your mind?' goes further than waiting for signals.",
  ],
  YY: [
    // Both Y
    "You're with someone who also needs space before they can fully show up to a hard conversation. Neither of you will rush the other, which feels like relief. What to watch: both of you withdrawing at the same time can create distance that neither of you intended — two people waiting for things to feel right before engaging can drift further apart without either meaning to. Someone has to eventually reach across. It doesn't have to be the one who's less hurt.",
    "You're with someone who also needs space before they can fully show up to a hard conversation. Neither of you will rush the other, which feels like relief. What to watch: both of you withdrawing at the same time can create distance that neither of you intended — two people waiting for things to feel right before engaging can drift further apart without either meaning to. Someone has to eventually reach across. It doesn't have to be the one who's less hurt.",
  ],
  ZZ: [
    // Both Z
    "You're with someone who also processes privately and shares selectively. You're not going to overwhelm each other with feeling, and neither of you will be pushed to share before you're ready. What to watch: real things can go unspoken for a very long time between two people who both hold things close. You'll need to build deliberate habits of checking in — the connection you have doesn't maintain itself automatically.",
    "You're with someone who also processes privately and shares selectively. You're not going to overwhelm each other with feeling, and neither of you will be pushed to share before you're ready. What to watch: real things can go unspoken for a very long time between two people who both hold things close. You'll need to build deliberate habits of checking in — the connection you have doesn't maintain itself automatically.",
  ],
  WX: [
    // W's perspective (with X)
    "You're with someone who, like you, moves toward things — but who processes before speaking rather than out loud. They'll usually get to the same place you do, just not as quickly, and not as visibly. You don't have to drag them to the conversation — they want to be there. What you're adjusting to: they're not being cagey when they go quiet before responding. They're thinking. Giving them the pause usually produces something more real than pushing for it.",
    // X's perspective (with W)
    "You're with someone who, like you, moves toward resolution — but who processes outwardly rather than privately. They'll often have a response available while you're still forming yours. This isn't them being more emotional than you — it's a different processing speed. What you're adjusting to: when they raise something quickly, it's not impulsive. They've felt it and they want to address it. Meeting them partway — even with 'I need a few minutes, and then I'm ready' — goes a long way.",
  ],
  WY: [
    // W's perspective (with Y)
    "You're with someone who expresses freely when ready — but who needs space to get there. They're not avoiding the conversation. They're getting ready for it. Your instinct when something needs addressing is to get into it; theirs is to step back and find solid ground first. What you're adjusting to: reaching for the conversation before they're ready usually produces something incomplete. The patience is worth it — what comes when they're ready is usually real.",
    // Y's perspective (with W)
    "You're with someone who wants to address things directly and who processes out loud — which can feel fast when you're still figuring out what's true for you. They're not trying to pressure you. They're expressing because that's how they process. What you're adjusting to: when they raise something before you're ready, saying 'I need a little time and then I want to talk about this' is enough. It tells them the conversation is coming without making them wait in silence.",
  ],
  WZ: [
    // W's perspective (with Z)
    "You're with someone who processes privately, shares selectively, and doesn't move toward hard things quickly. You'll often feel the pull to address things first. That's not a flaw in either of you — it's the shape of this pairing. What you're adjusting to: their quietness is rarely indifference. There's usually more going on internally than is visible. Asking directly — 'is there something you're carrying right now?' — is more useful than waiting for a signal.",
    // Z's perspective (with W)
    "You're with someone who moves toward things quickly and expresses freely — which can feel like a lot when you're still deciding whether something is worth naming. They're not attacking you when they raise something. They're doing what comes naturally to them. What you're adjusting to: their pace can feel overwhelming, but silence from you often reads to them as something being wrong. Even a brief 'I'm processing, give me a bit' prevents them from filling the quiet with their own interpretation.",
  ],
  XY: [
    // X's perspective (with Y)
    "You're with someone who feels things deeply and expresses them openly — but who needs space to get there. They're not avoiding the conversation; they're building toward it. Your instinct is to engage and resolve. Theirs is to process and then share. What you're adjusting to: pushing for resolution before they've had space usually gets you something incomplete. Naming that you want to address it — 'I want to talk about this when you're ready' — keeps things moving without forcing the timeline.",
    // Y's perspective (with X)
    "You're with someone who wants to address things directly and thinks privately before speaking. They're not cold — they're processing. And they'll usually have something real to say when they get there. What you're adjusting to: they can seem impatient for resolution in a way that feels pressuring when you're still getting clear. Telling them you need time and that you're not avoiding is usually enough. They want resolution — and your getting there at your pace is still resolution.",
  ],
  XZ: [
    // X's perspective (with Z)
    "You're with someone who processes privately and doesn't surface things quickly. Neither of you expresses freely in the moment — but you're more inclined to engage when something needs addressing. They may not be. What you're adjusting to: they're not suppressing things to punish you. They're genuinely uncertain about whether to name something or let it go. Asking directly is almost always more effective than waiting for them to volunteer it.",
    // Z's perspective (with X)
    "You're with someone who also processes privately — but who moves toward resolution when something needs addressing, even if quietly. They're not going to dump feeling on you. But they will eventually raise things, and they'll expect a real response. What you're adjusting to: their directness when they do raise something can feel abrupt when you haven't quite decided where you stand on it. Saying 'I've been thinking about that too — can we come back to it?' keeps the door open without forcing you to respond before you're ready.",
  ],
  YZ: [
    // Y's perspective (with Z)
    "You're with someone who also needs space to process — but who shares much less of what they're carrying. You'll usually surface more than they do, which is fine. But there can be an imbalance: you know where you stand with yourself and you say so; they may be carrying more than they're revealing. What you're adjusting to: their quietness isn't indifference. Asking them specific questions — not 'how are you doing' but 'what's actually going on for you with that' — usually gets something more real.",
    // Z's perspective (with Y)
    "You're with someone who also withdraws to process — but who expresses what they're feeling once they get there. They'll often share more than you do, and that's fine. What you're adjusting to: their willingness to express doesn't mean they expect the same from you immediately. But they do care about knowing you're there. Small signals — acknowledging that you heard something, or that you're thinking about it — go further than you might expect.",
  ],
};


const NEW_COUPLE_TYPES = [
  // ── Same-type pairings ──────────────────────────────────────────────────────
  {
    id: "WW", typeA: "W", typeB: "W",
    name: "The ignition",
    tagline: "Both reach. Both express. Neither has to go looking for the other.",
    description: "{U} and {P} both move toward resolution and process outward. High warmth and emotional availability in both directions. Neither partner has to coax the other into the conversation or wait for the signal that it's okay to share what's going on.",
    nuance: "The risk isn't disconnection. It's feedback loops. When both of you are feeling something strongly, the intensity can amplify rather than settle. One of you naming that — 'I think we're feeding each other right now' — is usually enough to break the loop.",
    color: "#E8673A", shade: "#FFF4F0",
    famousDuos: [
      { names: "Monica & Chandler", show: "Friends", note: "Both put everything into the shared space. The warmth between them was real and visible — and occasionally required one of them to take the temperature down." },
      { names: "Eric & Tami Taylor", show: "Friday Night Lights", note: "Two people who led with feeling, turned toward each other, and built something real by doing it out loud." },
    ],
    strengths: [
      "{U} and {P} are easy to be known by each other. The emotional availability goes both ways.",
      "Neither of you has to decode the other. You're both readable, and both willing to be read.",
      "Hard conversations don't get avoided as often because neither of you is protecting against feeling.",
    ],
    stickingPoints: [
      "High expressiveness on both sides can create amplification. When both of you are feeling something intensely, the intensity can feed itself.",
      "Difficult emotions can land harder than intended — because neither person is holding anything back, the impact of a hard moment is felt fully.",
      "Not every feeling needs to go into the shared space immediately. Sitting with something for 20 minutes before speaking it is a skill worth building.",
    ],
    patterns: [
      "{U} and {P} probably know each other's emotional state well. Often before anything is said.",
      "The relationship has a lot of emotional aliveness — which can be wonderful and occasionally overwhelming.",
      "Arguments between you are probably not subtle. The feelings are out. The work is making sure what comes out is accurate, not just loud.",
    ],
    tips: [
      { title: "Notice when you're amplifying each other", body: "When both of you are feeling something strongly, the loop can escalate. One person naming it — 'I think we're feeding each other right now' — can break the cycle before it needs to get bigger.", phraseTry: "I think we're feeding each other right now — can we both take a breath before we keep going?" },
      { title: "Not every feeling needs an audience", body: "{U} and {P} are both expressive, but some feelings are better processed privately before being shared. Practice sitting with something for a beat before putting it into the shared space.", phraseTry: "I need a minute with this before I put it out there. Give me twenty minutes." },
      { title: "The visibility is a gift", body: "Most couples are guessing at each other's interior. {U} and {P} don't have to. Appreciate that even when it's uncomfortable — it's the thing that makes real closeness possible.", phraseTry: "I know this is a lot right now, and I'm glad we can actually see each other in it." },
    ],
  },
  {
    id: "XX", typeA: "X", typeB: "X",
    name: "The collaboration",
    tagline: "Both want resolution. Both process it privately. The machinery works.",
    description: "{U} and {P} both move toward resolving things and both handle the feeling internally before it comes out. Decisions get made. Disagreements get worked through. The practical machinery of the relationship runs efficiently — and quietly.",
    nuance: "Efficient repair can mean closing the loop before it's actually through. Two people who both move fast toward resolution can sometimes resolve the surface without fully addressing what's underneath. The same thing comes back because the real conversation happened too quickly.",
    color: "#1B5FE8", shade: "#EFF1FF",
    famousDuos: [
      { names: "Sherlock & Watson (as partners)", show: "Sherlock", note: "Two people who processed through logic and action rather than feeling. The understanding between them was real; it just ran quiet." },
      { names: "Ben Wyatt & April Ludgate", show: "Parks & Recreation", note: "Both efficient, both internally contained, both effective. They got things done without a lot of emotional weather." },
    ],
    strengths: [
      "{U} and {P} make decisions efficiently once the information is assembled. You speak the same language when things get complicated.",
      "Arguments between you tend to be structured. You can usually reason your way to a conclusion.",
      "There's very little translation required. You're both tracking the same kind of information.",
    ],
    stickingPoints: [
      "Two people who both process internally can go a long time without surfacing what's actually going on. Things that needed to be said get closed over.",
      "Efficient repair isn't the same as complete repair. The same conversation can reappear because the real thing didn't make it into the previous one.",
      "The relationship can be strong on logistics and weak on emotional texture. That gap tends to show up during life transitions.",
    ],
    patterns: [
      "{U} and {P} probably make decisions quickly, once the information is assembled. The process feels collaborative.",
      "Arguments between you tend to be structured. You can usually find your way to a logical conclusion.",
      "The emotional texture of hard moments can sometimes get skipped in the move toward resolution.",
    ],
    tips: [
      { title: "Check if it's resolved or just closed", body: "Fast repair is a real strength. The watch-out is closing the loop before the thing is actually through. Ask {P}: 'Are we actually okay, or are we both just ready to be done?'", phraseTry: "Are we actually okay, or are we both just ready to be done?" },
      { title: "Ask what's going on, not just what the plan is", body: "{U} and {P} are both comfortable with the practical mode. Add a deliberate question: 'How does this feel, not just what does it mean?' It changes the quality of the conclusion.", phraseTry: "How does this actually feel for you — not just what it means, but how it sits?" },
      { title: "Give the slower moments their time", body: "Occasionally, slow the repair down enough to make sure you've actually heard each other. The extra few minutes tends to be what prevents the same conversation coming back.", phraseTry: "I want to make sure we've actually heard each other on this before we move on." },
    ],
  },
  {
    id: "YY", typeA: "Y", typeB: "Y",
    name: "The safe space",
    tagline: "Both need space first. Both carry it visibly when withdrawn.",
    description: "When things get hard, {U} and {P} both pull back before coming forward. Neither of you is avoiding — you're both protecting the quality of the eventual conversation. When you do come back together, you both bring the full emotional weight of what you've been carrying.",
    nuance: "Two people who both need space can wait for the other to come back first for a very long time. That waiting can start to feel like abandonment even when it's just process. Build an agreed-upon signal — even something small — that means 'I'm ready when you are' without requiring a full conversation to get there.",
    color: "#7C3AED", shade: "#F5F0FF",
    famousDuos: [
      { names: "Carrie & Aidan", show: "Sex and the City", note: "Both needed time and space before they could come back. Neither was great at initiating the return, which made the distance feel longer than it needed to be." },
      { names: "April & Andy", show: "Parks & Recreation", note: "Both withdrew into themselves when things got hard. When they did come back, it was always real — just slow." },
    ],
    strengths: [
      "Things don't escalate in the moment. {U} and {P} both have the instinct to step back before the conversation gets more heated than it needs to be.",
      "When the conversation does happen, it tends to be calmer and more emotionally substantive than it would have been in the heat of it.",
      "Both of you understand the need for space — so you're less likely to take it personally when the other person needs it.",
    ],
    stickingPoints: [
      "{U} and {P} can both wait a long time for the other person to come back first. That waiting can start to feel like abandonment, even when it's just process.",
      "Open-ended space is harder to sit with than bounded space. Without a rough return time, the waiting becomes anxious.",
      "Two people who both default to withdrawal after conflict can go long stretches without addressing things that needed to be addressed.",
    ],
    patterns: [
      "After a hard moment, {U} and {P} both tend to need time before the conversation is possible. That space usually helps.",
      "The coming-back-together step can take longer than it needs to, because neither of you naturally initiates it.",
      "When the conversation does happen, it tends to be calmer and more complete than it would have been earlier.",
    ],
    tips: [
      { title: "Someone has to come back first", body: "Both {U} and {P} tend to wait. The good news is that whoever initiates the return usually gets a warmer reception than they expect. Take the step.", phraseTry: "I'm ready to talk when you are. No rush — just wanted you to know." },
      { title: "Bound the space with a time", body: "'I need some time' is not as useful as 'I need until tonight.' A specific return time lets the other person stop the worried waiting and trust the process.", phraseTry: "I need until tonight. I'll come find you after dinner." },
      { title: "Build a low-key signal", body: "{U} and {P} don't need a full conversation to signal that you're okay again. A small gesture — a cup of tea, a hand on the shoulder — does most of the work.", phraseTry: "I'm okay. We're okay. Just needed a minute." },
    ],
  },
  {
    id: "ZZ", typeA: "Z", typeB: "Z",
    name: "The depth",
    tagline: "Both withdraw. Both hold it close. Real depth running beneath a calm surface.",
    description: "{U} and {P} both go inward when things get hard and both hold their interior life privately. The relationship tends to be stable, low-drama, and genuinely deep — but the depth doesn't surface readily. There is often more going on beneath the calm than either of you shows.",
    nuance: "Important things can go unsaid for a very long time. The comfort with quiet can become avoidance without either person intending it. The relationship looks more okay from the outside than it sometimes is from the inside. Creating a deliberate structure for openness is worth more here than in most pairings.",
    color: "#6B7280", shade: "#F4F5F6",
    famousDuos: [
      { names: "Mr. & Mrs. Darcy (post-wedding)", show: "Pride & Prejudice", note: "Both learned to respect the other's privacy. The understanding ran deep even when the words ran scarce." },
      { names: "Anne & Gilbert (later years)", show: "Anne of Green Gables", note: "Two internal processors who built something quiet and real together over time." },
    ],
    strengths: [
      "When {U} and {P} share something, it carries weight. Neither of you is casual with the important stuff.",
      "The relationship has real privacy and respect for each other's interior life. You don't demand access to everything.",
      "What you've built together is real even if it's not loudly expressed. The depth is there, it's just not performed.",
    ],
    stickingPoints: [
      "Important things can go unsaid for a very long time. The comfort with silence can become avoidance.",
      "Neither of you naturally initiates the harder conversation. Both may be waiting for the other.",
      "The relationship can look more okay from the outside than it actually is — because neither of you is showing what's wrong.",
    ],
    patterns: [
      "{U} and {P} probably don't have a lot of dramatic conversations. The emotional content of the relationship tends to go inward rather than outward.",
      "When something is hard, it may be days before either of you brings it up — if it gets brought up at all.",
      "The relationship is probably more stable-looking than many. The thing to watch is what's accumulating beneath the stability.",
    ],
    tips: [
      { title: "Build in the opening, don't wait for it to happen", body: "A weekly check-in — even 15 minutes, even structured — creates a container for the things that wouldn't come up otherwise. Schedule the opening you both won't naturally make.", phraseTry: "Can we do a quick check-in this week? Nothing heavy — I just want to know how you're actually doing." },
      { title: "Share the rougher draft", body: "Both {U} and {P} wait until something is fully formed before sharing it. Practice sharing it half-formed. The relationship needs the earlier version too.", phraseTry: "I'm still figuring out how I feel about this, but I wanted to say it out loud anyway." },
      { title: "Name what you appreciate", body: "Reserved people often feel deeply — they just don't say it. Make a practice of saying specifically what you value about each other. The other person may not know unless you tell them.", phraseTry: "I don't say this enough, but I want you to know I really value the way you {something specific}." },
    ],
  },

  // ── Cross-type pairings ────────────────────────────────────────────────────
  {
    id: "WX", typeA: "W", typeB: "X",
    name: "The jumpstart",
    tagline: "Both want resolution. Different instruments, same direction.",
    description: "{U} and {P} both move toward resolution when things get hard — you're pulling in the same direction. Where you differ is in how the internal experience travels: one processes outward, and one holds it closer. The destination is the same. The path there looks different.",
    nuance: "The expressive partner can feel like the guarded one isn't sharing what's actually going on. The guarded partner can feel like too much is being put into the shared space before it's ready. Neither is wrong. The registers are just different.",
    color: "#E8673A", shade: "#FFF4F0",
    famousDuos: [
      { names: "Leslie & Ben", show: "Parks & Recreation", note: "Both wanted to get things done. One led with passion and feeling; one led with spreadsheets and caution. Together they made things actually happen." },
      { names: "Pam & Jim (later seasons)", show: "The Office", note: "Both reaching toward resolution, both committed to the relationship. The difference was how much of the working-through happened out loud versus privately." },
    ],
    strengths: [
      "{U} and {P} are rarely stuck in standoff. You both want to resolve things, which means you're usually working in the same direction.",
      "You bring complementary processing styles. One keeps the emotional temperature in the room; the other thinks before putting it in the shared space.",
      "The relationship has both warmth and steadiness. You cover different emotional territory in a way that tends to be more complete than one style alone.",
    ],
    stickingPoints: [
      "The expressive partner can feel like they're always the one initiating depth, always doing the emotional work, always making the first move.",
      "The guarded partner can feel pressure to match an emotional expressiveness they don't naturally have, which sometimes makes them pull back further.",
      "What the expressive partner reads as withholding, the guarded partner experiences as just needing time to form it properly. Both readings feel true; neither is quite right.",
    ],
    patterns: [
      "When something is off, {U} and {P} are usually both aware of it — but processing it at different speeds.",
      "The expressive one tends to get the conversation started. The guarded one tends to arrive fully once it's underway.",
      "When the conversation does happen, it tends to go somewhere useful. You're not fighting about whether to have it — just when.",
    ],
    tips: [
      { title: "Name which mode you're in", body: "'I need to process this out loud' vs. 'I need to think before I talk.' That one sentence tells the other person how to meet you. Use it early.", phraseTry: "I need to process this out loud — bear with me. I don't have it figured out yet." },
      { title: "Guarded partner: share the half-formed version", body: "You don't have to wait until it's fully formed. 'I'm still figuring out how I feel about this' is a form of sharing, and it's usually exactly what the expressive partner needs to hear.", phraseTry: "I'm still working through it, but I think I'm bothered by {something}. Not sure why yet." },
      { title: "Expressive partner: give the processing room", body: "Pressing for more than the guarded partner is ready to give doesn't create connection — it creates pressure. Ask once, then wait. The sharing will come in its own time.", phraseTry: "I asked. I'm going to wait. I know it's coming." },
    ],
  },
  {
    id: "WY", typeA: "W", typeB: "Y",
    name: "The orbit",
    tagline: "You have different conflict clocks. One is ready before the other — and naming that changes everything.",
    description: "When things get hard, {U} moves toward resolution and {P} pulls back — or vice versa, depending on your individual types. The reaching can feel like pressure. The withdrawal can feel like abandonment. Neither is true — you're just wired differently for when the conversation becomes possible.",
    nuance: "This is one of the most common and most solvable friction patterns in relationships. The solution isn't changing your instinct — it's naming it out loud before the hard moment arrives. A simple agreement — 'I need a few hours, let's talk at 9' — short-circuits the loop that otherwise runs on its own.",
    color: "#E8673A", shade: "#FCE4EC",
    famousDuos: [
      { names: "Ross & Rachel", show: "Friends", note: "One wanted to resolve everything immediately; the other needed time and space first. Without a framework for it, they kept colliding at exactly the wrong moment." },
      { names: "Carrie & Big", show: "Sex and the City", note: "She reached. He retreated. Without a language for it, the pattern was destabilizing for years. When they finally named it, things changed." },
    ],
    strengths: [
      "Once you understand each other's conflict clock, you stop misreading each other's behavior. That alone removes most of the friction.",
      "You bring complementary instincts — one keeps things from festering, one keeps things from escalating.",
      "This dynamic, when named, often produces repair that works for both people rather than one.",
    ],
    stickingPoints: [
      "Without a framework, whoever needs space reads urgency as pressure, and whoever needs resolution reads distance as avoidance. Both interpretations feel true — and both are wrong.",
      "The pursuer-withdrawer loop: one presses for resolution, the other retreats further, which makes the first person press harder. It escalates without anyone wanting it to.",
      "Repair happens on one person's timeline, usually the person who initiates. The other person doesn't always feel ready when it starts.",
    ],
    patterns: [
      "When something is off, {U} and {P} are usually not in the same place at the same time. One is ready to engage; the other isn't there yet.",
      "What reads as pulling away is usually just needing space to process. What reads as pressure is usually just care. Neither meaning is the one being felt in the moment.",
      "The conflict clock mismatch doesn't mean one person cares more. It means you're wired differently — and that's solvable.",
    ],
    tips: [
      { title: "Name the pattern before you're in it", body: "When things are calm, tell each other: 'When I'm upset, I need X first.' That one conversation changes what the next hard moment looks like.", phraseTry: "When I'm upset, I need a few minutes before I can talk. It's not avoidance — I'll come back." },
      { title: "Make space bounded, not open-ended", body: "If one of you needs time: give a return. 'I need an hour' is different from silence. It lets the other person stop the worried waiting.", phraseTry: "I need an hour. I'll be back at eight." },
      { title: "Urgency isn't pressure; silence isn't avoidance", body: "When {U} presses for resolution, that's care, not control. When {P} needs space, that's process, not withdrawal. Say what you mean.", phraseTry: "I know this is hard for you to sit with. I'm not gone — I'm processing. I'll be back." },
    ],
  },
  {
    id: "WZ", typeA: "W", typeB: "Z",
    name: "The opening",
    tagline: "One reaches. One holds. The gap between those instincts is the conversation.",
    description: "One of {U} and {P} reaches toward resolution and expresses things openly; the other pulls back and holds things privately. The gap exists on both axes simultaneously — different conflict timing and different expressiveness — which means there's more translation work here than in most pairings.",
    nuance: "The reaching partner often doesn't know what the reserved partner is feeling until long after the fact, which can feel like withholding. The reserved partner often feels pressure to perform an emotional openness they don't naturally have. Naming this as a difference — not a deficiency — is the most useful thing {U} and {P} can do.",
    color: "#E8673A", shade: "#FFF4F0",
    famousDuos: [
      { names: "Elizabeth & Philip Mountbatten (early years)", show: "The Crown", note: "Wildly different in emotional register and expression. The relationship survived not because the gaps closed, but because both parties chose it anyway." },
      { names: "Hannah & Adam", show: "Girls", note: "One always needed more contact; the other needed to disappear first. The difficulty wasn't incompatibility — it was the gap between their stress responses." },
    ],
    strengths: [
      "The reaching partner creates space for emotional honesty in the relationship. The reserved partner creates depth beneath the surface.",
      "When the reserved one does share, it carries real weight — and the reaching partner has usually created the safety for it to land.",
      "You've both had to stretch toward each other in ways that have probably made you more capable partners.",
    ],
    stickingPoints: [
      "The reaching partner can feel like they're always the one initiating emotional depth, always doing the emotional work, always making the first move.",
      "The reserved partner can feel pressure to match an emotional expressiveness they don't naturally have, which can make them withdraw further.",
      "The translation gap is real. What {U} means and what {P} hears aren't always the same thing, and the assumption that you've understood each other can lead to confusion downstream.",
    ],
    patterns: [
      "{U} and {P} sometimes find that you mean something the other doesn't quite receive. The signal and the interpretation don't always match.",
      "Understanding each other has taken real effort — and usually more conversation than you'd expect.",
      "When {U} and {P} are communicating well, it's because you're both actively working to understand, not just assuming you do.",
    ],
    tips: [
      { title: "Expressiveness isn't depth — and silence isn't emptiness", body: "The reserved partner's inner life is not less rich because it isn't expressed as often. The reaching partner's sharing isn't less valuable because it comes more easily. Name that directly.", phraseTry: "There's more going on for me than I'm showing. I just need to get it in order before I share it." },
      { title: "Reaching partner: give the silence its room", body: "Pressing for more than the reserved partner is ready to give doesn't create connection — it creates pressure. Ask once, then wait. The sharing will come in its own time.", phraseTry: "I asked. That's enough for now. I trust you'll bring it when you're ready." },
      { title: "Reserved partner: share the earlier draft", body: "You don't have to wait until it's fully formed. Even 'I'm still figuring out how I feel about this' is a form of sharing, and it's usually exactly what the reaching partner needs to hear.", phraseTry: "I don't have this figured out, but something's been sitting with me and I wanted to say it before I lose it." },
    ],
  },
  {
    id: "XY", typeA: "X", typeB: "Y",
    name: "The translators",
    tagline: "Strong instincts on both sides, pointed differently. Moving forward together takes understanding and intention.",
    description: "{U} pushes toward resolution while processing internally; {P} needs space before the conversation is possible, and carries visible feeling in the meantime. They can read each other as simultaneously too much and not enough — the driving toward resolution can close off the space, and the visible feeling during withdrawal can look like something that needs fixing right now.",
    nuance: "The driver's urgency toward resolution can feel like pressure to the feeler, who isn't ready yet. The feeler's emotional visibility during withdrawal can feel like an invitation to engage, when it's actually a signal to wait. Both readings are understandable. Both are wrong.",
    color: "#7C3AED", shade: "#F5F0FF",
    famousDuos: [
      { names: "Hermione & Ron", show: "Harry Potter", note: "She analyzed and pushed; he felt his way through and needed to breathe. They drove each other crazy in exactly the ways that made them better." },
      { names: "Ted & Robin", show: "How I Met Your Mother", note: "He pushed toward resolution; she pulled toward distance. Neither was wrong — but they needed a way to say so." },
    ],
    strengths: [
      "{U} and {P} have strong, complementary instincts. When named and managed, they produce repair that actually works for both people.",
      "You cover very different emotional territory — one tracks the logic, one tracks the feeling. The relationship has range.",
      "The dynamic is highly solvable once it's named. Many couples with this pattern go on to build some of the most intentional relationships.",
    ],
    stickingPoints: [
      "The driver's move toward resolution can close off the space the feeler needs. The feeler isn't ready, and the conversation starts before they are.",
      "The feeler's visible emotion during withdrawal can look to the anchor like something that needs fixing immediately — which makes the anchor push harder.",
      "It can feel like one person cares more than the other — not because that's true, but because they're expressing it at different times and in different ways.",
    ],
    patterns: [
      "When something is hard, {U} and {P} are usually not in the same place at the same time. One is ready to engage; the other needs the space.",
      "What reads as pulling away is usually just needing room to process. What reads as pressure is usually just care. Neither meaning is the one being felt in the moment.",
      "The gap between your instincts is not a character flaw. It's a wiring difference that has a well-worn solution: naming it before you're in it.",
    ],
    tips: [
      { title: "Driver: resolution doesn't mean resolved", body: "The feeler needs the space and then the conversation. Moving fast to 'let's talk' before they're ready doesn't get to resolution faster — it delays it.", phraseTry: "I know you're not ready. I'll wait — but can you tell me when you think you will be?" },
      { title: "Feeler: tell the anchor when you'll be back", body: "The uncertainty is harder for them than the wait. 'I need until tonight' lets the anchor stop the worried waiting and trust the process.", phraseTry: "I need until tomorrow morning. I'll come to you then." },
      { title: "Name the pattern out loud before you're in it", body: "When things are calm: 'When I'm upset, I need X before the conversation is possible.' That one sentence changes what the next hard moment looks like.", phraseTry: "When I go quiet, it's not over — it's processing. Give me space and I'll come back." },
    ],
  },
  {
    id: "XZ", typeA: "X", typeB: "Z",
    name: "The stethoscope",
    tagline: "You both work things out privately before anything surfaces. The relationship runs quietly — and real depth lives beneath that.",
    description: "{U} and {P} both hold things privately and both process what's going on before it comes out — if it comes out at all. The dynamic is low-temperature and rarely explosive. The practical machinery of the relationship runs smoothly. The emotional layer tends to stay quiet.",
    nuance: "Neither partner is offering a lot of emotional visibility to the other. The relationship can run on logic, shared purpose, and good-enough communication while the emotional texture goes largely unaddressed. That gap tends to show up during life transitions, when something that's been running quietly needs to be named.",
    color: "#1B5FE8", shade: "#EFF1FF",
    famousDuos: [
      { names: "Joel & Ellie", show: "The Last of Us", note: "Both held things close. Both processed privately. What passed between them was real and deep — it just required the other person to ask rather than assume." },
      { names: "Ron Swanson & Diane", show: "Parks & Recreation", note: "He valued his private world enormously. She had her own rich interior life. They built something that worked by not crowding each other." },
    ],
    strengths: [
      "{U} and {P} can coexist in quiet without it feeling like distance. Silence between you is comfortable rather than tense.",
      "Neither of you puts things into the shared space before they're formed. What comes out tends to be considered.",
      "The relationship has real privacy and mutual respect for each other's interior life.",
    ],
    stickingPoints: [
      "Neither partner is offering a lot of emotional visibility to the other. The relationship can feel more okay on the outside than it is on the inside.",
      "When something is wrong, neither of you naturally reaches for the other first. Problems can sit longer than they should.",
      "Two people who both process privately can coexist comfortably without ever quite landing in the relationship's emotional interior.",
    ],
    patterns: [
      "{U} and {P} probably have fewer dramatic conversations than most couples. The emotional content of the relationship tends to go inward.",
      "The driver has a low-level push toward getting things resolved; the reserved partner tends to need more time before the conversation is fully possible.",
      "When you do talk through something, it tends to be calmer and more considered than it would be for more expressive pairings.",
    ],
    tips: [
      { title: "Build a practice of asking", body: "Not 'are you okay?' but 'what's actually going on for you right now?' Two people who both hold things privately need to be asked before they'll share.", phraseTry: "What's actually going on for you right now — not the plan, the feeling?" },
      { title: "Schedule the emotional check-in", body: "{U} and {P} are both capable of going long stretches without naming what's going on inside. A regular, brief check-in creates the container that neither of you will naturally generate on your own.", phraseTry: "Can we do fifteen minutes on Sunday? Just to check in properly." },
      { title: "The quiet isn't a problem — until it is", body: "Low-drama is a real quality. The work is making sure the ease isn't covering for avoided conversations. Check in on whether the calm is genuine or whether something is sitting unspoken.", phraseTry: "Is there anything sitting unspoken between us right now? I want to make sure we're actually okay." },
    ],
  },
  {
    id: "YZ", typeA: "Y", typeB: "Z",
    name: "The sanctuary",
    tagline: "You both need space when things get hard. The difference is how much it shows — and that gap is worth understanding.",
    description: "When things get hard, {U} and {P} both pull back — but one of you carries the emotional weight visibly while withdrawn, and the other holds everything privately. The return is slow for both. Hard moments can sit for a long time before either of you surfaces them.",
    nuance: "Real depth runs in this pairing — often more than either partner shows. The risk is that the depth never surfaces because neither person naturally initiates the opening. The feeler, when ready, tends to be more willing to bring it back. Making that the agreed pattern gives the still-depth partner the full space they need without indefinite silence.",
    color: "#7C3AED", shade: "#F5F0FF",
    famousDuos: [
      { names: "Joel & Clementine", show: "Eternal Sunshine of the Spotless Mind", note: "He held everything privately; she expressed the weight of everything she was feeling. Both needed space. Both took it in different ways." },
      { names: "Anne Elliot & Captain Wentworth (early)", show: "Persuasion", note: "Both withdrew and held things close. The return was slow and required one of them to finally speak." },
    ],
    strengths: [
      "Things don't escalate in the moment. {U} and {P} both have the instinct to step back before the conversation gets more heated than it needs to be.",
      "When the conversation does happen, it tends to be calmer and more real than it would have been at the height of it.",
      "Both of you understand the need for space — so you're less likely to take it personally when the other person needs it.",
    ],
    stickingPoints: [
      "{U} and {P} can both wait a long time for the other to come back first. That waiting can start to feel like abandonment, even when it's just process.",
      "The feeler's visible emotion during withdrawal can be hard for the still-depth partner to know what to do with — it's not a signal to engage, but it doesn't look like 'I'm fine.'",
      "Hard things can sit for a very long time before either of you surfaces them. Without a deliberate practice, important things go unaddressed.",
    ],
    patterns: [
      "After a hard moment, {U} and {P} both need time. The space is real and usually helpful.",
      "The coming-back-together step takes longer than it needs to because neither of you naturally initiates it.",
      "When the conversation does happen, it tends to be more complete than it would have been earlier. The depth is real — it just required the time.",
    ],
    tips: [
      { title: "Let the feeler initiate the return", body: "The feeler, when ready, tends to be more willing to bring it back. Make that the agreed pattern: {U} signals readiness, {P} gets the full space they need without indefinite silence.", phraseTry: "I'm ready when you are. Take your time — I'll be here." },
      { title: "Bound the space with a time", body: "'I need some time' is not as useful as 'I need until tonight.' A specific return time lets the other person stop the worried waiting and trust the process.", phraseTry: "I need until tomorrow morning. I'll come find you then." },
      { title: "Create a regular container for openness", body: "{U} and {P} need a deliberate structure for things to surface. A weekly check-in — even 10 minutes — creates the opening that neither of you will naturally generate on your own.", phraseTry: "Can we do ten minutes on Sunday? Not about anything specific — I just want to check in." },
    ],
  },
];

// Shareable couple type card component

// ── COUPLE MAP SVG COMPONENT ──────────────────────────────────────────────────
function CoupleMapSVG({ myS, partS, userName, partnerName, size = 480 }) {
  const typeInfoA = computeIndividualType(myS);
  const typeInfoB = computeIndividualType(partS);
  const itA = INDIVIDUAL_TYPES[typeInfoA.typeCode];
  const itB = INDIVIDUAL_TYPES[typeInfoB.typeCode];

  // Chart geometry — tighter padding now axis labels are removed
  const pad = 32;
  const VB = 460;
  const cx0 = pad, cy0 = 48, cx1 = VB - pad, cy1 = VB - pad + 48;
  const cw = cx1 - cx0, ch = cy1 - cy0;
  const midX = cx0 + cw / 2, midY = cy0 + ch / 2;
  const r = 14; // corner radius for quadrants

  // Orientation: Open=left, Guarded=right (horizontal); Engage=top, Withdraw=bottom (vertical)
  const toX = (openCoord) => cx0 + (1 - openCoord) * cw;
  const toY = (engageCoord) => cy1 - engageCoord * ch;

  const axA = { x: toX(typeInfoA.openCoord), y: toY(typeInfoA.engageCoord) };
  const axB = { x: toX(typeInfoB.openCoord), y: toY(typeInfoB.engageCoord) };

  // Quadrant gradient colors
  const QG = {
    W: ["#FFE4D6", "#FFD0B8"],
    X: ["#DAE4FF", "#C8D5FF"],
    Y: ["#EAE0FF", "#DDD0FF"],
    Z: ["#E8E6E3", "#DEDAD5"],
  };
  const QC = { W: "#E8673A", X: "#1B5FE8", Y: "#7C3AED", Z: "#6B7280" };
  const QN = { W: "The Initiator", X: "The Anchor", Y: "The Feeler", Z: "The Protector" };

  // Name tag pill dimensions
  const tagH = 22, tagR = 11, tagPad = 10;
  const tagW = (name) => Math.max(name.length * 7.2 + tagPad * 2, 60);
  const tagWA = tagW(userName), tagWB = tagW(partnerName);

  // Tag position — above A, below B, nudged if near edges
  const tagAx = Math.max(cx0 + 4, Math.min(cx1 - tagWA - 4, axA.x - tagWA / 2));
  const tagBx = Math.max(cx0 + 4, Math.min(cx1 - tagWB - 4, axB.x - tagWB / 2));
  const tagAy = axA.y - 38;
  const tagBy = axB.y + 18;

  const idA = `gA_${typeInfoA.typeCode}`;
  const idB = `gB_${typeInfoB.typeCode}`;
  const idQW = "qgW", idQX = "qgX", idQY = "qgY", idQZ = "qgZ";

  return (
    <div style={{ width: "100%" }}>
      {/* SVG Map */}
      <svg viewBox={`0 0 ${VB} ${cy1 + 20}`} style={{ width: "100%", display: "block", overflow: "visible" }} aria-label="Couple map showing partner positions">
        <defs>
          {/* Quadrant gradients */}
          <linearGradient id={idQW} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={QG.W[0]}/><stop offset="100%" stopColor={QG.W[1]}/>
          </linearGradient>
          <linearGradient id={idQX} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={QG.X[0]}/><stop offset="100%" stopColor={QG.X[1]}/>
          </linearGradient>
          <linearGradient id={idQY} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={QG.Y[0]}/><stop offset="100%" stopColor={QG.Y[1]}/>
          </linearGradient>
          <linearGradient id={idQZ} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={QG.Z[0]}/><stop offset="100%" stopColor={QG.Z[1]}/>
          </linearGradient>
          {/* Dot radial glows */}
          <radialGradient id={idA} cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor={itA.color} stopOpacity="0.5"/>
            <stop offset="100%" stopColor={itA.color} stopOpacity="0"/>
          </radialGradient>
          <radialGradient id={idB} cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor={itB.color} stopOpacity="0.5"/>
            <stop offset="100%" stopColor={itB.color} stopOpacity="0"/>
          </radialGradient>
          <filter id="dotShadow" x="-80%" y="-80%" width="260%" height="260%">
            <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="rgba(0,0,0,0.22)"/>
          </filter>
          <filter id="tagShadow" x="-10%" y="-20%" width="120%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.18)"/>
          </filter>
        </defs>

        {/* ── QUADRANT FILLS (rounded, each its own rect) ── */}
        <rect x={cx0} y={cy0} width={cw/2} height={ch/2} rx={r} fill={`url(#${idQW})`}/>
        <rect x={midX} y={cy0} width={cw/2} height={ch/2} rx={r} fill={`url(#${idQX})`}/>
        <rect x={cx0} y={midY} width={cw/2} height={ch/2} rx={r} fill={`url(#${idQY})`}/>
        <rect x={midX} y={midY} width={cw/2} height={ch/2} rx={r} fill={`url(#${idQZ})`}/>

        {/* Outer border */}
        <rect x={cx0} y={cy0} width={cw} height={ch} rx={r} fill="none" stroke="#D8D0C8" strokeWidth="1.5"/>

        {/* Centre cross — white then subtle line */}
        <line x1={midX} y1={cy0} x2={midX} y2={cy1} stroke="white" strokeWidth="4"/>
        <line x1={cx0} y1={midY} x2={cx1} y2={midY} stroke="white" strokeWidth="4"/>
        <line x1={midX} y1={cy0} x2={midX} y2={cy1} stroke="#C8C0B8" strokeWidth="1"/>
        <line x1={cx0} y1={midY} x2={cx1} y2={midY} stroke="#C8C0B8" strokeWidth="1"/>

        {/* ── QUADRANT LABELS (letter + name, corner) ── */}
        {/* W: top-left */}
        <text x={cx0 + 14} y={cy0 + 22} fontSize="15" fontWeight="800" fill={QC.W} fontFamily="Georgia,serif" opacity="0.95">W</text>
        <text x={cx0 + 14} y={cy0 + 38} fontSize="11.5" fontWeight="700" fill={QC.W} fontFamily="Arial" opacity="0.8">{QN.W}</text>
        {/* X: top-right */}
        <text x={cx1 - 14} y={cy0 + 22} fontSize="15" fontWeight="800" fill={QC.X} fontFamily="Georgia,serif" textAnchor="end" opacity="0.95">X</text>
        <text x={cx1 - 14} y={cy0 + 38} fontSize="11.5" fontWeight="700" fill={QC.X} fontFamily="Arial" textAnchor="end" opacity="0.8">{QN.X}</text>
        {/* Y: bottom-left */}
        <text x={cx0 + 14} y={cy1 - 24} fontSize="15" fontWeight="800" fill={QC.Y} fontFamily="Georgia,serif" opacity="0.95">Y</text>
        <text x={cx0 + 14} y={cy1 - 10} fontSize="11.5" fontWeight="700" fill={QC.Y} fontFamily="Arial" opacity="0.8">{QN.Y}</text>
        {/* Z: bottom-right */}
        <text x={cx1 - 14} y={cy1 - 24} fontSize="15" fontWeight="800" fill={QC.Z} fontFamily="Georgia,serif" textAnchor="end" opacity="0.95">Z</text>
        <text x={cx1 - 14} y={cy1 - 10} fontSize="11.5" fontWeight="700" fill={QC.Z} fontFamily="Arial" textAnchor="end" opacity="0.8">{QN.Z}</text>

        {/* ── AXIS LABELS — removed per design direction ── */}


        {/* ── CONNECTING LINE ── */}
        <line x1={axA.x} y1={axA.y} x2={axB.x} y2={axB.y} stroke="#C0B8B0" strokeWidth="2" strokeDasharray="6,5" opacity="0.75"/>

        {/* ── PARTNER B DOT ── */}
        {/* Glow halo */}
        <circle cx={axB.x} cy={axB.y} r="36" fill={`url(#${idB})`}/>
        {/* Pulse ring */}
        <circle cx={axB.x} cy={axB.y} r="22" fill="none" stroke={itB.color} strokeWidth="1.5" opacity="0.28"/>
        {/* Main dot */}
        <circle cx={axB.x} cy={axB.y} r="15" fill={itB.color} filter="url(#dotShadow)"/>
        <circle cx={axB.x} cy={axB.y} r="15" fill="none" stroke="white" strokeWidth="2.5"/>
        {/* Shine */}
        <circle cx={axB.x - 4} cy={axB.y - 4} r="4.5" fill="white" opacity="0.38"/>
        {/* Name tag pill — below dot */}
        <rect x={tagBx} y={tagBy} width={tagWB} height={tagH} rx={tagR} fill={itB.color} filter="url(#tagShadow)"/>
        <text x={tagBx + tagWB / 2} y={tagBy + 15} textAnchor="middle" fontSize="11" fontWeight="700" fill="white" fontFamily="Arial">{partnerName}</text>
        {/* Tail triangle */}
        <polygon points={`${axB.x},${tagBy} ${axB.x - 5},${tagBy + 6} ${axB.x + 5},${tagBy + 6}`} fill={itB.color}/>

        {/* ── PARTNER A DOT (on top) ── */}
        <circle cx={axA.x} cy={axA.y} r="36" fill={`url(#${idA})`}/>
        <circle cx={axA.x} cy={axA.y} r="22" fill="none" stroke={itA.color} strokeWidth="1.5" opacity="0.28"/>
        <circle cx={axA.x} cy={axA.y} r="15" fill={itA.color} filter="url(#dotShadow)"/>
        <circle cx={axA.x} cy={axA.y} r="15" fill="none" stroke="white" strokeWidth="2.5"/>
        <circle cx={axA.x - 4} cy={axA.y - 4} r="4.5" fill="white" opacity="0.38"/>
        {/* Name tag pill — above dot */}
        <rect x={tagAx} y={tagAy} width={tagWA} height={tagH} rx={tagR} fill={itA.color} filter="url(#tagShadow)"/>
        <text x={tagAx + tagWA / 2} y={tagAy + 15} textAnchor="middle" fontSize="11" fontWeight="700" fill="white" fontFamily="Arial">{userName}</text>
        {/* Tail triangle */}
        <polygon points={`${axA.x},${tagAy + tagH} ${axA.x - 5},${tagAy + tagH - 6} ${axA.x + 5},${tagAy + tagH - 6}`} fill={itA.color}/>
      </svg>

      {/* ── LEGEND ── */}
      <div style={{ display: "flex", gap: "1.25rem", padding: "0.85rem 0.25rem 0.75rem", borderTop: "1px solid #E8DDD0", flexWrap: "wrap" }}>
        {[{ name: userName, it: itA }, { name: partnerName, it: itB }].map(({ name, it }) => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: it.color, flexShrink: 0 }}/>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#0E0B07", fontFamily: BFONT }}>{name}</span>
            <span style={{ fontSize: "0.65rem", color: "#8C7A68", fontFamily: BFONT }}>{it.code} — {it.name}</span>
          </div>
        ))}
      </div>

      {/* ── 50-QUESTION CALLOUT ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", background: "#FBF8F3", border: "1.5px solid #E8DDD0", borderRadius: 12, padding: "0.85rem 1rem", marginTop: "0.25rem" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#E8673A,#1B5FE8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#0E0B07", marginBottom: "0.2rem", fontFamily: BFONT }}>Each dot is placed by calculation, not intuition</div>
          <p style={{ fontSize: "0.72rem", color: "#8C7A68", lineHeight: 1.6, margin: 0, fontWeight: 300, fontFamily: BFONT }}>Where {userName} and {partnerName} sit on this map is calculated from their answers to 50 independent questions — not self-assigned. Two people who think they know their type will almost always land somewhere different than expected.</p>
        </div>
      </div>
    </div>
  );
}

function CoupleTypeCard({ coupleType, userName, partnerName, onClick }) {
  if (!coupleType) return null;
  const { name, tagline, description, nuance, color } = coupleType;
  const interp = (str) => str ? str.replace(/\{U\}/g, userName).replace(/\{P\}/g, partnerName) : str;
  return (
    <div onClick={onClick}
      style={{ background: "#2d2250", borderRadius: 20, overflow: "hidden", position: "relative", cursor: onClick ? "pointer" : "default", transition: "transform 0.2s" }}
      onMouseEnter={e => onClick && (e.currentTarget.style.transform = "translateY(-2px)")}
      onMouseLeave={e => onClick && (e.currentTarget.style.transform = "")}>
      <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
      <div style={{ padding: "2rem 2rem 1.75rem" }}>
        <div style={{ fontSize: "0.6rem", letterSpacing: "0.24em", textTransform: "uppercase", color: color + "99", fontFamily: BFONT, fontWeight: 700, marginBottom: "0.6rem" }}>
          Your couple type · {userName} &amp; {partnerName}
        </div>
        <div style={{ fontFamily: HFONT, fontSize: "clamp(1.8rem, 4vw, 2.4rem)", fontWeight: 700, color: "white", lineHeight: 1.0, marginBottom: "0.5rem", letterSpacing: "-0.01em" }}>
          {name}
        </div>
        <p style={{ fontSize: "0.92rem", color: color, fontFamily: BFONT, fontWeight: 500, lineHeight: 1.5, margin: "0 0 1.25rem", maxWidth: 480 }}>
          {tagline}
        </p>
        <p style={{ fontSize: "0.85rem", color: "rgba(245,239,230,0.88)", fontFamily: BFONT, fontWeight: 300, lineHeight: 1.8, margin: "0 0 1.25rem", maxWidth: 520 }}>
          {description}
        </p>
        <div style={{ borderLeft: `3px solid ${color}55`, paddingLeft: "1rem" }}>
          <div style={{ fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: color + "88", fontFamily: BFONT, fontWeight: 700, marginBottom: "0.3rem" }}>Worth knowing</div>
          <p style={{ fontSize: "0.8rem", color: "rgba(245,239,230,0.75)", fontFamily: BFONT, fontWeight: 300, lineHeight: 1.75, margin: 0 }}>{interp(nuance)}</p>
        </div>
      </div>
    </div>
  );
}

// ── RESULTS SLIDE CONTAINER ─────────────────────────────────────────────────
// Full-screen dark slide wrapper used throughout personality results.
function ResultsSlide({ bg, children, style = {} }) {
  return (
    <div data-results-scroll style={{
      minHeight: "100vh", background: bg || "#0f0c29",
      padding: "2rem 1.5rem 4rem",
      maxWidth: 780, margin: "0 auto",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── NAV BUTTONS ──────────────────────────────────────────────────────────────
// Back / Next buttons at the bottom of each results step.
function NavButtons({ onBack, onNext, backDisabled, nextDisabled, nextLabel = "Next →", backLabel = "← Back" }) {
  const btn = (label, onClick, disabled, primary) => (
    <button onClick={!disabled ? onClick : undefined} style={{
      padding: "0.65rem 1.4rem", borderRadius: 10, cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", fontWeight: primary ? 600 : 400,
      opacity: disabled ? 0.35 : 1, transition: "opacity 0.15s",
      background: primary ? "linear-gradient(135deg,#E8673A,#1B5FE8)" : "rgba(255,255,255,0.08)",
      color: "white",
      border: primary ? "none" : "1px solid rgba(255,255,255,0.18)",
    }}>
      {label}
    </button>
  );
  return (
    <div style={{ display: "flex", gap: "0.75rem", marginTop: "2.5rem", justifyContent: "space-between", alignItems: "center" }}>
      {btn(backLabel, onBack, backDisabled, false)}
      {btn(nextLabel, onNext, nextDisabled, true)}
    </div>
  );
}

// ── DIM TRACK VISUALIZATION ──────────────────────────────────────────────────
// Bar showing where each partner scored on a 1–5 dimension scale.
function DimTrackViz({ myScore = 3, theirScore = 3, color = "#9B5DE5", userName = "You", partnerName = "Partner" }) {
  const pct = v => ((v - 1) / 4) * 100;
  return (
    <div style={{ margin: "1.25rem 0", paddingBottom: "1.6rem", position: "relative" }}>
      {/* Track — dots positioned relative to this bar so they center on it exactly */}
      <div style={{ height: 4, background: "rgba(255,255,255,0.12)", borderRadius: 2, position: "relative", overflow: "visible" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 2, background: "linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.18))" }} />
        {/* My dot — centered vertically on bar with transform: translate(-50%, -50%) */}
        <div style={{ position: "absolute", top: "50%", left: pct(myScore) + "%", transform: "translate(-50%, -50%)", width: 14, height: 14, borderRadius: "50%", background: color, border: "2px solid " + color, boxShadow: "0 0 8px " + color + "66", zIndex: 2 }} />
        {/* Partner dot */}
        <div style={{ position: "absolute", top: "50%", left: pct(theirScore) + "%", transform: "translate(-50%, -50%)", width: 12, height: 12, borderRadius: "50%", background: "rgba(255,255,255,0.5)", border: "2px solid rgba(255,255,255,0.3)", zIndex: 1 }} />
      </div>
      {/* Name labels — below the bar */}
      <div style={{ position: "relative", height: 20, marginTop: 8 }}>
        {[{ score: myScore, label: userName }, { score: theirScore, label: partnerName }].map(({ score, label }) => (
          <span key={label} style={{ position: "absolute", left: pct(score) + "%", transform: "translateX(-50%)", fontSize: "0.58rem", color: "rgba(255,255,255,0.55)", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── COUPLE PORTRAIT BUBBLE ───────────────────────────────────────────────────
// Small avatar circle shown in nav header when portrait is set.
function CouplePortraitBubble({ portrait, size = 32, dark = false, uid, onClick, style = {} }) {
  if (!portrait) return null;
  const bg = "linear-gradient(135deg,#E8673A,#9B5DE5,#1B5FE8)";
  return (
    <div onClick={onClick} style={{
      width: size, height: size, borderRadius: "50%", background: bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: onClick ? "pointer" : "default", flexShrink: 0,
      fontSize: size * 0.38, color: "white", fontWeight: 700,
      fontFamily: "'DM Sans', sans-serif", ...style,
    }}>
      {(portrait?.p1?.initial || "A")[0]}
    </div>
  );
}
// ── GIFT LANDING SCREEN ──────────────────────────────────────────────────────
// Shown when someone scans a QR card from a physical gift box.
// ?gift=1&p1=Sarah&p2=James&pkg=X&order=ATT-xxx
function GiftLandingScreen({ p1, p2, pkg, orderId, onCreateAccount }) {
  const [step, setStep] = React.useState('who'); // 'who' | 'email' | 'signup'
  const [chosenPartner, setChosenPartner] = React.useState(null); // 'p1' | 'p2'
  const [partnerEmail, setPartnerEmail] = React.useState('');
  const [emailErr, setEmailErr] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const myName = chosenPartner === 'p1' ? p1 : p2;
  const theirName = chosenPartner === 'p1' ? p2 : p1;

  const C = { orange: '#E8673A', indigo: '#1B5FE8', ink: '#0E0B07', muted: '#8C7A68', stone: '#E8DDD0', warm: '#FFFDF9' };
  const inp = { width: '100%', padding: '0.78rem 1rem', border: `1.5px solid ${C.stone}`, borderRadius: 11, fontSize: '0.88rem', fontFamily: "'DM Sans', sans-serif", color: C.ink, background: C.warm, outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ minHeight: '100vh', background: '#F3EDE6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.25rem', fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      <div style={{ background: C.warm, borderRadius: 22, padding: '2.25rem 2rem', width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.1)' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.75rem' }}>
          <svg width="28" height="20" viewBox="0 0 103 76" fill="none"><defs><linearGradient id="glg" x1="0" y1="0" x2="103" y2="76" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#E8673A"/><stop offset="100%" stopColor="#1B5FE8"/></linearGradient></defs><path d="M14,4 L44,4 A9,9 0 0,1 53,13 L53,42 A9,9 0 0,1 44,51 L20,51 L6,61 L11,51 A6,6 0 0,1 5,45 L5,13 A9,9 0 0,1 14,4 Z" fill="url(#glg)"/><path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="white" opacity=".93" transform="translate(13.16,11.3) scale(0.72)"/></svg>
          <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '0.95rem', fontWeight: 700, color: C.ink }}>Attune</span>
        </div>

        {step === 'who' && (
          <>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', fontWeight: 700, color: C.ink, marginBottom: '0.4rem', lineHeight: 1.2 }}>Welcome to Attune.</div>
            <p style={{ fontSize: '0.82rem', color: C.muted, marginBottom: '1.75rem', lineHeight: 1.65 }}>Someone sent you this as a gift. Let's get you set up. First — who are you?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[{name: p1, key: 'p1'}, {name: p2, key: 'p2'}].filter(x => x.name).map(({ name, key }) => (
                <button key={key} onClick={() => { setChosenPartner(key); setStep('email'); }}
                  style={{ width: '100%', padding: '1rem', border: `1.5px solid ${C.stone}`, borderRadius: 12, background: 'white', cursor: 'pointer', textAlign: 'left', fontSize: '1rem', fontWeight: 600, color: C.ink, fontFamily: "'DM Sans', sans-serif", transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.orange}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.stone}>
                  I'm {name} →
                </button>
              ))}
              {!p2 && (
                <button onClick={() => { setChosenPartner('p1'); setStep('email'); }}
                  style={{ width: '100%', padding: '1rem', border: `1.5px solid ${C.stone}`, borderRadius: 12, background: 'white', cursor: 'pointer', textAlign: 'left', fontSize: '1rem', fontWeight: 600, color: C.ink, fontFamily: "'DM Sans', sans-serif" }}>
                  I'm {p1} →
                </button>
              )}
            </div>
          </>
        )}

        {step === 'email' && (
          <>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.15rem', fontWeight: 700, color: C.ink, marginBottom: '0.4rem', lineHeight: 1.2 }}>Hi, {myName}.</div>
            <p style={{ fontSize: '0.82rem', color: C.muted, marginBottom: '1.5rem', lineHeight: 1.65 }}>
              {theirName ? `Let's invite ${theirName} so you can do this together.` : "Let's invite your partner so you can do this together."}
            </p>
            <div style={{ fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, fontWeight: 700, marginBottom: '0.35rem' }}>
              {theirName ? `${theirName}'s email` : "Your partner's email"}
            </div>
            <input
              type="email"
              placeholder={theirName ? `${theirName}@example.com` : "partner@example.com"}
              value={partnerEmail}
              onChange={e => { setPartnerEmail(e.target.value); setEmailErr(''); }}
              style={inp}
            />
            {emailErr && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.4rem' }}>{emailErr}</p>}
            <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1.25rem' }}>
              <button onClick={() => setStep('who')} style={{ flex: 1, padding: '0.75rem', border: `1.5px solid ${C.stone}`, borderRadius: 11, background: 'transparent', cursor: 'pointer', fontSize: '0.85rem', fontFamily: "'DM Sans', sans-serif", color: C.muted }}>← Back</button>
              <button onClick={() => {
                if (!partnerEmail.includes('@')) return setEmailErr('Please enter a valid email.');
                setStep('signup');
              }} style={{ flex: 2, padding: '0.75rem', border: 'none', borderRadius: 11, background: `linear-gradient(135deg, ${C.orange}, ${C.indigo})`, color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', fontFamily: "'DM Sans', sans-serif" }}>
                {theirName ? `Invite ${theirName} →` : 'Send invite →'}
              </button>
            </div>
            <button onClick={() => setStep('signup')} style={{ width: '100%', marginTop: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: C.muted, fontFamily: "'DM Sans', sans-serif", textDecoration: 'underline' }}>
              Skip for now — I'll invite them later
            </button>
          </>
        )}

        {step === 'signup' && (
          <GiftSignupForm
            myName={myName}
            theirName={theirName}
            theirEmail={partnerEmail}
            pkg={pkg}
            orderId={orderId}
            onCreateAccount={onCreateAccount}
          />
        )}
      </div>
    </div>
  );
}

// ── GIFT SIGNUP FORM ─────────────────────────────────────────────────────────
function GiftSignupForm({ myName, theirName, theirEmail, pkg, orderId, onCreateAccount }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [err, setErr] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const C = { orange: '#E8673A', indigo: '#1B5FE8', ink: '#0E0B07', muted: '#8C7A68', stone: '#E8DDD0', warm: '#FFFDF9' };
  const inp = { width: '100%', padding: '0.78rem 1rem', border: `1.5px solid ${C.stone}`, borderRadius: 11, fontSize: '0.88rem', fontFamily: "'DM Sans', sans-serif", color: C.ink, background: C.warm, outline: 'none', marginBottom: '0.65rem', boxSizing: 'border-box' };
  const genInvite = () => Math.random().toString(36).slice(2, 10).toUpperCase();

  const handleCreate = async () => {
    if (!email.includes('@')) return setErr('Please enter a valid email.');
    if (password.length < 6) return setErr('Password must be at least 6 characters.');
    setLoading(true); setErr('');

    // Check if order is already claimed (prevents QR code sharing)
    if (orderId) {
      try {
        const { supabase: sb, hasSupabase } = await import('./supabase.js');
        if (hasSupabase()) {
          const { data: ord } = await sb.from('orders').select('claimed').eq('order_num', orderId).maybeSingle();
          if (ord?.claimed) {
            setLoading(false);
            return setErr('This gift has already been redeemed. If you think this is an error, contact hello@attune-relationships.com');
          }
        }
      } catch {}
    }

    // Create account
    try {
      const { supabase: sb, hasSupabase } = await import('./supabase.js');
      const inviteCode = genInvite();
      if (hasSupabase()) {
        const { data: authData, error: authErr } = await sb.auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { name: myName } } });
        if (authErr) { setLoading(false); return setErr(authErr.message); }
        await sb.from('profiles').upsert({
          id: authData.user.id, name: myName, partner_name: theirName || '',
          partner_email: theirEmail || '', email_opt_in: true, invite_code: inviteCode,
          partner_joined: false, pkg: pkg || 'core', profile_setup_complete: false,
        });
        // Mark order as claimed
        if (orderId) {
          await sb.from('orders').update({ claimed: true, buyer_email: email.trim().toLowerCase() }).eq('order_num', orderId).catch(() => {});
        }
        // Send partner invite email if email provided
        if (theirEmail) {
          const inviteUrl = `${window.location.origin}/app?invite=${inviteCode}&from=${encodeURIComponent(myName)}&pae=${encodeURIComponent(email.trim().toLowerCase())}`;
          fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'partner_invite', fromName: myName, toEmail: theirEmail, toName: theirName || 'Your partner', inviteUrl }) }).catch(() => {});
        }
        // Send welcome email
        fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'welcome_account',
            userId: account?.id || null, toEmail: email.trim().toLowerCase(), toName: myName, partnerName: theirName || '', portalUrl: `${window.location.origin}/app` }) }).catch(() => {});

        const account = { id: authData.user.id, email: email.trim().toLowerCase(), name: myName, partnerName: theirName || '', partnerEmail: theirEmail || '', emailOptIn: true, inviteCode, partnerJoined: false, pkg: pkg || 'core', createdAt: Date.now(), isGiftRecipient: true };
        try { localStorage.setItem('attune_account', JSON.stringify(account)); } catch {}
        setLoading(false);
        onCreateAccount(account);
      }
    } catch (e) { setLoading(false); setErr('Something went wrong. Please try again.'); }
  };

  return (
    <>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', fontWeight: 700, color: '#0E0B07', marginBottom: '0.35rem' }}>Create your account</div>
      <p style={{ fontSize: '0.78rem', color: C.muted, marginBottom: '1.25rem', lineHeight: 1.55 }}>
        {theirEmail ? `We've sent ${theirName || 'your partner'} an invite. Create your account to get started.` : 'Create your account to begin the exercises.'}
      </p>
      <input type="email" placeholder="Your email" value={email} onChange={e => { setEmail(e.target.value); setErr(''); }} style={inp} />
      <input type="password" placeholder="Choose a password" value={password} onChange={e => { setPassword(e.target.value); setErr(''); }} style={inp} />
      {err && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: '0.75rem' }}>{err}</p>}
      <button onClick={handleCreate} disabled={loading}
        style={{ width: '100%', padding: '0.9rem', background: `linear-gradient(135deg, ${C.orange}, ${C.indigo})`, color: 'white', border: 'none', borderRadius: 12, fontSize: '0.85rem', fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif" }}>
        {loading ? 'Creating account…' : 'Create account →'}
      </button>
    </>
  );
}

// ── PROFILE SETUP TILE ────────────────────────────────────────────────────────
// Shown on dashboard until user completes profile setup. Per-person.
function ProfileSetupTile({ account, onSetup, onDismiss }) {
  const hasPortrait = false; // Placeholder until portrait integration ships
  const steps = [
    { label: "Set your name & pronouns", done: !!(account?.name && account?.pronouns) },
    { label: "Add your partner's name", done: !!(account?.partnerName) },
    { label: account?.partnerEmail ? "Partner invited \u2713" : "Invite your partner", done: !!(account?.partnerEmail) },
  ];
  const doneCount = steps.filter(s => s.done).length;

  return (
    <div style={{ background: 'white', border: '1.5px solid #E8DDD0', borderRadius: 16, padding: '1.25rem 1.5rem', marginBottom: '1.5rem', position: 'relative' }}>
      <button onClick={onDismiss} title="Dismiss" style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#8C7A68', fontSize: '1rem', lineHeight: 1 }}>✕</button>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#E8673A20,#1B5FE820)', border: '1.5px solid #E8DDD0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.1rem' }}>✦</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0E0B07', marginBottom: '0.25rem', fontFamily: "'DM Sans', sans-serif" }}>Before you start your exercises</div>
          <div style={{ fontSize: '0.75rem', color: '#8C7A68', marginBottom: '1rem', lineHeight: 1.55 }}>Complete your profile so your results are personalized to you.</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: s.comingSoon ? '#C17F47' : s.done ? '#059669' : '#8C7A68', background: s.comingSoon ? '#FFF8EE' : s.done ? '#ECFDF5' : '#F5F0EC', borderRadius: 99, padding: '0.25rem 0.7rem' }}>
                <span>{s.done ? '✓' : s.comingSoon ? '○' : '·'}</span>
                <span>{s.label}{s.comingSoon ? ' (coming soon)' : ''}</span>
              </div>
            ))}
          </div>
          <button onClick={onSetup} style={{ background: 'linear-gradient(135deg,#E8673A,#1B5FE8)', color: 'white', border: 'none', borderRadius: 9, padding: '0.55rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.04em' }}>
            Complete setup →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PORTRAIT SETUP MODAL ─────────────────────────────────────────────────────
// Minimal modal for setting up couple portrait (avatars + initials).
function PortraitSetup({ userName, partnerName, existing, onSave, onClose }) {
  const [p1Init, setP1Init] = useState(existing?.p1?.initial || (userName?.[0] || "A"));
  const [p2Init, setP2Init] = useState(existing?.p2?.initial || (partnerName?.[0] || "B"));
  const COLORS = ["#E8673A","#9B5DE5","#1B5FE8","#10b981","#F59E0B","#EC4899"];
  const [p1Color, setP1Color] = useState(existing?.p1?.color || COLORS[0]);
  const [p2Color, setP2Color] = useState(existing?.p2?.color || COLORS[1]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 20, padding: "2rem", maxWidth: 400, width: "100%", fontFamily: "'DM Sans', sans-serif" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1C1C1E", marginBottom: "1.5rem" }}>Your couple portrait</h3>
        {[{name: userName, init: p1Init, setInit: setP1Init, color: p1Color, setColor: setP1Color},
          {name: partnerName, init: p2Init, setInit: setP2Init, color: p2Color, setColor: setP2Color}].map((p, i) => (
          <div key={i} style={{ marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#999", marginBottom: "0.5rem" }}>{p.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: p.color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "1.2rem", fontWeight: 700 }}>{(p.init || "?")[0].toUpperCase()}</div>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {COLORS.map(c => <div key={c} onClick={() => p.setColor(c)} style={{ width: 20, height: 20, borderRadius: "50%", background: c, cursor: "pointer", outline: p.color === c ? "3px solid " + c : "none", outlineOffset: 2 }} />)}
              </div>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "0.65rem", borderRadius: 10, border: "1.5px solid #E5E2DC", background: "transparent", cursor: "pointer", fontSize: "0.85rem" }}>Cancel</button>
          <button onClick={() => { onSave({ p1: { initial: p1Init, color: p1Color }, p2: { initial: p2Init, color: p2Color } }); onClose(); }} style={{ flex: 1, padding: "0.65rem", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#E8673A,#1B5FE8)", color: "white", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>Save</button>
        </div>
      </div>
    </div>
  );
}



// ── DIM SHIFT TEXT ─────────────────────────────────────────────────────────
// 15 unique "One shift that helps" responses per dimension,
// based on where each partner scores (5 buckets × 5 buckets = 15 unordered combos).
// pos: 0=strongly A, 1=lean A, 2=middle, 3=lean B, 4=strongly B

function getDimShift(dim, myScore, partScore, U, P) {
  // Buckets: 1=Strongly A (≤1.8), 2=Lean A (1.8-2.6), 3=Middle (2.6-3.4), 4=Lean B (3.4-4.2), 5=Strongly B (>4.2)
  const pos = s => s <= 1.8 ? 1 : s <= 2.6 ? 2 : s <= 3.4 ? 3 : s <= 4.2 ? 4 : 5;
  const mp = pos(myScore), pp = pos(partScore);
  const lo = Math.min(mp, pp), hi = Math.max(mp, pp);
  const loName = (mp <= pp) ? U : P;
  const hiName = (mp <= pp) ? P : U;
  const key = `${lo}_${hi}`;

  const SHIFTS = {

    // ── ENERGY & RECHARGE (A=Inward, B=Outward) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    energy: {
      '1_1': `You both recharge in solitude. The risk is that neither of you flags when you're depleted — you just go quiet. Try naming it before you disappear: "I need a low-key evening." It prevents the silence from reading as something else.`,
      '1_2': `${loName} recharges alone; ${hiName} leans the same way, slightly more flexible. Close match, but don't let the ease of being separate quietly turn into less connection than you want. One shared ritual — dinner, a walk — holds the thread.`,
      '1_3': `${loName} recharges in solitude; ${hiName} is genuinely flexible. Make sure ${hiName}'s flexibility doesn't always defer to ${loName}'s preference for quiet. Check in: "what do you actually want tonight?" beats assuming.`,
      '1_4': `${loName} restores alone; ${hiName} leans toward people and togetherness. The shift: when ${loName} needs to withdraw, name it as a recharge request rather than going quiet. ${hiName} is less likely to misread it when it's said out loud.`,
      '1_5': `${loName} recharges in solitude; ${hiName} genuinely energizes from being together. A real daily-life difference. Design your week intentionally — some evenings are separately yours, some are deliberately shared. Named in advance, not negotiated on the spot.`,
      '2_2': `You both lean toward quiet restoration. Good match — you're unlikely to drain each other. The one gap: neither of you may push for togetherness when it's actually needed. Sometimes one person has to reach, even when it doesn't come naturally.`,
      '2_3': `${loName} leans toward quiet; ${hiName} is flexible. Small gap. Ask ${hiName} what they actually want occasionally — neutral doesn't mean indifferent, and their flexibility may be quietly costing them.`,
      '2_4': `${loName} leans toward recharging alone; ${hiName} leans toward connection. One shift: when you've both had a long day, name your mode before defaulting to it. "I need an hour to decompress" lands very differently than silently withdrawing.`,
      '2_5': `${loName} tends toward quiet; ${hiName} genuinely energizes from togetherness. The shift: ${hiName} shouldn't read ${loName}'s quiet time as withdrawal, and ${loName} should flag when they're recharged and ready to reconnect. Both need to become signals.`,
      '3_3': `You're both genuinely flexible about how you restore. That's adaptive, but it can mean connection gets left to chance. When stress hits, each of you may default to a mode the other doesn't know about. Check in when things are hard.`,
      '3_4': `${hiName} leans more toward needing togetherness than ${loName} does. Small but real. ${hiName} can name when they want company rather than hoping ${loName} picks it up. ${loName} tends to assume everyone's preferences match their own.`,
      '3_5': `${loName} is neutral; ${hiName} genuinely energizes from people and connection. ${hiName}'s need isn't needy — it's a preference worth designing around. Build in deliberate closeness even when ${loName} would otherwise be fine either way.`,
      '4_4': `You both restore through connection and togetherness. Warm match. Give each other explicit permission to want a quiet night sometimes — it shouldn't feel like a confession when one of you needs to be alone for a bit.`,
      '4_5': `Both of you lean toward connection — ${hiName} more strongly. When one of you is genuinely depleted and doesn't have energy for togetherness, build in an easy way to signal it: "I'm low tonight but I'm not going anywhere."`,
      '5_5': `You both restore through people and being together. Strong match in daily energy needs. The watch-out: when you're both depleted at the same time, neither of you may feel like being "on" for the other. Name it when it happens rather than both performing okay-ness.`,
    },

    // ── EMOTIONAL EXPRESSION (A=Internal, B=External) ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
    expression: {
      '1_1': `You both process internally before sharing. That prevents blurting — but it also means important things can stay unspoken for a long time. The shift: if something's been sitting with you for more than 48 hours, name it. Even "I've been sitting with something" opens the door.`,
      '1_2': `${loName} is strongly internal; ${hiName} leans similar. Neither of you is rushing to the surface. Watch for the slow drift where things stay unsaid because neither pushed. A regular check-in — "anything on your mind this week?" — creates the opening.`,
      '1_3': `${loName} processes privately; ${hiName} is flexible. The shift for ${loName}: trust that sharing before you're fully sorted won't make you look uncertain. It gives ${hiName} a chance to feel included in what's actually going on.`,
      '1_4': `${loName} goes internal; ${hiName} tends toward sharing. A real difference. ${loName} can offer an interim signal — "I'm processing something, I'll bring it up when I have words" — so ${hiName} doesn't fill the silence with their own interpretation.`,
      '1_5': `${loName} is very private in processing; ${hiName} processes by talking it through. One of the most common expression mismatches. The shift: agree that ${hiName} gets to think out loud without it being a finished position, and ${loName} gets time before being expected to respond.`,
      '2_2': `You both tend to work through things privately. That creates low-drama — but it means significant things can sit unspoken too long. Make it easy to say "I've been sitting with something" without needing to be fully ready to explain.`,
      '2_3': `${loName} leans private; ${hiName} is flexible. Don't let ${hiName}'s flexibility become the default that always gives way. Check in on what ${hiName} actually wants to share, not just what they're willing to hold.`,
      '2_4': `${loName} leans internal; ${hiName} leans toward sharing. ${loName} may often appear fine when they're not. Agree that "I need to think about this" means "I'll come back to you" — not "nothing's wrong."`,
      '2_5': `${loName} tends inward; ${hiName} processes externally. The shift: ${hiName} may share unfinished thoughts — which can feel like oversharing to ${loName}. Agree that thinking out loud is allowed and doesn't require an immediate response.`,
      '3_3': `You're both flexible on expression — can hold or share depending on the day. That's adaptive. Watch for: when something actually needs saying, the flexibility can become avoidance. Make it easy for either person to say "I need to talk about something."`,
      '3_4': `${hiName} leans more toward sharing than ${loName}. Small but real. ${hiName} may feel like they're doing most of the initiating when it comes to talking things through. ${loName} can start sometimes, even when nothing is wrong.`,
      '3_5': `${loName} is neutral; ${hiName} genuinely processes out loud and needs to share. Give ${hiName} explicit room to think aloud without ${loName} treating every word as a conclusion. Processing isn't the same as deciding.`,
      '4_4': `You both lean toward sharing rather than holding. The relationship is verbally expressive. Watch for: both of you sharing at once without one person listening. Practice one person speaking while the other actively receives — especially when things are charged.`,
      '4_5': `Both lean external — ${hiName} more so. You're likely to talk things through, which is healthy. When both of you are processing out loud at the same time, the volume can get high. Take turns more deliberately when things are tense.`,
      '5_5': `You both process very externally — feelings are out, usually in real time. That makes you readable to each other. The shift: because both of you share readily, the emotional volume can escalate quickly. Slowing down — speaking quieter, not louder — is the most useful skill here.`,
    },

    // ── HOW YOU ASK FOR WHAT YOU NEED (A=Direct, B=Indirect) ───────────────────────────────────────────────────────────────────────────────────────────────────────
    needs: {
      '1_1': `You both tend to ask for what you need directly. That's a genuine gift — the relationship doesn't carry much guesswork. The shift over time: make sure directness stays a request and doesn't become a demand. Tone and flexibility around the ask matters as much as saying it.`,
      '1_2': `${loName} is very direct; ${hiName} leans similarly. Close match. Watch for ${hiName} occasionally holding back something they'd normally say directly. Check in: "anything you've been wanting to bring up?"`,
      '1_3': `${loName} asks directly; ${hiName} is flexible. Small gap. ${hiName} doesn't always have to match ${loName}'s directness — but can practice being a bit more explicit when something is needed.`,
      '1_4': `${loName} asks directly; ${hiName} tends to signal rather than state. A real difference. The shift: ${loName} can ask "what do you need right now?" when something seems off — it gives ${hiName} an opening without them having to initiate the ask.`,
      '1_5': `${loName} states needs directly; ${hiName} signals indirectly. The gap creates the "you should just know" dynamic on one side and "just tell me what you want" frustration on the other. ${loName} can model the direct ask gently — "I'd love X, what about you?" — to show it's safe.`,
      '2_2': `You both lean toward direct communication about needs. Good match. Watch for: when someone is close to asking but holds back because they don't want to seem demanding. Make it explicit that asking directly is always welcome here.`,
      '2_3': `${loName} leans direct; ${hiName} is flexible. Small gap. ${hiName} can be encouraged to name what they want rather than wait. "What would make this easier for you?" creates the opening.`,
      '2_4': `${loName} leans direct; ${hiName} tends to hint. A moderate difference. When ${loName} doesn't catch ${hiName}'s signal, ${hiName} can try: "I was hoping you'd offer to…" — it names the expectation without accusation.`,
      '2_5': `${loName} leans direct; ${hiName} is very indirect. The gap can create frustration on both sides. ${loName} can help by asking specifically — "is there something you need from me today?" — which removes the burden from ${hiName} of deciding whether to ask.`,
      '3_3': `You're both somewhere in the middle — not always direct, not always signaling. Watch for: needs slipping through because neither of you pushed to name them. A weekly "what do you need from me this week?" keeps it simple.`,
      '3_4': `${hiName} tends a bit more indirect than ${loName}. Small gap. ${loName} can reflect back what they observe — "it sounds like you might need X" — rather than waiting. It gives ${hiName} a bridge between signaling and asking.`,
      '3_5': `${loName} is neutral; ${hiName} is quite indirect in how they ask. ${hiName} doesn't have to change their style completely, but practicing one direct ask per week — on something small — makes the indirect signals land better when they matter.`,
      '4_4': `You both tend toward indirect communication around needs. That works when you're well-attuned — but it also means things can go unmet because neither named them. The shift: once a week, name one thing you actually need from each other. Directly.`,
      '4_5': `Both of you lean indirect — ${hiName} more so. You're probably well-matched in not wanting to impose, but that same quality can mean needs go unspoken. Agree on a norm: "I should just tell you" is allowed and encouraged.`,
      '5_5': `You both tend to signal needs rather than state them. The relationship carries real goodwill — you're both trying not to burden each other. The cost is that needs can quietly go unmet. Build a weekly "what do you need?" into your rhythm. It removes the weight from the ask.`,
    },

    // ── RESPONDING TO BIDS (A=Reserved, B=Attuned) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    bids: {
      '1_1': `You're both on the reserved end — fewer bids, quieter reaching. The relationship is probably stable but low-key. The shift: increase bid volume deliberately. Share a thought, ask a small question, notice something out loud. Connection is built in those tiny moments more than the big ones.`,
      '1_2': `${loName} is very reserved; ${hiName} is a bit more present. Close match, but the bid volume between you is probably low. Worth deliberately creating more moments — share more small things, even when they feel insignificant.`,
      '1_3': `${loName} is reserved; ${hiName} is in the middle. ${hiName} can start noticing and naming when ${loName} makes a small bid — "you seemed like you wanted to say something earlier" — making it easier for ${loName} to reach again.`,
      '1_4': `${loName} tends quiet in reaching for connection; ${hiName} is more responsive and attuned. The shift: ${loName} can practice making the smallest version of a bid — sending a link, sharing an observation — without expecting more than a nod.`,
      '1_5': `${loName} rarely bids for connection; ${hiName} is very attuned and responsive. A real gap. The shift: ${loName} can start with the simplest thing — showing ${hiName} something, sharing a minor thought. Bids don't need to be meaningful to matter.`,
      '2_2': `You both lean quieter in how you reach for each other. Warm but not loudly expressive. Agree to initiate at least one small connection moment per day — a specific question, a brief check-in. Habitual, not just spontaneous.`,
      '2_3': `${loName} leans reserved; ${hiName} is flexible. ${hiName} can make it easier to respond to ${loName}'s bids by acknowledging them explicitly — "you mentioned X earlier — tell me more" — signals that ${loName}'s reaching is always welcome.`,
      '2_4': `${loName} tends quieter; ${hiName} is more attuned to small moments. Moderate gap. ${loName} can become more aware of what ${hiName} does to reach for connection — and make a deliberate effort to turn toward it, even when it's a small thing.`,
      '2_5': `${loName} leans reserved; ${hiName} is highly responsive. ${hiName} may feel like they're always the one reaching. The shift: ${loName} can pick one type of bid and practice it consistently — asking about ${hiName}'s day, noticing something they did. It doesn't have to be grand.`,
      '3_3': `You're both somewhere in the middle. Workable, but "somewhere in the middle" can mean neither reaches reliably. Build in deliberate connection moments rather than leaving it to feel.`,
      '3_4': `${hiName} is more tuned to small moments than ${loName}. Small gap. ${loName} can practice responding explicitly when ${hiName} bids — even a "I noticed that" — makes ${hiName} feel seen.`,
      '3_5': `${loName} is neutral; ${hiName} is very attuned and responsive. ${hiName} genuinely values these small moments, and ${loName} can create more of them even when they'd otherwise not think about it. Low effort, high return.`,
      '4_4': `You're both fairly responsive to each other. That builds a warm, attentive dynamic. Watch for: when one of you is distracted or checked out, the other can feel it acutely. Agree to name it: "I feel like I haven't had your attention today."`,
      '4_5': `Both of you lean toward presence and responsiveness — ${hiName} slightly more. Good match. When ${loName} is genuinely depleted and doesn't feel like connecting, build in an easy signal: "I need 20 minutes" — not rejection, just recharge.`,
      '5_5': `You're both highly attuned and responsive. The relationship probably feels warm and connected. Watch for: because both of you reach for connection readily, check in about whether the volume feels right. Too many bids can occasionally feel like pressure rather than warmth.`,
    },

    // ── CONFLICT STYLE (A=Engage, B=Withdraw) ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    conflict: {
      '1_1': `You both move toward resolution quickly. That keeps things from festering — but when both of you are ready to engage before one has fully settled, words can come out sharper than intended. A short pause — even 10 minutes — can change the tone without losing momentum.`,
      '1_2': `${loName} addresses things quickly; ${hiName} leans similar. Close match. Watch for: moving so fast toward resolution that one of you doesn't fully share what happened before you're onto "what do we do." Make space for "here's what I felt" before jumping to fix it.`,
      '1_3': `${loName} moves toward resolution quickly; ${hiName} is flexible. Small gap. ${hiName} can signal when they're ready — it helps ${loName} not feel like they're carrying the weight of bringing things up.`,
      '1_4': `${loName} addresses things quickly; ${hiName} tends to need more time. A real tension point. Agree in advance that when ${hiName} asks for time, ${loName} can ask for a return window: "when should we come back to this?" — turns space into a plan.`,
      '1_5': `${loName} wants to resolve things quickly; ${hiName} needs significant space first. One of the most common conflict mismatches. Name the pattern in a calm moment. Agree: ${hiName} commits to a specific return time, and ${loName} trusts that as a promise, not avoidance.`,
      '2_2': `You both lean toward addressing things sooner rather than later. That keeps the relationship clear. Watch for: moving quickly into the conversation before one of you is actually ready. "Ready to talk" doesn't mean "ready to resolve" — it's okay to share and still feel unsettled.`,
      '2_3': `${loName} leans toward quicker resolution; ${hiName} is flexible. Small gap. ${hiName} can signal readiness — it helps ${loName} not always be the one initiating.`,
      '2_4': `${loName} leans toward resolving; ${hiName} leans toward needing space. Moderate difference. ${loName} can make it easier for ${hiName} to come back — "I'm not going anywhere, let me know when you're ready" — removes the urgency that makes space harder to take.`,
      '2_5': `${loName} tends toward resolution; ${hiName} needs significant time. The shift: ${hiName} commits to a specific return time when asking for space. That gives ${loName} something to hold, and prevents open-ended silence from feeling like withdrawal.`,
      '3_3': `You're both flexible on timing. That's adaptive. Watch for: neither of you pushing to address something that should be addressed. Make it easy for either person to say "I'm ready to talk about that thing from earlier" — the opening shouldn't always come from the same person.`,
      '3_4': `${hiName} needs a bit more time than ${loName} does. Small gap. ${loName} can signal readiness without pushing — "whenever you're ready, I'm here" — rather than waiting in silence or asking repeatedly.`,
      '3_5': `${loName} is neutral; ${hiName} strongly needs space before engaging. The shift: ${hiName} can share why time matters — often it's about saying things more accurately, not avoiding the conversation. That reframe helps ${loName} understand the delay isn't rejection.`,
      '4_4': `You both tend to need some time before resolving. A compatible match. The watch-out: "some space" can quietly stretch into avoidance when both people are comfortable waiting. Set a norm — things get addressed within 24 hours unless explicitly deferred to a specific time.`,
      '4_5': `Both of you lean toward needing space — ${hiName} more significantly. Close match in pacing. The thing to name: when both of you are holding space, who comes back first? Agree on a signal or a window so it doesn't drift into distance.`,
      '5_5': `You both need significant space before conflict is possible. That prevents saying things you don't mean — but also means things can sit for too long. Agree to a timeout protocol with a return time. "I need a couple hours — let's come back at 8pm" is not avoidance. Open-ended silence is.`,
    },

    // ── HOW YOU REPAIR (A=Formal, B=Informal) ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    repair: {
      '1_1': `You both tend toward more formal, deliberate repair. The aftermath can feel long. The shift: agree on a small signal that says "I'm not fully okay yet, but we're okay" — separate from full resolution. It prevents the silence from reading as something worse.`,
      '1_2': `${loName} takes longer to recover; ${hiName} leans similar. Close match. Name what "repaired" actually means to each of you — if you don't share that definition, one person can feel resolved before the other is ready.`,
      '1_3': `${loName} recovers slowly; ${hiName} is flexible. ${hiName} can check in without forcing — "I feel okay, how are you feeling?" — gives ${loName} a chance to name where they are without pressure to match.`,
      '1_4': `${loName} takes longer to recover; ${hiName} bounces back sooner. A real difference. When ${hiName} is ready to move forward, ask rather than assume — "are we good, or do you need more time?" — instead of acting normal and leaving ${loName} feeling unseen.`,
      '1_5': `${loName} takes significantly longer to recover; ${hiName} moves on quickly. A meaningful gap. Agree: ${hiName} moving on first doesn't mean it's resolved. ${loName} can name a window — "I'll be ready to put this behind me by tomorrow morning" — gives both something to work with.`,
      '2_2': `You both tend to take a bit of time recovering. Neither of you will push the other to perform "fine" before they are. Watch for: slow repair slipping into distance. Make sure "I need time" doesn't become indefinite.`,
      '2_3': `${loName} leans toward slower recovery; ${hiName} is flexible. ${hiName} can signal when they're ready — "I'm feeling good about where we are" — without demanding ${loName} match it. Gives ${loName} information without pressure.`,
      '2_4': `${loName} tends slower; ${hiName} tends to recover more quickly. Moderate difference. Try a check-in 24 hours after conflict — "are we good?" — low pressure, high information.`,
      '2_5': `${loName} tends toward slower repair; ${hiName} moves on quickly. ${hiName} can say "I'm okay — take whatever time you need" without expecting ${loName} to match the pace. That removes the silent pressure to perform recovery.`,
      '3_3': `You're both somewhere in the middle. Watch for: neither of you having a strong pull to check in, which can leave repair feeling incomplete. A "are we actually good?" the day after a hard moment helps.`,
      '3_4': `${hiName} tends to move through repair faster than ${loName}. Small gap. ${loName} can communicate where they are without oversharing — "I'm still sitting with it a little, but we're okay" — so ${hiName} doesn't have to guess.`,
      '3_5': `${loName} is flexible; ${hiName} moves on very quickly. ${hiName}'s quick return to normal doesn't always mean ${loName} is there yet. Check in, don't assume.`,
      '4_4': `You both tend to move through repair at a similar pace. Strong match. Watch for: assuming repair is complete when it's just quiet. A brief "I felt good about how we handled that" keeps repair explicit.`,
      '4_5': `Both of you lean toward quicker repair — ${hiName} more so. You're unlikely to carry conflict for long. When both of you move on fast, make sure you're both actually good — a check-in a day later can catch what quiet quick repair sometimes misses.`,
      '5_5': `You both repair quickly and informally. The relationship is probably resilient. Watch for: moving on so fast that something occasionally gets left slightly unresolved. "That felt resolved to me — how about you?" is worth asking sometimes.`,
    },

    // ── CLOSENESS & INDEPENDENCE (A=Autonomous, B=Enmeshed) ─────────────────────────────────────────────────────────────────────────────────────────────────────────
    closeness: {
      '1_1': `You both value strong independence within the relationship. The risk is connection getting deprioritized without either of you flagging it. Schedule togetherness the way you protect solo time — it won't happen on its own when both people are comfortable apart.`,
      '1_2': `${loName} strongly values independence; ${hiName} leans similar. Close match. Just make sure the ease of being separate doesn't quietly turn into less closeness than you actually want. One shared ritual holds the thread.`,
      '1_3': `${loName} values autonomy strongly; ${hiName} is flexible. Make sure ${hiName}'s flexibility doesn't always defer to ${loName}'s preference for more space. Check in occasionally: "what do you actually want tonight?"`,
      '1_4': `${loName} values independence; ${hiName} leans toward closeness. A real daily-life difference. When ${loName} needs space, name it as a preference — not a rejection. That changes how ${hiName} receives it.`,
      '1_5': `${loName} values strong independence; ${hiName} strongly needs closeness. A significant gap. Design your week intentionally: some time is explicitly together, some is explicitly separate. Both named in advance, neither assumed.`,
      '2_2': `You both lean toward valuing your own space. Good match. Watch for: both of you being comfortable with distance making reconnection feel less urgent than it should. Put togetherness on the calendar the way you'd protect anything else that matters.`,
      '2_3': `${loName} leans toward independence; ${hiName} is neutral. Ask ${hiName} what they actually want — neutral doesn't mean indifferent. Do they want more closeness? They may not say unless asked directly.`,
      '2_4': `${loName} leans toward autonomy; ${hiName} leans toward closeness. Moderate daily-life difference. Agree on two or three things that are always "together" and leave everything else flexible. Gives ${hiName} certainty without crowding ${loName}.`,
      '2_5': `${loName} values independence; ${hiName} wants significant closeness. A meaningful gap. Design an explicit rhythm together — not as a compromise, but as a plan. Removes the daily negotiation.`,
      '3_3': `You're both in the middle — not strongly independent, not strongly togetherness-oriented. That's flexible, but it means connection can get left to chance. Make a habit of it — one consistent shared thing — rather than leaving it to circumstance.`,
      '3_4': `${hiName} leans more toward closeness than ${loName}. Small gap. ${loName} can initiate connection sometimes rather than waiting for ${hiName} to reach. It changes the dynamic when both people create the space.`,
      '3_5': `${loName} is neutral; ${hiName} genuinely needs closeness. ${hiName}'s need for connection isn't neediness — it's a real preference. ${loName} can build in deliberate connection moments even when they'd otherwise be fine either way.`,
      '4_4': `You both lean toward closeness. Warm match. Give each other permission to want a quiet night sometimes — "I need a solo evening" should never feel like a confession.`,
      '4_5': `Both of you lean toward togetherness — ${hiName} more strongly. Close match. When one of you is low and doesn't have energy for connection, build in an easy way to signal it: "I'm tired tonight but I'm still yours."`,
      '5_5': `You both strongly value closeness and togetherness. Beautiful match. The one thing to protect: make sure it doesn't crowd out individual identity. Separate friendships, interests, and time — even within a strong preference for togetherness — keeps the relationship healthy long-term.`,
    },

    // ── HOW LOVE LANDS (A=Words, B=Actions) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    love: {
      '1_1': `You both feel most loved through words — sincere and specific. You can speak the same language here. The shift: keep it specific over time. "I love you" becomes ambient; "I noticed what you did yesterday and it meant a lot" stays alive.`,
      '1_2': `${loName} connects most through words; ${hiName} leans similar. Close match. When life gets busy and verbal expression drops off, both of you may start feeling less loved without knowing why. A short specific acknowledgment every few days costs almost nothing.`,
      '1_3': `${loName} feels love through words; ${hiName} is flexible. The shift: ${hiName} can default slightly more toward verbal expression when uncertain. It's low-cost and high-return for a words-oriented partner.`,
      '1_4': `${loName} connects through words; ${hiName} expresses love primarily through actions. A real difference. ${loName} can start noticing ${hiName}'s acts as the expressions of care they are. ${hiName} can add the occasional specific word — even "I'm glad you're mine" lands.`,
      '1_5': `${loName} feels love through words; ${hiName} through acts and presence. The shift: each person learns to express in the other's language, not just receive in their own. ${loName} does something. ${hiName} says something sincere.`,
      '2_2': `You both lean toward words as the primary love language. A close match. Keep the words specific over time — "I appreciate you" lands less than "I noticed how you handled that today." Specificity is what keeps verbal expression feeling real.`,
      '2_3': `${loName} leans toward words; ${hiName} is flexible. ${hiName} doesn't need to choose a lane — but paying attention to when verbal appreciation lands well for ${loName} and doing more of it deliberately matters.`,
      '2_4': `${loName} leans toward words; ${hiName} leans toward acts. Moderate difference. Spend a week noticing each other's expressions in the other's language. ${loName} tracks what ${hiName} does; ${hiName} pays attention to what ${loName} says. Noticing shifts reception.`,
      '2_5': `${loName} leans verbal; ${hiName} strongly shows love through acts. A meaningful gap. Neither is wrong — but each needs to learn to feel the other's expressions as love. ${loName} can verbalize what ${hiName} does; ${hiName} can act on what ${loName} says.`,
      '3_3': `You're both genuinely receptive to both words and acts. Flexible. Watch for: when neither of you has a strong pull, love expression can get inconsistent. Build in deliberate moments rather than leaving it to spontaneity.`,
      '3_4': `${hiName} leans more toward actions and presence. Small gap. When ${hiName} does something, ${loName} can notice and name it — "thank you for that" — rather than letting the act disappear unacknowledged.`,
      '3_5': `${loName} is neutral; ${hiName} feels love primarily through acts and presence. For ${hiName}, showing up and doing things is the language of care. ${loName} can practice acts of service — planning something, making something easier — even when verbal expression would feel more natural.`,
      '4_4': `You both lean toward acts and presence as expressions of care. A close match. Neither of you may say what you feel in words very often — which means the verbal thread can fade. Naming what you appreciate explicitly, occasionally, holds the relationship in the light.`,
      '4_5': `Both of you lean toward acts — ${hiName} more strongly. Good match. When both of you are very busy and the acts start slipping, neither may say anything — and the connection can fade quietly. Name when you notice it dropping.`,
      '5_5': `You both feel most loved through presence and acts of care. Strong match. Because neither of you relies heavily on words, make sure feelings get named occasionally. Even once a week, saying something sincere out loud keeps the emotional connection explicit.`,
    },

    // ── COMMUNICATION UNDER STRESS (A=Withdraw, B=Seek) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
    stress: {
      '1_1': `You both tend to internalize stress — carry it quietly, process alone. You won't dump on each other unintentionally. The risk: both of you can quietly go under without the other noticing. Build a habit of checking in directly — "you seem off, what's going on?" — rather than waiting for signals.`,
      '1_2': `${loName} internalizes significantly; ${hiName} leans similar. Close match. When both of you are carrying things quietly, the relationship can feel more distant than intended. A regular "how are you really?" catches it early.`,
      '1_3': `${loName} goes very internal under stress; ${hiName} is flexible. ${hiName} can offer an opening regularly — "I can tell you're carrying something, you don't have to talk about it, but I'm here" — removes the burden from ${loName} of deciding whether to share.`,
      '1_4': `${loName} internalizes; ${hiName} leans toward externalizing when stressed. A real difference. Agree: ${loName} going quiet doesn't mean something is wrong between you. Name the pattern so ${hiName} doesn't fill the silence with their own interpretation.`,
      '1_5': `${loName} carries stress privately; ${hiName} processes it externally and visibly. A significant difference. ${hiName} can say "I'm stressed, it's not about you" when venting — and ${loName} can say "I'm processing something, I'll bring you in when I have words." Removes ambiguity for both.`,
      '2_2': `You both lean toward internalizing. That's a stable but potentially blind pairing — you may not notice each other under pressure. Build a norm: when stress is high for either person, name it. "I'm having a hard week" doesn't require a solution, just acknowledgment.`,
      '2_3': `${loName} leans internal; ${hiName} is flexible. ${hiName} can lean toward more open expression when ${loName} seems to be carrying something — modeling it makes it easier for ${loName} to share without having to initiate.`,
      '2_4': `${loName} tends inward; ${hiName} tends to show stress more externally. Moderate gap. When ${hiName} is stressed, ${loName} can respond with presence rather than problem-solving. What ${hiName} usually needs is someone listening, not someone fixing.`,
      '2_5': `${loName} tends to carry stress quietly; ${hiName} processes it expressively. A meaningful gap. Agree: ${hiName}'s visible stress is them processing, not a problem to fix — and ${loName}'s quiet is them coping, not withdrawal. Name this before a high-pressure moment, not during one.`,
      '3_3': `You're both somewhere in the middle. Watch for: neither of you reliably signaling when you're under pressure, which can lead to both carrying more than you need to. A weekly "how's your load right now?" helps.`,
      '3_4': `${hiName} leans a bit more toward externalizing stress. Small gap. When ${hiName} is stressed, they often show it — which gives ${loName} information. ${loName} can learn to respond with presence rather than immediately trying to solve it.`,
      '3_5': `${loName} is neutral; ${hiName} processes stress externally. ${hiName}'s venting is a form of processing, not a request for solutions. When ${hiName} is stressed, listening without offering fixes is usually the most useful response.`,
      '4_4': `You both tend to show stress externally when you're under pressure. The relationship probably doesn't carry a lot of hidden load. Watch for: when both of you are externally stressed at once, the home can feel tense. Agree to name it: "we're both having a hard week — let's not take it out on each other."`,
      '4_5': `Both of you lean toward externalizing stress — ${hiName} more so. Close match. When ${hiName}'s stress is high, ${loName} can name it and offer something specific — "what would actually help right now?" — rather than defaulting to unsolicited advice.`,
      '5_5': `You both externalize stress visibly and expressively. The relationship probably doesn't hide much. The shift: when both of you are stressed at the same time, the combined energy can amplify. Practice naming it in the moment: "I think we're both running hot — can we take a minute?"`,
    },

    // ── GIVING & RECEIVING FEEDBACK (A=Guarded, B=Open) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
    feedback: {
      '1_1': `You're both guarded around feedback — which means you're unlikely to criticize each other harshly, but you may also not hear important things. Create a norm for low-stakes feedback that makes it feel less loaded. "Can I mention something?" removes the surprise before it starts.`,
      '1_2': `${loName} is very guarded around feedback; ${hiName} leans similar, slightly more open. A close match. Both of you being cautious means important things can go unnamed. Build a "low-stakes feedback" norm — short, specific, non-critical — so it doesn't feel like a big event every time.`,
      '1_3': `${loName} is guarded; ${hiName} is flexible. When ${hiName} wants to raise something, framing it as an observation helps ${loName} receive it — "I noticed X" lands better than "you did X."`,
      '1_4': `${loName} is guarded; ${hiName} is more open to giving and receiving feedback. A real difference. ${hiName} can give feedback in very small doses — one thing at a time, specifically framed — and wait. ${loName} will need time, not more information.`,
      '1_5': `${loName} is very guarded; ${hiName} is very open with feedback. A significant difference. ${hiName} can create safety by asking how ${loName} prefers to receive feedback — timing, tone, framing. People who are guarded usually have a reason; understanding it unlocks the conversation.`,
      '2_2': `You both lean a bit guarded. That means the relationship stays relatively conflict-free — but things that should be named sometimes don't get named. Practice low-stakes feedback on small things so that raising something doesn't always feel like a production.`,
      '2_3': `${loName} leans guarded; ${hiName} is flexible. ${hiName} can be explicit about intent — "I want to mention something, and it's not a big deal" — which removes the anticipatory dread ${loName} may feel when feedback is incoming.`,
      '2_4': `${loName} leans guarded; ${hiName} leans more open. Moderate difference. ${hiName} can work on timing — feedback lands better when the temperature is low. Ask if it's a good time before starting.`,
      '2_5': `${loName} leans guarded; ${hiName} is very comfortable with direct feedback. A meaningful gap. ${hiName} needs to slow down delivery — one thing, specific, followed by silence. Not a list, not a conversation. ${loName} needs time to sit with it.`,
      '3_3': `You're both in the middle. Watch for: feedback needing to happen but neither person reaching for it. A norm: one thing each month that each person wants to mention, raised gently. Small volume, regular cadence.`,
      '3_4': `${hiName} is a bit more open to feedback. Small gap. ${loName} can practice receiving ${hiName}'s feedback without responding immediately — "thanks for saying that, let me think about it" is a complete response.`,
      '3_5': `${loName} is neutral; ${hiName} is very open to feedback. ${loName} can communicate what format works best — "I'd rather you bring it up in the moment" or the opposite. Giving ${hiName} the protocol makes it easier.`,
      '4_4': `You're both fairly open to feedback. A healthy dynamic — you can raise things without it being a production. Watch for: the openness being one-directional. Make sure both of you feel equally safe to bring something up, not just receive it.`,
      '4_5': `Both of you lean open — ${hiName} more so. Good match. Watch for: ${hiName}'s comfort with feedback occasionally meaning ${loName} hears more than expected. A norm around frequency and timing keeps feedback constructive rather than relentless.`,
      '5_5': `You're both very open to feedback — you can raise things and take them in without much defensiveness. Rare and genuinely valuable. The one thing to stay aware of: openness can occasionally tip into over-analyzing the relationship. Not everything needs to be examined.`,
    },
  };

  if (!SHIFTS[dim]) return null;
  const fn = SHIFTS[dim][key];
  return fn !== undefined ? fn : null;
}



// ── EXPECTATIONS CATEGORY CONVO STARTERS (by couple type) ────────────────────
// One conversation starter / "what to keep in mind" per category per couple type.
// 10 types × 5 categories = 50 unique prompts.
const EXP_CAT_STARTERS = {
  household: {
    WW: "You're both expressive and emotionally present — but domestic logistics tend to go unspoken even in open couples. Name who's doing what explicitly, because your ability to talk about feelings doesn't automatically extend to who's vacuuming.",
    XX: "You both process privately and get things done. The risk is that one person quietly takes on more without raising it. Agree on who handles what — and build a regular check-in so that quiet resentment doesn't build under the efficiency.",
    YY: "You're both attuned and feeling-forward. Domestic friction can land harder than expected when neither of you wants to seem petty for raising it. Name the logistics early — it's not unromantic to decide who buys groceries.",
    ZZ: "You're both internal processors — which means domestic imbalances can simmer quietly for a long time before either of you names them. Schedule a review of who's carrying what every few months. Domestic load is exactly the kind of thing that drifts without conversation.",
    WX: "One of you brings things to the surface quickly; the other processes before speaking. Make sure household logistics get talked about at a set time rather than only when someone reaches a tipping point.",
    WY: "One of you addresses things quickly; the other needs time first. Household friction rarely feels urgent enough to raise — until it is. Set a regular rhythm for reviewing who's doing what, so it doesn't only get named when someone is already frustrated.",
    WZ: "One of you reaches out when something needs addressing; the other holds things close. Domestic imbalances tend to accumulate silently in couples like yours. Build a habit of naming household roles explicitly rather than letting them form by default.",
    XY: "One of you wants to solve quickly; the other needs space first. Household logistics decisions can stall if one person isn't ready and the other is impatient. Pick a weekly moment — 15 minutes — to review and decide together.",
    XZ: "You both tend to hold things internally. Domestic resentment is particularly likely to stay quiet in a pairing like yours — until it isn't. Make a habit of naming the load each person is carrying, not just when something breaks.",
    YZ: "You both need space before engaging with conflict. Household imbalances are easy to defer. Make a habit of reviewing roles at a set time so the conversation doesn't require someone to work up to it.",
  },
  financial: {
    WW: "You're both expressive and emotionally open — which can actually make financial conversations easier to start, but harder to finish. Be careful that talking about money doesn't become a substitute for making actual decisions about it.",
    XX: "You both tend to process privately and move efficiently. Financial decisions are one area where that efficiency can skip important alignment. Slow down enough to make sure both of you actually agree, not just that both of you accept.",
    YY: "You're both feeling-forward — financial conversations can carry emotional weight that makes them harder to start. Know that it's okay for this to be uncomfortable. The discomfort doesn't mean you're financially incompatible.",
    ZZ: "You both tend to carry things quietly. Financial misalignments in a pairing like yours can go unnamed for a long time. Set a quarterly money conversation — not to review budgets, but to check: are we still aligned on what money is for?",
    WX: "One of you surfaces things quickly; the other needs time. Financial decisions benefit from the person who needs more time actually getting it — not just conceding. Make sure financial conversations include a built-in pause for reflection before deciding.",
    WY: "You have different engagement clocks. Financial conversations should happen when both of you are actually ready — not when one person pushes and the other complies. Pick a time for it when neither of you is stressed.",
    WZ: "One of you names things openly; the other holds them close. Financial alignment is hard if one person is doing all the raising. Build an expectation that both people bring concerns — not just one.",
    XY: "One of you wants to resolve quickly; the other needs time. Financial decisions made under time pressure rarely hold. Make sure the person who needs space gets it — even if it delays the decision.",
    XZ: "You're both private processors. Financial transparency requires deliberate effort in a pairing like yours — not because you're secretive, but because neither of you naturally pushes the other to open up. Schedule it.",
    YZ: "You both need space before engaging. Money conversations can easily get deferred indefinitely. Set a regular, calm moment for financial check-ins — not after a tension-filled moment, but on a neutral calendar day.",
  },
  career: {
    WW: "You're both expressive and tend to process out loud. Career conversations can become long, emotionally complex exchanges. It's fine to talk — but make sure the talking leads somewhere. End career conversations with an actual decision or next step.",
    XX: "You both tend to process internally. Career trade-offs can stay entirely invisible between two private people. Make time to say out loud: whose career is setting the pace right now? Is that working for both of you?",
    YY: "You're both emotionally attuned. Career sacrifice is one of the harder things to name when you don't want to seem demanding. Know that naming it is an act of care, not selfishness — the person carrying more deserves to have it acknowledged.",
    ZZ: "You're both quiet processors. Career imbalances in couples like yours can go entirely unspoken until they've built significant resentment. Check in explicitly about whose career is getting prioritized — and whether that feels fair to both.",
    WX: "One of you raises things quickly; the other processes first. Career decisions with long-term implications need both of you fully present. Don't let the faster processor set the pace before the other has had time to think.",
    WY: "You have different timelines for readiness. Career decisions — especially big ones — should wait until both of you are genuinely ready to decide, not just willing to stop discussing.",
    WZ: "One of you speaks up when something needs to be named; the other tends to hold it. Career concerns are exactly the kind of thing the quieter partner may be carrying without raising. Build an expectation that career check-ins happen on both sides.",
    XY: "One of you wants to decide quickly; the other needs time. Career decisions are rarely truly urgent — give the person who processes slower the time they need. A decision made under pressure tends to not hold.",
    XZ: "You're both private. Career conversations require deliberate effort in a pairing like yours because neither of you will naturally push the topic. Build in a regular 'where are we on career stuff?' — once a quarter is enough.",
    YZ: "You both need space to process. Career conversations that need to happen can be deferred indefinitely when both people are comfortable waiting. Set a specific time for them — not just 'soon.'",
  },
  emotional: {
    WW: "You're both emotionally expressive and attuned — which means invisible labor is actually more visible in your relationship than most. The risk is that naming it starts to feel like scorekeeping. Frame it as awareness, not accounting.",
    XX: "You both tend toward efficiency and private processing. Emotional labor in a pairing like yours can go entirely unremarked — not because it's not happening, but because neither of you points to it. Name it. The person carrying more needs it acknowledged.",
    YY: "You're both deeply feeling and emotionally present. The invisible labor in your relationship is probably significant on both sides. The work is not just carrying the emotional load — it's making sure the other person sees it too.",
    ZZ: "You're both quiet carriers. Emotional labor is probably distributed in your relationship in ways that neither of you has fully mapped. It can accumulate invisibly. Make a habit of asking: 'what are you managing right now that I might not know about?'",
    WX: "One of you names things directly; the other holds them. Emotional labor that goes unspoken is still labor. The quieter partner may be carrying more than they say. Build a norm where both of you name what you're managing.",
    WY: "You have different timelines. Emotional labor conversations can feel premature for one partner and overdue for the other. Pick a neutral time — not when one person is already drained — to check in about what each of you is carrying.",
    WZ: "One of you speaks up; the other tends to hold things close. Emotional labor is exactly the kind of thing that the more private partner absorbs silently. Build an expectation that both people name what they're tracking and carrying.",
    XY: "One of you wants to resolve quickly; the other needs time. Emotional labor conversations can feel charged. Don't rush the one who needs space — the conversation is more useful when both of you are actually present.",
    XZ: "You're both private processors. Emotional labor is particularly invisible in pairings like yours — it's being done, often a lot of it, by one or both of you, without being named. Make it a practice to name it, even briefly.",
    YZ: "You both need space to engage. Emotional labor conversations can be repeatedly deferred in a pairing like yours. Set a recurring, calm check-in — not a big conversation, just a brief: 'what are you carrying right now?'",
  },
  life: {
    WW: "You're both expressive and emotionally present. Life and values conversations can feel natural — but they can also go long without reaching resolution. For big questions, agree in advance that you'll end with each person's actual current position, even if it's unresolved.",
    XX: "You both tend to process privately. You may each have more formed views on life and values questions than the other knows about. Make space to share not just your position, but the reasoning underneath it — it changes the conversation.",
    YY: "You're both emotionally attuned and values-driven. Life and values disagreements can carry real weight. Know that diverging on some of these questions is normal — and not a sign you're wrong for each other. What matters is how you hold the difference.",
    ZZ: "You're both private processors. Big-picture questions about life and values can stay entirely internalized in a pairing like yours. Make a deliberate practice of sharing your current thinking on these topics — not to resolve them, but to stay current with each other.",
    WX: "One of you surfaces things readily; the other processes first. Life and values conversations benefit from both people having time to think before sharing. Don't let the faster processor carry more of the conversation than the other person is ready for.",
    WY: "You have different timelines for readiness. Life questions — children, location, faith — shouldn't be decided when one person isn't fully ready to engage. Wait for both.",
    WZ: "One of you speaks up; the other holds things close. Life and values conversations require both people to actually share their real positions — not just the safe ones. Build an expectation that both of you bring your actual views.",
    XY: "One of you wants to decide; the other needs time. For life questions with real implications, the person who processes more slowly needs time — even if it delays the decision. A premature decision on big things tends to create pressure later.",
    XZ: "You're both private. Life and values alignment can be assumed rather than actively explored in pairings like yours. Don't let the stability of your relationship mean you stop checking in on where each of you is with the big questions.",
    YZ: "You both need space before engaging. Life and values conversations can be deferred indefinitely when both of you are comfortable waiting. Set a specific, recurring time to revisit where you each are — not when something forces the conversation.",
  },
};


// ── EXPECTATIONS EXERCISE DATA CONSTANTS ────────────────────────────────────

const CHILDHOOD_STRUCTURES = [
  { id: "mom-dad",      label: "Mom and Dad (married or together)" },
  { id: "single-mom",  label: "Primarily raised by Mom" },
  { id: "single-dad",  label: "Primarily raised by Dad" },
  { id: "two-moms",    label: "Two Moms" },
  { id: "two-dads",    label: "Two Dads" },
  { id: "grandparents",label: "Grandparents or extended family" },
  { id: "split",       label: "Split between two households" },
  { id: "other",       label: "Another arrangement" },
];

const RESPONSIBILITY_CATEGORIES = [
  {
    id: "household", label: "Household",
    items: [
      "Cooking meals",
      "Grocery shopping and meal planning",
      "Keeping the home tidy day-to-day",
      "Managing home repairs and maintenance",
      "Managing the family calendar",
      "Planning and organizing social events, holidays, and gatherings",
      "Planning and booking vacations",
    ],
  },
  {
    id: "financial", label: "Financial",
    items: [
      "Paying bills and managing day-to-day finances",
      "Making major financial decisions",
      "Managing savings and investments",
      "Filing taxes",
    ],
  },
  {
    id: "career", label: "Career & Work",
    items: [
      "Being the primary income earner",
      "Whose career shapes major family decisions, where you live, your schedule, your lifestyle",
      "Who makes career sacrifices when the family needs it",
    ],
  },
  {
    id: "emotional", label: "Emotional Labor",
    items: [
      "Carrying the mental load, remembering, anticipating, planning ahead",
      "Tracking the emotional wellbeing of the household",
      "Maintaining closeness and emotional intimacy over time",
      "Initiating difficult conversations",
      "Being the first to reach out after conflict",
      "Maintaining relationships with extended family and in-laws",
    ],
  },
];

// FIXED_CATS is the same structure — used for sidebar navigation in results
const LIFE_QUESTIONS = [
  { id: "lq_children",     category: "Family", text: "Children" },
  { id: "lq_parents",      category: "Family", text: "Aging parents and family obligations" },
  { id: "lq_family_conf",  category: "Family", text: "When family and partner conflict" },
  { id: "lq_location",     category: "Lifestyle", text: "Where we live" },
  { id: "lq_social",       category: "Lifestyle", text: "Social life and friendships" },
  { id: "lq_routine",      category: "Lifestyle", text: "Day-to-day rhythms and routines" },
  { id: "lq_faith",        category: "Values", text: "Faith and spirituality" },
  { id: "lq_values",       category: "Values", text: "Core values and beliefs" },
  { id: "lq_finances",     category: "Money", text: "How we manage money" },
  { id: "lq_money_lean",   category: "Money", text: "Saving vs. spending orientation" },
  { id: "lq_money_risk",   category: "Money", text: "Financial risk tolerance" },
  { id: "lq_conflict_when",  category: "Conflict", text: "When to address conflict" },
  { id: "lq_conflict_after", category: "Conflict", text: "How long conflict resolution takes" },
  { id: "lq_conflict_repair",category: "Conflict", text: "What repair looks like" },
  { id: "lq_affection",    category: "Connection", text: "Physical affection and touch" },
  { id: "lq_closeness",    category: "Connection", text: "Closeness during hard times" },
  { id: "lq_independence", category: "Connection", text: "Individual independence" },
];


// FIXED_CATS: the 5 display categories for Expectations results
// (includes Life & Values as a 5th category wrapping the life questions)
const FIXED_CATS = [
  ...RESPONSIBILITY_CATEGORIES,
  {
    id: "life",
    label: "Life & Values",
    items: LIFE_QUESTIONS.map(q => q.text),
    color: "#9B5DE5",
  },
];

// Revisited version (same questions — could be extended later)
const LIFE_QUESTIONS_REVISITED = LIFE_QUESTIONS;

// Anniversary version — same core questions for returning couples
const LIFE_QUESTIONS_ANNIVERSARY = LIFE_QUESTIONS;


// ── DIMENSION SCORING ────────────────────────────────────────────────────────
// Maps ex1Answers (keys like en1..en5, cf1..cf5, etc.) to named average scores.
// Each dimension has 5 questions scored 1–5; average gives a 1–5 scale per dim.
function calcDimScores(answers) {
  if (!answers) return {};
  const avg = (...keys) => {
    const vals = keys.map(k => answers[k]).filter(v => v != null && !isNaN(v));
    return vals.length ? vals.reduce((s, v) => s + Number(v), 0) / vals.length : 3;
  };
  return {
    energy:     avg('en1','en2','en3','en4','en5'),
    expression: avg('ex1','ex2','ex3','ex4','ex5'),
    needs:      avg('nd1','nd2','nd3','nd4','nd5'),
    bids:       avg('bd1','bd2','bd3','bd4','bd5'),
    conflict:   avg('cf1','cf2','cf3','cf4','cf5'),
    repair:     avg('rp1','rp2','rp3','rp4','rp5'),
    closeness:  avg('cl1','cl2','cl3','cl4','cl5'),
    love:       avg('lv1','lv2','lv3','lv4','lv5'),
    stress:     avg('st1','st2','st3','st4','st5'),
    feedback:   avg('fb1','fb2','fb3','fb4','fb5'),
  };
}


// ── PERSONALITY FEEDBACK GENERATOR ──────────────────────────────────────────
// Produces one feedback object per dimension comparing two score objects.
function generatePersonalityFeedback(myS, partS, userName, partnerName) {
  const dims = ["energy","expression","needs","bids","conflict","repair","closeness","love","stress","feedback"];
  return dims.map(dim => {
    const myScore   = myS[dim]   ?? 3;
    const partScore = partS[dim] ?? 3;
    const gap = Math.abs(myScore - partScore);
    const isStrength    = gap <= 0.75;
    const isNote        = gap > 0.75 && gap <= 1.5;
    const isOpportunity = gap > 1.5;
    const meta = DIM_META[dim] || { label: dim, color: "#9B5DE5", ends: ["—","—"] };
    const myEnd   = myScore   < 3 ? (meta.ends?.[0] ?? "one way") : (meta.ends?.[1] ?? "another way");
    const partEnd = partScore < 3 ? (meta.ends?.[0] ?? "one way") : (meta.ends?.[1] ?? "another way");
    const isSame  = myEnd === partEnd;
    return {
      dim,
      gap,
      myScore,
      partScore,
      isStrength,
      isNote,
      isOpportunity,
      strengthText: (isStrength || isNote)
        ? (isSame
          ? `You and ${partnerName} both tend toward the ${myEnd.toLowerCase()} end of ${meta.label.toLowerCase()}.`
          : `Even with slightly different scores, you and ${partnerName} navigate ${meta.label.toLowerCase()} in compatible ways.`)
        : null,
      insightText: isOpportunity
        ? `${userName} tends ${myEnd.toLowerCase()} while ${partnerName} tends ${partEnd.toLowerCase()} on ${meta.label.toLowerCase()}.`
        : isNote
        ? `You're close but not identical here — ${meta.label.toLowerCase()} shows a small but real difference.`
        : null,
      adviceText: (isOpportunity || isNote)
        ? getDimShift(dim, myScore, partScore, userName, partnerName)
        : null,
    };
  });
}

// ── OVERALL PAIRING LABEL ────────────────────────────────────────────────────
function overallPairingLabel(avgGap) {
  if (avgGap <= 0.75) return "Highly aligned";
  if (avgGap <= 1.50) return "Compatible";
  if (avgGap <= 2.25) return "Complementary";
  return "Distinctly different";
}

// ── DERIVE COUPLE TYPE FROM EXERCISE ─────────────────────────────────────────
// Wraps deriveNewCoupleType; alignPct is available for future weighting.
function deriveCoupleTypeFromExercise(myS, partS, alignPct) {
  try { return deriveNewCoupleType(myS, partS); } catch { return null; }
}

// ── COUPLE PORTRAIT RENDERER ─────────────────────────────────────────────────
// Renders a pair of avatar silhouettes. Used in portrait display cards.
function mkCouple(p1, p2, wide, id) {
  if (!p1 && !p2) return null;
  const size = wide ? 36 : 28;
  const grad = "linear-gradient(135deg,#E8673A,#9B5DE5,#1B5FE8)";
  const avatar = (p, label) => (
    <div key={label} style={{ width: size, height: size, borderRadius: "50%",
      background: p?.color || grad, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: size * 0.42, color: "white",
      fontWeight: 700, fontFamily: "'DM Sans',sans-serif", flexShrink: 0 }}>
      {p?.initial || (label === "p1" ? "A" : "B")}
    </div>
  );
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {avatar(p1, "p1")}
      {avatar(p2, "p2")}
    </div>
  );
}


// ── SIDE NAV WRAPPER ─────────────────────────────────────────────────────────
// Wraps results content with a sticky left sidebar showing step navigation.
function WithSideNav({ navItems = [], currentStep, onGo, accent = "#9B5DE5", children }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0, minHeight: "100vh" }}>
      {/* Sidebar */}
      <div className="desktop-sidebar" style={{
        width: 220, flexShrink: 0, position: "sticky", top: 0, height: "100vh",
        overflowY: "auto", background: "white", borderRight: "1px solid #E5E2DC",
        padding: "1.5rem 0", display: "flex", flexDirection: "column", gap: 2,
      }}>
        {navItems.map((item, i) => {
          const active = currentStep === i;
          const done   = currentStep > i;
          return (
            <button key={i} onClick={() => onGo(i)} style={{
              display: "flex", alignItems: "center", gap: "0.6rem",
              padding: "0.55rem 1.1rem", background: active ? (accent + "12") : "transparent",
              border: "none", cursor: "pointer", textAlign: "left", width: "100%",
              borderLeft: active ? ("3px solid " + accent) : "3px solid transparent",
              transition: "all 0.15s",
            }}>
              <span style={{
                width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                background: done ? accent : active ? accent : "#E5E2DC",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.6rem", color: "white", fontWeight: 700,
              }}>
                {done ? "✓" : (i + 1)}
              </span>
              <span style={{
                fontSize: "0.78rem", fontFamily: "'DM Sans', sans-serif",
                color: active ? accent : done ? "#555" : "#999",
                fontWeight: active ? 600 : 400, lineHeight: 1.3,
              }}>
                {item.label || item}
              </span>
            </button>
          );
        })}
      </div>
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}


// ── EXERCISE 01: COMMUNICATION EXERCISE ─────────────────────────────────────
// Shows PERSONALITY_QUESTIONS one at a time. Each question has two poles (a/b).
// User picks from a 5-point scale: 1=strongly a, 3=middle, 5=strongly b.
// On completion, calls onComplete(answers) with full dimension key map.
function Exercise01Flow({ userName, partnerName, onComplete }) {
  const questions = PERSONALITY_QUESTIONS;
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [chosen, setChosen] = useState(null); // current question selection

  const q = questions[idx];
  const total = questions.length;
  const progress = Math.round((idx / total) * 100);

  const pick = (val) => {
    setChosen(val);
  };

  const next = () => {
    if (chosen === null) return;
    const updated = { ...answers, [q.id]: chosen };
    if (idx + 1 < total) {
      setAnswers(updated);
      setChosen(null);
      setIdx(idx + 1);
    } else {
      // Only submit answered keys — calcDimScores handles missing keys gracefully
      // by averaging only what exists (no synthetic 3s that dilute real answers)
      onComplete(updated);
    }
  };

  const back = () => {
    if (idx === 0) return;
    setIdx(idx - 1);
    setChosen(answers[questions[idx - 1].id] ?? null);
    const prev = { ...answers };
    delete prev[q.id];
    setAnswers(prev);
  };

  const SCALE = [
    { val: 1, label: "Strongly A" },
    { val: 2, label: "Mostly A" },
    { val: 3, label: "In the middle" },
    { val: 4, label: "Mostly B" },
    { val: 5, label: "Strongly B" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#FBF8F3", fontFamily: "'DM Sans', sans-serif" }}>
      <link href={FONT_LINK} rel="stylesheet" />
      {/* Progress bar */}
      <div style={{ height: 3, background: "#E5E2DC" }}>
        <div style={{ height: "100%", width: progress + "%", background: "linear-gradient(90deg,#E8673A,#1B5FE8)", transition: "width 0.3s" }} />
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "3rem 1.5rem 6rem" }}>
        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <p style={{ fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#999", fontFamily: "'DM Sans', sans-serif", marginBottom: "0.4rem" }}>
            Question {idx + 1} of {total}
          </p>
          <p style={{ fontSize: "1.25rem", fontWeight: 600, color: "#1C1C1E", fontFamily: "'Playfair Display', serif", lineHeight: 1.4, margin: 0 }}>
            {q.text}
          </p>
        </div>

        {/* Two poles */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
          {[{ label: "A", text: q.a, side: "left" }, { label: "B", text: q.b, side: "right" }].map(pole => (
            <div key={pole.label} style={{
              flex: 1, padding: "1rem 1.1rem", background: "white",
              border: "1.5px solid #E5E2DC", borderRadius: 12,
            }}>
              <span style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#9B5DE5", fontWeight: 700, display: "block", marginBottom: "0.4rem" }}>{pole.label}</span>
              <p style={{ fontSize: "0.88rem", color: "#3C3C43", lineHeight: 1.6, margin: 0 }}>{pole.text}</p>
            </div>
          ))}
        </div>

        {/* 5-point scale */}
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "2.5rem" }}>
          {SCALE.map(s => (
            <button key={s.val} onClick={() => pick(s.val)} style={{
              padding: "0.85rem 1.1rem", borderRadius: 10, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem", fontWeight: 500,
              minHeight: 48,
              transition: "all 0.15s",
              background: chosen === s.val ? "#9B5DE5" : "white",
              color: chosen === s.val ? "white" : "#3C3C43",
              border: chosen === s.val ? "2px solid #9B5DE5" : "1.5px solid #E5E2DC",
              WebkitTapHighlightColor: "transparent",
            }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Nav buttons */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          {idx > 0 && (
            <button onClick={back} style={{
              background: "transparent", border: "1.5px solid #E5E2DC", color: "#999",
              padding: "0.9rem 1.5rem", borderRadius: 10, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", minHeight: 48,
              WebkitTapHighlightColor: "transparent",
            }}>← Back</button>
          )}
          <button onClick={next} disabled={chosen === null} style={{
            background: chosen !== null ? "linear-gradient(135deg,#E8673A,#1B5FE8)" : "#E5E2DC",
            color: "white", border: "none", padding: "0.9rem 2rem", borderRadius: 10,
            cursor: chosen !== null ? "pointer" : "not-allowed",
            fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", fontWeight: 600,
            minHeight: 48, WebkitTapHighlightColor: "transparent",
          }}>
            {idx + 1 < total ? "Next →" : "Complete Exercise →"}
          </button>
        </div>
      </div>
    </div>
  );
}


function JointOverview({ ex1Answers, partnerEx1, ex2Answers, partnerEx2, ex3Answers, partnerEx3, hasAnniversary, userName, partnerName, onGoPersonality, onGoExpectations, onGoAnniversary }) {
  const myS = calcDimScores(ex1Answers);
  const partS = calcDimScores(partnerEx1);
  const feedback = generatePersonalityFeedback(myS, partS, userName, partnerName);
  const sortedFeedback = [...feedback].sort((a, b) => a.gap - b.gap);
  const avgGap = feedback.reduce((s, f) => s + f.gap, 0) / feedback.length;
  const pairing = overallPairingLabel(avgGap);
  const topStrengths = sortedFeedback.filter(f => f.gap <= 1).slice(0, 3);
  const topOpportunities = sortedFeedback.filter(f => f.gap > 2).slice(0, 2);

  // Expectations summary
  const rows = [];
  RESPONSIBILITY_CATEGORIES.forEach(cat => {
    cat.items.forEach(item => {
      const key = ((cat.id) + "__" + (item));
      const mine = ex2Answers.responsibilities?.[key];
      const theirs = partnerEx2.responsibilities?.[key];
      if (!mine || !theirs) return;
      rows.push({ category: cat.label, item, mine, theirs, aligned: mine === theirs });
    });
  });
  const lifeRows = LIFE_QUESTIONS.map(q => ({
    category: q.category, item: q.text,
    mine: ex2Answers.life?.[q.id], theirs: partnerEx2.life?.[q.id],
    aligned: ex2Answers.life?.[q.id] === partnerEx2.life?.[q.id],
  })).filter(r => r.mine && r.theirs);
  const allRows = [...rows, ...lifeRows];
  const alignedCount = allRows.filter(r => r.aligned).length;
  const gapCount = allRows.filter(r => !r.aligned).length;
  const alignPct = allRows.length ? Math.round((alignedCount / allRows.length) * 100) : 0;

  const coupleType = deriveCoupleTypeFromExercise(
    myS, partS, alignPct
  );
  // Individual profile descriptions based on actual dimension scores
  const makeProfile = (scores, name) => {
    const top = DIMS.filter(d => scores[d] !== undefined).sort((a,b) => Math.abs((scores[b]||3)-3) - Math.abs((scores[a]||3)-3));
    const d1 = top[0], d2 = top[1];
    const m1 = DIM_META[d1], m2 = DIM_META[d2];
    if (!m1) return { tag: "A distinctive communication style." };
    const end1 = scores[d1] < 3 ? m1.ends[0] : m1.ends[1];
    const end2 = d2 && m2 ? (scores[d2] < 3 ? m2.ends[0] : m2.ends[1]) : null;
    // Natural-language descriptions instead of "X in Y" construction
    const desc1 = scores[d1] < 3
      ? ("Tends toward " + end1.toLowerCase() + " when it comes to " + m1.label.toLowerCase())
      : ("Tends toward " + end1.toLowerCase() + " when it comes to " + m1.label.toLowerCase());
    const desc2 = end2 ? (". " + (scores[d2] < 3 ? "More " : "More ") + end2.toLowerCase() + " around " + m2.label.toLowerCase()) : "";
    return { tag: desc1 + desc2 + "." };
  };
  const myProfile = makeProfile(myS, userName);
  const theirProfile = makeProfile(partS, partnerName);

  // Conversation starters -- pre-computed to avoid IIFE in JSX
  const startersList = [];
  topOpportunities.forEach(f => {
    const meta = DIM_META[f.dim];
    if (!meta) return;
    const prompts = {
      energy: `When one of us needs alone time to recharge and the other wants to connect, how do we handle that without it feeling like rejection?`,
      decision: `Walk me through the last big decision you made. What did that feel like from the inside?`,
      conflict: `After a disagreement, what does "being okay again" actually feel like for you?`,
      affection: `What's something I do that makes you feel really loved, that I might not realize has that effect?`,
      planning: `How much certainty do you need before you feel comfortable with a plan? What does uncertainty feel like for you?`,
      expressiveness: `Is there something you've wanted to share with me but haven't found the right way to bring up?`,
      togetherness: `What's your ideal ratio of time together vs. time doing your own thing in a given week?`,
      change: `Tell me about a time a big change went really well for you. What made it feel okay?`,
    };
    if (prompts[f.dim]) startersList.push({ dim: meta.label, prompt: prompts[f.dim], color: meta.color });
  });
  const topExpGap = allRows.filter(r => !r.aligned)[0];
  if (topExpGap) {
    startersList.push({ dim: topExpGap.category, prompt: `We had different answers on "${topExpGap.item}", what's the thinking behind yours? I want to understand where you're coming from.`, color: "#1B5FE8" });
  }
  const conversationStarters = startersList.length > 0 ? (
    <div style={{ marginTop: "2rem", background: "#FBF8F3", border: "1.5px solid #E8DDD0", borderRadius: 18, padding: "1.5rem 1.5rem 1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.1rem" }}>
        <div style={{ fontSize: "0.6rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "#E8673A", fontFamily: BFONT, fontWeight: 700 }}>Start here</div>
        <div style={{ flex: 1, height: 1, background: "#E8DDD0" }} />
      </div>
      <div style={{ fontFamily: HFONT, fontSize: "1.05rem", fontWeight: 700, color: "#0E0B07", marginBottom: "0.35rem", lineHeight: 1.2 }}>{Math.min(3, startersList.length)} conversation{Math.min(3, startersList.length) !== 1 ? "s" : ""} worth having</div>
      <p style={{ fontSize: "0.8rem", color: "#8C7A68", fontFamily: BFONT, fontWeight: 300, marginBottom: "1.25rem", lineHeight: 1.65 }}>Based on where your answers differed most.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        {startersList.slice(0, 3).map((s, i) => (
          <div key={i} style={{ background: "white", border: "1.5px solid #E8DDD0", borderRadius: 14, padding: "1rem 1.1rem", borderLeft: `3px solid ${s.color}` }}>
            <div style={{ fontSize: "0.58rem", letterSpacing: "0.16em", textTransform: "uppercase", color: s.color, fontFamily: BFONT, fontWeight: 700, marginBottom: "0.4rem" }}>{s.dim}</div>
            <p style={{ fontSize: "0.84rem", color: "#0E0B07", fontFamily: BFONT, fontWeight: 400, lineHeight: 1.65, margin: "0 0 0.5rem", fontStyle: "italic" }}>"{s.prompt}"</p>

          </div>
        ))}
      </div>
      <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #E8DDD0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: "0.72rem", color: "#8C7A68", fontFamily: BFONT, margin: 0, lineHeight: 1.5 }}>
          Want more conversations built from your specific results?
        </p>
        <a href="/offerings" style={{ fontSize: "0.72rem", color: "#E8673A", fontWeight: 700, textDecoration: "none", fontFamily: BFONT, whiteSpace: "nowrap", marginLeft: "1rem" }}>Get the Workbook →</a>
      </div>
    </div>
  ) : null;

  // Cross-exercise conflict insight, surfaces when Ex01 conflict gap + Ex02 conflict answers both diverge
  const conflictDimGap = (myS.conflict !== undefined && partS.conflict !== undefined)
    ? Math.abs(myS.conflict - partS.conflict) : 0;
  const myConflictWhen = ex2Answers?.life?.lq_conflict_when || "";
  const theirConflictWhen = partnerEx2?.life?.lq_conflict_when || "";
  const conflictWhenGap = myConflictWhen && theirConflictWhen && myConflictWhen !== theirConflictWhen;
  const urgencyWords = ["immediately", "quickly"];
  const spaceWords = ["significant space", "let things go"];
  const oneUrgent = urgencyWords.some(w => myConflictWhen.toLowerCase().includes(w)) || urgencyWords.some(w => theirConflictWhen.toLowerCase().includes(w));
  const oneNedsSpace = spaceWords.some(w => myConflictWhen.toLowerCase().includes(w)) || spaceWords.some(w => theirConflictWhen.toLowerCase().includes(w));
  const showConflictCrossLink = conflictDimGap > 1.5 && conflictWhenGap && oneUrgent && oneNedsSpace;

  const conflictCrossLinkCard = showConflictCrossLink ? (
    <div style={{ marginTop: "1.5rem", background: "#FFF8F5", border: "1.5px solid rgba(232,103,58,0.25)", borderRadius: 18, padding: "1.5rem 1.5rem 1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.85rem" }}>
        <div style={{ fontSize: "0.6rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "#E8673A", fontFamily: BFONT, fontWeight: 700 }}>Pattern across both exercises</div>
        <div style={{ flex: 1, height: 1, background: "rgba(232,103,58,0.2)" }} />
      </div>
      <div style={{ fontFamily: HFONT, fontSize: "1.05rem", fontWeight: 700, color: "#0E0B07", marginBottom: "0.35rem", lineHeight: 1.2 }}>Your conflict styles are different, and both exercises said so</div>
      <p style={{ fontSize: "0.82rem", color: "#8C7A68", fontFamily: BFONT, fontWeight: 300, marginBottom: "0.85rem", lineHeight: 1.7 }}>
        Exercise 01 mapped a gap in how you each process conflict. Exercise 02 confirmed it, one of you moves toward resolution quickly, and the other needs space first. Neither is wrong. But without naming it, the person who needs resolution reads the other's silence as avoidance, and the person who needs space reads the other's urgency as pressure. It loops.
      </p>
      <p style={{ fontSize: "0.82rem", color: "#0E0B07", fontFamily: BFONT, fontWeight: 400, lineHeight: 1.7, fontStyle: "italic" }}>
        "When something is hard between us, before we try to talk about it, what does each of us actually need first?"
      </p>
    </div>
  ) : null;

  // Anniversary card -- pre-computed to avoid IIFE in JSX
  let anniversaryCard = null;
  if (hasAnniversary && ex3Answers && partnerEx3) {
    const scaleQs = ANNIVERSARY_QUESTIONS.filter(q => q.type === "scale");
    const overallQ = scaleQs.find(q => q.id === "a0");
    const myOverall = ex3Answers.a0 ?? 3;
    const theirOverall = partnerEx3.a0 ?? 3;
    const avgOverall = (myOverall + theirOverall) / 2;
    const overallLabel = overallQ ? overallQ.scaleLabels[Math.round(avgOverall)] : "Really good";
    const annGap = Math.abs(myOverall - theirOverall);
    anniversaryCard = (
      <div onClick={onGoAnniversary}
        style={{ background: "white", borderRadius: 18, overflow: "hidden", border: "1.5px solid #E8DDD0", cursor: "pointer", transition: "all 0.18s", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginTop: "1rem" }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(16,185,129,0.18)"; e.currentTarget.style.borderColor = "#10b98166"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; e.currentTarget.style.borderColor = "#E8DDD0"; }}>
        <div style={{ background: "linear-gradient(135deg, #059669, #10b981)", padding: "1.1rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.75)", fontFamily: BFONT, marginBottom: "0.25rem" }}>Exercise 03</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "white", fontFamily: HFONT }}>Relationship Reflection</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "0.5rem 0.75rem", textAlign: "center" }}>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.65)", fontFamily: BFONT, marginBottom: "0.15rem" }}>Overall feel</div>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "white", fontFamily: BFONT }}>{overallLabel}</div>
          </div>
        </div>
        <div style={{ padding: "1rem 1.25rem" }}>
          <div style={{ marginBottom: "0.75rem" }}>
            {scaleQs.filter(q => q.id !== "a0").map(q => {
              const myVal = ex3Answers[q.id] ?? 2;
              const theirVal = partnerEx3[q.id] ?? 2;
              const qGap = Math.abs(myVal - theirVal);
              const shortLabel = q.text.replace(/How (well |much |connected )?(do I feel |do we )?/i,"").split("?")[0];
              return (
                <div key={q.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: qGap >= 2 ? "#F59E0B" : "#10b981", flexShrink: 0 }} />
                  <div style={{ fontSize: "0.7rem", color: "var(--text)", fontFamily: BFONT, flex: 1 }}>{shortLabel}</div>
                  <div style={{ fontSize: "0.65rem", color: qGap >= 2 ? "#F59E0B" : "#10b981", fontFamily: BFONT, fontWeight: 600 }}>{qGap >= 2 ? "Gap" : "Aligned"}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "0.7rem", color: "#8C7A68", fontFamily: BFONT }}>{annGap >= 1 ? "Different perspectives on how things feel" : "Shared sense of where you are"}</div>
            <span style={{ fontSize: "0.7rem", color: "#10b981", fontWeight: 700, fontFamily: BFONT }}>Explore results →</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
      <style>{'@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}'}</style>
      <link href={FONT_URL} rel="stylesheet" />

      {/* ── COUPLE TYPE HERO ── */}
      <div style={{ marginBottom: "1.25rem" }}>
        <CoupleTypeCard coupleType={coupleType} userName={userName} partnerName={partnerName} />
      </div>

      {/* Profile chips, above stats bar */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {[[userName, myProfile, "#E8673A"],[partnerName, theirProfile, "#3B5BDB"]].map(([name, profile, color]) => (
          <div key={name} style={{ flex: 1, minWidth: 200, background: color + "0E", border: ("1.5px solid " + color + "30"), borderRadius: 14, padding: "0.85rem 1rem" }}>
            <div style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.12em", color, fontWeight: 700, marginBottom: "0.3rem", fontFamily: BFONT }}>{name}</div>
            <div style={{ fontSize: "0.82rem", color: "#0E0B07", fontFamily: BFONT, lineHeight: 1.5, fontWeight: 400 }}>{profile.tag}</div>
          </div>
        ))}
      </div>

      {/* Stats bar, "completed independently" as hero */}
      <div style={{ background: "white", border: "1.5px solid #E8DDD0", borderRadius: 14, padding: "1.25rem 1.5rem", marginBottom: "1.25rem", textAlign: "center" }}>
        <div style={{ fontSize: "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#8C7A68", fontFamily: BFONT, fontWeight: 600, marginBottom: "0.85rem" }}>Completed independently, built entirely from your own answers</div>
        <div style={{ display: "flex", gap: "2rem", justifyContent: "center", flexWrap: "wrap" }}>
          {[
            { label: (DIMS.length + " dimensions"), color: "#E8673A" },
            { label: `${allRows.length} topics compared`, color: "#1B5FE8" },
            { label: `${alignPct}% aligned`, color: alignPct >= 70 ? "#10b981" : alignPct >= 50 ? "#1B5FE8" : "#E8673A" },
          ].map(({ label, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ fontSize: "0.82rem", color: "#0E0B07", fontFamily: BFONT, fontWeight: 600 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Two report cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
        {/* Communication card — item 5: content centered, no empty space */}
        <div onClick={onGoPersonality}
          style={{ background: "white", borderRadius: 18, overflow: "hidden", border: "1.5px solid #E8DDD0", cursor: "pointer", transition: "all 0.18s", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column" }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(232,103,58,0.18)"; e.currentTarget.style.borderColor = "#E8673A66"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; e.currentTarget.style.borderColor = "#E8DDD0"; }}>
          <div style={{ background: "linear-gradient(135deg, #E8673A, #d4592f)", padding: "1rem 1.25rem" }}>
            <div style={{ fontSize: "0.58rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", fontFamily: BFONT, marginBottom: "0.2rem" }}>Exercise 01</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "white", fontFamily: HFONT }}>How You Communicate</div>
          </div>
          <div style={{ padding: "1rem 1.25rem", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            {/* Dimension alignment bars */}
            <div style={{ marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <div style={{ fontSize: "0.65rem", color: C.muted, fontFamily: BFONT }}>{DIMS.length} dimensions</div>
                <div style={{ fontSize: "0.65rem", color: "#10b981", fontWeight: 600, fontFamily: BFONT }}>{sortedFeedback.filter(f => f.gap <= 1).length} in sync</div>
              </div>
              <div style={{ display: "flex", gap: "2px" }}>
                {sortedFeedback.map(f => (
                  <div key={f.dim} title={DIM_META[f.dim].label} style={{ flex: 1, height: 6, borderRadius: 2, background: f.gap <= 1 ? DIM_META[f.dim].color : DIM_META[f.dim].color + "35" }} />
                ))}
              </div>
            </div>
            {/* Top strength */}
            {topStrengths[0] && (
              <div style={{ background: "#F0FDF9", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "0.6rem 0.8rem", marginBottom: "0.5rem" }}>
                <div style={{ fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#10b981", fontWeight: 700, fontFamily: BFONT, marginBottom: "0.2rem" }}>Strongest alignment</div>
                <div style={{ fontSize: "0.75rem", color: C.ink, fontFamily: BFONT, fontWeight: 600 }}>{DIM_META[topStrengths[0].dim].label}</div>
              </div>
            )}
            {/* Top gap */}
            {topOpportunities[0] && (
              <div style={{ background: "#FFF8F5", border: "1px solid rgba(232,103,58,0.2)", borderRadius: 10, padding: "0.6rem 0.8rem", marginBottom: "0.75rem" }}>
                <div style={{ fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#E8673A", fontWeight: 700, fontFamily: BFONT, marginBottom: "0.2rem" }}>Biggest difference</div>
                <div style={{ fontSize: "0.75rem", color: C.ink, fontFamily: BFONT, fontWeight: 600 }}>{DIM_META[topOpportunities[0].dim].label}</div>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <span style={{ fontSize: "0.7rem", color: "#E8673A", fontWeight: 700, fontFamily: BFONT }}>Explore →</span>
            </div>
          </div>
        </div>

        {/* Expectations card — item 6: click-through style */}
        <div onClick={onGoExpectations}
          style={{ background: "white", borderRadius: 18, overflow: "hidden", border: "1.5px solid #E8DDD0", cursor: "pointer", transition: "all 0.18s", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column" }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(91,109,248,0.18)"; e.currentTarget.style.borderColor = "#1B5FE866"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; e.currentTarget.style.borderColor = "#E8DDD0"; }}>
          <div style={{ background: "linear-gradient(135deg, #1B5FE8, #4a5ce8)", padding: "1rem 1.25rem" }}>
            <div style={{ fontSize: "0.58rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", fontFamily: BFONT, marginBottom: "0.2rem" }}>Exercise 02</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "white", fontFamily: HFONT }}>What You Expect</div>
          </div>
          <div style={{ padding: "1rem 1.25rem", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            {/* Big alignment number */}
            <div style={{ textAlign: "center", padding: "0.5rem 0 0.75rem" }}>
              <div style={{ fontFamily: HFONT, fontSize: "2.6rem", fontWeight: 700, color: alignPct >= 70 ? "#10b981" : alignPct >= 50 ? "#1B5FE8" : "#E8673A", lineHeight: 1 }}>{alignPct}%</div>
              <div style={{ fontSize: "0.72rem", color: C.muted, fontFamily: BFONT, marginTop: "0.2rem" }}>already aligned</div>
            </div>
            {/* Progress bar */}
            <div style={{ marginBottom: "0.75rem" }}>
              <div style={{ height: 6, background: C.stone, borderRadius: 3 }}>
                <div style={{ height: "100%", width: alignPct + "%", background: alignPct >= 70 ? "#10b981" : alignPct >= 50 ? "#1B5FE8" : "#E8673A", borderRadius: 3, transition: "width 0.8s" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.35rem" }}>
                <div style={{ fontSize: "0.62rem", color: C.muted, fontFamily: BFONT }}>{alignedCount} aligned</div>
                <div style={{ fontSize: "0.62rem", color: gapCount > 0 ? "#E8673A" : "#10b981", fontFamily: BFONT, fontWeight: gapCount > 0 ? 600 : 400 }}>
                  {gapCount > 0 ? gapCount + " to discuss" : "Fully aligned"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <span style={{ fontSize: "0.7rem", color: "#1B5FE8", fontWeight: 700, fontFamily: BFONT }}>Explore →</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 key insights */}
      <div style={{ background: "#FFFDF9", border: "1px solid #E8DDD0", borderRadius: 18, padding: "1.5rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}><div style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.15em", color: C.clay, fontWeight: 700, fontFamily: BFONT }}>Four things to know about you two</div><div style={{ fontSize: "0.6rem", color: C.muted, fontFamily: BFONT }}>Based on your answers</div></div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          {/* Insight 1 */}
          <div style={{ paddingLeft: "0.85rem", borderLeft: "2.5px solid #9B5DE5" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: C.ink, marginBottom: "0.3rem", fontFamily: BFONT, lineHeight: 1.3 }}>
              {topStrengths.length > 0
                ? (userName + " and " + partnerName + " are naturally in sync on " + topStrengths.slice(0,2).map(f => DIM_META[f.dim].label.toLowerCase()).join(" and "))
                : (userName + " and " + partnerName + " share a compatible emotional register")}
            </div>
            <div style={{ fontSize: "0.78rem", color: C.muted, fontFamily: BFONT, lineHeight: 1.6, fontWeight: 300 }}>
              {topStrengths.length > 0
                ? "That shared orientation reduces a whole category of quiet friction that other couples navigate without realising."
                : "That foundation makes hard moments easier to recover from."}
            </div>
          </div>
          {/* Insight 2 */}
          <div style={{ paddingLeft: "0.85rem", borderLeft: "2.5px solid #E8673A" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: C.ink, marginBottom: "0.3rem", fontFamily: BFONT, lineHeight: 1.3 }}>
              {topOpportunities.length > 0
                ? (userName + " and " + partnerName + " are furthest apart on " + DIM_META[topOpportunities[0].dim].label.toLowerCase())
                : (userName + " and " + partnerName + " are closely matched across all dimensions")}
            </div>
            <div style={{ fontSize: "0.78rem", color: C.muted, fontFamily: BFONT, lineHeight: 1.6, fontWeight: 300 }}>
              {topOpportunities.length > 0
                ? ("This difference shapes how each of you reads situations. Understanding it — not resolving it — is what changes things.")
                : ("The work now is staying curious rather than assuming you already know how the other person is wired.")}
            </div>
          </div>
          {/* Insight 3 */}
          <div style={{ paddingLeft: "0.85rem", borderLeft: "2.5px solid #1B5FE8" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: C.ink, marginBottom: "0.3rem", fontFamily: BFONT, lineHeight: 1.3 }}>
              {gapCount === 0
                ? (userName + " and " + partnerName + " are aligned on every expectation mapped")
                : (userName + " and " + partnerName + " share " + alignedCount + " of " + allRows.length + " expectations already")}
            </div>
            <div style={{ fontSize: "0.78rem", color: C.muted, fontFamily: BFONT, lineHeight: 1.6, fontWeight: 300 }}>
              {gapCount === 0
                ? "That's a genuinely strong foundation, and now it's documented."
                : "That's the common ground the conversations below build on."}
            </div>
          </div>
          {/* Insight 4 */}
          <div style={{ paddingLeft: "0.85rem", borderLeft: "2.5px solid #10b981" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: C.ink, marginBottom: "0.3rem", fontFamily: BFONT, lineHeight: 1.3 }}>
              {gapCount === 0
                ? "No unspoken assumptions surfaced"
                : (gapCount + " place" + (gapCount === 1 ? "" : "s") + " where " + userName + " and " + partnerName + " have different assumptions")}
            </div>
            <div style={{ fontSize: "0.78rem", color: C.muted, fontFamily: BFONT, lineHeight: 1.6, fontWeight: 300 }}>
              {gapCount === 0
                ? "Worth revisiting as life changes — what feels aligned today can quietly drift."
                : "These aren't red flags. They're exactly the conversations most couples never have in advance."}
            </div>
          </div>
        </div>
      </div>

      {/* Anniversary card, shown when pkg.hasAnniversary */}
      {anniversaryCard}

      {/* ── CONVERSATION STARTERS, drawn from their biggest gaps ── */}
      {conversationStarters}

      {/* ── CROSS-EXERCISE CONFLICT INSIGHT ── */}
      {conflictCrossLinkCard}

  </div>

  );
}

// ── EXPERIENCE FEEDBACK COMPONENT ──
function ExperienceFeedback({ userName }) {
  const [phase, setPhase] = useState("idle"); // idle | form | thanks
  const [rating, setRating] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const questions = [
    { id: "q_clear",    label: "The results felt clear and easy to understand",       type: "scale" },
    { id: "q_accurate", label: "The results felt accurate for me personally",          type: "scale" },
    { id: "q_useful",   label: "I learned something useful about myself or my partner", type: "scale" },
    { id: "q_conv",     label: "This made me want to have a real conversation with my partner", type: "scale" },
    { id: "q_stage",    label: "Where are you in your relationship?",                  type: "choice",
      options: ["Just started dating", "In a relationship (1–3 yrs)", "Long-term (3+ yrs)", "Engaged", "Married"] },
    { id: "q_source",   label: "How did you hear about Attune?",                        type: "choice",
      options: ["Friend or partner", "Social media", "Google / search", "Gift", "Other"] },
    { id: "q_open",     label: "Anything else you'd like us to know?",                 type: "text" },
  ];

  const scaleLabels = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];
  const scaleColors = ["#ef4444","#f97316","#eab308","#22c55e","#10b981"];

  function handleSubmit() {
    setSubmitting(true);
    // POST to feedback API with non-PII demographic context
    const payload = {
      source: 'app_experience',
      rating,
      questionAnswers: answers,
      // Demographic context (non-PII)
      pkgType: demoPkg || 'unknown',
      exercisesComplete: [myAnswers, partAnswers].filter(a => a && Object.keys(a).length > 0).length,
      stage: answers['q_stage'] || null,
      howHeard: answers['q_source'] || null,
      message: answers['q_open'] || null,
    };
    fetch('/api/send-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {}); // non-blocking
    setTimeout(() => { setPhase("thanks"); setSubmitting(false); }, 600);
  }

  const allScaleAnswered = questions.filter(q => q.type === "scale").every(q => answers[q.id] != null);

  if (phase === "idle") {
    return (
      <div style={{ marginTop: "2.5rem", background: "linear-gradient(135deg,#0f0c29,#1d1a4e)", borderRadius: 18, padding: "2rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,#E8673A,#1B5FE8)" }} />
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#E8673A,#1B5FE8)", marginBottom: "0.6rem" }} />
        <div style={{ fontFamily: HFONT, fontSize: "1.1rem", fontWeight: 700, color: "white", marginBottom: "0.4rem" }}>How was your experience?</div>
        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,.75)", lineHeight: 1.65, marginBottom: "1.25rem", maxWidth: 400, margin: "0 auto 1.25rem" }}>Tell us how it went, it takes 2 minutes and helps us make Attune better for every couple after you.</p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
          {["😕 Not great","😐 It was okay","🙂 Pretty good","😍 Loved it"].map((label, i) => (
            <button key={i} onClick={() => { setRating(i); setPhase("form"); }}
              style={{ background: "rgba(255,255,255,.08)", border: "1.5px solid rgba(255,255,255,.15)", borderRadius: 10, padding: "0.55rem 1rem", fontSize: "0.8rem", color: "rgba(255,255,255,.75)", cursor: "pointer", fontFamily: BFONT, fontWeight: 500, transition: "all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.14)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.3)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.15)"; }}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => setPhase("form")}
          style={{ fontSize: "0.7rem", color: "rgba(255,255,255,.3)", background: "transparent", border: "none", cursor: "pointer", fontFamily: BFONT, textDecoration: "underline" }}>
          Skip rating and give detailed feedback
        </button>
      </div>
    );
  }

  if (phase === "thanks") {
    return (
      <div style={{ marginTop: "2.5rem", background: "linear-gradient(135deg,#0e2a18,#154428)", borderRadius: 18, padding: "2rem", textAlign: "center" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#10b981", marginBottom: "0.5rem" }} />
        <div style={{ fontFamily: HFONT, fontSize: "1.05rem", fontWeight: 700, color: "white", marginBottom: "0.4rem" }}>Thank you{userName ? `, ${userName}` : ""}.</div>
        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,.4)", lineHeight: 1.65 }}>Your feedback goes directly to the people building Attune. It genuinely matters.</p>
      </div>
    );
  }

  // form phase
  return (
    <div style={{ marginTop: "2.5rem", background: "white", border: `1.5px solid ${C.stone}`, borderRadius: 18, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#0f0c29,#1d1a4e)", padding: "1.25rem 1.5rem", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,#E8673A,#1B5FE8)" }} />
        <div style={{ fontFamily: HFONT, fontSize: "1rem", fontWeight: 700, color: "white" }}>Tell us how it was</div>
        <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,.4)", marginTop: "0.25rem", fontFamily: BFONT }}>Anonymous · 2 minutes · helps us improve Attune for everyone</div>
        {rating !== null && (
          <div style={{ marginTop: "0.6rem", display: "inline-block", background: "rgba(255,255,255,.1)", borderRadius: 8, padding: "0.3rem 0.75rem", fontSize: "0.78rem", color: "rgba(255,255,255,.7)", fontFamily: BFONT }}>
            You said: {["😕 Not great","😐 It was okay","🙂 Pretty good","😍 Loved it"][rating]}
          </div>
        )}
      </div>

      {/* Questions */}
      <div style={{ padding: "1.5rem" }}>
        {/* Scale questions */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, fontFamily: BFONT, fontWeight: 700, marginBottom: "1rem" }}>Rate each statement</div>
          {questions.filter(q => q.type === "scale").map(q => (
            <div key={q.id} style={{ marginBottom: "1.1rem" }}>
              <div style={{ fontSize: "0.8rem", color: C.text, fontFamily: BFONT, fontWeight: 500, marginBottom: "0.5rem", lineHeight: 1.4 }}>{q.label}</div>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                {scaleLabels.map((lbl, i) => (
                  <button key={i} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: i }))}
                    style={{ flex: 1, background: answers[q.id] === i ? scaleColors[i] : C.warm, border: `1.5px solid ${answers[q.id] === i ? scaleColors[i] : C.stone}`, borderRadius: 8, padding: "0.4rem 0.25rem", fontSize: "0.6rem", color: answers[q.id] === i ? "white" : C.muted, cursor: "pointer", fontFamily: BFONT, fontWeight: answers[q.id] === i ? 700 : 400, transition: "all .15s", lineHeight: 1.3 }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Choice questions */}
        {questions.filter(q => q.type === "choice").map(q => (
          <div key={q.id} style={{ marginBottom: "1.1rem" }}>
            <div style={{ fontSize: "0.8rem", color: C.text, fontFamily: BFONT, fontWeight: 500, marginBottom: "0.5rem" }}>{q.label}</div>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {q.options.map(opt => (
                <button key={opt} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                  style={{ background: answers[q.id] === opt ? "#1B5FE8" : C.warm, border: `1.5px solid ${answers[q.id] === opt ? "#1B5FE8" : C.stone}`, borderRadius: 999, padding: "0.35rem 0.75rem", fontSize: "0.72rem", color: answers[q.id] === opt ? "white" : C.muted, cursor: "pointer", fontFamily: BFONT, fontWeight: answers[q.id] === opt ? 700 : 400, transition: "all .15s" }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Open text */}
        {questions.filter(q => q.type === "text").map(q => (
          <div key={q.id} style={{ marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.8rem", color: C.text, fontFamily: BFONT, fontWeight: 500, marginBottom: "0.5rem" }}>{q.label}</div>
            <textarea
              value={answers[q.id] || ""}
              onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
              placeholder="Optional, anything at all..."
              style={{ width: "100%", minHeight: 90, padding: "0.75rem", borderRadius: 10, border: `1.5px solid ${C.stone}`, fontFamily: BFONT, fontSize: "0.82rem", color: C.text, resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.65 }}
              onFocus={e => e.target.style.borderColor = "#1B5FE8"}
              onBlur={e => e.target.style.borderColor = C.stone}
            />
          </div>
        ))}

        <button onClick={handleSubmit} disabled={!allScaleAnswered || submitting}
          style={{ width: "100%", background: allScaleAnswered ? "linear-gradient(135deg,#E8673A,#1B5FE8)" : C.stone, color: allScaleAnswered ? "white" : C.muted, border: "none", borderRadius: 12, padding: "0.85rem", fontSize: "0.82rem", fontWeight: 700, cursor: allScaleAnswered ? "pointer" : "default", fontFamily: BFONT, letterSpacing: "0.04em", transition: "opacity .2s" }}>
          {submitting ? "Sending..." : "Submit feedback →"}
        </button>
        <div style={{ fontSize: "0.68rem", color: C.muted, textAlign: "center", marginTop: "0.6rem", fontFamily: BFONT }}>Your feedback is anonymous and never linked to your name or email.</div>
      </div>
    </div>
  );
}

// -- PERSONALITY RESULTS --
// Per-dimension headline copy - unique per dim, 3 tiers by gap
const DIM_HEADLINES = {
  energy: [
    "You recharge the same way.",
    "Your energy rhythms are close.",
    "You each restore in your own way.",
  ],
  decision: [
    "You think through decisions the same way.",
    "Your thinking styles complement each other.",
    "You each bring a distinct perspective to decisions.",
  ],
  conflict: [
    "You move through hard moments at a similar pace.",
    "You approach hard conversations in a similar way.",
    "You each have your own pace when things get hard.",
  ],
  affection: [
    "You speak the same love language.",
    "Your ways of showing care mostly overlap.",
    "You each express and receive love in your own register.",
  ],
  planning: [
    "You're wired the same way around structure.",
    "You mostly see eye to eye on planning.",
    "One of you finds comfort in structure; the other in flexibility.",
  ],
  expressiveness: [
    "You're equally open with each other.",
    "Your comfort with sharing is closely matched.",
    "You each have your own relationship with emotional openness.",
  ],
  togetherness: [
    "You want the same balance of together and apart.",
    "Your togetherness needs are closely matched.",
    "You each have your own sense of how close to stay.",
  ],
  change: [
    "Change lands the same way for both of you.",
    "You handle uncertainty with similar ease.",
    "You each move through change at your own pace.",
  ],
};

function dimHeadline(dim, gap) {
  const tier = gap <= 1 ? 0 : gap <= 2.5 ? 1 : 2;
  return DIM_HEADLINES[dim]?.[tier] || "You each bring something distinct here.";
}

// Conditionally wraps children in a WithSideNav or plain div
function MaybeNav({ noSideNav, navItems, currentStep, onGo, accent, children }) {
  if (noSideNav) return <div style={{ minWidth: 0, flex: 1 }}>{children}</div>;
  return <WithSideNav navItems={navItems} currentStep={currentStep} onGo={onGo} accent={accent}>{children}</WithSideNav>;
}

function PersonalityResults({ myAnswers, partnerAnswers, userName, partnerName, coupleType, noSideNav = false, externalStep, onExternalGo, onGoExpectations }) {
  const [step, setStep] = useState(externalStep ?? 0);
  const [showRaw, setShowRaw] = useState(false);
  useEffect(() => { if (externalStep !== undefined) setStep(externalStep); }, [externalStep]);

  const myS = calcDimScores(myAnswers);
  const partS = calcDimScores(partnerAnswers);
  const feedback = generatePersonalityFeedback(myS, partS, userName, partnerName);

  // Sort by gap ascending -- most similar first (items 1 & 4, 6 & 7 use this order)
  const sortedFeedback = [...feedback].sort((a, b) => a.gap - b.gap);
  const avgGap = feedback.reduce((s, f) => s + f.gap, 0) / feedback.length;
  const pairing = overallPairingLabel(avgGap);
  const byDim = Object.fromEntries(feedback.map(f => [f.dim, f]));

  // Ordered dims follow sorted order for step navigation (item 1)
  // Domain order drives navigation — keeps dims in a consistent,
  // logical reading sequence matching the sidebar.
  const DOMAIN_ORDER = ["energy","expression","closeness","love","needs","bids","conflict","stress","repair","feedback"];
  const orderedDims = DOMAIN_ORDER.filter(d => feedback.some(f => f.dim === d));
  const TOTAL = orderedDims.length + 4; // overview + N dims + action plan + 2 individual + summary

  const go = s => { setStep(s); if (onExternalGo) onExternalGo(s); const sc = document.querySelector("[data-results-scroll]"); if (sc) sc.scrollTop = 0; else window.scrollTo({ top: 0, behavior: "smooth" }); };

  const protocols = [];
  if (byDim.conflict?.isOpportunity || byDim.conflict?.isNote) protocols.push({ title: "Create a pause protocol", body: byDim.conflict.adviceText, thisWeek: "Next time something feels off between you, before trying to resolve it, one of you says: 'I need [time amount] before we talk about this.' Practice naming the time — not just asking for space." });
  if (byDim.repair?.isOpportunity || byDim.repair?.isNote) protocols.push({ title: "Agree on what repaired looks like", body: byDim.repair.adviceText, thisWeek: "Within 24 hours of your next disagreement, one of you takes a small step to come back — not to relitigate it, just to signal you're okay. Notice how the other responds." });
  if (byDim.energy?.isOpportunity || byDim.energy?.isNote) protocols.push({ title: "Name your recharge needs", body: byDim.energy.adviceText, thisWeek: "This week, tell each other in advance when you need recharge time — before you're depleted. Try: 'I need a quiet evening Thursday.' That's it." });
  if (byDim.needs?.isOpportunity || byDim.needs?.isNote) protocols.push({ title: "Practice the direct ask", body: byDim.needs.adviceText, thisWeek: "Once this week, ask directly for something you'd normally hint at or leave unsaid. Just the request — no preamble, no apology." });
  if (byDim.bids?.isOpportunity || byDim.bids?.isNote) protocols.push({ title: "Stay tuned to small moments", body: byDim.bids.adviceText, thisWeek: "Once a day this week, when the other person does something small for you — makes you coffee, sends you something — acknowledge it specifically. Not just 'thanks,' but 'I noticed that.'" });
  if (byDim.closeness?.isOpportunity || byDim.closeness?.isNote) protocols.push({ title: "Design your together-apart rhythm", body: byDim.closeness.adviceText, thisWeek: "This week, set one evening or morning that belongs to just the two of you — no plans, no phones, nothing to accomplish. Calendar it like a real commitment." });
  if (byDim.expression?.isOpportunity || byDim.expression?.isNote) protocols.push({ title: "Build toward more openness", body: byDim.expression.adviceText, thisWeek: "This week, each of you says one thing out loud that you'd normally hold back or let pass. Not something big — just something that's been sitting there." });
  if (byDim.stress?.isOpportunity || byDim.stress?.isNote) protocols.push({ title: "Name your stress mode in advance", body: byDim.stress.adviceText, thisWeek: "Next time one of you is clearly under pressure, instead of asking 'what's wrong?' try asking 'do you need me to help fix something, or do you just need me to be here?' Notice what they say." });
  if (byDim.feedback?.isOpportunity || byDim.feedback?.isNote) protocols.push({ title: "Practice the small direct mention", body: byDim.feedback.adviceText, thisWeek: "This week, when something bothers you, name it within the same day — not to fight, just to say it. 'Hey, that landed a little off for me.' See what happens." });
  if (byDim.love?.isOpportunity || byDim.love?.isNote) protocols.push({ title: "Learn each other's language", body: byDim.love.adviceText, thisWeek: "Ask your partner: 'What's one thing I do that makes you feel really cared for that I might not realize has that effect?' Then listen without commenting." });
  if (protocols.length === 0) {
    protocols.push({ emoji: "", title: "Keep checking in", body: ((userName) + " and " + (partnerName) + " are closely aligned across all eight dimensions. The work here isn't about catching up. It's about staying connected. Couples who stay curious about each other's inner experience, even when things feel stable, tend to stay that way longer.") });
    protocols.push({ emoji: "", title: "Stay curious as things change", body: "When two people are this in sync, it's easy to assume the picture stays the same. But what each of you needs, values, and envisions can shift gradually. A brief check-in every few months keeps you current with each other." });
    protocols.push({ emoji: "", title: "Name what's working", body: ("Most couples only talk about their relationship when something feels off. " + (userName) + " and " + (partnerName) + " have something worth naming explicitly: real alignment. Talking about what you're doing well, not just what feels hard, reinforces it.") });
  }

  const scaleLabels = ["Strongly A","Lean A","Neutral","Lean B","Strongly B"];

  // -- SIDE NAV ITEMS --
  // Group ordered dims by domain for sidebar display
  const domainGroups = [
    { id: "inner",      label: "Your Inner Worlds",    color: "#9B5DE5", dims: ["energy","expression","closeness"] },
    { id: "connection", label: "How You Connect",      color: "#E8673A", dims: ["love","needs","bids"] },
    { id: "hard",       label: "When Things Get Hard", color: "#1B5FE8", dims: ["conflict","stress","repair","feedback"] },
  ];
  const personalityNavItems = [
    { label: "Overview", step: 0 },
    ...domainGroups.flatMap(domain => {
      const domainDims = orderedDims.filter(d => domain.dims.includes(d));
      if (!domainDims.length) return [];
      return [
        { label: domain.label, step: "section-" + domain.id, isSection: true, color: domain.color },
        ...domainDims.map((dim) => ({ label: DIM_META[dim].label, step: orderedDims.indexOf(dim) + 1, isChild: true, color: domain.color })),
      ];
    }),
    { label: "Profiles & Plan", step: "profiles-section", isSection: true },
    { label: userName + "'s Profile", step: orderedDims.length + 1, isChild: true },
    { label: partnerName + "'s Profile", step: orderedDims.length + 2, isChild: true },
    { label: "Comm. Action Plan", step: orderedDims.length + 3, isChild: true },
  ];

  // -- STEP 0: OVERVIEW --
  if (step === 0) return (
    <MaybeNav noSideNav={noSideNav} navItems={personalityNavItems} currentStep={step} onGo={go} accent="#E8673A">
      <ResultsSlide bg="linear-gradient(145deg, #0f0c29, #302b63, #24243e)">
      <link href={FONT_URL} rel="stylesheet" />
      <div style={{ color: "white" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <div style={{ fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontFamily: BFONT }}>How You Communicate</div>
            <div style={{ fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", fontFamily: BFONT, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 99, padding: "0.2rem 0.6rem" }}>Overview</div>
          </div>
          <div style={{ fontSize: "clamp(1.8rem,6vw,2.8rem)", fontWeight: 700, fontFamily: HFONT, lineHeight: 1.0, marginBottom: "0.6rem" }}>{userName} & {partnerName}</div>
          <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.55)", fontFamily: BFONT, fontWeight: 300, lineHeight: 1.6, margin: 0 }}>
            {sortedFeedback.filter(f => f.gap <= 1).length} of {DIMS.length} dimensions closely matched.{" "}
            {sortedFeedback.filter(f => f.gap > 1).length > 0 ? (sortedFeedback.filter(f => f.gap > 1).length + " worth a closer look.") : "Strong alignment across the board."}
          </p>
          <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.32)", fontFamily: BFONT, fontWeight: 300, lineHeight: 1.55, margin: "0.6rem 0 0" }}>Tap any dimension below to read the full picture.</p>
        </div>

        {/* ── WHAT'S DRIVING YOUR GAP ── */}
        {(() => {
          const topGaps = sortedFeedback.filter(f => f.gap > 1.5).slice(0, 2);
          if (topGaps.length === 0) return null;
          return (
            <div style={{ background: "rgba(232,103,58,0.1)", border: "1px solid rgba(232,103,58,0.25)", borderRadius: 14, padding: "1rem 1.1rem", marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.55rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#E8673A", fontFamily: BFONT, fontWeight: 700, marginBottom: "0.6rem" }}>Start here</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {topGaps.map((f, i) => {
                  const m = DIM_META[f.dim];
                  const myScore = myS[f.dim] ?? 3;
                  const partScore = partS[f.dim] ?? 3;
                  const myEnd = myScore < 3 ? m.ends[0] : m.ends[1];
                  const partEnd = partScore < 3 ? m.ends[0] : m.ends[1];
                  return (
                    <div key={f.dim} onClick={() => go(sortedFeedback.indexOf(f) + 1)}
                      style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", cursor: "pointer" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(232,103,58,0.18)", border: "1px solid rgba(232,103,58,0.35)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                        <span style={{ fontSize: "0.62rem", color: "#E8673A", fontWeight: 700 }}>{i + 1}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "white", fontFamily: BFONT }}>{m.label}: </span>
                        <span style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.72)", fontFamily: BFONT, fontWeight: 300 }}>
                          {userName} leans {myEnd.toLowerCase()}, {partnerName} leans {partEnd.toLowerCase()}.
                        </span>
                        <span style={{ fontSize: "0.68rem", color: "rgba(232,103,58,0.7)", fontFamily: BFONT, marginLeft: "0.3rem" }}>Read more →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── COUPLE TYPE CALLOUT ── */}
        {coupleType && (() => {
          const interp = s => s
            .replace(/\{U\}/g, userName).replace(/\{P\}/g, partnerName);
          // Pick the most communication-relevant pattern (first one or the one mentioning stress/conflict/communication)
          const commPattern = coupleType?.patterns?.find(p =>
            /stress|conflict|tension|hard|regulate|say|talk|communicate/i.test(p)
          ) || coupleType?.patterns?.[0];
          const commTip = coupleType?.tips?.find(t =>
            /communicate|conversation|say|name|ask|direct|conflict|repair/i.test(t.body || t.title)
          ) || coupleType?.tips?.[0];
          if (!commPattern && !commTip) return null;
          return (
            <div style={{ background: `rgba(${coupleType?.color === '#10b981' ? '16,185,129' : coupleType?.color === '#1B5FE8' ? '27,95,232' : '232,103,58'},0.08)`, border: `1px solid ${coupleType?.color}30`, borderRadius: 14, padding: '1rem 1.1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.65rem' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${coupleType?.color}22`, border: `1.5px solid ${coupleType?.color}50`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: coupleType?.color }} />
                </div>
                <div style={{ fontSize: '0.55rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: coupleType?.color, fontFamily: BFONT, fontWeight: 700 }}>
                  {coupleType?.name} · how this plays out in communication
                </div>
              </div>
              {commPattern && (
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', fontFamily: BFONT, fontWeight: 300, lineHeight: 1.72, margin: '0 0 0.65rem' }}>
                  {interp(commPattern)}
                </p>
              )}
              {commTip && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.65rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', fontFamily: BFONT }}>{commTip.title}: </span>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.42)', fontFamily: BFONT, fontWeight: 300 }}>{interp(commTip.body)}</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── COMPARISON BARS GRAPHIC ── */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "1rem 1.1rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.7rem" }}>
            <div style={{ fontSize: "0.55rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: BFONT, fontWeight: 700 }}>Where you each land</div>
            <div style={{ display: "flex", gap: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#E8673A" }} />
                <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.45)", fontFamily: BFONT }}>{userName}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#6C7FFF" }} />
                <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.45)", fontFamily: BFONT }}>{partnerName}</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            {sortedFeedback.map(f => {
              const m = DIM_META[f.dim];
              const myScore = myS[f.dim] ?? 3;
              const partScore = partS[f.dim] ?? 3;
              // Score is 1–5; normalize to 10–90% for visual range
              const myPct = Math.round(10 + (myScore - 1) * 20);
              const partPct = Math.round(10 + (partScore - 1) * 20);
              const isAligned = f.gap <= 1;
              return (
                <div key={f.dim} onClick={() => go(sortedFeedback.indexOf(f) + 1)}
                  style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "0.65rem" }}>
                  <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.65)", fontFamily: BFONT, flexShrink: 0, width: "clamp(88px,30%,120px)", lineHeight: 1.25 }}>{m.label}</span>
                  <div style={{ flex: 1, position: "relative", height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 999 }}>
                    <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: `${myPct}%`, width: 10, height: 10, borderRadius: "50%", background: "#E8673A", border: "1.5px solid rgba(14,11,7,0.3)", marginLeft: -5 }} />
                    <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: `${partPct}%`, width: 10, height: 10, borderRadius: "50%", background: "#6C7FFF", border: "1.5px solid rgba(14,11,7,0.3)", marginLeft: -5 }} />
                  </div>
                  <span style={{ fontSize: "0.55rem", color: isAligned ? "#10b981" : "#E8673A", fontFamily: BFONT, fontWeight: 600, flexShrink: 0, minWidth: "60px", textAlign: "right" }}>{isAligned ? "aligned" : "explore →"}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem" }}>
            <span style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.2)", fontFamily: BFONT }}>{DIM_META[sortedFeedback[0]?.dim]?.ends?.[0] ?? "A"}</span>
            <span style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.2)", fontFamily: BFONT }}>{DIM_META[sortedFeedback[0]?.dim]?.ends?.[1] ?? "B"}</span>
          </div>
        </div>

        {/* Strong alignment, gap ≤ 1 */}
        {sortedFeedback.filter(f => f.gap <= 1).length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#10b981", fontFamily: BFONT, fontWeight: 700, marginBottom: "0.55rem" }}>Strong alignment</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              {sortedFeedback.filter(f => f.gap <= 1).map(f => {
                const m = DIM_META[f.dim]; const idx = sortedFeedback.indexOf(f);
                return (
                  <div key={f.dim} onClick={() => go(idx + 1)}
                    style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.45rem 0.75rem", borderRadius: 8, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.22)", cursor: "pointer", transition: "background 0.12s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(16,185,129,0.18)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(16,185,129,0.1)"}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
                    <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.88)", fontFamily: BFONT, flex: 1 }}>{m.label}</span>
                    <span style={{ fontSize: "0.62rem", color: "rgba(16,185,129,0.7)", fontFamily: BFONT }}>→</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* What's in this section */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "0.85rem" }}>
          <div style={{ fontSize: "0.55rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: BFONT, fontWeight: 700, marginBottom: "0.5rem" }}>What's in this section</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {[
              { label: "Detailed pages", sub: "One page per dimension", onClick: () => go(1) },
              { label: userName + "'s profile", sub: "How " + userName + " is wired", onClick: () => go(orderedDims.length + 1) },
              { label: partnerName + "'s profile", sub: "How " + partnerName + " is wired", onClick: () => go(orderedDims.length + 2) },
              { label: "Communication Action Plan", sub: "Practices built from your results", onClick: () => go(orderedDims.length + 3) },
            ].map(({ label, sub, onClick }, idx) => (
              <div key={idx} onClick={onClick}
                style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.4rem 0.75rem", borderRadius: 8, background: "rgba(255,255,255,0.04)", cursor: "pointer", transition: "all 0.12s", border: "1px solid rgba(255,255,255,0.06)" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.09)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.72)", fontFamily: BFONT }}>{label}</div>
                  <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.35)", fontFamily: BFONT, marginTop: "0.1rem" }}>{sub}</div>
                </div>
                <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.25)", fontFamily: BFONT, flexShrink: 0 }}>→</span>
              </div>
            ))}
          </div>
        </div>

      </div>
      <NavButtons onBack={() => {}} backDisabled nextLabel={"Begin: " + DIM_META[orderedDims[0]]?.label + " →"} onNext={() => go(1)} />
      </ResultsSlide>
    </MaybeNav>
  );

  // -- STEPS 1-N: ONE DIMENSION PER SCREEN (sorted order) --
  if (step >= 1 && step <= orderedDims.length) {
    const dim = orderedDims[step - 1];
    const f = byDim[dim];
    const m = DIM_META[dim];
    const headline = dimHeadline(dim, f.gap); // unique per dim + gap tier (items 3 & 4)
    const isLast = step === orderedDims.length;
    const nextDim = orderedDims[step]; // next in sorted order

    return (
    <MaybeNav noSideNav={noSideNav} navItems={personalityNavItems} currentStep={step} onGo={go} accent="#E8673A">
      <ResultsSlide bg={"linear-gradient(145deg, " + m.dark + "dd, " + m.dark + "99, #22204a)"}>
        <link href={FONT_URL} rel="stylesheet" />
        {/* Dim label only, no badge chip (item 4: merged into headline) */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: m.color, flexShrink: 0, alignSelf: "center" }} />
          <div style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.82)", fontWeight: 700, fontFamily: BFONT }}>{m.label}</div>
          <div style={{ marginLeft: "auto", fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", fontFamily: BFONT }}>{step} of {orderedDims.length}</div>
        </div>
        <div style={{ fontSize: "clamp(1.5rem,5vw,2rem)", fontWeight: 700, color: "white", lineHeight: 1.1, marginBottom: "1.25rem", fontFamily: HFONT }}>{headline}</div>

        {/* Track */}
        <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 14, padding: "1.25rem 1.5rem", marginBottom: "1rem", border: "1px solid rgba(255,255,255,0.2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.1rem" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "rgba(255,255,255,0.85)", fontFamily: BFONT }}>{m.ends[0]}</span>
            <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "rgba(255,255,255,0.85)", fontFamily: BFONT }}>{m.ends[1]}</span>
          </div>
          <DimTrackViz myScore={myS[dim]} theirScore={partS[dim]} color={m.color} userName={userName} partnerName={partnerName} />
        </div>

        {/* What this means */}
        {(f.strengthText || f.insightText) && (
          <div style={{ background: "rgba(255,255,255,0.11)", borderRadius: 14, padding: "1.25rem 1.5rem", marginBottom: "1rem", border: "1px solid rgba(255,255,255,0.18)" }}>
            <div style={{ fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontFamily: BFONT, fontWeight: 700, marginBottom: "0.6rem" }}>What this means</div>
            <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.92)", lineHeight: 1.8, margin: 0, fontFamily: BFONT, fontWeight: 300 }}>{f.strengthText || f.insightText}</p>
          </div>
        )}

        {/* Try this / Keep this in mind */}
        {f.adviceText && (
          <div style={{ background: (m.color + (f.isStrength ? "28" : "45")), borderRadius: 14, padding: "1.25rem 1.5rem", border: ("1px solid " + (m.color) + (f.isStrength ? "50" : "80")) }}>
            <div style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.9)", fontWeight: 700, marginBottom: "0.5rem", fontFamily: BFONT }}>{f.isStrength ? "Worth protecting" : "One shift that helps"}</div>
            <p style={{ fontSize: "0.9rem", color: "white", lineHeight: 1.8, margin: 0, fontFamily: BFONT, fontWeight: f.isStrength ? 400 : 500 }}>{f.adviceText}</p>
          </div>
        )}

        {/* ── TYPE-SPECIFIC DIM NOTE — shown only on gap dims for the couple's type ── */}
        {coupleType && f.gap > 1.2 && (() => {
          // Find a sticking point or nuance that references this dim's domain
          const dimKeywords = {
            conflict: /conflict|tension|disagree|fight|argue|resolve/i,
            repair: /repair|apolog|make.*up|after.*argument|forgive/i,
            stress: /stress|pressure|overwhelm|anxious|under pressure/i,
            feedback: /feedback|criticism|raise.*issue|mention.*bother/i,
            expression: /express|share|open|vulnerable|feeling/i,
            needs: /need|ask|request|direct|hint/i,
            energy: /recharge|energy|space|solitude|together/i,
            closeness: /close|together|independent|distance/i,
            love: /love|affection|care|gesture|language/i,
            bids: /bid|notice|small|gesture|respond/i,
          };
          const keywords = dimKeywords[dim];
          const relevantNote = keywords && (
            coupleType?.stickingPoints?.find(sp => keywords.test(sp)) ||
            coupleType?.nuance && keywords.test(coupleType?.nuance) && coupleType?.nuance
          );
          if (!relevantNote) return null;
          const interp = s => s.replace(/\{U\}/g, userName).replace(/\{P\}/g, partnerName);
          return (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '0.85rem 1.1rem', display: 'flex', gap: '0.7rem', alignItems: 'flex-start' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: `${coupleType?.color}22`, border: `1.5px solid ${coupleType?.color}50`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: coupleType?.color }} />
              </div>
              <div>
                <div style={{ fontSize: '0.55rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: coupleType?.color, fontFamily: BFONT, fontWeight: 700, marginBottom: '0.3rem' }}>
                  {coupleType?.name}
                </div>
                <p style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.55)', fontFamily: BFONT, fontWeight: 300, lineHeight: 1.65, margin: 0 }}>{interp(relevantNote)}</p>
              </div>
            </div>
          );
        })()}

        <NavButtons
          onBack={() => go(step - 1)}
          onNext={() => go(step + 1)}
          nextLabel={isLast ? ((userName) + "'s Profile ->") : ((DIM_META[nextDim]?.label) + " →")}
        />
      </ResultsSlide>
    </MaybeNav>
    );
  }

  // -- ACTION PLAN (now step N+3) --
  if (step === orderedDims.length + 3) return (
    <MaybeNav noSideNav={noSideNav} navItems={personalityNavItems} currentStep={step} onGo={go} accent="#E8673A">
      <ResultsSlide bg="linear-gradient(145deg, #0f0c29, #1e1a40, #0f0c29)">
      <link href={FONT_URL} rel="stylesheet" />
      <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(232,103,58,0.8)", fontWeight: 700, marginBottom: "0.4rem", fontFamily: BFONT }}>Communication Action Plan</div>
      <div style={{ fontSize: "clamp(1.6rem,5vw,2.2rem)", fontWeight: 700, color: "white", lineHeight: 1.1, marginBottom: "0.6rem", fontFamily: HFONT }}>{protocols[0]?.title === "Keep checking in" ? "Remarkably well matched." : "Built from your answers."}</div>
      <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.65)", marginBottom: "1.75rem", lineHeight: 1.7, fontFamily: BFONT, fontWeight: 300 }}>{protocols[0]?.title === "Keep checking in" ? (userName + " and " + partnerName + " are closely aligned across all " + DIMS.length + " communication dimensions. That's genuinely rare, and worth knowing.") : ("Three practices for " + userName + " and " + partnerName + ", drawn from where your answers diverged most.")}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "0.5rem" }}>
        {protocols.slice(0, 3).map((p, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.1rem 1.4rem", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "white", fontFamily: BFONT, marginBottom: "0.5rem" }}>{p.title}</div>
            <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.72)", lineHeight: 1.75, fontFamily: BFONT, fontWeight: 300, marginBottom: p.thisWeek ? "0.75rem" : 0 }}>{p.body}</div>
            {p.thisWeek && (
              <div style={{ background: "rgba(232,103,58,0.12)", border: "1px solid rgba(232,103,58,0.28)", borderRadius: 10, padding: "0.6rem 0.85rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <span style={{ fontSize: "0.55rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#E8673A", fontFamily: BFONT, fontWeight: 700, flexShrink: 0, paddingTop: "0.1rem" }}>Try this week</span>
                <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.82)", fontFamily: BFONT, fontWeight: 400, lineHeight: 1.6 }}>{p.thisWeek}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* ── TYPE-SPECIFIC PRACTICE ── */}
      {coupleType?.tips?.length > 0 && (() => {
        const interp = s => s.replace(/\{U\}/g, userName).replace(/\{P\}/g, partnerName);
        const practiceTip = coupleType?.tips[coupleType?.tips.length - 1];
        return (
          <div style={{ background: `${coupleType?.color}12`, border: `1px solid ${coupleType?.color}35`, borderRadius: 14, padding: '1rem 1.25rem', marginTop: '0.85rem' }}>
            <div style={{ fontSize: '0.55rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: coupleType?.color, fontFamily: BFONT, fontWeight: 700, marginBottom: '0.4rem' }}>
              For a {coupleType?.name.replace('The ', '').toLowerCase()} dynamic
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'white', fontFamily: BFONT, marginBottom: '0.3rem' }}>{practiceTip.title}</div>
            <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.6)', fontFamily: BFONT, fontWeight: 300, lineHeight: 1.7 }}>{interp(practiceTip.body)}</div>
          </div>
        );
      })()}
      {/* Download action plan */}
      <button onClick={() => {
        const lines = ["COMMUNICATION ACTION PLAN", "━".repeat(40), `${userName} & ${partnerName}`, "", ...protocols.slice(0,3).flatMap(p => [p.title, p.body, p.thisWeek ? "Try this week: " + p.thisWeek : "", ""])];
        const blob = new Blob([lines.join("\n")], { type: "text/plain" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
        a.download = "Attune_Communication_Action_Plan.txt"; a.click();
      }} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)", borderRadius: 9, padding: "0.5rem 1rem", fontSize: "0.72rem", fontWeight: 600, fontFamily: BFONT, cursor: "pointer", marginTop: "0.75rem", marginBottom: "0.25rem" }}>
        ↓ Download action plan
      </button>
      <NavButtons onBack={() => go(step - 1)} onNext={onGoExpectations || (() => {})} nextLabel={onGoExpectations ? "Expectations →" : "Done"} nextDisabled={!onGoExpectations} />

      {/* Add-ons row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "1.25rem" }}>
        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "1rem" }}>
          <div style={{ width: 20, height: 20, borderRadius: 5, background: "rgba(232,103,58,0.25)", border: "1.5px solid rgba(232,103,58,0.45)", marginBottom: "0.4rem" }} />
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "white", marginBottom: "0.3rem", fontFamily: BFONT }}>Personalized Workbook</div>
          <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, fontFamily: BFONT, margin: "0 0 0.6rem" }}>Guided exercises and conversation prompts built directly from these action items.</p>
          <a href="/offerings" style={{ fontSize: "0.7rem", color: "#E8673A", fontFamily: BFONT, fontWeight: 700, textDecoration: "none" }}>Get the workbook →</a>
        </div>
        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "1rem" }}>
          <div style={{ width: 20, height: 20, borderRadius: 5, background: "rgba(27,95,232,0.2)", border: "1.5px solid rgba(27,95,232,0.4)", marginBottom: "0.4rem" }} />
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "white", marginBottom: "0.3rem", fontFamily: BFONT }}>LMFT Session</div>
          <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, fontFamily: BFONT, margin: "0 0 0.6rem" }}>A licensed therapist reviews your results and runs a 60-min session built around exactly this.</p>
          <a href="/offerings#pkg-premium" style={{ fontSize: "0.7rem", color: "#1B5FE8", fontFamily: BFONT, fontWeight: 700, textDecoration: "none" }}>Learn more →</a>
        </div>
      </div>
    </ResultsSlide>
    </MaybeNav>
  );

  // -- INDIVIDUAL PAGES (now steps N+1 and N+2) --
  if (step === orderedDims.length + 1 || step === orderedDims.length + 2) {
    const isMyPage = step === orderedDims.length + 1;
    const personName  = isMyPage ? userName    : partnerName;
    const partnerDisplayName = isMyPage ? partnerName : userName;
    const personScores  = isMyPage ? myS  : partS;

    // ── Individual type for this person ──────────────────────────────────────
    const personTypeInfo = computeIndividualType(personScores);
    const personType = INDIVIDUAL_TYPES[personTypeInfo.typeCode];
    const pageColor = personType.color;
    const pageBg = {
      W: "linear-gradient(145deg, #1c0e06, #2e1a0e, #1c0e06)",
      X: "linear-gradient(145deg, #060d2a, #0f1c48, #060d2a)",
      Y: "linear-gradient(145deg, #100720, #1e0d3a, #100720)",
      Z: "linear-gradient(145deg, #0d0d0d, #1a1a1a, #0d0d0d)",
    }[personTypeInfo.typeCode] || "linear-gradient(145deg, #0f0c29, #302b63, #24243e)";

    // ── Partner perspective lookup ────────────────────────────────────────────
    // Determine which index to use: typeA is alphabetically first in coupleType.id
    const myTypeCode   = computeIndividualType(myS).typeCode;
    const partTypeCode = computeIndividualType(partS).typeCode;
    const coupleId = coupleType?.id || [myTypeCode, partTypeCode].sort().join("");
    const perspectives = PARTNER_PERSPECTIVE[coupleId];
    // Figure out which perspective index applies to this person
    // typeA = alphabetically first code in the sorted coupleId
    const sortedCodes = [myTypeCode, partTypeCode].sort();
    const thisCode = isMyPage ? myTypeCode : partTypeCode;
    const perspIdx = (thisCode === sortedCodes[0] && coupleId[0] === sortedCodes[0]) ? 0 : 1;
    const partnerPerspective = perspectives ? perspectives[perspIdx] : "Your partner processes and responds differently than you do — understanding that difference is what makes this pairing interesting.";

    return (
    <MaybeNav noSideNav={noSideNav} navItems={personalityNavItems} currentStep={step} onGo={go} accent={pageColor}>
      <ResultsSlide bg={pageBg}>
        <link href={FONT_URL} rel="stylesheet" />
        <div style={{ color: "white" }}>

          {/* ── Header: name + type badge ── */}
          <div style={{ marginBottom: "1.75rem" }}>
            <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.38)", marginBottom: "0.55rem", fontFamily: BFONT }}>Communication Profile</div>
            <div style={{ fontSize: "clamp(1.8rem,6vw,2.8rem)", fontWeight: 700, fontFamily: HFONT, lineHeight: 1.0, marginBottom: "0.65rem" }}>{personName}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: pageColor + "22", border: `1px solid ${pageColor}50`, borderRadius: 999, padding: "0.3rem 0.85rem" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: pageColor, flexShrink: 0 }} />
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: pageColor, fontFamily: BFONT, letterSpacing: "0.06em" }}>{personType.name}</span>
              <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", fontFamily: BFONT }}>· {personType.axis1} · {personType.axis2}</span>
            </div>
          </div>

          {/* ── Section 1: How you're wired ── */}
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.25rem", marginBottom: "0.85rem", border: `1px solid ${pageColor}25` }}>
            <div style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.18em", color: pageColor, fontWeight: 700, marginBottom: "0.7rem", fontFamily: BFONT }}>How you're wired</div>
            <p style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.88)", fontFamily: BFONT, fontWeight: 300, lineHeight: 1.72, margin: 0 }}>{personType.wired}</p>
          </div>

          {/* ── Section 2: Your type ── */}
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "1.1rem 1.25rem", marginBottom: "0.85rem", borderLeft: `3px solid ${pageColor}80` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.6rem" }}>
              <div style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.18em", color: pageColor, fontWeight: 700, fontFamily: BFONT }}>Your type</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.9)", fontFamily: HFONT }}>Type {personTypeInfo.typeCode} — {personType.name}</div>
            </div>
            <p style={{ fontSize: "0.86rem", color: "rgba(255,255,255,0.82)", fontFamily: BFONT, fontWeight: 300, lineHeight: 1.72, margin: 0 }}>{personType.typeDesc}</p>
          </div>

          {/* ── Section 3: With [partner] specifically ── */}
          <div style={{ background: `${pageColor}18`, borderRadius: 16, padding: "1.25rem", border: `1px solid ${pageColor}45` }}>
            <div style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.18em", color: pageColor, fontWeight: 700, marginBottom: "0.55rem", fontFamily: BFONT }}>With {partnerDisplayName} specifically</div>
            <p style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.88)", fontFamily: BFONT, fontWeight: 400, lineHeight: 1.75, margin: 0 }}>{partnerPerspective}</p>
          </div>

        </div>

        <NavButtons
          onBack={() => go(step - 1)}
          onNext={() => go(step + 1)}
          nextLabel={isMyPage ? (partnerName + "'s Profile →") : "Communication Action Plan →"}
        />
      </ResultsSlide>
    </MaybeNav>
    );
  }

  // -- SUMMARY -- dark navy, mirrors overview --
  const coupleStrengths = sortedFeedback.filter(f => f.gap <= 1);
  const coupleGrowth = sortedFeedback.filter(f => f.gap > 1);

  // Each person's most distinct orientation (furthest from 3 = neutral)
  const myStrongest = [...DIMS].sort((a,b) => Math.abs(myS[b]-3) - Math.abs(myS[a]-3))[0];
  const partnerStrongest = [...DIMS].sort((a,b) => Math.abs(partS[b]-3) - Math.abs(partS[a]-3))[0];
  const myOrientation = myS[myStrongest] < 3 ? DIM_META[myStrongest].ends[0] : DIM_META[myStrongest].ends[1];
  const partnerOrientation = partS[partnerStrongest] < 3 ? DIM_META[partnerStrongest].ends[0] : DIM_META[partnerStrongest].ends[1];

  return (
    <MaybeNav noSideNav={noSideNav} navItems={personalityNavItems} currentStep={step} onGo={go} accent="#E8673A">
      <ResultsSlide bg="linear-gradient(145deg, #0f0c29, #302b63, #24243e)">
      <link href={FONT_URL} rel="stylesheet" />
      <div style={{ color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: "0.3rem", fontFamily: BFONT }}>How You Work as a Couple</div>
            <div style={{ fontSize: "clamp(1.6rem,5vw,2.2rem)", fontWeight: 700, fontFamily: HFONT, lineHeight: 1.0 }}>{userName} & {partnerName}</div>
          </div>

        </div>

        {/* Strengths, green tinted tiles */}
        {coupleStrengths.length > 0 && (
          <div style={{ background: "rgba(76,175,80,0.12)", borderRadius: 16, padding: "1.1rem 1.25rem", marginBottom: "0.75rem", border: "1px solid rgba(76,175,80,0.25)" }}>
            <div style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#66BB6A", fontWeight: 700, marginBottom: "0.85rem", fontFamily: BFONT }}>* Your shared strengths</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              {coupleStrengths.map(f => {
                const m = DIM_META[f.dim];
                return (
                  <div key={f.dim} onClick={() => go(sortedFeedback.indexOf(f) + 1)}
                    style={{ background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "0.75rem 0.85rem", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.14)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "white", fontFamily: BFONT, lineHeight: 1.2, marginBottom: "0.2rem" }}>{m.label}</div>
                    <div style={{ fontSize: "0.65rem", color: "#66BB6A", fontFamily: BFONT, lineHeight: 1.35 }}>{dimHeadline(f.dim, f.gap)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Growth, amber tinted tiles */}
        {coupleGrowth.length > 0 && (
          <div style={{ background: "rgba(255,152,0,0.1)", borderRadius: 16, padding: "1.1rem 1.25rem", marginBottom: "0.75rem", border: "1px solid rgba(255,152,0,0.2)" }}>
            <div style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#FFA726", fontWeight: 700, marginBottom: "0.85rem", fontFamily: BFONT }}>Where you can grow</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              {coupleGrowth.map(f => {
                const m = DIM_META[f.dim];
                return (
                  <div key={f.dim} onClick={() => go(sortedFeedback.indexOf(f) + 1)}
                    style={{ background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "0.75rem 0.85rem", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.14)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "white", fontFamily: BFONT, lineHeight: 1.2, marginBottom: "0.2rem" }}>{m.label}</div>
                    <div style={{ fontSize: "0.63rem", color: "#FFA726", fontFamily: BFONT, lineHeight: 1.45 }}>{dimHeadline(f.dim, f.gap)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Individual profiles, 2 & 4: clear label, clickable */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "0.75rem" }}>
          {[[userName, myStrongest, myOrientation, myS, "#2196F3"],[partnerName, partnerStrongest, partnerOrientation, partS, "#9C27B0"]].map(([name, strongDim, orient, scores, color]) => (
            <div key={name}
              onClick={() => go(sortedFeedback.indexOf(sortedFeedback.find(f => f.dim === strongDim)) + 1)}
              style={{ background: "rgba(255,255,255,0.07)", borderRadius: 14, padding: "1rem", cursor: "pointer", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.13)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}>
              <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color, fontWeight: 700, marginBottom: "0.5rem", fontFamily: BFONT }}>{name}</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "white", fontFamily: BFONT, lineHeight: 1.25, marginBottom: "0.15rem" }}>{orient}</div>
            </div>
          ))}
        </div>

        {/* Action plan strip */}
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.4)", fontWeight: 700, marginBottom: "0.6rem", fontFamily: BFONT }}>Your next moves</div>
          {protocols.slice(0,3).map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: i < protocols.slice(0,3).length - 1 ? "0.5rem" : 0 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.3)", flexShrink: 0, display: "inline-block" }} />
              <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.75)", fontFamily: BFONT, fontWeight: 500 }}>{p.title}</span>
            </div>
          ))}
          {protocols.length > 3 && <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", marginTop: "0.5rem", fontFamily: BFONT }}>+ {protocols.length - 3} more in your action plan</div>}
        </div>
      </div>

      {/* Raw responses */}
      <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, overflow: "hidden", marginTop: "1rem" }}>
        <button onClick={() => setShowRaw(s => !s)} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "none", padding: "1rem 1.4rem", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontFamily: BFONT }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>Individual responses</span>
          <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>{showRaw ? "^" : "v"}</span>
        </button>
        {showRaw && (
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "0 1.4rem 1.4rem" }}>
            {PERSONALITY_QUESTIONS.map(q => {
              const myV = myAnswers[q.id], theirV = partnerAnswers[q.id];
              const m = DIM_META[q.dimension];
              return (
                <div key={q.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0.9rem 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                    <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.45, fontFamily: BFONT }}>{q.text}</p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    {[[userName, myV, "rgba(255,255,255,0.08)"],[partnerName, theirV, "rgba(255,255,255,0.05)"]].map(([name, v, bg]) => (
                      <div key={name} style={{ background: bg, padding: "0.55rem 0.8rem", borderRadius: 8 }}>
                        <p style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.65)", marginBottom: "0.2rem", fontFamily: BFONT }}>{name}</p>
                        <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.85)", fontWeight: 500, fontFamily: BFONT, lineHeight: 1.4 }}>{v ? (v <= 2 ? ("A, " + (q.a.split(", ")[0] || q.a.substring(0,40)) + "...") : v === 3 ? "Neutral" : ("B, " + (q.b.split(", ")[0] || q.b.substring(0,40)) + "...")) : ", "}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <NavButtons onBack={() => go(step - 1)} onNext={() => {}} nextLabel="Done" nextDisabled />
    </ResultsSlide>
    </MaybeNav>
  );
}


// -- EXPECTATIONS// -- EXPECTATIONS RESULTS -- VISUAL FLOW --
const EXP_CAT_COLORS = ["#2196F3","#FF9800","#E8673A","#9C27B0","#4CAF50","#FF5722","#00BCD4","#795548","#FFC107","#3F51B5"];
const EXP_CAT_BGS    = ["#E8F4FD","#FFF3E0","#FCE4EC","#F3E5F5","#E8F5E9","#FBE9E7","#E0F7FA","#EFEBE9","#FFFDE7","#E8EAF6"];

// Category importance weight -- higher = more significant conversations (item 8)
const CAT_WEIGHT = {
  "Intimacy": 5, "Parenting": 5, "Career": 4, "Extended Family": 4,
  "Money Values": 4, "Finances": 3, "Social Life": 3,
  "Family Life": 2, "Home": 2, "Health": 2,
};

// Unique origin context per gap -- avoids repeated phrases (item 12)
function buildOriginNote(g, userName, partnerName, gapIdx) {
  return null; // Origin tracking removed from simplified exercise
}
function ExpectationsResults({ myAnswers, partnerAnswers, userName, partnerName, forcedSection, noSideNav = false, onGoWhatComesNext, onExternalGo }) {
  // ── Fixed 5 display categories ──────────────────────────────────────────────
  // ── Step system: 0=overview, 1=common-ground, 2=convos-landing,
  //                "convo-0".."convo-4"=individual cats, "action-plan"=plan, "summary"=summary
  const sectionToStep = (s) => {
    if (!s || s === "overview") return 0;
    if (s === "common-ground") return 1;
    if (s === "conversations") return 2;
    if (s === "action-plan") return "action-plan";
    if (s === "summary") return "summary";
    // "convo-N" comes in directly from UnifiedResults routing — pass through as-is
    if (typeof s === "string" && s.startsWith("convo-")) return s;
    // Category IDs like "household", "financial" — find their convo index
    const catIdx = FIXED_CATS.findIndex(c => c.id === s);
    if (catIdx >= 0) return `convo-${catIdx}`;
    return 0;
  };

  const [step, setStep] = useState(sectionToStep(forcedSection));
  useEffect(() => { setStep(sectionToStep(forcedSection)); }, [forcedSection]);
  const [showRaw, setShowRaw] = useState(false);

  const go = (s) => {
    setStep(s);
    if (onExternalGo) onExternalGo(s);
    const sc = document.querySelector("[data-results-scroll]");
    if (sc) sc.scrollTop = 0; else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Build rows from responsibilities ─────────────────────────────────────────
  const rows = [];
  RESPONSIBILITY_CATEGORIES.forEach(cat => {
    cat.items.forEach(item => {
      const key = `${cat.id}__${item}`;
      const mine = myAnswers.responsibilities?.[key];
      const theirs = partnerAnswers.responsibilities?.[key];
      if (!mine || !theirs) return;
      rows.push({ category: cat.label, catId: cat.id, item, mine, theirs, aligned: mine === theirs });
    });
  });

  // Life questions — all grouped as "Life & Values"
  const lifeRows = LIFE_QUESTIONS.map(q => ({
    category: "Life & Values", catId: "life", item: q.text,
    mine: myAnswers.life?.[q.id], theirs: partnerAnswers.life?.[q.id],
    aligned: myAnswers.life?.[q.id] === partnerAnswers.life?.[q.id],
  })).filter(r => r.mine && r.theirs);

  // ── Derive couple type context for expectations overview ─────────────────────
  const expMyS = calcDimScores(myAnswers);
  const expPartS = calcDimScores(partnerAnswers);
  const expNewType = (expMyS && expPartS && Object.keys(expMyS).length > 0 && Object.keys(expPartS).length > 0)
    ? deriveNewCoupleType(expMyS, expPartS) : null;
  const coupleTypeName = expNewType?.name || null;
  const coupleTypeColor = expNewType?.color || "#E8673A";
  const EXP_COUPLE_CONTEXT = {
    WW: "Two Initiators both lean toward open expression. When expectations differ, you'll likely name it — the work is making sure you've actually heard each other before resolving.",
    XX: "The collaboration tend to move through disagreement efficiently. Watch that practical resolution doesn't skip the emotional weight of what's actually at stake.",
    YY: "Two Feelers both carry feeling deeply. When an expectation gap lands hard, give each other the space before the conversation — it'll go better for it.",
    ZZ: "Two Holders may let things sit. Build a deliberate practice of raising misaligned expectations before they calcify into resentment.",
    WX: "One of you will surface expectation gaps readily; the other processes first. The one who brings it up isn't necessarily the one who cares more.",
    WY: "Different conflict clocks apply here too. The one who names the expectation gap first isn't pushing — they're ready. The other will need a moment before the conversation is possible.",
    WZ: "The Initiator will name gaps; The Protector will need time to respond. That asymmetry is wiring, not avoidance — name that explicitly.",
    XY: "The Anchor wants to resolve quickly; The Feeler needs space to process. Neither is wrong. Build a return window into any expectation conversation.",
    XZ: "Both of you hold things close. Expectation gaps that go unnamed can accumulate quietly — schedule the conversation, don't wait for it to happen organically.",
    YZ: "Both withdraw under pressure. When an expectation surfaces, one of you will need to come back first — let that be the agreed pattern.",
  };
  const pairKey = expNewType ? [expNewType.typeInfoA.typeCode, expNewType.typeInfoB.typeCode].sort().join("") : null;
  const coupleTypeExpContext = pairKey ? EXP_COUPLE_CONTEXT[pairKey] || null : null;

  const allRows = [...rows, ...lifeRows];
  const aligned = allRows.filter(r => r.aligned);
  const gaps = allRows.filter(r => !r.aligned);

  const resolveLabel = (val) => {
    if (!val) return val;
    if (val === "Partner A") return userName;
    if (val === "Partner B") return partnerName;
    return val;
  };

  // Stats per fixed category
  const catData = FIXED_CATS.map(fc => {
    const catRows = allRows.filter(r => r.catId === fc.id);
    const catGaps = catRows.filter(r => !r.aligned);
    const catAligned = catRows.filter(r => r.aligned);
    return { ...fc, rows: catRows, gaps: catGaps, aligned: catAligned, hasGaps: catGaps.length > 0, fullyAligned: catGaps.length === 0 && catRows.length > 0 };
  });

  // Fully aligned cats (no gaps at all)
  const fullyAlignedCats = catData.filter(c => c.fullyAligned);
  // Cats with any gaps
  const gapCats = catData.filter(c => c.hasGaps);

  // ── Nav items ─────────────────────────────────────────────────────────────────
  const expectationsNavItems = [
    { label: "Overview", step: 0 },
    { label: "Common Ground", step: 1 },
    { label: "Conversations Worth Having", step: 2 },
    ...FIXED_CATS.map((fc, i) => ({
      label: fc.label, step: `convo-${i}`, isChild: true,
      onClick: () => go(`convo-${i}`),
    })),
    { label: "Expectations Action Plan", step: "action-plan", onClick: () => go("action-plan") },
  ];

  // navCurrentStep passed directly — SideNav matches by exact equality
  const navCurrentStep = step;

  // ── STEP 0: OVERVIEW ─────────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <MaybeNav noSideNav={noSideNav} navItems={expectationsNavItems} currentStep={navCurrentStep} onGo={go} accent="#1B5FE8">
        <ResultsSlide bg="linear-gradient(145deg, #0f0c29, #302b63, #24243e)">
          <link href={FONT_URL} rel="stylesheet" />
          <div style={{ color: "white" }}>
            {/* Header */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: "0.5rem", fontFamily: BFONT }}>What You Expect</div>
              <div style={{ fontSize: "clamp(1.8rem,6vw,2.8rem)", fontWeight: 700, fontFamily: HFONT, lineHeight: 1.0, marginBottom: "0.6rem" }}>{userName} & {partnerName}</div>

              {/* ── COUPLE TYPE CONTEXT ── */}
              {coupleTypeName && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.55rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "0.7rem 0.85rem", marginBottom: "0.85rem" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: coupleTypeColor, flexShrink: 0, marginTop: 5 }}/>
                  <p style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.65)", fontFamily: BFONT, fontWeight: 300, lineHeight: 1.6, margin: 0 }}>
                    <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>{coupleTypeName}: </span>
                    {coupleTypeExpContext}
                  </p>
                </div>
              )}

              {/* Already aligned / Worth discussing counts */}
              <div style={{ display: "flex", gap: "1.25rem", marginBottom: "0.35rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
                  <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.82)", fontFamily: BFONT }}>Already aligned: <strong>{aligned.length}</strong></span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#E8673A", flexShrink: 0 }} />
                  <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.82)", fontFamily: BFONT }}>Worth discussing: <strong>{gaps.length}</strong></span>
                </div>
              </div>
            </div>

            {/* ── EXPECTATIONS ALIGNMENT SCALE ── */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "1rem 1.1rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.7rem" }}>
                <div style={{ fontSize: "0.55rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: BFONT, fontWeight: 700 }}>Alignment by category</div>
                <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", fontFamily: BFONT }}>% aligned</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                {catData.filter(fc => fc.rows.length > 0).map(fc => {
                  const pct = fc.rows.length > 0 ? Math.round((fc.aligned.length / fc.rows.length) * 100) : 0;
                  const isStrong = pct >= 80;
                  const barColor = isStrong ? "#10b981" : pct >= 50 ? "#E8673A" : "#F87171";
                  return (
                    <div key={fc.id} onClick={() => go(`convo-${FIXED_CATS.indexOf(fc)}`)}
                      style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "0.55rem" }}>
                      <span style={{ fontSize: "0.63rem", color: "rgba(255,255,255,0.65)", fontFamily: BFONT, flexShrink: 0, width: "clamp(96px,32%,130px)", lineHeight: 1.25 }}>{fc.label}</span>
                      <div style={{ flex: 1, position: "relative", height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 999 }}>
                        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: barColor, borderRadius: 999, transition: "width 0.3s" }} />
                      </div>
                      <span style={{ fontSize: "0.6rem", color: barColor, fontFamily: BFONT, fontWeight: 700, flexShrink: 0, minWidth: "32px", textAlign: "right" }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem" }}>
                <span style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.2)", fontFamily: BFONT }}>0%</span>
                <span style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.2)", fontFamily: BFONT }}>100% aligned</span>
              </div>
            </div>

            {/* Strong alignment — fully aligned categories */}
            {fullyAlignedCats.length > 0 && (
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#10b981", fontFamily: BFONT, fontWeight: 700, marginBottom: "0.55rem" }}>Strong alignment</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  {fullyAlignedCats.map((fc, i) => {
                    const catAligned = aligned.filter(r => r.catId === fc.id).length;
                    return (
                    <div key={fc.id} onClick={() => go(`convo-${FIXED_CATS.indexOf(fc)}`)}
                      style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.45rem 0.75rem", borderRadius: 8, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.22)", cursor: "pointer", transition: "background 0.12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(16,185,129,0.18)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(16,185,129,0.1)"}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
                      <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.88)", fontFamily: BFONT, flex: 1 }}>{fc.label}</span>
                      <span style={{ fontSize: "0.6rem", color: "rgba(16,185,129,0.65)", fontFamily: BFONT }}>{catAligned} aligned ·</span>
                      <span style={{ fontSize: "0.62rem", color: "rgba(16,185,129,0.7)", fontFamily: BFONT }}>→</span>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            
            {/* What's in this section */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "0.85rem" }}>
              <div style={{ fontSize: "0.55rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: BFONT, fontWeight: 700, marginBottom: "0.5rem" }}>What's in this section</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {[
                  { label: "Common ground", sub: `${aligned.length} areas you already agree on`, s: 1 },
                  { label: "Conversations worth having", sub: `${gaps.length} topics to discuss together`, s: 2 },
                  { label: "Expectations Action Plan", sub: "Your discussion guide", s: "action-plan" },
                ].map(({ label, sub, s }) => (
                  <div key={label} onClick={() => typeof s === "string" ? go(s) : go(s)}
                    style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.45rem 0.75rem", borderRadius: 8, background: "rgba(255,255,255,0.04)", cursor: "pointer", transition: "all 0.12s", border: "1px solid rgba(255,255,255,0.06)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.09)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.72)", fontFamily: BFONT }}>{label}</div>
                      <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.35)", fontFamily: BFONT, marginTop: "0.1rem" }}>{sub}</div>
                    </div>
                    <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.25)", fontFamily: BFONT, flexShrink: 0 }}>→</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <NavButtons onBack={() => {}} backDisabled onNext={() => go(1)} nextLabel="Common Ground →" />
        </ResultsSlide>
      </MaybeNav>
    );
  }

  // ── STEP 1: COMMON GROUND ─────────────────────────────────────────────────────
  if (step === 1) {
    const byCat = FIXED_CATS.map(fc => ({
      ...fc,
      items: aligned.filter(r => r.catId === fc.id),
    })).filter(c => c.items.length > 0);
    return (
      <MaybeNav noSideNav={noSideNav} navItems={expectationsNavItems} currentStep={navCurrentStep} onGo={go} accent="#1B5FE8">
        <ResultsSlide bg="linear-gradient(135deg, #f0fff4, #e8f5e9)">
          <link href={FONT_URL} rel="stylesheet" />
          <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#4CAF50", fontWeight: 700, marginBottom: "0.4rem", fontFamily: BFONT }}>Common Ground</div>
          <div style={{ fontSize: "clamp(1.6rem,5vw,2.2rem)", fontWeight: 700, color: "#2a2848", lineHeight: 1.1, marginBottom: "0.5rem", fontFamily: HFONT }}>{aligned.length} things you already agree on.</div>
          <p style={{ fontSize: "0.85rem", color: "#555", marginBottom: "1.75rem", lineHeight: 1.72, fontFamily: BFONT, fontWeight: 300 }}>These are the expectations you already hold in common — no negotiation needed. This is your foundation.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "0.5rem" }}>
            {byCat.map(({ label, color, items }) => (
              <div key={label} style={{ background: "white", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <div style={{ background: color, padding: "0.55rem 1.25rem", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: BFONT }}>{label}</span>
                  <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.85)", fontFamily: BFONT }}>{items.length} aligned</span>
                </div>
                {items.map((r, i) => (
                  <div key={r.item} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "start", padding: "0.62rem 1.25rem", borderBottom: i < items.length - 1 ? "1px solid #f5f5f5" : "none", gap: "0.75rem" }}>
                    <span style={{ fontSize: "0.78rem", color: "#888", fontFamily: BFONT, fontWeight: 400, paddingTop: "0.1rem" }}>{r.item}</span>
                    <span style={{ fontSize: "0.82rem", color: "#333", fontWeight: 600, fontFamily: BFONT, lineHeight: 1.4 }}>{resolveLabel(r.mine)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <NavButtons onBack={() => go(0)} onNext={() => go(2)} nextLabel="Conversations Worth Having →" />
        </ResultsSlide>
      </MaybeNav>
    );
  }

  // ── STEP 2: CONVERSATIONS LANDING ─────────────────────────────────────────────
  if (step === 2) {
    return (
      <MaybeNav noSideNav={noSideNav} navItems={expectationsNavItems} currentStep={navCurrentStep} onGo={go} accent="#1B5FE8">
        <ResultsSlide bg="linear-gradient(145deg, #1a0a2e, #2d1b4e, #1e1535)">
          <link href={FONT_URL} rel="stylesheet" />
          <div style={{ color: "white" }}>
            <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.72)", marginBottom: "1rem", fontFamily: BFONT }}>Time to talk</div>
            <div style={{ fontSize: "clamp(2rem,7vw,3rem)", fontWeight: 700, fontFamily: HFONT, lineHeight: 1.0, marginBottom: "0.85rem" }}>Conversations<br />Worth Having.</div>
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.65)", fontFamily: BFONT, fontWeight: 300, lineHeight: 1.65, marginBottom: "1.25rem" }}>
              {gaps.length > 0
                ? `${gaps.length} topic${gaps.length !== 1 ? "s" : ""} across ${FIXED_CATS.filter(fc => gaps.some(r => r.catId === fc.id)).length} of 5 areas. These aren't warning signs, they're openings.`
                : "You're aligned across every area. Review each category below."}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {FIXED_CATS.map((fc, i) => {
                const catGaps = gaps.filter(r => r.catId === fc.id);
                const hasGap = catGaps.length > 0;
                return (
                  <div key={fc.id} onClick={() => go(`convo-${i}`)}
                    style={{ display: "flex", alignItems: "center", gap: "1rem", background: hasGap ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)", borderRadius: 14, padding: "0.85rem 1.25rem", cursor: "pointer", transition: "background 0.15s", border: hasGap ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.04)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.13)"}
                    onMouseLeave={e => e.currentTarget.style.background = hasGap ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: hasGap ? (fc.color || "#E8673A") : "#10b981", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "white", fontFamily: BFONT }}>{fc.label}</div>
                      <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.55)", fontFamily: BFONT }}>
                        {hasGap ? `${catGaps.length} topic${catGaps.length !== 1 ? "s" : ""} to discuss` : "Fully aligned ✓"}
                      </div>
                    </div>
                    <span style={{ fontSize: "1.1rem", color: hasGap ? fc.color : "rgba(16,185,129,0.6)", lineHeight: 1 }}>→</span>
                  </div>
                );
              })}
            </div>
          </div>
          <NavButtons onBack={() => go(1)} onNext={() => go("convo-0")} nextLabel={`Start: ${FIXED_CATS[0].label} →`} />
        </ResultsSlide>
      </MaybeNav>
    );
  }

  // ── CONVO-N: INDIVIDUAL CATEGORY PAGES ───────────────────────────────────────
  const convoMatch = typeof step === "string" && step.startsWith("convo-");
  if (convoMatch) {
    const catIdx = parseInt(step.split("-")[1]);
    const fc = FIXED_CATS[catIdx];
    const thisCatGaps = gaps.filter(r => r.catId === fc.id);
    const thisCatAligned = aligned.filter(r => r.catId === fc.id);
    const isLastCat = catIdx === FIXED_CATS.length - 1;

    const catNarration = {
      household: "Day-to-day domestic expectations are easy to assume rather than discuss. Getting explicit about them removes a major source of slow-build resentment.",
      financial: "Beneath money disagreements is usually a difference in values, not just numbers. The question worth asking: what do you each want money to make possible?",
      career: "How you think about work, ambition, and sacrifice for each other's careers will evolve. These conversations lay groundwork before the hard moments arrive.",
      emotional: "The invisible work of a relationship — tracking, anticipating, initiating — is the category most couples never name. Naming it changes how it lands.",
      life: "These are the questions couples most often assume they agree on — and least often actually discuss. Values, children, faith, independence. The conversations that shape everything else.",
      life: "These are the bigger-picture expectations: children, family, where you live, and how you want your life to feel. Getting aligned on these now is one of the most valuable things a couple can do.",
    };

    return (
      <MaybeNav noSideNav={noSideNav} navItems={expectationsNavItems} currentStep={navCurrentStep} onGo={go} accent="#1B5FE8">
        <ResultsSlide bg={fc.bg}>
          <link href={FONT_URL} rel="stylesheet" />

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "0.5rem" }}>
            <div style={{ fontSize: "1.65rem", fontFamily: HFONT, fontWeight: 700, letterSpacing: "-0.02em", background: "linear-gradient(135deg,#E8673A,#9B5DE5,#1B5FE8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1 }}>
              {fc.label}
            </div>
            <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", fontFamily: BFONT, paddingBottom: "0.1rem" }}>{catIdx + 1} of {FIXED_CATS.length}</span>
          </div>

          {/* Progress */}
          <div style={{ height: 2, background: "rgba(255,255,255,0.1)", borderRadius: 2, marginBottom: "1.25rem" }}>
            <div style={{ height: "100%", background: fc.color, borderRadius: 2, width: `${((catIdx + 1) / FIXED_CATS.length) * 100}%`, transition: "width 0.3s" }} />
          </div>

          {/* ── FOCAL POINT: Couple-type starter ── */}
          <div style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.13)", borderRadius: 14, padding: "1.1rem 1.3rem", marginBottom: "1.4rem" }}>
            <div style={{ fontSize: "0.55rem", letterSpacing: "0.2em", textTransform: "uppercase", color: coupleTypeColor || "#E8673A", fontFamily: BFONT, fontWeight: 700, marginBottom: "0.55rem", opacity: 0.9 }}>
              {coupleTypeName ? `How ${userName} & ${partnerName} need to approach these conversations` : "How to approach these conversations"}
            </div>
            <p style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.85)", fontFamily: BFONT, fontWeight: 400, lineHeight: 1.7, margin: 0 }}>
              {(coupleTypeName && EXP_CAT_STARTERS[fc.id]?.[pairKey])
                ? EXP_CAT_STARTERS[fc.id][pairKey]
                : catNarration[fc.id]}
            </p>
          </div>

          {thisCatGaps.length === 0 ? (
            <div style={{ background: "rgba(16,185,129,0.1)", border: "1.5px solid rgba(16,185,129,0.25)", borderRadius: 14, padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(16,185,129,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#065F46", fontFamily: BFONT }}>Fully aligned here.</div>
                <div style={{ fontSize: "0.78rem", color: "#047857", fontFamily: BFONT, fontWeight: 300, lineHeight: 1.5 }}>You and {partnerName} are on the same page across all {thisCatAligned.length} items.</div>
              </div>
            </div>
          ) : (() => {
            const childLabel = (val) => {
              if (!val) return "—";
              if (val === "N/A" || val === "Didn't apply") return "—";
              return val;
            };
            const hasAnyChildhood = thisCatGaps.some(g => {
              const ck = `${fc.id}__${g.item}`;
              return myAnswers?.childhood?.[ck] || partnerAnswers?.childhood?.[ck];
            });
            return (
              <div style={{ background: "white", borderRadius: 14, overflow: "hidden", border: `1.5px solid ${fc.color}20` }}>
                {/* Section label */}
                <div style={{ padding: "0.65rem 1rem", borderBottom: `1px solid ${fc.color}18`, background: fc.color + "0c" }}>
                  <span style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: fc.color, fontFamily: BFONT }}>Conversations to have</span>
                </div>
                {/* Column headers: names centered over their 2-column groups */}
                <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr", gap: 0, padding: "0.55rem 1rem 0" }}>
                  <div />
                  <div style={{ gridColumn: "span 2", textAlign: "center", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: fc.color, fontFamily: BFONT, paddingBottom: "0.4rem", borderBottom: `2.5px solid ${fc.color}40` }}>{userName}</div>
                  <div style={{ gridColumn: "span 2", textAlign: "center", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#777", fontFamily: BFONT, paddingBottom: "0.4rem", borderBottom: "2.5px solid rgba(0,0,0,0.12)" }}>{partnerName}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr", gap: 0, borderBottom: `1px solid ${fc.color}15` }}>
                  <div style={{ padding: "0.25rem 1rem 0.4rem" }} />
                  <div style={{ background: fc.color + "0a", padding: "0.2rem 0 0.4rem", textAlign: "center", fontSize: "0.5rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: fc.color, fontFamily: BFONT }}>Expects</div>
                  {hasAnyChildhood && <div style={{ background: fc.color + "06", padding: "0.2rem 0 0.4rem", textAlign: "center", fontSize: "0.5rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: fc.color, fontFamily: BFONT, opacity: 0.6 }}>Experienced</div>}
                  <div style={{ background: "rgba(0,0,0,0.025)", borderLeft: "1px solid rgba(0,0,0,0.07)", padding: "0.2rem 0 0.4rem", textAlign: "center", fontSize: "0.5rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999", fontFamily: BFONT }}>Expects</div>
                  {hasAnyChildhood && <div style={{ background: "rgba(0,0,0,0.015)", padding: "0.2rem 0 0.4rem", textAlign: "center", fontSize: "0.5rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#bbb", fontFamily: BFONT }}>Experienced</div>}
                </div>
                {/* Rows */}
                {thisCatGaps.map((g, gi) => {
                  const ck = `${fc.id}__${g.item}`;
                  const myChild = myAnswers?.childhood?.[ck];
                  const partChild = partnerAnswers?.childhood?.[ck];
                  const isLast = gi === thisCatGaps.length - 1;
                  return (
                    <div key={gi} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr", gap: 0, padding: "0.65rem 1rem", borderTop: `1px solid ${fc.color}10`, alignItems: "center", background: gi % 2 === 1 ? fc.color + "06" : "transparent" }}>
                      {/* Responsibility name */}
                      <div style={{ fontSize: "0.78rem", fontWeight: 500, color: "#2a2848", fontFamily: BFONT, lineHeight: 1.35, paddingRight: "0.75rem" }}>{g.item}</div>
                      {/* userName expects */}
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: fc.color, fontFamily: BFONT, lineHeight: 1.35, textAlign: "center", background: fc.color + "0d", borderRadius: 6, padding: "0.2rem 0.4rem", margin: "0 0.25rem" }}>{resolveLabel(g.mine) || "—"}</div>
                      {/* userName experienced */}
                      {hasAnyChildhood && <div style={{ fontSize: "0.72rem", color: "#aaa", fontFamily: BFONT, fontStyle: "italic", lineHeight: 1.35, textAlign: "center" }}>{childLabel(myChild)}</div>}
                      {/* partnerName expects */}
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#555", fontFamily: BFONT, lineHeight: 1.35, textAlign: "center", background: "rgba(0,0,0,0.04)", borderRadius: 6, padding: "0.2rem 0.4rem", margin: "0 0.25rem", borderLeft: "1px solid rgba(0,0,0,0.07)" }}>{resolveLabel(g.theirs) || "—"}</div>
                      {/* partnerName experienced */}
                      {hasAnyChildhood && <div style={{ fontSize: "0.72rem", color: "#aaa", fontFamily: BFONT, fontStyle: "italic", lineHeight: 1.35, textAlign: "center" }}>{childLabel(partChild)}</div>}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          <NavButtons
            onBack={() => catIdx > 0 ? go(`convo-${catIdx - 1}`) : go(2)}
            onNext={() => isLastCat ? go("action-plan") : go(`convo-${catIdx + 1}`)}
            nextLabel={isLastCat ? "Action Plan →" : `Next: ${FIXED_CATS[catIdx + 1].label} →`}
          />
        </ResultsSlide>
      </MaybeNav>
    );
  }

  // ── ACTION PLAN ──────────────────────────────────────────────────────────────
  if (step === "action-plan") {
    const checklistItems = FIXED_CATS.map(fc => ({
      ...fc,
      gapItems: gaps.filter(r => r.catId === fc.id),
    })).filter(c => c.gapItems.length > 0);

    return (
      <MaybeNav noSideNav={noSideNav} navItems={expectationsNavItems} currentStep={navCurrentStep} onGo={go} accent="#1B5FE8">
        <ResultsSlide bg="linear-gradient(145deg, #0f0c29, #302b63, #24243e)">
          <link href={FONT_URL} rel="stylesheet" />
          <div style={{ color: "white" }}>
            <div style={{ fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: "0.5rem", fontFamily: BFONT }}>Expectations Action Plan</div>
            <div style={{ fontSize: "clamp(1.6rem,5vw,2.2rem)", fontWeight: 700, fontFamily: HFONT, lineHeight: 1.1, marginBottom: "0.4rem" }}>What to discuss.</div>
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.55)", fontFamily: BFONT, fontWeight: 300, lineHeight: 1.6, marginBottom: "1.5rem" }}>
              {checklistItems.length > 0
                ? `${gaps.length} topics across ${checklistItems.length} area${checklistItems.length !== 1 ? "s" : ""} where you have different assumptions. Work through these together.`
                : "You're aligned across all areas. Nothing to work through — just keep staying current with each other."}
            </p>

            {checklistItems.length === 0 ? (
              <div style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 16, padding: "1.5rem", textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✓</div>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "white", fontFamily: BFONT }}>Fully aligned on all expectations.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {checklistItems.map(fc => (
                  <div key={fc.id} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ background: fc.color + "22", borderBottom: `1px solid ${fc.color}30`, padding: "0.55rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, color: fc.color, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: BFONT }}>{fc.label}</span>
                      <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", fontFamily: BFONT }}>{fc.gapItems.length} topic{fc.gapItems.length !== 1 ? "s" : ""}</span>
                    </div>
                    {fc.gapItems.map((g, gi) => (
                      <div key={gi} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.65rem 1rem", borderBottom: gi < fc.gapItems.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${fc.color}88`, flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.78)", fontFamily: BFONT, lineHeight: 1.45 }}>{g.item}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Download action plan */}
          <button onClick={() => {
            const lines = ["EXPECTATIONS ACTION PLAN", "━".repeat(40), `${userName} & ${partnerName}`, "", ...checklistItems.flatMap(fc => [fc.label.toUpperCase(), ...fc.gapItems.map(g => "• " + g.item), ""])];
            const blob = new Blob([lines.join("\n")], { type: "text/plain" });
            const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
            a.download = "Attune_Expectations_Action_Plan.txt"; a.click();
          }} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)", borderRadius: 9, padding: "0.5rem 1rem", fontSize: "0.72rem", fontWeight: 600, fontFamily: BFONT, cursor: "pointer", marginTop: "0.75rem", marginBottom: "0.25rem" }}>
            ↓ Download action plan
          </button>
          <NavButtons onBack={() => go(`convo-${FIXED_CATS.length - 1}`)} onNext={onGoWhatComesNext || (() => {})} nextLabel={onGoWhatComesNext ? "What Comes Next →" : "Done"} nextDisabled={!onGoWhatComesNext} />
        </ResultsSlide>
      </MaybeNav>
    );
  }

  return null;
}
const ANNIVERSARY_QUESTIONS = [
  // Warm-up: light, accessible
  { id: "a0", category: "Getting Started", type: "scale", text: "Right now, how would you describe the overall feel of our relationship?", scaleLabels: ["Needs real work", "Going through a rough patch", "Solid and steady", "Really good", "Better than ever"], scaleColors: ["#ef4444","#f97316","#eab308","#22c55e","#10b981"] },
  { id: "a_memory", category: "Getting Started", type: "text", text: "Something small that happened recently that made me smile about us:", placeholder: "e.g. A quiet moment, something you said, something we laughed about..." },
  // Milestones
  { id: "a1", category: "Milestones", type: "text", text: "The moment I felt most proud of us as a couple:", placeholder: "e.g. When we navigated something hard together, or when we supported each other through..." },
  { id: "a2", category: "Milestones", type: "text", text: "A challenge we faced together that made our relationship stronger:", placeholder: "e.g. Moving cities, a hard year, a disagreement we worked through..." },
  // How we're doing — connection, communication, admiration, fun
  { id: "a_sat_conn", category: "How We're Doing", type: "scale", text: "How connected do I feel to you day-to-day right now?", scaleLabels: ["Not very connected", "A bit distant", "Somewhat connected", "Quite connected", "Very connected"], scaleColors: ["#ef4444","#f97316","#eab308","#22c55e","#10b981"] },
  { id: "a_sat_comm", category: "How We're Doing", type: "scale", text: "How well do I feel we communicate when something is bothering one of us?", scaleLabels: ["We avoid it", "It's hard", "We manage", "Pretty well", "Really well"], scaleColors: ["#ef4444","#f97316","#eab308","#22c55e","#10b981"] },
  { id: "a8", category: "How We're Doing", type: "pick", text: "The quality I most admire in my partner right now:", options: ["Patient","Funny","Supportive","Ambitious","Kind","Curious","Steady","Adventurous","Honest","Thoughtful"] },
  { id: "a_sat_fun", category: "How We're Doing", type: "scale", text: "How much do we prioritize fun and lightness together?", scaleLabels: ["Not enough", "Less than I'd like", "About right", "Quite a bit", "A lot"], scaleColors: ["#ef4444","#f97316","#eab308","#22c55e","#10b981"] },
  // Looking forward — priorities first, then 6mo, then honest reflection, then 5yr
  { id: "a_priority", category: "Looking Forward", type: "rank", text: "Rank these from most to least important to invest in together this year:", options: ["Quality time","Communication","Financial alignment","Physical intimacy","Shared adventures","Long-term planning"] },
  { id: "a6", category: "Looking Forward", type: "text", text: "One thing I want to work on, in the next 6 months, in how I show up for you:", placeholder: "e.g. Being more present, saying what I need directly, making more time for us..." },
  { id: "a7", category: "Looking Forward", type: "text", text: "Something we handled less well than I'd have liked — I wish we'd approached it differently:", placeholder: "e.g. A disagreement we got stuck on, a decision we made without fully talking it through..." },
  { id: "a5", category: "Looking Forward", type: "text", text: "Where I see us in 5 years, what matters most to me about that picture:", placeholder: "e.g. Financially stable and adventurous, close to family, in a home we love..." },
  // What matters — gratitude and intention, ends the exercise on a high note
  { id: "a3", category: "What Matters", type: "text", text: "The part of our relationship I'm most grateful for:", placeholder: "e.g. How you make me feel safe, the way we laugh together, the life we've built..." },
  { id: "a4", category: "What Matters", type: "text", text: "Something I want to do more of together in the next year:", placeholder: "e.g. Travel, slow weekends, have the big conversations, invest in our friendship..." },
];


function AnniversaryExercise({ userName, partnerName, onComplete, onBack }) {
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);
  const total = ANNIVERSARY_QUESTIONS.length;
  const q = ANNIVERSARY_QUESTIONS[step];
  // Scale questions are answered when they have a numeric value; text questions need non-empty string
  const isAnswered = (q, answers) => {
    if (q.type === "scale") return answers[q.id] !== undefined;
    if (q.type === "pick") return !!answers[q.id];
    if (q.type === "rank") return Array.isArray(answers[q.id]) && answers[q.id].length === q.options.length;
    return !!answers[q.id]?.trim();
  };
  const allDone = ANNIVERSARY_QUESTIONS.every(q => isAnswered(q, answers));

  const handleNext = () => {
    if (step < total - 1) setStep(step + 1);
  };
  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else onBack();
  };

  if (allDone && step >= total) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #1B5FE8, #3B3A8A)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem", fontSize: "1.8rem" }}>✓</div>
        <p style={{ fontFamily: font.display, fontSize: "1.8rem", fontWeight: 700, color: C.ink, marginBottom: "0.5rem" }}>Reflection Complete.</p>
        <p style={{ fontSize: "0.82rem", color: C.muted, fontFamily: font.body, marginBottom: "1.75rem", lineHeight: 1.7 }}>Your answers are saved. When {partnerName} completes theirs, you'll see a side-by-side view of your shared story.</p>
        <button onClick={() => onComplete(answers)} style={{ background: "linear-gradient(135deg, #1B5FE8, #3B3A8A)", color: "white", border: "none", padding: "0.85rem 2.25rem", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: font.body, borderRadius: 10, fontWeight: 600 }}>View My Results →</button>
      </div>
    );
  }

  const currentAnswered = isAnswered(q, answers);

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <button onClick={handleBack} style={{ background: "transparent", border: "none", color: C.muted, fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: font.body, padding: 0, marginBottom: "1.5rem", display: "block" }}>← Back</button>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#10b981", fontWeight: 700, fontFamily: font.body }}>Exercise 03 · Our Relationship Story</span>
        </div>
        <div style={{ background: C.stone + "40", borderRadius: 999, height: 4, marginBottom: "2rem" }}>
          <div style={{ background: "#1B5FE8", height: 4, borderRadius: 999, width: (((step) / total) * 100) + "%", transition: "width 0.3s" }} />
        </div>
        <span style={{ fontSize: "0.6rem", color: "#1B5FE8", fontWeight: 700, fontFamily: font.body, letterSpacing: "0.15em", textTransform: "uppercase" }}>{q.category}</span>
        <h2 style={{ fontFamily: font.display, fontSize: "1.35rem", fontWeight: 700, color: C.ink, margin: "0.5rem 0 1.5rem", lineHeight: 1.35 }}>{q.text}</h2>

        {q.type === "scale" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {q.scaleLabels.map((label, i) => {
              const selected = answers[q.id] === i;
              const color = q.scaleColors[i];
              return (
                <button key={i} onClick={() => setAnswers({ ...answers, [q.id]: i })}
                  style={{ display: "flex", alignItems: "center", gap: "0.85rem", background: selected ? color + "18" : "white", border: "1.5px solid " + (selected ? color : C.stone), borderRadius: 12, padding: "0.85rem 1.1rem", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid " + (selected ? color : C.stone), background: selected ? color : "white", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {selected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white" }} />}
                  </div>
                  <span style={{ fontSize: "0.88rem", color: selected ? color : C.text, fontFamily: font.body, fontWeight: selected ? 600 : 400 }}>{label}</span>
                </button>
              );
            })}
          </div>
        ) : q.type === "pick" ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
            {q.options.map((opt, i) => {
              const selected = answers[q.id] === opt;
              return (
                <button key={i} onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                  style={{ padding: "0.55rem 1.1rem", borderRadius: 999, border: "1.5px solid " + (selected ? "#1B5FE8" : C.stone), background: selected ? "#EEF2FF" : "white", color: selected ? "#1B5FE8" : C.text, fontFamily: font.body, fontSize: "0.85rem", fontWeight: selected ? 700 : 400, cursor: "pointer", transition: "all 0.15s" }}>
                  {opt}
                </button>
              );
            })}
          </div>
        ) : q.type === "rank" ? (() => {
          const ranked = answers[q.id] || [];
          const unranked = q.options.filter(o => !ranked.includes(o));
          const move = (item, dir) => {
            const arr = [...ranked];
            const idx = arr.indexOf(item);
            if (dir === "up" && idx > 0) { [arr[idx-1], arr[idx]] = [arr[idx], arr[idx-1]]; }
            if (dir === "down" && idx < arr.length-1) { [arr[idx], arr[idx+1]] = [arr[idx+1], arr[idx]]; }
            setAnswers({ ...answers, [q.id]: arr });
          };
          return (
            <div>
              <div style={{ fontSize: "0.65rem", color: C.muted, fontFamily: font.body, marginBottom: "0.75rem" }}>Tap an option to add it to your ranking, then use the arrows to reorder.</div>
              {ranked.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.75rem" }}>
                  {ranked.map((item, i) => (
                    <div key={item} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#EEF2FF", border: "1.5px solid #1B5FE8", borderRadius: 10, padding: "0.6rem 0.85rem" }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#1B5FE8", fontFamily: font.body, width: 20, flexShrink: 0 }}>#{i+1}</span>
                      <span style={{ flex: 1, fontSize: "0.85rem", color: C.ink, fontFamily: font.body }}>{item}</span>
                      <button onClick={() => move(item,"up")} disabled={i===0} style={{ background: "none", border: "none", cursor: i===0?"default":"pointer", color: i===0?C.stone:"#1B5FE8", fontSize: "0.8rem", padding: "0 0.2rem" }}>▲</button>
                      <button onClick={() => move(item,"down")} disabled={i===ranked.length-1} style={{ background: "none", border: "none", cursor: i===ranked.length-1?"default":"pointer", color: i===ranked.length-1?C.stone:"#1B5FE8", fontSize: "0.8rem", padding: "0 0.2rem" }}>▼</button>
                      <button onClick={() => setAnswers({ ...answers, [q.id]: ranked.filter(r=>r!==item) })} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: "0.75rem", padding: "0 0.2rem" }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                {unranked.map(opt => (
                  <button key={opt} onClick={() => setAnswers({ ...answers, [q.id]: [...ranked, opt] })}
                    style={{ padding: "0.45rem 0.9rem", borderRadius: 999, border: "1.5px solid " + C.stone, background: "white", color: C.muted, fontFamily: font.body, fontSize: "0.82rem", cursor: "pointer" }}>
                    + {opt}
                  </button>
                ))}
              </div>
            </div>
          );
        })() : (
          <textarea
            value={answers[q.id] || ""}
            onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
            placeholder={q.placeholder}
            style={{ width: "100%", minHeight: 120, padding: "0.85rem 1rem", borderRadius: 12, border: "1.5px solid " + C.stone, fontFamily: font.body, fontSize: "0.88rem", color: C.text, background: "white", resize: "vertical", outline: "none", lineHeight: 1.6, boxSizing: "border-box" }}
          />
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.72rem", color: C.muted, fontFamily: font.body }}>{step + 1} of {total}</span>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          {step > 0 && <button onClick={handleBack} style={{ background: "transparent", border: "1.5px solid " + C.stone, color: C.muted, padding: "0.6rem 1.1rem", fontSize: "0.72rem", cursor: "pointer", fontFamily: font.body, borderRadius: 8 }}>← Back</button>}
          {step < total - 1 ? (
            <button onClick={handleNext} disabled={!currentAnswered} style={{ background: currentAnswered ? "#1B5FE8" : C.stone, color: currentAnswered ? "white" : C.muted, border: "none", padding: "0.6rem 1.5rem", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", cursor: currentAnswered ? "pointer" : "default", fontFamily: font.body, borderRadius: 8, fontWeight: 600 }}>Continue →</button>
          ) : (
            <button onClick={() => { if (allDone) { onComplete(answers); } }} disabled={!currentAnswered} style={{ background: currentAnswered ? "linear-gradient(135deg, #1B5FE8, #3B3A8A)" : C.stone, color: currentAnswered ? "white" : C.muted, border: "none", padding: "0.6rem 1.75rem", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", cursor: currentAnswered ? "pointer" : "default", fontFamily: font.body, borderRadius: 8, fontWeight: 600 }}>Complete Reflection →</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ======================================================
// STARTING OUT CHECKLIST
// ======================================================
const CHECKLIST_AREAS = [
  { id: "finances", label: "Merging Finances", icon: "💳", color: "#E8673A", items: ["Open a joint bank account", "Review and align on a monthly budget", "Set up automatic bill payment from joint account", "Update direct deposit allocations", "Decide on individual spending allowances", "Create an emergency fund goal together"] },
  { id: "namechange", label: "Name Change", icon: "✍", color: "#1B5FE8", items: ["Apply for updated Social Security card", "Update driver's license / state ID", "Update passport (or apply if needed)", "Notify employer HR for payroll records", "Update bank and financial accounts", "Update voter registration"] },
  { id: "insurance", label: "Insurance & Benefits", icon: "🛡", color: "#10b981", items: ["Add spouse to health insurance plan", "Update life insurance beneficiaries", "Update car insurance to joint policy", "Review home/renters insurance together", "Update employer benefits forms"] },
  { id: "estate", label: "Estate Basics", icon: "📋", color: "#F59E0B", items: ["Create or update your wills", "Set up healthcare proxies / medical directives", "Designate beneficiaries on retirement accounts", "Consider a durable power of attorney", "Store important documents in one place"] },
  { id: "taxes", label: "Taxes", icon: "🧾", color: "#8B5CF6", items: ["Decide on tax filing status (MFJ vs MFS)", "Update W-4 withholding at work", "Plan for any marriage tax penalty or bonus", "Start tracking deductible expenses", "Discuss approach with a tax professional if needed"] },
  { id: "home", label: "Household Setup", icon: "🏠", color: "#EC4899", items: ["Consolidate or organize household subscriptions", "Set up shared calendar for household tasks", "Establish a system for shared errands", "Inventory and organize important documents", "Set up an emergency contact system"] },
  { id: "social", label: "Social & Admin", icon: "📬", color: "#06B6D4", items: ["Update address with USPS if applicable", "Notify key contacts of name / address changes", "Update social media and professional profiles", "Merge or update streaming/subscription accounts", "Update contact info on important accounts"] },
];

function StartingOutChecklist({ userName, partnerName, onBack, checklistState, setChecklistState }) {
  const totalItems = CHECKLIST_AREAS.reduce((s, a) => s + a.items.length, 0);
  const checkedCount = Object.values(checklistState).filter(v => v === true || v === 'na').length;
  const pct = Math.round((checkedCount / totalItems) * 100);

  const toggle = (key) => {
    const cur = checklistState[key];
    // Cycle: unchecked → done → N/A → unchecked
    const next = !cur ? true : cur === true ? 'na' : false;
    setChecklistState({ ...checklistState, [key]: next });
  };

  return (
    <div style={{ maxWidth: 620, margin: "0 auto" }}>
      <button onClick={onBack} style={{ background: "transparent", border: "none", color: C.muted, fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: font.body, padding: 0, marginBottom: "1.5rem", display: "block" }}>← Back to Dashboard</button>
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{ fontSize: "0.6rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "#E8673A", fontWeight: 700, fontFamily: font.body, marginBottom: "0.35rem" }}>Starting Out Collection</div>
        <h1 style={{ fontFamily: font.display, fontSize: "1.8rem", fontWeight: 700, color: C.ink, lineHeight: 1.1, marginBottom: "0.6rem" }}>Starting Out Checklist</h1>
        <p style={{ fontSize: "0.85rem", color: C.muted, fontFamily: font.body, fontWeight: 300, lineHeight: 1.65, marginBottom: "1.25rem" }}>The real-world logistics of merging your lives. Check things off as you go, no rush, just a clear picture of what's done and what's next.</p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ flex: 1, background: C.stone + "60", borderRadius: 999, height: 6 }}>
            <div style={{ background: "linear-gradient(90deg, #E8673A, #1B5FE8)", height: 6, borderRadius: 999, width: pct + "%", transition: "width 0.3s" }} />
          </div>
          <span style={{ fontSize: "0.72rem", color: C.muted, fontFamily: font.body, flexShrink: 0 }}>{checkedCount}/{totalItems} complete</span>
        </div>
      </div>
      {CHECKLIST_AREAS.map(area => {
        const areaChecked = area.items.filter(item => { const v = checklistState[area.id + "__" + item]; return v === true || v === 'na'; }).length;
        return (
          <div key={area.id} style={{ background: "white", border: "1.5px solid " + C.stone, borderRadius: 14, marginBottom: "0.75rem", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid " + C.stone + "60", display: "flex", alignItems: "center", gap: "0.75rem", background: area.color + "08" }}>
              <span style={{ fontSize: "1.2rem" }}>{area.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: font.display, fontSize: "0.95rem", fontWeight: 700, color: C.ink }}>{area.label}</div>
                <div style={{ fontSize: "0.65rem", color: C.muted, fontFamily: font.body }}>{areaChecked}/{area.items.length} complete</div>
              </div>
              {areaChecked === area.items.length && <span style={{ fontSize: "0.7rem", color: area.color, fontWeight: 700, fontFamily: font.body }}>✓ Done</span>}
            </div>
            <div style={{ padding: "0.75rem 1.25rem" }}>
              {area.items.map(item => {
                const key = area.id + "__" + item;
                const state = checklistState[key]; // false | true | 'na'
                const isDone = state === true;
                const isNA   = state === 'na';
                return (
                  <div key={item} onClick={() => toggle(key)} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.5rem 0", cursor: "pointer", borderBottom: "1px solid " + C.stone + "40" }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, border: "2px solid " + (isDone ? area.color : isNA ? C.muted : C.stone), background: isDone ? area.color : isNA ? C.stone + "80" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "0.05rem", transition: "all 0.15s" }}>
                      {isDone && <span style={{ color: "white", fontSize: "0.7rem", fontWeight: 700, lineHeight: 1 }}>✓</span>}
                      {isNA   && <span style={{ color: C.muted, fontSize: "0.6rem", fontWeight: 700, lineHeight: 1 }}>-</span>}
                    </div>
                    <span style={{ fontSize: "0.82rem", color: isDone || isNA ? C.muted : C.text, fontFamily: font.body, textDecoration: isDone ? "line-through" : "none", fontStyle: isNA ? "italic" : "normal", lineHeight: 1.45 }}>
                      {item}{isNA ? <span style={{ fontSize: "0.7rem", marginLeft: "0.5rem", color: C.muted }}>(not applicable)</span> : null}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ======================================================
// BUDGET TOOL -- Premium
// ======================================================
const BUDGET_CATEGORIES = [
  { id: "housing", label: "Housing", icon: "🏠", items: ["Rent / Mortgage", "Utilities (electric, gas, water)", "Internet & phone", "Home insurance / renters insurance", "Home maintenance / repairs"] },
  { id: "food", label: "Food & Dining", icon: "🍽", items: ["Groceries", "Dining out", "Coffee & snacks", "Meal delivery services"] },
  { id: "transport", label: "Transportation", icon: "🚗", items: ["Car payment(s)", "Car insurance", "Gas", "Parking & tolls", "Public transit / rideshare"] },
  { id: "savings", label: "Savings & Investments", icon: "💰", items: ["Emergency fund contribution", "Retirement (401k/IRA)", "Joint savings goal", "Individual savings"] },
  { id: "health", label: "Health & Wellness", icon: "💊", items: ["Health insurance premiums", "Gym / fitness", "Medical copays", "Prescriptions", "Mental health / therapy"] },
  { id: "lifestyle", label: "Lifestyle & Fun", icon: "✨", items: ["Streaming & subscriptions", "Hobbies & activities", "Vacations / travel fund", "Gifts & celebrations", "Personal spending money (each)"] },
  { id: "giving", label: "Giving & Charity", icon: "🤲", items: ["Regular charitable donations", "Religious / tithing contributions", "One-time causes or fundraisers", "Community or family support"] },
  { id: "debt", label: "Debt Payments", icon: "📊", items: ["Student loans", "Credit card minimums", "Personal loans"] },
];

function BudgetTool({ userName, partnerName, onBack, budgetState, setBudgetState }) {
  const [budget, setBudget] = useState(budgetState || {});
  const [incomes, setIncomes] = useState({ [userName]: "", [partnerName]: "" });
  const [activeTab, setActiveTab] = useState("income");

  const totalIncome = Object.values(incomes).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const totalExpenses = Object.values(budget).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const remaining = totalIncome - totalExpenses;

  const tabs = [{ id: "income", label: "Income" }, ...BUDGET_CATEGORIES.map(c => ({ id: c.id, label: c.label }))];

  return (
    <div style={{ maxWidth: 620, margin: "0 auto" }}>
      <button onClick={onBack} style={{ background: "transparent", border: "none", color: C.muted, fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: font.body, padding: 0, marginBottom: "1.5rem", display: "block" }}>← Back to Dashboard</button>
      <div style={{ fontSize: "0.6rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "#1B5FE8", fontWeight: 700, fontFamily: font.body, marginBottom: "0.35rem" }}>Attune Premium</div>
      <h1 style={{ fontFamily: font.display, fontSize: "1.8rem", fontWeight: 700, color: C.ink, lineHeight: 1.1, marginBottom: "0.5rem" }}>Shared Budget Tool</h1>
      <p style={{ fontSize: "0.85rem", color: C.muted, fontFamily: font.body, fontWeight: 300, lineHeight: 1.65, marginBottom: "1.5rem" }}>Build your real shared budget together. Your answers from the expectations exercise are reflected here.</p>

      {/* Summary bar */}
      <div style={{ background: "linear-gradient(135deg, #0f0c29, #1d1a4e)", borderRadius: 14, padding: "1.25rem 1.5rem", marginBottom: "1.5rem", color: "white", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
        {[
          { label: "Monthly Income", value: "$" + totalIncome.toLocaleString(), color: "#34d399" },
          { label: "Monthly Expenses", value: "$" + totalExpenses.toLocaleString(), color: "#E8673A" },
          { label: remaining >= 0 ? "Surplus" : "Deficit", value: (remaining >= 0 ? "+" : "") + "$" + Math.abs(remaining).toLocaleString(), color: remaining >= 0 ? "#34d399" : "#f87171" },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.72)", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: font.body, marginBottom: "0.25rem" }}>{label}</div>
            <div style={{ fontFamily: font.display, fontSize: "1.25rem", fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ background: activeTab === tab.id ? "#1B5FE8" : "white", color: activeTab === tab.id ? "white" : C.muted, border: "1.5px solid " + (activeTab === tab.id ? "#1B5FE8" : C.stone), padding: "0.35rem 0.75rem", borderRadius: 999, fontSize: "0.68rem", cursor: "pointer", fontFamily: font.body, fontWeight: activeTab === tab.id ? 600 : 400, transition: "all 0.15s" }}>{tab.label}</button>
        ))}
      </div>

      {/* Income tab */}
      {activeTab === "income" && (
        <div style={{ background: "white", border: "1.5px solid " + C.stone, borderRadius: 14, padding: "1.25rem" }}>
          <h3 style={{ fontFamily: font.display, fontSize: "1rem", fontWeight: 700, color: C.ink, marginBottom: "1rem" }}>Monthly Take-Home Income</h3>
          {[userName, partnerName].map(name => (
            <div key={name} style={{ marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: C.ink, fontFamily: font.body, display: "block", marginBottom: "0.35rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>{name}'s monthly income</label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1rem", color: C.muted, fontFamily: font.body }}>$</span>
                <input type="number" value={incomes[name]} onChange={e => setIncomes({ ...incomes, [name]: e.target.value })} placeholder="0" style={{ flex: 1, padding: "0.65rem 0.85rem", borderRadius: 8, border: "1.5px solid " + C.stone, fontFamily: font.body, fontSize: "0.95rem", color: C.ink, outline: "none" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expense tabs */}
      {BUDGET_CATEGORIES.map(cat => activeTab === cat.id && (
        <div key={cat.id} style={{ background: "white", border: "1.5px solid " + C.stone, borderRadius: 14, padding: "1.25rem" }}>
          <h3 style={{ fontFamily: font.display, fontSize: "1rem", fontWeight: 700, color: C.ink, marginBottom: "1rem" }}>{cat.icon} {cat.label}</h3>
          {cat.items.map(item => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem", justifyContent: "space-between" }}>
              <label style={{ fontSize: "0.8rem", color: C.text, fontFamily: font.body, flex: 1 }}>{item}</label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
                <span style={{ fontSize: "0.9rem", color: C.muted }}>$</span>
                <input type="number" value={budget[cat.id + "__" + item] || ""} onChange={e => setBudget({ ...budget, [cat.id + "__" + item]: e.target.value })} placeholder="0" style={{ width: 90, padding: "0.45rem 0.6rem", borderRadius: 8, border: "1.5px solid " + C.stone, fontFamily: font.body, fontSize: "0.82rem", color: C.ink, outline: "none", textAlign: "right" }} />
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Done + Save as PDF */}
      <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1.5px solid " + C.stone, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <div style={{ fontSize: "0.72rem", color: C.muted, fontFamily: font.body, marginBottom: "0.2rem" }}>
            {totalIncome > 0
              ? (remaining >= 0
                  ? `✓ ${userName} & ${partnerName} have $${remaining.toLocaleString()} unallocated`
                  : `⚠ Over budget by $${Math.abs(remaining).toLocaleString()}`)
              : "Add income to see your full picture"}
          </div>
          <div style={{ fontSize: "0.62rem", color: C.muted, fontFamily: font.body, opacity: 0.6 }}>
            Budget saved to this device
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.65rem" }}>
          <button onClick={() => { setBudgetState(budget); onBack(); }}
            style={{ background: C.warm, border: "1.5px solid " + C.stone, color: C.ink, padding: "0.65rem 1.4rem", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", fontFamily: font.body, borderRadius: 9, fontWeight: 600 }}>
            ← Done
          </button>
          <button onClick={() => {
            // Save first then print
            setBudgetState(budget);
            // Brief pause to let state settle, then print
            setTimeout(() => {
              const style = document.createElement('style');
              style.id = 'print-budget-style';
              style.textContent = `
                @media print {
                  body > * { display: none !important; }
                  #budget-print-area { display: block !important; }
                }
              `;
              document.head.appendChild(style);

              // Build print content
              const allCats = BUDGET_CATEGORIES;
              const rows = allCats.flatMap(cat =>
                cat.items
                  .filter(item => budget[cat.id + '__' + item])
                  .map(item => `<tr><td style="padding:4px 8px;font-size:12px;">${cat.label} — ${item}</td><td style="padding:4px 8px;text-align:right;font-size:12px;">$${parseFloat(budget[cat.id+'__'+item]).toLocaleString()}</td></tr>`)
              ).join('');

              const el = document.createElement('div');
              el.id = 'budget-print-area';
              el.style.display = 'none';
              el.innerHTML = `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:2rem;">
                  <div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#E8673A;margin-bottom:0.5rem;">Attune</div>
                  <h1 style="font-size:22px;margin:0 0 0.25rem;color:#0E0B07;">${userName} & ${partnerName}</h1>
                  <div style="font-size:13px;color:#8C7A68;margin-bottom:1.5rem;">Shared Budget · Monthly</div>
                  <table style="width:100%;border-collapse:collapse;margin-bottom:1rem;">
                    <thead><tr style="background:#f5f5f0;">
                      <th style="padding:6px 8px;text-align:left;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">Item</th>
                      <th style="padding:6px 8px;text-align:right;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">Monthly</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                    <tfoot>
                      <tr style="border-top:2px solid #E8DDD0;">
                        <td style="padding:8px;font-weight:700;font-size:13px;">Total income</td>
                        <td style="padding:8px;text-align:right;font-weight:700;font-size:13px;color:#10b981;">$${totalIncome.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px;font-weight:700;font-size:13px;">Total expenses</td>
                        <td style="padding:8px;text-align:right;font-weight:700;font-size:13px;color:#E8673A;">$${totalExpenses.toLocaleString()}</td>
                      </tr>
                      <tr style="background:${remaining >= 0 ? '#f0fdf9' : '#fff1f0'};">
                        <td style="padding:8px;font-weight:700;font-size:13px;">${remaining >= 0 ? 'Surplus' : 'Deficit'}</td>
                        <td style="padding:8px;text-align:right;font-weight:700;font-size:13px;color:${remaining >= 0 ? '#10b981' : '#ef4444'};">${remaining >= 0 ? '+' : ''}$${Math.abs(remaining).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                  <div style="font-size:10px;color:#aaa;margin-top:1rem;">attune-relationships.com</div>
                </div>`;
              document.body.appendChild(el);
              window.print();
              setTimeout(() => {
                document.body.removeChild(el);
                document.head.removeChild(style);
              }, 1000);
            }, 100);
          }}
            style={{ background: "linear-gradient(135deg, #1B5FE8, #1447b8)", color: "white", border: "none", padding: "0.65rem 1.5rem", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", fontFamily: font.body, borderRadius: 9, fontWeight: 600 }}>
            Save as PDF ↓
          </button>
        </div>
      </div>
    </div>
  );
}

// ======================================================
// OUR NOTES -- private conversation log
// ======================================================
function NotesView({ userName, partnerName, notesState, setNotesState, onBack }) {
  const font = { display: HFONT, body: BFONT };
  const [tab, setTab] = useState("shared");
  const tabs = [
    { id: "shared", label: "Shared Notes", emoji: "🤝", desc: "Things you want to remember together" },
    { id: "partner1", label: userName + "'s Notes", emoji: "👤", desc: "Your private reflections" },
    { id: "partner2", label: partnerName + "'s Notes", emoji: "👤", desc: partnerName + "'s private reflections" },
  ];
  const prompts = [
    "What surprised you most from the results?",
    "Where do you feel most aligned?",
    "What conversation do you most want to have?",
    "What did you learn about yourself?",
    "What do you want to revisit in a few months?",
  ];
  return (
    <div style={{ padding: "2.5rem 2rem", maxWidth: 680, margin: "0 auto" }}>
      <button onClick={onBack} style={{ background: "transparent", border: "none", color: C.muted, fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: font.body, padding: 0, marginBottom: "1.75rem" }}>← Back</button>
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ fontSize: "0.6rem", letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted, fontFamily: font.body, marginBottom: "0.4rem" }}>Your private notebook</div>
        <h1 style={{ fontFamily: font.display, fontSize: "1.9rem", fontWeight: 700, color: C.ink, lineHeight: 1.1, marginBottom: "0.5rem" }}>Our Notes</h1>
        <p style={{ fontSize: "0.82rem", color: C.muted, fontFamily: font.body, lineHeight: 1.7 }}>Log reflections, things you want to come back to, and conversations you've had. Saved to this device only.</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.75rem", flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ background: tab === t.id ? "#10b981" : C.warm, border: tab === t.id ? "1.5px solid #10b981" : "1.5px solid " + C.stone, color: tab === t.id ? "white" : C.muted, padding: "0.45rem 1rem", borderRadius: 999, fontSize: "0.72rem", fontWeight: tab === t.id ? 700 : 500, cursor: "pointer", fontFamily: font.body, transition: "all .15s", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span>{t.emoji}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Note area */}
      <div style={{ background: C.warm, border: "1.5px solid " + C.stone, borderRadius: 16, padding: "1.5rem", marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.7rem", color: C.muted, fontFamily: font.body, marginBottom: "0.75rem" }}>{tabs.find(t => t.id === tab)?.desc}</p>
        <textarea
          value={notesState[tab]}
          onChange={e => setNotesState(prev => ({ ...prev, [tab]: e.target.value }))}
          placeholder={"Start writing..."}
          style={{ width: "100%", minHeight: 220, background: "white", border: "1.5px solid " + C.stone, borderRadius: 10, padding: "1rem", fontSize: "0.85rem", color: C.text, fontFamily: font.body, lineHeight: 1.75, resize: "vertical", outline: "none", boxSizing: "border-box" }}
          onFocus={e => e.target.style.borderColor = "#10b981"}
          onBlur={e => e.target.style.borderColor = C.stone}
        />
        <div style={{ fontSize: "0.65rem", color: C.muted, fontFamily: font.body, marginTop: "0.5rem", textAlign: "right" }}>
          {notesState[tab]?.length > 0 ? `${notesState[tab].length} characters · auto-saved` : "Nothing written yet"}
        </div>
      </div>

      {/* Conversation prompts */}
      <div style={{ background: "linear-gradient(135deg, rgba(16,185,129,.05), rgba(16,185,129,.02))", border: "1px solid rgba(16,185,129,.2)", borderRadius: 14, padding: "1.25rem" }}>
        <div style={{ fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#10b981", fontWeight: 700, fontFamily: font.body, marginBottom: "0.85rem" }}>Prompts to get you started</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {prompts.map((p, i) => (
            <button key={i} onClick={() => setNotesState(prev => ({ ...prev, [tab]: prev[tab] ? prev[tab] + "\n\n" + p + "\n" : p + "\n" }))}
              style={{ background: "white", border: "1px solid rgba(16,185,129,.2)", borderRadius: 8, padding: "0.6rem 0.85rem", fontSize: "0.78rem", color: C.text, fontFamily: font.body, cursor: "pointer", textAlign: "left", transition: "all .15s" }}
              onMouseEnter={e => { e.target.style.borderColor = "#10b981"; e.target.style.background = "rgba(16,185,129,.04)"; }}
              onMouseLeave={e => { e.target.style.borderColor = "rgba(16,185,129,.2)"; e.target.style.background = "white"; }}>
              + {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ======================================================
// LMFT SESSION -- Premium
// ======================================================
function LMFTSession({ userName, partnerName, onBack }) {
  // Redirect to the real booking page — /lmft-booking handles scheduling
  // Pass names as URL params so the form can pre-fill
  const bookingUrl = `/lmft-booking?p1=${encodeURIComponent(userName || '')}&p2=${encodeURIComponent(partnerName || '')}`;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <button onClick={onBack} style={{ background: "transparent", border: "none", color: C.muted, fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: font.body, padding: 0, marginBottom: "1.5rem", display: "block" }}>← Back to Dashboard</button>
      <div style={{ fontSize: "0.6rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "#3B5BDB", fontWeight: 700, fontFamily: font.body, marginBottom: "0.35rem" }}>Attune Premium</div>
      <h1 style={{ fontFamily: font.display, fontSize: "1.8rem", fontWeight: 700, color: C.ink, lineHeight: 1.1, marginBottom: "0.75rem" }}>Schedule Your LMFT Session</h1>
      <p style={{ fontSize: "0.88rem", color: C.muted, fontFamily: font.body, fontWeight: 300, lineHeight: 1.7, marginBottom: "0.5rem" }}>Your therapist will review your joint results before the session — so the conversation starts from your actual data, not from scratch.</p>
      <p style={{ fontSize: "0.82rem", color: C.muted, fontFamily: font.body, fontWeight: 300, lineHeight: 1.65, marginBottom: "2rem" }}>Both {userName} and {partnerName} attend together. 50 minutes, virtual.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { icon: "1", label: "Finish your exercises", body: "Both partners need to complete their exercises before the session." },
          { icon: "2", label: "Request a time", body: "Share your availability and we'll match you with an available therapist." },
          { icon: "3", label: "Meet over video", body: "50 minutes. Your results are the starting point — not an intake form." },
        ].map(s => (
          <div key={s.icon} style={{ background: "#F5F7FF", borderRadius: 14, padding: "1.1rem" }}>
            <div style={{ fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#3B5BDB", fontWeight: 700, fontFamily: font.body, marginBottom: "0.4rem" }}>Step {s.icon}</div>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.ink, fontFamily: font.body, marginBottom: "0.35rem" }}>{s.label}</div>
            <div style={{ fontSize: "0.75rem", color: C.muted, fontFamily: font.body, lineHeight: 1.6 }}>{s.body}</div>
          </div>
        ))}
      </div>
      <a href={bookingUrl} style={{ display: "block", textAlign: "center", padding: "0.95rem 2rem", background: "linear-gradient(135deg,#1B5FE8,#3B3A8A)", color: "white", borderRadius: 14, fontWeight: 700, fontSize: "0.9rem", fontFamily: font.body, textDecoration: "none", letterSpacing: "0.02em" }}>
        Book my session →
      </a>
      <p style={{ fontSize: "0.72rem", color: C.muted, fontFamily: font.body, textAlign: "center", marginTop: "1rem", lineHeight: 1.6 }}>We'll confirm your time and therapist within 48 hours.</p>
    </div>
  );
}

// ======================================================
// ANNIVERSARY RESULTS VIEW
// ======================================================
const SARAH_ANNIVERSARY_DEMO = {
  a0: 3,  // "Really good"
  a_memory: "You made coffee exactly how I like it this morning without me asking. Tiny thing. Noticed it.",
  a1: "Our first trip together to the coast. We got completely lost, laughed about it the whole way, and I remember thinking, this is someone I can be lost with forever.",
  a2: "The year we navigated the job change together. That was the first time I really felt like we were a team, not just two people in a relationship.",
  a_sat_conn: 3,  // "Quite connected"
  a_sat_comm: 2,  // "We manage"
  a_sat_fun: 2,   // "About right"
  a3: "The way you always notice when I'm struggling before I say anything. And how you've learned exactly when to give me space and when to pull me in.",
  a4: "More spontaneous adventures, even small ones. And I'd love for us to carve out real time each month that's just about us.",
  a7: "The conversation about the apartment. We were both stressed and I don't think either of us really listened — we just talked past each other and made the decision without actually agreeing.",
  a8: "Steady",
  a5: "I want us to feel financially stable but still adventurous, not trapped by our own lives. And I want to still be choosing each other, obviously.",
  a6: "Being more present when I'm home. I catch myself half-somewhere-else too often. You deserve someone who's actually in the room.",
  a_priority: ["Quality time","Communication","Shared adventures","Financial alignment","Long-term planning","Physical intimacy"],
};
const JAMES_ANNIVERSARY_DEMO = {
  a0: 4,  // "Better than ever"
  a_memory: "You laughed at something I said in the car last week, actually laughed, not politely, and I thought, still got it.",
  a1: "That weekend in the mountains where we cooked every meal together and didn't look at our phones. It was the first time I remember feeling like we had a real home together, even in a rental cabin.",
  a2: "When you pushed me to go back to grad school. You believed I'd get in before I did. I think about that a lot.",
  a_sat_conn: 4,  // "Very connected"
  a_sat_comm: 3,  // "Pretty well"
  a_sat_fun: 1,   // "Less than I'd like"
  a3: "Your curiosity. You make me more interested in things I'd otherwise ignore. And the fact that you still laugh at my jokes.",
  a4: "I want to start some kind of shared ritual, something small and weekly that's just ours. A walk, a dinner, something consistent.",
  a7: "How we handled the stress around my job applications. I went quiet when I should have said I was scared. I let you figure it out instead of saying it.",
  a8: "Curious",
  a5: "Somewhere with more space, a home we actually love. And a version of us that's less reactive and more intentional about the time we have.",
  a6: "I'm going to say what I need more directly. I used to hint around things and hope you'd catch it. I want to just say it.",
  a_priority: ["Communication","Long-term planning","Quality time","Financial alignment","Physical intimacy","Shared adventures"],
};

// Derive insights from anniversary answers
function deriveAnniversaryInsights(mine, theirs, userName, partnerName, coupleType) {
  const insights = [];
  const scaleQ = ANNIVERSARY_QUESTIONS.filter(q => q.type === "scale");
  const ctNote = coupleType ? `As a ${coupleType.name} couple, ` : "";

  // --- SCALE ALIGNMENT ---
  const scaleGaps = scaleQ.map(q => ({
    q,
    myVal: mine[q.id] ?? 2,
    theirVal: theirs[q.id] ?? 2,
    gap: Math.abs((mine[q.id] ?? 2) - (theirs[q.id] ?? 2)),
    avgVal: ((mine[q.id] ?? 2) + (theirs[q.id] ?? 2)) / 2,
  }));
  const overallGap = scaleGaps.filter(s=>s.q.id!=='a0').reduce((sum,s)=>sum+s.gap,0) / Math.max(scaleGaps.filter(s=>s.q.id!=='a0').length, 1);
  const biggestGap = scaleGaps.filter(s=>s.q.id!=='a0').sort((a,b)=>b.gap-a.gap)[0];
  const overallFeelGap = Math.abs((mine.a0 ?? 2) - (theirs.a0 ?? 2));
  const overallQ = ANNIVERSARY_QUESTIONS.find(q=>q.id==='a0');

  // Overall feel perception gap
  if (overallFeelGap >= 1 && overallQ) {
    const myLabel = overallQ.scaleLabels[mine.a0 ?? 2];
    const theirLabel = overallQ.scaleLabels[theirs.a0 ?? 2];
    insights.push({
      type: "explore",
      title: "You're experiencing this relationship from different vantage points",
      body: `${userName} describes the overall feel as "${myLabel}", ${partnerName} says "${theirLabel}." Neither is wrong, and the gap doesn't mean one of you isn't paying attention. But it's worth understanding what's shaping each perspective.`,
      priority: "Have this conversation gently",
      action: `Ask each other: what would make this feel even better from where you're standing right now? Don't defend your own rating, get curious about theirs first.`,
    });
  } else if (overallQ) {
    const sharedLabel = overallQ.scaleLabels[Math.round(((mine.a0 ?? 2) + (theirs.a0 ?? 2)) / 2)];
    insights.push({
      type: "strength",
      title: "You're on the same page about how the relationship feels",
      body: `Both of you independently described the relationship as something close to "${sharedLabel}." Shared perception of where you are is a meaningful starting point, it means you're reading the same room.`,
      priority: "Build on this",
      action: `Name it together. When you both feel good about things but don't say it out loud, that warmth stays private. Saying "I feel like things are really good between us right now" creates a shared moment instead of parallel ones.`,
    });
  }

  // Fun gap
  const funQ = scaleGaps.find(s=>s.q.id==='a_sat_fun');
  if (funQ && funQ.gap >= 2) {
    const wantMoreFun = (mine.a_sat_fun ?? 2) < (theirs.a_sat_fun ?? 2) ? userName : partnerName;
    insights.push({
      type: "explore",
      title: "You're not aligned on how much lightness and fun you're getting",
      body: `${wantMoreFun} feels like you could be having more fun together than you currently are. This isn't a complaint about the relationship, it's a signal about what's been deprioritized.`,
      priority: "Easy win to act on",
      action: `Block something deliberately fun in the next two weeks, not a big trip, just something that has no productive purpose whatsoever. Fun doesn't usually happen by accident when life gets full.`,
    });
  } else if (funQ && funQ.avgVal >= 3) {
    insights.push({
      type: "strength",
      title: "You both feel like there's real lightness in what you have",
      body: `Both of you rate the fun and levity in your relationship positively. That matters more than it sounds, couples who laugh together regularly tend to weather hard periods better than those who save fun for vacations.`,
      priority: "Keep prioritizing it",
      action: `Don't let busyness quietly crowd out the small pleasures. Whatever's been creating lightness lately, protect it.`,
    });
  }

  // Communication gap
  const commQ = scaleGaps.find(s=>s.q.id==='a_sat_comm');
  if (commQ && commQ.gap >= 2) {
    const lowPerson = (mine.a_sat_comm ?? 2) < (theirs.a_sat_comm ?? 2) ? userName : partnerName;
    insights.push({
      type: "explore",
      title: "One of you finds hard conversations easier than the other does",
      body: `${lowPerson} rates how well you handle difficult conversations more cautiously than their partner does. This asymmetry is common, usually it means one person absorbs more friction before raising something, while the other thinks things resolve smoothly.`,
      priority: "Worth naming explicitly",
      action: `${lowPerson}: try naming one thing that's been sitting unspoken, not a criticism, just something you've been carrying. The other person likely doesn't know it's there.`,
    });
  }

  // --- SHARED FOUNDATION ---
  const bothMentionHome = (mine.a1 + mine.a2 + theirs.a1 + theirs.a2).toLowerCase();
  const homeWords = ["home","together","team","cabin","cook","cooked","space","belong","real"];
  const homeCount = homeWords.filter(w => bothMentionHome.includes(w)).length;
  if (homeCount >= 3) {
    insights.push({
      type: "strength",
      title: "You both anchor to the same thing",
      body: `Your defining moments both center on a felt sense of home, not a place, but a feeling you create together. That's harder to build than most couples realize, and you've already got it.`,
      priority: "Foundation to build from",
      action: "Name it explicitly. The next time one of you feels it, that this-is-home feeling, say it out loud. Making it visible keeps it alive.",
    });
  }

  // --- GRATITUDE RECIPROCITY ---
  // Unified keyword set — same check applied to both partners
  const myGrateful = (mine.a3 || "").toLowerCase();
  const theirGrateful = (theirs.a3 || "").toLowerCase();
  const seenWords = ["notice","see","understand","get me","gets me","knows","space","pull","curiosity","curious","interest","interested","make me","laugh","appreciat","pay attention","attentiv","present","remember"];
  const myFeelsSeen = seenWords.some(w => myGrateful.includes(w));
  const theirFeelsSeen = seenWords.some(w => theirGrateful.includes(w));
  if (myFeelsSeen || theirFeelsSeen) {
    const myQ = mine.a3 ? `"${mine.a3.trim()}"` : "something specific";
    const theirQ = theirs.a3 ? `"${theirs.a3.trim()}"` : "something specific";
    insights.push({
      type: "strength",
      title: "You each feel genuinely seen",
      body: `What each of you is most grateful for right now speaks to being known — not just liked. ${userName}: ${myQ}. ${partnerName}: ${theirQ}. These are descriptions of how you're actually showing up for each other.`,
      priority: "Preserve intentionally",
      action: `The things you're each most grateful for are the things most worth protecting. Whatever you're each doing that makes the other feel known — keep doing it deliberately. These are the first things to quietly erode when life gets full.`,
    });
  }

  // --- WHAT THEY WANT NEXT ---
  const myNext = (mine.a4 || "").toLowerCase();
  const theirNext = (theirs.a4 || "").toLowerCase();
  const adventureWords = ["adventure","spontaneous","trip","travel","explore","new","something different"];
  const ritualWords = ["ritual","routine","regular","weekly","walk","dinner","consistent","monthly","carve","time"];
  const myWantsAdventure = adventureWords.some(w => myNext.includes(w));
  const myWantsRitual = ritualWords.some(w => myNext.includes(w));
  const theirWantsAdventure = adventureWords.some(w => theirNext.includes(w));
  const theirWantsRitual = ritualWords.some(w => theirNext.includes(w));

  if ((myWantsAdventure && theirWantsRitual) || (myWantsRitual && theirWantsAdventure)) {
    const adventurePerson = myWantsAdventure ? userName : partnerName;
    const ritualPerson = myWantsRitual ? userName : partnerName;
    insights.push({
      type: "explore",
      title: "You want the same closeness through different things",
      body: `${adventurePerson} is reaching for spontaneity and new experiences together. ${ritualPerson} is reaching for consistency and ritual. These aren't opposites — they're two different answers to the same underlying need: more intentional time that feels like you.`,
      priority: "Resolve this together",
      action: `Try this: pick one small weekly ritual (${ritualPerson}'s instinct) and one slightly bigger spontaneous thing per month (${adventurePerson}'s instinct). You're not compromising, you're combining. Start with what's easier to plan.`,
    });
  }

  // --- FIVE-YEAR PICTURE ---
  const myFive = (mine.a5 || "").toLowerCase();
  const theirFive = (theirs.a5 || "").toLowerCase();
  const financialWords = ["stable","financial","money","save","security","secure","trapped"];
  const spaceWords = ["space","home","house","somewhere","live","room","intentional"];
  const myFinancial = financialWords.some(w => myFive.includes(w));
  const theirFinancial = financialWords.some(w => theirFive.includes(w));
  const mySpace = spaceWords.some(w => myFive.includes(w));
  const theirSpace = spaceWords.some(w => theirFive.includes(w));

  if ((myFinancial && theirSpace) || (mySpace && theirFinancial)) {
    const financialPerson = myFinancial ? userName : partnerName;
    const spacePerson = theirSpace ? partnerName : userName;
    insights.push({
      type: "explore",
      title: "Your 5-year pictures share a theme, with different textures",
      body: `${financialPerson} pictures financial stability — security that leaves room for the future you both want. ${spacePerson} pictures a home and space that feel genuinely intentional. These visions are compatible but haven't been reconciled into a shared plan yet.`,
      priority: "Build a shared map",
      action: `Block an evening to talk about this specifically: what does financial stability look like in actual numbers and choices? What does the right space mean in terms of location and timeline? These answers shape a lot of smaller decisions you're probably already making independently.`,
    });
  }

  // --- GROWTH EDGES ---
  const myGrowth = (mine.a6 || "").toLowerCase();
  const theirGrowth = (theirs.a6 || "").toLowerCase();
  const presenceWords = ["present","here","in the room","phone","distracted","somewhere else","half"];
  const expressionWords = ["say","tell","hint","communicate","speak","need","express","directly"];
  const myWorksOnPresence = presenceWords.some(w => myGrowth.includes(w));
  const myWorksOnExpression = expressionWords.some(w => myGrowth.includes(w));
  const theirWorksOnPresence = presenceWords.some(w => theirGrowth.includes(w));
  const theirWorksOnExpression = expressionWords.some(w => theirGrowth.includes(w));
  // Fire if one partner works on presence and the other on expression — either direction
  const presencePerson = myWorksOnPresence ? userName : (theirWorksOnPresence ? partnerName : null);
  const expressionPerson = myWorksOnExpression ? userName : (theirWorksOnExpression ? partnerName : null);

  if (presencePerson && expressionPerson && presencePerson !== expressionPerson) {
    insights.push({
      type: "strength",
      title: "Where you each struggle is exactly what the other one offers",
      body: `${presencePerson} is working on being more present. ${expressionPerson} is working on saying what they need directly. Notice what's happening: each of you independently identified the thing that would most benefit the other person. That's rare.`,
      priority: "Make this mutual",
      action: `Tell each other. ${presencePerson}: "I know I disappear sometimes — I'm working on it, and I want you to tell me when it's happening." ${expressionPerson}: "I'm going to try to say what I actually need instead of waiting for you to notice." Saying it out loud creates accountability and removes the guesswork.`,
      coupleTypeNote: coupleType ? `${ctNote}this complementary dynamic is characteristic of your pairing — lean into naming it explicitly rather than hoping the other person notices.` : "",
    });
  }

  // --- APPRECIATION (a8) ---
  if (mine.a8 && theirs.a8) {
    if (mine.a8 === theirs.a8) {
      insights.push({
        type: "strength",
        title: `You both admire the same thing in each other`,
        body: `Both of you independently named "${mine.a8}" as the quality you most admire in your partner right now. When two people independently land on the same word to describe what they value in the other, it usually means that quality is genuinely visible in daily life — not just something they say.`,
        priority: "Say it out loud",
        action: `Tell each other directly. "The thing I most admire about you right now is ${mine.a8.toLowerCase()}." Hearing it said plainly lands differently than assuming the other person knows.`,
        coupleTypeNote: coupleType ? `${ctNote}shared admiration for the same quality is a meaningful signal of mutual recognition in your dynamic.` : "",
      });
    } else {
      insights.push({
        type: "strength",
        title: `You admire different things in each other — both real`,
        body: `${userName} most admires ${partnerName}'s ${theirs.a8.toLowerCase()}. ${partnerName} most admires ${userName}'s ${mine.a8.toLowerCase()}. Different qualities, both freely given. This suggests each of you is genuinely being seen for something specific rather than getting generic praise.`,
        priority: "Make it direct",
        action: `Say it to each other: "${userName}, I most admire your ${mine.a8.toLowerCase()} right now." It takes about eight seconds and lands better than you'd think.`,
        coupleTypeNote: coupleType ? `${ctNote}the ability to name specific admiration rather than general appreciation is a sign of real attunement.` : "",
      });
    }
  }

  // --- WHAT SHOULD HAVE GONE DIFFERENTLY (a7) ---
  if (mine.a7 && theirs.a7) {
    const stressWords = ["stress","stressed","scared","anxious","worry","worried","pressure"];
    const communicationWords = ["said","listen","talk","told","quiet","silent","hint","assume"];
    const bothStress = stressWords.some(w => mine.a7.toLowerCase().includes(w)) || stressWords.some(w => theirs.a7.toLowerCase().includes(w));
    const bothComm = communicationWords.some(w => mine.a7.toLowerCase().includes(w)) || communicationWords.some(w => theirs.a7.toLowerCase().includes(w));
    if (bothStress || bothComm) {
      insights.push({
        type: "explore",
        title: "You both identified a moment where communication broke down under pressure",
        body: `You each named a situation where something wasn't fully said or heard — ${mine.a7.split(".")[0].toLowerCase().trim()} (${userName}), and ${theirs.a7.split(".")[0].toLowerCase().trim()} (${partnerName}). Naming these independently, without coordinating, suggests this is a real pattern worth looking at directly.`,
        priority: "Have the meta-conversation",
        action: `Don't relitigate the specific situation — instead, talk about the pattern. "When things get hard between us, what does each of us actually need in the first hour?" Getting to that agreement before the next hard moment changes how it plays out.`,
        coupleTypeNote: coupleType ? `${ctNote}understanding your default stress responses is one of the highest-leverage things you can do together.` : "",
      });
    } else {
      insights.push({
        type: "explore",
        title: "You each identified something you wish had gone differently",
        body: `${userName} named: "${mine.a7.trim()}" ${partnerName} named: "${theirs.a7.trim()}" These don't have to match to be useful. The fact that both of you can identify something shows self-awareness — which is the first requirement for handling it better next time.`,
        priority: "Talk about it directly",
        action: `Pick one of these to talk about. Not to assign blame — to understand what each person was feeling in that moment that the other person didn't know. "When that happened, I was feeling X and I didn't say it because Y." That's the whole conversation.`,
        coupleTypeNote: coupleType ? `${ctNote}naming what should have gone differently is more useful than relitigating what actually happened.` : "",
      });
    }
  }

  // --- PRIORITY RANKING (a_priority) ---
  if (Array.isArray(mine.a_priority) && Array.isArray(theirs.a_priority) && mine.a_priority.length > 0 && theirs.a_priority.length > 0) {
    const myTop = mine.a_priority[0];
    const theirTop = theirs.a_priority[0];
    const myBottom = mine.a_priority[mine.a_priority.length - 1];
    const theirBottom = theirs.a_priority[theirs.a_priority.length - 1];
    // Find biggest rank gap
    const rankGaps = mine.a_priority.map(item => ({
      item,
      myRank: mine.a_priority.indexOf(item),
      theirRank: theirs.a_priority.indexOf(item),
      gap: Math.abs(mine.a_priority.indexOf(item) - theirs.a_priority.indexOf(item)),
    })).sort((a, b) => b.gap - a.gap);
    const biggestRankGap = rankGaps[0];

    if (myTop === theirTop) {
      insights.push({
        type: "strength",
        title: `You agree on what matters most this year`,
        body: `Both of you independently ranked "${myTop}" as your top priority for the year ahead. When two people rank the same thing first without discussing it, that alignment is real — and it makes it much easier to act on.`,
        priority: "Turn it into a plan",
        action: `Alignment on priorities is only useful if it produces decisions. Agree on one concrete thing you'll do differently in the next 30 days that reflects this priority. Even one change made on purpose counts.`,
        coupleTypeNote: coupleType ? `${ctNote}shared priority alignment reduces the invisible negotiation that often drains energy between partners.` : "",
      });
    } else {
      insights.push({
        type: "explore",
        title: `Your top priorities for this year are different`,
        body: `${userName}'s top priority: "${myTop}." ${partnerName}'s top priority: "${theirTop}." Neither is wrong — but without naming it, this difference quietly shapes decisions, energy allocation, and what each of you feels is being neglected.`,
        priority: "Negotiate, not compromise",
        action: `Both priorities deserve to be real. The question isn't which one wins — it's how to protect both. What would it look like to honor "${myTop}" and "${theirTop}" in the same month? Start with something small and specific.`,
        coupleTypeNote: coupleType ? `${ctNote}different investment priorities are common in your pairing — naming them explicitly tends to unlock a lot of unspoken frustration.` : "",
      });
    }

    if (biggestRankGap && biggestRankGap.gap >= 3) {
      insights.push({
        type: "explore",
        title: `You see "${biggestRankGap.item}" very differently`,
        body: `${userName} ranked "${biggestRankGap.item}" #${biggestRankGap.myRank + 1}. ${partnerName} ranked it #${biggestRankGap.theirRank + 1}. That's a significant gap on the same item — and the kind of thing that creates friction without either person fully understanding why.`,
        priority: "Worth one honest conversation",
        action: `Ask each other: "What would it feel like if we invested more in ${biggestRankGap.item.toLowerCase()} this year?" The answer usually reveals something about what's been missing that neither person has said directly.`,
        coupleTypeNote: coupleType ? `${ctNote}gaps in how you value the same area often reflect different experiences of that area, not different values overall.` : "",
      });
    }
  }

  return insights;
}

const INSIGHT_COLORS = {
  strength: { bg: "#EDFAF5", border: "#10b981", label: "rgba(5,150,105,0.9)", labelBg: "#D1FAE5", dot: "#10b981" },
  explore:  { bg: "#FFF7ED", border: "#F59E0B", label: "rgba(180,83,9,0.9)",  labelBg: "#FEF3C7", dot: "#F59E0B" },
};

// ── Reusable insight card list with show-more ─────────────────────────────────
function InsightCardList({ insights = [] }) {
  const [showAll, setShowAll] = useState(false);
  const SHOW_INIT = 3;
  const visible = showAll ? insights : insights.slice(0, SHOW_INIT);
  const hidden = insights.length - SHOW_INIT;
  return (
    <>
      {visible.map((ins, i) => {
        const col = INSIGHT_COLORS[ins.type] || INSIGHT_COLORS.explore;
        return (
          <div key={i} style={{ background: "white", border: `1.5px solid ${C.stone}`, borderRadius: 16, marginBottom: "1rem", overflow: "hidden" }}>
            <div style={{ padding: "0.85rem 1.25rem", borderBottom: `1px solid ${C.stone}50`, background: col.bg, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.dot, flexShrink: 0 }} />
                <span style={{ fontFamily: HFONT, fontSize: "0.9rem", fontWeight: 700, color: C.ink, lineHeight: 1.3 }}>{ins.title}</span>
              </div>
              <div style={{ background: col.labelBg, borderRadius: 999, padding: "0.2rem 0.6rem", flexShrink: 0 }}>
                <span style={{ fontSize: "0.58rem", fontWeight: 700, color: col.label, fontFamily: BFONT, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {ins.type === "strength" ? "Strength" : "Worth exploring"}
                </span>
              </div>
            </div>
            <div style={{ padding: "1.1rem 1.25rem" }}>
              <p style={{ fontSize: "0.84rem", color: C.text, fontFamily: BFONT, fontWeight: 300, lineHeight: 1.75, marginBottom: "1rem" }}>{ins.body}</p>
              <div style={{ background: "#F9F7F4", borderRadius: 10, padding: "0.85rem 1rem", borderLeft: `3px solid ${col.dot}` }}>
                <div style={{ fontSize: "0.58rem", fontWeight: 700, color: col.label, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: BFONT, marginBottom: "0.4rem" }}>{ins.priority}</div>
                <p style={{ fontSize: "0.8rem", color: C.text, fontFamily: BFONT, fontWeight: 400, lineHeight: 1.7, margin: 0 }}>{ins.action}</p>
              </div>
              {ins.coupleTypeNote && (
                <div style={{ marginTop: "0.6rem", padding: "0.6rem 0.85rem", background: "rgba(27,95,232,0.05)", borderRadius: 8, border: "1px solid rgba(27,95,232,0.12)" }}>
                  <span style={{ fontSize: "0.55rem", fontWeight: 700, color: "#1B5FE8", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: BFONT }}>For your couple type · </span>
                  <span style={{ fontSize: "0.76rem", color: "#1B5FE8", fontFamily: BFONT, fontWeight: 300, lineHeight: 1.6 }}>{ins.coupleTypeNote}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
      {!showAll && hidden > 0 && (
        <button onClick={() => setShowAll(true)}
          style={{ width: "100%", background: "white", border: `1.5px solid ${C.stone}`, borderRadius: 12, padding: "0.85rem 1rem", fontSize: "0.78rem", fontWeight: 600, color: C.clay, cursor: "pointer", fontFamily: BFONT, marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
          Show {hidden} more insight{hidden !== 1 ? "s" : ""} ↓
        </button>
      )}
    </>
  );
}

// ── Action plan item list with show-more ─────────────────────────────────────
function ActionPlanList({ explores = [] }) {
  const [showAll, setShowAll] = useState(false);
  const SHOW_INIT = 3;
  const visible = showAll ? explores : explores.slice(0, SHOW_INIT);
  const hidden = explores.length - SHOW_INIT;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
      {visible.map((ins, i) => (
        <div key={i} style={{ background: "white", border: `1.5px solid ${C.stone}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ background: "#F5F7FF", borderBottom: "1px solid rgba(27,95,232,0.12)", padding: "0.75rem 1.1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1B5FE8", flexShrink: 0 }} />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: C.ink, fontFamily: BFONT }}>{ins.title}</span>
          </div>
          <div style={{ padding: "0.85rem 1.1rem" }}>
            <p style={{ fontSize: "0.8rem", color: C.muted, fontFamily: BFONT, fontWeight: 300, lineHeight: 1.65, margin: "0 0 0.65rem" }}>{ins.action}</p>
            {ins.coupleTypeNote && (
              <div style={{ padding: "0.5rem 0.75rem", background: "rgba(27,95,232,0.05)", borderRadius: 8, border: "1px solid rgba(27,95,232,0.1)" }}>
                <span style={{ fontSize: "0.55rem", fontWeight: 700, color: "#1B5FE8", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: BFONT }}>Your couple type · </span>
                <span style={{ fontSize: "0.74rem", color: "#1B5FE8", fontFamily: BFONT, fontWeight: 300 }}>{ins.coupleTypeNote}</span>
              </div>
            )}
          </div>
        </div>
      ))}
      {!showAll && hidden > 0 && (
        <button onClick={() => setShowAll(true)}
          style={{ background: "white", border: `1.5px solid ${C.stone}`, borderRadius: 12, padding: "0.8rem 1rem", fontSize: "0.78rem", fontWeight: 600, color: C.clay, cursor: "pointer", fontFamily: BFONT, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
          Show {hidden} more {hidden === 1 ? "item" : "items"} ↓
        </button>
      )}
    </div>
  );
}

function AnniversaryResultsView({ userName, partnerName, myAnswers, onBack }) {
  const mine = myAnswers || SARAH_ANNIVERSARY_DEMO;
  const theirs = JAMES_ANNIVERSARY_DEMO;
  const [activeSection, setActiveSection] = useState("insights");
  const insights = deriveAnniversaryInsights(mine, theirs, userName, partnerName, coupleType);

  const questions = [
    { id: "a1", label: "A moment that defined us", category: "Milestones" },
    { id: "a2", label: "Something that made us stronger", category: "Milestones" },
    { id: "a6", label: "What I want to work on", category: "Looking Forward" },
    { id: "a7", label: "Something I wish we'd handled differently", category: "Looking Forward" },
    { id: "a5", label: "Where I see us in 5 years", category: "Looking Forward" },
    { id: "a3", label: "What I'm most grateful for", category: "What Matters" },
    { id: "a4", label: "What I want more of together", category: "What Matters" },
  ];

  const sections = [
    { id: "insights", label: "Insights & Next Steps" },
    { id: "story",    label: "Side by Side" },
  ];

  return (
    <div style={{ animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
      <style>{'@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}'}</style>
      <link href={FONT_URL} rel="stylesheet" />

      {/* Hero */}
      <div style={{ background: "linear-gradient(145deg, #071a10, #0d3320, #0f3d26)", borderRadius: 20, padding: "2rem 2rem 1.75rem", marginBottom: "1.25rem", color: "white", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #1B5FE8, #5B6DF8)" }} />
        <div style={{ position: "absolute", bottom: -40, right: -20, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.1), transparent 70%)", pointerEvents: "none" }} />
        <div style={{ fontSize: "0.6rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(52,211,153,0.9)", marginBottom: "0.5rem", fontFamily: BFONT }}>Relationship Reflection</div>
        <div style={{ fontSize: "clamp(1.8rem,5vw,2.4rem)", fontWeight: 700, fontFamily: HFONT, lineHeight: 1.1, marginBottom: "0.6rem" }}>
          {userName} & {partnerName}
        </div>
        <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.65)", fontFamily: BFONT, fontWeight: 300, lineHeight: 1.65, maxWidth: 460 }}>Both of you reflected independently. What follows draws out what's most meaningful, and what's worth prioritizing together next.</p>

        {/* Section tabs */}
        <div style={{ display: "flex", gap: "0.4rem", marginTop: "1.25rem" }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              style={{ background: activeSection === s.id ? "rgba(52,211,153,0.18)" : "rgba(255,255,255,0.06)", border: "1px solid " + (activeSection === s.id ? "rgba(52,211,153,0.45)" : "rgba(255,255,255,0.1)"), color: activeSection === s.id ? "#34d399" : "rgba(255,255,255,0.65)", padding: "0.35rem 0.9rem", fontSize: "0.68rem", cursor: "pointer", fontFamily: BFONT, borderRadius: 999, fontWeight: activeSection === s.id ? 600 : 400, transition: "all 0.15s" }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* INSIGHTS TAB */}
      {activeSection === "insights" && (
        <div>
          {/* Scale snapshot */}
          <div style={{ background: "white", border: "1.5px solid " + C.stone, borderRadius: 16, padding: "1.25rem 1.25rem 1rem", marginBottom: "1.25rem", overflow: "hidden" }}>
            <div style={{ fontSize: "0.6rem", fontWeight: 700, color: C.clay, textTransform: "uppercase", letterSpacing: "0.18em", fontFamily: BFONT, marginBottom: "1rem" }}>How you're each feeling right now</div>
            {ANNIVERSARY_QUESTIONS.filter(q => q.type === "scale").map(q => {
              const myVal = mine[q.id] ?? 2;
              const theirVal = theirs[q.id] ?? 2;
              return (
                <div key={q.id} style={{ marginBottom: "0.85rem" }}>
                  <div style={{ fontSize: "0.72rem", color: C.ink, fontWeight: 500, fontFamily: BFONT, marginBottom: "0.45rem" }}>{q.text}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    {[[userName, myVal, "#E8673A"], [partnerName, theirVal, "#1B5FE8"]].map(([name, val, color]) => (
                      <div key={name} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ fontSize: "0.6rem", fontWeight: 700, color, width: 44, flexShrink: 0, fontFamily: BFONT }}>{name}</div>
                        <div style={{ display: "flex", gap: 3, flex: 1 }}>
                          {q.scaleLabels.map((_, i) => (
                            <div key={i} style={{ flex: 1, height: 7, borderRadius: 3, background: i <= val ? color : color + "22" }} />
                          ))}
                        </div>
                        <div style={{ fontSize: "0.62rem", color: C.muted, fontFamily: BFONT, width: 90, flexShrink: 0, textAlign: "right" }}>{q.scaleLabels[val]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary bar */}
          <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            {[
              { label: `${insights.filter(i=>i.type==="strength").length} strengths identified`, color: "#10b981", bg: "#EDFAF5" },
              { label: `${insights.filter(i=>i.type==="explore").length} areas to explore`, color: "#F59E0B", bg: "#FEF9EE" },
              { label: "11 questions · 2 voices", color: "#1B5FE8", bg: "#EEF0FF" },
            ].map(b => (
              <div key={b.label} style={{ background: b.bg, borderRadius: 8, padding: "0.3rem 0.7rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: b.color, flexShrink: 0 }} />
                <span style={{ fontSize: "0.65rem", color: b.color, fontWeight: 600, fontFamily: BFONT }}>{b.label}</span>
              </div>
            ))}
          </div>

          {/* Insight cards */}
          <InsightCardList insights={insights} />

          {/* Closing card */}
          <div style={{ background: "linear-gradient(145deg, #071a10, #0d3320)", borderRadius: 16, padding: "2rem", color: "white", textAlign: "center", marginTop: "0.5rem" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#10b981", marginBottom: "0.75rem" }} />
            <p style={{ fontFamily: font.display, fontSize: "1.15rem", fontWeight: 700, color: "white", marginBottom: "0.75rem", lineHeight: 1.3 }}>You're not starting from scratch. You're building on something real.</p>
            <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.65)", fontFamily: BFONT, fontWeight: 300, lineHeight: 1.75, maxWidth: 420, margin: "0 auto" }}>These reflections are yours to keep. Come back to them. The conversations they point to are the ones that matter, not because they're hard, but because they're about choosing each other with more intention.</p>
          </div>
        </div>
      )}

      {/* SIDE BY SIDE TAB */}
      {activeSection === "story" && (
        <div>
          {/* Group by category */}
          {["Milestones", "How We're Doing", "Looking Forward", "What Matters"].map(cat => {
            const catQs = questions.filter(q => q.category === cat);
            return (
              <div key={cat} style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#1B5FE8", fontWeight: 700, fontFamily: BFONT, marginBottom: "0.6rem" }}>{cat}</div>
                {catQs.map(q => (
                  <div key={q.id} style={{ background: "white", border: "1.5px solid " + C.stone, borderRadius: 14, marginBottom: "0.65rem", overflow: "hidden" }}>
                    <div style={{ padding: "0.7rem 1.1rem", borderBottom: "1px solid " + C.stone + "50", background: "#FAFAF8" }}>
                      <span style={{ fontFamily: font.display, fontSize: "0.82rem", fontWeight: 700, color: C.ink }}>{q.label}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                      {[[userName, mine[q.id], "#E8673A"], [partnerName, theirs[q.id], "#1B5FE8"]].map(([name, ans, col], i) => (
                        <div key={name} style={{ padding: "0.9rem 1.1rem", borderRight: i === 0 ? "1px solid " + C.stone + "40" : "none" }}>
                          <div style={{ fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: col, fontWeight: 700, fontFamily: BFONT, marginBottom: "0.45rem" }}>{name}</div>
                          <p style={{ fontSize: "0.79rem", color: C.text, fontFamily: BFONT, fontWeight: 300, lineHeight: 1.72, margin: 0, fontStyle: "italic" }}>"{ans || "-"}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BETA SURVEY MODAL — 4-question in-app feedback, triggered from results sidebar
// ─────────────────────────────────────────────────────────────────────────────
const BETA_Qs = [
  {
    id: "useful",
    q: "How useful were your results?",
    type: "scale",
    labels: ["Not useful", "Somewhat", "Very useful"],
  },
  {
    id: "surprise",
    q: "Was there anything in your results that surprised you?",
    type: "choice",
    options: ["Yes — something I didn't expect", "A little — some things landed differently", "Not really — it confirmed what I knew"],
  },
  {
    id: "together",
    q: "Have you reviewed your results with your partner yet?",
    type: "choice",
    options: ["Yes, together", "Not yet — planning to", "No — we did it separately"],
  },
  {
    id: "improve",
    q: "What would have made Attune more useful?",
    type: "text",
    placeholder: "Anything at all — length, format, what was missing, what felt off",
  },
];

function BetaSurveyModal({ userName, coupleType, onClose }) {
  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState({});
  const [submitted, setSubmitted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const q = BETA_Qs[step];
  const total = BETA_Qs.length;
  const ans = answers[q?.id];
  const canNext = q?.type === "text" ? true : !!ans;

  const next = () => {
    if (step < total - 1) setStep(s => s + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch('/api/get-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'beta_survey', userName, coupleType: coupleType?.name, answers }),
      });
    } catch {}
    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(14,11,7,0.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.cream, borderRadius: 22, padding: "2.25rem 2rem", width: "100%", maxWidth: 400, textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem", fontSize: "1.3rem" }}>✓</div>
        <div style={{ fontFamily: font.display, fontSize: "1.3rem", fontWeight: 700, color: C.ink, marginBottom: "0.6rem" }}>Thank you.</div>
        <p style={{ fontSize: "0.85rem", color: C.muted, fontFamily: font.body, lineHeight: 1.7, marginBottom: "1.5rem" }}>Your feedback goes directly to the people building Attune. It shapes what we change.</p>
        <button onClick={onClose} style={{ background: C.ink, color: "white", border: "none", borderRadius: 11, padding: "0.7rem 2rem", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: font.body }}>Done</button>
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(14,11,7,0.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.cream, borderRadius: 22, padding: "2.25rem 2rem", width: "100%", maxWidth: 420, boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
          <div>
            <div style={{ fontSize: "0.55rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "#E8673A", fontFamily: font.body, fontWeight: 700, marginBottom: "0.2rem" }}>Beta feedback</div>
            <div style={{ fontSize: "0.7rem", color: C.muted, fontFamily: font.body }}>{step + 1} of {total}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: "1.1rem", cursor: "pointer", color: C.muted }}>✕</button>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: C.stone, borderRadius: 2, marginBottom: "1.75rem", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${((step + 1) / total) * 100}%`, background: "linear-gradient(90deg,#E8673A,#1B5FE8)", borderRadius: 2, transition: "width 0.3s ease" }} />
        </div>

        {/* Question */}
        <div style={{ fontFamily: font.display, fontSize: "1.1rem", fontWeight: 700, color: C.ink, lineHeight: 1.3, marginBottom: "1.5rem" }}>{q.q}</div>

        {/* Scale */}
        {q.type === "scale" && (
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            {[1, 2, 3, 4, 5].map(v => (
              <button key={v} onClick={() => setAnswers(a => ({ ...a, [q.id]: v }))}
                style={{ flex: 1, aspectRatio: "1", borderRadius: 10, border: `1.5px solid ${ans === v ? "#E8673A" : C.stone}`, background: ans === v ? "#FFF0EB" : "white", color: ans === v ? "#E8673A" : C.muted, fontWeight: ans === v ? 700 : 400, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.12s", fontFamily: font.body }}>
                {v}
              </button>
            ))}
          </div>
        )}
        {q.type === "scale" && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.62rem", color: C.muted, fontFamily: font.body, marginBottom: "1.5rem" }}>
            {q.labels.map((l, i) => <span key={i}>{l}</span>)}
          </div>
        )}

        {/* Choice */}
        {q.type === "choice" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
            {q.options.map((o, i) => (
              <button key={i} onClick={() => setAnswers(a => ({ ...a, [q.id]: o }))}
                style={{ padding: "0.75rem 1rem", borderRadius: 11, border: `1.5px solid ${ans === o ? "#E8673A" : C.stone}`, background: ans === o ? "#FFF0EB" : "white", color: ans === o ? "#E8673A" : C.ink, fontWeight: ans === o ? 600 : 400, fontSize: "0.82rem", cursor: "pointer", textAlign: "left", fontFamily: font.body, transition: "all 0.12s" }}>
                {o}
              </button>
            ))}
          </div>
        )}

        {/* Text */}
        {q.type === "text" && (
          <textarea
            placeholder={q.placeholder}
            value={ans || ""}
            onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
            rows={4}
            style={{ width: "100%", border: `1.5px solid ${C.stone}`, borderRadius: 11, padding: "0.75rem 1rem", fontSize: "0.85rem", fontFamily: font.body, color: C.ink, background: "white", outline: "none", resize: "none", marginBottom: "1.5rem", boxSizing: "border-box" }}
          />
        )}

        <button onClick={next} disabled={!canNext || submitting}
          style={{ width: "100%", background: canNext ? "linear-gradient(135deg, #E8673A, #1B5FE8)" : C.stone, color: canNext ? "white" : C.muted, border: "none", borderRadius: 11, padding: "0.85rem", fontSize: "0.82rem", fontWeight: 700, cursor: canNext ? "pointer" : "default", fontFamily: font.body, transition: "all 0.15s" }}>
          {submitting ? "Submitting…" : step < total - 1 ? "Next →" : "Submit feedback"}
        </button>
      </div>
    </div>
  );
}

function UnifiedResults({ ex1Answers, partnerEx1, ex2Answers, partnerEx2, ex3Answers, partnerEx3, hasAnniversary, userName, partnerName, initialSection, isMobile = false, portrait = null, hasChecklist = false, hasBudget = false, hasLMFT = false, onNavigateTool = null, userPronouns = "", partnerPronouns = "" }) {

  // Compute all the data we need up front
  const myS = calcDimScores(ex1Answers);
  const partS = calcDimScores(partnerEx1);
  const personalityFeedback = generatePersonalityFeedback(myS, partS, userName, partnerName);
  const sortedFeedback = [...personalityFeedback].sort((a, b) => a.gap - b.gap);
  // Domain order — matches PersonalityResults navigation
  const UR_DOMAIN_ORDER = ["energy","expression","closeness","love","needs","bids","conflict","stress","repair","feedback"];
  const orderedDims = UR_DOMAIN_ORDER.filter(d => personalityFeedback.some(f => f.dim === d));
  const byDim = Object.fromEntries(personalityFeedback.map(f => [f.dim, f]));
  const avgGap = personalityFeedback.reduce((s, f) => s + f.gap, 0) / personalityFeedback.length;
  const pairing = overallPairingLabel(avgGap);

  // Expectations data
  const allRows = RESPONSIBILITY_CATEGORIES.flatMap(cat =>
    cat.items.map(item => {
      const key = `${cat.id}__${item}`;
      const mine = ex2Answers?.responsibilities?.[key];
      const theirs = ex2Answers?.responsibilities?.[key] ? partnerEx2?.responsibilities?.[key] : null;
      const bothAnswered = mine && theirs;
      const aligned = mine === theirs;
      return { item, category: cat.label, catId: cat.id, mine, theirs, aligned, bothAnswered };
    })
  );
  const expCatSummary = RESPONSIBILITY_CATEGORIES.map(cat => {
    const rows = allRows.filter(r => r.catId === cat.id && r.bothAnswered);
    const pct = rows.length ? Math.round((rows.filter(r => r.aligned).length / rows.length) * 100) : null;
    return { ...cat, pct };
  });

  const alignedCount = allRows.filter(r => r.aligned && r.bothAnswered).length;
  const alignPct = allRows.filter(r => r.bothAnswered).length
    ? Math.round((alignedCount / allRows.filter(r => r.bothAnswered).length) * 100) : 50;
  const coupleType = deriveCoupleTypeFromExercise(
    myS, partS, alignPct
  );
  const [typeCopied, setTypeCopied] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [stayEmail, setStayEmail] = useState('');
  const [stayDone, setStayDone] = useState(() => { try { return !!localStorage.getItem('attune_stay_subscribed'); } catch { return false; } });
  const [stayLoading, setStayLoading] = useState(false);
  const handleStaySubmit = async () => {
    if (!stayEmail.trim() || !stayEmail.includes('@')) return;
    setStayLoading(true);
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'beta_survey',
            userId: account?.id || null, toEmail: stayEmail, toName: userName, partnerName, coupleType: coupleType?.name, surveyUrl: window.location.origin + '/feedback' }),
      });
      localStorage.setItem('attune_stay_subscribed', '1');
    } catch {}
    setStayDone(true);
    setStayLoading(false);
  };

  // Section/page system: "summary" | "comm-overview" | "comm-{dim}" | "exp-overview" | "exp-{catId}" | "exp-life" | "reflection"
  const getInitialSection = () => {
    if (initialSection === "personality") return "comm-overview";
    if (initialSection === "expectations") return "exp-overview";
    if (initialSection === "anniversary") return "reflection";
    if (initialSection) return initialSection;
    return "highlights";
  };
  const [section, setSection] = useState(getInitialSection());
  const [commExpanded, setCommExpanded] = useState(section.startsWith("comm"));
  const [expExpanded, setExpExpanded] = useState(section.startsWith("exp"));
  const [reflExpanded, setReflExpanded] = useState(section.startsWith("reflection"));

  // ── ANONYMOUS TYPE TRACKING ─────────────────────────────────────────────────
  // Fires once per results session. No PII — only type IDs and 4-letter style codes.
  const _typeFired = useRef(false);
  useEffect(() => {
    if (_typeFired.current) return;
    _typeFired.current = true;
    const codeA = getStyleCode(myS);
    const codeB = getStyleCode(partS);
    const gapTier = avgGap < 1.0 ? "aligned" : avgGap < 1.8 ? "compatible" : avgGap < 2.5 ? "complementary" : "distinct";
    const hasEx2 = !!(ex2Answers && partnerEx2 && Object.keys(ex2Answers).length > 0 && Object.keys(partnerEx2).length > 0);
    fetch("/api/track-type", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coupleTypeId: coupleType?.id || "complementary",
        codeA, codeB, gapTier, hasEx2,
      }),
    }).catch(() => {}); // non-blocking, non-critical

    // ── Save full computed session to localStorage for admin workbook generation ──
    // Serializes the real scores, couple type, and expectations gaps from this session.
    // Admin reads attune_live_session to generate a real personalized workbook.
    try {
      const account = (() => { try { return JSON.parse(localStorage.getItem('attune_account') || 'null'); } catch { return null; } })();
      const EXP_LIFE_KEYS = [
        { key: 'household', label: 'Visible Household Labor' },
        { key: 'emotional', label: 'Emotional & Invisible Labor' },
        { key: 'financial', label: 'Financial & Money' },
        { key: 'career',    label: 'Career' },
        { key: 'children',  label: 'Children & Family' },
        { key: 'lifestyle', label: 'Home & Lifestyle' },
      ];
      const sessionExpGaps = EXP_LIFE_KEYS.map(({ key, label }) => {
        const yourAns    = ex2Answers?.life?.['lq_' + key] || null;
        const partnerAns = partnerEx2?.life?.['lq_' + key] || null;
        return { key, label, yourAnswer: yourAns, partnerAnswer: partnerAns, aligned: yourAns === partnerAns };
      });
      const session = {
        savedAt:      Date.now(),
        userName:     userName || account?.name || 'Partner A',
        partnerName:  partnerName || account?.partnerName || 'Partner B',
        pkg:          account?.pkg || 'core',
        scores:       myS,
        partnerScores: partS,
        coupleType:   coupleType ? {
          id:          coupleType.id,
          name:        coupleType?.name,
          tagline:     coupleType?.tagline,
          description: coupleType?.description,
          nuance:      coupleType?.nuance,
          color:       coupleType?.color,
        } : null,
        expGaps: sessionExpGaps,
      };
      localStorage.setItem('attune_live_session', JSON.stringify(session));
    } catch (_) {}

    // ── Auto-fulfil workbook if pre-ordered ─────────────────────────────────
    // If the couple ordered a digital workbook before completing exercises,
    // generate it now and mark it ready. If they ordered print, flag for fulfillment.
    (async () => {
      try {
        const orderRaw = localStorage.getItem('attune_order');
        if (!orderRaw) return;
        const ord = JSON.parse(orderRaw);
        if (!ord?.addonWorkbook) return;
        if (localStorage.getItem('attune_workbook_ready') === 'true') return; // already done

        if (ord.addonWorkbook === 'print') {
          // Flag print order for fulfillment — admin will pick this up
          ord.workbookStatus = 'print_queued';
          localStorage.setItem('attune_order', JSON.stringify(ord));
          localStorage.setItem('attune_workbook_print_queued', JSON.stringify({
            queuedAt: Date.now(),
            orderNum: ord.orderNum,
            buyerName: ord.buyerName,
            buyerEmail: ord.buyerEmail,
          }));
          return;
        }

        // Digital — auto-generate
        ord.workbookStatus = 'generating';
        localStorage.setItem('attune_order', JSON.stringify(ord));

        const EXP_KEYS_AUTO = [
          { key:'household',label:'Visible Household Labor' },
          { key:'emotional',label:'Emotional & Invisible Labor' },
          { key:'financial',label:'Financial & Money' },
          { key:'career',   label:'Career' },
          { key:'children', label:'Children & Family' },
          { key:'lifestyle',label:'Home & Lifestyle' },
        ];
        const autoExpGaps = EXP_KEYS_AUTO.map(({ key, label }) => ({
          key, label,
          yourAnswer:    ex2Answers?.life?.['lq_' + key] || null,
          partnerAnswer: partnerEx2?.life?.['lq_' + key] || null,
          aligned: (ex2Answers?.life?.['lq_' + key] || null) === (partnerEx2?.life?.['lq_' + key] || null),
        }));

        const resp = await fetch('/api/generate-workbook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userName, partnerName,
            scores: myS, partnerScores: partS,
            // Pass the full couple type so the workbook can render the
            // couple-type intro page with strengths / sticking / patterns.
            coupleType: coupleType || null,
            expGaps: autoExpGaps,
          }),
        });

        if (resp.ok) {
          const blob = await resp.blob();
          // Store as base64 in localStorage so user can download any time
          const reader = new FileReader();
          reader.onload = () => {
            try {
              localStorage.setItem('attune_workbook_blob', reader.result); // base64 data URL
              localStorage.setItem('attune_workbook_ready', 'true');
              ord.workbookStatus = 'ready';
              localStorage.setItem('attune_order', JSON.stringify(ord));
              // Notify buyer by email
              if (ord.buyerEmail) {
                fetch('/api/send-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ type: 'workbook_ready',
            userId: account?.id || null, toEmail: ord.buyerEmail, toName: ord.partner1Name || 'there', partnerName: ord.partner2Name || '', downloadUrl: window.location.origin + '/app', orderNum: ord.orderNum || '' }),
                }).catch(() => {});
              }
            } catch (e) {
              // Storage full — just mark ready without caching blob
              localStorage.setItem('attune_workbook_ready', 'true');
              ord.workbookStatus = 'ready';
              localStorage.setItem('attune_order', JSON.stringify(ord));
            }
          };
          reader.readAsDataURL(blob);
        }
      } catch (_) {}
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (sec) => {
    setSection(sec);
    if (sec.startsWith("comm")) setCommExpanded(true);
    if (sec.startsWith("exp")) setExpExpanded(true);
    if (sec.startsWith("reflection")) setReflExpanded(true);
    const sc = document.querySelector("[data-results-scroll]");
    if (sc) sc.scrollTop = 0; else window.scrollTo({ top: 0 });
  };

  // Sidebar items
  const sidebarSections = [
    { id: "highlights", label: "Highlights", icon: "✦", color: coupleType?.color || "#E8673A" },
    { id: "summary", label: "Full Summary", icon: "◈" },
    { id: "couple-type", label: "Couple Type", icon: "◈", color: coupleType?.color || "#E8673A" },
    { id: "couple-map", label: "Your Couple Map", icon: "⊕", color: coupleType?.color || "#E8673A" },
    {
      id: "comm", label: "Communication", icon: "◉", color: "#9B5DE5",
      children: [
        { id: "comm-overview", label: "Overview" },
        // Inner Worlds — purple
        { id: "comm-domain-inner", label: "Your Inner Worlds", isDomainHeader: true, color: "#9B5DE5" },
        ...orderedDims.filter(d => ["energy","expression","closeness"].includes(d)).map(d => ({ id: `comm-${d}`, label: DIM_META[d].label, isDeepChild: true, color: "#9B5DE5" })),
        // Connection — orange
        { id: "comm-domain-connection", label: "How You Connect", isDomainHeader: true, color: "#E8673A" },
        ...orderedDims.filter(d => ["love","needs","bids"].includes(d)).map(d => ({ id: `comm-${d}`, label: DIM_META[d].label, isDeepChild: true, color: "#E8673A" })),
        // Hard moments — blue
        { id: "comm-domain-hard", label: "When Things Get Hard", isDomainHeader: true, color: "#1B5FE8" },
        ...orderedDims.filter(d => ["conflict","stress","repair","feedback"].includes(d)).map(d => ({ id: `comm-${d}`, label: DIM_META[d].label, isDeepChild: true, color: "#1B5FE8" })),
        { id: "comm-profiles", label: "Individual profiles" },
        { id: "comm-plan", label: "Communication Action Plan" },
      ]
    },
    {
      id: "exp", label: "Expectations", icon: "◉", color: "#1B5FE8",
      children: [
        { id: "exp-overview", label: "Overview" },
        { id: "exp-common-ground", label: "Common Ground" },
        { id: "exp-conversations", label: "Conversations Worth Having" },
        { id: "exp-life-header", label: "The Life You're Building", isDomainHeader: true, color: "#10B981" },
        ...FIXED_CATS.map((fc, ci) => ({ id: `exp-convo-${ci}`, label: fc.label, isDeepChild: true, color: "#10B981" })),
        { id: "exp-action-plan", label: "Expectations Action Plan" },
      ]
    },
    ...(hasAnniversary ? [{
      id: "reflection", label: "Relationship Reflection", shortLabel: "Refl.", icon: "♡", color: "#1B5FE8",
      children: [
        { id: "reflection-overview", label: "Overview" },
        { id: "reflection-insights", label: "Insights" },
        { id: "reflection-story", label: "Side by Side" },
        { id: "reflection-plan", label: "Action Plan" },
      ]
    }] : []),
    { id: "what-comes-next", label: "What Comes Next", icon: "→", color: "#E8673A" },
  ];

  // Sidebar render
  const Sidebar = () => (
    <div style={{ width: 200, flexShrink: 0, paddingRight: "1.5rem", display: "flex", flexDirection: "column", gap: "0.15rem" }}>
      {sidebarSections.map(sec => {
        const isActive = section === sec.id || (sec.children && section.startsWith(sec.id + "-") || section === `comm-profiles` && sec.id === "comm" || section === `comm-plan` && sec.id === "comm");
        const isExpanded = sec.id === "comm" ? commExpanded : sec.id === "exp" ? expExpanded : sec.id === "reflection" ? reflExpanded : false;
        const color = sec.color || "#8C7A68";
        return (
          <div key={sec.id}>
            <button onClick={() => {
              if (sec.children) {
                if (sec.id === "comm") { setCommExpanded(e => !e); if (!commExpanded) go("comm-overview"); }
                else if (sec.id === "exp") { setExpExpanded(e => !e); if (!expExpanded) go("exp-overview"); }
                else if (sec.id === "reflection") { setReflExpanded(e => !e); if (!reflExpanded) go("reflection-overview"); }
              } else { go(sec.id); }
            }} style={{ width: "100%", background: (section === sec.id) ? color + "15" : "transparent", border: "none", borderRadius: 8, padding: "0.5rem 0.65rem", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: BFONT, transition: "background .15s" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: isActive ? 700 : 500, color: isActive ? color : "#8C7A68" }}>{sec.icon && <span style={{ marginRight: "0.4rem", fontSize: "0.65rem", opacity: 0.7 }}>{sec.icon}</span>}{sec.label}</span>
              {sec.children && <span style={{ fontSize: "0.65rem", color: "#8C7A68", opacity: 0.6 }}>{isExpanded ? "▾" : "▸"}</span>}
            </button>
            {sec.children && isExpanded && (
              <div style={{ paddingLeft: "0.75rem", display: "flex", flexDirection: "column", gap: "0.08rem", marginBottom: "0.25rem" }}>
                {sec.children.map(child => {
                  if (child.isDomainHeader) {
                    // Domain group header — not clickable, just a label with domain color
                    return (
                      <div key={child.id} style={{ padding: "0.5rem 0.6rem 0.15rem", marginTop: "0.25rem" }}>
                        <span style={{ fontSize: "0.55rem", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, color: child.color || color, fontFamily: BFONT }}>{child.label}</span>
                      </div>
                    );
                  }
                  const childColor = child.color || color;
                  return (
                    <button key={child.id} onClick={() => go(child.id)} style={{ background: section === child.id ? childColor + "12" : "transparent", border: "none", borderLeft: section === child.id ? `2px solid ${childColor}` : "2px solid transparent", borderRadius: "0 6px 6px 0", padding: child.isDeepChild ? "0.25rem 0.6rem 0.25rem 1.25rem" : "0.35rem 0.6rem", textAlign: "left", cursor: "pointer", fontFamily: BFONT, transition: "all .12s" }}>
                      <span style={{ fontSize: child.isDeepChild ? "0.65rem" : "0.7rem", fontWeight: section === child.id ? 700 : 400, color: section === child.id ? childColor : child.isDeepChild ? "#AAA098" : "#8C7A68" }}>{child.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Mobile top tab bar (compact, no children)
  const MobileTabBar = () => (
    <div style={{ display: "flex", gap: "0.4rem", overflowX: "auto", paddingBottom: "0.5rem", marginBottom: "1.25rem", borderBottom: `1px solid ${C.stone}` }}>
      {[
        { id: "summary", label: "Summary", color: "#8C7A68" },
        { id: "comm-overview", label: "Comms", color: "#9B5DE5" },
        { id: "exp-overview", label: "Expectations", color: "#1B5FE8" },
        ...(hasAnniversary ? [{ id: "reflection", label: "Refl.", color: "#1B5FE8" }] : []),
      ].map(t => (
        <button key={t.id} onClick={() => go(t.id)} style={{ background: section.startsWith(t.id.replace("-overview","")) ? t.color + "15" : "transparent", border: `1.5px solid ${section.startsWith(t.id.replace("-overview","")) ? t.color : C.stone}`, borderRadius: 999, padding: "0.3rem 0.75rem", fontSize: "0.7rem", fontWeight: 600, color: section.startsWith(t.id.replace("-overview","")) ? t.color : C.muted, cursor: "pointer", fontFamily: BFONT, whiteSpace: "nowrap", flexShrink: 0 }}>
          {t.label}
        </button>
      ))}
    </div>
  );

  // Prev/Next navigation
  // allPages must exactly match sidebar order so Prev/Next stays in sync with the nav
  // Domain order matches sidebar exactly
  const PAGE_DOMAIN_ORDER = ["energy","expression","closeness","values","love","needs","bids","conflict","stress","repair","feedback"];
  const domainOrderedDims = [
    ...PAGE_DOMAIN_ORDER.filter(d => orderedDims.includes(d)),
  ];
  const allPages = [
    "highlights",
    "summary",
    "couple-type", "couple-map",
    "comm-overview",
    ...domainOrderedDims.map(d => `comm-${d}`),
    "comm-profiles", "comm-plan",
    "exp-overview", "exp-common-ground", "exp-conversations",
    ...FIXED_CATS.map((_, ci) => `exp-convo-${ci}`),
    "exp-action-plan",
    ...(hasAnniversary ? ["reflection-overview", "reflection-insights", "reflection-story", "reflection-plan"] : []),
    "what-comes-next",
  ];
  const curIdx = allPages.indexOf(section);
  const PrevNext = () => (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: `1px solid ${C.stone}` }}>
      {curIdx > 0
        ? <button onClick={() => go(allPages[curIdx - 1])} style={{ background: "transparent", border: `1.5px solid ${C.stone}`, borderRadius: 10, padding: "0.6rem 1.25rem", fontSize: "0.72rem", color: C.muted, cursor: "pointer", fontFamily: BFONT, fontWeight: 600 }}>← {getPageLabel(allPages[curIdx - 1])}</button>
        : <div />}
      {curIdx < allPages.length - 1
        ? <button onClick={() => go(allPages[curIdx + 1])} style={{ background: "#2d2250", border: "none", borderRadius: 10, padding: "0.6rem 1.25rem", fontSize: "0.72rem", color: "white", cursor: "pointer", fontFamily: BFONT, fontWeight: 600 }}>{getPageLabel(allPages[curIdx + 1])} →</button>
        : <div />}
    </div>
  );

  function getPageLabel(id) {
    if (id === "highlights") return "Highlights";
    if (id === "couple-type") return "Your Couple Type";
    if (id === "couple-map") return "Your Couple Map";
    if (id === "summary") return "Full Summary";
    if (id === "comm-overview") return "Communication Overview";
    if (id.startsWith("comm-") && id !== "comm-profiles" && id !== "comm-plan") return DIM_META[id.replace("comm-","")]?.label || id;
    if (id === "comm-profiles") return "Individual Profiles";
    if (id === "comm-plan") return "Communication Action Plan";
    if (id === "exp-overview") return "Expectations Overview";
    if (id === "exp-common-ground") return "Common Ground";
    if (id === "exp-conversations") return "Conversations Worth Having";
    if (id === "exp-action-plan") return "Expectations Action Plan";
    if (id.startsWith("exp-convo-")) { const ci = parseInt(id.replace("exp-convo-","")); return FIXED_CATS[ci]?.label || id; }
    if (id === "reflection-overview") return "Reflection Overview";
    if (id === "reflection-insights") return "Reflection Insights";
    if (id === "reflection-story") return "Side by Side";
    if (id === "reflection-plan") return "Reflection Action Plan";
    if (id === "what-comes-next") return "What Comes Next";
    return id;
  }

  // Layout wrapper
  const Layout = ({ children, accent, noPrevNext = false }) => (
    <div>
      {/* Mobile tabs */}
      <div style={{ display: "none" }} className="mobile-tabs"><MobileTabBar /></div>
      <style>{`@media(max-width:680px){.mobile-tabs{display:block!important}.desktop-sidebar{display:none!important}}`}</style>
      <div style={{ display: "flex", gap: "0", alignItems: "flex-start" }}>
        {/* Sidebar: sticky + its own scroll context so wheel events stay in the nav */}
        <div className="desktop-sidebar" style={{
          position: "sticky",
          top: 0,
          paddingTop: "1.25rem",
          maxHeight: "calc(100vh - 112px)",
          overflowY: "auto",
          overflowX: "hidden",
          /* Thin custom scrollbar — only shows when sidebar is long enough to need it */
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(193,127,71,0.25) transparent",
        }}>
          <Sidebar />
          {/* Extra bottom padding so last nav item doesn't sit flush at the edge */}
          <div style={{ height: "2rem" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {children}
          {!noPrevNext && <PrevNext />}
        </div>
      </div>
    </div>
  );

  // ── PAGE: HIGHLIGHTS ─────────────────────────────────────────────────────────
  if (section === "highlights") {
    return (
      <Layout accent={coupleType?.color || "#E8673A"}>
        <div style={{ maxWidth: 620 }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontFamily: HFONT, fontSize: "1.6rem", fontWeight: 700, color: C.ink, marginBottom: "0.25rem" }}>Your highlights</div>
            <p style={{ fontSize: "0.82rem", color: C.muted, fontFamily: BFONT, margin: 0 }}>Swipe through each card. Download any to share or save.</p>
          </div>
          <ResultsHighlights
            ex1Answers={ex1Answers} partnerEx1={partnerEx1}
            ex2Answers={ex2Answers} partnerEx2={partnerEx2}
            ex3Answers={ex3Answers} partnerEx3={partnerEx3}
            userName={userName} partnerName={partnerName}
            portrait={portrait}
            onDone={() => go("summary")}
            inline={true}
          />
        </div>
      </Layout>
    );
  }

  // ── PAGE: COUPLE TYPE ────────────────────────────────────────────────────────
  if (section === "couple-type") {
    const ct = coupleType;
    if (!ct) return <Layout accent="#E8673A"><p style={{fontFamily:BFONT,color:C.muted}}>Complete both exercises to see your couple type.</p></Layout>;
    const interp = (str) => str
      .replace(/\{U\}/g, userName).replace(/\{P\}/g, partnerName)
      .replace(/\{U_sub\}/g, pronoun(userPronouns, "sub")).replace(/\{U_obj\}/g, pronoun(userPronouns, "obj")).replace(/\{U_pos\}/g, pronoun(userPronouns, "pos"))
      .replace(/\{P_sub\}/g, pronoun(partnerPronouns, "sub")).replace(/\{P_obj\}/g, pronoun(partnerPronouns, "obj")).replace(/\{P_pos\}/g, pronoun(partnerPronouns, "pos"));
    const handleShare = () => {
      const text = `We're "${ct.name}", ${ct.tagline} Find yours at attune.com`;
      navigator.clipboard?.writeText(text).then(() => { setTypeCopied(true); setTimeout(() => setTypeCopied(false), 2500); });
    };
    return (
      <Layout accent={ct.color}>
        <div style={{ maxWidth: 660 }}>

          {/* ── REVEAL ZONE ── */}
          <div style={{ borderRadius: 24, overflow: "hidden", marginBottom: "1.5rem", position: "relative" }}>
            {/* Full-color hero */}
            <div style={{ background: `linear-gradient(145deg, ${ct.color}ee, ${ct.color}99)`, padding: "2.75rem 2.5rem 2.25rem", position: "relative" }}>
              {/* Large decorative type name watermark */}
              <div style={{ position: "absolute", bottom: -20, right: -10, fontFamily: HFONT, fontSize: "7rem", fontWeight: 700, color: "rgba(255,255,255,0.08)", lineHeight: 1, pointerEvents: "none", userSelect: "none", letterSpacing: "-0.04em", whiteSpace: "nowrap" }}>
                {ct.name.replace("The ", "")}
              </div>
              {/* Eyebrow */}
              <div style={{ fontSize: "0.58rem", letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", fontFamily: BFONT, fontWeight: 700, marginBottom: "1.25rem" }}>
                {userName} & {partnerName} · your couple type
              </div>
              {/* Type name */}
              <div style={{ fontFamily: HFONT, fontSize: "clamp(2.8rem, 7vw, 4.5rem)", fontWeight: 700, color: "white", lineHeight: 0.92, marginBottom: "1rem", letterSpacing: "-0.03em" }}>
                {ct.name}
              </div>
              {/* Tagline */}
              <p style={{ fontSize: "1.05rem", color: "rgba(255,255,255,0.88)", fontFamily: BFONT, fontWeight: 500, lineHeight: 1.45, margin: 0, maxWidth: 440 }}>
                {ct.tagline}
              </p>
            </div>

          </div>

          {/* ── WHAT THIS LOOKS LIKE for names ── */}
          <div style={{ background: "white", border: `1.5px solid ${C.stone}`, borderRadius: 18, padding: "1.75rem", marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.6rem", letterSpacing: "0.22em", textTransform: "uppercase", color: ct.color, fontFamily: BFONT, fontWeight: 700, marginBottom: "1rem" }}>
              What this looks like for {userName} &amp; {partnerName}
            </div>
            <p style={{ fontSize: "0.88rem", color: C.ink, fontFamily: BFONT, lineHeight: 1.75, margin: 0, fontWeight: 400 }}>
              {ct.patterns?.map(p => interp(p)).join(" ")}
            </p>
          </div>



          {/* ── STRENGTHS ── */}
          {ct.strengths?.length > 0 && (
            <div style={{ background: "white", border: `1.5px solid ${C.stone}`, borderRadius: 18, padding: "1.75rem", marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.6rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "#10b981", fontFamily: BFONT, fontWeight: 700, marginBottom: "1rem" }}>
                What comes naturally to {userName} &amp; {partnerName}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {ct.strengths.slice(0,2).map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(16,185,129,0.12)", border: "1.5px solid rgba(16,185,129,0.3)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                      <span style={{ fontSize: "0.6rem", color: "#10b981", fontWeight: 700 }}>✓</span>
                    </div>
                    <p style={{ fontSize: "0.86rem", color: C.ink, fontFamily: BFONT, lineHeight: 1.7, margin: 0 }}>{interp(s)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STICKING POINTS ── */}
          {ct.stickingPoints?.length > 0 && (
            <div style={{ background: "white", border: `1.5px solid ${C.stone}`, borderRadius: 18, padding: "1.75rem", marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.6rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "#E8673A", fontFamily: BFONT, fontWeight: 700, marginBottom: "1rem" }}>
                Worth watching for
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {ct.stickingPoints.slice(0,2).map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(232,103,58,0.1)", border: "1.5px solid rgba(232,103,58,0.28)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                      <span style={{ fontSize: "0.65rem", color: "#E8673A", fontWeight: 700 }}>!</span>
                    </div>
                    <p style={{ fontSize: "0.86rem", color: C.ink, fontFamily: BFONT, lineHeight: 1.7, margin: 0 }}>{interp(s)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TIPS for this type ── */}
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.6rem", letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted, fontFamily: BFONT, fontWeight: 700, marginBottom: "1rem" }}>
              Actionable next steps
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {ct.tips?.map((tip, i) => {
                const tipColors = [ct.color, ct.shade || "#1B5FE8", "#10b981"];
                const tipColor = tipColors[i % 3];
                return (<div key={i} style={{ background: "white", border: `1.5px solid ${C.stone}`, borderRadius: 14, padding: "1.25rem 1.4rem", borderLeft: `4px solid ${tipColor}` }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: C.ink, fontFamily: BFONT, marginBottom: "0.4rem" }}>{interp(tip.title)}</div>
                  <p style={{ fontSize: "0.82rem", color: C.muted, fontFamily: BFONT, lineHeight: 1.72, margin: "0 0 0.75rem", fontWeight: 300 }}>{interp(tip.body)}</p>
                  {tip.phraseTry && (
                    <div style={{ background: `${tipColor}0d`, border: `1px solid ${tipColor}30`, borderRadius: 8, padding: "0.55rem 0.8rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "0.58rem", letterSpacing: "0.16em", textTransform: "uppercase", color: tipColor, fontFamily: BFONT, fontWeight: 700, whiteSpace: "nowrap", marginTop: "0.1rem" }}>Phrase to try</span>
                      <span style={{ fontSize: "0.78rem", color: C.ink, fontFamily: BFONT, fontStyle: "italic", lineHeight: 1.55 }}>"{interp(tip.phraseTry)}"</span>
                    </div>
                  )}
                </div>);
              })}
            </div>
          </div>



          {/* ── WORKBOOK CTA ── */}
          <div style={{ background: `${ct.color}0d`, border: `1px solid ${ct.color}25`, borderRadius: 14, padding: "1rem 1.25rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <p style={{ fontSize: "0.82rem", color: C.ink, fontFamily: BFONT, lineHeight: 1.55, margin: 0 }}>
              Like what you're seeing? Explore more curated, practical guidance in your{" "}
              <span style={{ fontWeight: 600 }}>personalized workbook.</span>
            </p>
            <a href="/offerings#workbook" style={{ fontSize: "0.78rem", fontWeight: 700, color: ct.color, fontFamily: BFONT, textDecoration: "none", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              See workbook details →
            </a>
          </div>

          {/* ── SHARE ── */}
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={handleShare}
              style={{ background: typeCopied ? "#10b981" : C.ink, color: "white", border: "none", borderRadius: 10, padding: "0.65rem 1.5rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: BFONT, letterSpacing: "0.04em", transition: "background 0.2s" }}>
              {typeCopied ? "Copied to clipboard ✓" : "Share your type →"}
            </button>
            <p style={{ fontSize: "0.72rem", color: C.muted, fontFamily: BFONT, margin: 0 }}>Share on stories or send to a friend.</p>
          </div>

          {/* Methodology reference */}
          <div style={{ marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: `1px solid ${C.stone}`, display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.72rem", color: C.muted, fontFamily: BFONT }}>How we determine this:</span>
            <a href="/attune-methodology.docx" download style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.72rem", color: C.clay, fontFamily: BFONT, fontWeight: 600, textDecoration: "none" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Methodology
            </a>
            <span style={{ fontSize: "0.72rem", color: C.stone, fontFamily: BFONT }}>·</span>
            <a href="/how-it-works#methodology" style={{ fontSize: "0.72rem", color: C.clay, fontFamily: BFONT, fontWeight: 600, textDecoration: "none" }}>Read the overview →</a>
          </div>

        </div>
      </Layout>
    );
  }

  // ── PAGE: COUPLE MAP ──────────────────────────────────────────────────────────
  if (section === "couple-map") {
    const newType = deriveNewCoupleType(myS, partS);
    const itA = INDIVIDUAL_TYPES[newType.typeInfoA.typeCode];
    const itB = INDIVIDUAL_TYPES[newType.typeInfoB.typeCode];
    const accent = newType?.color || "#E8673A";
    const interp = (str) => str
      ? str.replace(/\{U\}/g, userName).replace(/\{P\}/g, partnerName) : str;

    // Reading guide data
    const readingGuide = [
      { label: "Same quadrant", meaning: "Both partners share the same dominant orientation. The dynamic tends toward amplification — the shared strengths and shared risks are both magnified." },
      { label: "Adjacent quadrants", meaning: "Partners share one axis and diverge on the other. One area of strong agreement, one specific friction point worth naming." },
      { label: "Diagonal quadrants", meaning: "Partners diverge on both axes. The widest contrast pairings. Both the conflict timing and the expressiveness gap need explicit attention." },
      { label: "Dot near axis line", meaning: "That partner is closer to balanced on that dimension. Their type is accurate but less extreme — they're more flexible on that axis than their position might suggest." },
      { label: "Dots close together", meaning: "Scores are similar. High compatibility on these axes — look to the other dimensions for where the differences live." },
      { label: "Dots far apart", meaning: "Significant divergence. The map is making the gap visible. This is where the conversation starts." },
    ];

    return (
      <Layout accent={accent}>
        <div style={{ maxWidth: 660 }}>
          {/* ── HEADER ── */}
          <div style={{ marginBottom: "1.75rem" }}>
            <div style={{ fontSize: "0.58rem", letterSpacing: "0.28em", textTransform: "uppercase", color: accent, fontFamily: BFONT, fontWeight: 700, marginBottom: "0.5rem" }}>
              {userName} & {partnerName} · Your Couple Map
            </div>
            <div style={{ fontFamily: HFONT, fontSize: "clamp(1.8rem,4vw,2.4rem)", fontWeight: 700, color: C.ink, lineHeight: 1.0, marginBottom: "0.5rem", letterSpacing: "-0.02em" }}>
              Where you each sit
            </div>
            <p style={{ fontSize: "0.88rem", color: C.muted, fontFamily: BFONT, fontWeight: 300, lineHeight: 1.75, margin: 0 }}>
              Two dots. Two axes. The distance, the quadrants, and the proximity to the lines between them all carry meaning.
            </p>
          </div>

          {/* ── THE MAP ── */}
          <div style={{ background: "white", border: `1.5px solid ${C.stone}`, borderRadius: 20, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <CoupleMapSVG myS={myS} partS={partS} userName={userName} partnerName={partnerName} size={480} />
          </div>

          {/* ── AXIS DESCRIPTIONS ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
            {[
              { label: "Engage / Withdraw", desc: "How you respond when something is hard or unresolved — do you move toward the situation or pull back from it first?", dims: "Conflict 55% · Stress 30% · Repair 15%", poles: ["Engage: moves toward resolution, addresses quickly", "Withdraw: needs space first, processes privately"], color: "#9B5DE5" },
              { label: "Open / Guarded", desc: "How freely you express what's going on inside — do you share it openly or hold it privately until ready?", dims: "Expression 45% · Feedback 30% · Needs 25%", poles: ["Open: partner usually knows how you're feeling", "Guarded: processes internally, expressive when ready"], color: "#1B5FE8" },
            ].map(ax => (
              <div key={ax.label} style={{ background: "white", border: `1.5px solid ${C.stone}`, borderRadius: 16, padding: "1.25rem", borderTop: `4px solid ${ax.color}` }}>
                <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: ax.color, fontFamily: BFONT, fontWeight: 700, marginBottom: "0.5rem" }}>{ax.label}</div>
                <p style={{ fontSize: "0.82rem", color: C.ink, fontFamily: BFONT, lineHeight: 1.65, margin: "0 0 0.65rem" }}>{ax.desc}</p>
                <div style={{ fontSize: "0.62rem", color: C.muted, fontFamily: BFONT, fontStyle: "italic", marginBottom: "0.5rem" }}>Scored from: {ax.dims}</div>
                {ax.poles.map((p, i) => (
                  <div key={i} style={{ fontSize: "0.72rem", color: C.muted, fontFamily: BFONT, marginBottom: "0.2rem" }}>
                    <span style={{ fontWeight: 700, color: ax.color }}>{i === 0 ? "↑ " : "↓ "}</span>{p}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* ── PLACEMENT BLURBS ── */}
          {(() => {
            const getBlurb = (name, info) => {
              const { typeCode, engageCoord, openCoord } = info;
              const eS = Math.abs(engageCoord - 0.5);
              const oS = Math.abs(openCoord - 0.5);
              const strongEngage = engageCoord > 0.8;
              const nearEngageCenter = engageCoord >= 0.35 && engageCoord <= 0.65;
              const strongWithdraw = engageCoord < 0.2;
              const nearOpenCenter = openCoord >= 0.35 && openCoord <= 0.65;
              const blurbs = {
                W: strongEngage
                  ? `${name} engages quickly and with full momentum — when something is unresolved, they feel it and move toward it without hesitation.`
                  : nearEngageCenter
                  ? `${name} leans toward resolution but has a slightly longer runway than a typical Initiator — there's a beat of processing before they engage fully.`
                  : nearOpenCenter
                  ? `${name} engages readily but holds their inner experience a little closer than a typical Initiator — they show up for the conversation; they just don't put every feeling into the shared space immediately.`
                  : `${name} moves toward resolution and expresses openly, with enough self-awareness to calibrate what they're sharing and when.`,
                X: strongEngage
                  ? `${name} pushes hard toward resolution — once they've processed internally, they don't sit on it. The urgency toward resolution is real; it's just preceded by a private preparation phase.`
                  : nearEngageCenter
                  ? `${name} has a longer internal preparation phase before engaging — they push toward resolution, but the processing takes real time before anything surfaces.`
                  : nearOpenCenter
                  ? `${name} is a Driver who runs slightly warmer than average — they process privately but share a bit more of the working-through than a typical Driver.`
                  : `${name} engages toward resolution and processes privately, with a comfortable mix of thoughtfulness and forward momentum.`,
                Y: strongWithdraw
                  ? `${name} needs significant space before they can show up to a hard conversation — not avoidance, just a longer processing runway. What they eventually bring is emotionally complete and worth the wait.`
                  : nearEngageCenter
                  ? `${name} needs space first, but it's a shorter runway than many Feelers — they come back relatively quickly once they've landed somewhere.`
                  : nearOpenCenter
                  ? `${name} processes inward and holds what's going on privately until ready — emotionally expressive when they arrive, but the arrival takes both time and internal settling.`
                  : `${name} needs space to process before engaging, carries emotional weight visibly in the interim, and returns when ready with something real.`,
                Z: strongWithdraw
                  ? `${name} has the longest runway in the room — they process privately and need substantial space before anything surfaces. What comes out is considered and real; it just requires time and no pressure.`
                  : nearEngageCenter
                  ? `${name} processes privately but has a slightly stronger pull toward resolution than a typical Holder — they'll surface what's going on, they just need space and no pressure.`
                  : nearOpenCenter
                  ? `${name} holds things privately but is slightly more emotionally accessible than a typical Holder — more going on internally than most Protectors show.`
                  : `${name} holds things close and processes privately, with a baseline steadiness and a comfortable relationship with quiet.`,
              };
              return blurbs[typeCode] || "";
            };
            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
                {[
                  { name: userName, info: newType.typeInfoA, it: itA },
                  { name: partnerName, info: newType.typeInfoB, it: itB },
                ].map(({ name, info, it }) => (
                  <div key={name} style={{ background: "white", border: `1.5px solid ${C.stone}`, borderRadius: 16, padding: "1.25rem", borderTop: `4px solid ${it.color}` }}>
                    <div style={{ fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: it.color, fontFamily: BFONT, fontWeight: 700, marginBottom: "0.35rem" }}>{name}</div>
                    <div style={{ fontFamily: HFONT, fontSize: "1rem", fontWeight: 700, color: C.ink, marginBottom: "0.5rem" }}>{it.name}</div>
                    <p style={{ fontSize: "0.82rem", color: C.muted, fontFamily: BFONT, lineHeight: 1.7, margin: 0 }}>{getBlurb(name, info)}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* ── INDIVIDUAL TYPES ── */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: isMobile ? "0.5rem" : "0.85rem", marginBottom: "1.5rem" }}>
            {[
              { name: userName, it: itA, info: newType.typeInfoA },
              { name: partnerName, it: itB, info: newType.typeInfoB },
            ].map(({ name, it, info }) => (
              <div key={name} style={{ background: "white", border: `1.5px solid ${C.stone}`, borderRadius: 16, padding: isMobile ? "0.85rem 0.75rem" : "1.25rem", borderTop: `4px solid ${it.color}` }}>
                <div style={{ fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: it.color, fontFamily: BFONT, fontWeight: 700, marginBottom: "0.35rem" }}>{name}</div>
                <div style={{ fontFamily: HFONT, fontSize: isMobile ? "0.95rem" : "1.15rem", fontWeight: 700, color: C.ink, marginBottom: "0.25rem" }}>{it.name}</div>
                <div style={{ fontSize: isMobile ? "0.65rem" : "0.75rem", color: C.muted, fontFamily: BFONT, lineHeight: 1.5, marginBottom: isMobile ? "0.5rem" : "0.75rem" }}>{it.desc}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  {[
                    {
                      label: "Engage/Withdraw",
                      value: info.withdrawScore <= 3.0 ? "Engage-leaning" : "Withdraw-leaning",
                      score: info.engageCoord,
                      driver: (() => {
                        const s = name === userName ? myS : partS;
                        const scores = [
                          { dim: "Conflict", w: 0.55, v: s.conflict || 3 },
                          { dim: "Stress",   w: 0.30, v: s.stress   || 3 },
                          { dim: "Repair",   w: 0.15, v: s.repair   || 3 },
                        ];
                        const dominant = scores.reduce((a, b) => Math.abs(a.v - 3) * a.w > Math.abs(b.v - 3) * b.w ? a : b);
                        const dir = dominant.v > 3 ? (dominant.dim === "Conflict" ? "engages quickly in conflict" : dominant.dim === "Repair" ? "repairs quickly" : "externalises stress") : (dominant.dim === "Conflict" ? "needs space in conflict" : dominant.dim === "Repair" ? "takes longer to repair" : "internalises stress");
                        return `${name} ${dir}`;
                      })(),
                    },
                    {
                      label: "Open/Guarded",
                      value: info.openScore >= 3.0 ? "Open-leaning" : "Guarded-leaning",
                      score: info.openCoord,
                      driver: (() => {
                        const s = name === userName ? myS : partS;
                        const scores = [
                          { dim: "Expression", w: 0.45, v: s.expression || 3 },
                          { dim: "Feedback",   w: 0.30, v: s.feedback   || 3 },
                          { dim: "Needs",      w: 0.25, v: s.needs      || 3 },
                        ];
                        const dominant = scores.reduce((a, b) => Math.abs(a.v - 3) * a.w > Math.abs(b.v - 3) * b.w ? a : b);
                        const dir = dominant.v > 3 ? (dominant.dim === "Expression" ? "expresses feelings readily" : dominant.dim === "Feedback" ? "takes feedback openly" : "states needs directly") : (dominant.dim === "Expression" ? "processes feelings privately" : dominant.dim === "Feedback" ? "can be guarded with feedback" : "tends to signal needs indirectly");
                        return `${name} ${dir}`;
                      })(),
                    },
                  ].map(({ label, value, score, driver }) => (
                    <div key={label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                        <span style={{ fontSize: "0.6rem", color: C.muted, fontFamily: BFONT, fontWeight: 600 }}>{label}</span>
                        <span style={{ fontSize: "0.6rem", color: it.color, fontFamily: BFONT, fontWeight: 600 }}>{value}</span>
                      </div>
                      <div style={{ height: 4, background: C.stone, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.round(score * 100)}%`, background: it.color, borderRadius: 2 }} />
                      </div>
                      {driver && <div style={{ fontSize: "0.6rem", color: C.muted, fontFamily: BFONT, marginTop: "0.25rem", fontStyle: "italic" }}>{driver}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── YOUR PAIRING ── */}
          <div style={{ background: `linear-gradient(135deg, ${accent}18, ${accent}08)`, border: `1.5px solid ${accent}40`, borderRadius: 18, padding: "1.5rem", marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.58rem", letterSpacing: "0.22em", textTransform: "uppercase", color: accent, fontFamily: BFONT, fontWeight: 700, marginBottom: "0.5rem" }}>Your pairing</div>
            <div style={{ fontFamily: HFONT, fontSize: "1.4rem", fontWeight: 700, color: C.ink, marginBottom: "0.3rem" }}>{newType.name}</div>
            <p style={{ fontSize: "0.85rem", color: accent, fontFamily: BFONT, fontWeight: 600, lineHeight: 1.4, margin: "0 0 0.85rem" }}>{newType.tagline}</p>
            <p style={{ fontSize: "0.88rem", color: "#5C4A38", fontFamily: BFONT, fontWeight: 300, lineHeight: 1.78, margin: 0 }}>{interp(newType.description)}</p>
          </div>

          {/* ── HOW TO READ THE MAP ── */}
          <div style={{ background: "white", border: `1.5px solid ${C.stone}`, borderRadius: 18, padding: "1.5rem", marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.6rem", letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted, fontFamily: BFONT, fontWeight: 700, marginBottom: "1rem" }}>How to read the map</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {readingGuide.map(({ label, meaning }, i) => (
                <div key={i} style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
                  <div style={{ flexShrink: 0, marginTop: 3 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: accent }} />
                  </div>
                  <p style={{ fontSize: "0.84rem", color: C.ink, fontFamily: BFONT, lineHeight: 1.65, margin: 0 }}>
                    <span style={{ fontWeight: 700 }}>{label}: </span>{meaning}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── NUANCE ── */}
          <div style={{ background: "#FBF8F3", border: `1.5px solid ${C.stone}`, borderRadius: 14, padding: "1.25rem 1.4rem", marginBottom: "1.25rem", borderLeft: `4px solid ${accent}55` }}>
            <div style={{ fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: accent, fontFamily: BFONT, fontWeight: 700, marginBottom: "0.4rem" }}>Worth knowing</div>
            <p style={{ fontSize: "0.84rem", color: "#5C4A38", fontFamily: BFONT, fontWeight: 400, lineHeight: 1.75, margin: 0 }}>{interp(newType.nuance)}</p>
          </div>

          <p style={{ fontSize: "0.72rem", color: C.muted, fontFamily: BFONT, lineHeight: 1.65, margin: 0 }}>
            The map uses your scores on Conflict, Repair, and Stress to place each of you on the Engage/Withdraw axis, and your Expression, Feedback, and Needs scores to place you on the Open/Guarded axis. Dot position is continuous — proximity to an axis line means that partner is more flexible on that dimension.
          </p>
        </div>
      </Layout>
    );
  }

  // ── PAGE: SUMMARY ───────────────────────────────────────────────────────────
  if (section === "summary") {
    // Reuse JointOverview content but inside unified layout
    return (
      <Layout accent="#8C7A68">
        <JointOverview
          ex1Answers={ex1Answers} partnerEx1={partnerEx1}
          ex2Answers={ex2Answers} partnerEx2={partnerEx2}
          ex3Answers={ex3Answers} partnerEx3={partnerEx3}
          hasAnniversary={hasAnniversary}
          userName={userName} partnerName={partnerName}
          onGoPersonality={() => go("comm-overview")}
          onGoExpectations={() => go("exp-overview")}
          onGoAnniversary={() => go("reflection")}
        />
      </Layout>
    );
  }

  // ── COMM PAGES: delegate to PersonalityResults with step override ───────────
  if (section.startsWith("comm")) {
    const dimStep = (() => {
      if (section === "comm-overview") return 0;
      if (section === "comm-profiles") return orderedDims.length + 1;
      if (section === "comm-plan") return orderedDims.length + 3;
      const dimIdx = orderedDims.indexOf(section.replace("comm-", ""));
      return dimIdx >= 0 ? dimIdx + 1 : 0;
    })();
    return (
      <Layout accent="#E8673A" noPrevNext={true}>
        <PersonalityResultsPage
          myAnswers={ex1Answers} partnerAnswers={partnerEx1}
          userName={userName} partnerName={partnerName}
          coupleType={coupleType}
          forcedStep={dimStep} orderedDims={orderedDims}
          onGoExpectations={() => go("exp-overview")}
          onStepChange={s => {
            if (s === 0) go("comm-overview");
            else if (s === orderedDims.length + 1) go("comm-profiles");
            else if (s === orderedDims.length + 3 || s === orderedDims.length + 4) go("comm-plan");
            else if (s >= 1 && s <= orderedDims.length) go(`comm-${orderedDims[s-1]}`);
          }}
        />
      </Layout>
    );
  }

  // ── EXP PAGES: delegate to ExpectationsResults with section override ────────
  if (section.startsWith("exp")) {
    const expSection = section === "exp-overview" ? "overview"
      : section === "exp-common-ground" ? "common-ground"
      : section === "exp-conversations" ? "conversations"
      : section === "exp-action-plan" ? "action-plan"
      : section.startsWith("exp-convo-") ? `convo-${section.replace("exp-convo-", "")}`
      : "overview";
    return (
      <Layout accent="#1B5FE8" noPrevNext={true}>
        <ExpectationsResultsPage
          myAnswers={ex2Answers} partnerAnswers={partnerEx2}
          userName={userName} partnerName={partnerName}
          forcedSection={expSection}
          onGoWhatComesNext={() => go("what-comes-next")}
          onExternalGo={s => {
            if (s === 0) go("exp-overview");
            else if (s === 1) go("exp-common-ground");
            else if (s === 2) go("exp-conversations");
            else if (s === "action-plan") go("exp-action-plan");
            else if (typeof s === "string" && s.startsWith("convo-")) go("exp-" + s);
          }}
        />
      </Layout>
    );
  }

  // ── REFLECTION ────────────────────────────────────────────────────────────────
  if (section.startsWith("reflection") && hasAnniversary) {
    const mine = ex3Answers || SARAH_ANNIVERSARY_DEMO;
    const theirs = partnerEx3 || JAMES_ANNIVERSARY_DEMO;
    const insights = deriveAnniversaryInsights(mine, theirs, userName, partnerName, coupleType);
    const scaleQs = ANNIVERSARY_QUESTIONS.filter(q => q.type === "scale");
    const textQs = [
      { id: "a1", label: "A moment that defined us", category: "Milestones" },
      { id: "a2", label: "Something that made us stronger", category: "Milestones" },
      { id: "a6", label: "What I want to work on", category: "Looking Forward" },
      { id: "a7", label: "Something I wish we'd handled differently", category: "Looking Forward" },
      { id: "a5", label: "Where I see us in 5 years", category: "Looking Forward" },
      { id: "a3", label: "What I'm most grateful for", category: "What Matters" },
      { id: "a4", label: "What I want more of together", category: "What Matters" },
    ];
    const actionItems = insights.filter(i => i.type === "explore").map(i => i.title);

    // ── REFLECTION OVERVIEW ───────────────────────────────────────────────────
    if (section === "reflection-overview" || section === "reflection") {
      const strengths = insights.filter(i => i.type === "strength").length;
      const explores = insights.filter(i => i.type === "explore").length;
      const overallQ = ANNIVERSARY_QUESTIONS.find(q => q.id === "a0");
      const myOverall = mine.a0 ?? 3;
      const theirOverall = theirs.a0 ?? 3;
      const avgOverall = (myOverall + theirOverall) / 2;
      const overallLabel = overallQ ? overallQ.scaleLabels[Math.round(avgOverall)] : "really good";
      const overallAligned = Math.abs(myOverall - theirOverall) <= 1;
      const myAdmire = mine.a8;
      const theirAdmire = theirs.a8;
      return (
        <Layout accent="#1B5FE8">
          <div style={{ maxWidth: 660 }}>
            {/* Hero card */}
            <div style={{ background: "linear-gradient(145deg, #0f0c29, #1d1a4e, #0f0c29)", borderRadius: 20, padding: "2rem 2rem 1.75rem", marginBottom: "1.25rem", color: "white", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #1B5FE8, #5B6DF8)" }} />
              <div style={{ position: "absolute", top: "50%", right: -40, transform: "translateY(-50%)", fontSize: "9rem", opacity: 0.04, fontFamily: HFONT, userSelect: "none", lineHeight: 1, pointerEvents: "none" }}>♡</div>
              <div style={{ fontSize: "0.58rem", letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(91,109,248,0.85)", marginBottom: "0.6rem", fontFamily: BFONT, fontWeight: 700 }}>Relationship Reflection</div>
              <div style={{ fontSize: "clamp(1.6rem,4vw,2.2rem)", fontWeight: 700, fontFamily: HFONT, lineHeight: 1.1, marginBottom: "0.75rem" }}>{userName} & {partnerName}</div>
              {/* How you're both feeling */}
              <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "0.9rem 1.1rem", marginBottom: "1rem", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontSize: "0.55rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(91,109,248,0.7)", fontFamily: BFONT, fontWeight: 700, marginBottom: "0.35rem" }}>How you're both feeling right now</div>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "white", fontFamily: HFONT, marginBottom: "0.2rem" }}>
                  {overallAligned ? `You're both feeling ${overallLabel.toLowerCase()}.` : `${userName} says ${(overallQ?.scaleLabels[myOverall] || "really good").toLowerCase()}. ${partnerName} says ${(overallQ?.scaleLabels[theirOverall] || "better than ever").toLowerCase()}.`}
                </div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", fontFamily: BFONT, fontWeight: 300 }}>
                  {overallAligned ? "A shared read on where you are — that's a meaningful starting point." : "Different vantage points on the same relationship. Both worth understanding."}
                </div>
              </div>
              {/* Appreciation reveal if available */}
              {myAdmire && theirAdmire && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem", marginBottom: "1rem" }}>
                  {[[userName, theirAdmire], [partnerName, myAdmire]].map(([name, admires]) => (
                    <div key={name} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "0.75rem 0.9rem", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ fontSize: "0.52rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontFamily: BFONT, marginBottom: "0.3rem" }}>{name} is admired for</div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "white", fontFamily: HFONT }}>{admires}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981" }} />
                  <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.8)", fontFamily: BFONT }}>{strengths} strength{strengths !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#F59E0B" }} />
                  <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.8)", fontFamily: BFONT }}>{explores} area{explores !== 1 ? "s" : ""} to explore</span>
                </div>
              </div>
            </div>
            {/* What's in this section */}
            <div style={{ background: "white", border: `1.5px solid ${C.stone}`, borderRadius: 16, padding: "1.25rem 1.25rem 0.85rem", marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.55rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#1B5FE8", fontFamily: BFONT, fontWeight: 700, marginBottom: "0.75rem" }}>What's in this section</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {[
                  { label: "Insights", sub: `${insights.length} insights drawn from your answers`, id: "reflection-insights" },
                  { label: "Side by Side", sub: "Your answers shown together with synthesis", id: "reflection-story" },
                  { label: "Action Plan", sub: `${explores} conversation${explores !== 1 ? "s" : ""} worth having`, id: "reflection-plan" },
                ].map(item => (
                  <div key={item.id} onClick={() => go(item.id)}
                    style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.55rem 0.75rem", borderRadius: 10, background: "rgba(27,95,232,0.04)", cursor: "pointer", transition: "all 0.12s", border: "1px solid rgba(27,95,232,0.08)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(27,95,232,0.09)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(27,95,232,0.04)"}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: C.ink, fontFamily: BFONT }}>{item.label}</div>
                      <div style={{ fontSize: "0.65rem", color: C.muted, fontFamily: BFONT, marginTop: "0.1rem" }}>{item.sub}</div>
                    </div>
                    <span style={{ color: "#1B5FE8", fontSize: "0.85rem", fontFamily: BFONT, flexShrink: 0 }}>→</span>
                  </div>
                ))}
              </div>
            </div>
            <PrevNext />
          </div>
        </Layout>
      );
    }

    // ── REFLECTION INSIGHTS ───────────────────────────────────────────────────
    if (section === "reflection-insights") {
      return (
        <Layout accent="#10b981">
          <div style={{ maxWidth: 660 }}>
            <div style={{ fontSize: "0.62rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "#1B5FE8", fontWeight: 700, fontFamily: BFONT, marginBottom: "0.5rem" }}>Relationship Reflection</div>
            <h2 style={{ fontFamily: HFONT, fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 700, color: C.ink, lineHeight: 1.1, marginBottom: "0.75rem" }}>How you're feeling right now</h2>
            {/* Scale snapshot */}
            <div style={{ background: "white", border: `1.5px solid ${C.stone}`, borderRadius: 16, padding: "1.25rem", marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#1B5FE8", textTransform: "uppercase", letterSpacing: "0.18em", fontFamily: BFONT, marginBottom: "1rem" }}>Scale questions</div>
              {scaleQs.map(q => {
                const myVal = mine[q.id] ?? 2;
                const theirVal = theirs[q.id] ?? 2;
                return (
                  <div key={q.id} style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.78rem", color: C.ink, fontWeight: 500, fontFamily: BFONT, marginBottom: "0.45rem" }}>{q.text}</div>
                    {[[userName, myVal, "#E8673A"], [partnerName, theirVal, "#1B5FE8"]].map(([name, val, color]) => (
                      <div key={name} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                        <span style={{ fontSize: "0.62rem", fontWeight: 700, color, width: 52, flexShrink: 0, fontFamily: BFONT }}>{name}</span>
                        <div style={{ display: "flex", gap: 3, flex: 1 }}>
                          {q.scaleLabels.map((_, i) => (
                            <div key={i} style={{ flex: 1, height: 8, borderRadius: 3, background: i <= val ? color : color + "22" }} />
                          ))}
                        </div>
                        <span style={{ fontSize: "0.62rem", color: C.muted, fontFamily: BFONT, width: 90, flexShrink: 0, textAlign: "right" }}>{q.scaleLabels[val]}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            {/* Insight cards with show-more */}
            <InsightCardList insights={insights} />
            <PrevNext />
          </div>
        </Layout>
      );
    }

    // ── REFLECTION STORY (SIDE BY SIDE) ──────────────────────────────────────
    if (section === "reflection-story") {
      // Simple keyword-bucket synthesis for text questions
      const synthesize = (myAns, theirAns) => {
        if (!myAns || !theirAns) return null;
        const buckets = {
          time: ["time","together","weekly","ritual","consistent","routine","slow","moment","daily"],
          future: ["future","years","someday","eventually","plan","goal","stable","adventurous","home","space"],
          emotional: ["feel","felt","feeling","safe","scared","anxious","proud","grateful","love","hard","afraid"],
          relational: ["us","we","team","together","each other","partner","choose","choosing","support"],
          effort: ["work","working","try","trying","better","improve","grow","change","different","effort"],
          joy: ["laugh","fun","spontaneous","adventure","joy","happy","light","easy","playful"],
        };
        const score = (ans, bucket) => bucket.filter(w => ans.toLowerCase().includes(w)).length;
        const topBucket = (ans) => Object.entries(buckets).sort((a,b) => score(ans,b[1]) - score(ans,a[1]))[0][0];
        const myTop = topBucket(myAns);
        const theirTop = topBucket(theirAns);
        if (myTop === theirTop) {
          const labels = { time:"a shared sense of time and presence", future:"the same kind of future", emotional:"similar emotional territory", relational:"the same relational instinct", effort:"a commitment to growth", joy:"a shared pull toward joy and lightness" };
          return { type: "resonance", text: `You both pointed to ${labels[myTop] || "similar things"}.` };
        }
        const compatible = [["time","relational"],["future","effort"],["joy","time"],["emotional","relational"],["effort","relational"]];
        const isCompat = compatible.some(([a,b]) => (myTop===a&&theirTop===b)||(myTop===b&&theirTop===a));
        if (isCompat) return { type: "complement", text: "Different angles on the same underlying thing — worth comparing." };
        return { type: "discuss", text: "You're coming at this from different places. Worth talking about." };
      };
      const synthColors = { resonance: { bg:"#EEF2FF", text:"#1B5FE8" }, complement: { bg:"#FFF8F5", text:"#E8673A" }, discuss: { bg:"#FFFBF0", text:"#D97706" } };

      return (
        <Layout accent="#1B5FE8">
          <div style={{ maxWidth: 660 }}>
            <div style={{ fontSize: "0.62rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "#1B5FE8", fontWeight: 700, fontFamily: BFONT, marginBottom: "0.5rem" }}>Relationship Reflection</div>
            <h2 style={{ fontFamily: HFONT, fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 700, color: C.ink, lineHeight: 1.1, marginBottom: "0.5rem" }}>Side by Side</h2>
            <p style={{ fontSize: "0.82rem", color: C.muted, fontFamily: BFONT, fontWeight: 300, marginBottom: "1.5rem", lineHeight: 1.65 }}>Your answers shown together. Each synthesis note is generated from what you actually wrote.</p>
            {["Milestones", "How We're Doing", "Looking Forward", "What Matters"].map(cat => {
              const catQs = textQs.filter(q => q.category === cat);
              return (
                <div key={cat} style={{ marginBottom: "1.75rem" }}>
                  <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#1B5FE8", fontWeight: 700, fontFamily: BFONT, marginBottom: "0.6rem" }}>{cat}</div>
                  {catQs.map(q => {
                    const synth = synthesize(mine[q.id], theirs[q.id]);
                    const sc = synth ? synthColors[synth.type] : null;
                    return (
                      <div key={q.id} style={{ background: "white", border: `1.5px solid ${C.stone}`, borderRadius: 14, marginBottom: "0.75rem", overflow: "hidden" }}>
                        <div style={{ padding: "0.7rem 1.1rem", borderBottom: `1px solid ${C.stone}50`, background: "#FAFAF8" }}>
                          <span style={{ fontFamily: HFONT, fontSize: "0.82rem", fontWeight: 700, color: C.ink }}>{q.label}</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                          {[[userName, mine[q.id], "#E8673A"], [partnerName, theirs[q.id], "#1B5FE8"]].map(([name, ans, col], i) => (
                            <div key={name} style={{ padding: "0.9rem 1.1rem", borderRight: i === 0 ? `1px solid ${C.stone}40` : "none" }}>
                              <div style={{ fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: col, fontWeight: 700, fontFamily: BFONT, marginBottom: "0.45rem" }}>{name}</div>
                              <p style={{ fontSize: "0.79rem", color: C.text, fontFamily: BFONT, fontWeight: 300, lineHeight: 1.72, margin: 0, fontStyle: "italic" }}>"{ans || "–"}"</p>
                            </div>
                          ))}
                        </div>
                        {synth && sc && (
                          <div style={{ padding: "0.7rem 1.1rem", background: sc.bg, borderTop: `1px solid ${C.stone}30`, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: sc.text, opacity: 0.7, flexShrink: 0 }} />
                            <span style={{ fontSize: "0.78rem", color: sc.text, fontFamily: BFONT, fontWeight: 600 }}>{synth.text}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Appreciation picks side by side */}
            {mine.a8 && theirs.a8 && (
              <div style={{ marginBottom: "1.75rem" }}>
                <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#1B5FE8", fontWeight: 700, fontFamily: BFONT, marginBottom: "0.6rem" }}>What you admire</div>
                <div style={{ background: "white", border: `1.5px solid ${C.stone}`, borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ padding: "0.7rem 1.1rem", borderBottom: `1px solid ${C.stone}50`, background: "#FAFAF8" }}>
                    <span style={{ fontFamily: HFONT, fontSize: "0.82rem", fontWeight: 700, color: C.ink }}>The quality I most admire in my partner right now</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                    {[[userName, theirs.a8, "#E8673A"], [partnerName, mine.a8, "#1B5FE8"]].map(([name, admires, col], i) => (
                      <div key={name} style={{ padding: "1rem 1.1rem", borderRight: i === 0 ? `1px solid ${C.stone}40` : "none" }}>
                        <div style={{ fontSize: "0.55rem", letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, fontFamily: BFONT, marginBottom: "0.35rem" }}>{name} is admired for</div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 700, color: col, fontFamily: HFONT }}>{admires}</div>
                      </div>
                    ))}
                  </div>
                  {mine.a8 === theirs.a8 && (
                    <div style={{ padding: "0.55rem 1.1rem", background: "#EEF2FF", borderTop: `1px solid ${C.stone}30` }}>
                      <span style={{ fontSize: "0.7rem", color: "#1B5FE8", fontFamily: BFONT, fontWeight: 500 }}>You both named the same quality. That level of resonance is real.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Priority ranking side by side */}
            {Array.isArray(mine.a_priority) && mine.a_priority.length > 0 && Array.isArray(theirs.a_priority) && theirs.a_priority.length > 0 && (
              <div style={{ marginBottom: "1.75rem" }}>
                <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#1B5FE8", fontWeight: 700, fontFamily: BFONT, marginBottom: "0.6rem" }}>Priority ranking</div>
                <div style={{ background: "white", border: `1.5px solid ${C.stone}`, borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ padding: "0.7rem 1.1rem", borderBottom: `1px solid ${C.stone}50`, background: "#FAFAF8" }}>
                    <span style={{ fontFamily: HFONT, fontSize: "0.82rem", fontWeight: 700, color: C.ink }}>What to invest in together this year</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                    {[[userName, mine.a_priority, "#E8673A"], [partnerName, theirs.a_priority, "#1B5FE8"]].map(([name, ranked, col], gi) => (
                      <div key={name} style={{ padding: "0.85rem 1.1rem", borderRight: gi === 0 ? `1px solid ${C.stone}40` : "none" }}>
                        <div style={{ fontSize: "0.55rem", letterSpacing: "0.14em", textTransform: "uppercase", color: col, fontWeight: 700, fontFamily: BFONT, marginBottom: "0.5rem" }}>{name}</div>
                        {ranked.map((item, ri) => {
                          const otherRank = (gi === 0 ? theirs.a_priority : mine.a_priority).indexOf(item);
                          const gap = Math.abs(ri - otherRank);
                          return (
                            <div key={item} style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
                              <span style={{ fontSize: "0.62rem", fontWeight: 700, color: col, width: 16, flexShrink: 0, fontFamily: BFONT }}>#{ri+1}</span>
                              <span style={{ fontSize: "0.75rem", color: C.ink, fontFamily: BFONT, flex: 1 }}>{item}</span>
                              {gap >= 3 && <span style={{ fontSize: "0.55rem", color: "#F59E0B", fontFamily: BFONT, fontWeight: 700 }}>↕</span>}
                              {gap === 0 && ri <= 1 && <span style={{ fontSize: "0.55rem", color: "#10b981", fontFamily: BFONT, fontWeight: 700 }}>✓</span>}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: "0.55rem 1.1rem", background: "#FAFAF8", borderTop: `1px solid ${C.stone}30` }}>
                    <span style={{ fontSize: "0.68rem", color: C.muted, fontFamily: BFONT }}>✓ Shared top priority &nbsp;&nbsp; ↕ More than 3 positions apart</span>
                  </div>
                </div>
              </div>
            )}

            <PrevNext />
          </div>
        </Layout>
      );
    }

    // ── REFLECTION ACTION PLAN ────────────────────────────────────────────────
    if (section === "reflection-plan") {
      return (
        <Layout accent="#1B5FE8">
          <div style={{ maxWidth: 560 }}>
            <div style={{ fontSize: "0.62rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "#1B5FE8", fontWeight: 700, fontFamily: BFONT, marginBottom: "0.5rem" }}>Reflection Action Plan</div>
            <h2 style={{ fontFamily: HFONT, fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 700, color: C.ink, lineHeight: 1.1, marginBottom: "0.5rem" }}>Conversations worth having.</h2>
            <p style={{ fontSize: "0.85rem", color: C.muted, fontFamily: BFONT, fontWeight: 300, lineHeight: 1.72, marginBottom: "1.5rem" }}>
              {actionItems.length > 0
                ? `${actionItems.length} area${actionItems.length !== 1 ? "s" : ""} where your reflections point to a real conversation.`
                : "You're well-aligned across your reflections. Keep building on this foundation."}
            </p>
            {actionItems.length === 0 ? (
              <div style={{ background: "#EEF2FF", border: "1.5px solid rgba(27,95,232,0.25)", borderRadius: 16, padding: "1.5rem", textAlign: "center", marginBottom: "1.5rem" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1B5FE8", margin: "0 auto 0.5rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "white", fontSize: "0.85rem" }}>♡</span>
                </div>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: C.ink, fontFamily: BFONT }}>Strong alignment across the board.</div>
              </div>
            ) : (
              <ActionPlanList explores={insights.filter(i => i.type === "explore")} />
            )}
            <PrevNext />
          </div>
        </Layout>
      );
    }

    return null;
  }

  // ── PAGE: WHAT COMES NEXT ─────────────────────────────────────────────────────
  if (section === "what-comes-next") {
    const NavActionLink = ({ onClick, bg, border, icon, title, sub, accentColor }) => {
      const iconSvgs = {
        "💬": <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
        "📋": <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
        "💚": <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
        "✅": <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
        "💰": <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
        "🧠": <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.04-4.69A2.5 2.5 0 0 1 5 12a2.5 2.5 0 0 1 2-2.45V4.5A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.04-4.69A2.5 2.5 0 0 0 19 12a2.5 2.5 0 0 0-2-2.45V4.5A2.5 2.5 0 0 0 14.5 2z"/></svg>,
      };
      return (
      <button onClick={onClick}
        style={{ display: "flex", alignItems: "center", gap: "1rem", background: bg, border, borderRadius: 14, padding: "1rem 1.25rem", cursor: "pointer", textAlign: "left", width: "100%" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: accentColor + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {iconSvgs[icon] || <div style={{ width: 10, height: 10, borderRadius: "50%", background: accentColor }} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: C.ink, fontFamily: BFONT, marginBottom: "0.1rem" }}>{title}</div>
          <div style={{ fontSize: "0.72rem", color: C.muted, fontFamily: BFONT }}>{sub}</div>
        </div>
        <span style={{ color: accentColor, fontSize: "1rem", flexShrink: 0 }}>→</span>
      </button>
      );
    };
    return (
      <Layout accent={C.orange}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ fontFamily: BFONT, fontSize: "0.62rem", letterSpacing: "0.22em", textTransform: "uppercase", color: C.clay, fontWeight: 700, marginBottom: "0.85rem" }}>What comes next</div>
          <h2 style={{ fontFamily: HFONT, fontSize: "clamp(1.8rem,3vw,2.4rem)", fontWeight: 700, color: C.ink, lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: "1.5rem" }}>What to do with all of this.</h2>

          {/* ── ACTION PLANS ── */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "0.62rem", letterSpacing: "0.22em", textTransform: "uppercase", color: C.clay, fontFamily: BFONT, fontWeight: 700, marginBottom: "0.85rem" }}>Your action plans</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              <NavActionLink onClick={() => go("comm-plan")} bg="linear-gradient(135deg,#FFF5F2,#FFE8E0)" border={`1.5px solid rgba(232,103,58,0.25)`} icon="💬" title="Communication Action Plan" sub="Practices drawn from your communication results" accentColor={C.orange} />
              <NavActionLink onClick={() => go("exp-action-plan")} bg="linear-gradient(135deg,#F5F7FF,#E8EDFF)" border={`1.5px solid rgba(27,95,232,0.2)`} icon="📋" title="Expectations Action Plan" sub="Topics to discuss, organized by area" accentColor="#1B5FE8" />
              {hasAnniversary && (
                <NavActionLink onClick={() => go("reflection-plan")} bg="linear-gradient(135deg,#F0F4FF,#E8EDFF)" border={`1.5px solid rgba(27,95,232,0.25)`} icon="♡" title="Reflection Action Plan" sub="Conversations from your relationship reflection" accentColor="#1B5FE8" />
              )}
            </div>
          </div>

          {/* ── PACKAGE-SPECIFIC RESOURCES ── */}
          {(hasChecklist || hasBudget || hasLMFT) && (
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.62rem", letterSpacing: "0.22em", textTransform: "uppercase", color: C.clay, fontFamily: BFONT, fontWeight: 700, marginBottom: "0.85rem" }}>Included with your package</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {hasChecklist && (
                  <NavActionLink onClick={() => onNavigateTool && onNavigateTool("checklist")} bg={C.warm} border={`1.5px solid ${C.stone}`} icon="✅" title="Starting Out Checklist" sub="A practical guide to starting your life together" accentColor={C.clay} />
                )}
                {hasBudget && (
                  <NavActionLink onClick={() => onNavigateTool && onNavigateTool("budget")} bg={C.warm} border={`1.5px solid ${C.stone}`} icon="💰" title="Shared Budget Builder" sub="Build a financial plan together from your results" accentColor={C.clay} />
                )}
                {hasLMFT && (
                  <NavActionLink onClick={() => onNavigateTool && onNavigateTool("lmft")} bg="linear-gradient(135deg,#F5F6FF,#EEEEFF)" border={`1.5px solid rgba(91,109,248,0.25)`} icon="🧠" title="Schedule Your LMFT Session" sub="Your therapist has your results and comes prepared" accentColor="#5B6DF8" />
                )}
              </div>
            </div>
          )}

          {/* ── WORKBOOK CTA ── */}
          {(() => {
            // Build the payload from this couple's actual data
            const buildAndDownload = async () => {
              const myS = calcDimScores(ex1Answers);
              const partS = calcDimScores(partnerEx1);

              // Build expectations gap summary
              const expGaps = [];
              const EXP_KEYS = [
                { key: 'household', label: 'Visible Household Labor' },
                { key: 'emotional', label: 'Emotional & Invisible Labor' },
                { key: 'financial', label: 'Financial & Money' },
                { key: 'career',    label: 'Career' },
                { key: 'children',  label: 'Children & Family' },
                { key: 'lifestyle', label: 'Home & Lifestyle' },
                { key: 'values',    label: 'Faith & Values' },
              ];
              EXP_KEYS.forEach(({ key, label }) => {
                const yourAns    = ex2Answers?.life?.['lq_' + key] || ex2Answers?.life?.['lq_children'] || null;
                const partnerAns = partnerEx2?.life?.['lq_' + key] || partnerEx2?.life?.['lq_children'] || null;
                expGaps.push({ key, label, yourAnswer: yourAns, partnerAnswer: partnerAns, aligned: yourAns === partnerAns });
              });

              const payload = {
                userName,
                partnerName,
                scores: myS,
                partnerScores: partS,
                // Pass the full couple type object so the workbook can render
                // the couple-type intro page with strengths / sticking points / patterns.
                coupleType: coupleType || null,
                expGaps,
              };

              try {
                // Use pre-generated workbook URL if available (fastest)
                const ord = JSON.parse(localStorage.getItem('attune_order') || 'null');
                if (ord?.workbookUrl) {
                  const a = document.createElement('a');
                  a.href = ord.workbookUrl;
                  a.download = `Attune_Workbook_${userName}_and_${partnerName}.docx`;
                  a.target = '_blank';
                  document.body.appendChild(a); a.click(); document.body.removeChild(a);
                  return;
                }
                // Always try docx API first — reliable on all browsers
                showToast('Generating your workbook…');
                const resp2 = await fetch('/api/generate-workbook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (resp2.ok) {
                  const blob2 = await resp2.blob();
                  const url2 = URL.createObjectURL(blob2);
                  const a2 = document.createElement('a'); a2.href = url2;
                  a2.download = `Attune_Workbook_${userName}_and_${partnerName}.docx`;
                  document.body.appendChild(a2); a2.click(); document.body.removeChild(a2);
                  URL.revokeObjectURL(url2);
                  return;
                }
                // Fallback: Generate PDF in-browser using html2pdf.js
                showToast('Generating your workbook as PDF… this takes about 5 seconds.');
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                await new Promise((res, rej) => { script.onload = res; script.onerror = rej; document.head.appendChild(script); });
                // Build render URL with workbook data
                const renderPayload = encodeURIComponent(JSON.stringify({
                  p1: userName, p2: partnerName,
                  ct: coupleType?.name || '', ctTagline: coupleType?.tagline || '', ctColor: coupleType?.color || '#E8673A',
                  scores: payload.scores, partnerScores: payload.partnerScores, expGaps: payload.expGaps,
                }));
                // Load workbook-render.html content into an off-screen iframe
                const iframe = document.createElement('iframe');
                iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:none;';
                document.body.appendChild(iframe);
                await new Promise(res => {
                  iframe.onload = res;
                  iframe.src = `/workbook-render?data=${renderPayload}`;
                });
                await new Promise(res => setTimeout(res, 1500)); // Wait for fonts/images
                const el = iframe.contentDocument.body;
                const filename = `Attune_Workbook_${userName.replace(/\s+/g,'_')}_and_${partnerName.replace(/\s+/g,'_')}.pdf`;
                await window.html2pdf().set({
                  margin: [10, 14],
                  filename,
                  image: { type: 'jpeg', quality: 0.97 },
                  html2canvas: { scale: 2, useCORS: true, logging: false },
                  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                  pagebreak: { mode: ['avoid-all', 'css'] },
                }).from(el).save();
                document.body.removeChild(iframe);
              } catch (e) {
                console.error('Workbook PDF generation failed:', e);
                // Final fallback: docx
                try {
                  const resp = await fetch('/api/generate-workbook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                  if (!resp.ok) throw new Error();
                  const blob = await resp.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url;
                  a.download = `Attune_Workbook_${userName}_and_${partnerName}.docx`;
                  document.body.appendChild(a); a.click(); document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch { showToast('Workbook generation failed. Please try again.'); }
              }
            };

            return (
              <div style={{ background: "#2d2250", borderRadius: 18, padding: "1.75rem 2rem", marginBottom: "1.5rem" }}>
                <div style={{ fontSize: "0.58rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(232,103,58,0.85)", fontFamily: BFONT, fontWeight: 700, marginBottom: "0.6rem" }}>Keep growing</div>
                <div style={{ fontFamily: HFONT, fontSize: "1.2rem", fontWeight: 700, color: "white", lineHeight: 1.2, marginBottom: "0.6rem" }}>Download your personalized workbook.</div>
                <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", fontFamily: BFONT, fontWeight: 300, lineHeight: 1.65, marginBottom: "0.75rem" }}>
                  Built from {userName} and {partnerName}'s actual scores and calibrated to your results. Generated instantly as a .docx.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: "1.1rem" }}>
                  {[
                    { icon: "◈", label: "Guided exercises", desc: "Structured activities drawn from your top gap dimensions" },
                    { icon: "✦",  label: "Conversation prompts", desc: "Questions specific to where you and " + partnerName + " diverge most" },
                    { icon: "📋", label: "Expectations discussion guide", desc: "Topics to work through from your expectations comparison" },
                  ].map(({ icon, label, desc }) => (
                    <div key={label} style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start" }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(232,103,58,0.2)", border: "1px solid rgba(232,103,58,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "0.05rem" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(232,103,58,0.9)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "rgba(255,255,255,0.88)", fontFamily: BFONT }}>{label}</span>
                        <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", fontFamily: BFONT }}> — {desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
                  <button onClick={buildAndDownload}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "linear-gradient(135deg, #E8673A, #1B5FE8)", color: "white", borderRadius: 10, padding: "0.65rem 1.4rem", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700, fontFamily: BFONT }}>
                    ↓ Download workbook (.docx)
                  </button>
                  <a href="/offerings#pkg-workbook" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.75)", borderRadius: 10, padding: "0.65rem 1.25rem", textDecoration: "none", fontSize: "0.8rem", fontWeight: 600, fontFamily: BFONT }}>
                    Order workbook (bound) →
                  </a>
                </div>
                <div style={{ fontSize: "0.66rem", color: "rgba(255,255,255,0.3)", fontFamily: BFONT, marginTop: "0.65rem" }}>
                  .docx opens in Word, Google Docs, or Pages · Printable
                </div>
              </div>
            );
          })()}

          {/* ── LMFT VIRTUAL SESSION (for packages without LMFT) ── */}
          {!hasLMFT && (
            <div style={{ background: "white", border: `1.5px solid ${C.stone}`, borderRadius: 18, padding: "1.5rem 1.75rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.85rem" }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(91,109,248,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, background: "rgba(91,109,248,0.35)" }} />
                </div>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: C.ink, fontFamily: BFONT }}>Review your results with a licensed therapist</div>
                  <div style={{ fontSize: "0.72rem", color: C.muted, fontFamily: BFONT }}>One-time · Virtual · 50 minutes</div>
                </div>
              </div>
              <p style={{ fontSize: "0.82rem", color: C.muted, fontFamily: BFONT, fontWeight: 300, lineHeight: 1.7, marginBottom: "1rem" }}>
                A licensed LMFT receives your joint results before your session and comes prepared with context specific to your pairing. One focused conversation, no ongoing commitment.
              </p>
              <button onClick={() => onNavigateTool && onNavigateTool('lmft-upsell')} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(91,109,248,0.08)", border: "1.5px solid rgba(91,109,248,0.25)", color: "#5B6DF8", borderRadius: 10, padding: "0.6rem 1.25rem", textDecoration: "none", fontSize: "0.78rem", fontWeight: 700, fontFamily: BFONT, cursor: "pointer" }}>
                Add LMFT session · $150 →
              </button>
            </div>
          )}

          {/* ── STAY CONNECTED ── */}
          <div style={{ background: C.warm, border: `1.5px solid ${C.stone}`, borderRadius: 16, padding: "1.4rem 1.6rem", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "0.62rem", letterSpacing: "0.2em", textTransform: "uppercase", color: C.clay, fontFamily: BFONT, fontWeight: 700, marginBottom: "0.6rem" }}>Stay connected to your results</div>
            {stayDone ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#ECFDF5", border: "1.5px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.75rem" }}>✓</div>
                <p style={{ fontSize: "0.82rem", color: C.muted, fontFamily: BFONT, margin: 0, lineHeight: 1.55 }}>Done. We'll check in at 6 months with an option to retake and compare.</p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: "0.85rem", color: C.muted, fontFamily: BFONT, fontWeight: 300, lineHeight: 1.72, marginBottom: "1rem" }}>
                  We'll check in at 6 months with an option to retake and compare. Results shift more than most couples expect.
                </p>
                <div style={{ display: "flex", gap: "0.65rem", alignItems: "center", flexWrap: "wrap" }}>
                  <input type="email" placeholder="your@email.com" value={stayEmail} onChange={e => setStayEmail(e.target.value)}
                    style={{ flex: 1, minWidth: 180, border: `1.5px solid ${C.stone}`, borderRadius: 10, padding: "0.6rem 0.9rem", fontSize: "0.82rem", fontFamily: BFONT, outline: "none", background: "white", color: C.ink }} />
                  <button disabled={stayLoading} onClick={handleStaySubmit}
                    style={{ background: C.ink, color: "white", border: "none", borderRadius: 10, padding: "0.6rem 1.2rem", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: BFONT, whiteSpace: "nowrap", opacity: stayLoading ? 0.6 : 1 }}>
                    {stayLoading ? "…" : "Stay in touch"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ── TAKE IT FURTHER ── */}
          {(!hasAnniversary || !hasLMFT) && (
            <div style={{ marginBottom: "1.5rem", paddingTop: "1.5rem", borderTop: `1px solid ${C.stone}` }}>
              <div style={{ fontSize: "0.62rem", letterSpacing: "0.22em", textTransform: "uppercase", color: C.clay, fontFamily: BFONT, fontWeight: 700, marginBottom: "1.25rem" }}>Take it further</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
                {!hasAnniversary && (
                  <a href="/offerings#pkg-anniversary" style={{ display: "flex", flexDirection: "column", gap: "0.4rem", background: "#F0FDF9", border: "1.5px solid rgba(16,185,129,.25)", borderRadius: 14, padding: "1rem 1.1rem", textDecoration: "none" }}>
                    <div style={{ fontSize: "1.1rem" }}>✦</div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.ink, fontFamily: BFONT }}>Relationship Reflection</div>
                    <p style={{ fontSize: "0.72rem", color: C.muted, fontFamily: BFONT, lineHeight: 1.55, margin: 0 }}>A third exercise about the moments that shaped your relationship.</p>
                    <span style={{ fontSize: "0.72rem", color: "#10b981", fontWeight: 700, fontFamily: BFONT, marginTop: "0.25rem" }}>See packages →</span>
                  </a>
                )}
                {!hasLMFT && (
                  <a href="/offerings#pkg-premium" style={{ display: "flex", flexDirection: "column", gap: "0.4rem", background: "rgba(91,109,248,.06)", border: "1.5px solid rgba(91,109,248,.2)", borderRadius: 14, padding: "1rem 1.1rem", textDecoration: "none" }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, background: "rgba(91,109,248,0.35)" }} />
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.ink, fontFamily: BFONT }}>Premium Package</div>
                    <p style={{ fontSize: "0.72rem", color: C.muted, fontFamily: BFONT, lineHeight: 1.55, margin: 0 }}>Includes LMFT session, budget tool, and everything in the core package.</p>
                    <span style={{ fontSize: "0.72rem", color: "#5B6DF8", fontWeight: 700, fontFamily: BFONT, marginTop: "0.25rem" }}>Learn more →</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* ── HOW TO USE YOUR RESULTS ── */}
          <a href="/practice/how-to-use-your-results" style={{ display: "flex", alignItems: "center", gap: "1rem", background: C.warm, border: `1.5px solid ${C.stone}`, borderRadius: 16, padding: "1.1rem 1.4rem", textDecoration: "none", marginBottom: "0.65rem" }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: C.orange + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.orange} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            </div>
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.ink, fontFamily: BFONT, marginBottom: "0.15rem" }}>How to use your results</div>
              <div style={{ fontSize: "0.72rem", color: C.muted, fontFamily: BFONT }}>A guide to getting the most out of what you've learned</div>
            </div>
            <div style={{ marginLeft: "auto", color: C.muted, fontSize: "1rem" }}>→</div>
          </a>

          {/* ── ADD-ONS / IN PRACTICE ── */}
          <div style={{ marginTop: "0.5rem", marginBottom: "0.5rem" }}>
            <div style={{ fontSize: "0.6rem", letterSpacing: ".2em", textTransform: "uppercase", color: "#8C7A68", fontWeight: 700, fontFamily: BFONT, marginBottom: "0.75rem" }}>In Practice</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>

              {/* Workbook */}
              <div onClick={() => setView("workbook")} style={{ display: "flex", alignItems: "center", gap: "1rem", background: C.warm, border: `1.5px solid ${C.stone}`, borderRadius: 14, padding: "0.85rem 1.1rem", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#9B5DE5"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.stone; }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(155,93,229,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9B5DE5" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="2" width="14" height="17" rx="2"/><path d="M7 6h7M7 9h5M13 13l1.5 1.5L17 12"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: C.ink, fontFamily: BFONT, marginBottom: "0.1rem" }}>Personalized Workbook</div>
                  <div style={{ fontSize: "0.68rem", color: C.muted, fontFamily: BFONT }}>Exercises and prompts built from your results</div>
                </div>
                <div style={{ color: C.muted, fontSize: "0.9rem" }}>→</div>
              </div>

              {/* LMFT Session */}
              {pkg.hasLMFT ? (
                <div onClick={() => setView("lmft")} style={{ display: "flex", alignItems: "center", gap: "1rem", background: C.warm, border: `1.5px solid ${C.stone}`, borderRadius: 14, padding: "0.85rem 1.1rem", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#5B6DF8"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.stone; }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(91,109,248,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5B6DF8" strokeWidth="1.8" strokeLinecap="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.04-4.69A2.5 2.5 0 0 1 5 12a2.5 2.5 0 0 1 2-2.45V4.5A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.04-4.69A2.5 2.5 0 0 0 19 12a2.5 2.5 0 0 0-2-2.45V4.5A2.5 2.5 0 0 0 14.5 2z"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: C.ink, fontFamily: BFONT, marginBottom: "0.1rem" }}>LMFT Session</div>
                    <div style={{ fontSize: "0.68rem", color: C.muted, fontFamily: BFONT }}>Your therapist reviews your results before you meet</div>
                  </div>
                  <div style={{ color: C.muted, fontSize: "0.9rem" }}>→</div>
                </div>
              ) : (
                <a href="/offerings" style={{ display: "flex", alignItems: "center", gap: "1rem", background: C.warm, border: `1.5px solid ${C.stone}`, borderRadius: 14, padding: "0.85rem 1.1rem", textDecoration: "none", cursor: "pointer", transition: "all 0.15s" }}
                  onClick={(e) => { e.preventDefault(); onNavigateTool && onNavigateTool('lmft-upsell'); }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#5B6DF8"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.stone; }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(91,109,248,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5B6DF8" strokeWidth="1.8" strokeLinecap="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.04-4.69A2.5 2.5 0 0 1 5 12a2.5 2.5 0 0 1 2-2.45V4.5A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.04-4.69A2.5 2.5 0 0 0 19 12a2.5 2.5 0 0 0-2-2.45V4.5A2.5 2.5 0 0 0 14.5 2z"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: C.ink, fontFamily: BFONT, marginBottom: "0.1rem" }}>LMFT Session <span style={{ fontSize: "0.62rem", fontWeight: 600, color: "#5B6DF8", background: "rgba(91,109,248,0.1)", borderRadius: 999, padding: "0.1rem 0.5rem", marginLeft: "0.35rem" }}>Add-on</span></div>
                    <div style={{ fontSize: "0.68rem", color: C.muted, fontFamily: BFONT }}>A therapist reviews your results before you meet</div>
                  </div>
                  <div style={{ color: C.muted, fontSize: "0.9rem" }}>→</div>
                </a>
              )}

              {/* Relationship Reflection */}
              {pkg.hasAnniversary ? (
                <div onClick={() => setView("exercise3")} style={{ display: "flex", alignItems: "center", gap: "1rem", background: C.warm, border: `1.5px solid ${C.stone}`, borderRadius: 14, padding: "0.85rem 1.1rem", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#10b981"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.stone; }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: C.ink, fontFamily: BFONT, marginBottom: "0.1rem" }}>Relationship Reflection {ex3Answers && <span style={{ fontSize: "0.62rem", color: "#10b981", fontWeight: 600, marginLeft: "0.25rem" }}>✓</span>}</div>
                    <div style={{ fontSize: "0.68rem", color: C.muted, fontFamily: BFONT }}>A third exercise about the moments that shaped you</div>
                  </div>
                  <div style={{ color: C.muted, fontSize: "0.9rem" }}>→</div>
                </div>
              ) : (
                <a href="/offerings" style={{ display: "flex", alignItems: "center", gap: "1rem", background: C.warm, border: `1.5px solid ${C.stone}`, borderRadius: 14, padding: "0.85rem 1.1rem", textDecoration: "none", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#10b981"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.stone; }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(16,185,129,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: C.ink, fontFamily: BFONT, marginBottom: "0.1rem" }}>Relationship Reflection <span style={{ fontSize: "0.62rem", fontWeight: 600, color: "#10b981", background: "rgba(16,185,129,0.1)", borderRadius: 999, padding: "0.1rem 0.5rem", marginLeft: "0.35rem" }}>Add-on</span></div>
                    <div style={{ fontSize: "0.68rem", color: C.muted, fontFamily: BFONT }}>A third exercise about the moments that shaped you</div>
                  </div>
                  <div style={{ color: C.muted, fontSize: "0.9rem" }}>→</div>
                </a>
              )}

              {/* Starting Out Checklist */}
              {pkg.hasChecklist ? (
                <div onClick={() => setView("checklist")} style={{ display: "flex", alignItems: "center", gap: "1rem", background: C.warm, border: `1.5px solid ${C.stone}`, borderRadius: 14, padding: "0.85rem 1.1rem", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.clay; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.stone; }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(193,127,71,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.clay} strokeWidth="1.8" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: C.ink, fontFamily: BFONT, marginBottom: "0.1rem" }}>Newlywed Checklist</div>
                    <div style={{ fontSize: "0.68rem", color: C.muted, fontFamily: BFONT }}>A practical guide to starting your life together</div>
                  </div>
                  <div style={{ color: C.muted, fontSize: "0.9rem" }}>→</div>
                </div>
              ) : (
                <a href="/offerings" style={{ display: "flex", alignItems: "center", gap: "1rem", background: C.warm, border: `1.5px solid ${C.stone}`, borderRadius: 14, padding: "0.85rem 1.1rem", textDecoration: "none", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.clay; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.stone; }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(193,127,71,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.clay} strokeWidth="1.8" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: C.ink, fontFamily: BFONT, marginBottom: "0.1rem" }}>Newlywed Checklist <span style={{ fontSize: "0.62rem", fontWeight: 600, color: C.clay, background: "rgba(193,127,71,0.1)", borderRadius: 999, padding: "0.1rem 0.5rem", marginLeft: "0.35rem" }}>Add-on</span></div>
                    <div style={{ fontSize: "0.68rem", color: C.muted, fontFamily: BFONT }}>A practical guide to starting your life together</div>
                  </div>
                  <div style={{ color: C.muted, fontSize: "0.9rem" }}>→</div>
                </a>
              )}

              {/* Shared Budgeting */}
              {pkg.hasBudget ? (
                <div onClick={() => setView("budget")} style={{ display: "flex", alignItems: "center", gap: "1rem", background: C.warm, border: `1.5px solid ${C.stone}`, borderRadius: 14, padding: "0.85rem 1.1rem", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#1B5FE8"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.stone; }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(27,95,232,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1B5FE8" strokeWidth="1.8" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: C.ink, fontFamily: BFONT, marginBottom: "0.1rem" }}>Shared Budgeting Activity</div>
                    <div style={{ fontSize: "0.68rem", color: C.muted, fontFamily: BFONT }}>Build a shared financial picture from your expectations</div>
                  </div>
                  <div style={{ color: C.muted, fontSize: "0.9rem" }}>→</div>
                </div>
              ) : (
                <a href="/offerings" style={{ display: "flex", alignItems: "center", gap: "1rem", background: C.warm, border: `1.5px solid ${C.stone}`, borderRadius: 14, padding: "0.85rem 1.1rem", textDecoration: "none", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#1B5FE8"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.stone; }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(27,95,232,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1B5FE8" strokeWidth="1.8" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: C.ink, fontFamily: BFONT, marginBottom: "0.1rem" }}>Shared Budgeting Activity <span style={{ fontSize: "0.62rem", fontWeight: 600, color: "#1B5FE8", background: "rgba(27,95,232,0.1)", borderRadius: 999, padding: "0.1rem 0.5rem", marginLeft: "0.35rem" }}>Add-on</span></div>
                    <div style={{ fontSize: "0.68rem", color: C.muted, fontFamily: BFONT }}>Build a shared financial picture from your expectations</div>
                  </div>
                  <div style={{ color: C.muted, fontSize: "0.9rem" }}>→</div>
                </a>
              )}

              {/* In Practice resource library */}
              <a href="/practice" style={{ display: "flex", alignItems: "center", gap: "1rem", background: C.warm, border: `1.5px solid ${C.stone}`, borderRadius: 14, padding: "0.85rem 1.1rem", textDecoration: "none", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.clay; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.stone; }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(193,127,71,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.clay} strokeWidth="1.8" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: C.ink, fontFamily: BFONT, marginBottom: "0.1rem" }}>Resource Library</div>
                  <div style={{ fontSize: "0.68rem", color: C.muted, fontFamily: BFONT }}>Guides on communication, conflict, and growing together</div>
                </div>
                <div style={{ color: C.muted, fontSize: "0.9rem" }}>→</div>
              </a>

            </div>
          </div>



          <PrevNext />

          {/* ── BETA FEEDBACK ── */}
          <div style={{ marginTop: "2.5rem", background: "linear-gradient(135deg, #1C1A16 0%, #2d2a22 100%)", borderRadius: 18, padding: "1.5rem 1.75rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "white", fontFamily: BFONT, marginBottom: "0.2rem" }}>You're part of our beta.</div>
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", fontFamily: BFONT, lineHeight: 1.55 }}>Share what worked, what didn't, and what surprised you. Four questions.</div>
            </div>
            <button onClick={() => setShowSurvey(true)}
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", color: "white", borderRadius: 10, padding: "0.6rem 1.1rem", fontSize: "0.75rem", fontWeight: 700, fontFamily: BFONT, whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}>
              Leave feedback →
            </button>
          </div>
          {showSurvey && <BetaSurveyModal userName={userName} coupleType={coupleType} onClose={() => setShowSurvey(false)} />}
        </div>
      </Layout>
    );
  }

  return null;
}

// Thin wrappers so PersonalityResults/ExpectationsResults can be driven externally
function PersonalityResultsPage({ myAnswers, partnerAnswers, userName, partnerName, coupleType, forcedStep, orderedDims: extDims, onStepChange, onGoExpectations }) {
  const go = s => { if (onStepChange) onStepChange(s); };
  return <PersonalityResults myAnswers={myAnswers} partnerAnswers={partnerAnswers} userName={userName} partnerName={partnerName} coupleType={coupleType} externalStep={forcedStep ?? 0} onExternalGo={go} noSideNav={true} onGoExpectations={onGoExpectations} />;
}
function ExpectationsResultsPage({ myAnswers, partnerAnswers, userName, partnerName, forcedSection, onGoWhatComesNext, onExternalGo }) {
  return <ExpectationsResults myAnswers={myAnswers} partnerAnswers={partnerAnswers} userName={userName} partnerName={partnerName} forcedSection={forcedSection} noSideNav={true} onGoWhatComesNext={onGoWhatComesNext} onExternalGo={onExternalGo} />;
}
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// RESULTS HIGHLIGHTS - swipe-through before full results
// ─────────────────────────────────────────────────────────────────────────────

const CARD_W = 390;
const CARD_H = 720;

function downloadCard(cardRef, filename) {
  // Load html2canvas dynamically from CDN
  if (window._h2c) {
    window._h2c(cardRef, { scale: 2, useCORS: true, logging: false, width: CARD_W, height: CARD_H })
      .then(canvas => {
        const link = document.createElement("a");
        link.download = filename;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }).catch(() => showToast("Screenshot not available in this browser. Try long-pressing the card to save."));
    return;
  }
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
  script.onload = () => {
    window._h2c = window.html2canvas;
    downloadCard(cardRef, filename);
  };
  script.onerror = () => showToast("Download not available. Take a screenshot instead.");
  document.head.appendChild(script);
}

// Individual card wrapper with download affordance
function WrappedCard({ children, bg, onDownload, cardIndex, cardRef, inline, portraitCorner, isMobile = false }) {
  return (
    <div style={{ position: "relative", userSelect: "none", width: inline ? "100%" : isMobile ? "min(390px, calc(100vw - 1rem))" : CARD_W }}>
      <div ref={cardRef}
        style={{ width: inline ? "100%" : isMobile ? "min(390px, calc(100vw - 1rem))" : CARD_W, height: inline ? "min(72vw, 560px)" : isMobile ? "min(660px, calc(100vh - 130px))" : CARD_H, background: bg || "#2d2250", borderRadius: 20, overflow: "hidden", position: "relative", flexShrink: 0, display: "flex", flexDirection: "column" }}>
        {/* Attune watermark */}
        <div style={{ position: "absolute", bottom: 16, left: 20, display: "flex", alignItems: "center", gap: 6, opacity: 0.45 }}>
          <svg width="22" height="16" viewBox="0 0 103 76" fill="none"><defs><linearGradient id={"wg"+cardIndex} x1="0" y1="0" x2="103" y2="76" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#E8673A"/><stop offset="100%" stopColor="#1B5FE8"/></linearGradient></defs><path d="M14,4 L44,4 A9,9 0 0,1 53,13 L53,42 A9,9 0 0,1 44,51 L20,51 L6,61 L11,51 A6,6 0 0,1 5,45 L5,13 A9,9 0 0,1 14,4 Z" fill={"url(#wg"+cardIndex+")"}/><path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="white" opacity="0.9" transform="translate(13.16,11.3) scale(0.72)"/><path d="M89,14 L59,14 A9,9 0 0,0 50,23 L50,52 A9,9 0 0,0 59,61 L83,61 L97,71 L92,61 A6,6 0 0,0 98,55 L98,23 A9,9 0 0,0 89,14 Z" fill="white" stroke={"url(#wg"+cardIndex+")"} strokeWidth="2.2" strokeLinejoin="round"/><path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill={"url(#wg"+cardIndex+")"} transform="translate(58.16,21.3) scale(0.72)"/></svg>
          <span style={{ fontFamily: HFONT, fontSize: "0.75rem", fontWeight: 700, color: "white" }}>Attune</span>
        </div>
        {/* Portrait corner bubble */}
        {portraitCorner && (
          <div style={{ position: "absolute", bottom: 14, right: 14, width: 38, height: 38, borderRadius: "50%", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.4)", background: "#1C1430" }}>
            {mkCouple(portraitCorner.p1, portraitCorner.p2, true, `wc-${cardIndex}`)}
          </div>
        )}
        {children}
      </div>
      {/* Download button below card */}
      <button onClick={onDownload}
        style={{ position: "absolute", bottom: -44, right: 0, background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.78)", borderRadius: 8, padding: "0.35rem 0.75rem", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: BFONT, transition: "all 0.15s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.78)"; e.currentTarget.style.color = "white"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.78)"; e.currentTarget.style.color = "rgba(255,255,255,0.78)"; }}>
        ↓ Download
      </button>
    </div>
  );
}

function ResultsHighlights({ ex1Answers, partnerEx1, ex2Answers, partnerEx2, ex3Answers, partnerEx3, userName, partnerName, portrait, onDone, inline = false }) {
  const [cardIdx, setCardIdx] = useState(0);
  const cardRef = useRef(null);
  const isMobile = useMobile(640);

  const myS = calcDimScores(ex1Answers);
  const partS = calcDimScores(partnerEx1);
  const feedback = generatePersonalityFeedback(myS, partS, userName, partnerName);
  const sortedFeedback = [...feedback].sort((a, b) => a.gap - b.gap);
  const topStrength = sortedFeedback[0];
  const topGap = [...feedback].sort((a, b) => b.gap - a.gap)[0];
  const avgGap = feedback.reduce((s, f) => s + f.gap, 0) / feedback.length;
  const pairing = overallPairingLabel(avgGap);

  const allRows = RESPONSIBILITY_CATEGORIES.flatMap(cat =>
    cat.items.map(item => {
      const key = cat.id + "__" + item;
      const mine = ex2Answers?.responsibilities?.[key];
      const theirs = partnerEx2?.responsibilities?.[key];
      return mine && theirs ? { item, category: cat.label, mine, theirs, aligned: mine === theirs } : null;
    }).filter(Boolean)
  );
  const lifeRows = LIFE_QUESTIONS.map(q => ({
    item: q.text, category: q.category,
    mine: ex2Answers?.life?.[q.id], theirs: partnerEx2?.life?.[q.id],
    aligned: ex2Answers?.life?.[q.id] === partnerEx2?.life?.[q.id],
  })).filter(r => r.mine && r.theirs);
  const allExpRows = [...allRows, ...lifeRows];
  const alignedCount = allExpRows.filter(r => r.aligned).length;
  const alignPct = allExpRows.length ? Math.round((alignedCount / allExpRows.length) * 100) : 0;

  const coupleType = deriveCoupleTypeFromExercise(
    myS, partS, alignPct
  );

  const myStress = myS.stress || 3;
  const theirStress = partS.stress || 3;
  const mySeeks = myStress > 3.5;
  const theySeeks = theirStress > 3.5;
  const myWithdraws = myStress < 2.5;
  const theyWithdraws = theirStress < 2.5;
  const stressMismatch = (mySeeks && theyWithdraws) || (myWithdraws && theySeeks);
  const stressLine = stressMismatch
    ? (mySeeks ? userName : partnerName) + " reaches in. " + (mySeeks ? partnerName : userName) + " pulls back."
    : mySeeks && theySeeks ? "You both reach toward each other when things get hard."
    : "You both tend to pull inward when things get hard.";

  const topConvo = sortedFeedback.filter(f => f.gap > 1.5).slice(0, 1)[0];
  const convoPrompt = topConvo ? {
    energy: "When one of us needs time alone and the other wants to connect, how do we handle that?",
    expression: "Is there something you've been sitting with that you haven't found the right moment to bring up?",
    needs: "What's something you need from me that you usually don't ask for directly?",
    bids: "What's something small I do that makes you feel noticed?",
    conflict: "After a disagreement, what does 'okay again' actually feel like for you?",
    repair: "What do you need from me in the hours after a hard conversation?",
    closeness: "What's your ideal ratio of together time to time on your own?",
    love: "What's something I do that makes you feel genuinely loved?",
    stress: "When you're at your worst, what does the most helpful version of me look like?",
    feedback: "Is there something I do that bothers you that you haven't found the right way to bring up?",
  }[topConvo.dim] : "What do you each need that you haven't fully said out loud yet?";

  const strengthMeta = DIM_META[topStrength?.dim];
  const gapMeta = DIM_META[topGap?.dim];

  // Shared watermark style
  const watermark = (
    <div style={{ position: "absolute", bottom: 16, right: 18, fontSize: "0.52rem", color: "rgba(255,255,255,0.35)", fontFamily: BFONT, letterSpacing: "0.12em", textTransform: "lowercase" }}>
      attune-relationships.com
    </div>
  );
  const watermarkDark = (
    <div style={{ position: "absolute", bottom: 16, right: 18, fontSize: "0.52rem", color: "rgba(14,11,7,0.3)", fontFamily: BFONT, letterSpacing: "0.12em", textTransform: "lowercase" }}>
      attune-relationships.com
    </div>
  );

  const TOTAL_CARDS = (ex3Answers && partnerEx3) ? 8 : 7;
  const isLast = cardIdx === TOTAL_CARDS - 1;
  const handleDl = () => {
    if (cardRef.current) downloadCard(cardRef.current, "attune-" + userName.toLowerCase() + "-" + partnerName.toLowerCase() + "-" + (cardIdx + 1) + ".png");
  };
  const advance = () => { if (!isLast) setCardIdx(n => n + 1); else onDone(); };

  // Reflection data (if available)
  const hasReflData = !!(ex3Answers && partnerEx3);
  const reflOverallQ = ANNIVERSARY_QUESTIONS.find(q => q.id === "a0");
  const reflMyOverall = ex3Answers?.a0 ?? 3;
  const reflTheirOverall = partnerEx3?.a0 ?? 3;
  const reflAvgOverall = (reflMyOverall + reflTheirOverall) / 2;
  const reflOverallLabel = reflOverallQ ? reflOverallQ.scaleLabels[Math.round(reflAvgOverall)] : "really good";
  const reflOverallAligned = Math.abs(reflMyOverall - reflTheirOverall) <= 1;
  const reflMyAdmire = ex3Answers?.a8;
  const reflTheirAdmire = partnerEx3?.a8;
  const reflMyPriority = Array.isArray(ex3Answers?.a_priority) ? ex3Answers.a_priority[0] : null;
  const reflTheirPriority = Array.isArray(partnerEx3?.a_priority) ? partnerEx3.a_priority[0] : null;

  // Card dimensions — portrait ratio ideal for stories (9:16)
  const CARD_ASPECT = inline ? "min(72vw, 500px)" : CARD_H + "px";

  // ── Shared entrance animation ──────────────────────────────────────────────
  const cardAnim = `
    @keyframes cardReveal { from { opacity:0; transform:translateY(18px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
    @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    @keyframes popIn { from { opacity:0; transform:scale(0.88); } to { opacity:1; transform:scale(1); } }
    @keyframes slideRight { from { opacity:0; transform:translateX(-16px); } to { opacity:1; transform:translateX(0); } }
    @keyframes numCount { from { opacity:0; transform:scale(0.7); } to { opacity:1; transform:scale(1); } }
  `;

  const cards = [
    // ── 1. OPENER ──────────────────────────────────────────────────────────────
    <WrappedCard key={0} bg="linear-gradient(145deg, #0e0b1e 0%, #1a1040 50%, #0e0b1e 100%)" onDownload={handleDl} cardIndex={0} cardRef={cardRef} inline={inline} isMobile={isMobile}>
      <style>{cardAnim}</style>
      <div onClick={advance} style={{ flex: 1, display: "flex", flexDirection: "column", cursor: "pointer", position: "relative", overflow: "hidden" }}>
        {watermark}
        <div style={{ height: 5, background: "linear-gradient(90deg, #E8673A, #9B5DE5, #1B5FE8)", flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2.5rem 2.5rem 2rem", textAlign: "center", animation: "cardReveal 0.5s cubic-bezier(0.22,1,0.36,1) both" }}>
          {portrait && (
            <div style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", marginBottom: "1.5rem", border: "2px solid rgba(255,255,255,0.15)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", animation: "popIn 0.5s 0.1s cubic-bezier(0.34,1.56,0.64,1) both" }}>
              {mkCouple(portrait.p1, portrait.p2, true, "card0")}
            </div>
          )}
          <div style={{ fontSize: "0.55rem", letterSpacing: "0.32em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontFamily: BFONT, fontWeight: 700, marginBottom: "1.25rem", animation: "fadeUp 0.4s 0.15s both" }}>Your results</div>
          <div style={{ fontFamily: HFONT, fontSize: "clamp(2.6rem,7vw,3.8rem)", fontWeight: 700, color: "white", lineHeight: 0.92, letterSpacing: "-0.03em", marginBottom: "1.5rem", animation: "fadeUp 0.5s 0.2s cubic-bezier(0.22,1,0.36,1) both" }}>
            {userName}<br/><span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.7em" }}>&amp;</span><br/>{partnerName}
          </div>
          <div style={{ width: 40, height: 2, background: "linear-gradient(90deg, #E8673A, #1B5FE8)", borderRadius: 2, marginBottom: "1.5rem", animation: "popIn 0.4s 0.35s both" }} />
          <p style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.6)", fontFamily: BFONT, fontWeight: 300, lineHeight: 1.7, maxWidth: 260, margin: 0, animation: "fadeUp 0.4s 0.4s both" }}>
            Built from your independent answers. This is what you look like together.
          </p>
        </div>
        <div style={{ textAlign: "center", padding: "0 0 1.75rem", fontSize: "0.52rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", fontFamily: BFONT, animation: "fadeUp 0.4s 0.55s both" }}>Tap to begin</div>
      </div>
    </WrappedCard>,

    // ── 2. COUPLE TYPE — Fixed overflow, "Your couple type is", duos visible ───
    <WrappedCard key={1} bg={`linear-gradient(145deg, ${coupleType?.color || "#E8673A"}cc 0%, ${coupleType?.color || "#E8673A"}77 60%, #1a1035 100%)`} onDownload={handleDl} cardIndex={1} cardRef={cardRef} inline={inline} isMobile={isMobile} portraitCorner={portrait}>
      <style>{cardAnim}</style>
      <div onClick={advance} style={{ flex: 1, display: "flex", flexDirection: "column", cursor: "pointer", position: "relative", overflow: "hidden" }}>
        {watermark}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "2.75rem 2.5rem 2rem", position: "relative" }}>
          {/* Eyebrow */}
          <div style={{ fontSize: "0.52rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.65)", fontFamily: BFONT, fontWeight: 700, marginBottom: "0.6rem", animation: "fadeUp 0.4s 0.05s both" }}>
            Your couple type is
          </div>
          {/* Type name — clamped so it always fits */}
          <div style={{ fontFamily: HFONT, fontSize: "clamp(2rem,8vw,3rem)", fontWeight: 700, color: "white", lineHeight: 1.0, letterSpacing: "-0.02em", marginBottom: "0.75rem", wordBreak: "break-word", animation: "fadeUp 0.5s 0.12s cubic-bezier(0.22,1,0.36,1) both" }}>
            {coupleType?.name || "The orbit"}
          </div>
          {/* Tagline */}
          <p style={{ fontSize: "0.92rem", color: "rgba(255,255,255,0.85)", fontFamily: BFONT, fontWeight: 500, lineHeight: 1.45, margin: "0 0 1.25rem", fontStyle: "italic", animation: "fadeUp 0.4s 0.2s both" }}>
            {coupleType?.tagline}
          </p>
          {/* Famous duos — directly under tagline, always visible */}
          {coupleType?.famousDuos?.length > 0 && (
            <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: "0.85rem 1rem", marginBottom: "1.25rem", animation: "fadeUp 0.4s 0.28s both" }}>
              <div style={{ fontSize: "0.48rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontFamily: BFONT, marginBottom: "0.5rem" }}>You're in good company</div>
              {coupleType?.famousDuos.map((d, i) => (
                <div key={i} style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.88)", fontFamily: BFONT, fontWeight: 600, marginBottom: "0.2rem" }}>
                  {d.names} <span style={{ color: "rgba(255,255,255,0.42)", fontWeight: 300, fontSize: "0.72rem" }}>· {d.show}</span>
                </div>
              ))}
            </div>
          )}
          {/* Description */}
          <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.7)", fontFamily: BFONT, fontWeight: 300, lineHeight: 1.7, margin: 0, animation: "fadeUp 0.4s 0.35s both" }}>
            {coupleType?.description ? coupleType?.description.replace(/\{U\}/g, userName).replace(/\{P\}/g, partnerName) : ""}
          </p>
        </div>
      </div>
    </WrappedCard>,

    // ── 3. STRENGTH — "How two like minds show up" framing ────────────────────
    <WrappedCard key={2} bg="linear-gradient(145deg, #022c1c 0%, #064d2e 50%, #022c1c 100%)" onDownload={handleDl} cardIndex={2} cardRef={cardRef} inline={inline} isMobile={isMobile} portraitCorner={portrait}>
      <style>{cardAnim}</style>
      <div onClick={advance} style={{ flex: 1, display: "flex", flexDirection: "column", cursor: "pointer", position: "relative", overflow: "hidden" }}>
        {watermark}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -60%)", width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "3rem 2.5rem 2.5rem", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.35)", borderRadius: 999, padding: "0.35rem 0.85rem", marginBottom: "1.5rem", alignSelf: "flex-start", animation: "slideRight 0.4s 0.05s both" }}>
            <span style={{ fontSize: "0.55rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "#10b981", fontFamily: BFONT, fontWeight: 700 }}>Naturally in tune</span>
          </div>
          <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.42)", fontFamily: BFONT, fontWeight: 300, marginBottom: "0.5rem", animation: "fadeUp 0.4s 0.12s both" }}>Where you don't have to work for it</div>
          <div style={{ fontFamily: HFONT, fontSize: "clamp(2.4rem,6vw,3.2rem)", fontWeight: 700, color: "#10b981", lineHeight: 0.95, letterSpacing: "-0.02em", marginBottom: "1.5rem", animation: "fadeUp 0.5s 0.18s cubic-bezier(0.22,1,0.36,1) both" }}>
            {strengthMeta?.label || "Emotional Expression"}
          </div>
          <p style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.82)", fontFamily: BFONT, fontWeight: 300, lineHeight: 1.75, margin: "0 0 1.5rem", animation: "fadeUp 0.4s 0.26s both" }}>
            {topStrength?.strengthText || "You share a similar orientation here — it shows up as natural ease between you."}
          </p>
          {/* Reframed: for two like minds */}
          <div style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.22)", borderRadius: 12, padding: "0.85rem 1.1rem", animation: "fadeUp 0.4s 0.34s both" }}>
            <div style={{ fontSize: "0.48rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#10b981", fontFamily: BFONT, fontWeight: 700, marginBottom: "0.35rem" }}>For two who think alike</div>
            <p style={{ fontSize: "0.78rem", color: "#6ee7b7", fontFamily: BFONT, fontWeight: 400, lineHeight: 1.65, margin: 0 }}>
              {topStrength?.adviceText || "This alignment removes an entire category of slow-burn friction. Lean into it — it's rarer than it looks."}
            </p>
          </div>
        </div>
      </div>
    </WrappedCard>,

    // ── 4. GROWTH SPOT — Lighter, warmer ──────────────────────────────────────
    <WrappedCard key={3} bg="linear-gradient(145deg, #3d1800 0%, #6b2f00 40%, #3d1800 100%)" onDownload={handleDl} cardIndex={3} cardRef={cardRef} inline={inline} isMobile={isMobile} portraitCorner={portrait}>
      <style>{cardAnim}</style>
      <div onClick={advance} style={{ flex: 1, display: "flex", flexDirection: "column", cursor: "pointer", position: "relative", overflow: "hidden" }}>
        {watermark}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -60%)", width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle, rgba(232,103,58,0.22) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "3rem 2.5rem 2.5rem", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(232,103,58,0.25)", border: "1px solid rgba(232,103,58,0.4)", borderRadius: 999, padding: "0.35rem 0.85rem", marginBottom: "1.5rem", alignSelf: "flex-start", animation: "slideRight 0.4s 0.05s both" }}>
            <span style={{ fontSize: "0.55rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "#ff8c5a", fontFamily: BFONT, fontWeight: 700 }}>Worth understanding</span>
          </div>
          <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", fontFamily: BFONT, fontWeight: 300, marginBottom: "0.5rem", animation: "fadeUp 0.4s 0.12s both" }}>Where you diverge most</div>
          <div style={{ fontFamily: HFONT, fontSize: "clamp(2.4rem,6vw,3.2rem)", fontWeight: 700, color: "#ff8c5a", lineHeight: 0.95, letterSpacing: "-0.02em", marginBottom: "1rem", animation: "fadeUp 0.5s 0.18s cubic-bezier(0.22,1,0.36,1) both" }}>
            {gapMeta?.label || "Conflict Style"}
          </div>
          <div style={{ marginBottom: "1.5rem", animation: "fadeUp 0.4s 0.24s both" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.45)", fontFamily: BFONT }}>{gapMeta?.ends?.[0]}</span>
              <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.45)", fontFamily: BFONT }}>{gapMeta?.ends?.[1]}</span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.12)", borderRadius: 3, position: "relative" }}>
              {(() => {
                const myPct = Math.round(((myS[topGap?.dim] || 3) / 5) * 100);
                const theirPct = Math.round(((partS[topGap?.dim] || 3) / 5) * 100);
                return (<>
                  <div title={userName} style={{ position: "absolute", top: "50%", left: myPct + "%", transform: "translate(-50%,-50%)", width: 22, height: 22, borderRadius: "50%", background: "#E8673A", border: "2.5px solid white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.5rem", color: "white", fontWeight: 700, fontFamily: BFONT }}>{userName[0]}</div>
                  <div title={partnerName} style={{ position: "absolute", top: "50%", left: theirPct + "%", transform: "translate(-50%,-50%)", width: 22, height: 22, borderRadius: "50%", background: "#1B5FE8", border: "2.5px solid white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.5rem", color: "white", fontWeight: 700, fontFamily: BFONT }}>{partnerName[0]}</div>
                </>);
              })()}
            </div>
          </div>
          <p style={{ fontSize: "0.86rem", color: "rgba(255,230,210,0.88)", fontFamily: BFONT, fontWeight: 300, lineHeight: 1.75, margin: "0 0 1.25rem", animation: "fadeUp 0.4s 0.3s both" }}>
            {topGap?.insightText || "This shows up in recurring moments — one of you naturally leans one way, the other another."}
          </p>
          <div style={{ background: "rgba(232,103,58,0.15)", border: "1px solid rgba(232,103,58,0.25)", borderRadius: 12, padding: "0.85rem 1.1rem", animation: "fadeUp 0.4s 0.38s both" }}>
            <div style={{ fontSize: "0.48rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#ff8c5a", fontFamily: BFONT, fontWeight: 700, marginBottom: "0.35rem" }}>One thing to try</div>
            <p style={{ fontSize: "0.78rem", color: "rgba(255,210,180,0.92)", fontFamily: BFONT, fontWeight: 400, lineHeight: 1.6, margin: 0 }}>
              {topGap?.adviceText || "Name it out loud when you notice it. That alone changes how it plays out."}
            </p>
          </div>
        </div>
      </div>
    </WrappedCard>,

    // ── 5. BY THE NUMBERS ─────────────────────────────────────────────────────
    <WrappedCard key={4} bg="linear-gradient(145deg, #060d1a 0%, #0d2545 50%, #060d1a 100%)" onDownload={handleDl} cardIndex={4} cardRef={cardRef} inline={inline} isMobile={isMobile} portraitCorner={portrait}>
      <style>{cardAnim}</style>
      <div onClick={advance} style={{ flex: 1, display: "flex", flexDirection: "column", cursor: "pointer", position: "relative", overflow: "hidden", alignItems: "center", justifyContent: "center", padding: "3rem 2.5rem 3rem", textAlign: "center" }}>
        {watermark}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-55%)", width: 280, height: 280, borderRadius: "50%", background: `radial-gradient(circle, ${alignPct >= 70 ? "rgba(16,185,129,0.14)" : alignPct >= 50 ? "rgba(27,95,232,0.14)" : "rgba(232,103,58,0.14)"} 0%, transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
          <div style={{ fontSize: "0.58rem", letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", fontFamily: BFONT, fontWeight: 700, marginBottom: "1.25rem", animation: "fadeUp 0.4s 0.05s both" }}>Expectations</div>
          <div style={{ fontFamily: HFONT, fontSize: "clamp(5rem,15vw,8rem)", fontWeight: 700, color: alignPct >= 70 ? "#10b981" : alignPct >= 50 ? "#60a5fa" : "#E8673A", lineHeight: 0.85, letterSpacing: "-0.05em", marginBottom: "0.35rem", animation: "numCount 0.6s 0.1s cubic-bezier(0.34,1.56,0.64,1) both" }}>{alignPct}%</div>
          <div style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.85)", fontFamily: BFONT, fontWeight: 500, marginBottom: "1.75rem", animation: "fadeUp 0.4s 0.25s both" }}>already aligned</div>
          <div style={{ width: 50, height: 1, background: "rgba(255,255,255,0.18)", margin: "0 auto 1.75rem", animation: "popIn 0.3s 0.3s both" }} />
          <p style={{ fontSize: "0.84rem", color: "rgba(255,255,255,0.55)", fontFamily: BFONT, fontWeight: 300, lineHeight: 1.75, maxWidth: 260, margin: "0 auto 1.75rem", animation: "fadeUp 0.4s 0.35s both" }}>
            {alignPct >= 70 ? "That's a strong foundation. The gaps you do have are conversations, not problems."
              : alignPct >= 50 ? "Solid common ground. The places you differ are exactly worth naming now."
              : "More to discuss, which is the whole point. Most couples don't surface these topics until they're harder to talk about."}
          </p>
          <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", animation: "fadeUp 0.4s 0.42s both" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#10b981", fontFamily: HFONT }}>{alignedCount}</div>
              <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)", fontFamily: BFONT, letterSpacing: "0.08em" }}>aligned</div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#E8673A", fontFamily: HFONT }}>{allExpRows.length - alignedCount}</div>
              <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)", fontFamily: BFONT, letterSpacing: "0.08em" }}>to discuss</div>
            </div>
          </div>
        </div>
      </div>
    </WrappedCard>,

    // ── 6. RELATIONSHIP REFLECTION (conditional) ──────────────────────────────
    ...(hasReflData ? [
    <WrappedCard key={5} bg="linear-gradient(145deg, #0f0c29 0%, #1d1a4e 50%, #0f0c29 100%)" onDownload={handleDl} cardIndex={5} cardRef={cardRef} inline={inline} isMobile={isMobile} portraitCorner={portrait}>
      <style>{cardAnim}</style>
      <div onClick={advance} style={{ flex: 1, display: "flex", flexDirection: "column", cursor: "pointer", position: "relative", overflow: "hidden" }}>
        {watermark}
        <div style={{ height: 3, background: "linear-gradient(90deg, #1B5FE8, #5B6DF8)", flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "2.25rem 2.25rem 2rem", position: "relative" }}>
          <div style={{ fontSize: "0.48rem", letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(91,109,248,0.8)", fontFamily: BFONT, fontWeight: 700, marginBottom: "0.6rem", animation: "fadeUp 0.4s 0.05s both" }}>
            Relationship Reflection
          </div>
          {/* Overall feel */}
          <div style={{ fontFamily: HFONT, fontSize: "clamp(1.4rem,5vw,2rem)", fontWeight: 700, color: "white", lineHeight: 1.05, letterSpacing: "-0.02em", marginBottom: "0.4rem", animation: "fadeUp 0.5s 0.12s cubic-bezier(0.22,1,0.36,1) both" }}>
            {reflOverallAligned
              ? `You're both feeling ${reflOverallLabel.toLowerCase()}.`
              : `Different reads on the same relationship.`}
          </div>
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", fontFamily: BFONT, fontWeight: 300, marginBottom: "1.25rem", animation: "fadeUp 0.4s 0.2s both" }}>
            {reflOverallAligned ? "Shared perception of where you are right now." : "Both perspectives are worth understanding."}
          </p>
          {/* Scale bars */}
          {[
            { id: "a_sat_conn", label: "Day-to-day connection", q: ANNIVERSARY_QUESTIONS.find(q=>q.id==="a_sat_conn") },
            { id: "a_sat_comm", label: "Communication", q: ANNIVERSARY_QUESTIONS.find(q=>q.id==="a_sat_comm") },
            { id: "a_sat_fun", label: "Fun & lightness", q: ANNIVERSARY_QUESTIONS.find(q=>q.id==="a_sat_fun") },
          ].filter(({q}) => q).map(({id, label, q}) => {
            const myVal = ex3Answers[id] ?? 2;
            const theirVal = partnerEx3[id] ?? 2;
            const total = q.scaleLabels.length - 1;
            return (
              <div key={id} style={{ marginBottom: "0.6rem", animation: "fadeUp 0.4s 0.28s both" }}>
                <div style={{ fontSize: "0.52rem", color: "rgba(255,255,255,0.45)", fontFamily: BFONT, marginBottom: "0.2rem", letterSpacing: "0.08em" }}>{label}</div>
                {[[userName, myVal, "#E8673A"], [partnerName, theirVal, "#5B6DF8"]].map(([name, val, color]) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.15rem" }}>
                    <span style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.4)", width: 36, flexShrink: 0, fontFamily: BFONT }}>{name.split(" ")[0]}</span>
                    <div style={{ display: "flex", gap: 2, flex: 1 }}>
                      {q.scaleLabels.map((_, i) => (
                        <div key={i} style={{ flex: 1, height: 5, borderRadius: 2, background: i <= val ? color : color + "22" }} />
                      ))}
                    </div>
                    <span style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.35)", fontFamily: BFONT, width: 56, textAlign: "right", flexShrink: 0 }}>{q.scaleLabels[val]}</span>
                  </div>
                ))}
              </div>
            );
          })}
          {/* Appreciation reveal */}
          {reflMyAdmire && reflTheirAdmire && (
            <div style={{ marginTop: "0.75rem", background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "0.85rem 1rem", border: "1px solid rgba(255,255,255,0.1)", animation: "fadeUp 0.4s 0.38s both" }}>
              <div style={{ fontSize: "0.46rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(91,109,248,0.7)", fontFamily: BFONT, marginBottom: "0.45rem" }}>What you admire in each other</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {[[userName, reflTheirAdmire, "#E8673A"], [partnerName, reflMyAdmire, "#5B6DF8"]].map(([name, admires, color]) => (
                  <div key={name}>
                    <div style={{ fontSize: "0.46rem", color: "rgba(255,255,255,0.35)", fontFamily: BFONT, marginBottom: "0.2rem" }}>{name} is admired for</div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color, fontFamily: HFONT }}>{admires}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </WrappedCard>
    ] : []),

    // ── 7. ONE CONVERSATION — Quote is the star ────────────────────────────────
    <WrappedCard key={hasReflData ? 6 : 5} bg="linear-gradient(145deg, #120d2e 0%, #2a1a5e 50%, #120d2e 100%)" onDownload={handleDl} cardIndex={hasReflData ? 6 : 5} cardRef={cardRef} inline={inline} isMobile={isMobile} portraitCorner={portrait}>
      <style>{cardAnim}</style>
      <div onClick={advance} style={{ flex: 1, display: "flex", flexDirection: "column", cursor: "pointer", position: "relative", overflow: "hidden" }}>
        {watermark}
        <div style={{ height: 4, background: "linear-gradient(90deg, #9B5DE5, #1B5FE8)", flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2.25rem 2.25rem 2.25rem", textAlign: "center" }}>
          <div style={{ fontSize: "0.52rem", letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontFamily: BFONT, fontWeight: 700, marginBottom: "1.5rem", animation: "fadeUp 0.4s 0.05s both" }}>
            One conversation worth having
          </div>
          <div style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 20, padding: "1.75rem 1.75rem 1.5rem", marginBottom: "1.75rem", maxWidth: 320, width: "100%", animation: "popIn 0.55s 0.12s cubic-bezier(0.34,1.56,0.64,1) both", boxShadow: "0 8px 40px rgba(0,0,0,0.3)" }}>
            <p style={{ fontFamily: HFONT, fontSize: "clamp(1.1rem,3.2vw,1.3rem)", fontWeight: 400, color: "white", lineHeight: 1.55, fontStyle: "italic", margin: 0 }}>
              {convoPrompt}
            </p>
          </div>
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", fontFamily: BFONT, fontWeight: 300, lineHeight: 1.65, maxWidth: 240, margin: 0, animation: "fadeUp 0.4s 0.35s both" }}>
            Based on where {userName} and {partnerName} diverge most.
          </p>
        </div>
      </div>
    </WrappedCard>,

    // ── 8. FINALE — View results + download ───────────────────────────────────
    <WrappedCard key={hasReflData ? 7 : 6} bg="linear-gradient(145deg, #0e0b1e 0%, #1a1040 50%, #0e0b1e 100%)" onDownload={handleDl} cardIndex={hasReflData ? 7 : 6} cardRef={cardRef} inline={inline} isMobile={isMobile} portraitCorner={portrait}>
      <style>{cardAnim}</style>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        {watermark}
        <div style={{ height: 5, background: "linear-gradient(90deg, #E8673A, #9B5DE5, #1B5FE8)", flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2.5rem 2.5rem 2.5rem", textAlign: "center", animation: "cardReveal 0.5s cubic-bezier(0.22,1,0.36,1) both" }}>
          <div style={{ fontFamily: HFONT, fontSize: "clamp(1.75rem,4vw,2.4rem)", fontWeight: 700, color: "white", lineHeight: 1.1, marginBottom: "0.5rem", animation: "fadeUp 0.4s 0.1s both" }}>
            That's your preview.
          </div>
          <div style={{ fontFamily: HFONT, fontSize: "clamp(1.75rem,4vw,2.4rem)", fontWeight: 700, color: "rgba(255,255,255,0.32)", lineHeight: 1.1, marginBottom: "2.25rem", animation: "fadeUp 0.4s 0.16s both" }}>
            Ready for the full picture?
          </div>
          {/* Primary CTA */}
          <button onClick={onDone}
            style={{ background: "linear-gradient(135deg, #E8673A, #1B5FE8)", color: "white", border: "none", borderRadius: 14, padding: "1rem 2.25rem", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", fontFamily: BFONT, letterSpacing: "0.05em", marginBottom: "0.85rem", width: "100%", maxWidth: 300, animation: "popIn 0.5s 0.24s cubic-bezier(0.34,1.56,0.64,1) both" }}>
            View your full results →
          </button>
          {/* Secondary — download */}
          <button onClick={handleDl}
            style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 14, padding: "0.85rem 2.25rem", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: BFONT, letterSpacing: "0.04em", marginBottom: "1.75rem", width: "100%", maxWidth: 300, animation: "popIn 0.5s 0.32s cubic-bezier(0.34,1.56,0.64,1) both" }}>
            Download this overview ↓
          </button>
          <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.28)", fontFamily: BFONT, lineHeight: 1.65, maxWidth: 230, animation: "fadeUp 0.4s 0.42s both" }}>
            10 dimensions · side-by-side expectations · your couple type
          </div>
        </div>
      </div>
    </WrappedCard>,
  ];
  const content = (
    <>
      <link href={FONT_URL} rel="stylesheet" />
      {!inline && <div style={{ height: 52, background: "rgba(20,16,40,0.97)", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1.5rem", flexShrink: 0 }}>
        <button onClick={() => { if (typeof setView === 'function') setView('home'); else window.history.back(); }} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.45)", fontSize: "0.7rem", letterSpacing: "0.08em", cursor: "pointer", fontFamily: BFONT, padding: 0, display: "flex", alignItems: "center", gap: "0.35rem" }}><span style={{ fontSize: "0.8rem" }}>←</span> Dashboard</button>
        <button onClick={onDone} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.72)", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: BFONT }}>
          View full results →
        </button>
      </div>}

      {inline && <div style={{ display: "flex", gap: 5, marginBottom: "1.25rem" }}>
        {Array.from({ length: TOTAL_CARDS }).map((_, i) => (
          <div key={i} onClick={() => setCardIdx(i)} style={{ height: 4, width: i === cardIdx ? 28 : 18, borderRadius: 2, background: i === cardIdx ? (coupleType?.color || "#E8673A") : i < cardIdx ? "rgba(0,0,0,0.25)" : "#E8DDD0", cursor: "pointer", transition: "all 0.2s" }} />
        ))}
      </div>}

      <div style={{ flex: inline ? undefined : 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: inline ? "0 0 3rem" : isMobile ? "0.5rem 0 4rem" : "1rem 0.5rem 5rem", overflowY: inline ? undefined : "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
        {cards[cardIdx]}
      </div>

      <div style={{ position: inline ? "static" : "absolute", bottom: inline ? undefined : 0, left: inline ? undefined : 0, right: inline ? undefined : 0, padding: inline ? "0" : "0 1.5rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginTop: inline ? "1rem" : 0 }}>
        <button onClick={() => cardIdx > 0 && setCardIdx(n => n - 1)} disabled={cardIdx === 0}
          style={{ width: 44, height: 44, borderRadius: "50%", background: cardIdx === 0 ? "transparent" : inline ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.1)", border: cardIdx === 0 ? "none" : "1px solid " + (inline ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.15)"), color: cardIdx === 0 ? "transparent" : inline ? "#0E0B07" : "white", fontSize: "1.1rem", cursor: cardIdx === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          ‹
        </button>
        {/* Progress dots — prominent at bottom on mobile */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: inline ? 0 : 6 }}>
          {inline
            ? <span style={{ fontSize: "0.62rem", color: C.muted, fontFamily: BFONT, letterSpacing: "0.1em" }}>{cardIdx + 1} / {TOTAL_CARDS}</span>
            : Array.from({ length: TOTAL_CARDS }).map((_, i) => (
                <div key={i} onClick={() => setCardIdx(i)}
                  style={{ height: i === cardIdx ? 8 : 6, width: i === cardIdx ? 24 : 6, borderRadius: 99, background: i === cardIdx ? "white" : i < cardIdx ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.18)", cursor: "pointer", transition: "all 0.2s", flexShrink: 0 }} />
              ))
          }
        </div>
        {isLast
          ? <div style={{ width: 44, height: 44 }} />
          : <button onClick={advance}
              style={{ width: 44, height: 44, borderRadius: "50%", background: inline ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.1)", border: "1px solid " + (inline ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.15)"), color: inline ? "#0E0B07" : "white", fontSize: "1.1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              ›
            </button>
        }
      </div>
    </>
  );

  if (inline) return <div style={{ display: "flex", flexDirection: "column" }}>{content}</div>;
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#120f22", display: "flex", flexDirection: "column", zIndex: 200, overflow: "hidden", paddingBottom: "env(safe-area-inset-bottom)", alignItems: isMobile ? "center" : undefined }}>
      {/* Subtle side gradient panels on desktop */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 15% 50%, rgba(232,103,58,0.06) 0%, transparent 60%), radial-gradient(ellipse at 85% 50%, rgba(27,95,232,0.06) 0%, transparent 60%)", pointerEvents: "none" }} />
      {content}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH MODAL — Sign up / Log in
// ─────────────────────────────────────────────────────────────────────────────
function AuthModal({ mode, onClose, onSuccess }) {
  const isMobile = useMobile(560);
  const [tab, setTab] = useState(mode || "signup");
  // Pre-fill names from URL params (passed from checkout on purchase)
  const _authParams = new URLSearchParams(window.location.search);
  const _p1 = _authParams.get('p1') || '';
  const _p2 = _authParams.get('p2') || '';
  const _partnerAEmail = (_authParams.get('pae') || '').toLowerCase(); // for uniqueness check on Partner B signup
  const _qrToken = _authParams.get('qr') || '';
  const [form, setForm] = useState({ name: _p1, pronouns: "", partnerName: _p2, partnerPronouns: "", partnerEmail: "", email: "", password: "", emailOptIn: true });
  const [qrOrder, setQrOrder] = useState(null);     // populated if a qr token resolves to a real order
  const [qrStatus, setQrStatus] = useState(_qrToken ? 'loading' : 'none'); // 'none' | 'loading' | 'ok' | 'claimed' | 'invalid'
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [shake, setShake] = useState(false);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // When we arrive via a QR-code scan, look up the order it was issued to and
  // prefill the signup form with the partner names. This makes the first step
  // feel personal ("Welcome Sarah and James") instead of starting from blank.
  React.useEffect(() => {
    if (!_qrToken) return;
    let cancelled = false;
    fetch(`/api/qr-claim?token=${encodeURIComponent(_qrToken)}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data?.error === 'not-found' || data?.error === 'Missing token') {
          setQrStatus('invalid');
          return;
        }
        if (!data?.order) { setQrStatus('invalid'); return; }
        setQrOrder(data.order);
        setQrStatus(data.order.claimed ? 'claimed' : 'ok');
        // Only prefill for unclaimed orders — if already claimed, user is
        // probably signing in or the second partner (who should use the
        // invite link, not the QR).
        if (!data.order.claimed) {
          setForm(f => ({
            ...f,
            name: f.name || data.order.partner1Name || data.order.buyerName || '',
            partnerName: f.partnerName || data.order.partner2Name || '',
          }));
        }
      })
      .catch(() => { if (!cancelled) setQrStatus('invalid'); });
    return () => { cancelled = true; };
  }, [_qrToken]);

  // Trigger shake + clear after animation (0.45s)
  const triggerShake = () => {
    setShake(false);
    // Force reflow so animation restarts if triggered twice in a row
    requestAnimationFrame(() => { setShake(true); setTimeout(() => setShake(false), 500); });
  };

  const genInvite = () => Math.random().toString(36).slice(2, 10).toUpperCase();

  const handleSignup = async () => {
    if (!form.name.trim()) return setErr("Please enter your name.");
    if (!form.email.trim() || !form.email.includes("@")) return setErr("Please enter a valid email.");
    if (!form.password || form.password.length < 6) return setErr("Password must be at least 6 characters.");
    setLoading(true);
    setErr("");

    // ── Supabase auth ────────────────────────────────────────────────────────
    // Email uniqueness check — Partner B cannot use same email as Partner A
    if (_partnerAEmail && form.email.trim().toLowerCase() === _partnerAEmail) {
      setLoading(false);
      return setErr("This email is already linked to the other partner's account. Each partner needs their own email address.");
    }

    const { supabase: sb, hasSupabase } = await import('./supabase.js');
    if (hasSupabase()) {
      const { data: authData, error: authErr } = await sb.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: { data: { name: form.name.trim() } },
      });
      if (authErr) { setLoading(false); return setErr(authErr.message); }

      // Write profile fields that aren't in auth metadata
      const inviteCode = genInvite();
      await sb.from('profiles').upsert({
        id:               authData.user.id,
        name:             form.name.trim(),
        pronouns:         form.pronouns.trim() || "",
        partner_name:     form.partnerName.trim() || "",
        partner_pronouns: form.partnerPronouns.trim() || "",
        partner_email:    form.partnerEmail.trim().toLowerCase() || "",
        email_opt_in:     form.emailOptIn,
        invite_code:      inviteCode,
        partner_joined:   false,
        pkg:              new URLSearchParams(window.location.search).get("pkg") || "core",
        ex1_answers:      null,
        ex2_answers:      null,
        ex3_answers:      null,
      });

      const account = {
        id: authData.user.id,
        email: form.email.trim().toLowerCase(),
        name: form.name.trim(),
        pronouns: form.pronouns.trim() || "",
        partnerName: form.partnerName.trim() || "",
        partnerPronouns: form.partnerPronouns.trim() || "",
        partnerEmail: form.partnerEmail.trim().toLowerCase() || "",
        emailOptIn: form.emailOptIn,
        inviteCode,
        partnerJoined: false,
        pkg: new URLSearchParams(window.location.search).get("pkg") || "core",
        createdAt: Date.now(),
      };
      try { localStorage.setItem("attune_account", JSON.stringify(account)); } catch {}

      // Send partner invite email if partner email was provided
      if (form.partnerEmail.trim()) {
        const inviteUrl = `${window.location.origin}/app?invite=${encodeURIComponent(inviteCode)}&from=${encodeURIComponent(form.name.trim())}&pae=${encodeURIComponent(form.email.trim().toLowerCase())}`;
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'partner_invite',
            fromName: form.name.trim(),
            toEmail: form.partnerEmail.trim(),
            toName: form.partnerName.trim() || 'Your partner',
            inviteUrl,
          }),
        }).catch(() => {});
      }

      // Send welcome email to new user
      if (form.emailOptIn !== false) {
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'welcome_account',
            userId: account?.id || null,
            toEmail: form.email.trim().toLowerCase(),
            toName: form.name.trim(),
            partnerName: form.partnerName.trim() || null,
            portalUrl: `${window.location.origin}/app`,
          }),
        }).catch(() => {});
      }

      // If the user arrived via a QR-code scan, claim the order so the token
      // can't be reused. Fire-and-forget — we don't block signup on this.
      if (_qrToken && qrStatus === 'ok') {
        fetch('/api/qr-claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: _qrToken, email: form.email.trim().toLowerCase() }),
        }).catch(() => {});
      }

      setLoading(false);
      onSuccess(account);
      return;
    }

    // ── localStorage fallback (no Supabase configured) ───────────────────────
    const account = {
      email: form.email.trim().toLowerCase(),
      name: form.name.trim(),
      pronouns: form.pronouns.trim() || "",
      partnerName: form.partnerName.trim() || "",
      partnerPronouns: form.partnerPronouns.trim() || "",
      partnerEmail: form.partnerEmail.trim().toLowerCase() || "",
      emailOptIn: form.emailOptIn,
      inviteCode: genInvite(),
      partnerJoined: false,
      pkg: new URLSearchParams(window.location.search).get("pkg") || "core",
      createdAt: Date.now(),
    };
    try { localStorage.setItem("attune_account", JSON.stringify(account)); } catch {}

    // Send partner invite email if partner email provided
    if (form.partnerEmail.trim() && account.inviteCode) {
      const inviteUrl = `${window.location.origin}/app?invite=${encodeURIComponent(account.inviteCode)}&from=${encodeURIComponent(form.name.trim())}&pae=${encodeURIComponent(form.email.trim().toLowerCase())}`;
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'partner_invite', fromName: form.name.trim(), toEmail: form.partnerEmail.trim(), toName: form.partnerName.trim() || 'Your partner', inviteUrl }),
      }).catch(() => {});
    }

    // Claim the QR token if we arrived from a physical card scan
    if (_qrToken && qrStatus === 'ok') {
      fetch('/api/qr-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: _qrToken, email: form.email.trim().toLowerCase() }),
      }).catch(() => {});
    }

    setLoading(false);
    onSuccess(account);
  };

  const handleLogin = async () => {
    if (!form.email.trim() || !form.password) return setErr("Please enter your email and password.");
    // Client-side rate limiting: lock after 5 failed attempts for 30 seconds
    if (lockedUntil && Date.now() < lockedUntil) {
      const secs = Math.ceil((lockedUntil - Date.now()) / 1000);
      return setErr(`Too many attempts. Please wait ${secs} seconds.`);
    }
    setLoading(true);
    setErr("");

    // ── Supabase auth ────────────────────────────────────────────────────────
    const { supabase: sb, hasSupabase } = await import('./supabase.js');
    if (hasSupabase()) {
      const { data: authData, error: authErr } = await sb.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      if (authErr) {
        setLoading(false);
        const attempts = loginAttempts + 1;
        setLoginAttempts(attempts);
        // Trigger shake animation on every failed attempt
        triggerShake();
        if (attempts >= 5) { setLockedUntil(Date.now() + 30000); setLoginAttempts(0); return setErr("Too many failed attempts. Please wait 30 seconds."); }
        // Try to distinguish email vs password error. Supabase returns a generic message for security,
        // but we can check if the error mentions "email" specifically.
        const msg = (authErr.message || '').toLowerCase();
        if (msg.includes('email not confirmed') || msg.includes('not confirmed')) return setErr("Please confirm your email first.");
        if (msg.includes('user not found') || msg.includes('no user') || msg.includes('invalid email')) return setErr("Wrong email — no account found.");
        // Default: assume wrong password (most common case when email exists)
        return setErr("Wrong password. Please try again.");
      }
      setLoginAttempts(0); // reset on success

      // Fetch profile
      const { data: profile } = await sb.from('profiles').select('*').eq('id', authData.user.id).single();

      const account = {
        id: authData.user.id,
        email: authData.user.email,
        name: profile?.name || "",
        pronouns: profile?.pronouns || "",
        partnerName: profile?.partner_name || "",
        partnerPronouns: profile?.partner_pronouns || "",
        partnerEmail: profile?.partner_email || "",
        emailOptIn: profile?.email_opt_in || false,
        inviteCode: profile?.invite_code || "",
        partnerJoined: profile?.partner_joined || false,
        pkg: profile?.pkg || "core",
        createdAt: profile?.created_at ? new Date(profile.created_at).getTime() : Date.now(),
      };
      try { localStorage.setItem("attune_account", JSON.stringify(account)); } catch {}

      // Restore exercise answers from Supabase (cross-device support)
      if (profile?.ex1_answers) {
        try { localStorage.setItem('attune_ex1', JSON.stringify(profile.ex1_answers)); } catch {}
      }
      if (profile?.ex2_answers) {
        try { localStorage.setItem('attune_ex2', JSON.stringify(profile.ex2_answers)); } catch {}
      }
      if (profile?.ex3_answers) {
        try { localStorage.setItem('attune_ex3', JSON.stringify(profile.ex3_answers)); } catch {}
      }
      // Restore partner session if partner already completed
      if (profile?.partner_joined && profile?.invite_code) {
        try {
          const psRes = await fetch(`/api/partner-sync?inviteCode=${encodeURIComponent(profile.invite_code)}`);
          const ps = await psRes.json();
          if (ps.found && ps.session) {
            localStorage.setItem('attune_partner_session', JSON.stringify({
              name: ps.session.partner_b_name,
              ex1: ps.session.ex1_answers,
              ex2: ps.session.ex2_answers,
              ex3: ps.session.ex3_answers,
              inviteCode: profile.invite_code,
            }));
          }
        } catch {}
      }

      // Restore order from Supabase so pkg features (budget, LMFT, reflection) work on a new device
      if (!localStorage.getItem('attune_order') && authData.user.email) {
        try {
          const { data: orderRow } = await sb.from('orders')
            .select('pkg_key,addon_lmft,addon_reflection,addon_budget,addon_workbook,is_physical,order_num')
            .eq('buyer_email', authData.user.email)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          if (orderRow) {
            localStorage.setItem('attune_order', JSON.stringify({
              pkgKey:          orderRow.pkg_key,
              addonLmft:       orderRow.addon_lmft || false,
              addonReflection: orderRow.addon_reflection || false,
              addonBudget:     orderRow.addon_budget || false,
              addonWorkbook:   orderRow.addon_workbook || null,
              isPhysical:      orderRow.is_physical || false,
              orderNum:        orderRow.order_num || null,
            }));
          }
        } catch {}
      }
      if (form.partnerEmail.trim()) {
        const inviteUrl = `${window.location.origin}/app?invite=${encodeURIComponent(inviteCode)}&from=${encodeURIComponent(form.name.trim())}&pae=${encodeURIComponent(form.email.trim().toLowerCase())}`;
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'partner_invite',
            fromName: form.name.trim(),
            toEmail: form.partnerEmail.trim(),
            toName: form.partnerName.trim() || 'Your partner',
            inviteUrl,
          }),
        }).catch(() => {});
      }

      setLoading(false);
      onSuccess(account);
      return;
    }

    // ── localStorage fallback ────────────────────────────────────────────────
    try {
      const saved = JSON.parse(localStorage.getItem("attune_account") || "null");
      if (saved && saved.email === form.email.trim().toLowerCase()) {
        setLoading(false);
        onSuccess(saved);
      } else {
        setLoading(false);
        setErr("No account found with that email. Please sign up first.");
      }
    } catch { setLoading(false); setErr("Login failed. Please try again."); }
  };

  const handleReset = async () => {
    if (!form.email.trim() || !form.email.includes("@")) return setErr("Please enter a valid email address.");
    setLoading(true);
    setErr("");

    const { supabase: sb, hasSupabase } = await import('./supabase.js');
    if (hasSupabase()) {
      await sb.auth.resetPasswordForEmail(form.email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/app?reset=1`,
      });
      // Always show success (don't reveal whether the email exists)
    }
    setLoading(false);
    setResetSent(true);
  };

  const inp = (placeholder, key, type = "text", extra = {}) => (
    <input
      type={type}
      placeholder={placeholder}
      value={form[key]}
      onChange={e => { upd(key, e.target.value); setErr(""); }}
      style={{ width: "100%", padding: "0.78rem 1rem", border: `1.5px solid ${err && !form[key] ? "#ef4444" : "#E8DDD0"}`, borderRadius: 11, fontSize: "0.88rem", fontFamily: "'DM Sans', sans-serif", color: "#0E0B07", background: "#FFFDF9", outline: "none", marginBottom: "0.6rem", boxSizing: "border-box" }}
      {...extra}
    />
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 500, display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "center", padding: isMobile ? "0" : "1rem", overflowY: "auto" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <style>{`@keyframes authShake { 0%,100% { transform: translateX(0); } 15% { transform: translateX(-10px); } 30% { transform: translateX(10px); } 45% { transform: translateX(-8px); } 60% { transform: translateX(8px); } 75% { transform: translateX(-4px); } 90% { transform: translateX(4px); } }`}</style>
      <div style={{ background: "#FFFDF9", borderRadius: isMobile ? 0 : 22, padding: isMobile ? "1.5rem 1.25rem 1.25rem" : "2rem 2rem 1.75rem", width: "100%", minHeight: isMobile ? "100vh" : "auto", maxWidth: isMobile ? "none" : 440, boxShadow: isMobile ? "none" : "0 32px 80px rgba(0,0,0,0.28)", position: "relative", animation: shake ? "authShake 0.45s cubic-bezier(.36,.07,.19,.97)" : undefined }}>
        <button onClick={onClose} style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#8C7A68", lineHeight: 1 }}>✕</button>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <svg width="28" height="20" viewBox="0 0 103 76" fill="none"><defs><linearGradient id="am1" x1="0" y1="0" x2="103" y2="76" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#E8673A"/><stop offset="100%" stopColor="#1B5FE8"/></linearGradient></defs><path d="M14,4 L44,4 A9,9 0 0,1 53,13 L53,42 A9,9 0 0,1 44,51 L20,51 L6,61 L11,51 A6,6 0 0,1 5,45 L5,13 A9,9 0 0,1 14,4 Z" fill="url(#am1)"/><path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="white" opacity="0.93" transform="translate(13.16,11.3) scale(0.72)"/><path d="M89,14 L59,14 A9,9 0 0,0 50,23 L50,52 A9,9 0 0,0 59,61 L83,61 L97,71 L92,61 A6,6 0 0,0 98,55 L98,23 A9,9 0 0,0 89,14 Z" fill="white" stroke="url(#am1)" strokeWidth="2.2" strokeLinejoin="round"/><path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="url(#am1)" transform="translate(58.16,21.3) scale(0.72)"/></svg>
          <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.05rem", fontWeight: 700, color: "#0E0B07" }}>Attune</span>
        </div>

        {/* QR-scan welcome banner — shown when user arrived via physical card scan */}
        {qrStatus === 'ok' && qrOrder && (
          <div style={{ background: "#FFF4EC", border: "1px solid #FFD4BF", borderRadius: 10, padding: "0.7rem 0.85rem", marginBottom: "1rem", display: "flex", alignItems: "flex-start", gap: "0.65rem" }}>
            <div style={{ color: "#E8673A", fontSize: "1rem", lineHeight: 1, marginTop: "0.1rem" }}>✦</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.04em", color: "#C45C2A", textTransform: "uppercase", marginBottom: "0.15rem" }}>Welcome</div>
              <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "0.95rem", color: "#2B2218", lineHeight: 1.35 }}>Let's set up your account.</div>
            </div>
          </div>
        )}
        {qrStatus === 'claimed' && qrOrder && (
          <div style={{ background: "#FDF4E7", border: "1px solid #E8DDB8", borderRadius: 10, padding: "0.7rem 0.85rem", marginBottom: "1rem" }}>
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.04em", color: "#8B6F1F", textTransform: "uppercase", marginBottom: "0.2rem" }}>Card already claimed</div>
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: "#5C4A38", lineHeight: 1.45 }}>This card was already linked to an account. If that's you, sign in below. If your partner set it up, you'll get a separate invite by email.</div>
          </div>
        )}
        {qrStatus === 'invalid' && (
          <div style={{ background: "#FDF2F2", border: "1px solid #F3C7C7", borderRadius: 10, padding: "0.7rem 0.85rem", marginBottom: "1rem" }}>
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: "#8B2F2F", lineHeight: 1.45 }}>This QR code isn't recognized. You can still create an account below.</div>
          </div>
        )}

        {/* Tab switcher */}
        <div style={{ display: "flex", background: "#F3EDE6", borderRadius: 10, padding: "0.22rem", marginBottom: "1.5rem" }}>
          {["signup", "login"].map(t => (
            <button key={t} onClick={() => { setTab(t); setErr(""); }}
              style={{ flex: 1, padding: "0.5rem", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", fontWeight: 600, background: tab === t ? "white" : "transparent", color: tab === t ? "#0E0B07" : "#8C7A68", boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s" }}>
              {t === "signup" ? "Create account" : "Sign in"}
            </button>
          ))}
        </div>

        {tab === "signup" ? (
          <>
            <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "1.1rem", fontWeight: 700, color: "#0E0B07", marginBottom: "0.35rem" }}>Start with your account</div>
            <p style={{ fontSize: "0.78rem", color: "#8C7A68", fontFamily: "'DM Sans',sans-serif", marginBottom: "1.25rem", lineHeight: 1.55 }}>Your answers are private until both of you are done. We'll never show your partner what you wrote until results unlock.</p>
            {inp("Your first name", "name")}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0rem" }}>
              {["she/her", "he/him", "they/them"].map(p => (
                <button key={p} onClick={() => upd("pronouns", form.pronouns === p ? "" : p)}
                  style={{ flex: 1, padding: "0.45rem 0.3rem", borderRadius: 8, border: `1.5px solid ${form.pronouns === p ? "#E8673A" : "#E8DDD0"}`, background: form.pronouns === p ? "#FFF0EB" : "white", color: form.pronouns === p ? "#E8673A" : "#8C7A68", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.12s", marginBottom: "0.6rem" }}>
                  {p}
                </button>
              ))}
            </div>
            {inp("Your email", "email", "email")}
            {inp("Choose a password", "password", "password")}
            <div style={{ borderTop: "1px solid #E8DDD0", margin: "0.75rem 0 0.75rem" }} />
            <p style={{ fontSize: "0.75rem", color: "#8C7A68", fontFamily: "'DM Sans',sans-serif", marginBottom: "0.6rem", fontWeight: 600 }}>Your partner — optional now, required before results unlock</p>
            {inp("Partner's first name (optional)", "partnerName")}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0rem" }}>
              {["she/her", "he/him", "they/them"].map(p => (
                <button key={p} onClick={() => upd("partnerPronouns", form.partnerPronouns === p ? "" : p)}
                  style={{ flex: 1, padding: "0.45rem 0.3rem", borderRadius: 8, border: `1.5px solid ${form.partnerPronouns === p ? "#1B5FE8" : "#E8DDD0"}`, background: form.partnerPronouns === p ? "#EEF0FF" : "white", color: form.partnerPronouns === p ? "#1B5FE8" : "#8C7A68", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.12s", marginBottom: "0.6rem" }}>
                  {p}
                </button>
              ))}
            </div>
            {inp("Partner's email — we'll send them an invite (optional)", "partnerEmail", "email")}
            <div style={{ background: "#F3EDE6", borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "0.85rem", display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
              <span style={{ fontSize: "0.82rem", flexShrink: 0 }}>✦</span>
              <p style={{ fontSize: "0.72rem", color: "#8C7A68", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, margin: 0 }}>Attune uses your names and pronouns to personalize your results — making the insights feel specific to you two, not generic.</p>
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", cursor: "pointer", marginBottom: "1.25rem", marginTop: "0.25rem" }}>
              <input type="checkbox" checked={form.emailOptIn} onChange={e => upd("emailOptIn", e.target.checked)}
                style={{ marginTop: "0.2rem", accentColor: "#E8673A", width: 15, height: 15, flexShrink: 0 }} />
              <span style={{ fontSize: "0.72rem", color: "#8C7A68", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.55 }}>
                Send me a 6-month check-in — a reminder to retake Attune when results are most meaningful, plus occasional updates.
              </span>
            </label>
            {err && <p style={{ color: "#ef4444", fontSize: "0.75rem", fontFamily: "'DM Sans',sans-serif", marginBottom: "0.75rem" }}>{err}</p>}
            <button onClick={handleSignup} disabled={loading}
              style={{ width: "100%", padding: "0.9rem", background: "linear-gradient(135deg, #E8673A, #d45a2e)", color: "white", border: "none", borderRadius: 12, fontSize: "0.85rem", fontWeight: 700, cursor: loading ? "default" : "pointer", fontFamily: "'DM Sans',sans-serif", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Creating account…" : "Create account →"}
            </button>
          </>
        ) : tab === "login" ? (
          <>
            <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "1.1rem", fontWeight: 700, color: "#0E0B07", marginBottom: "1.25rem" }}>Welcome back</div>
            {inp("Email", "email", "email")}
            {inp("Password", "password", "password")}
            {err && <p style={{ color: "#ef4444", fontSize: "0.75rem", fontFamily: "'DM Sans',sans-serif", marginBottom: "0.75rem" }}>{err}</p>}
            <button onClick={handleLogin} disabled={loading}
              style={{ width: "100%", padding: "0.9rem", background: "#0E0B07", color: "white", border: "none", borderRadius: 12, fontSize: "0.85rem", fontWeight: 700, cursor: loading ? "default" : "pointer", fontFamily: "'DM Sans',sans-serif", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Signing in…" : "Sign in →"}
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.85rem" }}>
              <p style={{ fontSize: "0.75rem", color: "#8C7A68", fontFamily: "'DM Sans',sans-serif", margin: 0 }}>
                No account yet?{" "}
                <button onClick={() => setTab("signup")} style={{ background: "none", border: "none", color: "#E8673A", fontWeight: 700, cursor: "pointer", fontSize: "0.75rem", fontFamily: "'DM Sans',sans-serif" }}>Create one →</button>
              </p>
              <button onClick={() => { setTab("reset"); setErr(""); setResetSent(false); }} style={{ background: "none", border: "none", color: "#8C7A68", fontSize: "0.72rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textDecoration: "underline" }}>Forgot password?</button>
            </div>
          </>
        ) : tab === "reset" ? (
          <>
            {resetSent ? (
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#E8673A,#1B5FE8)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", fontSize: "1.4rem" }}>✓</div>
                <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "1.1rem", fontWeight: 700, color: "#0E0B07", marginBottom: "0.5rem" }}>Check your inbox</div>
                <p style={{ fontSize: "0.82rem", color: "#8C7A68", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                  If an account exists for <strong style={{ color: "#0E0B07" }}>{form.email}</strong>, we've sent a reset link. It expires in 30 minutes.
                </p>
                <button onClick={() => { setTab("login"); setErr(""); setResetSent(false); }} style={{ background: "none", border: "none", color: "#E8673A", fontWeight: 700, cursor: "pointer", fontSize: "0.78rem", fontFamily: "'DM Sans',sans-serif" }}>← Back to sign in</button>
              </div>
            ) : (
              <>
                <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "1.1rem", fontWeight: 700, color: "#0E0B07", marginBottom: "0.35rem" }}>Reset your password</div>
                <p style={{ fontSize: "0.78rem", color: "#8C7A68", fontFamily: "'DM Sans',sans-serif", marginBottom: "1.25rem", lineHeight: 1.55 }}>Enter the email you used to create your account. We'll send you a link to reset your password.</p>
                {inp("Your email address", "email", "email")}
                {err && <p style={{ color: "#ef4444", fontSize: "0.75rem", fontFamily: "'DM Sans',sans-serif", marginBottom: "0.75rem" }}>{err}</p>}
                <button onClick={handleReset} disabled={loading}
                  style={{ width: "100%", padding: "0.9rem", background: "#0E0B07", color: "white", border: "none", borderRadius: 12, fontSize: "0.85rem", fontWeight: 700, cursor: loading ? "default" : "pointer", fontFamily: "'DM Sans',sans-serif", opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Sending…" : "Send reset link →"}
                </button>
                <p style={{ textAlign: "center", marginTop: "0.85rem", fontSize: "0.75rem", color: "#8C7A68", fontFamily: "'DM Sans',sans-serif" }}>
                  <button onClick={() => { setTab("login"); setErr(""); }} style={{ background: "none", border: "none", color: "#E8673A", fontWeight: 700, cursor: "pointer", fontSize: "0.75rem", fontFamily: "'DM Sans',sans-serif" }}>← Back to sign in</button>
                </p>
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTNER B LANDING SCREEN — shown when opening an invite link with no account
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// NEW PASSWORD SCREEN — shown when user arrives via password reset email link
// ─────────────────────────────────────────────────────────────────────────────
function NewPasswordScreen({ onDone }) {
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [err, setErr] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const handleSubmit = async () => {
    if (password.length < 6) return setErr('Password must be at least 6 characters.');
    if (password !== confirm) return setErr('Passwords do not match.');
    setLoading(true);
    setErr('');
    try {
      const { supabase: sb, hasSupabase } = await import('./supabase.js');
      if (hasSupabase()) {
        const { error } = await sb.auth.updateUser({ password });
        if (error) { setLoading(false); return setErr(error.message); }
      }
      setDone(true);
      setLoading(false);
      setTimeout(onDone, 1800);
    } catch { setLoading(false); setErr('Something went wrong. Please try again.'); }
  };

  const inp = (placeholder, val, onChange, type = 'password') => (
    <input type={type} placeholder={placeholder} value={val} onChange={e => { onChange(e.target.value); setErr(''); }}
      style={{ width: '100%', padding: '0.78rem 1rem', border: `1.5px solid ${err ? '#ef4444' : '#E8DDD0'}`, borderRadius: 11, fontSize: '0.88rem', fontFamily: "'DM Sans', sans-serif", color: '#0E0B07', background: '#FFFDF9', outline: 'none', marginBottom: '0.6rem', boxSizing: 'border-box' }} />
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F3EDE6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.25rem', fontFamily: "'DM Sans', sans-serif" }}>
      <link href={FONT_LINK} rel="stylesheet" />
      <div style={{ background: '#FFFDF9', borderRadius: 22, padding: '2.25rem 2rem', width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.75rem' }}>
          <svg width="28" height="20" viewBox="0 0 103 76" fill="none"><defs><linearGradient id="npg" x1="0" y1="0" x2="103" y2="76" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#E8673A"/><stop offset="100%" stopColor="#1B5FE8"/></linearGradient></defs><path d="M14,4 L44,4 A9,9 0 0,1 53,13 L53,42 A9,9 0 0,1 44,51 L20,51 L6,61 L11,51 A6,6 0 0,1 5,45 L5,13 A9,9 0 0,1 14,4 Z" fill="url(#npg)"/><g transform="translate(13.16,11.3) scale(0.72)"><path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="white" opacity="0.93"/></g></svg>
          <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '0.95rem', fontWeight: 700, color: '#0E0B07' }}>Attune</span>
        </div>
        {done ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.4rem' }}>✓</div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.15rem', fontWeight: 700, color: '#0E0B07', marginBottom: '0.5rem' }}>Password updated.</div>
            <p style={{ fontSize: '0.82rem', color: '#8C7A68', lineHeight: 1.6 }}>Signing you in now…</p>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.15rem', fontWeight: 700, color: '#0E0B07', marginBottom: '0.35rem' }}>Set a new password</div>
            <p style={{ fontSize: '0.78rem', color: '#8C7A68', marginBottom: '1.5rem', lineHeight: 1.55 }}>Choose something you haven't used before.</p>
            {inp('New password', password, setPassword)}
            {inp('Confirm password', confirm, setConfirm)}
            {err && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: '0.75rem' }}>{err}</p>}
            <button onClick={handleSubmit} disabled={loading}
              style={{ width: '100%', padding: '0.9rem', background: 'linear-gradient(135deg,#E8673A,#1B5FE8)', color: 'white', border: 'none', borderRadius: 12, fontSize: '0.85rem', fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif" }}>
              {loading ? 'Saving…' : 'Set password →'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function PartnerLandingScreen({ inviteFrom, inviteCode, onCreateAccount }) {
  const [form, setForm] = React.useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState('');
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    if (!form.name.trim()) return setErr('Please enter your first name.');
    if (!form.email.trim() || !form.email.includes('@')) return setErr('Please enter a valid email.');
    if (!form.password || form.password.length < 6) return setErr('Password must be at least 6 characters.');
    setLoading(true);
    setTimeout(() => {
      const acct = {
        email: form.email.trim().toLowerCase(),
        name: form.name.trim(),
        partnerName: inviteFrom,
        inviteCode: inviteCode,
        isPartnerB: true,
        createdAt: Date.now(),
      };
      try { localStorage.setItem('attune_account', JSON.stringify(acct)); } catch {}
      setLoading(false);
      onCreateAccount(acct);
    }, 600);
  };

  const inp = (placeholder, key, type = 'text') => (
    <input type={type} placeholder={placeholder} value={form[key]}
      onChange={e => { upd(key, e.target.value); setErr(''); }}
      style={{ width: '100%', padding: '0.78rem 1rem', border: '1.5px solid #E8DDD0', borderRadius: 11, fontSize: '0.88rem', fontFamily: "'DM Sans', sans-serif", color: '#0E0B07', background: '#FFFDF9', outline: 'none', marginBottom: '0.6rem', boxSizing: 'border-box' }} />
  );

  return (
    <div style={{ minHeight: '100vh', background: '#1e1a35', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.25rem', fontFamily: "'DM Sans', sans-serif" }}>
      <link href={FONT_LINK} rel="stylesheet" />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem' }}>
        <svg width="32" height="23" viewBox="0 0 103 76" fill="none"><defs><linearGradient id="plg" x1="0" y1="0" x2="103" y2="76" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#E8673A"/><stop offset="100%" stopColor="#1B5FE8"/></linearGradient></defs><path d="M14,4 L44,4 A9,9 0 0,1 53,13 L53,42 A9,9 0 0,1 44,51 L20,51 L6,61 L11,51 A6,6 0 0,1 5,45 L5,13 A9,9 0 0,1 14,4 Z" fill="url(#plg)"/><g transform="translate(13.16,11.3) scale(0.72)"><path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="white" opacity="0.93"/></g><path d="M89,14 L59,14 A9,9 0 0,0 50,23 L50,52 A9,9 0 0,0 59,61 L83,61 L97,71 L92,61 A6,6 0 0,0 98,55 L98,23 A9,9 0 0,0 89,14 Z" fill="white" stroke="url(#plg)" strokeWidth="2.2" strokeLinejoin="round"/><g transform="translate(58.16,21.3) scale(0.72)"><path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="url(#plg)"/></g></svg>
        <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.05rem', fontWeight: 700, color: 'white' }}>Attune</span>
      </div>

      <div style={{ background: '#FFFDF9', borderRadius: 24, padding: '2.25rem 2rem', width: '100%', maxWidth: 420, boxShadow: '0 32px 80px rgba(0,0,0,0.45)' }}>
        {/* Invite badge */}
        <div style={{ background: 'linear-gradient(135deg, rgba(232,103,58,0.07), rgba(27,95,232,0.07))', border: '1.5px solid rgba(232,103,58,0.22)', borderRadius: 14, padding: '1rem 1.2rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #E8673A, #1B5FE8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </div>
          <div>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#E8673A', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>You've been invited</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0E0B07', fontFamily: "'Playfair Display', Georgia, serif", lineHeight: 1.25 }}>{inviteFrom} invited you to take Attune together</div>
          </div>
        </div>

        <p style={{ fontSize: '0.8rem', color: '#8C7A68', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7, marginBottom: '1.5rem' }}>
          Create your account to get started. Your answers stay private until both of you are done — then your results unlock together.
        </p>

        {inp('Your first name', 'name')}
        {inp('Your email', 'email', 'email')}
        {inp('Password (6+ characters)', 'password', 'password')}

        {err && <p style={{ color: '#ef4444', fontSize: '0.75rem', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.75rem' }}>{err}</p>}

        <button onClick={handleSubmit} disabled={loading}
          style={{ width: '100%', padding: '0.9rem', background: 'linear-gradient(135deg, #E8673A, #1B5FE8)', color: 'white', border: 'none', borderRadius: 12, fontSize: '0.85rem', fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s', marginBottom: '0.85rem' }}>
          {loading ? 'Setting up your account…' : 'Start my exercises →'}
        </button>

        <p style={{ fontSize: '0.68rem', color: '#C17F47', textAlign: 'center', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
          Attune uses your names to personalize your results. Your answers are never shared with your partner individually — only as part of your joint results.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTNER B EXERCISE FLOW — clean exercise wrapper for invited partner
// ─────────────────────────────────────────────────────────────────────────────
function PartnerBExerciseFlow({ account, onComplete }) {
  const hasReflection = !!(account?.pkg === 'anniversary' || account?.pkg === 'premium' || account?.addonReflection);
  const [step, setStep] = React.useState('intro'); // 'intro' | 'ex1' | 'ex2' | 'ex3' | 'done'
  const [ex1, setEx1] = React.useState(null);
  const [ex2, setEx2] = React.useState(null);

  const handleEx1Done = (answers) => {
    setEx1(answers);
    setStep('ex2');
  };

  const handleEx2Done = (answers) => {
    setEx2(answers);
    if (hasReflection) {
      setStep('ex3');
    } else {
      submitSession(ex1, answers, null);
    }
  };

  const handleEx3Done = (answers) => {
    submitSession(ex1, ex2, answers);
  };

  const submitSession = async (ex1Answers, ex2Answers, ex3Answers) => {
    const session = {
      inviteCode: account.inviteCode,
      name: account.name,
      ex1: ex1Answers,
      ex2: ex2Answers,
      ...(ex3Answers ? { ex3: ex3Answers } : {}),
      completedAt: Date.now(),
    };
    try { localStorage.setItem('attune_partner_session', JSON.stringify(session)); } catch {}

    // Push to server so Partner A can sync cross-device
    try {
      await fetch('/api/partner-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode:    account.inviteCode,
          partnerBId:    account.id || null,
          partnerBName:  account.name,
          ex1Answers:    ex1Answers,
          ex2Answers:    ex2Answers,
          ...(ex3Answers ? { ex3Answers } : {}),
        }),
      });
    } catch (e) {
      console.warn('[Attune] partner-sync write failed, localStorage only:', e);
    }

    onComplete(session);
  };

  if (step === 'intro') return (
    <div style={{ minHeight: '100vh', background: '#1e1a35', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.25rem' }}>
      <link href={FONT_LINK} rel="stylesheet" />
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(232,103,58,0.8)', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, marginBottom: '1rem' }}>
          Your exercises — {account.name} &amp; {account.partnerName}
        </div>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.6rem, 5vw, 2.4rem)', fontWeight: 700, color: 'white', lineHeight: 1.1, marginBottom: '1.25rem' }}>
          Two exercises.<br/>Your answers are yours alone.
        </div>
        <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.75, marginBottom: '2.5rem', maxWidth: 380, margin: '0 auto 2.5rem' }}>
          Exercise 01 covers how you communicate and connect. Exercise 02 maps your expectations. Both take about 15 minutes. Answer honestly — your partner won't see your individual answers.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
          {[{ num: '01', title: 'Communication', color: '#E8673A', desc: '30 questions · 10 dimensions' }, { num: '02', title: 'Expectations', color: '#1B5FE8', desc: 'Responsibilities & life' }].map(e => (
            <div key={e.num} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${e.color}33`, borderRadius: 14, padding: '1.1rem 1.4rem', textAlign: 'left', minWidth: 160 }}>
              <div style={{ fontSize: '0.58rem', letterSpacing: '0.18em', color: e.color, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', marginBottom: '0.35rem' }}>Exercise {e.num}</div>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>{e.title}</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>{e.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.75rem', textAlign: 'left', maxWidth: 400, margin: '0 auto 1.75rem' }}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, marginBottom: '0.5rem' }}>Before you start</div>
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.65, margin: 0 }}>
            If this is <strong style={{ color: 'white' }}>{account.partnerName}</strong> checking your own partner's view — close this tab. Submitting here will overwrite {account.name}'s results. Each partner uses their own account and their own link.
          </p>
        </div>
        <button onClick={() => setStep('ex1')}
          style={{ background: 'linear-gradient(135deg, #E8673A, #1B5FE8)', color: 'white', border: 'none', borderRadius: 14, padding: '0.9rem 2.5rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.04em' }}>
          Begin Exercise 01 →
        </button>
      </div>
    </div>
  );

  if (step === 'ex1') return (
    <div style={{ minHeight: '100vh', background: C.warm }}>
      <link href={FONT_LINK} rel="stylesheet" />
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '3rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          <svg width="28" height="20" viewBox="0 0 103 76" fill="none"><defs><linearGradient id="bfg1" x1="0" y1="0" x2="103" y2="76" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#E8673A"/><stop offset="100%" stopColor="#1B5FE8"/></linearGradient></defs><path d="M14,4 L44,4 A9,9 0 0,1 53,13 L53,42 A9,9 0 0,1 44,51 L20,51 L6,61 L11,51 A6,6 0 0,1 5,45 L5,13 A9,9 0 0,1 14,4 Z" fill="url(#bfg1)"/><g transform="translate(13.16,11.3) scale(0.72)"><path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="white" opacity="0.93"/></g></svg>
          <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '0.95rem', fontWeight: 700, color: C.ink }}>Attune</span>
          <span style={{ fontSize: '0.68rem', color: C.muted, fontFamily: "'DM Sans', sans-serif", marginLeft: '0.5rem' }}>· Exercise 01 of 02</span>
        </div>
        <Exercise01Flow userName={account.name} partnerName={account.partnerName} onComplete={handleEx1Done} />
      </div>
    </div>
  );

  if (step === 'ex2') return (
    <div style={{ minHeight: '100vh', background: C.warm }}>
      <link href={FONT_LINK} rel="stylesheet" />
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '3rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          <svg width="28" height="20" viewBox="0 0 103 76" fill="none"><defs><linearGradient id="bfg2" x1="0" y1="0" x2="103" y2="76" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#E8673A"/><stop offset="100%" stopColor="#1B5FE8"/></linearGradient></defs><path d="M14,4 L44,4 A9,9 0 0,1 53,13 L53,42 A9,9 0 0,1 44,51 L20,51 L6,61 L11,51 A6,6 0 0,1 5,45 L5,13 A9,9 0 0,1 14,4 Z" fill="url(#bfg2)"/><g transform="translate(13.16,11.3) scale(0.72)"><path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="white" opacity="0.93"/></g></svg>
          <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '0.95rem', fontWeight: 700, color: C.ink }}>Attune</span>
          <span style={{ fontSize: '0.68rem', color: C.muted, fontFamily: "'DM Sans', sans-serif", marginLeft: '0.5rem' }}>· Exercise 02 of 02</span>
        </div>
        <ExpectationsExercise userName={account.name} partnerName={account.partnerName} onComplete={handleEx2Done} />
      </div>
    </div>
  );

  if (step === 'ex3') return (
    <div>
      <div>
        <AnniversaryExercise userName={account.name} partnerName={account.partnerName} onComplete={handleEx3Done} onBack={() => setStep('ex2')} />
      </div>
    </div>
  );

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTNER B COMPLETION SCREEN — exercises done, waiting or ready
// ─────────────────────────────────────────────────────────────────────────────
function PartnerBCompletionScreen({ partnerAName, partnerBName, partnerADone }) {
  return (
    <div style={{ minHeight: '100vh', background: '#1e1a35', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.25rem' }}>
      <link href={FONT_LINK} rel="stylesheet" />
      <div style={{ maxWidth: 460, width: '100%', textAlign: 'center' }}>
        {partnerADone ? (
          <>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.6rem' }}>✓</div>
            <div style={{ fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#10b981', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, marginBottom: '0.85rem' }}>Both exercises complete</div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', fontWeight: 700, color: 'white', lineHeight: 1.15, marginBottom: '1.25rem' }}>
              Your results are ready.
            </div>
            <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.75, marginBottom: '2rem' }}>
              Both you and {partnerAName} have completed your exercises. Open Attune on {partnerAName}'s device to explore your results together.
            </p>
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 14, padding: '1.1rem 1.4rem', display: 'inline-flex', alignItems: 'center', gap: '0.7rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>Results sync automatically when you connect your accounts</span>
            </div>
          </>
        ) : (
          <>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #E8673A33, #1B5FE833)', border: '2px solid rgba(232,103,58,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.8rem' }}>✦</div>
            <div style={{ fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(232,103,58,0.8)', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, marginBottom: '0.85rem' }}>Your exercises are done</div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', fontWeight: 700, color: 'white', lineHeight: 1.15, marginBottom: '1.25rem' }}>
              Waiting for {partnerAName}.
            </div>
            <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.75, marginBottom: '2rem' }}>
              Your answers have been saved. Results will unlock as soon as {partnerAName} finishes their exercises. You'll both see everything at the same time.
            </p>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '1rem 1.4rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {[{ label: partnerBName + "'s exercises", done: true }, { label: partnerAName + "'s exercises", done: false }].map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: s.done ? '#10b981' : 'rgba(255,255,255,0.08)', border: `1.5px solid ${s.done ? '#10b981' : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {s.done ? <span style={{ color: 'white', fontSize: '0.6rem', fontWeight: 700 }}>✓</span> : <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.62rem' }}>{i + 1}</span>}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: s.done ? 'white' : 'rgba(255,255,255,0.35)', fontFamily: "'DM Sans', sans-serif", fontWeight: s.done ? 600 : 400 }}>{s.label}</span>
                    {s.done && <span style={{ fontSize: '0.65rem', color: '#10b981', fontFamily: "'DM Sans', sans-serif", marginLeft: 'auto' }}>Complete</span>}
                    {!s.done && <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', fontFamily: "'DM Sans', sans-serif", marginLeft: 'auto' }}>Pending</span>}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTNER INVITE PANEL — shown on dashboard when partner hasn't joined
// ─────────────────────────────────────────────────────────────────────────────
function PartnerInviteCard({ account, onCopy, copied }) {
  if (!account) return null;
  const inviteUrl = `${window.location.origin}/app?invite=${account.inviteCode}&from=${encodeURIComponent(account.name)}${account.email ? `&pae=${encodeURIComponent(account.email)}` : ''}`;
  const [resent, setResent] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: 'Attune',
        text: `${account.name} invited you to Attune. Set up your profile here:`,
        url: inviteUrl,
      });
    } catch {
      // User cancelled or share unavailable — no-op
    }
  };

  const handleResend = async () => {
    if (!account.partnerEmail || resending || resent) return;
    setResending(true);
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'partner_invite',
          fromName: account.name,
          toEmail: account.partnerEmail,
          toName: account.partnerName || 'Your partner',
          inviteUrl,
        }),
      });
      setResent(true);
    } catch {}
    setResending(false);
  };

  return (
    <div style={{ background: "linear-gradient(135deg, #1B5FE8, #1447b8)", borderRadius: 16, padding: "1.35rem 1.5rem", marginBottom: "1rem", color: "white" }}>
      <div style={{ fontSize: "0.58rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, marginBottom: "0.4rem" }}>
        Invite your partner
      </div>
      <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "white", fontFamily: "'Playfair Display',Georgia,serif", marginBottom: "0.25rem", lineHeight: 1.3 }}>
        {account.partnerName ? `Send this to ${account.partnerName}` : "Share this link with your partner"}
      </p>
      <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.65)", fontFamily: "'DM Sans',sans-serif", marginBottom: "1rem", lineHeight: 1.5 }}>
        They'll create their own account and complete the exercises independently. Results unlock when both of you are done.
      </p>
      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
        <div style={{ flex: 1, background: "rgba(255,255,255,0.12)", borderRadius: 10, padding: "0.55rem 0.85rem", fontSize: "0.68rem", fontFamily: "'DM Sans',sans-serif", color: "rgba(255,255,255,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {inviteUrl}
        </div>
        {canShare ? (
          <button onClick={handleNativeShare}
            style={{ background: "white", color: "#1B5FE8", border: "none", borderRadius: 10, padding: "0.55rem 1rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", flexShrink: 0, display: "flex", alignItems: "center", gap: "0.35rem", minHeight: 44, WebkitTapHighlightColor: "transparent" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            Share
          </button>
        ) : (
          <button onClick={() => onCopy(inviteUrl)}
            style={{ background: copied ? "#10b981" : "white", color: copied ? "white" : "#1B5FE8", border: "none", borderRadius: 10, padding: "0.55rem 1rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", flexShrink: 0, transition: "all 0.2s", minHeight: 44 }}>
            {copied ? "Copied ✓" : "Copy link"}
          </button>
        )}
      </div>
      {account.partnerEmail && (
        <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.45)", fontFamily: "'DM Sans',sans-serif", margin: 0 }}>
            We emailed this link to {account.partnerEmail}
          </p>
          <button onClick={handleResend} disabled={resent || resending}
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "0.3rem 0.65rem", fontSize: "0.65rem", fontWeight: 600, color: resent ? "#10b981" : "rgba(255,255,255,0.7)", cursor: resent ? "default" : "pointer", fontFamily: "'DM Sans',sans-serif", flexShrink: 0, transition: "all 0.2s" }}>
            {resent ? "Sent ✓" : resending ? "Sending…" : "Resend email"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE SETUP PROMPT — big card shown at top of dashboard until profile complete
// ─────────────────────────────────────────────────────────────────────────────
function ProfileSetupPrompt({ account, onSetupProfile }) {
  return (
    <div style={{ background: "linear-gradient(135deg, rgba(232,103,58,0.08), rgba(27,95,232,0.08))", border: "1.5px solid rgba(232,103,58,0.2)", borderRadius: 20, padding: "1.75rem 2rem", marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #E8673A22, #1B5FE822)", border: "1.5px solid rgba(232,103,58,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "1.2rem" }}>
          ✦
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "1.15rem", fontWeight: 700, color: "#0E0B07", marginBottom: "0.35rem" }}>
            Set up your profile to get started
          </div>
          <p style={{ fontSize: "0.82rem", color: "#8C7A68", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.65, marginBottom: "1rem", margin: "0 0 1rem" }}>
            Add your name and your partner's name, then invite them to complete their exercises. Results unlock the moment both of you are done.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", marginBottom: "1.25rem" }}>
            {[
              { done: !!account?.name, label: "Your name added" },
              { done: !!account?.partnerName, label: "Partner's name added" },
              { done: account?.partnerJoined, label: "Partner has joined" },
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: step.done ? "#10b981" : "transparent", border: `1.5px solid ${step.done ? "#10b981" : "#C17F47"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {step.done && <span style={{ color: "white", fontSize: "0.6rem", fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{ fontSize: "0.8rem", color: step.done ? "#0E0B07" : "#8C7A68", fontFamily: "'DM Sans',sans-serif", fontWeight: step.done ? 600 : 400, textDecoration: step.done ? "line-through" : "none" }}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
          <button onClick={onSetupProfile}
            style={{ background: "linear-gradient(135deg, #E8673A, #d45a2e)", color: "white", border: "none", borderRadius: 11, padding: "0.7rem 1.5rem", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
            Complete profile setup →
          </button>
        </div>
      </div>
    </div>
  );
}



// ─────────────────────────────────────────────────────────────────────────────
// UPSELL MODAL — shown when users click workbook/reflection cards post-exercise
// ─────────────────────────────────────────────────────────────────────────────
const UPSELL_PRODUCTS = {
  lmft: {
    badge: "Add-on · Any package",
    badgeColor: "rgba(91,109,248,0.1)",
    badgeText: "#5B6DF8",
    title: "LMFT Session",
    price: "$150",
    tagline: "50 minutes with a licensed therapist, prepared with your results.",
    description: "A licensed marriage and family therapist receives your joint results before your session. They come prepared with context specific to your couple type and the gaps that showed up — no generic intake, no wasted time getting them up to speed. One focused session, no ongoing commitment.",
    includes: [
      "Therapist reviews your results before you meet",
      "50-minute virtual session",
      "Focused on what your specific results surface",
      "No ongoing commitment required",
    ],
    accentColor: "#5B6DF8",
    cartParam: "lmft",
  },
  workbook: {
    badge: "Add-on",
    badgeColor: "#FFF0EB",
    badgeText: "#E8673A",
    title: "Personalized Workbook",
    price: "$19",
    pricePrint: "$39",
    tagline: "Built from your actual results.",
    description: "A guided workbook generated from your specific scores — pre-filled with your gap levels, your three communication priorities, and conversation prompts calibrated to where you and your partner diverge most. Comes as a .docx you can fill in together, or as a printed bound copy shipped to you.",
    includes: [
      "Guided exercises for your top gap dimensions",
      "Conversation prompts specific to your pairing",
      "Expectations discussion guide from your Ex 02 results",
      "Printable or digital — yours to keep",
    ],
    accentColor: "#E8673A",
    variants: [
      { id: "digital", label: "Digital (.docx)", price: "$19" },
      { id: "print", label: "Printed & bound", price: "$39" },
    ],
    cartParam: "workbook",
  },
  reflection: {
    badge: "Relationship Reflection",
    badgeColor: "#EEEFFF",
    badgeText: "#5B6DF8",
    title: "Relationship Reflection",
    price: "$139",
    tagline: "A third exercise about the moments that shaped your relationship.",
    description: "Each of you reflects independently on the moments that defined you, how you're feeling about the relationship right now, and where you want to go. Your answers are shown side by side, with insights drawn from where your reflections converge and where they diverge.",
    includes: [
      "11 reflection questions per person",
      "Side-by-side comparison of your answers",
      "Insights on strengths and areas to explore",
      "Reflection action plan with conversation prompts",
    ],
    accentColor: "#5B6DF8",
    cartParam: "anniversary",
  },
  checklist: {
    badge: "Starting Out Collection",
    badgeColor: "#FFF0EB",
    badgeText: "#E8673A",
    title: "Starting Out Checklist",
    price: "$139",
    tagline: "The real-world logistics of merging your lives.",
    description: "A comprehensive checklist covering the practical steps most couples discover too late: finances, name changes, insurance, estate basics, and the administrative setup of a shared life. Included as part of the Starting Out Collection.",
    includes: [
      "Merging finances and setting up joint accounts",
      "Name change checklist across government and financial",
      "Insurance and benefits setup",
      "Estate basics: wills, proxies, beneficiaries",
    ],
    accentColor: "#E8673A",
    cartParam: "newlywed",
  },
};

function UpsellModal({ product, cartAdded, onAddToCart, onCheckout, onClose }) {
  const p = UPSELL_PRODUCTS[product];
  if (!p) return null;
  const [variant, setVariant] = useState(p.variants?.[0]?.id || null);
  const displayPrice = variant ? (p.variants.find(v => v.id === variant)?.price || p.price) : p.price;

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(14,11,7,0.55)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.25rem", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "white", borderRadius: 22, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(14,11,7,0.22)", position: "relative" }}>
        {/* Header */}
        <div style={{ padding: "1.5rem 1.75rem 1rem", borderBottom: "1px solid #E8DDD0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <div style={{ display: "inline-block", background: p.badgeColor, color: p.badgeText, fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "0.22rem 0.65rem", borderRadius: 999, marginBottom: "0.5rem", fontFamily: BFONT }}>{p.badge}</div>
            <div style={{ fontFamily: HFONT, fontSize: "1.3rem", fontWeight: 700, color: "#0E0B07", lineHeight: 1.15 }}>{p.title}</div>
            <div style={{ fontSize: "0.82rem", color: "#8C7A68", fontFamily: BFONT, marginTop: "0.2rem", fontStyle: "italic" }}>{p.tagline}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#8C7A68", fontSize: "1.3rem", lineHeight: 1, padding: "0.15rem", flexShrink: 0, marginTop: "-0.15rem" }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.25rem 1.75rem" }}>
          <p style={{ fontSize: "0.88rem", color: "#5C4A38", fontFamily: BFONT, fontWeight: 300, lineHeight: 1.75, marginBottom: "1.25rem" }}>{p.description}</p>

          {/* What's included */}
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#8C7A68", fontWeight: 700, fontFamily: BFONT, marginBottom: "0.6rem" }}>What's included</div>
            {p.includes.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start", marginBottom: "0.4rem" }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: p.accentColor + "18", border: "1.5px solid " + p.accentColor + "40", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "0.1rem" }}>
                  <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke={p.accentColor} strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <span style={{ fontSize: "0.8rem", color: "#0E0B07", fontFamily: BFONT, lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Variant selector */}
          {p.variants && !cartAdded && (
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#8C7A68", fontWeight: 700, fontFamily: BFONT, marginBottom: "0.5rem" }}>Format</div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {p.variants.map(v => (
                  <button key={v.id} onClick={() => setVariant(v.id)}
                    style={{ flex: 1, padding: "0.6rem 0.75rem", border: "1.5px solid " + (variant === v.id ? p.accentColor : "#E8DDD0"), background: variant === v.id ? p.accentColor + "0E" : "white", borderRadius: 10, cursor: "pointer", fontFamily: BFONT, transition: "all 0.15s", textAlign: "left" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: variant === v.id ? "#0E0B07" : "#8C7A68" }}>{v.label}</div>
                    <div style={{ fontSize: "0.72rem", color: variant === v.id ? p.accentColor : "#8C7A68", fontWeight: 600 }}>{v.price}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price + CTA */}
          {!cartAdded ? (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", paddingTop: "1.25rem", borderTop: "1px solid #E8DDD0" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: HFONT, fontSize: "1.6rem", fontWeight: 700, color: "#0E0B07", lineHeight: 1 }}>{displayPrice}</div>
                <div style={{ fontSize: "0.62rem", color: "#8C7A68", fontFamily: BFONT, marginTop: "0.2rem" }}>per couple</div>
              </div>
              <button onClick={() => onAddToCart(product, variant)}
                style={{ background: "linear-gradient(135deg," + p.accentColor + ",#d45a2e)", color: "white", border: "none", borderRadius: 12, padding: "0.85rem 1.75rem", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", fontFamily: BFONT, letterSpacing: "0.04em", boxShadow: "0 4px 16px " + p.accentColor + "44" }}>
                Add to cart →
              </button>
            </div>
          ) : (
            <div style={{ paddingTop: "1.25rem", borderTop: "1px solid #E8DDD0" }}>
              <div style={{ background: "#F0FDF4", border: "1.5px solid rgba(16,185,129,0.3)", borderRadius: 12, padding: "0.85rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.85rem" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#065F46", fontFamily: BFONT }}>{p.title} added to cart</span>
              </div>
              <div style={{ display: "flex", gap: "0.65rem" }}>
                <button onClick={onClose}
                  style={{ flex: 1, background: "white", border: "1.5px solid #E8DDD0", color: "#8C7A68", borderRadius: 12, padding: "0.75rem", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: BFONT }}>
                  Keep browsing
                </button>
                <button onClick={onCheckout}
                  style={{ flex: 2, background: "#0E0B07", color: "white", border: "none", borderRadius: 12, padding: "0.75rem", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", fontFamily: BFONT }}>
                  Checkout →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Packages modal — reused styling from UpsellModal
function PackagesModal({ currentPkg, onClose, onPick }) {
  const packages = [
    {
      id: "core",
      name: "The Attune Assessment",
      badge: "The Foundation",
      price: "$89",
      tagline: "Two exercises. One complete picture.",
      description: "How you communicate and what you each expect, independently mapped and jointly revealed.",
      color: "#E8673A",
      features: ["Communication exercise", "Expectations exercise", "Full joint results", "Couple type profile"],
    },
    {
      id: "newlywed",
      name: "Starting Out Collection",
      badge: "For couples starting out",
      price: "$139",
      tagline: "Everything in Assessment + the logistics of merging lives.",
      description: "Adds a bonus budget exercise and a practical checklist for finances, name changes, insurance, and estate basics.",
      color: "#E8673A",
      features: ["Everything in Assessment", "Starting Out checklist", "Build a budget exercise"],
    },
    {
      id: "anniversary",
      name: "Relationship Reflection",
      badge: "For established couples",
      price: "$139",
      tagline: "Everything in Assessment + a third exercise on what shaped you.",
      description: "Reflect on the moments that defined you, what you prioritize, and what you admire in each other.",
      color: "#1B5FE8",
      features: ["Everything in Assessment", "Relationship reflection exercise", "Anniversary-specific prompts"],
    },
    {
      id: "premium",
      name: "Attune Premium",
      badge: "The complete experience",
      price: "$295",
      tagline: "Everything, plus a therapist session built around your results.",
      description: "All three exercises, the budget worksheet, the personalized workbook, and a 50-minute session with a licensed therapist.",
      color: "#3B5BDB",
      features: ["Everything in Assessment", "Both bonus exercises", "LMFT session included", "Personalized workbook"],
    },
  ];

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(14,11,7,0.55)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.25rem", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "white", borderRadius: 22, maxWidth: 640, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(14,11,7,0.22)", position: "relative" }}>
        {/* Header */}
        <div style={{ padding: "1.5rem 1.75rem 1rem", borderBottom: "1px solid #E8DDD0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <div style={{ display: "inline-block", background: "#FFF0EB", color: "#E8673A", fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "0.22rem 0.65rem", borderRadius: 999, marginBottom: "0.5rem", fontFamily: "'DM Sans', sans-serif" }}>Explore packages</div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.3rem", fontWeight: 700, color: "#0E0B07", lineHeight: 1.15 }}>Upgrade your experience</div>
            <div style={{ fontSize: "0.82rem", color: "#8C7A68", fontFamily: "'DM Sans', sans-serif", marginTop: "0.2rem", fontStyle: "italic" }}>Choose the package that fits where you are.</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#8C7A68", fontSize: "1.3rem", lineHeight: 1, padding: "0.15rem", flexShrink: 0, marginTop: "-0.15rem" }}>✕</button>
        </div>

        {/* Packages list */}
        <div style={{ padding: "1.25rem 1.75rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {packages.map(p => {
            const isCurrent = p.id === currentPkg;
            return (
              <div key={p.id}
                style={{ border: "1.5px solid " + (isCurrent ? p.color + "60" : "#E8DDD0"), background: isCurrent ? p.color + "08" : "white", borderRadius: 14, padding: "1rem 1.1rem", display: "flex", alignItems: "flex-start", gap: "1rem", position: "relative" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", flexWrap: "wrap" }}>
                    <div style={{ fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase", color: p.color, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{p.badge}</div>
                    {isCurrent && <div style={{ fontSize: "0.55rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#8C7A68", fontWeight: 700, fontFamily: "'DM Sans', sans-serif", background: "#F3EDE6", padding: "0.15rem 0.5rem", borderRadius: 999 }}>Current</div>}
                  </div>
                  <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.05rem", fontWeight: 700, color: "#0E0B07", lineHeight: 1.15, marginBottom: "0.25rem" }}>{p.name}</div>
                  <div style={{ fontSize: "0.78rem", color: "#5C4A38", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, marginBottom: "0.6rem" }}>{p.description}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem 0.85rem", marginBottom: "0.2rem" }}>
                    {p.features.slice(0, 3).map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={p.color} strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        <span style={{ fontSize: "0.72rem", color: "#3C3C43", fontFamily: "'DM Sans', sans-serif" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem", flexShrink: 0 }}>
                  <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.25rem", fontWeight: 700, color: "#0E0B07", lineHeight: 1 }}>{p.price}</div>
                  {!isCurrent && (
                    <button onClick={() => onPick(p.id)}
                      style={{ background: "linear-gradient(135deg," + p.color + ",#d45a2e)", color: "white", border: "none", borderRadius: 10, padding: "0.55rem 0.9rem", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.03em", whiteSpace: "nowrap" }}>
                      Choose →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer link */}
        <div style={{ padding: "0.85rem 1.75rem 1.5rem", borderTop: "1px solid #E8DDD0", textAlign: "center" }}>
          <a href="/offerings" style={{ fontSize: "0.75rem", fontWeight: 600, color: "#8C7A68", fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>
            See full package details on the offerings page →
          </a>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [toastMsg, setToastMsg] = useState('');
  const [toastTimer, setToastTimer] = useState(null);
  const showToast = (msg) => {
    setToastMsg(msg);
    if (toastTimer) clearTimeout(toastTimer);
    const t = setTimeout(() => setToastMsg(''), 4000);
    setToastTimer(t);
  };
  const [pwaPrompt, setPwaPrompt] = useState(null);
  const [pwaDismissed, setPwaDismissed] = useState(false);
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setPwaPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = () => {
    if (pwaPrompt) { pwaPrompt.prompt(); pwaPrompt.userChoice.then(() => { setPwaPrompt(null); setPwaDismissed(true); }); }
  };
  const params = new URLSearchParams(window.location.search);
  const initialView = params.get("view") || "home";
  // Prefer the real purchase package from localStorage order over URL ?pkg= param
  const _urlPkg = params.get("pkg") || "core";
  const _demoParam = params.get("demo"); // ?demo=anniversary bypasses localStorage
  const _orderPkg = (() => { try { const o = JSON.parse(localStorage.getItem('attune_order') || 'null'); return o?.pkgKey || null; } catch { return null; } })();
  const _accountPkg = (() => { try { const a = JSON.parse(localStorage.getItem('attune_account') || 'null'); return a?.pkg || null; } catch { return null; } })();
  // If demo=1 (generic), use _urlPkg for package; if demo=anniversary etc, use that value
  // Fall back chain: explicit demo param → order localStorage → account.pkg (cross-device) → URL param
  const demoPkg = (_demoParam && _demoParam !== '1') ? _demoParam : (_orderPkg || _accountPkg || _urlPkg);
  const urlInviteCode = params.get("invite");
  const urlInviteFrom = params.get("from") ? decodeURIComponent(params.get("from")) : null;
  const urlIsReset = params.get("reset") === "1";
  // Gift box QR flow params
  const urlIsGift = params.get("gift") === "1";
  const urlGiftP1 = params.get("p1") ? decodeURIComponent(params.get("p1")) : null;
  const urlGiftP2 = params.get("p2") ? decodeURIComponent(params.get("p2")) : null;
  const urlGiftOrder = params.get("order") || null;

  // ── AUTH STATE (localStorage-backed for now, ready for real backend) ──────
  const loadAccount = () => {
    try { return JSON.parse(localStorage.getItem("attune_account") || "null"); } catch { return null; }
  };
  const saveAccount = (acct) => {
    try { localStorage.setItem("attune_account", JSON.stringify(acct)); } catch {}
  };
  const [account, setAccount] = useState(loadAccount);
  // account shape: { email, name, partnerName, partnerEmail, pkg, inviteCode, partnerJoined, emailOptIn, createdAt }

  const isLoggedIn = !!account;
  const profileComplete = !!(account?.name && account?.partnerName);
  // Per-person profile setup: has the user completed the onboarding tile?
  const [profileSetupDone, setProfileSetupDone] = useState(() => {
    try { return localStorage.getItem('attune_profile_setup_done') === '1'; } catch { return false; }
  });
  const completeProfileSetup = () => {
    setProfileSetupDone(true);
    try { localStorage.setItem('attune_profile_setup_done', '1'); } catch {}
    // Persist to Supabase
    if (account?.id) {
      import('./supabase.js').then(({ supabase: sb, hasSupabase }) => {
        if (hasSupabase()) sb.from('profiles').update({ profile_setup_complete: true }).eq('id', account.id).catch(() => {});
      }).catch(() => {});
    }
  };

  // ── VIEW STATE ────────────────────────────────────────────────────────────
  const [view, setView] = useState(initialView);

  // ── SCROLL TO TOP ON VIEW CHANGE ─────────────────────────────────────────
  useLayoutEffect(() => {
    if (view === "results") return;
    // Unfix body first (handles navigation away from results which fixes body)
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.width = "";
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);
    // rAF backup for browsers with scroll anchoring
    requestAnimationFrame(() => { window.scrollTo(0, 0); });
  }, [view]);
  const [activeResult, setActiveResult] = useState("overview");
  const [highlightsSeen, setHighlightsSeen] = useState(false);
  const isMobile = useMobile(680);

  // Lock body scroll when results are shown (prevents mobile page drift)
  // Lock outer scroll when in results view
  useEffect(() => {
    if (view === 'results' && highlightsSeen) {
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
    }
    return () => { document.documentElement.style.overflow = ''; };
  }, [view, highlightsSeen]);

  useEffect(() => {
    if (view === 'results' && highlightsSeen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [view, highlightsSeen]);

  // ── Warn before closing mid-exercise ────────────────────────────────────────
  useEffect(() => {
    const inExercise = view === "exercise1" || view === "exercise2" || view === "exercise3";
    if (!inExercise) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [view]);

  // ── Fire results_viewed email once after highlights are seen ─────────────
  useEffect(() => {
    if (!highlightsSeen) return;
    if (!isLoggedIn || !account?.email) return;
    const fired = localStorage.getItem('attune_results_email_sent');
    if (fired) return;
    localStorage.setItem('attune_results_email_sent', '1');
    fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'results_viewed',
            userId: account?.id || null,
        toEmail: account.email,
        toName: account.name || '',
        partnerName: account.partnerName || '',
        coupleType: coupleType?.name || '',
        portalUrl: window.location.origin + '/app',
        hasReflection: pkg.hasAnniversary,
        hasBudget: pkg.hasBudget,
        hasLMFT: pkg.hasLMFT,
      }),
    }).catch(() => {});
  }, [highlightsSeen]);

  const go = (newView) => {
    if (newView !== "results") setHighlightsSeen(false);
    setView(newView);
  };
  const userName = account?.name || "Sarah";
  const partnerName = account?.partnerName || "James";
  const userPronouns = account?.pronouns || "";
  const partnerPronouns = account?.partnerPronouns || "";
  // interp for App-level use (e.g. couple type patterns in demo)
  const interp = (str) => str
    .replace(/\{U\}/g, userName).replace(/\{P\}/g, partnerName)
    .replace(/\{U_sub\}/g, pronoun(userPronouns, "sub")).replace(/\{U_obj\}/g, pronoun(userPronouns, "obj")).replace(/\{U_pos\}/g, pronoun(userPronouns, "pos"))
    .replace(/\{P_sub\}/g, pronoun(partnerPronouns, "sub")).replace(/\{P_obj\}/g, pronoun(partnerPronouns, "obj")).replace(/\{P_pos\}/g, pronoun(partnerPronouns, "pos"));

  // Sarah's pre-populated answers (8 dimensions, 5 questions each)
  const sarahEx1 = {
    en1:2,
    en2:2,
    en3:1,
    en4:2,
    en5:2,
    ex1:4,
    ex2:4,
    ex3:4,
    ex4:3,
    ex5:4,
    nd1:2,
    nd2:2,
    nd3:2,
    nd4:2,
    nd5:2,
    bd1:4,
    bd2:4,
    bd3:4,
    bd4:4,
    bd5:4,
    cf1:1,
    cf2:1,
    cf3:1,
    cf4:1,
    cf5:1,
    rp1:2,
    rp2:2,
    rp3:1,
    rp4:2,
    rp5:1,
    cl1:4,
    cl2:4,
    cl3:4,
    cl4:4,
    cl5:4,
    lv1:1,
    lv2:1,
    lv3:1,
    lv4:1,
    lv5:1,
    st1:5,
    st2:5,
    st3:5,
    st4:4,
    st5:5,
    fb1:4,
    fb2:4,
    fb3:4,
    fb4:4,
    fb5:4,
  };
  const sarahEx2 = {
    childhoodStructure: "mom-dad",
    childhood: {
      "household__Cooking meals": "Mom",
      "household__Grocery shopping and meal planning": "Mom",
      "household__Keeping the home tidy day-to-day": "Mom",
      "household__Managing home repairs and maintenance": "Dad",
      "household__Managing the family calendar": "Mom",
      "household__Planning and organizing social events, holidays, and gatherings": "Mom",
      "household__Planning and booking vacations": "Both",
      "financial__Paying bills and managing day-to-day finances": "Dad",
      "financial__Making major financial decisions": "Dad",
      "financial__Managing savings and investments": "Dad",
      "financial__Filing taxes": "Dad",
      "career__Being the primary income earner": "Dad",
      "career__Whose career shapes major family decisions, where you live, your schedule, your lifestyle": "Dad",
      "career__Who makes career sacrifices when the family needs it": "Mom",
      "emotional__Carrying the mental load, remembering, anticipating, planning ahead": "Mom",
      "emotional__Tracking the emotional wellbeing of the household": "Mom",
      "emotional__Maintaining closeness and emotional intimacy over time": "Mom",
      "emotional__Initiating difficult conversations": "Mom",
      "emotional__Being the first to reach out after conflict": "Mom",
      "emotional__Maintaining relationships with extended family and in-laws": "Mom",
    },
    responsibilities: {
      "household__Grocery shopping and meal planning": "Sarah",
      "household__Keeping the home tidy day-to-day": "Both of us",
      "household__Managing home repairs and maintenance": "James",
      "household__Managing the family calendar": "Sarah",
      "household__Planning and organizing social events, holidays, and gatherings": "Sarah",
      "household__Planning and booking vacations": "Both of us",
      "financial__Paying bills and managing day-to-day finances": "James",
      "financial__Making major financial decisions": "Both of us",
      "financial__Managing savings and investments": "James",
      "financial__Filing taxes": "James",
      "career__Being the primary income earner": "Both of us",
      "career__Whose career shapes major family decisions, where you live, your schedule, your lifestyle": "Both of us",
      "career__Who makes career sacrifices when the family needs it": "Both of us",
      "emotional__Carrying the mental load, remembering, anticipating, planning ahead": "Sarah",
      "emotional__Tracking the emotional wellbeing of the household": "Sarah",
      "emotional__Maintaining closeness and emotional intimacy over time": "Both of us",
      "emotional__Initiating difficult conversations": "Both of us",
      "emotional__Being the first to reach out after conflict": "Sarah",
      "emotional__Maintaining relationships with extended family and in-laws": "Sarah",
    },
    life: {
      lq_children: "Important to me, I want at least one",
      lq_parents: "I'd offer meaningful support but expect them to maintain their own lives",
      lq_family_conf: "Side with my partner, they're my primary family now",
      lq_location: "I have a preference but I'm open to discussion",
      lq_social: "A healthy balance of time together and time with others",
      lq_routine: "Prefers a loose rhythm but likes knowing the plan",
      lq_faith: "Is personal to me but wouldn't shape our shared life",
      lq_values: "Share broadly similar values even if the details differ",
      lq_finances: "Mostly combined with some personal spending money for each of us",
      lq_money_lean: "Toward saving, but you live well along the way",
      lq_money_risk: "I'm cautious but open to calculated risks",
      lq_conflict_when: "Bring it up soon, but give yourself a moment to collect your thoughts first",
      lq_conflict_after: "You've had a little space but come back together the same day",
      lq_conflict_repair: "Feeling the warmth return, actions matter more than words to you",
      lq_affection: "Is very important to you and you'd notice its absence",
      lq_closeness: "Goes up significantly, difficulty makes you want more closeness",
      lq_independence: "Is important but you're happy for it to flex around your shared life",
    }
  };
  const jamesEx1 = {
    en1:4,
    en2:4,
    en3:4,
    en4:4,
    en5:4,
    ex1:2,
    ex2:2,
    ex3:2,
    ex4:2,
    ex5:2,
    nd1:4,
    nd2:4,
    nd3:4,
    nd4:4,
    nd5:4,
    bd1:2,
    bd2:2,
    bd3:2,
    bd4:2,
    bd5:2,
    cf1:5,
    cf2:5,
    cf3:5,
    cf4:5,
    cf5:5,
    rp1:4,
    rp2:4,
    rp3:4,
    rp4:4,
    rp5:4,
    cl1:2,
    cl2:2,
    cl3:2,
    cl4:2,
    cl5:2,
    lv1:5,
    lv2:5,
    lv3:5,
    lv4:5,
    lv5:5,
    st1:1,
    st2:1,
    st3:1,
    st4:1,
    st5:1,
    fb1:2,
    fb2:2,
    fb3:2,
    fb4:2,
    fb5:2
  };

  const jamesEx2 = {
    childhoodStructure: "mom-dad",
    childhood: {
      "household__Cooking meals": "Mom",
      "household__Grocery shopping and meal planning": "Mom",
      "household__Keeping the home tidy day-to-day": "Mom",
      "household__Managing home repairs and maintenance": "Dad",
      "household__Managing the family calendar": "Mom",
      "household__Planning and organizing social events, holidays, and gatherings": "Both",
      "household__Planning and booking vacations": "Dad",
      "financial__Paying bills and managing day-to-day finances": "Dad",
      "financial__Making major financial decisions": "Dad",
      "financial__Managing savings and investments": "Dad",
      "financial__Filing taxes": "Dad",
      "career__Being the primary income earner": "Dad",
      "career__Whose career shapes major family decisions, where you live, your schedule, your lifestyle": "Dad",
      "career__Who makes career sacrifices when the family needs it": "Mom",
      "emotional__Carrying the mental load, remembering, anticipating, planning ahead": "Mom",
      "emotional__Tracking the emotional wellbeing of the household": "Mom",
      "emotional__Maintaining closeness and emotional intimacy over time": "Mom",
      "emotional__Initiating difficult conversations": "Dad",
      "emotional__Being the first to reach out after conflict": "Dad",
      "emotional__Maintaining relationships with extended family and in-laws": "Mom",
    },
    responsibilities: {
      "household__Cooking meals": "Sarah",
      "household__Grocery shopping and meal planning": "Both of us",
      "household__Keeping the home tidy day-to-day": "Both of us",
      "household__Managing home repairs and maintenance": "James",
      "household__Managing the family calendar": "Both of us",
      "household__Planning and organizing social events, holidays, and gatherings": "Both of us",
      "household__Planning and booking vacations": "James",
      "financial__Paying bills and managing day-to-day finances": "Both of us",
      "financial__Making major financial decisions": "Both of us",
      "financial__Managing savings and investments": "Both of us",
      "financial__Filing taxes": "Both of us",
      "career__Being the primary income earner": "Both of us",
      "career__Whose career shapes major family decisions, where you live, your schedule, your lifestyle": "James",
      "career__Who makes career sacrifices when the family needs it": "Both of us",
      "emotional__Carrying the mental load, remembering, anticipating, planning ahead": "Both of us",
      "emotional__Tracking the emotional wellbeing of the household": "Both of us",
      "emotional__Maintaining closeness and emotional intimacy over time": "Both of us",
      "emotional__Initiating difficult conversations": "Both of us",
      "emotional__Being the first to reach out after conflict": "James",
      "emotional__Maintaining relationships with extended family and in-laws": "Both of us",
    },
    life: {
      lq_children: "Important to me, I want at least one",
      lq_parents: "They're independent, I'd help in a crisis but don't expect to be heavily involved",
      lq_family_conf: "Mediate fairly, I won't automatically take either side",
      lq_location: "I'd go wherever makes the most sense for us as a unit",
      lq_social: "Quiet by default with room for social when we choose it",
      lq_routine: "Needs a lot of structure and routine to feel grounded",
      lq_faith: "Plays no role, it's not part of how I live",
      lq_values: "Share broadly similar values even if the details differ",
      lq_finances: "Mostly combined with some personal spending money for each of us",
      lq_money_lean: "Neither way strongly, it depends on the situation",
      lq_money_risk: "I'm comfortable with risk if we've thought it through together",
      lq_conflict_when: "Take significant space before you're ready to talk",
      lq_conflict_after: "You need a night or two before you feel ready",
      lq_conflict_repair: "Moving forward together, you don't need a formal repair, just to feel okay again",
      lq_affection: "Is nice but not something you track or need consistently",
      lq_closeness: "Goes down, you tend to pull inward and need space to process",
      lq_independence: "Matters enormously to you, you need a strong sense of your own life within the relationship",
    }
  };
  // Demo: start with pre-populated answers to show results immediately.
  // In production, these would be null until the user completes each exercise.
  // Demo pre-populated Sarah answers so all exercises and Results are accessible
  const sarahEx1Demo = sarahEx1;
  const sarahEx2Demo = {
    childhoodStructure: sarahEx2.childhoodStructure,
    childhood: sarahEx2.childhood,
    responsibilities: sarahEx2.responsibilities,
    life: sarahEx2.life,
  };
  // In demo mode for anniversary/premium packages, pre-populate ex3 so the full
  // reflection experience (8-card highlights + reflection results sections) is visible.
  // Users can still retake the exercise from the exercise tile.
  // Fix: use _demoParam and demoPkg directly (available here) instead of isDemo/_basePkg (defined later)
  const sarahEx3Demo = _demoParam && (demoPkg === 'anniversary' || demoPkg === 'premium') ? SARAH_ANNIVERSARY_DEMO : null;
  const [ex1Answers, setEx1State] = useState(sarahEx1Demo);
  const [ex2Answers, setEx2State] = useState(sarahEx2Demo);
  const [ex3Answers, setEx3State] = useState(sarahEx3Demo); // Anniversary exercise
  const [checklistState, setChecklistState] = useState({}); // Starting Out checklist
  const [budgetState, setBudgetState] = useState(null); // Premium budget tool
  const [notesState, setNotesState] = useState({ partner1: "", partner2: "", shared: "" }); // Conversation notes
  // Auto-open auth if ?signup=1 in URL (comes from checkout success redirect)
  const _urlSignup = params.get('signup') === '1';
  const _urlSignin = params.get('signin') === '1';
  const [showAuth, setShowAuth] = useState(!isLoggedIn && (_urlSignup || _urlSignin)); // Auth modal
  const [authMode, setAuthMode] = useState(_urlSignin ? "login" : "signup"); // "signup" | "login"
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showNavDropdown, setShowNavDropdown] = useState(false); // Profile nav dropdown
  const [mobileNavOpen, setMobileNavOpen] = useState(false); // Mobile hamburger nav
  const [inviteCopied, setInviteCopied] = useState(false);
  const [upsellModal, setUpsellModal] = useState(null); // { product: 'workbook'|'reflection'|'checklist', cartAdded: false }
  const [showPackagesModal, setShowPackagesModal] = useState(false); // "Explore other packages" modal
  // Load order record from localStorage (written by checkout on purchase)
  const [order, setOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem('attune_order') || 'null'); } catch { return null; }
  });
  const hasWorkbookOrder = order?.addonWorkbook != null; // 'digital' | 'print'
  const isWorkbookPrint  = order?.addonWorkbook === 'print';
  // Workbook notification: show prominent tile when workbook is generated
  const [workbookNotifSeen, setWorkbookNotifSeen] = useState(() => {
    try { return localStorage.getItem('attune_workbook_notif_seen') === '1'; } catch { return false; }
  });
  const [workbookReady,  setWorkbookReady]  = useState(() => {
    try { return localStorage.getItem('attune_workbook_ready') === 'true'; } catch { return false; }
  });
  const [workbookBuilding, setWorkbookBuilding] = useState(false);

  const [couplePortrait, setCouplePortrait] = useState(() => {
    try { const s = localStorage.getItem("attune_portrait"); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [showPortraitSetup, setShowPortraitSetup] = useState(false);
  const savePortrait = (p) => { setCouplePortrait(p); try { localStorage.setItem("attune_portrait", JSON.stringify(p)); } catch {} setShowPortraitSetup(false); };

  // ── PARTNER SESSION — real Partner B data when invite is completed ─────────
  const [partnerSession, setPartnerSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('attune_partner_session') || 'null'); } catch { return null; }
  });
  // True during the initial partner-sync fetch on mount — prevents flicker of stale "waiting" card
  const [partnerSyncing, setPartnerSyncing] = useState(false);
  const savePartnerSession = (s) => {
    setPartnerSession(s);
    try { localStorage.setItem('attune_partner_session', JSON.stringify(s)); } catch {}
    if (account) {
      const updated = { ...account, partnerJoined: true };
      setAccount(updated);
      try { localStorage.setItem('attune_account', JSON.stringify(updated)); } catch {}
      // Notify Partner A that their partner has joined
      if (account.email && account.emailOptIn !== false) {
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'partner_joined_notification',
            userId: account?.id || null,
            toEmail: account.email,
            toName: account.name,
            partnerName: s?.name || account.partnerName || 'Your partner',
            portalUrl: `${window.location.origin}/app`,
          }),
        }).catch(() => {});
      }
    }
    // ── Update attune_live_session with real Partner B scores ─────────────
    // If Partner A already viewed results (and wrote demo partner data to
    // attune_live_session), overwrite partnerScores and expGaps now that
    // real Partner B data has arrived. This ensures admin workbook generation
    // and auto-fulfillment both use real data even if Partner B finished late.
    try {
      const existing = JSON.parse(localStorage.getItem('attune_live_session') || 'null');
      if (existing && s?.ex1 && s?.ex2) {
        const realPartnerScores = calcDimScores(s.ex1);
        const EXP_LIFE_KEYS = [
          { key: 'household', label: 'Visible Household Labor' },
          { key: 'emotional', label: 'Emotional & Invisible Labor' },
          { key: 'financial', label: 'Financial & Money' },
          { key: 'career',    label: 'Career' },
          { key: 'children',  label: 'Children & Family' },
          { key: 'lifestyle', label: 'Home & Lifestyle' },
        ];
        const realExpGaps = EXP_LIFE_KEYS.map(({ key, label }) => {
          const yourAns    = existing.expGaps?.find(g => g.key === key)?.yourAnswer || null;
          const partnerAns = s.ex2?.life?.['lq_' + key] || null;
          return { key, label, yourAnswer: yourAns, partnerAnswer: partnerAns, aligned: yourAns === partnerAns };
        });
        localStorage.setItem('attune_live_session', JSON.stringify({
          ...existing,
          partnerScores: realPartnerScores,
          expGaps: realExpGaps,
          partnerName: s.name || existing.partnerName,
          partnerDataReal: true,
          partnerDataArrivedAt: Date.now(),
        }));
      }
    } catch (_) {}
    // ── Re-trigger workbook auto-generation if it was queued but used demo data ──
    // If the order had addonWorkbook and the workbook was generated before Partner B
    // finished, regenerate it now with real partner scores.
    try {
      const ord = JSON.parse(localStorage.getItem('attune_order') || 'null');
      const liveSession = JSON.parse(localStorage.getItem('attune_live_session') || 'null');
      if (ord?.addonWorkbook === 'digital' && liveSession?.partnerDataReal) {
        // Clear the existing workbook so it regenerates on next results view
        localStorage.removeItem('attune_workbook_blob');
        localStorage.removeItem('attune_workbook_ready');
        ord.workbookStatus = null;
        localStorage.setItem('attune_order', JSON.stringify(ord));
      }
    } catch (_) {}
  };

  // ── Cross-device partner sync polling ────────────────────────────────────
  // If Partner A is logged in, has an inviteCode, and doesn't yet have real
  // partner data, poll /api/partner-sync every 15s to check if Partner B finished.
  useEffect(() => {
    const code = account?.inviteCode;
    if (!code || hasRealPartner || account?.isPartnerB) return;
    let cancelled = false;
    let isFirst = true;

    const poll = async () => {
      if (isFirst) setPartnerSyncing(true);
      try {
        const res = await fetch(`/api/partner-sync?inviteCode=${encodeURIComponent(code)}`);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (json.found && json.session?.ex1_answers && json.session?.ex2_answers) {
          const s = {
            inviteCode: code,
            name: json.session.partner_b_name,
            ex1: json.session.ex1_answers,
            ex2: json.session.ex2_answers,
            ...(json.session.ex3_answers ? { ex3: json.session.ex3_answers } : {}),
            completedAt: json.session.completed_at,
          };
          if (!cancelled) savePartnerSession(s);
        }
      } catch {}
      finally {
        if (isFirst && !cancelled) { setPartnerSyncing(false); isFirst = false; }
      }
    };

    poll(); // immediate check on mount
    const interval = setInterval(poll, 15000); // then every 15s
    return () => { cancelled = true; clearInterval(interval); };
  }, [account?.inviteCode, account?.isPartnerB]);

  // ── 6-month check-in email ───────────────────────────────────────────────
  // Fires once, client-side, when the user returns 6+ months after signup.
  useEffect(() => {
    if (!account?.email || !account?.createdAt) return;
    const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;
    const alreadySent = localStorage.getItem('attune_6mo_sent');
    if (alreadySent) return;
    const age = Date.now() - account.createdAt;
    if (age < SIX_MONTHS_MS) return;
    localStorage.setItem('attune_6mo_sent', '1');
    fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'checkin_6mo', toEmail: account.email, toName: account.name || '', partnerName: account.partnerName || '', retakeUrl: window.location.origin + '/app?signin=1' }),
    }).catch(() => {});
  }, [account?.email]);

  const hasRealPartner = !!(partnerSession?.inviteCode === account?.inviteCode && partnerSession?.ex1 && partnerSession?.ex2);
  const partnerEx1 = hasRealPartner ? partnerSession.ex1 : jamesEx1;
  const partnerEx2 = hasRealPartner ? partnerSession.ex2 : jamesEx2;
  // bothDone: local exercises complete AND partner has submitted real answers (not just joined)
  const isDemo = !!_demoParam; // true when ?demo=xxx is in URL
  const bothDone = !!(ex1Answers && ex2Answers && (isDemo || hasRealPartner || account?.partnerJoined));
  // Package config
  const pkgConfig = {
    core:        { label: "The Attune Assessment",     color: "#E8673A", hasChecklist: false, hasAnniversary: false, hasBudget: false, hasLMFT: false },
    newlywed:    { label: "Starting Out Collection",   color: "#E8673A", hasChecklist: true,  hasAnniversary: false, hasBudget: true,  hasLMFT: false },
    anniversary: { label: "Relationship Reflection",    color: "#1B5FE8", hasChecklist: false, hasAnniversary: true,  hasBudget: false, hasLMFT: false },
    premium:     { label: "Attune Premium",            color: "#3B5BDB", hasChecklist: false, hasAnniversary: true,  hasBudget: true,  hasLMFT: true  },
  };
  // Merge add-on flags from stored order (e.g. LMFT add-on on non-premium packages)
  const _basePkg = pkgConfig[demoPkg] || pkgConfig.core;
  const pkg = {
    ..._basePkg,
    hasLMFT:        _basePkg.hasLMFT        || !!(order?.addonLmft),
    hasAnniversary: _basePkg.hasAnniversary || !!(order?.addonReflection),
    hasBudget:      _basePkg.hasBudget      || !!(order?.addonBudget),
  };

  // ── PASSWORD RESET ROUTING ────────────────────────────────────────────────
  // Supabase sends user back to /app?reset=1 with a token in the URL hash.
  // Supabase client detects the hash and establishes a session automatically.
  if (urlIsReset) {
    return <NewPasswordScreen onDone={() => {
      // Strip the reset param and reload the app into normal dashboard state
      window.history.replaceState({}, '', '/app');
      window.location.reload();
    }} />;
  }

  // ── GIFT BOX QR ROUTING ──────────────────────────────────────────────────
  // When someone scans a QR card from a physical box: ?gift=1&p1=Sarah&p2=James&order=ATT-xxx
  if (urlIsGift && urlGiftP1 && !account) {
    return <GiftLandingScreen
      p1={urlGiftP1}
      p2={urlGiftP2}
      pkg={_urlPkg}
      orderId={urlGiftOrder}
      onCreateAccount={(acct) => { setAccount(acct); saveAccount(acct); }}
    />;
  }

  // ── PARTNER B INVITE ROUTING ─────────────────────────────────────────────
  // Case 1: URL has ?invite= and no account yet → show partner landing/signup
  if (urlInviteCode && !account) {
    return <PartnerLandingScreen
      inviteFrom={urlInviteFrom || "Your partner"}
      inviteCode={urlInviteCode}
      onCreateAccount={(acct) => { setAccount(acct); saveAccount(acct); }}
    />;
  }
  // Case 2: Account exists, is Partner B, exercises not yet done → exercise flow
  if (account?.isPartnerB && !partnerSession) {
    return <PartnerBExerciseFlow
      account={account}
      onComplete={(session) => savePartnerSession(session)}
    />;
  }
  // Case 3: Partner B has completed exercises → waiting/ready screen
  // Poll partner-sync to check if Partner A has also completed theirs
  const [partnerADone, setPartnerADone] = useState(false);
  useEffect(() => {
    if (!account?.isPartnerB || !partnerSession || hasRealPartner) return;
    const code = account.inviteCode || partnerSession?.inviteCode;
    if (!code) return;
    const check = async () => {
      try {
        const res = await fetch(`/api/partner-sync?inviteCode=${encodeURIComponent(code)}`);
        const d = await res.json();
        if (d.found && d.session?.ex1_answers) setPartnerADone(true);
      } catch {}
    };
    check();
    const iv = setInterval(check, 15000); // poll every 15s
    return () => clearInterval(iv);
  }, [account?.isPartnerB, partnerSession, hasRealPartner]);

  if (account?.isPartnerB && partnerSession && !hasRealPartner) {
    return <PartnerBCompletionScreen
      partnerAName={account.partnerName}
      partnerBName={account.name}
      partnerADone={partnerADone}
    />;
  }
  // ── END PARTNER B ROUTING ─────────────────────────────────────────────────

  return (
    <>
    <div data-main-scroll style={{ minHeight: "100vh", background: view === "home" ? "#FBF8F3" : C.warm, fontFamily: font.body }}>
      {toastMsg && (
        <div style={{position:'fixed',bottom:'1.5rem',left:'50%',transform:'translateX(-50%)',background:'#1E1610',color:'white',padding:'.75rem 1.5rem',borderRadius:'10px',fontSize:'.85rem',fontWeight:500,zIndex:9999,boxShadow:'0 8px 32px rgba(0,0,0,.25)',pointerEvents:'none',whiteSpace:'nowrap'}}>
          {toastMsg}
        </div>
      )}
      <link href={FONT_LINK} rel="stylesheet" />
      <style>{`
        @media(max-width:680px){
          /* Results sidebar → mobile tabs */
          .desktop-sidebar{display:none!important}
          .mobile-tabs{display:block!important}
          /* Exercise flow */
          [style*="gridTemplateColumns: \"1fr 1fr\""]{ grid-template-columns:1fr!important }
          [style*="gridTemplateColumns:\"1fr 1fr\""]{ grid-template-columns:1fr!important }
          /* Scale questions */
          [style*="1.8fr 1fr 1fr"]{ grid-template-columns:1fr!important }
          /* General padding reduction */
          [style*="padding: \"4rem"]{padding:2rem 1.25rem!important}
          [style*="padding: \"3rem 2.5rem"]{padding:2rem 1.25rem!important}
          /* Prevent browser scroll anchoring fighting scroll-to-top */
          html, body { overflow-anchor: none; }
          /* Account page: reduce padding on mobile */
          [style*="padding: \"3rem 2rem\""] { padding: 1.5rem 1.25rem !important; }
        }
      `}</style>
      {/* Top Nav — on mobile non-home/non-results: full gradient banner with ← Dashboard folded in */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: (isMobile && view !== "home" && view !== "results") ? "linear-gradient(120deg, #C8522E 0%, #6B3FA0 52%, #1B5FE8 100%)" : view === "home" ? "rgba(30,26,53,0.97)" : "rgba(255,253,249,0.97)", backdropFilter: (isMobile && view !== "home" && view !== "results") ? "none" : "blur(12px)", borderBottom: ("1px solid " + (view === "home" ? "rgba(255,255,255,0.1)" : (isMobile && view !== "results") ? "transparent" : C.stone)), padding: (isMobile && view !== "home" && view !== "results") ? "0.7rem 1.25rem 0.6rem" : "0 1.5rem", display: view === "home" ? "none" : "flex", flexDirection: (isMobile && view !== "results") ? "column" : "row", alignItems: (isMobile && view !== "results") ? "stretch" : "center", justifyContent: "space-between", minHeight: 56 }}>
        {/* Single row: logo left + auth right */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div onClick={() => setView('home')} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            {(isMobile && view !== "results") ? (
              /* White logo mark for gradient background */
              <svg width="28" height="20" viewBox="0 0 103 76" fill="none">
                <defs><linearGradient id="mobileNavGrad" x1="0" y1="0" x2="103" y2="76" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="rgba(255,255,255,.92)"/><stop offset="100%" stopColor="rgba(255,255,255,.75)"/></linearGradient></defs>
                <path d="M14,4 L44,4 A9,9 0 0,1 53,13 L53,42 A9,9 0 0,1 44,51 L20,51 L6,61 L11,51 A6,6 0 0,1 5,45 L5,13 A9,9 0 0,1 14,4 Z" fill="url(#mobileNavGrad)"/>
                <path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="rgba(90,40,150,.6)" transform="translate(13.16,11.3) scale(0.72)"/>
                <path d="M89,14 L59,14 A9,9 0 0,0 50,23 L50,52 A9,9 0 0,0 59,61 L83,61 L97,71 L92,61 A6,6 0 0,0 98,55 L98,23 A9,9 0 0,0 89,14 Z" fill="white" stroke="url(#mobileNavGrad)" strokeWidth="2.2" strokeLinejoin="round"/>
                <path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="url(#mobileNavGrad)" transform="translate(58.16,21.3) scale(0.72)"/>
              </svg>
            ) : (
              <svg width="36" height="26" viewBox="0 0 103 76" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs><linearGradient id="appNavGrad" x1="0" y1="0" x2="103" y2="76" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#E8673A"/><stop offset="100%" stopColor="#1B5FE8"/></linearGradient></defs>
                <path d="M14,4 L44,4 A9,9 0 0,1 53,13 L53,42 A9,9 0 0,1 44,51 L20,51 L6,61 L11,51 A6,6 0 0,1 5,45 L5,13 A9,9 0 0,1 14,4 Z" fill="url(#appNavGrad)"/>
                <g transform="translate(13.16,11.3) scale(0.72)"><path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="white" opacity="0.93"/></g>
                <path d="M89,14 L59,14 A9,9 0 0,0 50,23 L50,52 A9,9 0 0,0 59,61 L83,61 L97,71 L92,61 A6,6 0 0,0 98,55 L98,23 A9,9 0 0,0 89,14 Z" fill="white" stroke="url(#appNavGrad)" strokeWidth="2.2" strokeLinejoin="round"/>
                <g transform="translate(58.16,21.3) scale(0.72)"><path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="url(#appNavGrad)"/></g>
              </svg>
            )}
            <span style={{ fontFamily: font.display, fontSize: "0.95rem", fontWeight: 700, color: (isMobile && view !== "results") ? "white" : (view === "home" ? "white" : C.ink) }}>Attune</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {!isMobile && <button onClick={() => go("home")} style={{ width: 34, height: 34, borderRadius: "50%", background: "transparent", border: `1.5px solid ${C.stone}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", transition: "all .15s" }} title="Dashboard">⊞</button>}
          {/* Auth: show Sign In if not logged in, account dropdown if logged in */}
          {!isLoggedIn ? (
            <button onClick={() => { setAuthMode("signup"); setShowAuth(true); }}
              style={{ background: (isMobile && view !== "results") ? "rgba(255,255,255,0.2)" : "linear-gradient(135deg, #E8673A, #1B5FE8)", color: "white", border: (isMobile && view !== "results") ? "1px solid rgba(255,255,255,0.35)" : "none", borderRadius: 10, padding: "0.4rem 0.9rem", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", fontFamily: font.body, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
              Sign up
            </button>
          ) : (
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowNavDropdown(v => !v)}
                style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #E8673A22, #1B5FE822)", border: "1.5px solid rgba(232,103,58,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: 700, color: "#E8673A", fontFamily: font.body }}
                title={`Signed in as ${userName}`}>
                {userName[0]?.toUpperCase()}
              </button>
              {showNavDropdown && (
                <>
                  <div onClick={() => setShowNavDropdown(false)} style={{ position: "fixed", inset: 0, zIndex: 199 }} />
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "#FFFDF9", border: "1.5px solid #E8DDD0", borderRadius: 14, padding: "0.4rem", minWidth: 180, boxShadow: "0 12px 40px rgba(14,11,7,0.13)", zIndex: 200 }}>
                    {[
                      { label: "Dashboard", icon: "⊞", action: () => { go("home"); setShowNavDropdown(false); } },
                      { label: "My account", icon: "◎", action: () => { setShowProfileSetup(true); setShowNavDropdown(false); } },
                      { label: "Get help", icon: "?", action: () => { window.location.href = "/feedback"; setShowNavDropdown(false); } },
                      null,
                      { label: "Sign out", icon: "→", action: async () => {
                          const { supabase: sb, hasSupabase } = await import('./supabase.js');
                          if (hasSupabase()) await sb.auth.signOut();
                          setAccount(null);
                          try { localStorage.removeItem("attune_account"); } catch {}
                          setShowNavDropdown(false);
                        }, danger: true },
                    ].map((item, i) => item === null
                      ? <div key={i} style={{ height: "1px", background: "#E8DDD0", margin: "0.3rem 0.4rem" }} />
                      : <button key={i} onClick={item.action}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.55rem 0.75rem", background: "none", border: "none", borderRadius: 9, cursor: "pointer", fontFamily: font.body, fontSize: "0.8rem", fontWeight: 500, color: item.danger ? "#ef4444" : "#0E0B07", textAlign: "left", transition: "background 0.1s" }}
                          onMouseEnter={e => e.currentTarget.style.background = item.danger ? "#FFF5F5" : "#F3EDE6"}
                          onMouseLeave={e => e.currentTarget.style.background = "none"}>
                          <span style={{ fontSize: "0.75rem", opacity: 0.55, width: 14 }}>{item.icon}</span>
                          {item.label}
                        </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          {couplePortrait ? (
            <CouplePortraitBubble portrait={couplePortrait} size={34} dark={false} uid="nav" onClick={() => setShowPortraitSetup(true)} style={{ border: "1.5px solid " + C.stone }} />
          ) : (
            <button onClick={() => setShowPortraitSetup(true)} style={{ width: 34, height: 34, borderRadius: "50%", background: C.stone, border: `1.5px solid ${C.stone}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Create your couple portrait">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </button>
          )}
        </div>
        {/* Mobile: ← Dashboard row below logo+auth row */}
      {isMobile && view !== "home" && view !== "results" && (
        <div style={{ paddingTop: "0.45rem", marginTop: "0.35rem", borderTop: "1px solid rgba(255,255,255,0.18)", display: "flex" }}>
          <button onClick={() => setView("home")}
            style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "0.65rem", color: "rgba(255,255,255,0.8)", fontFamily: font.body, padding: 0, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            ← Dashboard
          </button>
        </div>
      )}
      </div>

      {/* ── SUB-TOOLBAR: ← Dashboard — desktop only, non-home, non-results views ── */}
      {!isMobile && view !== "home" && view !== "results" && (
        <div style={{ background: "rgba(255,253,249,0.97)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.stone}`, padding: "0.6rem 1.5rem", display: "flex", alignItems: "center", flexShrink: 0, position: "sticky", top: 56, zIndex: 90 }}>
          <button onClick={() => setView("home")}
            style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "0.68rem", color: C.clay, fontFamily: font.body, padding: 0, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", transition: "color .15s", display: "flex", alignItems: "center", gap: "0.35rem" }}
            onMouseEnter={e => e.currentTarget.style.color = C.ink}
            onMouseLeave={e => e.currentTarget.style.color = C.clay}>
            ← Dashboard
          </button>
        </div>
      )}

      <div data-main-scroll style={{ maxWidth: view === "home" ? "unset" : 860, margin: view === "home" ? 0 : "0 auto", padding: view === "home" ? 0 : (view === "results" ? 0 : "3rem 2rem") }}>
        {view === "home" && (
          <div style={{ display: "flex", minHeight: "100vh", background: "#FBF8F3" }}>

            {/* ── LEFT SIDEBAR ───────────────────────────────────────────── */}
            {!isMobile && (
            <div style={{ width: 210, flexShrink: 0, background: "#FAF7F2", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto", borderRight: "1px solid #E8DDD0" }}>

              {/* Logo */}
              <div style={{ padding: "1.1rem 1.25rem 0.9rem", display: "flex", alignItems: "center", gap: 9, borderBottom: "1px solid #E8DDD0" }}>
                <div onClick={() => window.location.href = '/home'} style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
                  <svg width="28" height="20" viewBox="0 0 103 76" fill="none">
                    <defs><linearGradient id="sidebarLogoGrad" x1="0" y1="0" x2="103" y2="76" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#E8673A"/><stop offset="100%" stopColor="#1B5FE8"/></linearGradient></defs>
                    <path d="M14,4 L44,4 A9,9 0 0,1 53,13 L53,42 A9,9 0 0,1 44,51 L20,51 L6,61 L11,51 A6,6 0 0,1 5,45 L5,13 A9,9 0 0,1 14,4 Z" fill="url(#sidebarLogoGrad)"/>
                    <path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="white" opacity=".93" transform="translate(13.16,11.3) scale(0.72)"/>
                    <path d="M89,14 L59,14 A9,9 0 0,0 50,23 L50,52 A9,9 0 0,0 59,61 L83,61 L97,71 L92,61 A6,6 0 0,0 98,55 L98,23 A9,9 0 0,0 89,14 Z" fill="white" stroke="url(#sidebarLogoGrad)" strokeWidth="2.2" strokeLinejoin="round"/>
                    <path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="url(#sidebarLogoGrad)" transform="translate(58.16,21.3) scale(0.72)"/>
                  </svg>
                  <span style={{ fontSize: "1rem", fontWeight: 700, color: "#0E0B07", fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: "-.01em" }}>Attune</span>
                </div>
              </div>

              {/* Profile pill */}
              <div style={{ margin: "0.85rem 0.9rem 0.5rem", background: "white", border: "1px solid #E8DDD0", borderRadius: 10, padding: "0.6rem 0.85rem", display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#E8673A,#1B5FE8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "white", flexShrink: 0 }}>
                  {userName ? userName[0].toUpperCase() : "?"}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#0E0B07", lineHeight: 1.2 }}>{userName || "You"}</div>
                  {partnerName && <div style={{ fontSize: 10, color: "#8C7A68" }}>& {partnerName}</div>}
                </div>
              </div>

              {/* Nav items */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, padding: "0.25rem 0.7rem 0" }}>
                {[
                  { label: "Dashboard", viewId: "home", icon: <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg> },
                  { label: "Exercises", viewId: "exercises", icon: <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5"/><path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
                  { label: "Results", viewId: "results", icon: <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 9h14M3 13h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
                  { label: "Resources", viewId: "resources", icon: <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7 7h6M7 10h6M7 13h3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg> },
                  { label: "Workbook", viewId: "workbook", icon: <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7 6h6M7 9h4M13 13l1.5 1.5L17 12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg> },
                ].map(item => {
                  const isActive = item.viewId === view;
                  const handleNavClick = () => { setView(item.viewId); };
                  return (
                    <div key={item.viewId} onClick={handleNavClick}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.6rem 0.75rem", borderRadius: 8, background: isActive ? "#E8673A14" : "transparent", cursor: "pointer", color: isActive ? "#B84E28" : "#5C4F45" }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#F3EDE6"; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                      {item.icon}
                      <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Bottom: Account + Settings */}
              <div style={{ padding: "0.85rem 1rem", borderTop: "1px solid #E8DDD0", marginTop: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.45rem 0.75rem", borderRadius: 7, cursor: "pointer", color: "#5C4F45" }}
                  onClick={() => setView("account")}
                  onMouseEnter={e => e.currentTarget.style.background = "#F3EDE6"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5"/><path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  <span style={{ fontSize: 11, fontWeight: 400 }}>Account</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.45rem 0.75rem", borderRadius: 7, cursor: "pointer", color: "#5C4F45" }}
                  onClick={() => setShowProfileSetup(true)}
                  onMouseEnter={e => e.currentTarget.style.background = "#F3EDE6"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M10 3v2M10 15v2M3 10H1M19 10h-2M5.05 5.05L3.636 3.636M16.364 16.364l-1.414-1.414M5.05 14.95l-1.414 1.414M16.364 3.636l-1.414 1.414" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/></svg>
                  <span style={{ fontSize: 11, fontWeight: 400 }}>Settings</span>
                </div>
              </div>
            </div>
            )}

            {/* ── MAIN CONTENT ───────────────────────────────────────────── */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", minWidth: 0 }}>

              {/* ── GRADIENT BANNER (mobile: full nav bar; desktop: banner only) ── */}
              <div style={{ background: "linear-gradient(120deg, #C8522E 0%, #6B3FA0 52%, #1B5FE8 100%)", flexShrink: 0, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)", pointerEvents: "none" }} />

                {/* Mobile: logo row + hamburger at top */}
                {isMobile && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1.25rem 0", position: "relative" }}>
                    {/* Logo — links to landing page */}
                    <div onClick={() => window.location.href = '/home'} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <svg width="28" height="20" viewBox="0 0 103 76" fill="none" style={{ flexShrink: 0 }}>
                        <defs><linearGradient id="mobileNavLogo" x1="0" y1="0" x2="103" y2="76" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="rgba(255,255,255,0.95)"/><stop offset="100%" stopColor="rgba(255,255,255,0.75)"/></linearGradient></defs>
                        <path d="M14,4 L44,4 A9,9 0 0,1 53,13 L53,42 A9,9 0 0,1 44,51 L20,51 L6,61 L11,51 A6,6 0 0,1 5,45 L5,13 A9,9 0 0,1 14,4 Z" fill="url(#mobileNavLogo)"/>
                        <path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="rgba(100,60,180,0.6)" transform="translate(13.16,11.3) scale(0.72)"/>
                        <path d="M89,14 L59,14 A9,9 0 0,0 50,23 L50,52 A9,9 0 0,0 59,61 L83,61 L97,71 L92,61 A6,6 0 0,0 98,55 L98,23 A9,9 0 0,0 89,14 Z" fill="white" stroke="url(#mobileNavLogo)" strokeWidth="2.2" strokeLinejoin="round"/>
                        <path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="url(#mobileNavLogo)" transform="translate(58.16,21.3) scale(0.72)"/>
                      </svg>
                      <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "white", fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: "-.01em" }}>Attune</span>
                    </div>
                    {/* Hamburger button */}
                    <button onClick={() => setMobileNavOpen(o => !o)}
                      style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, width: 36, height: 36, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer", flexShrink: 0, padding: 0 }}>
                      <div style={{ width: 16, height: 1.5, background: "white", borderRadius: 1, transition: "transform .2s, opacity .2s", transform: mobileNavOpen ? "rotate(45deg) translate(0,4px)" : "none" }} />
                      <div style={{ width: 16, height: 1.5, background: "white", borderRadius: 1, transition: "opacity .2s", opacity: mobileNavOpen ? 0 : 1 }} />
                      <div style={{ width: 16, height: 1.5, background: "white", borderRadius: 1, transition: "transform .2s, opacity .2s", transform: mobileNavOpen ? "rotate(-45deg) translate(0,-4px)" : "none" }} />
                    </button>
                  </div>
                )}

                {/* Names + optional View Results CTA */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", gap: "1rem", padding: isMobile ? "0.85rem 1.25rem 1.25rem" : "1.5rem 2rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "0.75rem" : "1.25rem" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem", flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: isMobile ? "1.3rem" : "1.75rem", fontWeight: 700, lineHeight: 1, letterSpacing: "-.02em", color: "white" }}>{userName || "You"}</span>
                        <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: isMobile ? "0.95rem" : "1.3rem", fontWeight: 400, fontStyle: "italic", color: "rgba(255,255,255,0.5)", lineHeight: 1 }}>&</span>
                        <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: isMobile ? "1.3rem" : "1.75rem", fontWeight: 700, lineHeight: 1, letterSpacing: "-.02em", color: "white" }}>{partnerName || "Partner"}</span>
                      </div>
                    </div>
                  </div>
                  {/* Desktop only: View Results in banner */}
                  {!isMobile && bothDone && (
                    <button onClick={() => setView("results")}
                      style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "0.65rem 1.25rem", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", letterSpacing: ".04em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", flexShrink: 0, transition: "background .15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.26)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}>
                      View results →
                    </button>
                  )}
                </div>

                {/* Mobile hamburger dropdown nav */}
                {isMobile && mobileNavOpen && (
                  <div style={{ background: "rgba(14,11,7,0.92)", backdropFilter: "blur(16px)", borderTop: "1px solid rgba(255,255,255,0.12)", padding: "0.75rem 1rem 1rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    {[
                      { label: "Dashboard", viewId: "home", icon: "⊞" },
                      { label: "Exercises", viewId: "exercises", icon: "◎" },
                      { label: "Results", viewId: "results", icon: "≡" },
                      { label: "Resources", viewId: "resources", icon: "◻" },
                      { label: "Workbook", viewId: "workbook", icon: "◈" },
                      { label: "Account", viewId: "account", icon: "○" },
                    ].map(item => (
                      <button key={item.viewId}
                        onClick={() => { setView(item.viewId); setMobileNavOpen(false); }}
                        style={{ display: "flex", alignItems: "center", gap: "0.85rem", padding: "0.75rem 0.85rem", background: view === item.viewId ? "rgba(232,103,58,0.2)" : "transparent", border: "none", borderRadius: 10, cursor: "pointer", textAlign: "left", width: "100%", transition: "background .15s" }}>
                        <span style={{ fontSize: "0.8rem", color: view === item.viewId ? "#E8673A" : "rgba(255,255,255,0.6)", width: 16 }}>{item.icon}</span>
                        <span style={{ fontSize: "0.88rem", fontWeight: view === item.viewId ? 700 : 400, color: view === item.viewId ? "white" : "rgba(255,255,255,0.75)", fontFamily: "'DM Sans', sans-serif" }}>{item.label}</span>
                        {item.viewId === "results" && bothDone && <span style={{ marginLeft: "auto", fontSize: "0.65rem", background: "#E8673A", color: "white", borderRadius: 99, padding: "2px 8px", fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>Ready</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile: View Results button below banner (centered) */}
              {isMobile && bothDone && (
                <div style={{ background: "#FBF8F3", padding: "1rem 1.25rem 0", display: "flex", justifyContent: "center" }}>
                  <button onClick={() => setView("results")}
                    style={{ background: "linear-gradient(135deg,#E8673A,#1B5FE8)", color: "white", border: "none", borderRadius: 12, padding: "0.75rem 2rem", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: ".04em", textTransform: "uppercase", boxShadow: "0 4px 16px rgba(232,103,58,0.3)" }}>
                    View Results →
                  </button>
                </div>
              )}

              {/* ── CONTENT AREA ─────────────────────────────────────────── */}
              <div style={{ flex: 1, padding: isMobile ? "1.5rem 1.25rem" : "2rem 2rem", background: "#FBF8F3" }}>

                {/* Profile setup tile — shown until dismissed or completed */}
                {isLoggedIn && !profileSetupDone && (
                  <ProfileSetupTile
                    account={account}
                    onSetup={() => setShowProfileSetup(true)}
                    onDismiss={completeProfileSetup}
                  />
                )}

                {/* Workbook ready notification — shown when workbook is generated and not yet seen */}
                {isLoggedIn && hasWorkbookOrder && workbookReady && !workbookNotifSeen && (
                  <div style={{ background: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)', border: '1.5px solid rgba(16,185,129,0.35)', borderRadius: 16, padding: '1.1rem 1.4rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#065F46', fontFamily: "'DM Sans',sans-serif", marginBottom: 3 }}>Your personalized workbook is ready.</div>
                      <div style={{ fontSize: '0.75rem', color: '#059669', fontFamily: "'DM Sans',sans-serif" }}>Go to Workbook in the sidebar to download your PDF.</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', flexShrink: 0 }}>
                      <button onClick={() => setView('workbook')} style={{ background: '#059669', color: 'white', border: 'none', borderRadius: 9, padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Download →</button>
                      <button onClick={() => { setWorkbookNotifSeen(true); try { localStorage.setItem('attune_workbook_notif_seen','1'); } catch {} }} style={{ background: 'transparent', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 9, padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: '#059669', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Dismiss</button>
                    </div>
                  </div>
                )}

                {/* Partner invite card (when partner hasn't joined yet) */}
                {isLoggedIn && !hasRealPartner && !account?.partnerJoined && (
                  <div style={{ marginBottom: "1.75rem" }}>
                    <PartnerInviteCard
                      account={account}
                      copied={inviteCopied}
                      onCopy={(url) => {
                        navigator.clipboard?.writeText(url).catch(() => {});
                        setInviteCopied(true);
                        setTimeout(() => setInviteCopied(false), 2000);
                      }}
                    />
                  </div>
                )}

                {/* Partner joined — spinner during initial sync, then static waiting card */}
                {isLoggedIn && !hasRealPartner && account?.partnerJoined && partnerSyncing && (
                  <div style={{ background: "linear-gradient(135deg,#EEF2FF,#F5F7FF)", border: "1.5px solid rgba(27,95,232,.25)", borderRadius: 14, padding: "1.1rem 1.4rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.9rem" }}>
                    <style>{`@keyframes attune-spin{to{transform:rotate(360deg)}}`}</style>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(27,95,232,0.18)", borderTopColor: "#1B5FE8", flexShrink: 0, animation: "attune-spin 0.8s linear infinite" }} />
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0E0B07", fontFamily: "'DM Sans',sans-serif", marginBottom: 2 }}>Checking for {account.partnerName || "your partner"}'s results…</div>
                      <div style={{ fontSize: "0.75rem", color: "#8C7A68", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.5 }}>Just a moment.</div>
                    </div>
                  </div>
                )}
                {isLoggedIn && !hasRealPartner && account?.partnerJoined && !partnerSyncing && (
                  <div style={{ background: "linear-gradient(135deg,#EEF2FF,#F5F7FF)", border: "1.5px solid rgba(27,95,232,.25)", borderRadius: 14, padding: "1.1rem 1.4rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.9rem" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#1B5FE8,#3B3A8A)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "1rem" }}>✓</div>
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0E0B07", fontFamily: "'DM Sans',sans-serif", marginBottom: 2 }}>{account.partnerName || "Your partner"} has joined.</div>
                      <div style={{ fontSize: "0.75rem", color: "#8C7A68", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.5 }}>Once both of you complete your exercises, your results will unlock.</div>
                    </div>
                  </div>
                )}

                {/* Partner done — gradient border card */}
                {hasRealPartner && bothDone && (
                  <div style={{ borderRadius: 14, marginBottom: "1.75rem", position: "relative", padding: "1.5px" }}>
                    <div style={{ position: "absolute", inset: 0, borderRadius: 14, background: "linear-gradient(135deg, #E8673A, #9B5DE5, #1B5FE8)" }} />
                    <div style={{ position: "relative", background: "white", borderRadius: 13, padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0E0B07", marginBottom: 3, fontFamily: "'DM Sans', sans-serif" }}>{partnerName} has completed both exercises</div>
                        <div style={{ fontSize: 11, color: "#8C7A68", fontFamily: "'DM Sans', sans-serif" }}>Your results are ready to view together.</div>
                      </div>
                      <button onClick={() => setView("results")}
                        style={{ background: "linear-gradient(135deg, #E8673A, #9B5DE5, #1B5FE8)", color: "white", border: "none", borderRadius: 8, padding: "0.55rem 1rem", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", letterSpacing: ".04em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
                        See results
                      </button>
                    </div>
                  </div>
                )}

                {/* ── COUPLE PORTRAIT ── */}
                {isLoggedIn && (
                  <div style={{ marginBottom: "2rem" }}>
                    <div
                      onClick={() => setShowPortraitSetup(true)}
                      style={{ background: couplePortrait ? "white" : "linear-gradient(135deg, #FDF8F4 0%, #F5EEE8 100%)", border: couplePortrait ? `1.5px solid ${C.stone}` : "2px dashed #C8B8A8", borderRadius: 20, padding: "2.5rem 2rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.25rem", minHeight: 220, cursor: "pointer", transition: "box-shadow .15s, border-color .15s", position: "relative", overflow: "hidden" }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 28px rgba(0,0,0,.08)"; e.currentTarget.style.borderColor = couplePortrait ? "#C8B8A8" : "#B09080"; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = couplePortrait ? C.stone : "#C8B8A8"; }}
                    >
                      {couplePortrait ? (
                        <>
                          {/* Rendered portrait */}
                          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                            <div style={{ position: "relative" }}>
                              {mkCouple(couplePortrait.p1, couplePortrait.p2, false, "dash-portrait")}
                            </div>
                            <div style={{ textAlign: "left" }}>
                              <div style={{ fontSize: "1.15rem", fontWeight: 700, color: C.ink, fontFamily: "'Playfair Display', Georgia, serif", lineHeight: 1.2, marginBottom: 4 }}>
                                {userName}{partnerName ? ` & ${partnerName}` : ""}
                              </div>
                              {coupleType && (
                                <div style={{ fontSize: "0.78rem", color: coupleType.color || C.clay, fontWeight: 600, fontFamily: font.body }}>{coupleType.name}</div>
                              )}
                            </div>
                          </div>
                          <div style={{ fontSize: "0.68rem", color: C.muted, fontFamily: font.body, letterSpacing: "0.06em", textTransform: "uppercase" }}>Tap to update portrait</div>
                        </>
                      ) : (
                        <>
                          {/* Empty frame — two overlapping circles */}
                          <div style={{ position: "relative", width: 120, height: 80 }}>
                            <div style={{ position: "absolute", left: 0, top: 0, width: 80, height: 80, borderRadius: "50%", border: "2.5px dashed #C8B8A8", background: "#FAF7F4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C8B8A8" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7"/></svg>
                            </div>
                            <div style={{ position: "absolute", right: 0, top: 0, width: 80, height: 80, borderRadius: "50%", border: "2.5px dashed #C8B8A8", background: "#F5F0EC", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C8B8A8" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7"/></svg>
                            </div>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: C.ink, fontFamily: "'Playfair Display', Georgia, serif", marginBottom: 6 }}>Create your couple portrait</div>
                            <div style={{ fontSize: "0.78rem", color: C.muted, fontFamily: font.body, lineHeight: 1.6, maxWidth: 280 }}>Add a photo or illustration for each partner. Shows up across your results and shareable cards.</div>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); setShowPortraitSetup(true); }}
                            style={{ background: C.ink, color: "white", border: "none", borderRadius: 10, padding: "0.6rem 1.5rem", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: font.body, letterSpacing: "0.02em" }}>
                            Add portrait
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* ── EXERCISES ── */}
                <div style={{ marginBottom: "2rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.6rem", letterSpacing: ".2em", textTransform: "uppercase", color: "#8C7A68", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Your exercises</div>
                    {bothDone && <div style={{ fontSize: "0.6rem", color: "#059669", fontWeight: 700, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 999, padding: "0.15rem 0.65rem", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.02em" }}>Both complete</div>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: "0.75rem" }}>
                    {[
                      { num: "01", title: "Communication", done: !!ex1Answers, viewId: "exercise1", color: "#E8673A", desc: "Map your communication style across 10 dimensions — how you recharge, express, conflict, and connect." },
                      { num: "02", title: "Expectations", done: !!ex2Answers, viewId: "exercise2", color: "#1B5FE8", desc: "Align on who handles what and what you each expect — household, finances, career, emotional labor." },
                      ...(pkg.hasAnniversary ? [{ num: "03", title: "Reflection", done: !!ex3Answers, viewId: "exercise3", color: "#1B5FE8", desc: "Capture the moments that shaped your relationship — a third lens on your shared story." }] : []),
                    ].map(item => (
                      <div key={item.num} onClick={() => setView(item.viewId)}
                        style={{ background: "white", border: `1.5px solid ${item.done ? "rgba(16,185,129,0.25)" : "#E8DDD0"}`, borderRadius: 16, padding: "1.25rem", cursor: "pointer", transition: "box-shadow .15s, border-color .15s", display: "flex", flexDirection: "column", gap: "0.6rem" }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,.07)"; e.currentTarget.style.borderColor = item.done ? "rgba(16,185,129,0.4)" : "#C8B8A8"; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = item.done ? "rgba(16,185,129,0.25)" : "#E8DDD0"; }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: item.color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: "0.6rem", letterSpacing: ".15em", fontWeight: 700, color: item.color, fontFamily: "'DM Sans', sans-serif" }}>{item.num}</span>
                          </div>
                          {item.done
                            ? <span style={{ background: "rgba(16,185,129,.08)", color: "#059669", fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 99, fontFamily: "'DM Sans', sans-serif", border: "1px solid rgba(16,185,129,.2)" }}>Complete</span>
                            : <span style={{ background: "#FDF8F3", color: "#C17F47", fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 99, fontFamily: "'DM Sans', sans-serif" }}>Start →</span>
                          }
                        </div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "#0E0B07", marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>{item.title}</div>
                          <div style={{ fontSize: 12, color: "#8C7A68", lineHeight: 1.55, fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Side-by-side responses link */}
                  {bothDone && (
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.85rem", flexWrap: "wrap" }}>
                      {[
                        { label: "Communication responses →", section: "personality", color: "#E8673A" },
                        { label: "Expectations responses →", section: "expectations", color: "#1B5FE8" },
                        ...(pkg.hasAnniversary && ex3Answers ? [{ label: "Reflection responses →", section: "anniversary", color: "#1B5FE8" }] : []),
                      ].map(({ label, section, color }) => (
                        <button key={section} onClick={() => { setActiveResult(section); setView("results"); setHighlightsSeen(true); }}
                          style={{ background: "transparent", border: "1.5px solid #E8DDD0", borderRadius: 8, padding: "0.45rem 0.85rem", fontSize: 11, fontWeight: 600, color: "#8C7A68", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: ".03em", transition: "all .15s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.color = color; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "#E8DDD0"; e.currentTarget.style.color = "#8C7A68"; }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── WHAT'S WAITING ── shown when both complete */}
                {bothDone && (
                  <div style={{ marginBottom: "2rem" }}>
                    <div style={{ fontSize: "0.6rem", letterSpacing: ".2em", textTransform: "uppercase", color: "#8C7A68", fontWeight: 700, marginBottom: "1rem", fontFamily: "'DM Sans', sans-serif" }}>What's waiting in your results</div>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: "0.65rem" }}>
                      {[
                        { label: "Your couple type", desc: "The pairing that defines how you navigate tension and connection.", icon: "◎" },
                        { label: "Communication profile", desc: "10 dimensions mapped — how you two actually work.", icon: "⊞" },
                        { label: "Expectations map", desc: "Where you're aligned and where the gaps are.", icon: "◫" },
                      ].map(w => (
                        <div key={w.label} onClick={() => setView("results")}
                          style={{ background: "white", border: "1.5px solid #E8DDD0", borderRadius: 14, padding: "1rem 1.1rem", cursor: "pointer", transition: "box-shadow .15s" }}
                          onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.06)"}
                          onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                          <div style={{ fontSize: "1.1rem", marginBottom: "0.5rem", color: "#9B5DE5", opacity: 0.7 }}>{w.icon}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0E0B07", marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>{w.label}</div>
                          <div style={{ fontSize: 11, color: "#8C7A68", lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>{w.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── READING ── */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.6rem", letterSpacing: ".2em", textTransform: "uppercase", color: "#8C7A68", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>From In Practice</div>
                    <a href="/practice" style={{ fontSize: "0.65rem", color: "#C17F47", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>See all →</a>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.65rem" }}>
                    {[
                      { title: "How to review your results together", href: "/practice/how-to-review-your-results-together", tag: "Guide", color: "#9B5DE5" },
                      { title: "Why couples fight about the same things", href: "/practice/why-couples-fight-about-the-same-things", tag: "Read", color: "#1B5FE8" },
                      { title: "How to start a hard conversation", href: "/practice/how-to-start-a-hard-conversation", tag: "Guide", color: "#9B5DE5" },
                      { title: "Understanding each other", href: "/practice/understanding-each-other", tag: "Read", color: "#1B5FE8" },
                    ].map(r => (
                      <a key={r.href} href={r.href}
                        style={{ background: "white", border: "1.5px solid #E8DDD0", borderRadius: 14, padding: "1rem 1.1rem", display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none", transition: "border-color .15s" }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = "#C8B8A8"}
                        onMouseLeave={e => e.currentTarget.style.borderColor = "#E8DDD0"}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.3rem" }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: r.color, flexShrink: 0, opacity: 0.7 }} />
                            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", color: "#8C7A68", fontFamily: "'DM Sans', sans-serif" }}>{r.tag}</div>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "#0E0B07", lineHeight: 1.45, fontFamily: "'DM Sans', sans-serif" }}>{r.title}</div>
                        </div>
                        <span style={{ fontSize: 14, color: "#C8BFB4", marginLeft: 12, flexShrink: 0 }}>→</span>
                      </a>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}


        {view === "exercises" && (() => {
          // Exercise progress helper
          const exTile = ({ title, sub, color, accent, done, doneLabel, inProgress, onClick, icon }) => (
            <div onClick={onClick} style={{ background: done ? "linear-gradient(135deg," + color + "18," + color + "08)" : "white", border: "1.5px solid " + (done ? color + "40" : "#E8DDD0"), borderRadius: 16, padding: "1.25rem 1.4rem", cursor: "pointer", transition: "all 0.15s", position: "relative", overflow: "hidden" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = "0 4px 18px " + color + "22"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = done ? color + "40" : "#E8DDD0"; e.currentTarget.style.boxShadow = "none"; }}>
              {done && <div style={{ position: "absolute", top: 12, right: 14, width: 22, height: 22, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg></div>}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: color + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
                <div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#0E0B07", fontFamily: BFONT, lineHeight: 1.2 }}>{title}</div>
                  {done && <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: color, fontWeight: 700, fontFamily: BFONT, marginTop: "0.2rem" }}>{doneLabel || "Complete ✓"}</div>}
                </div>
              </div>
              <div style={{ fontSize: "0.78rem", color: "#8C7A68", fontFamily: BFONT, lineHeight: 1.55, marginBottom: "0.85rem" }}>{sub}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ height: 4, background: "#E8DDD0", borderRadius: 2, flex: 1, marginRight: "0.85rem", overflow: "hidden" }}>
                  <div style={{ height: "100%", background: done ? "linear-gradient(90deg," + color + "," + accent + ")" : "#E8DDD0", width: done ? "100%" : inProgress ? "45%" : "0%", borderRadius: 2, transition: "width 0.4s ease" }} />
                </div>
                <span style={{ fontSize: "0.72rem", fontWeight: 600, color: done ? color : "#8C7A68", fontFamily: BFONT, flexShrink: 0 }}>{done ? "Done" : inProgress ? "In progress" : "Start →"}</span>
              </div>
            </div>
          );
          const hasEx3 = pkg.hasAnniversary;
          return (
            <div style={{ flex: 1, overflowY: "auto", background: "#FBF8F3" }}>
              <div style={{ maxWidth: 620, margin: "0 auto", padding: isMobile ? "2rem 1.25rem" : "3rem 2rem" }}>
                <div style={{ marginBottom: "2rem" }}>
                  <div style={{ fontSize: "0.58rem", letterSpacing: ".22em", textTransform: "uppercase", color: "#C17F47", fontWeight: 700, marginBottom: "0.5rem", fontFamily: BFONT }}>Your exercises</div>
                  <h1 style={{ fontFamily: HFONT, fontSize: isMobile ? "1.75rem" : "2.1rem", fontWeight: 700, color: "#0E0B07", lineHeight: 1.1, letterSpacing: "-.02em", marginBottom: "0.5rem" }}>
                    Complete each exercise independently.
                  </h1>
                  <p style={{ fontSize: "0.88rem", color: "#8C7A68", fontFamily: BFONT, fontWeight: 300, lineHeight: 1.65 }}>
                    Answer on your own before comparing. The comparison only appears when both of you are done.
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
                  {exTile({
                    title: "Communication",
                    sub: "Map your style across 10 dimensions — how you recharge, express, handle conflict, and connect.",
                    color: "#E8673A", accent: "#9B5DE5",
                    done: !!ex1Answers, inProgress: false,
                    doneLabel: "Your profile is mapped",
                    onClick: () => setView("exercise1"),
                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8673A" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
                  })}
                  {exTile({
                    title: "Expectations",
                    sub: "Who handles what — and what you each grew up seeing. Reveals gaps you haven't talked about.",
                    color: "#1B5FE8", accent: "#9B5DE5",
                    done: !!ex2Answers, inProgress: false,
                    doneLabel: "Your expectations are recorded",
                    onClick: () => setView("exercise2"),
                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B5FE8" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
                  })}
                  {hasEx3 && exTile({
                    title: "Relationship Reflection",
                    sub: "A third exercise about the moments and memories that shaped your relationship.",
                    color: "#10b981", accent: "#059669",
                    done: !!ex3Answers, inProgress: false,
                    doneLabel: "Your reflection is captured",
                    onClick: () => setView("exercise3"),
                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
                  })}
                </div>

                {bothDone && (
                  <div style={{ background: "linear-gradient(135deg,#E8673A,#1B5FE8)", borderRadius: 16, padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                    <div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "white", fontFamily: BFONT, marginBottom: "0.2rem" }}>Both exercises complete.</div>
                      <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", fontFamily: BFONT }}>Your joint results are ready to view.</div>
                    </div>
                    <button onClick={() => setView("results")} style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", color: "white", borderRadius: 10, padding: "0.65rem 1.25rem", fontSize: "0.75rem", fontWeight: 700, fontFamily: BFONT, whiteSpace: "nowrap", cursor: "pointer" }}>View Results →</button>
                  </div>
                )}

                {!bothDone && (
                  <div style={{ background: "#F7F4EE", border: "1px solid #E8DDD0", borderRadius: 14, padding: "1rem 1.25rem", fontSize: "0.8rem", color: "#8C7A68", fontFamily: BFONT, lineHeight: 1.6 }}>
                    <strong style={{ color: "#5A5750" }}>Waiting on {partnerName || "your partner"}?</strong> Share your Attune link so they can complete their side. Results unlock when both of you are done.
                  </div>
                )}
              </div>
            </div>
          );
        })()}

                {view === "exercise1" && (
          <div>
            {ex1Answers
              ? <div style={{ textAlign: "center", padding: "4rem 1rem 3rem", maxWidth: 440, margin: "0 auto" }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #E8673A, #1B5FE8)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem", fontSize: "1.8rem" }}>✓</div>
                  <p style={{ fontFamily: font.display, fontSize: "2rem", fontWeight: 700, color: C.ink, marginBottom: "0.5rem", lineHeight: 1.1 }}>Exercise 1 Complete.</p>
                  <p style={{ fontSize: "0.78rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#4CAF50", fontWeight: 700, fontFamily: font.body, marginBottom: "1.25rem" }}>Your communication profile is mapped</p>
                  <p style={{ fontSize: "0.88rem", color: C.muted, fontFamily: font.body, fontWeight: 300, marginBottom: "2rem", lineHeight: 1.75 }}>{bothDone ? ("Both exercises complete. Your results are ready.") : ("When " + partnerName + " finishes, you'll unlock your couple type and learn what that means for the two of you.")}</p>
                  <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                    
                    {bothDone
                      ? <button onClick={() => setView("results")} style={{ background: "linear-gradient(135deg, #E8673A, #1B5FE8)", color: "white", border: "none", padding: "0.6rem 1.75rem", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: font.body, borderRadius: 8, fontWeight: 600 }}>See Your Results →</button>
                      : <button onClick={() => setView("home")} style={{ background: "#2d2250", color: "white", border: "none", padding: "0.6rem 1.5rem", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: font.body, borderRadius: 8 }}>Back to Dashboard →</button>
                    }
                  </div>
                  {/* Workbook upsell */}
                  <div onClick={() => setUpsellModal({ product: "workbook", cartAdded: false })}
                    style={{ marginTop: "2rem", textAlign: "left", background: "#FFFBF0", border: "1.5px solid rgba(232,103,58,.3)", borderRadius: 14, padding: "1rem 1.25rem", display: "flex", gap: "0.85rem", alignItems: "flex-start", cursor: "pointer", transition: "border-color 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(232,103,58,.6)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(232,103,58,.3)"}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, background: "rgba(232,103,58,0.2)", border: "1.5px solid rgba(232,103,58,0.4)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#E8673A" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1A1208", fontFamily: font.body, marginBottom: "0.2rem" }}>Personalized Workbook</div>
                      <p style={{ fontSize: "0.72rem", color: "#6B5030", fontFamily: font.body, lineHeight: 1.55, margin: "0 0 0.4rem" }}>Guided exercises and conversation prompts built directly from your results.</p>
                      <span style={{ fontSize: "0.7rem", color: "#E8673A", fontWeight: 700, fontFamily: font.body }}>See details + add to cart →</span>
                    </div>
                  </div>
                  {demoPkg !== "anniversary" && demoPkg !== "premium" && (
                    <div onClick={() => setUpsellModal({ product: "reflection", cartAdded: false })}
                      style={{ marginTop: "1rem", textAlign: "left", background: "#F0FDF4", border: "1.5px solid rgba(16,185,129,.25)", borderRadius: 14, padding: "1rem 1.25rem", display: "flex", gap: "0.85rem", alignItems: "flex-start", cursor: "pointer", transition: "border-color 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(16,185,129,.55)"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(16,185,129,.25)"}>
                      <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>✦</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: C.ink, fontFamily: font.body, marginBottom: "0.2rem" }}>Relationship Reflection</div>
                        <p style={{ fontSize: "0.72rem", color: C.muted, fontFamily: font.body, lineHeight: 1.55, margin: "0 0 0.4rem" }}>A third exercise about the moments that shaped your relationship.</p>
                        <span style={{ fontSize: "0.7rem", color: "#10b981", fontWeight: 700, fontFamily: font.body }}>See details + add to cart →</span>
                      </div>
                    </div>
                  )}
                </div>
              : <Exercise01Flow userName={userName} partnerName={partnerName} onComplete={a => {
                  setEx1State(a);
                  try { localStorage.setItem('attune_ex1', JSON.stringify(a)); } catch {}
                  // Persist exercise 1 answers to Supabase for cross-device access
                  if (account?.id) {
                    import('./supabase.js').then(({ supabase: sb, hasSupabase }) => {
                      if (hasSupabase()) sb.from('profiles').update({ ex1_answers: a }).eq('id', account.id).then(() => {});
                    }).catch(() => {});
                  }
                }} />
            }
          </div>
        )}

        {view === "exercise2" && (
          <div>
            {ex2Answers
              ? <div style={{ textAlign: "center", padding: "4rem 1rem 3rem", maxWidth: 440, margin: "0 auto" }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #E8673A, #1B5FE8)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem", fontSize: "1.8rem" }}>✓</div>
                  <p style={{ fontFamily: font.display, fontSize: "2rem", fontWeight: 700, color: C.ink, marginBottom: "0.5rem", lineHeight: 1.1 }}>Exercise 2 Complete.</p>
                  <p style={{ fontSize: "0.78rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#1B5FE8", fontWeight: 700, fontFamily: font.body, marginBottom: "1.25rem" }}>Your expectations are recorded</p>
                  <p style={{ fontSize: "0.92rem", color: C.muted, fontFamily: font.body, fontWeight: 300, marginBottom: "0.75rem", lineHeight: 1.75 }}>That took honesty. Most couples never have these conversations until they have to.</p>
                  <p style={{ fontSize: "0.88rem", color: C.muted, fontFamily: font.body, fontWeight: 300, marginBottom: "2rem", lineHeight: 1.75 }}>{bothDone ? ("Both exercises complete. Your results are ready.") : ("When " + partnerName + " finishes both exercises, you'll unlock your couple type and learn what that means for the two of you.")}</p>
                  <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                    
                    {bothDone
                      ? <button onClick={() => setView("results")} style={{ background: "linear-gradient(135deg, #E8673A, #1B5FE8)", color: "white", border: "none", padding: "0.6rem 1.75rem", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: font.body, borderRadius: 8, fontWeight: 600 }}>See Your Results →</button>
                      : <button onClick={() => setView("home")} style={{ background: "#2d2250", color: "white", border: "none", padding: "0.6rem 1.5rem", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: font.body, borderRadius: 8 }}>Back to Dashboard →</button>
                    }
                  </div>
                  {/* Workbook upsell */}
                  <div onClick={() => setUpsellModal({ product: "workbook", cartAdded: false })}
                    style={{ marginTop: "2rem", textAlign: "left", background: "#FFFBF0", border: "1.5px solid rgba(232,103,58,.3)", borderRadius: 14, padding: "1rem 1.25rem", display: "flex", gap: "0.85rem", alignItems: "flex-start", cursor: "pointer", transition: "border-color 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(232,103,58,.6)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(232,103,58,.3)"}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, background: "rgba(232,103,58,0.2)", border: "1.5px solid rgba(232,103,58,0.4)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#E8673A" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1A1208", fontFamily: font.body, marginBottom: "0.2rem" }}>Personalized Workbook</div>
                      <p style={{ fontSize: "0.72rem", color: "#6B5030", fontFamily: font.body, lineHeight: 1.55, margin: "0 0 0.4rem" }}>Guided exercises and conversation prompts built directly from your results.</p>
                      <span style={{ fontSize: "0.7rem", color: "#E8673A", fontWeight: 700, fontFamily: font.body }}>See details + add to cart →</span>
                    </div>
                  </div>
                  {/* Starting Out / Reflection upsell */}
                  {demoPkg !== "newlywed" && (
                    <div onClick={() => setUpsellModal({ product: demoPkg === "anniversary" || demoPkg === "premium" ? "workbook" : "checklist", cartAdded: false })}
                      style={{ marginTop: "1rem", textAlign: "left", background: "#FFF8F5", border: "1.5px solid rgba(232,103,58,.25)", borderRadius: 14, padding: "1rem 1.25rem", display: "flex", gap: "0.85rem", alignItems: "flex-start", cursor: "pointer", transition: "border-color 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(232,103,58,.55)"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(232,103,58,.25)"}>
                      <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>☑</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: C.ink, fontFamily: font.body, marginBottom: "0.2rem" }}>Starting Out Checklist</div>
                        <p style={{ fontSize: "0.72rem", color: C.muted, fontFamily: font.body, lineHeight: 1.55, margin: "0 0 0.4rem" }}>Finances, name changes, estate basics, and the real-world logistics of building a life together.</p>
                        <span style={{ fontSize: "0.7rem", color: "#E8673A", fontWeight: 700, fontFamily: font.body }}>See details + add to cart →</span>
                      </div>
                    </div>
                  )}
                </div>
              : <ExpectationsExercise userName={userName} partnerName={partnerName} onComplete={a => {
                  setEx2State(a);
                  try { localStorage.setItem('attune_ex2', JSON.stringify(a)); } catch {}
                  if (account?.id) {
                    import('./supabase.js').then(({ supabase: sb, hasSupabase }) => {
                      if (hasSupabase()) sb.from('profiles').update({ ex2_answers: a }).eq('id', account.id).then(() => {});
                    }).catch(() => {});
                  }
                  // Auto-trigger workbook generation if both partners are done and order includes workbook
                  if (bothDone && hasWorkbookOrder) {
                    setTimeout(() => {
                      const ord = JSON.parse(localStorage.getItem('attune_order') || 'null');
                      if (!ord) return;
                      const myS = calcDimScores(ex1Answers);
                      const partS = calcDimScores(partnerEx1);
                      fetch('/api/store-workbook', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          userName, partnerName,
                          scores: myS, partnerScores: partS,
                          // Full couple type so the intro page has all fields.
                          coupleType: coupleType || null,
                          orderId: ord.orderNum || null,
                        }),
                      }).then(r => r.json()).then(d => {
                        if (d.url) {
                          const updated = { ...ord, workbookUrl: d.url, workbook_status: 'ready' };
                          try { localStorage.setItem('attune_order', JSON.stringify(updated)); } catch {}
                        }
                      }).catch(() => {});
                    }, 2000);
                  }
                }} isAnniversary={demoPkg === "anniversary"} />
            }
          </div>
        )}

      </div>

        {/* ── EXERCISE 3: Anniversary Reflection ── */}
        {view === "exercise3" && pkg.hasAnniversary && (
          <div style={{ maxWidth: 620, margin: "0 auto" }}>
            {ex3Answers ? (
              <div style={{ textAlign: "center", padding: "4rem 1rem 3rem", maxWidth: 440, margin: "0 auto" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #1B5FE8, #3B3A8A)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem", fontSize: "1.8rem" }}>✓</div>
                <p style={{ fontFamily: font.display, fontSize: "1.8rem", fontWeight: 700, color: C.ink, marginBottom: "0.5rem", lineHeight: 1.1 }}>Reflection Complete.</p>
                <p style={{ fontSize: "0.78rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#10b981", fontWeight: 700, fontFamily: font.body, marginBottom: "1.5rem" }}>Your relationship story is captured</p>
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                  <button onClick={() => setEx3State(null)} style={{ background: "transparent", border: "1.5px solid " + C.stone, color: C.muted, padding: "0.6rem 1.25rem", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: font.body, borderRadius: 8 }}>Retake</button>
                  <button onClick={() => setView("results")} style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "white", border: "none", padding: "0.6rem 1.75rem", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: font.body, borderRadius: 8, fontWeight: 600 }}>See Your Results →</button>
                </div>
              </div>
            ) : (
              <AnniversaryExercise userName={userName} partnerName={partnerName} onComplete={a => {
                  setEx3State(a);
                  try { localStorage.setItem('attune_ex3', JSON.stringify(a)); } catch {}
                  // Persist ex3 answers and mark complete in Supabase
                  if (isLoggedIn && account?.id) {
                    (async () => {
                      const { supabase: sb, hasSupabase } = await import('./supabase.js');
                      if (!hasSupabase()) return;
                      await sb.from('profiles').update({ ex3_answers: a, ex3_completed: true }).eq('id', account.id);
                    })();
                  }
                }} onBack={() => setView("home")} />
            )}
          </div>
        )}

        {/* ── CHECKLIST: Starting Out ── */}
        {view === "checklist" && pkg.hasChecklist && (
          <StartingOutChecklist userName={userName} partnerName={partnerName} onBack={() => setView("home")} checklistState={checklistState} setChecklistState={setChecklistState} />
        )}

        {/* ── BUDGET TOOL: Premium ── */}
        {view === "budget" && pkg.hasBudget && (
          <BudgetTool userName={userName} partnerName={partnerName} onBack={() => setView("home")} budgetState={budgetState} setBudgetState={setBudgetState} />
        )}

        {/* ── LMFT SESSION: Premium ── */}
        {view === "lmft" && pkg.hasLMFT && (
          <LMFTSession userName={userName} partnerName={partnerName} onBack={() => setView("home")} />
        )}

        {/* ── OUR NOTES ── */}
        {view === "notes" && (
          <NotesView userName={userName} partnerName={partnerName} notesState={notesState} setNotesState={setNotesState} onBack={() => setView("home")} />
        )}

    
        {view === "resources" && (() => {
          const BLOG_POSTS = [
            { title: "How to review your results together", href: "/practice/how-to-review-your-results-together", tag: "Guide" },
            { title: "Why couples fight about the same things", href: "/practice/why-couples-fight-about-the-same-things", tag: "Read" },
            { title: "How to start a hard conversation", href: "/practice/how-to-start-a-hard-conversation", tag: "Guide" },
            { title: "Understanding each other", href: "/practice/understanding-each-other", tag: "Read" },
            { title: "What your couple type tells you", href: "/practice/what-your-couple-type-tells-you", tag: "Read" },
            { title: "Conflict vs. repair", href: "/practice/conflict-vs-repair", tag: "Read" },
          ];
          const ADD_ONS = [
            { name: "The Personalized Workbook", desc: "A structured workbook built around your specific results and couple type.", price: "From $19", onClick: () => setView("workbook"), color: "#9B5DE5" },
            { name: "Shared Budgeting Tool", desc: "A guided financial exercise to surface what you each expect from shared finances.", price: "Add-on", href: "/offerings", color: "#1B5FE8" },
            { name: "LMFT Session", desc: "A 50-minute session with a licensed therapist who has reviewed your joint results.", price: "Add-on", href: "/offerings", color: "#E8673A" },
          ];
          return (
            <div style={{ flex: 1, overflowY: "auto", background: "#FBF8F3" }}>
              <div style={{ maxWidth: 680, margin: "0 auto", padding: isMobile ? "2rem 1.25rem" : "3rem 2rem" }}>

                {/* Header */}
                <div style={{ marginBottom: "2.5rem" }}>
                  <div style={{ fontSize: "0.58rem", letterSpacing: ".22em", textTransform: "uppercase", color: "#C17F47", fontWeight: 700, marginBottom: "0.5rem", fontFamily: font.body }}>Resources</div>
                  <h1 style={{ fontFamily: font.display, fontSize: isMobile ? "1.75rem" : "2.2rem", fontWeight: 700, color: "#0E0B07", lineHeight: 1.12, letterSpacing: "-.02em", marginBottom: "0.6rem" }}>
                    Keep going.
                  </h1>
                  <p style={{ fontSize: "0.9rem", color: "#8C7A68", lineHeight: 1.7, fontFamily: font.body, fontWeight: 300, maxWidth: 480 }}>
                    Tools to go deeper with your results, and reading to help you understand each other better.
                  </p>
                </div>

                {/* Add-ons */}
                <div style={{ marginBottom: "2.5rem" }}>
                  <div style={{ fontSize: "0.6rem", letterSpacing: ".18em", textTransform: "uppercase", color: "#0E0B07", fontWeight: 700, marginBottom: "1rem", fontFamily: font.body }}>Add-ons</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {ADD_ONS.map(addon => (
                      <div key={addon.name}
                        onClick={() => addon.onClick ? addon.onClick() : (window.location.href = addon.href)}
                        style={{ background: "white", border: `1.5px solid ${addon.color}25`, borderRadius: 14, padding: "1.1rem 1.25rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "1rem", transition: "box-shadow .15s" }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${addon.color}15`, border: `1.5px solid ${addon.color}30`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: addon.color }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0E0B07", fontFamily: font.body, marginBottom: "0.2rem" }}>{addon.name}</div>
                          <div style={{ fontSize: "0.78rem", color: "#8C7A68", fontFamily: font.body, fontWeight: 300, lineHeight: 1.45 }}>{addon.desc}</div>
                        </div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: addon.color, fontFamily: font.body, flexShrink: 0 }}>{addon.price} →</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: "#E8DDD0", marginBottom: "2.5rem" }} />

                {/* Blog posts */}
                <div style={{ marginBottom: "2rem" }}>
                  <div style={{ fontSize: "0.6rem", letterSpacing: ".18em", textTransform: "uppercase", color: "#0E0B07", fontWeight: 700, marginBottom: "1rem", fontFamily: font.body }}>From In Practice</div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.65rem" }}>
                    {BLOG_POSTS.map(post => (
                      <a key={post.href} href={post.href}
                        style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem", background: "white", border: "1.5px solid #E8DDD0", borderRadius: 14, padding: "1rem 1.1rem", textDecoration: "none", transition: "border-color .15s, box-shadow .15s" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#C8B8A8"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.05)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#E8DDD0"; e.currentTarget.style.boxShadow = "none"; }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.3rem" }}>
                            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#9B5DE5", opacity: 0.6, flexShrink: 0 }} />
                            <span style={{ fontSize: "0.62rem", fontWeight: 600, color: "#8C7A68", fontFamily: font.body, textTransform: "uppercase", letterSpacing: ".08em" }}>{post.tag}</span>
                          </div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "#0E0B07", fontFamily: font.body, lineHeight: 1.45 }}>{post.title}</div>
                        </div>
                        <span style={{ fontSize: "0.85rem", color: "#C8BFB4", flexShrink: 0, marginTop: 2 }}>→</span>
                      </a>
                    ))}
                  </div>
                </div>

                {/* CTA to In Practice */}
                <a href="/practice"
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg, #FBF8F3, #F3EDE6)", border: "1.5px solid #E8DDD0", borderRadius: 14, padding: "1.25rem 1.4rem", textDecoration: "none" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#C8B8A8"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#E8DDD0"}>
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0E0B07", fontFamily: font.body, marginBottom: "0.25rem" }}>Explore all Attune publications</div>
                    <div style={{ fontSize: "0.78rem", color: "#8C7A68", fontFamily: font.body, fontWeight: 300 }}>Guides, reads, and exercises for every stage of a relationship.</div>
                  </div>
                  <span style={{ fontSize: "1.1rem", color: "#C17F47", flexShrink: 0, marginLeft: "1rem" }}>→</span>
                </a>

              </div>
            </div>
          );
        })()}


        {view === "account" && (() => {
          const pkgInfo = pkgConfig[demoPkg] || pkgConfig.core;
          const PACKAGE_FEATURES = {
            core:        { name: "The Attune Assessment", color: "#E8673A", features: ["Communication exercise", "Expectations exercise", "Full joint results", "Couple type profile"] },
            newlywed:    { name: "Starting Out Collection", color: "#E8673A", features: ["Everything in Assessment", "Starting Out checklist", "Partner comparison deep-dives"] },
            anniversary: { name: "Relationship Reflection", color: "#1B5FE8", features: ["Everything in Assessment", "Relationship reflection exercise", "Anniversary-specific prompts"] },
            premium:     { name: "Attune Premium", color: "#3B5BDB", features: ["Everything in Assessment", "Shared budgeting tool", "LMFT session included", "Personalized workbook"] },
          };
          const pkg2 = PACKAGE_FEATURES[demoPkg] || PACKAGE_FEATURES.core;
          return (
            <div style={{ flex: 1, overflowY: "auto", background: "#FBF8F3" }}>
              <div style={{ maxWidth: 620, margin: "0 auto", padding: isMobile ? "2rem 1.25rem" : "3rem 2rem" }}>

                {/* Header */}
                <div style={{ marginBottom: "2.5rem" }}>
                  <div style={{ fontSize: "0.58rem", letterSpacing: ".22em", textTransform: "uppercase", color: "#C17F47", fontWeight: 700, marginBottom: "0.5rem", fontFamily: font.body }}>Account</div>
                  <h1 style={{ fontFamily: font.display, fontSize: isMobile ? "1.75rem" : "2.1rem", fontWeight: 700, color: "#0E0B07", lineHeight: 1.1, letterSpacing: "-.02em" }}>
                    {userName || "Your"} & {partnerName || "Partner"}
                  </h1>
                </div>

                {/* Personal info */}
                <div style={{ background: "white", border: "1.5px solid #E8DDD0", borderRadius: 16, marginBottom: "1.25rem", overflow: "hidden" }}>
                  <div style={{ padding: "1rem 1.35rem", borderBottom: "1px solid #F3EDE6" }}>
                    <div style={{ fontSize: "0.6rem", letterSpacing: ".18em", textTransform: "uppercase", color: "#8C7A68", fontWeight: 700, fontFamily: font.body }}>Personal info</div>
                  </div>
                  {[
                    { label: "Your name", value: userName || "—" },
                    { label: "Partner's name", value: partnerName || "—" },
                    { label: "Your pronouns", value: userPronouns || "Not set" },
                    { label: "Partner's pronouns", value: partnerPronouns || "Not set" },
                    { label: "Email", value: account?.email || (isLoggedIn ? "Signed in" : "Not signed in") },
                  ].map((row, i, arr) => (
                    <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1.35rem", borderBottom: i < arr.length - 1 ? "1px solid #F9F6F1" : "none", gap: "1rem" }}>
                      <span style={{ fontSize: "0.82rem", color: "#8C7A68", fontFamily: font.body, flexShrink: 0 }}>{row.label}</span>
                      <span style={{ fontSize: "0.85rem", color: "#0E0B07", fontFamily: font.body, fontWeight: 500, textAlign: "right" }}>{row.value}</span>
                    </div>
                  ))}
                  <div style={{ padding: "0.85rem 1.35rem", borderTop: "1px solid #F3EDE6" }}>
                    <button onClick={() => setShowProfileSetup(true)}
                      style={{ fontSize: "0.75rem", fontWeight: 600, color: "#E8673A", fontFamily: font.body, background: "none", border: "none", cursor: "pointer", padding: 0, letterSpacing: ".02em" }}>
                      Edit profile →
                    </button>
                  </div>
                </div>

                {/* Package */}
                <div style={{ background: "white", border: "1.5px solid #E8DDD0", borderRadius: 16, marginBottom: "1.25rem", overflow: "hidden" }}>
                  <div style={{ padding: "1rem 1.35rem", borderBottom: "1px solid #F3EDE6" }}>
                    <div style={{ fontSize: "0.6rem", letterSpacing: ".18em", textTransform: "uppercase", color: "#8C7A68", fontWeight: 700, fontFamily: font.body }}>Your package</div>
                  </div>
                  <div style={{ padding: "1.1rem 1.35rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: pkg2.color, flexShrink: 0 }} />
                      <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#0E0B07", fontFamily: font.body }}>{pkg2.name}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {pkg2.features.map(f => (
                        <div key={f} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6.5" fill={pkg2.color + "18"} stroke={pkg2.color + "40"}/><path d="M4 7l2 2 4-4" stroke={pkg2.color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          <span style={{ fontSize: "0.82rem", color: "#3C3C43", fontFamily: font.body }}>{f}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #F3EDE6" }}>
                      <button onClick={() => setShowPackagesModal(true)} style={{ fontSize: "0.75rem", fontWeight: 600, color: "#E8673A", fontFamily: font.body, background: "none", border: "none", cursor: "pointer", padding: 0, letterSpacing: ".02em" }}>
                        Explore other packages →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Exercise status */}
                <div style={{ background: "white", border: "1.5px solid #E8DDD0", borderRadius: 16, marginBottom: "1.25rem", overflow: "hidden" }}>
                  <div style={{ padding: "1rem 1.35rem", borderBottom: "1px solid #F3EDE6" }}>
                    <div style={{ fontSize: "0.6rem", letterSpacing: ".18em", textTransform: "uppercase", color: "#8C7A68", fontWeight: 700, fontFamily: font.body }}>Progress</div>
                  </div>
                  {[
                    { label: "Communication exercise", done: !!ex1Answers, who: `${userName || "You"}` },
                    { label: "Expectations exercise", done: !!ex2Answers, who: `${userName || "You"}` },
                    { label: `${partnerName || "Partner"}'s communication`, done: !!partnerEx1, who: partnerName || "Partner" },
                    { label: `${partnerName || "Partner"}'s expectations`, done: !!partnerEx2, who: partnerName || "Partner" },
                  ].map((row, i, arr) => (
                    <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1.35rem", borderBottom: i < arr.length - 1 ? "1px solid #F9F6F1" : "none", gap: "1rem" }}>
                      <span style={{ fontSize: "0.82rem", color: "#3C3C43", fontFamily: font.body }}>{row.label}</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: row.done ? "#065f46" : "#C17F47", fontFamily: font.body, background: row.done ? "rgba(16,185,129,0.1)" : "#FDF8F3", padding: "2px 10px", borderRadius: 99 }}>
                        {row.done ? "Complete" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Sign out */}
                {isLoggedIn && (
                  <div style={{ background: "white", border: "1.5px solid #E8DDD0", borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ padding: "1rem 1.35rem", borderBottom: "1px solid #F3EDE6" }}>
                      <div style={{ fontSize: "0.6rem", letterSpacing: ".18em", textTransform: "uppercase", color: "#8C7A68", fontWeight: 700, fontFamily: font.body }}>Session</div>
                    </div>
                    <div style={{ padding: "0.85rem 1.35rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.82rem", color: "#8C7A68", fontFamily: font.body }}>Signed in as {account?.email || userName}</span>
                      <button
                        onClick={async () => {
                          const { supabase: sb, hasSupabase } = await import('./supabase.js');
                          if (hasSupabase()) await sb.auth.signOut();
                          setAccount(null);
                          try { localStorage.removeItem("attune_account"); } catch {}
                          setView("home");
                        }}
                        style={{ fontSize: "0.75rem", fontWeight: 600, color: "#ef4444", fontFamily: font.body, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        Sign out
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          );
        })()}


        {view === "workbook" && (
          <div style={{ minHeight: "calc(100vh)", background: "#FBF8F3", display: "flex", flexDirection: "column" }}>
            {/* Content — no separate header; global nav handles back navigation */}
            {/* Gradient accent bar at very top */}
            <div style={{ height: 3, background: "linear-gradient(90deg, #E8673A, #9B5DE5, #1B5FE8)", flexShrink: 0 }} />

            {/* Content */}
            <div style={{ maxWidth: 680, margin: "0 auto", width: "100%", padding: isMobile ? "2rem 1.25rem" : "3rem 2rem" }}>
              {/* Hero */}
              <div style={{ marginBottom: "2.5rem" }}>
                <div style={{ fontSize: "0.6rem", letterSpacing: ".22em", textTransform: "uppercase", color: "#C17F47", fontWeight: 700, marginBottom: "0.6rem", fontFamily: "'DM Sans', sans-serif" }}>Add-on</div>
                <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: isMobile ? "1.75rem" : "2.3rem", fontWeight: 700, color: "#0E0B07", lineHeight: 1.1, letterSpacing: "-.02em", marginBottom: "1rem" }}>
                  The Personalized Workbook
                </h1>
                <p style={{ fontSize: "0.92rem", color: "#5C4F45", lineHeight: 1.78, fontWeight: 300, marginBottom: 0, fontFamily: "'DM Sans', sans-serif", maxWidth: 520 }}>
                  A structured workbook, personalised to your results. The format is consistent across couples — the content inside reflects your specific dimensions, your couple type, and the expectations gaps that are actually yours.
                </p>
              </div>

              {/* Pull quote */}
              <div style={{ borderLeft: "3px solid #9B5DE5", paddingLeft: "1.25rem", marginBottom: "2.5rem" }}>
                <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.05rem", fontStyle: "italic", color: "#3C3430", lineHeight: 1.7, margin: 0 }}>
                  "Most relationship content is written for every couple. This is written for yours."
                </p>
              </div>

              {/* Gradient border teaser card */}
              <div style={{ borderRadius: 16, marginBottom: "2rem", position: "relative", padding: "1.5px" }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: 16, background: "linear-gradient(135deg, #E8673A, #9B5DE5, #1B5FE8)" }} />
                <div style={{ position: "relative", background: "white", borderRadius: 15, padding: "1.75rem 1.75rem" }}>
                  <div style={{ fontSize: "0.65rem", letterSpacing: ".2em", textTransform: "uppercase", color: "#9B5DE5", fontWeight: 700, marginBottom: "1rem", fontFamily: "'DM Sans', sans-serif" }}>What's inside</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {[
                      "Conversation starters drawn from your specific dimension gaps",
                      "Reflection activities built around your couple type and patterns",
                      "Guided exercises for the expectation areas where you diverged most",
                      "A structured format for going deeper together, at your own pace",
                    ].map(item => (
                      <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "linear-gradient(135deg, #E8673A, #9B5DE5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <span style={{ fontSize: "0.88rem", color: "#1E1610", lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid #E8DDD0", fontSize: "0.8rem", color: "#8C7A68", fontFamily: "'DM Sans', sans-serif" }}>
                    Typically 20–30 pages depending on your results. Structured to work through together at your own pace.
                  </div>
                </div>
              </div>

              {/* Pricing options */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1rem", marginBottom: "1.75rem" }}>
                {[
                  { format: "Digital PDF", price: "$19", detail: "Instant delivery · print or read on screen" },
                  { format: "Printed & Bound", price: "$39", detail: "Ships within 5–7 business days" },
                ].map(opt => (
                  <div key={opt.format} style={{ background: "white", border: "1.5px solid #E8DDD0", borderRadius: 14, padding: "1.25rem" }}>
                    <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0E0B07", marginBottom: "0.35rem", fontFamily: "'DM Sans', sans-serif" }}>{opt.format}</div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0E0B07", fontFamily: "'Playfair Display', Georgia, serif", marginBottom: "0.35rem" }}>{opt.price}</div>
                    <div style={{ fontSize: "0.75rem", color: "#8C7A68", lineHeight: 1.55, fontFamily: "'DM Sans', sans-serif" }}>{opt.detail}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: "#FAF7F2", border: "1px solid #E8DDD0", borderRadius: 14, padding: "1.25rem 1.4rem", marginBottom: "2rem" }}>
                <div style={{ fontSize: "0.6rem", letterSpacing: ".18em", textTransform: "uppercase", color: "#8C7A68", fontWeight: 700, marginBottom: "0.6rem", fontFamily: "'DM Sans', sans-serif" }}>Availability</div>
                <p style={{ fontSize: "0.85rem", color: "#5C4F45", lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif", fontWeight: 300, margin: 0 }}>
                  Available after you complete both exercises. Your workbook is generated from your actual answers — we'll email you when it's ready, usually within 24 hours.
                </p>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <a href="/offerings" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "linear-gradient(135deg, #E8673A, #9B5DE5, #1B5FE8)", color: "white", padding: "0.85rem 1.75rem", borderRadius: 12, fontSize: "0.82rem", fontWeight: 700, textDecoration: "none", fontFamily: "'DM Sans', sans-serif", letterSpacing: ".04em", textTransform: "uppercase" }}>
                  Add to order →
                </a>
                <a href="/offerings" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "transparent", color: "#8C7A68", padding: "0.85rem 1.25rem", borderRadius: 12, fontSize: "0.82rem", fontWeight: 500, textDecoration: "none", fontFamily: "'DM Sans', sans-serif", border: "1.5px solid #E8DDD0" }}>
                  See all packages
                </a>
              </div>
            </div>
          </div>
        )}

{view === "results" && !highlightsSeen && (
      <ResultsHighlights
        ex1Answers={ex1Answers || sarahEx1} partnerEx1={partnerEx1}
        ex2Answers={ex2Answers || sarahEx2} partnerEx2={partnerEx2}
        ex3Answers={ex3Answers || (pkg.hasAnniversary ? SARAH_ANNIVERSARY_DEMO : null)}
        partnerEx3={pkg.hasAnniversary ? (partnerSession?.ex3 || (hasRealPartner ? null : JAMES_ANNIVERSARY_DEMO)) : null}
        userName={userName} partnerName={partnerName}
        portrait={couplePortrait}
        onDone={() => setHighlightsSeen(true)}
      />
    )}
    {view === "results" && highlightsSeen && (
          <div style={{ position: "fixed", top: 56, left: 0, right: 0, bottom: 60, display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 50, background: C.warm, paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div style={{ background: "rgba(255,253,249,0.97)", backdropFilter: "blur(12px)", borderBottom: ("1px solid " + (C.stone)), padding: isMobile ? "0.75rem 1rem" : "0.9rem 1.5rem", flexShrink: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button onClick={() => setView("home")} style={{ background: "transparent", border: "none", color: C.clay, fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: font.body, padding: 0, fontWeight: 600, flexShrink: 0 }}>← {isMobile ? "" : "Dashboard"}</button>
              {activeResult !== "overview" && (
                <>
                  {!isMobile && <span style={{ color: C.clay, fontSize: "1rem", fontWeight: 700, lineHeight: 1, margin: "0 4px", opacity: 0.7 }}>›</span>}
                  {!isMobile && <button onClick={() => { setActiveResult("overview"); document.querySelector("[data-results-scroll]") && (document.querySelector("[data-results-scroll]").scrollTop = 0); }}
                    style={{ background: "transparent", border: "none", color: C.clay, fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: font.body, padding: 0, fontWeight: 600 }}>Overview</button>}
                  <span style={{ color: C.clay, fontSize: isMobile ? "0.9rem" : "1rem", fontWeight: 700, lineHeight: 1, margin: "0 4px", opacity: 0.7 }}>›</span>
                  <span style={{ fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.ink, fontFamily: font.body, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {activeResult === "personality" || activeResult?.startsWith("comm") ? "Comms"
                      : activeResult === "expectations" || activeResult?.startsWith("exp") ? "Expectations"
                      : activeResult?.startsWith("reflection") ? "Reflection"
                      : activeResult === "what-comes-next" ? "What's Next"
                      : activeResult || "Results"}
                  </span>
                </>
              )}
              {/* Beta feedback link — right side, hidden on mobile */}
              {!isMobile && <a href="/feedback"
                style={{ marginLeft: "auto", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.clay, fontFamily: font.body, fontWeight: 600, textDecoration: "none", opacity: 0.6, display: "flex", alignItems: "center", gap: "0.3rem", transition: "opacity 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                onMouseLeave={e => e.currentTarget.style.opacity = "0.6"}>
                ✦ Beta feedback
              </a>}
            </div>
            {/* Mobile sticky sub-section nav */}
            {isMobile && (() => {
              const inRefl = activeResult && activeResult.startsWith("reflection");
              const inComm = activeResult === "personality" || activeResult && activeResult.startsWith("comm");
              const inExp = activeResult === "expectations" || activeResult && activeResult.startsWith("exp");
              let subnav = [];
              if (inRefl) {
                subnav = [
                  { label: "Overview", id: "reflection-overview" },
                  { label: "Insights", id: "reflection-insights" },
                  { label: "Side by Side", id: "reflection-story" },
                  { label: "Action Plan", id: "reflection-plan" },
                ];
              } else if (inComm) {
                subnav = [
                  { label: "Overview", id: "comm-overview" },
                  { label: "By Dimension", id: "personality" },
                  { label: "Side by Side", id: "comm-detail" },
                  { label: "Action Plan", id: "comm-action" },
                ];
              } else if (inExp) {
                subnav = [
                  { label: "Overview", id: "exp-overview" },
                  { label: "Expectations", id: "expectations" },
                  { label: "Action Plan", id: "exp-action" },
                ];
              }
              if (!subnav.length) return null;
              return (
                <div style={{ display: "flex", overflowX: "auto", gap: 0, background: "white", borderBottom: "1px solid " + C.stone, flexShrink: 0, WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
                  <style>{".subnav-scroll::-webkit-scrollbar{display:none}"}</style>
                  <div className="subnav-scroll" style={{ display: "flex", padding: "0 0.5rem" }}>
                    {subnav.map(item => {
                      const isActive = activeResult === item.id || (item.id === "reflection-overview" && activeResult === "reflection") || (item.id === "comm-overview" && activeResult === "overview");
                      return (
                        <button key={item.id}
                          onClick={() => { setActiveResult(item.id); document.querySelector("[data-results-scroll]") && (document.querySelector("[data-results-scroll]").scrollTop = 0); }}
                          style={{ background: "none", border: "none", borderBottom: isActive ? "2px solid #E8673A" : "2px solid transparent", padding: "0.6rem 0.85rem", fontSize: "0.7rem", fontWeight: isActive ? 700 : 400, color: isActive ? "#0E0B07" : "#8C7A68", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s", flexShrink: 0 }}>
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            <div data-results-scroll style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", scrollPaddingBottom: "60px" }}>
              <div style={{ maxWidth: 920, margin: "0 auto", padding: isMobile ? "1rem 1rem 0" : "1.25rem 1.5rem 0" }}>
                <UnifiedResults
                  isMobile={isMobile}
                  ex1Answers={ex1Answers || sarahEx1} partnerEx1={partnerEx1}
                  ex2Answers={ex2Answers || sarahEx2} partnerEx2={partnerEx2}
                  ex3Answers={ex3Answers || (pkg.hasAnniversary ? SARAH_ANNIVERSARY_DEMO : null)}
                  partnerEx3={pkg.hasAnniversary ? (partnerSession?.ex3 || (hasRealPartner ? null : JAMES_ANNIVERSARY_DEMO)) : null}
                  hasAnniversary={pkg.hasAnniversary}
                  userName={userName} partnerName={partnerName}
                  userPronouns={userPronouns} partnerPronouns={partnerPronouns}
                  portrait={couplePortrait}
                  hasChecklist={pkg.hasChecklist}
                  hasBudget={pkg.hasBudget}
                  hasLMFT={pkg.hasLMFT}
                  onNavigateTool={(tool) => { if (tool === 'lmft-upsell') { setUpsellModal({ product: 'lmft', cartAdded: false }); } else { setView(tool); } }}
                  initialSection={activeResult !== "overview" ? activeResult : undefined}
                />
              </div>
              {/* Dark footer banner — inside pane so it scrolls into view */}
              <div style={{ marginTop: "3rem", background: "#2d2250", width: "100%", paddingBottom: "3rem" }}>
                <div style={{ maxWidth: 920, margin: "0 auto", padding: "3rem 1.5rem 0" }}>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 2fr", gap: isMobile ? "1.5rem" : "3rem", paddingBottom: "2.5rem", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                      <svg width="36" height="26" viewBox="0 0 103 76" fill="none"><defs><linearGradient id="ftGrad" x1="0" y1="0" x2="103" y2="76" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#E8673A"/><stop offset="100%" stopColor="#1B5FE8"/></linearGradient></defs><path d="M14,4 L44,4 A9,9 0 0,1 53,13 L53,42 A9,9 0 0,1 44,51 L20,51 L6,61 L11,51 A6,6 0 0,1 5,45 L5,13 A9,9 0 0,1 14,4 Z" fill="url(#ftGrad)"/><path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="white" opacity="0.93" transform="translate(13.16,11.3) scale(0.72)"/><path d="M89,14 L59,14 A9,9 0 0,0 50,23 L50,52 A9,9 0 0,0 59,61 L83,61 L97,71 L92,61 A6,6 0 0,0 98,55 L98,23 A9,9 0 0,0 89,14 Z" fill="white" stroke="url(#ftGrad)" strokeWidth="2.2" strokeLinejoin="round"/><path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="url(#ftGrad)" transform="translate(58.16,21.3) scale(0.72)"/></svg>
                      <span style={{ fontFamily: HFONT, fontSize: "1.05rem", fontWeight: 700, color: "white" }}>Attune</span>
                    </div>
                    <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,.4)", lineHeight: 1.7, fontFamily: BFONT, fontWeight: 300 }}>Understand each other deeply.<br/>And how to grow together.</p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: "1.5rem" }}>
                    {[
                      { title: "Product", links: [["Home", "/home"], ["How it works", "/methodology"], ["Gifts & Packages", "/offerings"], ["Get started", "/portal"]] },
                      { title: "Learn", links: [["How it works", "/methodology"], ["Packages & pricing", "/offerings"], ["Resources", "/resources"], ["FAQs", "/faq"], ["Reviews", "/reviews"]] },
                      { title: "Support", links: [["FAQs", "/faq"], ["Contact us", "mailto:hello@attune-relationships.com"], ["Privacy policy", "/legal"], ["Terms of service", "/legal#terms"]] },
                    ].map(({ title, links }) => (
                      <div key={title}>
                        <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,.3)", fontFamily: BFONT, fontWeight: 700, marginBottom: "0.85rem" }}>{title}</div>
                        {links.map(([label, href]) => (
                          <a key={label} href={href} style={{ display: "block", fontSize: "0.82rem", color: "rgba(255,255,255,.80)", textDecoration: "none", marginBottom: "0.5rem", fontFamily: BFONT, transition: "color .15s" }}
                            onMouseOver={e => e.target.style.color = "rgba(255,255,255,.85)"}
                            onMouseOut={e => e.target.style.color = "rgba(255,255,255,.80)"}
                          >{label}</a>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 0", flexWrap: "wrap", gap: "0.5rem" }}>
                  <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,.25)", fontFamily: BFONT, margin: 0 }}>Attune Relationships™</p>
                  <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,.25)", fontFamily: BFONT, margin: 0 }}>hello@attune-relationships.com</p>
                </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Footer peek strip — visible below results pane when in results view */}
        {view === "results" && highlightsSeen && (
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 60, background: "#2d2250", zIndex: 49, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem", gap: "1rem", overflow: "hidden" }}>
            <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontFamily: BFONT, fontWeight: 300, letterSpacing: "0.04em" }}>Attune Relationships™</span>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "nowrap" }}>
              {[["Home", "/home"], ["Packages", "/offerings"], ["FAQs", "/faq"], ["Contact", "mailto:hello@attune-relationships.com"]].map(([label, href]) => (
                <a key={label} href={href} style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", textDecoration: "none", fontFamily: BFONT, transition: "color .15s" }}
                  onMouseOver={e => e.target.style.color = "rgba(255,255,255,0.85)"}
                  onMouseOut={e => e.target.style.color = "rgba(255,255,255,0.5)"}
                >{label}</a>
              ))}
            </div>
          </div>
        )}

    </div>
    {showPortraitSetup && (
      <PortraitSetup
        userName={userName}
        partnerName={partnerName}
        existing={couplePortrait}
        onSave={savePortrait}
        onClose={() => setShowPortraitSetup(false)}
      />
    )}

    {/* ── UPSELL MODAL ── */}
    {upsellModal && (
      <UpsellModal
        product={upsellModal.product}
        cartAdded={upsellModal.cartAdded}
        onAddToCart={(product, variant) => setUpsellModal({ product, variant, cartAdded: true })}
        onCheckout={() => {
          const prod = upsellModal.product;
          setUpsellModal(null);
          if (prod === 'lmft') {
            // LMFT is an add-on purchasable on any package — go to checkout with current pkg + lmft
            const currentPkg = Object.keys({ core: 1, newlywed: 1, anniversary: 1, premium: 1 }).includes(demoPkg) ? demoPkg : 'core';
            window.location.href = `/checkout?pkg=${currentPkg}&addon_lmft=1`;
          } else {
            window.location.href = "/offerings#pkg-" + (UPSELL_PRODUCTS[prod]?.cartParam || "core");
          }
        }}
        onClose={() => setUpsellModal(null)}
      />
    )}

    {/* ── PACKAGES MODAL — "Explore other packages" ── */}
    {showPackagesModal && (
      <PackagesModal
        currentPkg={demoPkg}
        onClose={() => setShowPackagesModal(false)}
        onPick={(pkgId) => {
          setShowPackagesModal(false);
          window.location.href = `/checkout?pkg=${pkgId}`;
        }}
      />
    )}

    {/* ── AUTH MODAL ── */}
    {showAuth && (
      <AuthModal
        mode={authMode}
        onClose={() => setShowAuth(false)}
        onSuccess={(acct) => {
          // Pre-populate partner names from checkout URL params if available
          const _p1 = params.get('p1');
          const _p2 = params.get('p2');
          const enriched = {
            ...acct,
            ...((_p1 && !acct.name) ? { name: _p1 } : {}),
            ...((_p2 && !acct.partnerName) ? { partnerName: _p2 } : {}),
          };
          setAccount(enriched);
          saveAccount(enriched);
          setShowAuth(false);
          // Strip signup param from URL so refresh doesn't re-open modal
          const _clean = new URL(window.location.href);
          _clean.searchParams.delete('signup');
          window.history.replaceState({}, '', _clean.toString());
        }}
      />
    )}

    {/* ── PROFILE SETUP MODAL (inline edit panel) ── */}
    {showProfileSetup && (() => {
      const PronounPicker = ({ label, fieldKey, accentColor, bgColor }) => {
        const [sel, setSel] = React.useState(account?.[fieldKey] || "");
        React.useEffect(() => { document.getElementById(`profile_${fieldKey}_val`).value = sel; }, [sel]);
        return (
          <div style={{ marginBottom: "0.65rem" }}>
            <div style={{ fontSize: "0.65rem", color: "#8C7A68", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, marginBottom: "0.35rem", letterSpacing: "0.04em" }}>{label}</div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {["she/her","he/him","they/them"].map(p => (
                <button key={p} onClick={() => setSel(sel === p ? "" : p)} type="button"
                  style={{ flex: 1, padding: "0.4rem 0.2rem", borderRadius: 8, border: `1.5px solid ${sel===p ? accentColor : "#E8DDD0"}`, background: sel===p ? bgColor : "white", color: sel===p ? accentColor : "#8C7A68", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.12s" }}>
                  {p}
                </button>
              ))}
            </div>
            <input type="hidden" id={`profile_${fieldKey}_val`} defaultValue={sel} />
          </div>
        );
      };
      return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={e => e.target === e.currentTarget && setShowProfileSetup(false)}>
          <div style={{ background: "#FFFDF9", borderRadius: 22, padding: "2rem", width: "100%", maxWidth: 440, boxShadow: "0 32px 80px rgba(0,0,0,0.28)", position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
            <button onClick={() => setShowProfileSetup(false)} style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#8C7A68" }}>✕</button>
            <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "1.2rem", fontWeight: 700, color: "#0E0B07", marginBottom: "1.5rem" }}>Your profile</div>
            <div style={{ fontSize: "0.7rem", color: "#8C7A68", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, marginBottom: "0.35rem", letterSpacing: "0.04em" }}>Your name</div>
            <input type="text" placeholder="Your first name" defaultValue={account?.name || ""} id="profile_name"
              style={{ width: "100%", padding: "0.78rem 1rem", border: "1.5px solid #E8DDD0", borderRadius: 11, fontSize: "0.88rem", fontFamily: "'DM Sans',sans-serif", color: "#0E0B07", background: "#FFFDF9", outline: "none", marginBottom: "0.65rem", boxSizing: "border-box" }} />
            <PronounPicker label="Your pronouns" fieldKey="pronouns" accentColor="#E8673A" bgColor="#FFF0EB" />
            <div style={{ borderTop: "1px solid #E8DDD0", margin: "0.75rem 0 0.85rem" }} />
            <div style={{ fontSize: "0.7rem", color: "#8C7A68", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, marginBottom: "0.35rem", letterSpacing: "0.04em" }}>Partner's name</div>
            <input type="text" placeholder="Partner's first name" defaultValue={account?.partnerName || ""} id="profile_partnerName"
              style={{ width: "100%", padding: "0.78rem 1rem", border: "1.5px solid #E8DDD0", borderRadius: 11, fontSize: "0.88rem", fontFamily: "'DM Sans',sans-serif", color: "#0E0B07", background: "#FFFDF9", outline: "none", marginBottom: "0.65rem", boxSizing: "border-box" }} />
            <PronounPicker label="Partner's pronouns" fieldKey="partnerPronouns" accentColor="#1B5FE8" bgColor="#EEF0FF" />
            <input type="email" placeholder="Partner's email (for invite)" defaultValue={account?.partnerEmail || ""} id="profile_partnerEmail"
              style={{ width: "100%", padding: "0.78rem 1rem", border: "1.5px solid #E8DDD0", borderRadius: 11, fontSize: "0.88rem", fontFamily: "'DM Sans',sans-serif", color: "#0E0B07", background: "#FFFDF9", outline: "none", marginBottom: "1.25rem", boxSizing: "border-box" }} />
            <div style={{ background: "#F3EDE6", borderRadius: 10, padding: "0.65rem 0.9rem", marginBottom: "1rem", display: "flex", gap: "0.55rem", alignItems: "flex-start" }}>
              <span style={{ fontSize: "0.78rem", flexShrink: 0 }}>✦</span>
              <p style={{ fontSize: "0.7rem", color: "#8C7A68", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.55, margin: 0 }}>Attune uses names and pronouns to personalize your results — making insights feel specific to you two.</p>
            </div>
            <button onClick={() => {
              const name = document.getElementById("profile_name")?.value.trim();
              const partnerName = document.getElementById("profile_partnerName")?.value.trim();
              const partnerEmail = document.getElementById("profile_partnerEmail")?.value.trim();
              const pronouns = document.getElementById("profile_pronouns_val")?.value || account?.pronouns || "";
              const partnerPronouns = document.getElementById("profile_partnerPronouns_val")?.value || account?.partnerPronouns || "";
              if (!name) return;
              const emailOptIn = document.getElementById('profile_emailOptIn')?.checked ?? (account?.emailOptIn !== false);
              const updated = { ...account, name, pronouns, partnerName, partnerPronouns, partnerEmail, emailOptIn };
              setAccount(updated);
              saveAccount(updated);
              setShowProfileSetup(false);
              // Persist to Supabase
              (async () => {
                const { supabase: sb, hasSupabase } = await import('./supabase.js');
                if (!hasSupabase() || !updated.id) return;
                await sb.from('profiles').update({
                  name: name || null,
                  pronouns: pronouns || '',
                  partner_name: partnerName || '',
                  partner_pronouns: partnerPronouns || '',
                  partner_email: partnerEmail || '',
                  email_opt_in: emailOptIn,
                }).eq('id', updated.id);
              })();
              // Send partner invite if email newly added
              const prevEmail = account?.partnerEmail || '';
              if (partnerEmail && partnerEmail !== prevEmail && account?.inviteCode) {
                const inviteUrl = `${window.location.origin}/app?invite=${encodeURIComponent(account.inviteCode)}&from=${encodeURIComponent(name || '')}${account?.email ? `&pae=${encodeURIComponent(account.email)}` : ''}`;
                fetch('/api/send-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ type: 'partner_invite', fromName: name, toEmail: partnerEmail, toName: partnerName || 'Your partner', inviteUrl }),
                }).catch(() => {});
              }
            }}
              style={{ width: "100%", padding: "0.9rem", background: "#0E0B07", color: "white", border: "none", borderRadius: 12, fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              Save →
            </button>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.55rem", cursor: "pointer", marginTop: "1rem" }}>
              <input type="checkbox" id="profile_emailOptIn" defaultChecked={account?.emailOptIn !== false}
                style={{ marginTop: "0.15rem", accentColor: "#E8673A", width: 14, height: 14, flexShrink: 0 }} />
              <span style={{ fontSize: "0.68rem", color: "#8C7A68", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.55 }}>
                Send me a 6-month check-in email
              </span>
            </label>
          </div>
        </div>
      );
    })()}
  </>
  );
}

