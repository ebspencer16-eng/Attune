// Shared draft content for the review docs.
//
// SCENE_DRAFTS now lives in api/_workbook-content.js (single source of truth
// for content consumed by both the production workbook builder and the review
// docs). We re-export it here so existing imports keep working.
//
// PROMPT_DRAFTS stays local — it's only used by the review doc generator,
// not by the production workbook builder yet.

export { SCENE_DRAFTS } from '../api/_workbook-content.js';

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
    { prompt: "What was the hardest part of this week, not the busiest, the hardest?", tags: 'ALL' },
    { prompt: "What do you need for the rest of tonight? I'll work around it.", tags: 'ALL' },
    { prompt: "Is there anything you wish I'd noticed this week that I didn't?", tags: 'WY, YZ, XY' },
    { prompt: "What would help you feel like yourself again tomorrow?", tags: 'YY, YZ, WY' },
    { prompt: "Do you want to process out loud, or would distraction help more right now?", tags: 'ALL' },
  ],
  3: [ // When one of you is off but won't say why
    { prompt: "Something feels off to me, and I'm not sure what. Do you know what it is?", tags: 'ALL' },
    { prompt: "I'm not trying to fix anything. I just want to know what's there.", tags: 'XY, XZ, ZZ' },
    { prompt: "If you could name one thing that's been sitting in the background, what would it be?", tags: 'YZ, ZZ, XZ' },
    { prompt: "Is it me, or is it something else? Either answer is okay.", tags: 'WX, XY, WY' },
    { prompt: "Do you want to talk now, or would it be easier later?", tags: 'YY, YZ, WY, ZZ' },
  ],
  4: [ // Before a difficult conversation
    { prompt: "Before I say this, what do you need from me to hear it well?", tags: 'ALL' },
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
