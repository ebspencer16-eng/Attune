// Shared draft content for both review docs.
//
// Keeps the Six Moments Library scenes and the Conversation Library
// prompts in one place so the build scripts can reuse them. These are
// first-draft candidates intended for review; mark edits in the .docx
// versions of the review docs, then the edits can flow back here.

// 6 moments × 4 individual types = 24 scenes. Each scene has 4 blocks.
// The subject partner is referred to as "they" throughout.
export const SCENE_DRAFTS = {
  // ── Type W — Open + Engages quickly ────────────────────────────────────
  W: {
    hard_workday: {
      happening: 'A hard day shows on them. They want it out — to vent, to process aloud, to hear that someone gets it. Holding it alone feels heavier than the day itself.',
      notTo: 'Don\'t jump straight to fixing. They\'re not asking for a solution, they\'re asking to be joined.',
      works: 'Sit down. Ask what kind of day it was. Let them tell it with no interruption. The work is being a witness, not a helper.',
      phrase: '"Tell me the whole thing. I\'ve got time."',
    },
    quiet_worry: {
      happening: 'They usually say what\'s on their mind. If they haven\'t, something\'s stuck. The worry has probably grown from small to medium because they haven\'t gotten to externalize it yet.',
      notTo: 'Don\'t ignore the quiet. For a W, silence for more than a day means something\'s there.',
      works: 'Name what you\'re noticing. Make it easy for them to start talking — a short walk, a low-stakes moment, no big setup.',
      phrase: '"You\'ve been quieter than usual. What\'s sitting with you?"',
    },
    during_conflict: {
      happening: 'They\'re in it — feelings online, words coming fast. They want to solve it now, in this conversation, while the heat is useful.',
      notTo: 'Don\'t shut down or withdraw. For a W, withdrawal reads as "you don\'t care" and makes them press harder.',
      works: 'Stay in the room. Slow the pace — your job is to add air, not to match the speed. Name what you\'re hearing before you respond.',
      phrase: '"I\'m here. Say more before I respond."',
    },
    after_conflict: {
      happening: 'They want the stitch to happen cleanly. Unresolved residue sits badly. If they sense the conversation was swept rather than closed, they\'ll loop back to it.',
      notTo: 'Don\'t leave it implicit. A W reads "we moved on" as "we haven\'t actually handled this."',
      works: 'Say out loud that you\'re good. Name what you understood and what you\'re taking from it. Physical reconnection after helps — a hug, touch, sitting close.',
      phrase: '"I heard you. I\'m sorry for my part. We\'re good."',
    },
    wanting_closeness: {
      happening: 'They\'re reaching — warm, wanting attention, wanting to be seen. The bid is often obvious (a hand, a story, a little mischief). It\'s a bid, not a demand.',
      notTo: 'Don\'t brush past it because you\'re mid-task. Missed bids accumulate and create the "you don\'t want me" story.',
      works: 'Stop what you\'re doing for thirty seconds. Turn toward them. The energy you give matters more than the duration.',
      phrase: '"Hi. I see you. Come here."',
    },
    external_stress: {
      happening: 'Something outside the relationship (work, family, health) is pressing on them. With a W, the stress usually surfaces — irritable, more physical, wanting to talk it through.',
      notTo: 'Don\'t take the irritability personally. It\'s rarely about you even when it lands on you.',
      works: 'Name that you see the load. Ask what would actually help — a vent session, a quiet night, a plan. Don\'t assume.',
      phrase: '"You\'re carrying a lot right now. What do you need from me this week?"',
    },
  },

  // ── Type X — Guarded + Engages quickly ─────────────────────────────────
  X: {
    hard_workday: {
      happening: 'A rough day goes inward first. They\'ll come to the surface once they\'ve sorted it internally, but they usually don\'t want to relive it aloud. They want to move past it.',
      notTo: 'Don\'t push them to talk about feelings while they\'re still sorting. It reads as prodding.',
      works: 'Ease. Hand them a drink, start dinner, make the environment low-demand. They\'ll come up for air when they\'re ready.',
      phrase: '"No need to talk. I\'ll start something for dinner."',
    },
    quiet_worry: {
      happening: 'They don\'t always surface worry voluntarily — they process internally and bring only what\'s resolved. If it shows, it\'s likely been there for a while.',
      notTo: 'Don\'t press for a feelings-first conversation. Start from facts and intent.',
      works: 'Ask what they\'re thinking about, not how they\'re feeling. Let them lead into the emotional layer if they want to.',
      phrase: '"What\'s been on your mind lately?"',
    },
    during_conflict: {
      happening: 'They want to resolve it, but calmly. The emotional heat of the conversation can read as counterproductive to them even when it\'s productive to you.',
      notTo: 'Don\'t read their composure as "not caring." And don\'t push for a big emotional moment during the conflict itself.',
      works: 'Match their register. Use specific, concrete language. The resolution you\'re both after is more available in the logic than in the intensity.',
      phrase: '"Let\'s find the thing we actually disagree on and stay there."',
    },
    after_conflict: {
      happening: 'Once it\'s logically resolved, they move on. They\'re usually not looking for a long reconciliation debrief. The hug is nice but the repair was in the agreement.',
      notTo: 'Don\'t re-litigate what you already settled. Don\'t require emotional processing beyond what they volunteer.',
      works: 'Confirm the agreement plainly. Then move forward. Warmth matters but in smaller doses than with a W.',
      phrase: '"Good talk. We\'re aligned. Onward."',
    },
    wanting_closeness: {
      happening: 'Their bid is often practical, not verbal — being physically nearby, watching something together, doing a shared task. Closeness comes through proximity and parallel activity.',
      notTo: 'Don\'t demand more emotional articulation than they\'re offering. "Why are you being weird" is the wrong framing.',
      works: 'Join the activity. Sit on the same couch. Let closeness build through presence, not through a conversation about it.',
      phrase: '"Come sit over here while I do this."',
    },
    external_stress: {
      happening: 'External stress gets compartmentalized. They may seem fine until they\'re not, and they usually don\'t broadcast the load.',
      notTo: 'Don\'t wait for them to name it. They often won\'t.',
      works: 'Take something off their plate without asking permission. Small, specific, practical. Logistics before emotions.',
      phrase: '"I\'ve got dinner and the kids tonight. Go do what you need to do."',
    },
  },

  // ── Type Y — Open + Needs space ────────────────────────────────────────
  Y: {
    hard_workday: {
      happening: 'They\'re fried. They\'ll process feelings eventually — they\'re a Y, not a Z — but first they need decompression time alone to reset.',
      notTo: 'Don\'t meet them at the door with questions. Arrival is the worst time to talk about it.',
      works: 'A soft landing. A quiet welcome, maybe a drink or a shower, and the clear signal that they can take a beat. The conversation will be better later.',
      phrase: '"Take a bit. I\'ll be here when you\'re ready."',
    },
    quiet_worry: {
      happening: 'A Y will usually share worries, but only after they\'ve had enough space to sit with them privately first. Prolonged quiet means the sitting-with hasn\'t finished yet.',
      notTo: 'Don\'t push for the conversation before they\'ve had time with it alone. You\'ll get a surface version and they\'ll resent the interruption.',
      works: 'Make a window later in the day. A shared activity that invites talking without requiring it — a walk, a drive. They\'ll talk when the container feels right.',
      phrase: '"Want to go on a walk after dinner?"',
    },
    during_conflict: {
      happening: 'They\'re expressive but can get overwhelmed mid-conflict. When the overwhelm hits, the ability to form words drops, even though they have plenty to say.',
      notTo: 'Don\'t flood them with more input when they\'re at capacity. "Answer me" is exactly wrong.',
      works: 'Offer a pause. Not an escape — a pause with a return time. Say when you\'ll come back to it and mean it.',
      phrase: '"Let\'s take twenty minutes and come back. I\'m not dropping this."',
    },
    after_conflict: {
      happening: 'They need time to feel settled before they know if things are actually okay. They\'ll come back to it — maybe hours later, maybe the next morning — and want to add the final piece.',
      notTo: 'Don\'t declare it done before they\'re ready. And don\'t be surprised when they bring it back up after it seemed closed.',
      works: 'Leave space open. Check in the next day with no agenda. Let them finish processing in their own rhythm.',
      phrase: '"Still thinking about yesterday? Anything else you wanted to say?"',
    },
    wanting_closeness: {
      happening: 'Their bid for closeness is often tentative — a little shy, a little soft. They want to be met but they won\'t chase if you miss the first one or two.',
      notTo: 'Don\'t miss the quiet version. A Y\'s bid is gentle by design.',
      works: 'Match their energy with warmth but not intensity. Soft attention. A slow turning-toward rather than a big dramatic response.',
      phrase: '"I was just thinking about you. Come here."',
    },
    external_stress: {
      happening: 'External stress often shows up as withdrawal — less energy for the relationship, earlier bedtimes, a kind of muted version of them.',
      notTo: 'Don\'t interpret the withdrawal as being about you. And don\'t try to jolly them out of it.',
      works: 'Protect their rest. Lower the relational demand for the week. Trust that they\'ll come back when the load lifts.',
      phrase: '"This week can be low-key. I\'ve got the logistics."',
    },
  },

  // ── Type Z — Guarded + Needs space ─────────────────────────────────────
  Z: {
    hard_workday: {
      happening: 'They come home and go quiet. Hard days don\'t spill — they get shelved. The shelving is the recovery.',
      notTo: 'Don\'t ask how their day was and expect a real answer right away. Don\'t read the silence as distance from you.',
      works: 'Give them an hour or two. Don\'t hover. A Z processes best in solitude, and you\'ll get more of them later if you give that now.',
      phrase: '"I\'ll be in the living room whenever."',
    },
    quiet_worry: {
      happening: 'A Z\'s worry rarely surfaces on its own. They hold it, sort it, and may decide it\'s not worth bringing up. By the time you notice, it\'s been there a while.',
      notTo: 'Don\'t corner them about it. A direct "what\'s wrong" almost always gets a "nothing."',
      works: 'Mention a specific, concrete observation. Then give them room to respond in their own time — even a day later. The window stays open longer than you think.',
      phrase: '"You seemed off at dinner. I\'m here if you want to talk."',
    },
    during_conflict: {
      happening: 'They go quiet or flat mid-conflict. It\'s not stonewalling — it\'s the processor struggling to keep up with the input while also managing the feelings.',
      notTo: 'Don\'t keep talking at them when they\'ve gone quiet. More words is the opposite of what helps.',
      works: 'Stop. Say you\'re willing to pick this up later. Give them a clear return time and then honor it. They\'ll come back with more to say than they had in the moment.',
      phrase: '"I want to hear you. Let\'s come back to this tomorrow."',
    },
    after_conflict: {
      happening: 'A Z often goes even quieter after conflict than during. They\'re rebuilding their relationship to you internally and it takes time. They\'re not holding a grudge.',
      notTo: 'Don\'t require them to perform repair on your timeline. Don\'t read their quiet as punishment.',
      works: 'Low-key presence. Don\'t pretend nothing happened but don\'t require processing either. Normal kindness, normal routines, and patience.',
      phrase: '"No pressure to talk about it. Just glad you\'re here."',
    },
    wanting_closeness: {
      happening: 'Their closeness bids are the subtlest of any type — a touch on the arm, sitting closer than usual, a small act of care. If you miss it, they usually won\'t try again that day.',
      notTo: 'Don\'t be skeptical of the bid because it\'s quiet. Don\'t need them to explain or repeat it.',
      works: 'Receive it. Match the register. A hand back, a leaning in, a small acknowledgment that you noticed. Nothing big.',
      phrase: '"I like when you do that."',
    },
    external_stress: {
      happening: 'External stress makes a Z even more internal. They\'ll handle it alone unless explicitly invited not to, and even then the invitation may take time to sink in.',
      notTo: 'Don\'t wait for a crisis signal. With a Z, you\'ll often miss the chance if you do.',
      works: 'Name what you\'re seeing. Offer specific help, not a general "let me know." Then let them choose when to take you up on it.',
      phrase: '"I\'m taking dinner off your list this week. Whatever else is helpful, tell me."',
    },
  },
};

// 25 prompts — 5 per situation. Tagged with couple types they fit best, or ALL.
export const PROMPT_DRAFTS = {
  1: [ // At dinner on a quiet night
    { prompt: "What's something you noticed this week that you didn't tell me about yet?", tags: 'ALL' },
    { prompt: "What's one thing you're thinking about lately that I probably don't know?", tags: 'XZ, YZ, ZZ' },
    { prompt: "If you had a completely free Saturday next month, what would you actually want to do?", tags: 'ALL' },
    { prompt: "What's a compliment about you that you don't quite believe?", tags: 'WY, WX, WW' },
    { prompt: "What's something small I could start doing that would make your weeks a little easier?", tags: 'ALL' },
  ],
  2: [ // After a hard week
    { prompt: "What was the hardest part of this week — not the busiest, the hardest?", tags: 'ALL' },
    { prompt: "What do you need for the rest of tonight? I'll work around it.", tags: 'ALL' },
    { prompt: "Is there anything you wish I'd noticed this week that I didn't?", tags: 'WY, YZ, XY' },
    { prompt: "What would help you feel like yourself again tomorrow?", tags: 'YY, YZ, WY' },
    { prompt: "Do you want me to sit with it, or would distraction help more right now?", tags: 'ALL' },
  ],
  3: [ // When one of you is off but won't say why
    { prompt: "Something feels off to me, and I'm not sure what. Do you know what it is?", tags: 'ALL' },
    { prompt: "I'm not trying to fix anything. I just want to know what's there.", tags: 'XY, XZ, ZZ' },
    { prompt: "If you could name one thing that's been sitting in the background, what would it be?", tags: 'YZ, ZZ, XZ' },
    { prompt: "Is it me, or is it something else? Either answer is okay.", tags: 'WX, XY, WY' },
    { prompt: "Do you want to talk now, or would later be easier?", tags: 'YY, YZ, WY, ZZ' },
  ],
  4: [ // Before a difficult conversation
    { prompt: "Before I say this — what do you need from me to hear it well?", tags: 'ALL' },
    { prompt: "I want to talk about something hard. Can we agree we're on the same team first?", tags: 'WX, XX, WW' },
    { prompt: "This isn't urgent, but I want to bring it up when you have capacity. When's good?", tags: 'YY, YZ, ZZ' },
    { prompt: "If this goes sideways, how do we want to come back to it?", tags: 'ALL' },
    { prompt: "I've been sitting with something. Can I tell you what it is before we try to solve it?", tags: 'WY, XY, YZ' },
  ],
  5: [ // When you're tired of talking about logistics
    { prompt: "What's something we used to do that I miss and haven't named?", tags: 'ALL' },
    { prompt: "When did we last have a conversation that wasn't about the calendar?", tags: 'WX, XX, XY' },
    { prompt: "What's one thing we could take off our list this week, just to have time back?", tags: 'ALL' },
    { prompt: "What do you actually think about, when you're not thinking about logistics?", tags: 'XZ, YZ, ZZ' },
    { prompt: "If we had one extra hour tomorrow with no obligations, how should we spend it?", tags: 'ALL' },
  ],
};
