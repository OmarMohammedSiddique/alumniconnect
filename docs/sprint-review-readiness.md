# AlumniConnect · Sprint review board

**Review: 15 October 2026 · Evidence updated: 15 October 2026**

> **Current position:** substantial mentorship implementation, preliminary ML evidence,
> incomplete live verification and research/documentation deliverables.
> No defensible overall completion percentage is available.

**Legend:** ✅ evidenced item · 🟡 partial · 🔎 runtime verification outstanding · ⬜ not evidenced here.
A checked implementation item means its code exists; it does not mean it has passed a live user test.
Statuses refer to this checkout and inspected files, not unseen documents or hosted systems.

## 01 · Sprint I — foundation

| Lecturer's expectation | Status | Where we stand / why | To close the requirement |
| --- | --- | --- | --- |
| Configured development environment | 🟡 Build outstanding | Dependencies, lint, typecheck and local inference verified. Docker/local Supabase running; keys match; SDK sign-in/profile read passed. Omar confirmed browser profile changes persist after refresh and logout/login on 15 October. | Verify a successful current production build. |
| Clean, organised codebase and setup instructions | ✅ Evidenced | `app/`, `components/`, `lib/`, `supabase/`, `scripts/`, `docs/`; setup and commands in README. | Rehearse explaining the structure; record any setup correction found. |
| Git version control and meaningful commits | 🟡 Partial | Git history exists. Useful ML documents and walkthrough remain untracked; other changes are pending. | Review intended changes, then make focused Gitmoji commits. Do not stage unrelated work. |
| Data/resources prepared and checked | 🟡 Partial | Versioned schema, synthetic profile generator, seed/evaluation scripts and cached pretrained model exist. Live database state is unverified; synthetic labels represent domains, not suitability. | Verify demo data/database; document provenance, preparation and limits. |
| Appropriate workflow automation | ✅ Evidenced | GitHub Actions quality workflow, npm checks, seed/evaluation scripts and SQL test suite exist. Successful remote CI run not inspected. | Show the actual configuration and distinguish configured automation from successful execution. |
| Earlier corrections and documentation alignment | ⬜ Not verified | Actual submitted chapters and correction feedback not located in this review. Old project checklist contradicts the current course chapter structure. | Inspect actual chapters; Chapter 4 analysis/design, Chapter 5 implementation/testing per current guide. |

**Evidence already present**

- [x] Organised application structure and local setup README.
- [x] Git history and configured quality automation.
- [x] Database migrations and synthetic resource-preparation scripts.
- [x] Lint and TypeScript checks passed on 14 October.
- [x] Local pretrained inference walkthrough passed on 14 October.
- [x] Docker/local Supabase running and application credentials match the active instance.
- [x] Local password sign-in and authenticated own-profile read passed; unsigned-in access rejected as expected.
- [x] Browser profile save persists after refresh and logout/login (Omar confirmed, 15 October).
- [ ] Successful current production build.
- [ ] Intended working files reviewed and recorded in Git.
- [ ] Submitted chapter corrections checked.

## 02 · Sprint II — working core and initial evidence

| Lecturer's expectation | Status | Where we stand / why | To close the requirement |
| --- | --- | --- | --- |
| Sprint tasks linked to objectives and supervisor priorities | 🟡 Partial | Local traceability audit maps approved objectives to code/gaps. Current supervisor priority approval not verified. | Select review scope, link tasks to objectives, and record supervisor decisions. |
| Working input → processing → output workflow | 🔎 Implemented; verify live | Profile save, embedding generation, pgvector ranking, discover UI and request/response code exist. No complete browser journey verified today. | Demonstrate profile → stored vector → mentor results → accepted request/connection. |
| Integrated interface, logic, database and model | 🔎 Implemented; verify live | `/api/embed`, `/api/match`, SQL RPCs and UI form the integration. Standalone ML walkthrough does not exercise those boundaries. | Capture API output, stored vector and browser result on isolated local data. |
| Initial tests including invalid inputs/failures | 🟡 Partial | Static checks, temporary-user password sign-in and own-profile read passed. Anonymous profile access correctly rejected. SQL RLS/pipeline scripts exist; full matrix and failure/retry evidence remain outstanding. | Extend the recorded tests to the core workflow, failure/retry and local RLS suite. |
| Initial ML baseline/pipeline, validation and metrics | 🟡 Partial | Frozen MiniLM and keyword baselines; historical synthetic P@1/MRR/coverage report. Candidate filtering alters ranks; no independent suitability labels. | Explain historical/provisional numbers; repair protocol and preserve raw rankings before final claims. |
| Chapter 5 implementation/testing; changed Chapter 4 diagrams | ⬜ Not evidenced in inspected files | Local ML guide exists, but it is not a completed Chapter 5. Current diagram set and submitted chapters not reviewed. | Add real implementation, integration, screenshots and test evidence to the actual report. |
| Current Git repository and reproducible demo | 🟡 Partial | Setup guide exists; untracked evidence and pending modifications mean not all current work is versioned. | Commit reviewed work, identify the demonstrated commit and record dependencies/data. |
| Explain objectives, limitations and next tasks | 🟡 Prepared in writing | Traceability and limitations are documented locally. Oral understanding/rehearsal has not been confirmed. | Rehearse and retain a truthful next-sprint plan. |

**Implementation already present — runtime acceptance still outstanding**

- [x] Authentication and editable mentor/mentee profiles.
- [x] Server-side MiniLM inference with 384-value vectors.
- [x] pgvector cosine mentor ranking and keyword/category discovery.
- [x] Requests, acceptance/decline and persisted connection logic.
- [x] Staff role/visibility controls, audit logging and RLS definitions.
- [x] Initial synthetic comparison report and test tooling.
- [x] Local credential comparison, sign-in and profile access-control checks recorded in `environment-verification.md`.
- [ ] Complete browser/API/database demo verified and recorded.
- [ ] Invalid-input, missing-embedding and failure/retry tests recorded.
- [ ] Evaluation calculations independently checked with raw rankings.
- [ ] Chapter 5 and revised design evidence ready for review.

## 03 · Entire project — capability and remaining scope

| Workstream | What exists now | Remaining work | Position |
| --- | --- | --- | --- |
| Accounts and profiles | Email signup/login; mentor/mentee profiles; Omar confirmed browser profile persistence across refresh and logout/login | Clarify institution membership and approved role mapping; review goals/preferences/experience fields; verify remaining account flows | 🟡 Core persistence confirmed; scope gaps |
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
| NOW | Set up the requested local → GitHub → Colab → Drive experiment workflow | Versioned notebook; exact code revision; saved run manifest and outputs |
| BEFORE REVIEW | Demonstrate the implemented core on isolated local data | Browser journey, API/database checks, dated test matrix |
| BEFORE REVIEW | Explain the ML and recorded comparison accurately | Oral rehearsal; no training/superiority claims unsupported by evidence |
| BEFORE REVIEW | Put real implementation/testing evidence in the actual report | Current Chapter 5 and changed Chapter 4 diagrams |
| NEXT | Fine-tune after labelled data and splits are ready | Saved checkpoints, learning curves, validation decision, held-out results |
| FINAL RELEASE | Complete retained scope, human evaluation and deployment | Acceptance evidence or supervisor-approved amendments |

## 05 · Evidence log

**15 October browser confirmation (user-reported):** Omar saved a profile change
and confirmed it persisted after refreshing and after logging out and back in.
Mark that browser persistence check complete. This is not an independently
observed browser test, a production build result, or proof of embedding/matching
and request workflows. The configured-environment item remains open for the build.

Latest environment follow-up (14 October): Node v26.8.2 and npm 11.19.1;
dependencies installed; local environment file contains the three required
Supabase settings and targets a local server (secret values not printed).
Supabase CLI 2.109.0 responds. A Node process listens on port 3000; HTTP/browser
health is not yet verified. Docker Desktop launch was requested successfully;
the daemon was not reachable at the immediate follow-up check. Local Supabase
is not yet verified. Concurrent marketing-page edits were observed and left intact.

Coordination: Omar also uses terminal Codex inside VS Code. Before editing,
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
| `npm run build` | Turbopack worker port permission error, including retry | Build success unverified |
| Local Supabase | Docker containers running; auth health 200 | Local verification only |
| App configuration | URL and both configured keys match active local instance | Secret values not recorded |
| Password sign-in + own profile | Passed; authenticated profile read 200 | Direct SDK/API check, not browser flow |
| Browser profile persistence | Confirmed by Omar, 15 October: refresh and logout/login preserve the change | User-reported browser verification; model/request flow not covered |
| Unsigned-in profile request | 401 / PostgreSQL 42501, expected | Restricted table privileges; not an invalid API key |
| Synthetic P@1 | Historical report: semantic-full 0.833; keyword+category 0.917 | Not rerun; domain proxy labels and scoring issues |

Source: [current course guide](https://docs.google.com/document/d/1xfxgVr4X01q8y0AgzzMvkYNOfQgYBYqeRjqfgVKtblw/edit?tab=t.dc4trpmy2fzk).
Companion: [detailed Colab workflow](colab-training-workflow.md).
