# AlumniConnect · Sprint review board

**Review: 15 October 2026 · Evidence updated: 29 October 2026**

> **Current position:** controlled local core HTTP/API/database and browser
> journeys verified; preliminary ML evidence, hosted acceptance and research/report gaps remain.
> No defensible overall completion percentage is available.

**Legend:** ✅ evidenced item · 🟡 partial · 🔎 runtime verification outstanding · ⬜ not evidenced here.
A checked implementation item means its code exists; it does not mean it has passed a live user test.
Statuses refer to this checkout and inspected files, not unseen documents or hosted systems.

## 01 · Sprint I - foundation

| Lecturer's expectation | Status | Where we stand / why | To close the requirement |
| --- | --- | --- | --- |
| Configured development environment | 🟡 Local checks evidenced | Dependencies, lint, typecheck and local inference verified; a fresh `npm run check` passed according to the user. Docker/local Supabase running; keys match; SDK sign-in/profile read passed. The user confirmed browser profile changes persist after refresh and logout/login on 15 October. | Retain local check evidence; verify the complete core workflow separately. |
| Clean, organised codebase and setup instructions | ✅ Evidenced | `app/`, `components/`, `lib/`, `supabase/`, `scripts/`, `docs/`; setup and commands in README. | Rehearse explaining the structure; record any setup correction found. |
| Git version control and meaningful commits | 🟡 Partial | Git history exists. Repository conventions and ML documentation/walkthrough are checkpointed in `28c005d` and `633b292`; remaining traceability documents are in this checkpoint group. | Review intended changes, then make focused Gitmoji commits. Do not stage unrelated work. |
| Data/resources prepared and checked | 🟡 Partial | Versioned schema, synthetic profile generator, seed/evaluation scripts and cached pretrained model exist. Live database state is unverified; synthetic labels represent domains, not suitability. | Verify demo data/database; document provenance, preparation and limits. |
| Appropriate workflow automation | ✅ Evidenced | GitHub Actions quality workflow, npm checks, seed/evaluation scripts and SQL test suite exist. Successful remote CI run not inspected. | Show the actual configuration and distinguish configured automation from successful execution. |
| Earlier corrections and documentation alignment | ⬜ Not verified | Actual submitted chapters and correction feedback not located in this review. Submitted chapter alignment with the current course structure remains unverified. | Inspect actual chapters; Chapter 4 analysis/design, Chapter 5 implementation/testing per current guide. |

**Evidence already present**

- [x] Organised application structure and local setup README.
- [x] Git history and configured quality automation.
- [x] Database migrations and synthetic resource-preparation scripts.
- [x] Lint and TypeScript checks passed on 14 October.
- [x] Local pretrained inference walkthrough passed on 14 October.
- [x] Docker/local Supabase running and application credentials match the active instance.
- [x] Local password sign-in and authenticated own-profile read passed; unsigned-in access rejected as expected.
- [x] Browser profile save persists after refresh and logout/login (user-confirmed, 15 October).
- [x] Fresh `npm run check` including production build passed (user-reported, 15 October).
- [ ] Intended working files reviewed and recorded in Git.
- [ ] Submitted chapter corrections checked.

## 02 · Sprint II - working core and initial evidence

| Lecturer's expectation | Status | Where we stand / why | To close the requirement |
| --- | --- | --- | --- |
| Sprint tasks linked to objectives and supervisor priorities | 🟡 Partial | Local traceability audit maps approved objectives to code/gaps. Current supervisor priority approval not verified. | Select review scope, link tasks to objectives, and record supervisor decisions. |
| Working input → processing → output workflow | ✅ Controlled local journey verified | On 29 October, agent-observed browser signup, minimal profile save, automatic embedding, discovery, request, acceptance and connection passed. | Retain the local evidence; automate browser regression and verify hosted behavior separately. |
| Integrated interface, logic, database and model | ✅ Local integration verified | Browser state and scoped database checks agree on real 384-value vectors, shared skills, accepted request and connection; Mentee re-login preserves the result. | Broaden browser/platform coverage and verify hosting; this is not model-quality evidence. |
| Initial tests including invalid inputs/failures | 🟡 Expanded local evidence | Thirteen HTTP checks, the expanded RLS suite and browser empty-profile/retry recovery passed. Known-ID anonymous response fix is applied locally. | Verify real service-outage recovery and slowed pending feedback; hosted checks remain separate. |
| Initial ML baseline/pipeline, validation and metrics | 🟡 Partial | Frozen MiniLM and keyword baselines; historical synthetic P@1/MRR/coverage report. Candidate filtering alters ranks; no independent suitability labels. | Explain historical/provisional numbers; repair protocol and preserve raw rankings before final claims. |
| Chapter 5 implementation/testing; changed Chapter 4 diagrams | ⬜ Not evidenced in inspected files | Local ML guide exists, but it is not a completed Chapter 5. Current diagram set and submitted chapters not reviewed. | Add real implementation, integration, screenshots and test evidence to the actual report. |
| Current Git repository and reproducible demo | 🟡 Partial | Setup guide and ML walkthrough are versioned; capstone traceability is being checkpointed separately. | Commit reviewed work, identify the demonstrated commit and record dependencies/data. |
| Explain objectives, limitations and next tasks | 🟡 Prepared in writing | Traceability and limitations are documented locally. Oral understanding/rehearsal has not been confirmed. | Rehearse and retain a truthful next-sprint plan. |

**Implementation already present - runtime acceptance still outstanding**

- [x] Authentication and editable mentor/mentee profiles.
- [x] Server-side MiniLM inference with 384-value vectors.
- [x] pgvector cosine mentor ranking and keyword/category discovery.
- [x] Requests, acceptance/decline and persisted connection logic.
- [x] Staff role/visibility controls, audit logging and RLS definitions.
- [x] Initial synthetic comparison report and test tooling.
- [x] Local credential comparison, sign-in and profile access-control checks recorded in `environment-verification.md`.
- [x] Local HTTP/API/database workflow and scoped cleanup verified on 28 October; see `environment-verification.md`.
- [x] Controlled local browser journey verified on 29 October; the earlier
  28 October browser-bridge failure remains historical evidence.
- [x] Invalid-input, missing-embedding and stale-action HTTP checks recorded;
  mocked failure/retry tests pass as a separate layer.
- [ ] Browser failure/retry feedback verified during a live service outage.
- [ ] Evaluation calculations independently checked with raw rankings.
- [ ] Chapter 5 and revised design evidence ready for review.

## 03 · Entire project - capability and remaining scope

| Workstream | What exists now | Remaining work | Position |
| --- | --- | --- | --- |
| Accounts and profiles | Email signup/login; mentor/mentee profiles; user-confirmed browser profile persistence across refresh and logout/login | Clarify institution membership and approved role mapping; review goals/preferences/experience fields; verify remaining account flows | 🟡 Core persistence confirmed; scope gaps |
| Mentor recommendations | Pretrained profile embeddings; cosine ranking; shared-skill display | Reliable first-match path; retry handling; score explanation; optional independent semantic/peer search if retained | 🟡 Implemented core; gaps |
| Mentorship workflow | Send, cancel, accept/decline requests; connection creation | Test complete flow, permissions, duplicates and failure feedback; clarify any recommendation-defer requirement | 🟡 Implemented core; gaps |
| Staff and security | Role/visibility controls; database policies; audit logs | Fresh permission tests, validation review, hosted configuration and institutional verification requirements | 🟡 Implemented core; verify |
| ML experimentation | Frozen inference, synthetic generator, four evaluation conditions | Reproducible notebook; run manifests/logs; scoring repair; fair model comparison; human-reviewed relevance data | 🟡 Preliminary |
| Project-specific model training | No training pipeline, trained checkpoint or project-specific weight update in this checkout | Data rubric/splits; training notebook; early stopping; checkpoints; validation; held-out comparison | ⬜ To build |
| Research evaluation | Historical synthetic domain-retrieval results | Independently judged suitability, real cold-start measures, uncertainty and representative-user usability/SUS | 🟡 Preliminary |
| Job referrals | No route/table evidenced | Implement agreed minimum workflow or obtain explicit scope amendment | ⬜ Not evidenced |
| Cohorts | Graduation year exists; no cohort membership feature | Implement agreed minimum workflow or obtain explicit scope amendment | ⬜ Not evidenced |
| Events | No route/table evidenced | Implement agreed minimum workflow or obtain explicit scope amendment | ⬜ Not evidenced |
| Report and design | README, ML guide, local audit/checklists, executable schema | Actual chapter corrections, current diagrams, requirements synthesis, implementation/test results, final discussion | 🟡 Incomplete |
| Hosting and release | Local setup; build configuration; CI definition | Verify build, configure hosting/secrets/auth redirects, deploy and smoke-test; operational notes | ⬜ Hosted readiness unverified |
| Project management | Git history and issue/CI templates | Verify live board/issues; preserve genuine sprint reviews, decisions and commit evidence | 🟡 Evidence incomplete |

Whole-project scope rows use the local proposal traceability audit. The original approved proposal
has not been re-opened in this review; verify retained scope with the supervisor before implementing
or removing jobs/cohorts/events. There is no claim that unseen research or report work does not exist.

## 04 · Work queue

| Priority | Next concrete outcome | Evidence of completion |
| --- | --- | --- |
| NEXT | Automate browser regression and broaden failure coverage | Controlled browser journey now recorded; add automation, real outage recovery and slowed pending feedback |
| NEXT | Confirm M1 initialization/rubric and finish M2 review/freeze, then set up local → GitHub → Colab → Drive | Source audit and draft protocol exist; approved route, reviewed independent pools, versioned notebook and saved run evidence remain |
| BEFORE REVIEW | Demonstrate the core on isolated local data | Dated HTTP/API/database and browser matrix recorded; preserve the local-only boundary |
| BEFORE REVIEW | Explain the ML and recorded comparison accurately | Oral rehearsal; no training/superiority claims unsupported by evidence |
| BEFORE REVIEW | Put real implementation/testing evidence in the actual report | Current Chapter 5 and changed Chapter 4 diagrams |
| NEXT | Fine-tune after labelled data and splits are ready | Saved checkpoints, learning curves, validation decision, held-out results |
| FINAL RELEASE | Complete retained scope, human evaluation and deployment | Acceptance evidence or supervisor-approved amendments |

## 05 · Evidence log

**15 October browser confirmation (user-reported):** The user saved a profile change
and confirmed it persisted after refreshing and after logging out and back in.
Mark that browser persistence check complete. This is not an independently
observed browser test, a production build result, or proof of embedding/matching
and request workflows. The user also reported a fresh passing `npm run check`;
hosted readiness and the complete core workflow remain unverified.

Latest environment follow-up (14 October): Node v26.8.2 and npm 11.19.1;
dependencies installed; local environment file contains the three required
Supabase settings and targets a local server (secret values not printed).
Supabase CLI 2.109.0 responds. A Node process listens on port 3000; HTTP/browser
health is not yet verified. Docker Desktop launch was requested successfully;
the daemon was not reachable at the immediate follow-up check. Local Supabase
is not yet verified. Concurrent marketing-page edits were observed and left intact.

Coordination: The user also uses terminal Codex inside VS Code. Before editing,
inspect current Git changes and this board; avoid overlapping file edits and
record verification outcomes here so both sessions share the same evidence.

Docker follow-up (14 October): Docker server 29.6.1 responds outside the sandbox.
AlumniConnect containers are running; database, authentication, gateway and Studio
report healthy. SkillSwap containers are also running and were left unchanged.
Earlier Docker/socket and service-listener findings above are historical, not
the latest runtime status. Full application acceptance remains outstanding.
Initial HTTP check: auth health returned 200; unsigned-in profiles request returned
401. Follow-up confirmed PostgreSQL error 42501 (permission denied), not invalid
API credentials. The local URL, anonymous key and service-role key all match the
active instance. A temporary confirmed mentee signed in successfully and read its
own profile with HTTP 200; anonymous access remained rejected. The temporary auth
account and profile were removed and cleanup checked. No app/env/security-policy
change was necessary. Normal auth/audit logs may retain the verification events.
See `environment-verification.md` for the test matrix and verification boundary.

| Check | Last observation | Boundary |
| --- | --- | --- |
| `npm run lint` | Passed, 14 October | Static check only |
| `npm run typecheck` | Passed, 14 October | Static check only |
| `npm run ml:walkthrough` | Passed, 14 October | Local inference only; no application/DB coverage |
| `npm run build` | Passed in the user-reported fresh `npm run check`, 15 October; earlier sandbox worker errors are historical | Local production build only; no hosted proof |
| Local Supabase | Docker containers running; auth health 200 | Local verification only |
| App configuration | URL and both configured keys match active local instance | Secret values not recorded |
| Password sign-in + own profile | Passed; authenticated profile read 200 | Direct SDK/API check, not browser flow |
| Browser profile persistence | Confirmed by the user, 15 October: refresh and logout/login preserve the change | User-reported browser verification; model/request flow not covered |
| Unsigned-in profile request | 401 / PostgreSQL 42501, expected | Restricted table privileges; not an invalid API key |
| Synthetic P@1 | Historical report: semantic-full 0.833; keyword+category 0.917 | Not rerun; domain proxy labels and scoring issues |

Source: [current course guide](https://docs.google.com/document/d/1xfxgVr4X01q8y0AgzzMvkYNOfQgYBYqeRjqfgVKtblw/edit?tab=t.dc4trpmy2fzk).
Companion: [detailed Colab workflow](colab-training-workflow.md).

## 06 · Checkpoint evidence · 15 October 2026

- The user reported local signup, logout, login, and account data remaining
  available after logging in again. This was a local manual smoke test, not
  automated end-to-end coverage, a Supabase restart-persistence check, or hosted
  Supabase verification. See `environment-verification.md` for the exact boundary.
- Existing UI milestones are already committed as `3455d3a` and `105aac7`; no
  duplicate UI commit is needed. The current checkpoint adds no onboarding,
  Google OAuth, database fields, or new product functionality.
- `npm run ml:walkthrough` passed during this checkpoint with four finite,
  normalized 384-value vectors. It demonstrates frozen inference only. The
  existing Node module-type warning does not change that verification boundary.
- The earlier environment observations above retain their original dates and
  scope. Neither local checks nor a source checkpoint establish hosted readiness.

## 07 · Core workflow verification · 28 October 2026

- `npm run smoke:local` passed 12 checks using actual Next.js Server Actions
  over HTTP, real embedding/matching APIs and local database assertions. Four
  disposable accounts were removed; no fixture profiles, requests or connections
  remained. It is not browser automation.
- Expanded rollback-only SQL tests reproduced and then verified the fix for an
  anonymous caller responding to a known request ID. Security commit `f8fb640`
  adds migration `20261028000001_request_response_auth.sql`; applied locally only.
- Fresh `npm run check` passed lint, TypeScript and the production build. The
  configured URL and keys match the running local instance; secrets were not
  printed or committed.
- Browser bridge startup failed twice, including after reset. Client effects,
  automatic embedding after a browser save, interactive pending/error feedback
  and complete browser acceptance remain unverified in this run.
- The seven QoL improvements and square, opaque visual system are committed
  through `021e2af`. They do not imply hosted or representative-user acceptance.
- Full test matrix, reproducible commands, cleanup, defect and limitations:
  [`environment-verification.md`](environment-verification.md).

## 08 · First-time onboarding and browser acceptance · 29 October 2026

- Signup explains the current audience and distinguishes a Mentee seeking
  guidance from a Mentor offering it. Each account retains one role; signup
  makes no affiliation verification claim.
- New profiles get role-specific setup guidance. Headline/skills come first;
  optional completeness detail can be expanded. The next action follows an
  actual successful match update, and returning profiles skip the guide.
- Both roles were created and exercised in Chrome Incognito. A minimal browser
  save triggered the real embedding update; Mentee discovery, introduction,
  Mentor acceptance, persisted connection and Mentee re-login were observed.
- Name-only save produced a real matching failure. Retrying retained an unsaved
  headline; saving career details recovered. This does not establish service-
  outage behavior or delayed pending-state acceptance.
- Both browser fixtures and dependent rows were removed; no credential file
  remains. The expanded local HTTP runner passed 13 checks and cleaned its four
  fixtures. No hosted project, schema, auth logic or ML logic was changed.
- Signup was visually inspected at desktop width and 320 × 844, and native
  keyboard role selection was checked. Full results and remaining boundaries
  are in `environment-verification.md`.

## 09 · ML audit and protocol preparation · 29 October 2026

- `d18ce0a` adds a read-only Python source audit and 15 passing regression tests.
  A separate direct parse/graph calculation confirms 60 profiles, 60 pairs,
  score distribution, three unused Mentors and component sizes. Repeated output
  agrees and the original source hash is unchanged.
- All records are training and all labels await human review. Only 60 of 800
  candidate pairs are judged. Metadata ambiguity perfectly separates grades
  1/2 from 0/3; it must remain outside features. Missing held-out pools prevent
  cross-split clearance. See `ml-data-audit.md` for findings and limitations.
- `ml-experiment-protocol.md` is draft v0.1: task, input contract, source rubric,
  person/template separation, candidate judgments, comparisons and metrics.
  Course permission for pretrained weights is not confirmed. Initialization,
  human review and dataset freeze remain open; M1 and M2 are partial.
- `npm run lint` passed for the audit milestone. No app, database or dependency
  changed; no training/Colab run or new evaluation score is claimed. The working
  frozen MiniLM pipeline and historical negative comparison remain intact.
