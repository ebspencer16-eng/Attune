/**
 * Where the database is, and therefore where the endpoints should run.
 *
 * ── WHY THIS IS A FILE ────────────────────────────────────────────────────
 * Ellie: "Keep trying to speed things up."
 *
 * Every endpoint the app calls runs on Vercel's edge, which puts it near
 * whoever is asking. That is the right default when the answer is already at
 * the edge, and the wrong one here: every answer comes from one Supabase
 * project in one region, so a request that landed in San Francisco spent two
 * crossings of the country on a lookup by id.
 *
 * Pinning them to the database's own region took that lookup from 200-600ms
 * to 98ms, measured through the Server-Timing header either side of the
 * change. The customer's own hop gets a few tens of milliseconds longer and
 * there are two or three database hops per request, so the trade is a good one.
 *
 * ── WHY IT CANNOT BE IMPORTED ─────────────────────────────────────────────
 * Vercel reads `export const config` by parsing the file, so the region has to
 * be a literal in each endpoint rather than a name imported from here. That is
 * a value repeated in several places, which is this codebase's whole failure
 * mode, so check-edge-region.mjs holds every one of them to the constant
 * below. This file is where the decision lives; the literals are copies of it
 * that cannot drift.
 *
 * ── HOW IT WAS FOUND, SINCE SUPABASE DOES NOT SAY ─────────────────────────
 * The region is not visible from outside: the API is behind Cloudflare and no
 * header names it. It was a guess, deployed as an experiment with a
 * measurement either side, and the measurement is what turned it into a fact.
 * If the project ever moves, the symptom is every read getting slower at once
 * and the fix is this one line.
 */

/** Washington DC, which is us-east-1, which is where the project is. */
export const DB_REGION = 'iad1';
