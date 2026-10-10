/**
 * When the app asks for permission to send notifications.
 *
 * ── WHY IT IS A CONSTANT AND NOT A CHOICE IN THE CODE ─────────────────────
 * iOS lets an app ask once. If someone says no, the app cannot ask again: they
 * have to find it in the Settings app themselves, and almost nobody does. So
 * the moment of the ask decides, permanently, how many couples can be reached
 * when their partner finishes an exercise.
 *
 * That makes it a product decision rather than an implementation detail, and
 * it is Ellie's. The three options are written out in app/PUSH-NOTIFICATIONS.md
 * with what each one costs; this is the switch, and changing it is one word.
 *
 *   'launch'               the first launch after signing in.
 *   'after_first_exercise' once they have finished one. The recommendation.
 *   'settings_only'        never on its own; only the toggle in Settings.
 *
 * The toggle in Settings exists under all three, so nobody is stuck with the
 * answer the app happened to catch them on.
 */
export type PushAskMoment = 'launch' | 'after_first_exercise' | 'settings_only';

/**
 * Ellie's answer, pending: B17b in TASKS.md. Until she says otherwise this is
 * the recommendation, which is to ask once there is something to be notified
 * about. Someone who has just finished their first exercise is waiting on
 * their partner, and that wait is exactly what a notification is for.
 */
export const PUSH_ASK_MOMENT: PushAskMoment = 'after_first_exercise';
