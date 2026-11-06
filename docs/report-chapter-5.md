# Chapter 5 System Implementation Testing and Evaluation

## System Implementation Testing and Evaluation

## 5.1 Introduction

This chapter explains how AlumniConnect implements profile-based mentorship discovery and presents the available implementation and testing evidence. The application combines a Next.js interface, Supabase authentication, PostgreSQL records and pgvector similarity retrieval. The evidence reviewed on 5 November 2026 includes the current source, dated verification records and GitHub acceptance criteria. Historical results are identified by their original dates rather than presented as newly executed experiments.

Two model workstreams must be distinguished. The application source uses a frozen pretrained MiniLM encoder producing 384-dimensional vectors. A separate model trained from random initialization has been executed locally and in Google Colab, but its 64-dimensional representations have not been integrated into the live recommendation workflow. Training and live use of a selected scratch-trained model remain final project requirements. The pilot demonstrates engineering feasibility, not completion of that requirement.

## 5.2 Implementation Environment

The inspected source baseline is commit 3b93d2e. Table 5.1 reports package-manifest declarations at that revision; these are not a reconstruction of the environments used for earlier experiments. Reproduction requires the lockfile and the relevant run-specific environment records.

Table 5.1 Declared application environment

| Component | Declared version or configuration |
| --- | --- |
| Next.js / React | 16.4.5 / 19.2.4 |
| TypeScript / Node.js | ^5 / >=20.9.0 |
| Supabase JavaScript / SSR | ^2.110.0 / ^0.12.0 |
| Transformers.js | ^4.3.0 |
| Application encoder | Xenova/all-MiniLM-L6-v2; q8; mean pooling; normalization |
| Database representation | PostgreSQL and pgvector; application vectors have 384 values |
| Hosting arrangement | Vercel application and Supabase backend; final hosted acceptance remains separate |

The browser interacts with authenticated server operations. Privileged embedding writes remain server-side, while recommendation retrieval uses the caller’s Supabase context. Secrets and account identifiers are excluded from the report. A documented hosted deployment exists, superseding the September statement that the application had never been deployed; a deployment alone does not establish complete workflow acceptance.

## 5.3 System Implementation

### 5.3.1 Authentication Profiles and Access Control

Supabase Auth manages account identity and sessions. Mentor and Mentee are mentorship roles rather than proof of institutional affiliation. Registration and profile management collect the fields needed for discovery, with optional profile pictures handled through authenticated storage. Google sign-in is restricted to previously registered accounts. The dated issue #37 record reports local and hosted verification of rejection for unregistered Google identities and account reuse for registered identities, including refresh, sign-out and repeat sign-in. These observations establish that particular authentication flow, not all account-email journeys.

Relational records represent profiles, mentorship requests, connections and audit activity. Database permissions and row-level security supplement server checks. The request workflow restricts a response to the intended recipient and enforces valid state transitions. Acceptance creates a connection; cancellation and decline follow different permitted transitions. A selected interface role does not grant administrative privileges.

### 5.3.2 Profile Embeddings and Mentor Retrieval

The embedding text joins available headline, biography, skills, industry and graduation year. Skills, industry and year receive field labels. The server loads a quantized MiniLM feature-extraction pipeline and reuses its loading promise within the process. Mean pooling and normalization produce a 384-value representation. Profile saves trigger preparation of this representation; saving a profile does not train MiniLM or update its parameters.

The authenticated matching endpoint reads the user’s stored embedding and invokes the match_mentors database function. Its default result count is ten, capped at fifty for a positive integer request. An unauthenticated request returns HTTP 401; a missing stored vector returns 422 with profile-completion guidance; an RPC failure returns a generic retry message. Similarity ranking is accompanied by shared-field explanation information. Shared skills describe explicit overlap and must not be presented as a causal explanation of every neural score.

This design mitigates dependence on interaction history by using profile content. It requires usable text and an eligible mentor catalogue. An embedding cannot create missing mentors, establish their availability or infer an unstated mentoring goal. Keyword search supplies a separate lexical discovery route; it is not evidence that arbitrary free-text semantic search has been implemented.

### 5.3.3 Departures from the Earlier Design

Inference executes in the Next.js server through Transformers.js rather than the proposed external model API or Supabase Edge Function route. The running encoder uses 384 dimensions, superseding the 1,536-dimensional design mismatch identified in the report audit. Profile persistence and embedding generation are separate steps, with visible failure/retry handling; this is not evidence of a durable background retry queue. The repository records a scope amendment deferring jobs and events and narrowing cohort discovery to graduation-year information. Supervisor acceptance of report-level amendments must be established separately. No implemented knowledge-graph reasoning or measured graph contribution is claimed.

### 5.3.4 Mentorship Notification Emails and Optional Reminders

The 6 November release adds Resend activity mail for persisted mentorship requests, accepted connections, declined requests and recommendation-ready events. A durable address-free outbox separates the successful mentorship transaction from provider delivery. Delivery rechecks current preferences, request state, visibility, blocking, confirmed recipient identity and suppression. Bounded retries, leases and stable provider keys support recovery without generating fresh duplicate events. Account confirmation, sign-in and recovery mail remain separate from optional activity preferences.

Pending-request reminders require a separate default-off opt-in. A new request received after consent can generate one reminder once it is three days old, expires at seven days and shares a rolling weekly cap for the receiving Mentor. Withdrawal invalidates queued reminders. The authenticated settings also provide per-category controls and unsubscribe-all. Mention mail is explicitly deferred because there is no supported posts/comments/mentions feature.

## 5.4 Testing Strategy and Functional Evidence

Testing is divided into static checks, unit tests, database permissions, HTTP integration, browser observation and participant evaluation. Each layer answers a different question. An HTTP action test invokes real server behavior but does not exercise browser event handlers; manual browser acceptance does not supply representative-user usability scores. The following results are transcribed from dated evidence records and were not rerun during this chapter-writing milestone.

Table 5.2 Selected expected and recorded actual outcomes

| Case and date | Expected outcome | Recorded outcome and boundary |
| --- | --- | --- |
| Protected access; 28 Oct | Reject signed-out access | Profile redirects; embed/match APIs return 401. Local HTTP. |
| Empty input; 28–29 Oct | Reject unusable input and recover | 422 observed; valid saved headline/skills allow generation. Local HTTP/browser. |
| Profile vectors; 28–29 Oct | Persist valid compatible vectors | Finite normalized 384-value vectors checked. MiniLM only. |
| Request acceptance; 28–29 Oct | Recipient accepts and connection persists | Accepted state and one connection observed; re-login retained it. Local fixtures. |
| Permissions; 28 Oct | Reject unauthorized changes | Role escalation, other-profile edits and client vector writes rejected. Local SDK/database. |
| Onboarding; 29 Oct | Fresh user reaches recommendations | Minimal Mentor/Mentee saves generated embeddings; fixture Mentor appeared. Controlled near-identical text. |
| Google sign-in; 4 Nov | Existing accounts only | Unregistered identity rejected; registered identity reused locally and hosted. Issue #37. |

### 5.4.1 Defects and Retesting

A permission test reproduced anonymous acceptance of a known mentorship request. The original recipient comparison could evaluate to SQL NULL when no authenticated subject existed. Migration 20261028000001_request_response_auth.sql adds an explicit subject check, a null-safe recipient comparison and restrictions on anonymous execution. The expanded rollback-only permission suite passed locally, and an anonymous REST call returned PostgreSQL 42501 without changing the request or creating a connection. This retains the original defect and its corrective evidence rather than replacing the failure history.

The 29 October record reports passing lint, TypeScript and production-build checks, 26 relevant unit tests and 13 HTTP smoke checks, with fixture cleanup. These counts apply to that revision. The source-reconciliation record subsequently reports 45 application tests and 30 ML tests on its combined source. Neither record is represented as the current total or a new test execution.

A 5 November issue #36 update reports that omitting password confirmation in a direct Server Action request bypassed confirmation validation. A correction was recorded under #15, but the latest inspected issue text still required negative-regression and merge evidence. Earlier form and photo evidence therefore does not establish that this newly identified case is resolved.

## 5.5 Model Training and Matching Evaluation

### 5.5.1 From Scratch Engineering Pilot

The 2 November execution record documents random character embeddings of width 32, a Conv1d layer with 32 filters and kernel width five, max pooling and directional 64-value projection heads followed by L2 normalization. The model has 11,200 parameters. A 57-character vocabulary is fitted on training profiles only; input is truncated at 512 characters. The runner excludes annotation metadata from model inputs and uses explicit opt-in for unreviewed machine labels.

The recorded run uses seed 42, batch size 16, Adam at learning rate 0.001, a ten-epoch ceiling and patience three. Cosine predictions fit grade divided by three using mean squared error. Four epochs completed; epoch one was selected by lowest validation loss. Actual parameter updates and checkpoint reload were verified. Colab execution reproduced the local validation metrics and saved evidence to controlled Drive storage. Final held-out test performance was deliberately not accessed.

Table 5.3 Machine labelled pilot validation on five queries

| Metric | TF-IDF | Scratch neural |
| --- | --- | --- |
| nDCG@5 | 0.853932 | 0.502278 |
| Precision@1 | 0.800000 | 0.200000 |
| MRR@5 | 0.840000 | 0.433333 |
| Relevant-hit coverage@5 | 1.000000 | 0.800000 |

The scratch pilot underperforms TF-IDF on every reported metric. Five machine-labelled validation queries cannot establish real-world mentorship suitability, and neither additional epochs nor more powerful hardware guarantees improvement. Human relevance review, a frozen research protocol and final model selection remain outstanding. The 64-value directional outputs are incompatible with the application’s existing MiniLM vector space; integration requires a versioned inference contract and controlled re-embedding, not direct replacement of stored values.

### 5.5.2 Historical Pretrained Retrieval Experiment

A separate stored evaluation dated 5 July 2026 uses forty synthetic Mentors and twenty-four synthetic Mentee queries across eight domains. Relevance is generator-domain equality. It compares full-profile and minimal-profile MiniLM retrieval with keyword search using skills plus industry and skills alone. This dataset and task must not be combined with the scratch pilot’s validation results.

Table 5.4 Historical synthetic retrieval results requiring corrected evaluation

| Condition | P@1 | P@5 | MRR | Coverage |
| --- | --- | --- | --- | --- |
| Semantic full | 0.833 | 0.742 | 0.889 | 1.000 |
| Semantic minimal | 0.708 | 0.650 | 0.782 | 1.000 |
| Keyword and category | 0.917 | 0.842 | 0.951 | 1.000 |
| Keyword skills only | 0.708 | 0.525 | 0.729 | 0.875 |

### 5.5.3 Interpretation and Evaluation Limitations

The category-assisted method records the highest overall Precision@5. Full-profile semantic retrieval exceeds skills-only keyword retrieval in the saved aggregate comparison, but does not exceed the category-assisted baseline. On six constructed vocabulary-mismatch queries, semantic-full records P@5 of 0.767 versus 0.000 for skills-only keywords; category-assisted search records 0.933. This suggests a useful condition to investigate, not demonstrated general superiority.

The historical runner removes unlabelled candidates before scoring. Reported ranks can therefore differ from the original displayed ranking, and coverage means at least one scoreable result rather than at least one suitable mentor. Domain labels are a coarse proxy, raw per-query rankings are not retained in the aggregate report, and the synthetic sample is small. A corrected comparison must preserve rank positions, freeze candidate membership, retain complete outputs and use independently reviewed relevance judgments. The figures above remain historical preliminary evidence.

## 5.6 Cold Start Performance and Usability

Issue #4 now adds a repeatable isolated browser/Auth/database/model suite, merged in PR #84. Two local trials and the independent CI trial each passed 12 scenario groups, including genuinely fresh signup, zero/one/two request histories, new Mentor discovery, empty catalogue, privacy, interrupted inference and real request/acceptance. A reproduced stale-vector defect led to a private trigger that clears stored inference when matching inputs change; existing refresh/retry then regenerates it. The 7 November hosted audit found that migration absent, so this correction is merged and locally/CI verified but still awaiting its authorized database release.

Scripted profile-save-to-first-result observations against two fictional candidates were 240 ms and 211 ms locally and 555 ms in CI. They are not human onboarding measurements, load benchmarks or evidence of suitable recommendations. A no-shared-skills case still returned candidates, reinforcing the need for independent relevance judgments. `docs/verification/cold-start.md` retains raw failures, successful trials, model/source identities, cleanup and the boundary between normal MiniLM recommendations and experimental scratch comparison. Final-model, graph and human-evaluation requirements remain open.

The 29 October browser record demonstrates a local zero-history journey: fresh Mentor and Mentee fixtures save headline and skills, receive automatic MiniLM embeddings, discover a controlled Mentor, send and accept a request, and retain the connection after re-login. This establishes functional feasibility with the stated fixtures. It does not measure recommendation quality, population coverage or elapsed time to first suitable match. Cases with zero, one and two interactions, insufficient text, no eligible catalogue and inference failure require explicit final-model coverage.

The earlier report specifies that at least 95% of matching queries should return within two seconds at up to one hundred concurrent requests. No reviewed measurement establishes this target. Retrieval-only latency, model initialization, embedding inference and the full user request require separate timing boundaries. The final benchmark must report workload, infrastructure, corpus size, cache conditions, request counts, errors and latency percentiles. No production load test was performed for this chapter.

The earlier report also states a mean System Usability Scale target of at least 68. No completed representative-user study or genuine scored SUS responses were located in the reviewed evidence. Browser checks and automated accessibility checks cannot substitute for this study. After the applicable approval process, real Mentor/Mentee participants must complete defined tasks and the standard ten-item questionnaire. The report must retain the actual sample size, assistance, unsuccessful tasks, score dispersion and limitations.

## 5.7 Deployment Evidence and Remaining Acceptance

Issue #33 supplies additional bounded production evidence from 6 November. PR #82 merged at `0126be8c`; the reminder migration was applied and eligible-member delivery enabled after controlled acceptance. Four request/reminder/decline/recommendation messages reached the approved owner-controlled inbox, complementing the earlier two-party connection delivery record under #34. Hosted preference, privacy/lifecycle and duplicate checks passed; all disposable accounts and dependent data were removed. The reminder test accelerated only disposable consent/request timestamps and does not establish three days of elapsed observation. Provider-outage and bounce/complaint behavior retain automated coverage, with actual provider-signed delivery callback evidence recorded separately. `docs/verification/resend-delivery.md`, sections 12 and 14, identifies the deployments, migrations, worker runs, inbox observations and limitations. These results do not establish recommendation relevance, participant usability or complete account-code verification.

A hosted Vercel application and Supabase backend are documented. Issue #37 supplies bounded hosted Google authentication evidence; the email-OTP record separately reports provider configuration and owner-confirmed inbox delivery, with the complete session journey still awaiting its recorded acceptance gate. Neither result proves every account, recommendation or email workflow. Final hosted acceptance must identify deployment, source and model versions and verify the selected scratch artefact in the full mentorship path.

The evidence establishes an implemented profile-based platform, local mentorship workflow observations and a reproducible scratch-training pilot with a negative validation result. Final claims remain limited by unreviewed relevance data, absent live scratch-model integration, unverified graph contribution, missing load measurements and missing participant usability results. These gaps must remain visible when assessing the objectives.

## 5.8 Evidence References and Completion Register

The following project records identify the sources for this chapter. Dates refer to recorded executions, not new checks performed while writing. Repository paths are relative to the AlumniConnect source tree. Final report assembly should replace this working evidence register with the institution’s required citation and appendix format while preserving traceability.

Table 5.5 Sources and final evidence still required

| Evidence source | Use and remaining work |
| --- | --- |
| package.json; lib/embedding/embed.ts; app/api/match/route.ts | Current declared environment and inference contract; final release needs exact lockfile/deployment/model identity. |
| docs/environment-verification.md | 28–29 October local HTTP, database and browser records; final scratch-model and hosted retest required. |
| docs/source-reconciliation-2026-11-04.md | Combined-source static/application/ML verification; not a current rerun. |
| docs/ml-pilot-training.md | 2 November configuration, parameter updates, checkpoint reload and local/Colab validation. |
| docs/eval-results.md | Historical 5 July aggregate scores; repair scoring and preserve raw rankings under #3. |
| GitHub issues #36 and #37 | Registration regression boundary and verified existing-account Google authentication. |
| docs/verification/email-otp.md | Recorded local/hosted OTP evidence and remaining acceptance boundary. |
| docs/verification/resend-delivery.md, sections 12 and 14; issues #33 and #34 | Controlled observed activity-mail delivery, opt-in reminder lifecycle, authenticated unsubscribe, published source/database and eligible-member release; accelerated fixture age and automated failure evidence remain distinct from live observation. |
| Issues #3–#5, #8, #25–#27 and #29 | Reviewed relevance, cold start, SUS, release, selected training, integration, graph and performance dependencies. |

### Evidence required before final submission

Insert sanitized screenshots from the identified assessed release for profile preparation, recommendations, request response and persistent connection. Give each figure a numbered caption, environment/date and an explanation of what the image demonstrates. No current screenshots were inserted because the available review did not establish a matching final-model release. Avoid screenshots containing personal profiles, codes or access tokens.

Complete reviewed evaluation, selected scratch-model integration, the agreed graph contribution, bounded performance testing and real usability analysis. Add expected and actual results, raw-output references, defects and retests. Reconcile Chapter 4 diagrams and requirement IDs with the final architecture, obtain genuine supervisor review where required, and refresh all contents, figure and table lists after merging this chapter into the master report.
