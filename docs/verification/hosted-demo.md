# Hosted fictional demo pool — 5 November 2026

Scope: #8 and #26. The user approved the five existing sample Mentors and a
demonstration of recommendations, both model comparisons and mentorship requests.
The corresponding local personal account had no professional details to copy, so
a separate fictional Demo Mentee is used. The two pre-existing accounts/profiles
were preserved.

## Retained fixtures

- Demo Mentor — Grace Wanjiku: machine learning and data platforms.
- Demo Mentor — Brian Otieno: corporate law.
- Demo Mentor — Fatima Noor: product management.
- Demo Mentor — David Kimani: cloud infrastructure.
- Demo Mentor — Esther Mwangi: finance and leadership.
- Demo Mentee — Career Explorer: Python, SQL and career development.

Professional fixture fields come from `scripts/seed-dev.mjs`; names and biographies
explicitly label the accounts fictional. Reserved `example.test` email addresses
and generated private passwords are used. Auth creation uses the supported Admin
API, not direct Auth-table inserts. `app_metadata.fixture` is
`alumnikonneqt-hosted-demo-v1`, and `fictional` is true. No invitations are sent.
No existing member's role or professional fields were edited.

## Reproduction and private access

`scripts/hosted-demo.mjs` targets only the identified AlumniConnect project
`edxflusuysnzzbyfrpvs` and `https://alumnikonneqt.com`. With no flags it prints a dry
plan. Every operational phase requires `--apply --phase <phase>`:

- `seed`: create/reconcile only marked fixtures, refusing unmarked collisions.
- `embed`: generate all six embeddings through the live authenticated `/api/embed`.
- `verify`: require five results without errors from each comparison model, five
  Recommended results, and two Python keyword results.
- `requests`: use the fictional accounts to verify a request, recipient acceptance,
  rejection of another Mentor's response, persisted connection and authenticated
  requests-page HTTP rendering. A clearly labelled accepted demo relationship with
  Grace remains for demonstration; reruns reuse it.
- `bootstrap`: optional local inference and hosted vector storage; requires Node's
  `--conditions=react-server --experimental-strip-types` flags. This phase is
  explicitly not hosted inference evidence.
- `recommendations`: independently check Recommended and keyword results.

The authenticated Supabase CLI supplies admin credentials only within the process;
they are never printed or written by this utility. Generated fixture login details
are in `.env.hosted-demo-access.json`, ignored by Git and restricted to mode 0600.
Use its `mentee` entry for demonstrations. Do not publish the file or its contents.
The utility signs out its HTTP test sessions when each phase ends.

## Runtime repair and observed evidence

The first populated comparison returned five scratch-pilot results but no MiniLM
results. Live `/api/embed` returned 500. Vercel logs showed Transformers attempting
to create its cache inside `/var/task/node_modules`, where writes failed.

PR #74 (`8925dc6798fd1e83b11cba76fea0b5ee271e1adb` merge) configures a per-pipeline
OS temporary cache on Vercel, retaining the normal local cache. It adds error-name
and error-code diagnostics without profile text or credentials. A real cold local
load with this setting produced 384 finite values. ESLint, TypeScript, all 146
Node tests, and a Webpack build passed; local Turbopack was blocked by worker-port
permissions. Required remote default-build, database, ML and CodeQL checks passed.

The Git-triggered deployment did not appear, so the exact merged Git commit was
deployed through Vercel's connected Git source. Deployment
`dpl_4UNVS9agUZsCTF66dy46XaqWm4aM` became READY and owns the custom domain. While it
queued, the six fixture vectors were initially generated locally and stored in
production. After release, **all six were regenerated successfully through the
live `/api/embed` endpoint** (HTTP 200, 384 dimensions).

Final authenticated hosted HTTP observations:

- `/api/match/compare`: 200, same five-Mentor pool, five results per model;
  MiniLM `Xenova/all-MiniLM-L6-v2` (384 dimensions) reported 1,048 ms and
  `scratch-pilot-v1:1ed9ed95cc33` (64 dimensions) reported 137 ms. Total request:
  4,431 ms. These are individual observations, not a benchmark.
- `/api/match`: 200, five labelled Demo Mentor results.
- Keyword RPC: `Python` returned two labelled Demo Mentors.
- Demo request, recipient-only acceptance, denied wrong-recipient response and
  connection persistence passed; the authenticated requests page rendered the
  demo relationship.
- Safari using the existing real-member session visibly rendered the labelled
  fictional Grace and David cards in keyword search. Full model results above
  were verified by authenticated HTTP, not a new demo-account browser session.

Final inventory: five demo Mentors, one demo Mentee, two unchanged existing
Mentees. All six demo profiles have embeddings. The normal Recommended mode still
uses stored MiniLM vectors; the scratch pilot runs separately in Compare models.
Do not claim the final scratch-model migration, research-quality relevance,
participant evaluation, or a final release is complete. #8 and #26 remain open.

## Subsequent approved personal-profile copy

The user subsequently chose to copy their saved local professional details. The
active localhost session identified a populated personal profile distinct from
the initially checked empty local account. Its saved name, headline, biography,
skills, industry and graduation year were copied through the normal hosted
Profile form to the already authenticated personal account. Email, role, login
credentials and privacy settings were preserved; field values and account
identifiers are omitted from this shared record.

A read-only comparison confirmed every copied field matched the local source,
the Mentee role was retained, and live embedding generation saved a 384-value
vector. Safari then visibly rendered five results per comparison model and all
five Recommended cards for that personal account. The observed comparison
timings were 728 ms for MiniLM and 84 ms for the scratch pilot; these are single
observations, not benchmarks. The separate demo fixtures remain available.

This later approved copy supersedes the earlier current-state statement that
both personal profiles were unchanged. It required no code, schema or deployment
change. Sanitised follow-up evidence is recorded in #8 and #26.
