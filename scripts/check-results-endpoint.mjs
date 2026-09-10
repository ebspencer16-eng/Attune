// Runs /api/results end to end, against stubbed Supabase responses.
//
// ── WHY THIS EXISTS ────────────────────────────────────────────────────────
// Two fields were added to the handler's response object, and one of them
// called sideBySide(answers.mine, answers.theirs) where `answers` is a
// parameter of withContent and not a variable in the handler. A ReferenceError
// on every request.
//
// Nothing caught it. Every gate here reads source or exercises a module; not
// one of them had ever executed the endpoint. It shipped, the app's results
// screen went to "could not be loaded", and it was found by looking at a phone.
//
// The website was untouched because it computes results client-side and reads
// only one optional field from here inside a try/catch. That is luck, not
// design: the same mistake in a field the site did read would have taken both.
//
// ── WHAT IS STUBBED, AND WHAT IS NOT ───────────────────────────────────────
// Only the network. The auth lookup, the two profile reads and the cached-row
// read return fixtures; everything after that is the real handler, the real
// scoring, the real content assembly. So this catches a scope error, a bad
// import, a field that throws on a missing value, and a response shape that
// stops carrying what the app reads.
//
// It does not check that the numbers are right. api/_type-engine.js and the
// expectations tests do that. This checks that the endpoint runs at all and
// answers with the shape both surfaces were built against.

process.env.SUPABASE_URL ||= 'https://stub.local';
process.env.SUPABASE_SERVICE_KEY ||= 'stub-service-key';
process.env.SUPABASE_ANON_KEY ||= 'stub-anon-key';

const { PERSONALITY_QUESTIONS } = await import('../api/_questions.js');

/** A complete-looking answer set: every question, plus every cross-view read. */
function answersFrom(offset) {
  const out = {};
  PERSONALITY_QUESTIONS.forEach((q, i) => {
    out[q.id] = ((i + offset) % 5) + 1;
    out['pv_' + q.id] = ((i + offset + 2) % 5) + 1;
  });
  return out;
}

const ME_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const PARTNER_ID = 'aaaaaaaa-0000-0000-0000-000000000002';

const me = {
  id: ME_ID, name: 'Ellie', pronouns: 'she/her', partner_profile_id: PARTNER_ID,
  ex1_answers: answersFrom(0),
  ex2_answers: { responsibilities: {}, life: {} },
  ex3_answers: null, ex3_completed: false,
  intimacy_data: null, conflict_data: null,
};
const partner = {
  ...me, id: PARTNER_ID, name: 'Preston', pronouns: 'he/him',
  partner_profile_id: ME_ID, ex1_answers: answersFrom(3),
};

globalThis.fetch = async (url, opts) => {
  const u = String(url);
  const reply = (body, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json' },
  });
  if (u.includes('/auth/v1/user')) return reply({ id: ME_ID });
  if (u.includes(`/rest/v1/profiles?id=eq.${ME_ID}`)) return reply([me]);
  if (u.includes(`/rest/v1/profiles?id=eq.${PARTNER_ID}`)) return reply([partner]);
  // No cached results row, so the handler takes the compute path.
  if (u.includes('/rest/v1/couple_results')) return reply([]);
  if (opts && opts.method && opts.method !== 'GET') return reply([{}]);
  return reply([]);
};

const problems = [];
let body = null;
let status = 0;

try {
  const handler = (await import('../api/results.js')).default;
  const res = await handler(new Request('https://local/api/results', {
    headers: { Authorization: 'Bearer stub-token' },
  }));
  status = res.status;
  body = await res.json();
} catch (err) {
  problems.push(`the handler threw: ${err && err.message}`);
}

if (!problems.length) {
  if (status !== 200) problems.push(`expected 200, got ${status}`);
  if (!body?.ok) problems.push(`ok is ${body?.ok}: ${body?.error || 'no error given'}`);
}

/**
 * Fields the app reads. Each one is here because something broke when it was
 * absent, not because the list looked tidy.
 */
if (body?.ok) {
  const at = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), body);
  const required = [
    ['results.content.coupleType', 'the couple type page has nothing to draw'],
    ['results.content.dimensions', 'every slider on every page is empty'],
    ['results.content.names', 'prose addresses "you" and "your partner"'],
    ['results.content.axes', 'the couple map is a picture with no key'],
    ['results.content.mapQuadrants', 'the map cannot be drawn at all'],
    ['commDomains', 'domain pages lose their title, prose and colour'],
    ['commResponses', 'the side-by-side dropdown is empty'],
    ['commsPlan', 'the glance loses its action plan'],
  ];
  for (const [path, cost] of required) {
    const v = at(path);
    if (v == null || (Array.isArray(v) && !v.length)) {
      problems.push(`${path} is ${Array.isArray(v) ? 'empty' : v}: ${cost}`);
    }
  }

  // The side-by-side rows have to line up with the dimensions the pages group
  // by, or the dropdown filters everything out and renders nothing.
  const dims = new Set((at('results.content.dimensions') || []).map((d) => d.key));
  const orphans = [...new Set((body.commResponses || []).map((r) => r.dimension))]
    .filter((d) => !dims.has(d));
  if (orphans.length) {
    problems.push(`commResponses names dimensions the results do not: ${orphans.join(', ')}`);
  }
}

if (problems.length) {
  console.error('[check-results-endpoint] /api/results did not answer the way the app expects:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('Only the network is stubbed here. A failure means the handler itself is');
  console.error('broken, or has stopped sending something a screen was built against.');
  process.exit(1);
}

console.log(
  `[check-results-endpoint] 200 ok, ${(body.commResponses || []).length} side-by-side rows, `
  + `${(body.commDomains || []).length} domains, all fields the app reads are present.`);
