/**
 * The line that goes under anything shared out of the app.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie: "When you share something from the app (like a storycard, insight of
 * the day, etc.) It should be accompanied by a 'download attune relationships
 * in the app store' banner like some links have."
 *
 * Somebody who receives a storycard has been handed a picture with no way in.
 * The address was already going along; what was missing is the sentence that
 * says what to do with it.
 *
 * ── WHY IT IS ON THE SERVER ───────────────────────────────────────────────
 * The app is not in the store yet. When it is, APP_LIVE and APP_STORE_URL in
 * api/_lib/flags.js are the whole change, and this line has to follow them on
 * the same day rather than at the next app release: an Expo update is a deploy
 * of her making, and the store listing going live is not. So /api/home carries
 * the sentence, and the app prints what it is given.
 *
 * Until then it is the website, which is where somebody can buy the thing the
 * card came from.
 */

import { APP_LIVE, APP_STORE_URL } from './flags.js';
import { SITE_URL } from './site.js';

/** One line, already punctuated, ready to sit under a shared message. */
export function shareFooter() {
  return APP_LIVE
    ? `Download Attune Relationships in the App Store: ${APP_STORE_URL}`
    : `Attune Relationships: ${SITE_URL}`;
}
