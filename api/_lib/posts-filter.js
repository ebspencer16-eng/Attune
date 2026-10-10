/**
 * What "published" means, as a PostgREST filter.
 *
 * ── WHY IT IS NOT TYPED TWICE ─────────────────────────────────────────────
 * There is no status column on posts. An article is published when
 * `published_at` is set and in the past, which means one condition covers two
 * states: a draft has no timestamp, and a scheduled piece has a future one.
 *
 * /api/posts has always done it this way. The daily push needed the same
 * question for "what came out since yesterday", and the first version of it
 * asked for `status=eq.published`, a column that does not exist: PostgREST
 * refuses the whole query, the cron reads nothing, and the symptom is a push
 * that never arrives for a reason nothing logs. So the condition is stated
 * once, here.
 */

/** Published, as of this instant. Pass an ISO string to pin the moment. */
export function publishedFilter(nowIso = new Date().toISOString()) {
  return `published_at=not.is.null&published_at=lte.${nowIso}`;
}
