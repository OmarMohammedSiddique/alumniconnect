# Live GitHub issue register

Snapshot: 10 November 2026, Africa/Nairobi. Read live through the connected GitHub service. This snapshot preserves acceptance criteria; check live state before new work. Issue state is determined from a separate live open-issue query, because the all-issue response omitted state values. No issue is closed by this handover.

## #1: Record the confirmed scratch-training and live-model acceptance requirements

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/1

## Problem

Earlier wording treated pretrained inference, fine-tuning and scratch training as an unresolved choice. On 4 November 2026 the student confirmed that training a model from scratch is formally required and that the final live application must use it. Knowledge-graph advice, permitted data and detailed acceptance criteria still need a bounded recorded decision.

## Desired outcome

An authoritative requirements/decision record aligns the report, experiments, live integration and acceptance tests. This issue records requirements; it does not certify training or deployment completion.

## Current evidence ,  4 November 2026

- [x] Student confirmed the requirement to train from scratch.
- [x] Student confirmed that the final live app must use the scratch-trained model.

These confirmations are student-provided requirements, not a newly obtained supervisor signature or written approval. Do not repeat the settled initialization question as a blocker on all work.

## Scope and delivery

Record the confirmed requirement and supporting source/date where available; settle remaining data, evaluation and knowledge-graph boundaries; propagate decisions to the checklist and report.

## Acceptance criteria

- [x] Preserve a dated requirement record and identify the supervisor/course source or written evidence where available, without inventing approval.
- [x] Define what counts as scratch training, including prohibited pretrained weights/components and permitted libraries/preprocessing.
- [x] State explicitly that final live recommendations use the selected trained artefact, and define how release verification will prove this.
- [x] Confirm permitted external/synthetic data, privacy/licence restrictions and human-review expectations.
- [x] Agree task-appropriate baselines, metrics, final-test procedure and model acceptance criteria without requiring a fabricated improvement.
- [x] Resolve the bounded knowledge-graph deliverable under #27 and record any effect on model or scope.
- [x] Update proposal traceability, project checklist and affected report sections; identify significant methodology/scope amendments for supervisor review.

## Validation

Check that requirements, issue criteria, experiment protocol and report describe the same task and integration obligation. Distinguish confirmed requirements from unresolved details and evidence of actual completion.

## Dependencies and related work

#25 owns research-ready scratch training; #26 live integration; #3 reviewed evaluation; #27 the graph contribution; #28 Chapters 1-3 corrections; #7 retained supporting modules. Existing pilot work remains valid as engineering evidence within its documented limits.

Priority: high; record the settled requirement now and resolve remaining acceptance details before final model selection.

## Completion evidence

Link the relevant versioned documents, focused Gitmoji commits/PRs, run/test records and sanitized figures as applicable. Keep local, CI, hosted and participant-study evidence distinct. Do not publish credentials, signed documents, private datasets or identifiable participant information. Close only when the acceptance criteria are verified; record unresolved limitations honestly. Source changes should be completed and verified as focused logical milestones.

## #2: Build the ML system guide and executable walkthrough

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/2

Make the existing ML pipeline visible and understandable before changing it.

Acceptance criteria:
- [x] Document profile text construction, tokenization, pooling, normalization, 384-dimensional embeddings, cosine similarity, and pgvector ranking.
- [x] Reference the exact implementation files.
- [x] Add a deterministic terminal walkthrough that embeds sample profiles and ranks mentors without Docker.
- [x] Include a vocabulary-mismatch example.
- [x] Include oral-defense questions and answers.
- [x] Do not change production matching behavior.

## Verified completion scope ,  4 November 2026

PR #40 merged the current guide correction as `b8e7056` after required CI passed. `npm run ml:walkthrough` was rerun and passed: four finite 384-value vectors, norms 1.000000 and the vocabulary-mismatch Mentor ranked first (0.329469). The guide covers all six original documentation/walkthrough criteria, and the PR changes documentation only.

This issue certifies the guide and frozen-pipeline walkthrough only. It does not certify model quality, reviewed labels, final scratch training or live-model integration; those remain open in #3, #25 and #26.


## #3: Repair matching evaluation and freeze human-reviewed relevance judgments

State: OPEN

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/3

## Problem

The historical synthetic evaluation removes unlabelled candidates before scoring, uses domain membership as a relevance proxy and does not retain complete raw per-query rankings. Its overall category-assisted keyword result exceeds semantic matching. The separate scratch pilot has 90 profiles/160 unreviewed machine labels and only five validation queries; its results cannot be mixed with the older 24-query experiment.

## Desired outcome

A reproducible, frozen, independently reviewed evaluation protocol and fair comparison of the selected scratch model, lexical controls, frozen MiniLM and any retained graph-assisted variant.

## Scope and delivery

1. Define the directional mentorship-relevance task, rubric, review procedure, sampling and independent pools.
2. Repair and verify scoring, preserve complete rankings and freeze reviewed data/protocol before final selection/evaluation.
3. Run the fixed final comparison and report sample sizes, errors, uncertainty and negative results.

This issue owns data/judgment validity and final comparative evaluation. #25 owns parameter fitting/validation selection; #26 owns live model use; #5 owns usability. None substitutes for the others.

## Acceptance criteria

- [ ] Define a blinded goal/offer suitability rubric and insufficient-evidence policy; reviewers do not see model ranks or initial machine rationales before judgment.
- [ ] Complete permitted human review/adjudication with private reviewer provenance; retain original grades and reviewed corrections separately.
- [ ] Document source permissions/provenance, counts, independent people/templates, distributions, exclusions and representativeness limits.
- [ ] Keep all records for related people/templates in the appropriate split and fit learned preprocessing on training only; inspect duplicates, shortcuts and annotation metadata leakage.
- [ ] Keep the 740 unjudged training combinations unknown rather than assigning negative labels; fully judge the retained bounded validation/test candidate pools.
- [ ] Freeze dataset, candidate membership, splits, rubric and protocol with manifests/hashes; acknowledge any already-used evaluation data.
- [ ] Verify original rank preservation, Precision@k cutoffs/denominators, nDCG, MRR, ties, missing outputs, zero-relevance cases and distinct coverage definitions using hand-worked edge cases.
- [ ] Save full raw per-query scores/ranks, judgments and aggregate calculations with code/data/model versions; do not silently drop unjudged candidates or failed queries.
- [ ] Compare agreed semantic/scratch, keyword-only, TF-IDF and category-assisted methods on the same fields/query/candidate pools; evaluate graph variants only under #27's agreed protocol.
- [ ] Lock model/configuration using validation before opening final test performance; if test findings guide changes, disclose that and obtain an appropriate new independent assessment.
- [ ] Independently check calculations; report per-domain/difficult-case results, query counts and uncertainty where supported, without overstating tiny samples.
- [ ] Preserve historical/negative results and isolate all experiments from production; do not run destructive evaluation cleanup against shared member data.

## Validation

Reproduce scoring from saved raw rankings and have an independent calculation check representative normal and edge cases. Report evaluated profile relevance, not proven mentorship success or population-level superiority. Retain a reproducible final evaluation report for #6.

## Dependencies and related work

#1 requirements, #24 source reconciliation, #25 training, #26 integration, #27 graph, #4 cold start, #5 SUS and #28 literature/method alignment.

Priority: high; a prerequisite for defensible final research claims.

## Completion evidence

Link the relevant versioned documents, focused Gitmoji commits/PRs, run/test records and sanitized figures as applicable. Keep local, CI, hosted and participant-study evidence distinct. Do not publish credentials, signed documents, private datasets or identifiable participant information. Close only when the acceptance criteria are verified; record unresolved limitations honestly. Source changes should be completed and verified as focused logical milestones.

## #4: Demonstrate and measure cold-start recommendations for new users

State: OPEN

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/4

**Current engineering status (7 November):** The approved production migration is applied and hosted recovery checks passed. Earlier pending-migration notes below are historical and superseded by the hosted acceptance record. Final research/model criteria remain open.

## Problem

Profile-based matching can work without interaction history, but signup creates a name-only profile and recommendations depend on usable saved content, compatible embeddings and eligible mentors. Historical sparse-profile metrics and a successful local journey do not establish final cold-start relevance, latency or coverage. Model/server startup latency is a separate concern.

## Desired outcome

A precise, demonstrated and measured account of new-user/new-mentor matching, including the final scratch-trained live model and honest failure/fallback boundaries.

## Current evidence

October records demonstrate a controlled local signup → usable profile → embedding → discovery → request → acceptance/connection journey using MiniLM, including empty-input/retry recovery. This is partial progress, not final scratch-model or hosted acceptance.

## Acceptance criteria

- [x] Define the cold-start claim, minimum usable profile and eligible mentor prerequisites; distinguish zero history, sparse/empty inputs, empty catalogue and runtime/model cold start.
- [x] Document and verify signup versus first profile completion, automatic embedding creation, model version and first recommendation availability.
- [x] Test genuinely new Mentees with zero interactions and, where retained in the report, the stated fewer-than-three-interactions cases.
- [x] Test new Mentors becoming discoverable after permitted profile completion and compatible inference, with visibility/eligibility enforced.
- [ ] Cover sparse profiles, unfamiliar skills, no suitable mentor, no eligible mentors, missing/stale vectors, inference failure and safe retry without fabricated matches or lost edits.
- [ ] Define and record onboarding/profile-entry time separately from saved-profile-to-first-result and inference/retrieval timings; report attempts, successes, failures and coverage denominators.
- [ ] Judge recommendation relevance under #3 rather than interpreting any nonempty result as a suitable match.
- [x] Verify RLS/authorization throughout and prevent cross-user or incompatible-model access.
- [x] Add an isolated repeatable end-to-end/browser test with disposable accounts and cleanup.
- [ ] Repeat final applicable cases using the integrated scratch model and assessed hosted release; keep earlier MiniLM/local evidence clearly labelled.
- [ ] Explain whether and how the agreed graph component contributes, with comparative evidence under #27 rather than assuming it solves missing data.

## Validation

Use a recorded candidate pool, genuinely fresh accounts and timestamped conditions. Save per-case expected/actual outcomes, measured results, defects/retests and scoped cleanup evidence. A model cannot supply mentors absent from the catalogue or reliably infer unstated goals.

## Dependencies and related work

#3 relevance, #25 training, #26 live-model integration, #27 graph, #8 hosting, #29 performance, #18 drafts, #21 bounded inference and #6 reporting. Initial evidence can be collected before final integration but does not close final-model acceptance.

Priority: high; this directly answers a supervisor question and the project's cold-start objective.

## Completion evidence

Link the relevant versioned documents, focused Gitmoji commits/PRs, run/test records and sanitized figures as applicable. Keep local, CI, hosted and participant-study evidence distinct. Do not publish credentials, signed documents, private datasets or identifiable participant information. Close only when the acceptance criteria are verified; record unresolved limitations honestly. Source changes should be completed and verified as focused logical milestones.

## Verified current-model engineering baseline, audited 7 November 2026

[PR #84](https://github.com/OmarMohammedSiddique/alumniconnect/pull/84) is merged at `4aad49e` after every check passed, including the new real cold-start browser job. [CI run 42258825560](https://github.com/OmarMohammedSiddique/alumniconnect/actions/runs/42258825560) passed all 12 groups with zero remaining test accounts/profiles. Two earlier local fresh-stack trials also passed 12/12 and exact cleanup. Scripted profile-save-to-first-result observations against two fictional candidates were 240 ms, 211 ms and 555 ms (CI); these are small functional observations, not human entry times, load benchmarks or relevance judgments.

Checked criteria above describe the present MiniLM engineering baseline. The suite covers real signup, zero/one/two distinct request interactions, new Mentor discovery, empty catalogue, sparse/unfamiliar input, separate 384/64-value model outputs, interrupted refresh/retry, both block directions, hidden profiles, explicit availability, cross-user denial, wrong vector width, stale persistence, browser request/acceptance and scoped accessibility. It uses its own empty local project, disables fixture mail, cleans exact accounts and stops the dedicated stack.

A reproduced stale-vector defect is fixed by migration `20261106165316_invalidate_stale_profile_embeddings.sql`: matching-input changes atomically clear old inference, while the existing refresh/retry and timestamp guard rebuild/preserve the correct snapshot. Local/CI SQL verification passed. The 7 November hosted audit found production `4aad49e` READY but this trigger/migration absent, so the correction is not yet active in hosted profile writes. The exact migration and controlled hosted verification are pending explicit production approval in chat. No hosted changes are claimed.

[PR #85](https://github.com/OmarMohammedSiddique/alumniconnect/pull/85), source `096d016`, publishes all four sanitized raw records (including the failed before-fix regression), the protocol/results explanation and Chapter 5 update. Its publication checks passed and it merged at `0a80b20`. The CI artifact's script/migration hashes match the committed files.

Keep #4 open. Unchecked criteria retain meaningful pending requirements: reviewed suitability/no-suitable-Mentor assessment under #3, genuine human profile-entry timing where claimed, selected final scratch-model integration/repetition under #25/#26, and the actual supervisor graph decision/comparison under #27. A no-shared-skills profile still receives ranked candidates; a nonempty list is not a relevance success. The engineering pilot and current MiniLM results must remain labelled separately from final assessed acceptance.


## Evidence publication completed, 7 November 2026

PR #85 merged at `0a80b2072c6647214319e461977c1c5420049421` after all quality, database, cold-start browser, ML, CodeQL and preview checks passed. Its independent [CI run 42296300065](https://github.com/OmarMohammedSiddique/alumniconnect/actions/runs/42296300065) again passed all 12 groups and read back zero accounts/profiles after cleanup. Published evidence: `docs/verification/cold-start.md`, four sanitized JSON records under `docs/verification/cold-start/`, and the Chapter 5 update. The raw before-fix failure remains retained.

The production migration approval question remains pending, so the new trigger is still not claimed active on hosted writes. The code, CI regression infrastructure, protocol and report/evidence publication are completed and merged. The unchecked research/final-model/human requirements above remain substantive; #4 must stay open until they are verified. No human judgments, graph decisions, hosted migration or final-model acceptance were inferred from the engineering results.


## Approved production migration and hosted acceptance, 7 November 2026

The user explicitly approved the exact hosted migration and disposable verification. Applied `20261106165316_invalidate_stale_profile_embeddings.sql` as hosted history version `20261106213149_invalidate_stale_profile_embeddings`. Read-back confirmed the trigger enabled, invoker privileges and no ordinary-member/anonymous direct access to its private schema/function. Existing vectors were not backfilled. The security advisor's finding names/counts were unchanged from its pre-migration baseline.

Six direct-browser hosted groups passed on source `0a80b20`: name-only rejection; real Mentor/Mentee form saves producing 384-value vectors and zero-history discovery; preserved saved goal plus immediate null vector after a controlled refresh HTTP 503; real Retry update recovery; same-value/vector-write/cross-user guards; and separately identified MiniLM/scratch outputs. These used administratively preconfirmed fictional fixtures, not a claim of hosted signup-code acceptance.

All fixture activity categories were disabled before content/inference. No fixture event recorded sent/provider-accepted status. Exact guarded cleanup, including sign-out, removed the two test accounts. Independent SQL read-back confirmed zero marked accounts, zero fixture profiles, zero fixture outbox records and the trigger still enabled. No real member profile/password changed.

The correction is now active in production: matching-input edits atomically clear old inference and use the existing refresh/retry path. Sanitized raw results and Chapter 5 updates are committed as `a465b80` in [PR #86](https://github.com/OmarMohammedSiddique/alumniconnect/pull/86), merged at `863b10f` after all publication checks passed. This supersedes all earlier pending hosted-migration status.

The current-model engineering/release work is complete. #4 remains open only for its remaining substantive research/assessment requirements: reviewed relevance and no-suitable-Mentor assessment (#3), genuine human entry timing where claimed, final selected scratch-model integration/repetition (#25/#26), and an actual supervisor graph decision/comparison (#27). These results must not be relabelled as independent human judgments or final model acceptance.


Hosted engineering evidence is published in merged PR #86 (`863b10f`). Its [CI run 42298069907](https://github.com/OmarMohammedSiddique/alumniconnect/actions/runs/42298069907) passed quality, database, all 12 cold-start browser groups and ML regression; CodeQL and both previews passed too. The production migration/verification step is complete. No further production authorization is pending for this correction. The remaining unchecked criteria are the linked research/final-model/human assessment requirements, so #4 stays open.


## #5: Plan and run representative-user usability testing with SUS

State: OPEN

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/5

## Problem

Specific Objective v and the report's SUS target require human usability evidence. Automated tests, a polished interface and synthetic relevance scores do not establish that intended users can complete mentorship tasks. No completed representative-user study was located in the audit.

## Desired outcome

An approved-as-required, consent-conscious study with real Mentor/Mentee task outcomes, standard SUS responses, checked scoring and a bounded discussion of usability.

## Scope and delivery

1. Agree recruitment, study tasks, sample rationale, data handling and any required supervisor/ethics process.
2. Pilot the procedure, run sessions on an identified stable release, and collect tasks/SUS before debriefing.
3. Analyse findings, correct major defects and record appropriate retests and limitations.

## Acceptance criteria

- [ ] Record required supervisor/ethics approval or the applicable approved process before recruitment/data collection; do not invent approval.
- [ ] Define intended Mentor/Mentee participant criteria, attainable sample rationale and relevant characteristics without unnecessary identifiers.
- [ ] Prepare representative tasks, consent wording, neutral instructions, success criteria and safe test data; avoid coaching that hides usability problems.
- [ ] Identify code/deployment/model version and environment; distinguish formative testing from final acceptance and repeat relevant tasks after consequential changes.
- [ ] Record task completion, errors, assistance, relevant timing and observed difficulties with participant-safe notes.
- [ ] Administer the standard ten-item SUS after tasks and before debriefing; preserve item wording/scales and record genuine responses only.
- [ ] Verify per-participant and aggregate SUS calculations; justify the retained benchmark/target and report counts/dispersion and limitations.
- [ ] Keep consent/identities private and retain only permitted de-identified responses/evidence in the repository; define access, retention and withdrawal handling as applicable.
- [ ] Link findings to actionable defects, fixes and retests; report unsuccessful tasks and mixed findings honestly.
- [ ] Update Chapter 5 findings and Chapter 6 conclusions without extrapolating to real mentorship success or an unrepresented population.

## Validation

Pilot the task/SUS procedure, independently recompute example and final scores, check de-identification, and reconcile analysed counts with actual sessions. Do not infer a SUS result from test automation or generate participant responses.

## Dependencies and related work

Arrange participants early. Coordinate stable workflow delivery with #14-#19, membership #23, final model #26, hosted access #8, report #6 and final handover #31. Use actual study requirements rather than hypothetical compliance gates.

Priority: high; participant availability and review lead time affect the final evidence schedule.

## Completion evidence

Link the relevant versioned documents, focused Gitmoji commits/PRs, run/test records and sanitized figures as applicable. Keep local, CI, hosted and participant-study evidence distinct. Do not publish credentials, signed documents, private datasets or identifiable participant information. Close only when the acceptance criteria are verified; record unresolved limitations honestly. Source changes should be completed and verified as focused logical milestones.

## #6: Complete Chapters 4-6 and reconcile the final report evidence

State: OPEN

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/6

## Problem

The most developed report located in the 4 November audit ends at Chapter 5.4 and describes a September revision. Later implementation/training evidence is scattered, Chapter 6 is absent and several design figures are wrong, missing or miscaptioned. The report, current code and final required scratch-model release must agree.

## Desired outcome

Reviewed Chapters 4-6 and consistent front matter/abstract, with traceable actual implementation, tests, research findings, conclusions and limitations.

## Scope and delivery

1. Repair Chapter 4 requirements/design views against the retained system and chosen model/graph architecture.
2. Update Chapter 5 with versioned implementation, deployment, training, evaluation and test evidence.
3. Write Chapter 6 from those findings, then reconcile the whole report and abstract.

#28 owns Chapters 1-3 and source/SMART repairs; this issue owns the later chapters and final consistency, not the experiments themselves.

## Acceptance criteria

- [ ] Map retained requirement IDs to objective/source, priority, design/module, test/evaluation, actual result and evidence; resolve terminology, privacy and scope differences.
- [ ] Produce appropriate current use-case, sequence, ERD/logical schema, activity, architecture and UI/wireframe views; provide a justified class/component view or approved substitute for promised diagrams.
- [ ] Correct the observed 1,536-versus-384 vector mismatch, changing sequence actor labels, internal-system actor, class figure under activity heading and missing schema/wireframe/architecture figures; depict the final selected dimensions/model accurately.
- [ ] Add readable figures, editable sources, numbered captions and narrative-diagram-interpretation; verify names/flows against actual code and migrations.
- [ ] Document significant deviations from proposed model API, Edge Functions, role names, profile timing, search breadth and retained scope without silently inventing features.
- [ ] Record actual environment/dependency/model/data versions, setup/deployment, training/selection, integration and reproducibility; supersede stale September failures/absence claims with dated corrective evidence.
- [ ] Present functional, permission, failure/recovery, matching, cold-start, performance and human-usability evidence with expected/actual outcomes, sample sizes, raw-output references, defects/retests and limitations.
- [ ] Include genuine version-control evidence from #9 and factual AI-use declaration/log entries; document tool assistance, verification and retained human decisions without fabricated history.
- [ ] Complete the course's manual/two-AI diagram comparison and associated log if still outstanding, following the supplied classroom narrative and manual-first sequence; do not confuse it with AlumniConnect functionality or manufacture a prior manual attempt.
- [ ] Discuss results by objectives, preserve negative/mixed baseline findings, and distinguish judged profile relevance from mentorship outcomes and code existence from runtime acceptance.
- [ ] Complete Chapter 6: answer every objective/research question from Chapter 5, state the bounded contribution, give audience-specific recommendations and prioritised evidence-based future work without hiding unmet required scope.
- [ ] Rewrite the abstract last, update tense/front matter and current submission details, refresh contents/figure/table lists and cross-references, check APA/reference consistency and visually verify the final export.
- [ ] Review report, working release and evidence together with the supervisor and record required corrections and disposition; obtain genuine approvals under current instructions.

## Validation

Perform a complete objective-to-evidence review and inspect final page renders for missing/unreadable figures, layout and stale fields. Keep original failures/historical results available and link retests; do not claim evidence merely because it was planned.

## Dependencies and related work

#28 Chapters 1-3, #1 requirements, #3 evaluation, #4 cold start, #5 SUS, #7 scope, #8 hosting, #9 workflow, #25 training, #26 integration, #27 graph, #29 performance and #31 final handover. Writing can proceed alongside verified milestones.

Priority: high; maintain the master report throughout development, not only at final submission.

## Completion evidence

Link the relevant versioned documents, focused Gitmoji commits/PRs, run/test records and sanitized figures as applicable. Keep local, CI, hosted and participant-study evidence distinct. Do not publish credentials, signed documents, private datasets or identifiable participant information. Close only when the acceptance criteria are verified; record unresolved limitations honestly. Source changes should be completed and verified as focused logical milestones.

## #7: Decide and complete or formally re-scope jobs, cohorts, and events

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/7

## Problem

The approved proposal includes a job referral board, cohort grouping and event management, but implemented workflows or an approved scope amendment were not established by the audit. The final report cannot silently move promised work into future enhancements.

## Desired outcome

An explicit supervisor-reviewed scope decision for each module, followed by delivery and verification of retained functionality or a documented approved amendment reflected throughout the project.

## Scope and delivery

1. Agree the smallest useful assessed scope and priorities in light of required scratch-model/graph and evaluation work.
2. For retained modules, define role-scoped user tasks, data, permissions, states and acceptance criteria before implementation.
3. Deliver focused verified milestones and update traceability/report evidence.

## Acceptance criteria

- [x] Record current requirement source and the decision owner/date for jobs, cohorts and events separately.
- [x] Confirm each module is retained, narrowed or explicitly removed; obtain the necessary supervisor decision and preserve the original requirement/change rationale.
- [x] For retained scope, define a useful minimum workflow, actors, validation, persistence, visibility/eligibility, error/recovery states and acceptance tests.
- [x] Implement retained modules with database/API enforcement and appropriate functional/permission tests; verify normal and unauthorized cases.
- [x] Update affected objectives, scope, Chapter 4 diagrams, Chapter 5 tests, Chapter 6 limitations and project checklist consistently.
- [x] Link approved deferrals to their effect on objectives/release restrictions; do not mark an unimplemented retained module complete.

## Validation

Review the decision matrix with the supervisor and demonstrate every retained workflow using permitted disposable data. Reconcile implemented scope with the final report and assessor demonstration.

## Dependencies and related work

Coordinate #1 required model work, #27 graph scope, #23 membership, #19 privacy, #28 earlier chapters, #6 later chapters and #31 handover. A mentioned-in-a-post email under #33 does not by itself add a social feed/posting requirement; scope any such feature separately.

Priority: early scope decision; implementation order follows the approved retained requirements.

## Completion evidence

Link the relevant versioned documents, focused Gitmoji commits/PRs, run/test records and sanitized figures as applicable. Keep local, CI, hosted and participant-study evidence distinct. Do not publish credentials, signed documents, private datasets or identifiable participant information. Close only when the acceptance criteria are verified; record unresolved limitations honestly. Source changes should be completed and verified as focused logical milestones.


## #8: Verify the hosted release, final model runtime and role-specific workflows

State: OPEN

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/8

## Problem

The README documents an existing live deployment. The old “deploy first preview” wording no longer describes all progress, but a live landing page does not establish complete hosted acceptance. The final system must run the selected scratch-trained model rather than merely retain a separate notebook.

## Desired outcome

An identified, operational hosted release with verified backend, auth/email, model runtime, permissions, complete workflows and reproducible configuration.

## Scope and delivery

1. Inventory the actual deployment/model/environment versions and document development/test/production isolation.
2. Verify the retained hosted workflows and model-serving constraints with safe test accounts.
3. Record failures, repairs, retests, operating instructions and release limitations.

## Current evidence

- [x] A live demo URL is documented in the repository.

This is a source observation, not a fresh authenticated hosted acceptance result.

## Acceptance criteria

- [ ] Record actual deployment/commit/model IDs, URL, backend project/environment and configuration ownership without exposing secrets.
- [ ] Configure and verify separate hosted development and production environments as originally required, or record an explicit reviewed amendment and equivalent isolation boundary.
- [ ] Verify preview/staging and production configuration, safe secrets and environment-specific auth/email redirects; confirm migrations/permissions on the intended target.
- [ ] Complete role-specific signup/login, profile save, inference, recommendations, keyword search, requests/responses/connections and staff checks using permitted disposable data.
- [ ] Verify applicable confirmation/recovery, email OTP and event-email workflows under #15, #32 and #33 with actual delivery evidence.
- [ ] Confirm the final deployed recommendations use the selected scratch-trained model and compatible vectors under #26; initial MiniLM checks remain labelled separately.
- [ ] Measure runtime/model startup and inference behavior, bundle/model size, memory/time limits and dependency availability; document/test a suitable serving alternative if the chosen route is unsuitable.
- [ ] Verify invalid input, expired sessions, unauthorized access, dependency outages, retries and recovery; distinguish a working page from a working backend/model.
- [ ] Check HTTPS, canonical domain/redirect behavior and any retained custom-domain configuration only after the release is stable; do not purchase a domain merely to close this issue.
- [ ] Record cleanup, sanitized logs/screenshots, defects/retests, monitoring/access and rollback/maintenance instructions; keep the release available for assessment.

## Validation

Execute the real hosted role-specific journey and inspect corresponding permitted records/logs. Confirm outputs/model versions and failure behavior, then retain a repeatable smoke procedure. Observe cost/access boundaries and obtain authorization for deployment or production-data changes.

## Dependencies and related work

#24 reconciled source, #26 model integration, #4 first-match measures, #29 performance, #21 inference protections, #20 CI, #13 dependency follow-up, #6 report and #31 handover. Account/security and notification mail are separate but coordinated flows.

Priority: high; required operational acceptance rather than first-deployment setup alone.

## Completion evidence

Link the relevant versioned documents, focused Gitmoji commits/PRs, run/test records and sanitized figures as applicable. Keep local, CI, hosted and participant-study evidence distinct. Do not publish credentials, signed documents, private datasets or identifiable participant information. Close only when the acceptance criteria are verified; record unresolved limitations honestly. Source changes should be completed and verified as focused logical milestones.

## #9: Document genuine GitHub workflow, sprint reviews and delivery evidence

State: OPEN

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/9

## Problem

Meaningful commits, issues and PRs exist, but the complete evidence trail from sprint goals to changes, checks, reviews and outcomes is not assembled. The current guide places version-control implementation evidence in Chapter 5; earlier wording called it Chapter 4 evidence.

## Desired outcome

A concise, defensible Chapter 5 account of the solo development workflow, linked to actual repository history and genuine supervisor/sprint decisions.

## Acceptance criteria

- [ ] Export/capture the repository Insights commit graph at the agreed reporting date and record its actual scope/date.
- [ ] Build a chronological table linking meaningful commits/PRs to sprint goals, issues, verification and observed outcomes.
- [ ] Explain issue → branch → focused Gitmoji commits → PR/self-review → CI → integration/release, including actual variations in the solo workflow.
- [ ] Record sprint dates/goals, reviews, retrospectives and supervisor decisions that genuinely occurred; identify unavailable records rather than inventing daily logs or ceremonies.
- [ ] Explain concentrated work periods honestly; no backdated/empty commits, rewritten dates or artificial activity.
- [ ] Confirm the actual commit author email is associated with the GitHub account without exposing private account details in public evidence.
- [ ] Distinguish local-only, pushed, merged and deployed work; include the source reconciliation under #24 and demonstrated release/model identities.
- [ ] Link relevant project-board items/milestones, representative issues/PRs, check runs and report section; use substantive PR descriptions for future changes rather than untouched templates.
- [ ] Include the 5 November review outcomes under #30 and subsequent accepted actions, without inventing a grade or approval.

## Validation

Trace sample rows from the report back to actual commits, discussions, checks and artefacts. An issue description or screenshot alone is not proof that its work was executed. Preserve existing history and report the process actually used.

## Dependencies and related work

#24 source reconciliation, #20 CI, #30 sprint review, #6 Chapter 5 and #31 final release. Public evidence must omit private feedback/participant details and signed documents.

Priority: required documentation evidence; maintain it alongside verified milestones.

## Completion evidence

Link the relevant versioned documents, focused Gitmoji commits/PRs, run/test records and sanitized figures as applicable. Keep local, CI, hosted and participant-study evidence distinct. Do not publish credentials, signed documents, private datasets or identifiable participant information. Close only when the acceptance criteria are verified; record unresolved limitations honestly. Source changes should be completed and verified as focused logical milestones.

## #13: Resolve remaining minimatch and deepmerge dependency alerts

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/13

## Problem

PR #12 resolved the earlier critical/high dependency findings. This issue tracks the two remaining Dependabot alerts and the evidence needed to close them. Dependency remediation is separate from the product improvements in #14-#19.

## Remaining alerts

| Alert | Dependency / severity | Remediation status |
| --- | --- | --- |
| [#41](https://github.com/OmarMohammedSiddique/alumniconnect/security/dependabot/41) | deepmerge / low | Affected shadcn dependency chain removed locally; pending integration into the default branch and a Dependabot rescan. |
| [#46](https://github.com/OmarMohammedSiddique/alumniconnect/security/dependabot/46) | minimatch / moderate | Remaining copies belong to development tooling. A supported upstream fix or compatible toolchain replacement is still required. |

Advisories: [deepmerge GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4), [minimatch GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).

## Verified local progress ,  4 November 2026

- Branch `security/remaining-dependency-alerts`, commit `b053783`: removed the shadcn CLI dependency chain and replaced its imported CSS state variants with local equivalents. Retained dependencies were not force-upgraded.
- Commit `912410d`: recorded the review and remaining acceptance evidence in `docs/dependency-review-2026-11-04.md`.
- Production audit: zero findings. Full audit: 16 moderate package entries remaining in development tooling. npm package-entry counts differ from GitHub advisory counts.
- Lint, TypeScript, production build and 31 regression tests passed. Compiled CSS declarations for the replaced state utilities were compared successfully.
- Follow-up tracker verification on 4 November: the GitHub branch `security/remaining-dependency-alerts` now points to `8d42bcb`, which includes these commits. The earlier not-pushed statement and review comment are historical. Pushed work is not proof of default-branch integration, deployment or a completed Dependabot rescan; keep those acceptance items open.
- Authenticated HTTP smoke verification remains pending because the local Supabase service on port 54321 was unavailable.

See the [detailed review comment](https://github.com/OmarMohammedSiddique/alumniconnect/issues/13#issuecomment-6624580414) for the dependency paths and verification boundaries.

## Remaining approach

Track compatible ESLint/TypeScript-ESLint updates for minimatch. The reviewed upstream toolchain still requires an affected minimatch major, while this advisory identifies 11.0.1 as patched. Do not force version 11 into older APIs without compatibility evidence, run `npm audit fix --force` blindly, or dismiss alerts as a substitute for remediation. Development-only classification limits exposure; it does not establish that the vulnerable behavior is unreachable in tooling.

## Acceptance criteria

- [x] Identify affected dependency paths and distinguish development tooling from production dependencies.
- [x] Remove the affected deepmerge dependency path locally through a reviewed replacement.
- [x] Verify lint, TypeScript, production build, regression tests and replacement CSS output locally.
- [x] Resolve remaining minimatch paths through a supported upstream update or reviewed compatible replacement, then repeat appropriate checks.
- [x] Verify rendered styling and the authenticated mentorship workflow against a running backend.
- [x] Integrate reviewed changes into the default branch through the authorized workflow.
- [x] Recheck the default-branch lockfile, production/full audit and Dependabot scan; close only after both alert outcomes are verified.
- [x] Link focused Gitmoji commits/PRs and record remaining deployment or runtime verification separately from local source evidence.

## Related delivery work

Coordinate source reconciliation with #24, hosted verification with #8 and final handover with #31. Preserve the existing local verification and review-comment history; record later remote/default-branch evidence separately.

## Review sequence

Finish and review each verified logical milestone before starting the next improvement. Keep this issue open while the minimatch remediation and default-branch verification remain incomplete.



## #14: Give accepted mentorship connections a clear next step

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/14

## Problem

Accepted connection cards currently stop at the participant's name and connection date. A member can complete the request workflow and still have no practical way to begin mentorship.

## Desired outcome

After acceptance, both participants know how to arrange their first conversation and which contact details they have agreed to share.

## Scope and delivery

1. Agree and implement the smallest useful first-conversation action, including explicit contact-sharing choices.
2. Coordinate request/acceptance notification events with #33 and Resend delivery with #34 as separate verified milestones. Do not send notifications merely because an account exists.

A full chat system, video calling, and calendar synchronization are outside this issue unless separately agreed.

## Acceptance criteria

- [x] Accepted connection cards provide an actionable next step for both Mentor and Mentee.
- [x] Contact sharing is explicit; account email addresses are not automatically exposed to the directory.
- [x] Pending/declined requests and unrelated members cannot access accepted-connection contact details.
- [x] Missing contact details, blocked members and unavailable connections have clear feedback.
- [x] Link notification events and preferences to #33; first-contact completion is not treated as proof of email delivery. Verify applicable blocked/unavailable connection behavior across both flows.
- [x] Actions work with keyboard navigation, screen readers and narrow mobile layouts.

## Validation

Test request -> acceptance -> first-conversation action for both roles; refresh/re-login; missing contact details; unauthorized direct requests; blocked access; notification opt-out, duplicate events and delivery failure. Use disposable accounts and sanitize evidence.

## Implementation context and related work

Start with `app/(dashboard)/requests/page.tsx`, request actions and connection permissions. Coordinate activity emails/reminders with #33, Resend infrastructure with #34, account emails with [#15](https://github.com/OmarMohammedSiddique/alumniconnect/issues/15) and contact/visibility restrictions with [#19](https://github.com/OmarMohammedSiddique/alumniconnect/issues/19).

Priority: high because this completes the main mentorship outcome after acceptance.

## Completion evidence

Link focused Gitmoji commits/PRs, the checks run, and sanitized screenshots or recordings for changed screens. Close only when the acceptance criteria are verified. Work one logical milestone at a time and present it for review before starting the next improvement.


## #15: Complete email verification, confirmation-aware signup and password recovery

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/15

## Problem

Signup does not yet provide a complete confirmation-required journey, and password recovery/resend/reset-completion flows are missing. The student explicitly requested email verification and email-based access. Email OTP sign-in is tracked in #32; shared delivery through the preferred Resend provider is tracked in #34.

## Desired outcome

Members can verify mailbox ownership, complete signup and recover access through secure, understandable email journeys without leaking account existence or following unsafe redirects.

## Scope and delivery

1. Implement confirmation-aware signup, verification handling and resend states.
2. Implement password-reset request and recovery-session completion.
3. Verify the actual provider templates, Resend/Supabase delivery configuration and environment-specific callbacks.

Supabase Auth remains responsible for identities, verification codes/tokens and sessions; Resend delivers the email. Email verification and OTP sign-in prove mailbox access, not alumni/employment affiliation. Preserve role/membership controls under #23.

## Acceptance criteria

- [x] Signup distinguishes an active session from a confirmation-required outcome; no-session users receive a check-your-email screen rather than an unusable authenticated destination.
- [x] Select and document the supported verification link/code journey with clear email address, next action, correction and resend behavior; coordinate compatible templates and UX with #32.
- [x] Verify mailbox ownership through the maintained Auth provider; handle confirmation success, invalid/expired/reused/superseded links or codes, interrupted sessions and safe sign-in continuation.
- [x] Sign-in offers a clear forgot-password route with generic non-enumerating responses and accessible pending/success/failure feedback.
- [x] A valid recovery session can set a password satisfying server-enforced requirements, followed by verified subsequent sign-in; reject invalid or expired recovery contexts.
- [x] Validate redirect destinations and recovery access on the server; prevent tokens or codes entering logs/analytics or unsafe third-party destinations.
- [x] Resend/recovery/verification respect provider and application abuse controls, cooldowns and retry rules; prevent accidental duplicate sends.
- [x] Retain entered non-sensitive context appropriately through delivery/service failures and explain a safe recovery action.
- [x] Configure and verify local/hosted templates, sender identity, allowed callbacks and confirmation-enabled/disabled behavior through #34; account-security messages remain separate from optional activity-mail preferences under #33.
- [x] Actual controlled mailbox delivery and the complete verification/recovery journey are observed in the assessed environment; mock/API acceptance alone is not delivery proof.
- [x] Keyboard, screen-reader and mobile flows are usable; focused regression/integration tests cover success, failure and authorization boundaries.

## Validation

Use disposable accounts and controlled mailboxes to test confirmation on/off, valid/expired/reused verification and recovery, unknown addresses, rate limits, delayed delivery, resend, network/provider failure and password sign-in after recovery. Avoid sending test emails to real members or exposing their addresses or codes.

## Dependencies and related work

#34 shared Resend/Supabase delivery, #32 passwordless email OTP, #33 activity notifications/reminders, #23 membership policy, #8 hosted acceptance, #20 CI and #6 report evidence. #14 first-contact sharing does not authorize automatic account-email disclosure.

Priority: high; required account-access and email-verification capability.

## Completion evidence

Link the relevant versioned documents, focused Gitmoji commits/PRs, run/test records and sanitized figures as applicable. Keep local, CI, hosted and participant-study evidence distinct. Do not publish credentials, signed documents, private datasets or identifiable participant information. Close only when the acceptance criteria are verified; record unresolved limitations honestly. Source changes should be completed and verified as focused logical milestones.

## #16: Improve mentor discovery with filters and persistent request states

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/16

## Problem

Discovery has recommendations and keyword search, but no dedicated industry/skill filters, Mentor availability, expanded profile view or persisted Pending/Connected state on cards. Product copy mentions category search without a dedicated filter control.

## Desired outcome

A member can narrow results, inspect relevant experience, and understand whether they have already contacted a Mentor.

## Scope and delivery

1. Add explicit industry/skill filters and define how they combine with both discovery modes.
2. Add availability and fuller visible profile details.
3. Show persisted request/connection states and appropriate actions.

Model training, a changed ranking algorithm, and claims of improved recommendation quality are outside this issue.

## Acceptance criteria

- [x] Industry/skill controls have clear labels, active-filter feedback and a reset action.
- [x] Filter combinations behave consistently in Recommended and Keyword search modes.
- [x] Mentor availability has an agreed meaning and can be maintained by the Mentor.
- [x] Members can inspect a fuller permitted Mentor profile before requesting guidance.
- [x] Pending request and Connected states come from persisted data and survive refresh/re-login.
- [x] Duplicate or unavailable request actions are prevented and explained.
- [x] Failed, slow and superseded searches have appropriate loading, retry and empty states.
- [x] Visibility and blocking rules are enforced through database/API access, not only filtering in the browser.

## Validation

Test both modes, combined/cleared filters, no results, long names/skills, available/unavailable Mentors, persisted request states, stale actions, hidden/blocked profiles, keyboard access and mobile layouts.

## Implementation context and related work

`app/(dashboard)/discover/discover-client.tsx`, `mentor-card.tsx`, request actions and discovery RPCs. Coordinate explanations with [#17](https://github.com/OmarMohammedSiddique/alumniconnect/issues/17) and safety rules with [#19](https://github.com/OmarMohammedSiddique/alumniconnect/issues/19). [#4](https://github.com/OmarMohammedSiddique/alumniconnect/issues/4) separately tracks measured signup-to-first-match performance.

## Completion evidence

Link focused Gitmoji commits/PRs, the checks run, and sanitized screenshots or recordings for changed screens. Close only when the acceptance criteria are verified. Work one logical milestone at a time and present it for review before starting the next improvement.

## #17: Explain mentor recommendations without misleading match percentages

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/17

## Problem

Mentor cards prominently render cosine similarity as an “83% match” style badge. Exact shared skills already appear, but the percentage can imply a calibrated probability of successful mentorship; the qualification currently depends on hover text.

## Desired outcome

Members understand the actual evidence behind a recommendation without mistaking text similarity for verified suitability.

## Scope

Improve explanation wording and visual hierarchy. Preserve the matching/ranking behavior and keep model evaluation separate.

## Acceptance criteria

- [x] Available evidence, such as exact shared skills and relevant visible profile context, is the primary explanation.
- [x] Remove prominent probability-like percentage framing or move the score into clearly labeled secondary technical detail.
- [x] Explain that text similarity does not guarantee mentorship suitability or success.
- [x] Every stated reason is grounded in returned data; no reasons are invented when shared-skill information is empty.
- [x] Keyword results and semantic recommendations have appropriate, distinct explanations.
- [x] Necessary explanations work on touch devices and with keyboard/screen-reader interaction without requiring hover.
- [x] Empty explanations, missing/out-of-range scores and long content remain understandable.

## Validation

Review cards with shared skills, no exact overlap, missing scores and keyword results at desktop/mobile widths. Check screen-reader wording and confirm unchanged recommendation ordering for the same inputs. Include before/after screenshots.

## Implementation context and related work

`app/(dashboard)/discover/mentor-card.tsx`, shared-skill fields and supporting help copy. Coordinate the card layout with [#16](https://github.com/OmarMohammedSiddique/alumniconnect/issues/16). [#3](https://github.com/OmarMohammedSiddique/alumniconnect/issues/3) owns human relevance judgments and evaluation; this issue makes no model-quality claim.

## Completion evidence

Link focused Gitmoji commits/PRs, the checks run, and sanitized screenshots or recordings for changed screens. Close only when the acceptance criteria are verified. Work one logical milestone at a time and present it for review before starting the next improvement.

## Verified release, 6 November 2026

Completed in [PR #81](https://github.com/OmarMohammedSiddique/alumniconnect/pull/81), commit `16b4441`, merged as `6fca0c08e7170189fab330345133011e21fd6fc6`. Production deployment `dpl_5srcAEtyZPUtyidNj1hkDYfYEpGZ` is READY and assigned to [alumnikonneqt.com](https://alumnikonneqt.com).

- Evidence-first card explanations remain visible without hover, with explicit no-overlap and distinct keyword wording. Shared labels are validated, trimmed and deduplicated. Rank is primary in model comparison, with secondary decimal profile-text similarity and safe missing/invalid-score wording. No suitability probability is asserted.
- Corrected long-content wrapping, shared-skill contrast, connected-status contrast, named articles and explanation groups, and keyboard-operable biography disclosures with linked expanded state, visible focus and 44px targets.
- All 169 Node tests, ESLint, TypeScript and a fresh Webpack release build passed. [Required CI](https://github.com/OmarMohammedSiddique/alumniconnect/actions/runs/42225592388), CodeQL and both Vercel previews passed before merge.
- Fresh authenticated hosted browser checks used the existing fictional Demo Mentee through an isolated read-only loopback proxy forwarding production UI/assets and matching responses unchanged. Before/after ordered IDs were equal for all five Recommended results and all five results from each comparison model. The candidate pool stayed at five. Python keyword search retained the same two profiles in the same order and its distinct explanation.
- The deployed UI showed returned shared skills and explicit no-exact-overlap cases. The 375px mobile viewport had 375px document width. Enter expanded the biography, exposed `aria-expanded=true` and a valid controlled paragraph, and retained visible keyboard focus. Browser accessibility wording and grouping were reviewed. No browser console errors were observed, and no error/fatal runtime-log groups were returned for the deployment during the scoped check.
- [Versioned verification record and before/after screenshots](https://github.com/OmarMohammedSiddique/alumniconnect/blob/6fca0c08e7170189fab330345133011e21fd6fc6/docs/verification/mentor-explanations.md) cover shared/no-overlap, keyword, missing/invalid scores, malformed labels, light/dark contrast and extreme unbroken content. A fresh production fixture fit 320, 375, 768 and 1366px; all temporary fixture routes and components were removed before release.

Accessibility verification used actual keyboard input, native browser accessibility-tree wording/relationships, responsive layout and measured contrast. It does not claim a native VoiceOver/NVDA listening session or a physical touchscreen study. Hosted ordering checks are separate from synthetic edge-case fixtures. No matching, ranking, model, database or production profile data was changed, and this issue makes no participant-study or model-quality claim.

All applicable acceptance criteria and the deployed release checks are verified. Closing as complete.


## #18: Protect unsaved profile drafts during navigation and refresh

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/18

## Problem

The profile form warns about unsaved changes but holds drafts only in component state. Refreshing or leaving the page can silently discard a member's work.

## Desired outcome

Members can save, deliberately discard or recover their edits after navigation or interruption.

## Scope

Choose an appropriate combination of navigation warnings and scoped draft recovery. Preserve the existing save/embedding sequence and newer edits made while a save is pending.

## Acceptance criteria

- [x] Dirty forms are protected against silent loss during internal navigation, browser back/forward and refresh.
- [x] Save, discard and restoration choices use clear, accessible wording.
- [x] Successful saves clear only the submitted dirty values; edits made during the save remain unsaved.
- [x] Failed saves and embedding failures do not discard the current draft.
- [x] Stored drafts, if used, are scoped to the signed-in user with defined expiry and cleanup on sign-out/account changes.
- [x] Credentials, tokens and unrelated account data are never stored in draft persistence.
- [x] Restoring a draft does not persist the profile or regenerate its embedding until an explicit save succeeds.
- [x] Warnings/recovery work with keyboard access and narrow mobile layouts.

## Validation

Test refresh, internal links, back/forward, tab interruption, deliberate discard, failed save, successful save, editing during a pending save, switching accounts and signing out. Confirm that a new user cannot recover another user's draft.

## Implementation context and related work

`app/(dashboard)/profile/profile-form.tsx`, `profile-setup.tsx` and `lib/profile-match-update.ts`. Keep [#4](https://github.com/OmarMohammedSiddique/alumniconnect/issues/4)'s signup-to-first-match journey working; coordinate data-retention behavior with [#19](https://github.com/OmarMohammedSiddique/alumniconnect/issues/19).

## Completion evidence

Link focused Gitmoji commits/PRs, the checks run, and sanitized screenshots or recordings for changed screens. Close only when the acceptance criteria are verified. Work one logical milestone at a time and present it for review before starting the next improvement.


## #19: Add member profile privacy, reporting and blocking controls

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/19

## Problem

Staff can hide profiles, but members have no self-service visibility preference, reporting flow or blocking controls. Wider participation needs clear boundaries for visibility and unwanted contact.

## Desired outcome

Members can control discoverability and unwanted interactions, and authorized staff can review reports with an auditable workflow.

## Scope and delivery

1. Define visibility/blocking rules, including existing accepted connections and contact details.
2. Implement self-service visibility and block/unblock behavior with database enforcement.
3. Implement report submission and staff review with audit events.

A member's visibility preference must never override a staff moderation restriction. Membership verification remains a separate policy decision.

## Acceptance criteria

- [x] Members can manage their own visibility preference while staff-hidden profiles stay hidden.
- [x] Reporting offers useful categories, optional context and clear submission feedback.
- [x] Report details are available only to permitted parties; staff review actions are auditable.
- [x] Members can block/unblock another participant without exposing private block lists.
- [x] Visibility/blocking behavior is enforced consistently in discovery, profile reads, new requests, connection/contact access and notifications.
- [x] RLS/functions/API checks enforce ownership and role permissions even for direct requests.
- [x] Existing role and embedding protections remain intact.
- [x] Duplicate submissions and abusive reporting/blocking requests are controlled.

## Validation

Use isolated Mentor/Mentee/staff accounts to test ownership, direct API/RPC access, hidden and staff-hidden profiles, block/unblock, existing connections, contact disclosure, report access, repeated actions and mobile/keyboard behavior.

## Implementation context and related work

Profile visibility, discovery RPCs, request/connection permissions and staff moderation. Coordinate contact/notification rules with [#14](https://github.com/OmarMohammedSiddique/alumniconnect/issues/14) and directory behavior with [#16](https://github.com/OmarMohammedSiddique/alumniconnect/issues/16).

Priority: high before broader participation because these controls govern member privacy and unwanted contact.

## Completion evidence

Link focused Gitmoji commits/PRs, the checks run, and sanitized screenshots or recordings for changed screens. Close only when the acceptance criteria are verified. Work one logical milestone at a time and present it for review before starting the next improvement.

## #20: Run regression and database permission tests in CI

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/20

## Problem

The current `.github/workflows/ci.yml` installs dependencies and runs lint, TypeScript checks and a production build. It does not execute the existing `lib/*.test.mjs` regression tests or `supabase/tests/rls_tests.sql`. A change can therefore pass CI while breaking a tested behavior or database authorization rule.

## Desired outcome

Every pull request receives reproducible regression and permission checks against disposable test infrastructure, with failures visible before merge.

## Scope and delivery

1. Add a documented unit-test command compatible with the selected Node version and run it in CI.
2. Add a separate database-test job that starts isolated local Supabase, applies committed migrations and executes the permission suite with failure propagation and cleanup.
3. Run the integrated ML audit/preparation/training/metric regression suites once source reconciliation under #24 makes them available, using a pinned suitable runtime and sanitized fixtures; do not run final experiments or expose private data in CI.
4. Connect existing and future browser coverage from #4 to the workflow when available; do not recreate that first-match test in this issue.

This issue automates functional/security regression checks. It does not replace human usability research, ML evaluation, or hosted acceptance.

## Acceptance criteria

- [x] A documented package command runs all existing application unit tests and returns a nonzero exit code on failure.
- [x] Pull requests and default-branch pushes run the unit suite alongside existing lint, typecheck and build checks.
- [x] Relevant ML audit/preparation/training/metric regression tests from #24/#25 run in an isolated reproducible job with permitted fixtures; CI does not access held-out performance or private datasets.
- [x] A fresh, isolated database receives all committed migrations and runs `supabase/tests/rls_tests.sql`; SQL errors and failed assertions fail the job.
- [x] Tests use disposable local fixtures and never contact a hosted development or production database.
- [x] Database jobs wait for readiness, have bounded timeouts and clean up resources even after failure.
- [x] Permissions remain minimal; logs and uploaded artifacts contain no credentials or personal data.
- [x] The chosen Node/Supabase versions and commands work from a fresh checkout and are documented.
- [x] Passing and deliberately failing test runs demonstrate that CI detects regressions. Confirm required-check settings where authorized; record any repository-admin configuration still needed.

## Validation

Run the unit command locally, reproduce the database job on a clean local stack, and inspect a real GitHub Actions run. On a disposable branch, introduce a controlled failing unit test and permission assertion separately to demonstrate failure propagation, then remove those changes before merge. Distinguish a configured workflow from a successful remote run.

## Implementation context and related work

`.github/workflows/ci.yml`, `package.json`, `lib/*.test.mjs`, `supabase/migrations/`, `supabase/tests/rls_tests.sql`, and README verification instructions. Coordinate the browser first-match test with [#4](https://github.com/OmarMohammedSiddique/alumniconnect/issues/4), delivery evidence with [#9](https://github.com/OmarMohammedSiddique/alumniconnect/issues/9), model source/integration with #24-#26, email regression boundaries with #15/#32-#34, and hosted smoke checks with [#8](https://github.com/OmarMohammedSiddique/alumniconnect/issues/8).

Priority: high because automated regression checks protect each subsequent product and security change.

## Completion evidence

Link focused Gitmoji commits/PRs, checks run, and sanitized screenshots or recordings for changed screens. Record local, CI and hosted evidence separately. Close only when the acceptance criteria are verified. Complete and review one logical milestone before starting the next improvement.


## #21: Protect embedding generation from excessive and duplicate requests

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/21

## Problem

`POST /api/embed` authenticates the caller and then runs model inference for each valid request. The route currently has no application-level rate or concurrency limit and does not reuse an embedding for unchanged profile content. The cached model instance avoids repeated model loading, but does not avoid repeated inference. Hosting-level protections have not been verified.

## Desired outcome

Legitimate profile saves and retries remain responsive while repeated or concurrent requests cannot consume unbounded inference resources or persist an outdated embedding.

## Scope and delivery

1. Measure the current request behavior and document a bounded per-user rate/concurrency policy appropriate to the deployment.
2. Deduplicate concurrent work and reuse successful results for unchanged embedding inputs and model version.
3. Integrate clear retry feedback and verify behavior across the selected multi-instance hosting architecture.

Preserve the current embedding dimensions and ranking behavior. Changing the model or claiming improved matching quality is outside this issue.

## Acceptance criteria

- [x] Limits use the authenticated server-verified user identity and a documented shared enforcement strategy appropriate to the deployment; a process-local counter alone is not presented as a distributed limit.
- [x] Excess requests receive a bounded, actionable response such as HTTP 429 with an appropriate retry interval.
- [x] Concurrent identical requests do not launch unnecessary duplicate inference; successfully embedded unchanged input can be reused safely.
- [x] Reuse keys include the effective embedding input and model/version configuration so profile or model changes invalidate reuse.
- [x] A result generated for an older profile snapshot cannot overwrite an embedding for newer saved content.
- [x] Failed inference does not mark the profile up to date, poison the reusable result, or prevent a legitimate later retry.
- [x] Session and ownership checks remain enforced; one user's limits/results cannot expose or modify another user's data.
- [x] Profile save, automatic refresh and manual retry show clear pending, throttled, failed and recovered states without losing edits.
- [x] Record bounded-load results, chosen thresholds and the verified hosting boundary without putting profile text or credentials in telemetry.

## Validation

Use disposable accounts to test rapid sequential calls, concurrent identical calls, separate users, changed input, an older slow request finishing after a newer save, inference failure and recovery. Verify authentication rejection and limit behavior at the route. Measure actual inference invocations and repeat against the selected hosting setup before claiming multi-instance protection.

## Implementation context and related work

`app/api/embed/route.ts`, `lib/embedding/embed.ts`, `lib/profile-match-update.ts`, profile save/update behavior and the profile embedding schema. Coordinate first-match latency and retry evidence with [#4](https://github.com/OmarMohammedSiddique/alumniconnect/issues/4), runtime constraints with [#8](https://github.com/OmarMohammedSiddique/alumniconnect/issues/8), and draft preservation with [#18](https://github.com/OmarMohammedSiddique/alumniconnect/issues/18). Authentication-provider rate limits in #15 are a separate concern.

Priority: high before public release because authenticated access alone does not bound expensive inference work.

## Completion evidence

Link focused Gitmoji commits/PRs, checks run, and sanitized screenshots or recordings for changed screens. Record local, CI and hosted evidence separately. Close only when the acceptance criteria are verified. Complete and review one logical milestone before starting the next improvement.


## #22: Show reliable success and failure feedback for administrator actions

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/22

## Problem

`setUserRole` and `setUserVisibility` await database updates but ignore the returned errors and do not verify that an authorized target row changed. The admin page then revalidates without reporting the result. Permission rejection, stale targets and service failures can therefore leave staff unsure whether a change succeeded.

## Desired outcome

Staff can tell when role or visibility changes are pending, completed, denied or failed, and can retry safely without mistaking an unchanged record for success.

## Scope and delivery

1. Return structured action results after validating input and confirming the permitted database outcome.
2. Add accessible pending/success/error feedback to the existing admin controls.
3. Add focused regression coverage for authorization, stale records and recoverable failures.

Retain database-enforced roles and visibility protections. Do not broaden staff privileges or bypass RLS with a service-role client.

## Acceptance criteria

- [x] Invalid role values, malformed target identifiers and malformed visibility values produce clear validation failures.
- [x] Database/service errors are handled and mapped to safe actionable feedback without exposing internal details.
- [x] An update that affects no permitted row is not reported as successful; handle stale or inaccessible targets explicitly.
- [x] Pending controls prevent duplicate submission and announce status to assistive technology.
- [x] Success feedback reflects the persisted result; failed edits preserve enough context for a safe retry.
- [x] Anonymous users and ordinary members cannot change roles or staff visibility; moderators cannot gain administrator-only capabilities.
- [x] Existing database role/visibility protections and audit logging remain intact.
- [x] Keyboard and narrow-screen use remain usable and focus is handled sensibly after feedback.

## Validation

Exercise permitted and rejected actions as Admin, Moderator and ordinary member. Test malformed input, missing/stale targets, database error, network failure, duplicate clicks and successful retry. Assert that failed actions do not mutate data and successful actions produce the intended persisted state and audit event. Use disposable accounts.

## Implementation context and related work

`app/(dashboard)/admin/actions.ts`, `app/(dashboard)/admin/page.tsx`, profile RLS/column-protection triggers and `supabase/tests/rls_tests.sql`. Coordinate staff moderation behavior with [#19](https://github.com/OmarMohammedSiddique/alumniconnect/issues/19), while keeping this issue focused on the existing controls and their feedback.

Priority: normal; this is a concrete reliability and usability defect in existing staff workflows.

## Completion evidence

Link focused Gitmoji commits/PRs, checks run, and sanitized screenshots or recordings for changed screens. Record local, CI and hosted evidence separately. Close only when the acceptance criteria are verified. Complete and review one logical milestone before starting the next improvement.


## #23: Define membership eligibility and affiliation verification policy

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/23

## Problem

Signup explicitly states that registration does not verify employment or airline affiliation. Mentor/Mentee describes how someone participates in mentorship; it does not establish membership eligibility. There is no recorded final policy here for who may join, who verifies affiliation, what evidence is appropriate, or what an unverified member may access.

## Desired outcome

Record an approved, privacy-conscious eligibility and verification policy that can guide a separate, reviewable implementation without treating email confirmation or self-declared profile data as affiliation proof.

## Scope and delivery

1. Confirm the eligible participant groups and approval owner with the supervisor or designated project stakeholder.
2. Define affiliation separately from the existing one-role-per-account Mentor/Mentee model.
3. Specify the minimum verification workflow, evidence handling, member states and access rules.
4. Create or update linked implementation issues after the policy is approved, with measurable acceptance criteria.

Current employees, former employees, retired employees and attachees/interns are provisional groups to confirm. Contractor eligibility remains undecided. Google OAuth is a separate integration decision. This issue records a policy/design decision; closing it does not mean affiliation verification has been implemented.

## Acceptance criteria

- [x] Record who approves the policy, the decision date and the eligible/ineligible groups, including a clear decision for ambiguous cases.
- [x] Define affiliation information separately from mentorship roles; preserve the existing role model unless an explicit schema change is approved.
- [x] Define unverified, pending, verified and rejected/revoked states, including resubmission or appeal handling where appropriate.
- [x] Specify what unverified/pending members can see and do, including discovery, requests and contact sharing.
- [x] Define who may approve/revoke verification and how those actions are audited; members cannot grant themselves verified status.
- [x] Select the least intrusive acceptable evidence, authorized viewers, retention/deletion rules and a safe review process. Do not assume identity-document uploads are necessary.
- [x] State clearly that email ownership, OAuth sign-in and self-declared employer/profile fields alone do not establish airline affiliation.
- [x] Define honest prototype wording and make no unsupported claim of official airline sponsorship or verification.
- [x] Update the traceability/checklist documentation and link implementation follow-ups, or record an explicit approved deferral with its release restrictions.

## Validation

Review the policy against representative current/former/retired/intern applicants, unclear evidence, rejected or revoked verification, duplicate requests and reviewer misuse. Check the access matrix for Mentor, Mentee and staff roles. Obtain a documented stakeholder/supervisor decision and sanitize any supporting evidence before storing it in the repository.

## Implementation context and related work

`app/(auth)/signup/signup-form.tsx`, `app/(auth)/actions.ts`, profile schema/staff controls, `docs/project-checklist.md` and `docs/proposal-traceability.md`. Coordinate email ownership with [#15](https://github.com/OmarMohammedSiddique/alumniconnect/issues/15), member safety/access with [#19](https://github.com/OmarMohammedSiddique/alumniconnect/issues/19), and report evidence with [#6](https://github.com/OmarMohammedSiddique/alumniconnect/issues/6). Avoid collecting new sensitive evidence until the policy and handling process are approved.

Priority: high before broader public participation because eligibility and access rules must be explicit before implementing trusted verification claims.

## Completion evidence

Link focused Gitmoji commits/PRs, checks run, and sanitized screenshots or recordings for changed screens. Record local, CI and hosted evidence separately. Close only when the acceptance criteria are verified. Complete and review one logical milestone before starting the next improvement.

## #24: Reconcile local ML history with the current application and release baseline

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/24

## Problem

The 4 November audit found that local `main` contains four ML audit/preparation/training commits through `a7a59ad`, while GitHub's recorded `main` at `d73d299` contains later application, RPC-hardening and dependency work. The current work branch is `security/remaining-dependency-alerts` at `8d42bcb`. These are audit snapshots, not permanent branch assumptions. The current checkout and default-branch documentation therefore do not expose all completed ML work.

## Desired outcome

A reviewed, reproducible integration baseline preserves both lines of work and accurately identifies what is local, pushed, merged and deployed.

## Scope and delivery

1. Inspect the latest refs, working tree, worktrees and relevant commit differences before selecting an integration route.
2. Integrate the existing ML code/notebook/documentation with the retained application/security changes on a dedicated branch.
3. Resolve source and status-document conflicts, verify the combined result, then follow the authorized PR/release workflow.

This issue integrates existing work; it does not train a final model or deploy a model replacement. Do not reset branches, discard unrelated work, fabricate history or publish private artefacts. Push/merge/deployment actions require authorization for that action; updating this checklist alone does not authorize them.

## Acceptance criteria

- [x] Record current branch/ref SHAs, divergence and intended retained changes; preserve any user-owned work.
- [x] Retain the audited ML commits `f7a77a2`, `4a0711e`, `6057398`, `a7a59ad` or their reviewed equivalent changes, alongside current security/runtime work.
- [x] Training modules, notebook and dependency instructions are present in the integration baseline; private data/checkpoints remain appropriately excluded.
- [x] Reconcile stale statements that no training, Colab execution or deployment has occurred; identify evidence dates and boundaries.
- [x] Appropriate application checks, ML audit/preparation/training tests and affected integration checks pass on the combined revision.
- [x] Verify that a fresh authorized checkout can locate and run the documented tooling with permitted data access.
- [x] Complete the authorized review/integration workflow and verify the intended default-branch state; identify any deployment follow-up separately.

## Validation

Review the before/after diff and history, run relevant suites, inspect the resulting remote/default-branch state when authorized, and record the exact demonstrated/released commit. Do not infer that a local branch or remote-tracking ref proves a deployed release.

## Dependencies and related work

#25 training and #26 live integration depend on this reconciled source baseline. Coordinate #13 dependency remediation, #20 CI, #8 hosted acceptance, #9 workflow evidence and #6 report updates.

Priority: high; this removes ambiguity from every later experiment and release claim.

## Completion evidence

Link the relevant versioned documents, focused Gitmoji commits/PRs, run/test records and sanitized figures as applicable. Keep local, CI, hosted and participant-study evidence distinct. Do not publish credentials, signed documents, private datasets or identifiable participant information. Close only when the acceptance criteria are verified; record unresolved limitations honestly. Source changes should be completed and verified as focused logical milestones.

## Individual acceptance review completed ,  4 November 2026

After reopening, each of the seven original source-integration criteria was reviewed against the [merged criterion/evidence table](https://github.com/OmarMohammedSiddique/alumniconnect/blob/main/docs/source-reconciliation-2026-11-04.md). Additional checks installed all seven pinned dependencies and ran dummy-fixture preparation, one optimizer epoch, checkpoint reload and notebook schema validation from a clean main source export. This new evidence resolves the earlier fresh-source execution uncertainty; no real pilot was retrained and final-test data was not evaluated.

PRs #38/#39 retained both source histories; PR #40 corrected the stale guide; PR #41 merged the individual evidence review after required CI passed. Local and remote main match `36d5838`, the working tree is clean and no local branch commits remain unpublished. The 45 application tests, 30 ML tests, lint/typecheck and production build passed on the combined source. Private data/checkpoints/credentials remain excluded.

Completion is limited to source reconciliation. Research readiness, reviewed labels, final model selection, live-model integration and hosted end-to-end release acceptance remain in #3/#25/#26/#8.


## #25: Complete research-ready training and selection of the from-scratch mentorship model

State: OPEN

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/25

## Problem

Training from scratch is a confirmed project requirement. An engineering pilot already performed genuine random-initialized training, parameter updates, checkpoint selection/reload and local/Colab execution. It remains explicitly machine-labelled and unreviewed; the saved five-query validation comparison underperforms TF-IDF. This is useful progress, not a research-ready final model.

## Desired outcome

A reproducible, selected scratch-trained mentorship model with defensible data, validation decisions and clearly bounded findings. The final live application must use the selected trained model; application integration is a separate linked deliverable.

## Scope and delivery

1. Use #1 for the recorded requirement and #3 for reviewed data, split/metric rules and final comparative evaluation.
2. Reproduce the existing engineering baseline, then train the selected compact architecture on the reviewed frozen version.
3. Investigate controlled improvements using validation only; preserve unsuccessful runs and record selection rationale.

Do not restart a completed pilot merely to manufacture progress, load pretrained weights while calling the result from scratch, treat unknown pairs as negatives, or select settings using final-test outcomes.

## Current evidence ,  audited 4 November 2026

- [x] Existing saved pilot records random initialization, actual updates and verified checkpoint reload.
- [x] Local-main history contains the training/notebook milestone and Colab execution notes; branch integration is tracked separately.
- [ ] Human-reviewed, research-approved data and final model selection are complete.

## Acceptance criteria

- [ ] Define directional Mentee-to-Mentor task, whitelisted available input fields, output contract and trainable components; document that no pretrained weights/components prohibited by the confirmed requirement are loaded.
- [ ] Link the reviewed data version/hashes and frozen protocol from #3; exclude labels, rationales, ambiguity flags and annotation/split metadata from inputs.
- [ ] Fit learned preprocessing on training data only and preserve person/template separation.
- [ ] Specify architecture, parameter count, loss/grade mapping, initialization, seeds, optimizer, batch size, training budget, stopping and checkpoint-selection rule.
- [ ] Save configuration, code/source identity, environment, learning curves, checkpoints, validation predictions and resource measurements in persistent controlled storage.
- [ ] Compare against the agreed lexical and frozen-encoder baselines on the same validation query/candidate pools; distinguish training from runtime/quantization changes.
- [ ] Inspect difficult cases and possible shortcuts; test justified changes under documented comparable budgets and report variability where feasible.
- [ ] Verify real parameter updates and selected-checkpoint reload with its preprocessing; explain any reproducibility limits.
- [ ] Lock the selected model/configuration before final held-out evaluation under #3; retain negative/mixed results without promising superiority.
- [ ] Supply the versioned model/preprocessing contract and artefacts for live integration, and update Chapter 5 evidence under #6.

## Validation

Reproduce a run in a clean suitable runtime, verify save/reload and input/metric edge cases, independently check selected reported calculations and trace every result to code/data/model versions. Five machine-labelled validation queries do not establish real-world mentorship quality.

## Dependencies and related work

Depends on #24 for the integrated source baseline and #3 for reviewed/frozen data and evaluation rules. #1 records requirements, #27 resolves graph effects before model lock, #26 integrates the selected model and #6 reports results.

Priority: high; required research work. Training completion alone does not close live-model delivery.

## Completion evidence

Link the relevant versioned documents, focused Gitmoji commits/PRs, run/test records and sanitized figures as applicable. Keep local, CI, hosted and participant-study evidence distinct. Do not publish credentials, signed documents, private datasets or identifiable participant information. Close only when the acceptance criteria are verified; record unresolved limitations honestly. Source changes should be completed and verified as focused logical milestones.

## #26: Integrate and verify the scratch-trained model in the live mentorship workflow

State: OPEN

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/26

## Problem

The confirmed final requirement is for the live application to use the model trained from scratch. The current app uses frozen MiniLM and 384-dimensional profile vectors; the saved engineering pilot produces directional 64-value representations. Completing a notebook does not change the application, and these vector spaces cannot be mixed.

## Desired outcome

The assessed live release demonstrably uses the selected scratch-trained model and its evaluated preprocessing for recommendations, while preserving permissions, reliable profile updates and a complete mentorship journey.

## Scope and delivery

1. Define the selected artefact's versioned inference/serving contract and deployment route.
2. Implement isolated model loading, preprocessing and query/mentor handling; verify parity before migrating data.
3. Migrate/re-embed as necessary, verify the entire workflow and complete the authorized hosted release with rollback evidence.

Model selection/research comparisons belong to the training issue and #3. Do not silently substitute a convenient pretrained service or infer compatibility merely from equal vector width.

## Acceptance criteria

- [ ] Identify selected model, preprocessing, input fields, output dimensions, query/mentor heads where applicable and immutable version/hash.
- [ ] Select and justify a compatible serving/export route based on measured runtime needs; keep provider credentials and privileged operations server-side.
- [ ] Fixed representative inputs produce equivalent notebook/reference and application outputs within documented tolerances; cover sparse, invalid, long and unfamiliar inputs.
- [ ] Version the schema/API/storage contract as required; never compare vectors from different models or incompatible directional heads.
- [ ] Re-embed retained candidate/query profiles under a controlled migration with completeness checks and a documented recovery/rollback route.
- [ ] Profile saves, retries and changed inputs update the correct model version; stale inference cannot overwrite newer content.
- [ ] Verify discovery, request, acceptance/decline, connection persistence and permissions using disposable accounts.
- [ ] Handle model/dependency failure, timeout, invalid output and unavailable compatible vectors with actionable feedback.
- [ ] Hosted logs/configuration and representative predictions establish that the live release actually loads the selected trained artefact.
- [ ] Record latency/resources, release and model identifiers, assessor access, operating instructions and rollback evidence; update Chapters 4-5.

## Validation

Use parity fixtures, clean model startup, complete corpus-version checks, role-specific HTTP/browser/permission tests and hosted failure/recovery tests. Record local and hosted results separately. Perform release/data mutations only through the authorized workflow and protect real member data.

## Dependencies and related work

Depends on #24 and the selected/evaluated model from #25/#3. Coordinate #4 cold start, #27 agreed graph scope, #8 hosting, #29 performance, #21 inference limits, #18 drafts, #20 CI and #6 reporting.

Priority: high; this is an explicit final acceptance requirement.

## Completion evidence

Link the relevant versioned documents, focused Gitmoji commits/PRs, run/test records and sanitized figures as applicable. Keep local, CI, hosted and participant-study evidence distinct. Do not publish credentials, signed documents, private datasets or identifiable participant information. Close only when the acceptance criteria are verified; record unresolved limitations honestly. Source changes should be completed and verified as focused logical milestones.

## #27: Define, implement and evaluate the knowledge-graph contribution to mentorship matching

State: OPEN

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/27

## Problem

The supervisor advised investigating knowledge graphs and asked how the project addresses cold start. The student favours implementation, but the exact assessed graph deliverable remains unconfirmed. The report discusses graphs; no implemented knowledge graph or measured graph contribution was established by the audit.

## Desired outcome

A bounded, supervisor-reviewed graph contribution with explicit relationship provenance and evidence about its effect on matching or explanations. The proposed hypothesis is that skill/goal/role relationships may support relevant cross-vocabulary recommendations or auditable explanations without interaction history; improvement is not assumed.

## Scope and delivery

1. Confirm whether the deliverable is a relationship/explanation layer, a matching/reranking experiment, or another defined component; record the acceptance boundary.
2. Define a minimal graph and implement the agreed vertical slice using justified storage/tooling.
3. Evaluate the selected contribution under the same reviewed protocol and document benefits, failures and costs.

A graph visualisation, ERD or literature discussion alone is not implemented graph reasoning. A rule graph alone does not satisfy scratch-model training. Do not add a graph database/GNN without a task-driven reason or expand scope beyond feasible assessment delivery.

## Acceptance criteria

- [ ] Record the supervisor/stakeholder decision, scope, intended user/research benefit and measurable comparison before implementation/model selection.
- [ ] Define entities, relation meanings/direction, identifiers, provenance, maintenance and treatment of missing/uncertain relationships.
- [ ] Specify how profile skills/goals map to graph entities without inventing expertise or mentoring offers.
- [ ] Define and enforce split/leakage rules for curated graph knowledge, learned relations and held-out people/labels.
- [ ] Implement the agreed component and show how it connects to the real matching/explanation path, including permissions and failure behavior.
- [ ] Test absent/unknown skills, sparse profiles, conflicting links, no suitable mentor and no eligible mentors; the graph must not fabricate candidates or certainty.
- [ ] Compare lexical, selected scratch-model and graph-assisted variants on the same judged queries/candidates where the graph affects ranking; evaluate explanation fidelity where it supplies reasons.
- [ ] Retain raw outputs, error cases, operating cost/latency and limitations; report no gain or degradation honestly.
- [ ] Update conceptual framework, architecture, method, Chapter 5 results and the cold-start account consistently.

## Validation

Inspect graph facts against their recorded sources, use hand-worked relationship/path fixtures, and perform the agreed controlled comparison. Distinguish relationship-path explanations from causal attribution of neural scores. If a narrower deliverable or deferral is approved, record the decision and its effect on objectives rather than silently marking implementation complete.

## Dependencies and related work

Resolve scope early with #1 and #7. Coordinate #3 data/metrics, #4 cold start, #17 explanations, #25 training, #26 integration and #28/#6 report alignment.

Priority: high for the scope decision; implementation priority follows the recorded bounded decision.

## Completion evidence

Link the relevant versioned documents, focused Gitmoji commits/PRs, run/test records and sanitized figures as applicable. Keep local, CI, hosted and participant-study evidence distinct. Do not publish credentials, signed documents, private datasets or identifiable participant information. Close only when the acceptance criteria are verified; record unresolved limitations honestly. Source changes should be completed and verified as focused logical milestones.

## #28: Resolve Chapters 1-3 feedback, SMART objectives and literature-source accuracy

State: OPEN

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/28

## Problem

The most developed report located during the 4 November audit is a September draft through Chapter 5.4. Multiple versions and a revision log disagree. SMART targets have been added, but their justification and alignment need review; the pretrained-only method is stale. Some novelty/security claims exceed their evidence, and a heavily used Kathanea reference differs materially from the primary paper located.

## Desired outcome

One authoritative working report with a traceable feedback-resolution record and accurate Chapters 1-3 aligned with the confirmed scratch-training/live-app requirement and implemented scope.

## Scope and delivery

1. Nominate and preserve the master report and signed proposal baseline privately; record feedback sources and actions.
2. Repair objectives/questions/scope and verify literature against original sources.
3. Reconcile research method, actual solo development practice and experiment design with the selected project route.

Do not rewrite approval history, manufacture citations/meetings, silently weaken requirements or place signed/private documents in the public repository.

## Acceptance criteria

- [ ] Identify the master editable report and version convention; preserve originals and privately held approved proposal.
- [ ] Create a feedback-resolution matrix with source/date, affected section, required action, evidence and review status, including SMART, own-model and knowledge-graph feedback.
- [ ] Keep objectives specific, measurable, achievable, relevant and time-bound; justify performance/SUS/sample targets from needs or evidence rather than arbitrary numbers.
- [ ] Align objectives and research questions with scratch-model training, final live use, fair comparative evaluation and the agreed scope.
- [ ] Correct broad absence/novelty/superiority claims and distinguish unreported competitor details from verified absence.
- [ ] Verify the intended Kathanea source and dependent claims; check retained bibliographic metadata, DOI/author/year and claim support against original publications.
- [ ] Rebuild the comparison table around actually reviewed systems; use supported evidence or “not reported,” not assumed internal architecture or unevaluated strength ratings.
- [ ] Distinguish exact shared-skill explanation from neural-score attribution and directional mentorship relevance from general text similarity.
- [ ] Explain research strategy, development approach and experiment design separately; describe only sprint/review practices that actually occurred.
- [ ] Document selected scratch method, data provenance/review/splits, baselines, metrics and significant architecture/scope changes, cross-referencing #1, #3 and #7.
- [ ] Repair reference-manager records as well as visible text; complete a claim-to-source check and review the revised chapters with the supervisor.

## Validation

Review the problem → gap → objective → question → method → implementation/evaluation chain. Independently inspect high-risk citations and compare all claimed corrections with the actual master, not only a revision log. Update tense according to completed versus outstanding work. The final abstract is rewritten after final results under #6.

## Dependencies and related work

#1 requirements, #3 protocol/data, #7 retained scope and #27 graph decisions inform these chapters. #6 owns Chapters 4-6 and whole-report consistency; #9 supplies genuine process evidence.

Priority: high; correct sources and scope before final claims are written.

## Completion evidence

Link the relevant versioned documents, focused Gitmoji commits/PRs, run/test records and sanitized figures as applicable. Keep local, CI, hosted and participant-study evidence distinct. Do not publish credentials, signed documents, private datasets or identifiable participant information. Close only when the acceptance criteria are verified; record unresolved limitations honestly. Source changes should be completed and verified as focused logical milestones.

## #29: Benchmark matching, inference and recovery against justified performance requirements

State: OPEN

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/29

## Problem

The report states that at least 95% of matching queries should return within two seconds at up to 100 concurrent requests, but a justified workload and measured result were not established. Database retrieval, embedding inference, model startup and a user's first-match journey are different operations and cannot share an unexplained timing claim.

## Desired outcome

Repeatable, environment-specific performance and recovery evidence for the final selected model/application, assessed against justified criteria and reported without unsupported scalability claims.

## Scope and delivery

1. Agree the workload, thresholds, tested population/data size and measurement boundaries.
2. Benchmark database retrieval, server/model startup and inference, and relevant complete requests.
3. Inspect failures/bottlenecks, verify justified corrections and report limitations in Chapter 5.

#4 owns signup-to-first-match measurement; #8 owns hosted release acceptance; #21 owns abuse/concurrency controls. This issue supplies controlled performance evidence rather than duplicating those implementations.

## Acceptance criteria

- [ ] Confirm or explicitly amend the 95%/two-second/100-concurrent target with rationale and supervisor review; preserve original requirement history.
- [ ] Record application/model/data versions, infrastructure/tier, region, device/runtime, network assumptions, corpus size, cache state, tool/version and repetitions.
- [ ] Define workload/concurrency, ramp, duration, input sizes and request mix; distinguish retrieval-only, inference, server/model cold start and full application response.
- [ ] Use authorized isolated infrastructure/accounts with bounded cost/load and no real participant data; do not load-test a third-party or shared production service without authorization.
- [ ] Report request counts, success/failure/timeout rates, relevant latency percentiles, throughput and resource use where measurable; do not exclude failed requests to improve results.
- [ ] Exercise restart, unavailable dependency, retry and recovery; verify that throttling/deduplication and stale-result handling remain correct under load.
- [ ] Retain scripts/configuration, raw measurements, summaries and error examples with reproducible commands.
- [ ] Identify bottlenecks from evidence, retest relevant fixes under comparable conditions and report unmet criteria and tested limits.
- [ ] Connect findings to requirements and Chapters 5-6; do not generalize beyond measured conditions or claim an untested universal minimum specification.

## Validation

Repeat a representative workload and independently recompute summary metrics from raw measurements. Compare expected thresholds with actual outcomes and link any defect/retest. Run a bounded local baseline first; repeat applicable measurements on the selected hosted release when authorized.

## Dependencies and related work

Finalize targets with #1 and #28. Final-model acceptance depends on #26; preliminary MiniLM measurements remain labelled separately. Coordinate #3, #4, #8, #20, #21 and report #6.

Priority: required before final performance/scalability claims; schedule a small measurement early to expose feasibility risks.

## Completion evidence

Link the relevant versioned documents, focused Gitmoji commits/PRs, run/test records and sanitized figures as applicable. Keep local, CI, hosted and participant-study evidence distinct. Do not publish credentials, signed documents, private datasets or identifiable participant information. Close only when the acceptance criteria are verified; record unresolved limitations honestly. Source changes should be completed and verified as focused logical milestones.

## #30: Prepare and record the graded sprint-progress presentation on 5 November 2026

State: OPEN

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/30

## Problem

The student confirmed a sprint-progress presentation on 5 November 2026 worth 5% of the unit assessment. The exact duration/rubric has not been supplied; final-report/defence dates remain unconfirmed. Working application evidence, separate scratch-training evidence and remaining gaps must be presented coherently.

## Desired outcome

A rehearsed, evidence-backed progress presentation and demonstration, followed by a recorded feedback/next-sprint plan. This is a progress review, not a claim that final research/model integration is complete.

## Scope and delivery

1. Confirm presentation logistics and select the actual sprint accomplishments and demonstrated versions.
2. Prepare concise presentation/demo materials, genuine test/training evidence and a labelled backup.
3. Rehearse, present, record actual feedback and update the next-sprint checklist.

Do not make an unverified last-minute model/schema swap, claim the app already uses the scratch pilot, or present knowledge-graph discussion as implementation.

## Acceptance criteria

- [x] Confirm the time allowance, expected deliverables/access and current marking guidance where available; retain 5 November/5% as student-confirmed context.
- [x] State the problem, users, objectives and sprint goal; link completed work to commits, checks and observed outcomes.
- [x] Prepare the actual profile → recommendations → request → acceptance/connection demonstration with permitted disposable data.
- [x] Identify which app/environment/model version is demonstrated; clearly distinguish MiniLM application behavior from the separate scratch-training pilot.
- [x] Show random initialization, real parameter updates, learning curve, selected checkpoint/reload and the saved baseline comparison, including the negative result and five-query/machine-label limitations.
- [x] Explain interaction-history cold start, minimum profile input, eligible mentor prerequisites, new mentors, empty pools and separate model startup latency.
- [x] State incomplete final scratch-model integration, reviewed evaluation, graph decision and relevant report/functional gaps honestly.
- [x] Prepare a bounded next-sprint plan with acceptance evidence and the specific supervisor decisions needed.
- [x] Rehearse within the confirmed duration; verify demo access and a clearly labelled recording/screenshots backup.
- [ ] After the presentation, record actual feedback/decisions and resulting issue updates; record an awarded mark only when genuinely received.

## Validation

Rehearse with someone following the narrative, verify evidence paths and access, and run the demonstrated journey on its intended environment. A backup recording must show its actual version/date; do not fabricate or relabel historical evidence. Close after the review and feedback capture, not merely after slides are drafted.

## Dependencies and related work

Draw from #2, #3, #4, #6, #9 and #25's existing training evidence. #1/#26 record final model requirements, while #27 and #7 supply review questions. Preparation can proceed while final-project work remains open.

Priority: immediate; confirmed assessed review on 5 November 2026.

## Completion evidence

Link the relevant versioned documents, focused Gitmoji commits/PRs, run/test records and sanitized figures as applicable. Keep local, CI, hosted and participant-study evidence distinct. Do not publish credentials, signed documents, private datasets or identifiable participant information. Close only when the acceptance criteria are verified; record unresolved limitations honestly. Source changes should be completed and verified as focused logical milestones.


## #31: Prepare the final release, assessor handover and verified submission package

State: OPEN

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/31

## Problem

A working deployment and report draft are only parts of the final assessed deliverable. The official final-report and defence dates are not confirmed; the guide's 23 November date is a planning reference, not a confirmed appointment. Release identity, model/data access, operating guidance, assessor access and submission verification need one explicit checklist.

## Desired outcome

A supervisor-reviewed, reproducible final package whose report, source, trained model, deployed behavior and demonstration agree, with secure assessor access maintained for the agreed period.

## Scope and delivery

1. Confirm official deadlines, submission channels and retained acceptance scope.
2. Assemble the completed report/release, user and technical handover, test/research evidence and demonstration backup.
3. Review, submit through the authorized channel and reopen the submitted artefacts/links to verify delivery.

This issue coordinates final delivery. It does not substitute for incomplete model, evaluation, scope or report work and does not authorize sending material, changing sharing, publishing data or incurring charges without the appropriate task authorization.

## Acceptance criteria

- [ ] Record confirmed final-report/defence dates, channels, format/naming and required approvals; do not infer them from old or relative course dates.
- [ ] Link completion evidence for retained objectives and significant requirements, with explicit approved amendments for any removed scope.
- [ ] Identify the reviewed code release/tag, deployment, selected scratch-model/preprocessing hashes and evaluation dataset/protocol versions.
- [ ] Provide accessible repository/setup instructions, dependency/configuration guidance without secrets, ordered migrations, permitted sample-data access and model loading instructions.
- [ ] Supply a concise user guide for the actual roles and complete workflows, known limitations and safe recovery/support instructions.
- [ ] Verify secure assessor access, permissions, live backend/model availability and reproducibility without undocumented laptop-only steps.
- [ ] Final report #6 and Chapters 1-3 corrections are reviewed; refresh contents/lists/cross-references and inspect the exported PDF for layout and figure readability.
- [ ] Include required declarations, genuine approvals/signatures and similarity material according to current instructions; disclose material AI assistance accurately.
- [ ] Prepare and rehearse the final narrative, representative inputs and clearly labelled backup demonstration.
- [ ] Record hosting/model ownership, ongoing access period, relevant costs/expiry and maintenance/closure plan.
- [ ] Complete the authorized submission, reopen the exact uploaded files and links, verify access and retain a dated manifest/receipt and backup.

## Validation

Have another authorized person follow the setup/user instructions and attempt the main tasks. Verify submitted artefacts rather than only local originals. Keep signed reports, credentials, identifiable study records and restricted data private; use appropriately sanitized evidence in public issues.

## Dependencies and related work

Depends on #28/#6 report completion, #7 scope, #8 hosted acceptance, #5 SUS, #3 evaluation, #4 cold start, #25 training, #26 integration, #27 agreed graph work and #29 performance. Coordinate #9 provenance, #23 access policy, #15/#32 account mail and #33 retained notification delivery.

Priority: required final delivery; confirm logistics early and close only after actual submission verification.

## Completion evidence

Link the relevant versioned documents, focused Gitmoji commits/PRs, run/test records and sanitized figures as applicable. Keep local, CI, hosted and participant-study evidence distinct. Do not publish credentials, signed documents, private datasets or identifiable participant information. Close only when the acceptance criteria are verified; record unresolved limitations honestly. Source changes should be completed and verified as focused logical milestones.

## #32: Add secure passwordless sign-in with email OTP

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/32

## Problem

The student requested login with email and one-time passwords/codes. Existing email/password sign-in does not provide a complete passwordless email-code journey. Email ownership verification, password recovery and membership/affiliation verification are distinct flows.

## Desired outcome

An eligible member can request a one-time code at their email address and complete sign-in through an accessible, reliable flow without bypassing registration, role or membership rules.

## Scope and delivery

1. Define the email-OTP journey and identity-provider configuration, preserving the existing supported email/password route unless an explicit replacement is agreed.
2. Implement request, verification, resend, expiry and recovery states with provider-backed validation.
3. Verify actual email delivery and authenticated sessions in the selected local/hosted environments.

This issue covers email OTP, not SMS or authenticator-app MFA. An email code proves mailbox access, not employment/alumni affiliation. Do not create a custom insecure code store or log codes/tokens.

## Acceptance criteria

- [x] Define whether OTP is existing-account sign-in and how first-time users complete the approved signup/role flow; requesting a code must not silently bypass membership or create inappropriate accounts.
- [x] Validate email input and provide generic request responses that do not disclose account existence; define clear accessible instructions and an edit-email action.
- [x] Use the maintained authentication provider's supported email-code/session mechanism with documented expiry, single-use behavior and server-side verification.
- [x] Handle valid, invalid, expired, reused and superseded codes, too many attempts, resend cooldown and provider rate limits with safe recovery feedback.
- [x] Prevent duplicate submissions and uncontrolled code guessing/sending; do not expose codes, tokens or sensitive account data in logs, analytics or URLs.
- [x] On success establish the intended session, validate any destination server-side and enforce normal role, visibility and membership/access rules.
- [x] Cover interrupted verification, changed email, concurrent tabs/devices, delivery delay/failure, sign-out and subsequent sign-in behavior.
- [x] Code entry works with paste/autofill where supported, keyboard, screen reader and narrow/mobile layouts; preserve permitted state and announce pending/errors.
- [x] Verify provider templates, sender/delivery configuration and environment-specific redirects together with #15; record delivery and authentication outcomes separately.
- [x] Add focused regression/integration coverage and update user instructions and report evidence.

## Validation

Use disposable accounts and actual permitted email test facilities. Test request → delivered code → verification → authenticated task, expired/reused/wrong codes, resends, unknown addresses, attempt/send limits and recovery. Distinguish mocked tests from observed mailbox delivery and hosted session acceptance. Never publish real email addresses or codes.

## Dependencies and related work

Preferred provider: **Resend**, requested by the student on 4 November 2026. #34 owns shared sender-domain, Supabase Auth SMTP/integration, server-side API credentials, environment isolation and delivery verification. Hosted Auth SMTP/template configuration and one controlled inbox delivery are now verified; #34 retains its remaining acceptance requirements.

#15 owns confirmation-aware signup, email verification and password recovery; #23 owns affiliation policy; #8 hosted acceptance; #20 CI and #6 reporting. Coordinate delivery with #33 while keeping optional messaging preferences separate from required account-security mail.

Priority: high; requested account-access capability. Its addition does not establish that the broader auth flows are complete.

## Completion evidence

Link the relevant versioned documents, focused Gitmoji commits/PRs, run/test records and sanitized figures as applicable. Keep local, CI, hosted and participant-study evidence distinct. Do not publish credentials, signed documents, private datasets or identifiable participant information. Close only when the acceptance criteria are verified; record unresolved limitations honestly. Source changes should be completed and verified as focused logical milestones.

## #33: Deliver mentorship notification emails and consent-based reminders

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/33

## Problem

The student requested event-driven emails and reminders similar to professional networks: connection/mentorship requests, responses and, where supported, mentions. A persisted request state alone does not notify a member or establish reliable email delivery.

## Desired outcome

Members receive useful authorized event notifications and optional reminders, with preferences, duplicate protection, reliable delivery and safe links back to the application.

## Scope and delivery

1. Agree an event/channel matrix and minimum release scope: new mentorship request, request accepted/declined as appropriate, and justified pending-request/reminder events.
2. Implement templates, delivery processing, preferences and relevant reminder scheduling.
3. Test real delivery, failure/retry behavior, permissions and notification lifecycle.

Mention emails are conditional on an approved, implemented posts/comments/mentions feature. Record that dependency or approved deferral; this issue does not add a social feed, posting system or full chat. Marketing campaigns, scraping contacts and unsolicited bulk messaging are outside scope.

## Acceptance criteria

- [x] Define each event's actor/recipient, trigger, deduplication key, template, permitted content, urgency and preference category; distinguish required account/security mail from optional activity/reminder mail.
- [x] Send request/response notifications only after the underlying authorized transaction is persisted; never notify the wrong user, send for failed actions or disclose another member's private contact/profile data.
- [x] Provide clear per-category preferences and unsubscribe controls for optional email; protect settings and unsubscribe actions from cross-user modification.
- [x] Reminders have an agreed cadence, eligibility/staleness checks, frequency caps and cancellation rules; accepted/declined/cancelled requests do not keep receiving pending reminders.
- [x] Mention notifications require real supported mention events and access checks; hidden/deleted/unavailable content and blocked members do not leak content or generate inappropriate mail. If the feature is absent, document the dependency/deferral explicitly.
- [x] Respect membership, staff moderation, privacy/blocking and contact-sharing rules across event generation, delivery and reminders.
- [x] Use safe, branded, accessible HTML/plain-text templates, truthful subjects and server-generated application links; deep links recheck authentication/authorization and handle expired/unavailable destinations.
- [x] Delivery has a persistent retry-safe event/outbox or justified equivalent, bounded retries/backoff, idempotency and auditable status without credentials or unnecessary personal data in logs. Maintain durable application event/reminder deduplication; Resend's bounded idempotency retention is not a permanent duplicate-send ledger.
- [x] Configure and verify the chosen sending service/provider, sender identity/domain requirements, secrets and local/test/production isolation; record delivery limits/cost assumptions.
- [x] Handle bounces, suppression/complaints and persistent failure appropriately; failed email must not undo a successfully completed mentorship transaction or prevent in-app status access.
- [x] Test preferences, unsubscribe, delayed/duplicate events, scheduler retries, stale reminders, blocked access and service outage/recovery with disposable data.
- [x] Retain sanitized actual delivery evidence and update user/report documentation; no email is sent to real members merely to prove implementation.

## Validation

Exercise each retained event from the real authorized workflow through delivery to the destination link. Verify recipient selection, preferences and underlying database state. Inject duplicate events and delivery/scheduler failures, then confirm bounded retry and no repeated unwanted messages. Email preview, accepted provider API call and observed delivery are separate evidence layers.

## Dependencies and related work

Preferred provider: **Resend**, requested by the student on 4 November 2026. #34 owns shared sender-domain, Supabase Auth SMTP/integration, server-side API credentials, environment isolation and delivery verification. Provider setup is verified and #34 is closed; broader member delivery remains restricted pending the #33 release.

#14 owns the useful first-contact action; #15 and #32 own verification/recovery/OTP account mail; #19 privacy/blocking; #23 eligibility; #8 hosted configuration; #20 CI and #6 reporting. Mention events depend on a separately approved implemented posts/comments feature.

Priority: requested product capability; deliver the core mentorship events before optional digests or mention features that do not yet exist.

## Completion evidence

Link the relevant versioned documents, focused Gitmoji commits/PRs, run/test records and sanitized figures as applicable. Keep local, CI, hosted and participant-study evidence distinct. Do not publish credentials, signed documents, private datasets or identifiable participant information. Close only when the acceptance criteria are verified; record unresolved limitations honestly. Source changes should be completed and verified as focused logical milestones.

## Verified controlled delivery milestone, 6 November 2026

Provider infrastructure and controlled request/connection delivery are verified under #34 and [PR #79](https://github.com/OmarMohammedSiddique/alumniconnect/pull/79). The approved notification migration is applied with RLS and service-only worker RPCs. Six messages arrived in the approved inbox, including one request and two connection notifications; worker runs processed 1, 2 and then 0 events. Signed provider delivery callback HTTP 200 and fixture cleanup are verified. Sanitized versioned evidence is in [PR #80](https://github.com/OmarMohammedSiddique/alumniconnect/pull/80), merged after all required checks passed.

- [x] Shared provider configuration and controlled inbox delivery verified.
- [x] Request recipient and successful two-party connection notifications verified through committed authenticated fixture workflows.
- [x] Repeat worker run produced no duplicate application sends.
- [x] Disposable fixtures removed; real member profiles/passwords preserved.
- [x] Broaden member delivery beyond the owner's approved inbox through a separate authorized release.
- [x] Finish the remaining preference/lifecycle, reminder and other applicable acceptance criteria above.

Keep #33 open. Reminders, unsupported mentions and broad member delivery are not completed by this controlled provider milestone. Account-mail delivery evidence does not claim interactive code-entry/session verification in this run.


Final provider-delivery publication: PR #80 is merged, production `190c725` is READY on the custom domain, and the cleaned approved-inbox restriction is active. Final empty-worker health check passed: https://github.com/OmarMohammedSiddique/alumniconnect/actions/runs/42191246051. Shared provider setup and controlled delivery acceptance are complete under #34. Keep #33 open for its remaining criteria and separately authorized broader member delivery.


## Locally verified reminder release candidate, 6 November 2026

- `4599709`: default-off database-owned consent, three-to-seven-day eligibility, weekly recipient cap, per-request durable deduplication and service-only scheduler.
- `66db7d7`: scheduler integration, reminder templates, category settings and authenticated unsubscribe-all.
- `fb5a9c4`: event/consent matrix, user instructions, evidence boundaries, exact migration/release/acceptance plan and rollback guidance in `docs/verification/resend-delivery.md`, section 13.

Both notification SQL suites passed in a rolled-back local rehearsal; no email tables or reminder fixtures remained. All 172 unit tests, lint, typecheck and Webpack production builds passed. The real local production UI with a simulated loopback Auth/Data API passed default-off consent, save/reload, forged identity ignored, unsubscribe-all, read/write failures, protected-link continuation, worker authorization, zero page errors, zero scoped axe violations and mobile overflow checks. This is local evidence, not hosted reminder or inbox acceptance.

The event-definition and unsupported-mention-deferral criteria are now documented. Remaining applicable hosted criteria stay unchecked. No push, hosted migration, deployment or new live email has occurred in this run. The exact release candidate awaits explicit publication/migration/member-enablement authorization, followed by controlled hosted lifecycle and inbox verification. Keep #33 open.


## Verified completion, 6 November 2026

This completion supersedes the historical release holds and deferred-reminder status above. [PR #82](https://github.com/OmarMohammedSiddique/alumniconnect/pull/82) merged the functional release at `0126be8c`; [PR #83](https://github.com/OmarMohammedSiddique/alumniconnect/pull/83) merged sanitized operating and Chapter 5 evidence at `c5a8e7b`. Both passed quality, database, ML, CodeQL and previews.

- The exact reminder migration is applied as hosted `20261106155046_consent_based_request_reminders`, with default-off consent, database-owned opt-in time, no historical backfill, RLS and service-only scheduling/private predicates verified.
- All retained event types have controlled observed-inbox evidence: earlier #34 request/two-party connection receipts plus four new request/reminder/decline/recommendation receipts. Each new event was accepted on its first attempt; repeat processing returned zero and produced no additional message. No real member was emailed merely for testing.
- Hosted consent, deduplication, weekly cap, terminal/stale states, visibility, blocking and availability assertions passed. Real hosted and direct-browser settings passed authenticated save, unsubscribe-all, persistent reminder withdrawal, protected destinations, scoped axe and mobile overflow checks. Local/CI tests additionally cover cross-user denial, timestamp tampering, delayed events, leases, missing configuration, failure/retry and signed suppression behavior.
- Reminder-age simulation changed only exact disposable fixture timestamps, using a transaction-local setup bypass. It is accelerated due-event evidence, not three days of elapsed observation. No live complaint/bounce or new manual signed webhook replay is claimed. Prior #34 observed signed delivery callbacks and automated failure coverage remain separately identified.
- Exact fixture cleanup verified zero marked accounts, zero outbox rows, zero reminder opt-ins and unchanged empty suppressions. Obsolete credentials were removed. Real-member profiles/passwords were preserved.
- After controlled acceptance, the approved production-only test recipient restriction was removed. Eligible-member delivery is enabled; server secrets remain sensitive and production-only. Existing opt-outs and default-off reminders are preserved. Preview/local isolation remains enforced by the delivery boundary.
- Final published production: `dpl_Go7LUC7rhTUN5pTXkNp2hSH1KtQg` at source `c5a8e7b`, READY on the custom domain. Final worker health: https://github.com/OmarMohammedSiddique/alumniconnect/actions/runs/42250323091, returning processed: 0. The checked deployment-scoped error/fatal logs had no entries.

Versioned documentation: `docs/verification/resend-delivery.md`, section 14, and `docs/report-chapter-5.md`. Mentions are explicitly deferred because no supported posts/comments/mentions feature exists. The active five-minute GitHub recovery schedule can be delayed by the platform; this is not an exact-time guarantee. Reminder opt-in is available at Profile, Email preferences, with one reminder after three days, seven-day expiry and a weekly Mentor cap. All applicable acceptance criteria are verified; this issue is complete. Report/handover issues #6/#31 retain their broader outstanding scope.


## #34: Configure and verify Resend for account and application email delivery

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/34

## Problem

Email verification/recovery, passwordless email OTP, mentorship notifications and reminders need a tested shared delivery setup. The student proposed Resend on 4 November 2026; it is the preferred provider for this plan. The existing account/domain ownership, configuration, plan and actual delivery have not been verified.

## Desired outcome

A controlled Resend setup supports Supabase-managed account emails and server-originated application emails, with verified sender identity, safe secrets, delivery observability and documented usage limits.

## Scope and delivery

1. Confirm authorized account/domain ownership and current provider terms/limits; select a sending identity without assuming a Vercel-hosted subdomain permits sender-domain verification.
2. Connect Resend to Supabase Auth using its supported integration/custom SMTP route, leaving identity, code generation and verification with Supabase Auth.
3. Configure server-side application sending, delivery-event handling and controlled end-to-end tests for #33.

This is provider infrastructure, not implementation of the individual account/notification workflows. Do not purchase a domain/plan, alter unrelated DNS/email records, expose keys or send to real members without appropriate authorization. Resend does not itself define reminder eligibility or the application's OTP authorization rules.

## Acceptance criteria

- [x] Record provider decision, account/owner, permitted use, sender identity/domain, environments and required access without publishing personal account details.
- [x] Verify the selected sender domain and required DNS records under authorized control; preserve existing website/mail records and document ownership/renewal dependencies.
- [x] Check the current plan, verified-domain/test-sender restrictions, sending quotas/rate limits and costs; do not assume unlimited free delivery or buy upgrades to close the issue.
- [x] Configure Supabase Auth delivery through the supported Resend integration/SMTP route; retain provider-managed verification/OTP/recovery logic and safe environment-specific redirects/templates.
- [x] Keep SMTP/API credentials server-side with least-privilege access and an appropriate rotation/revocation process; no keys/codes in client bundles, issue bodies, screenshots or logs.
- [x] Configure distinct safe local/test/production delivery behavior and destination controls so tests cannot unintentionally email real members.
- [x] Provide a reusable server-side application delivery boundary for #33, with safe templates, idempotency, bounded failures/retries and a durable event record as appropriate.
- [x] Authenticate/verify any delivery webhook and process duplicate/out-of-order events safely; handle bounce/complaint/suppression without treating an API acceptance as guaranteed inbox delivery.
- [x] Verify actual permitted confirmation/recovery/OTP delivery under #15/#32 and request/response notification delivery under #33; record provider acceptance and observed delivery separately.
- [x] Document configuration names without values, provider limits, operating checks, sender/contact ownership and final handover instructions; update deployment/report evidence.

## Validation

Use provider-approved test facilities and disposable controlled recipients. Exercise send, delivery, delayed/failure paths, duplicate retries, webhook verification/replay handling and missing configuration. Check that successful core app transactions survive email outages and that optional activity preferences do not suppress required account-security messages.

## Dependencies and related work

#15 verification/recovery, #32 email OTP, #33 event mail/reminders, #8 hosted acceptance, #19 privacy, #21 relevant abuse controls, #20 CI, #6 report and #31 handover. Native Supabase/Resend integration is preferred for Auth delivery; application event mail uses a separate server-side workflow.

## Provider references

- [Supabase Resend integration](https://supabase.com/partners/catalog/resend)
- [Supabase custom SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend sender domains](https://resend.com/docs/dashboard/domains/introduction)
- [Resend idempotency guidance](https://resend.com/docs/dashboard/emails/idempotency-keys)

Priority: shared provider prerequisite verified through controlled production delivery. Broad member delivery and remaining notification features stay under #33.

## Completion evidence

Link the relevant versioned documents, focused Gitmoji commits/PRs, run/test records and sanitized figures as applicable. Keep local, CI, hosted and participant-study evidence distinct. Do not publish credentials, signed documents, private datasets or identifiable participant information. Close only when the acceptance criteria are verified; record unresolved limitations honestly. Source changes should be completed and verified as focused logical milestones.

## Verified completion, 6 November 2026

[PR #79](https://github.com/OmarMohammedSiddique/alumniconnect/pull/79) delivers the production recipient restriction; [PR #80](https://github.com/OmarMohammedSiddique/alumniconnect/pull/80) records final evidence. Both merged after all CI checks passed. Versioned evidence: `docs/verification/resend-delivery.md`, section 12.

- Six expected messages were observed in the approved connected Gmail INBOX: confirmation, recovery, OTP, one request and two connection notifications. Recipient checks matched the fictional Mentor/Mentee roles.
- All three application events were accepted by Resend on their first attempt, with no error. Separate inbox receipts establish arrival.
- Worker runs processed 1, 2 and then 0 events, without duplicate application sends. The previous configuration-related worker HTTP 503 is resolved.
- A provider-signed delivery callback returned HTTP 200, with `received: true`, and the Resend dashboard showed successful delivery events. Unsigned requests were rejected. Signature, suppression, duplicate-event and retry behavior retain automated coverage.
- The approved migration is applied, with RLS and service-only worker RPC permissions read back. Server-side secrets are sensitive and production-only.
- Exact marked test accounts and dependent data were removed; cleanup found zero test accounts, zero remaining outbox events and no suppression records. No real member profile or password changed.

Evidence boundary: this run verifies Auth email delivery, not interactive code entry or session completion. The mail connector withheld one-time codes. Only the fictional Mentee was administratively preconfirmed after delivery to exercise the separate notification workflow. No live bounce/complaint or manual signed replay is claimed. Broader member notification enablement and #33's deferred reminder/mention scope remain separate. Delivery remains restricted to the approved inbox.

Final published release: `190c725da2534e4cd8b8f2e917d8c4f5a58df8d3`, deployment `dpl_FtVkgHFWVVtUgWNdEEffPmhHq8CZ`, READY on the custom domain with the cleaned approved-inbox restriction. Final worker health check passed: https://github.com/OmarMohammedSiddique/alumniconnect/actions/runs/42191246051. The new deployment's error/fatal runtime-log query returned no entries in the checked window. All #34 acceptance criteria are verified.


## #35: Evaluate whether to use Cloudflare for DNS, security or application hosting

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/35

## Problem

Cloudflare could serve several different roles in AlumniConnect: DNS management for an owned domain, a reverse proxy/security layer, or application hosting on Workers. These are separate decisions. The project already uses Vercel for application hosting, Supabase for authentication/database services, and plans to use Resend for email. No Cloudflare adoption or migration has been approved or verified.

## Desired outcome

A documented, evidence-based decision to adopt Cloudflare for a specific purpose, defer it, or retain the current setup, with a clear rationale and impact on delivery.

## Scope and delivery

1. Identify the actual problem Cloudflare would solve and the current domain/DNS, hosting and model-serving requirements.
2. Compare the existing setup with Cloudflare DNS-only, proxy/security and application-hosting options separately.
3. Record the selected option and create bounded implementation follow-ups only if adoption is justified.

This is a decision issue, not authorization to change DNS/nameservers, migrate the app, purchase services or deploy resources. A considered decision not to adopt Cloudflare can complete it. Do not make the 5 November progress presentation depend on an optional infrastructure change.

## Acceptance criteria

- [x] Inventory the current hosting, owned domain/DNS provider if any, certificate setup and sender-domain requirements; do not assume control of a shared `vercel.app` domain.
- [x] State the concrete need, expected benefit and decision criteria: simplicity, compatibility, security, performance, cost, maintainability and assessment timeline.
- [x] Compare retaining the current setup, Cloudflare DNS-only with Vercel, Cloudflare proxy/security in front of Vercel, and hosting on Cloudflare Workers; rule out irrelevant options with reasons.
- [x] Check current official provider guidance, applicable plans/limits and domain/renewal costs; do not assume extra proxying improves speed or security.
- [x] Evaluate Vercel certificate verification, caching, redirects, original-client information and authentication/API behavior for any proposed proxy configuration.
- [x] Evaluate Next.js Server Actions/routes/session compatibility and the selected scratch model's runtime/export/serving constraints before recommending a hosting migration; specify necessary isolated tests rather than claiming compatibility.
- [x] Explain how the chosen DNS arrangement would support Resend sender verification while preserving existing website/mail records.
- [x] Record the decision, date, rationale, tradeoffs, owner and conditions that would trigger reconsideration; distinguish a recommendation from approved implementation.
- [x] If adopting, create/link focused implementation and validation tasks with rollback, ownership, access/cost boundaries and documentation requirements. If deferring or declining, record why and the effect on release planning.
- [x] Update the release architecture and relevant checklist/report references so the final documented stack matches the actual selected deployment.

## Validation

Review the decision against current configuration and official documentation. Perform any necessary proof of concept in an authorized isolated environment. DNS changes, production tests, migration, purchasing and deployment follow their separate authorization. Preserve evidence of measured benefits and limitations; do not introduce a provider merely because it appears in course examples.

## Dependencies and related work

- #8: hosted release and runtime acceptance.
- #26: scratch-model application integration and serving contract.
- #29: measured performance evidence.
- #34: Resend sender-domain and delivery setup.
- #31: release ownership, operating instructions and final handover.
- #30: immediate progress presentation; this decision must not displace its preparation.

## References

- [Vercel guidance on Cloudflare and reverse proxies](https://vercel.com/kb/guide/can-i-use-a-proxy-on-top-of-my-vercel-deployment)
- [Cloudflare Next.js hosting guidance](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [Resend sender-domain requirements](https://resend.com/docs/dashboard/domains/introduction)

## Completion evidence

Link the decision record, dated provider references and any authorized experiment results. Record follow-up issue numbers or the explicit deferral/no-adoption outcome. Close when the decision criteria above are met; implementation or migration, if selected, remains tracked separately.

Priority: consideration for the release architecture; optional adoption, not a confirmed project requirement.

## #36: Improve responsive registration, password checks and profile picture uploads

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/36

## Problem

Registration is constrained to a narrow column, collects a single full name, has no password confirmation and does not accept profile pictures. The user requested a responsive horizontal layout, split names, password validation/matching and an optional picture upload.

## Acceptance criteria

- [x] Use available desktop width while keeping narrow mobile layouts usable; verify visual and keyboard behavior.
- [x] Collect first and last names while preserving compatibility with existing profile names.
- [x] Validate new passwords and exact confirmation on the client and server.
- [x] Support preview, image type/size validation, authenticated photo persistence and replacement, and an actionable upload retry.
- [x] Verify private storage permissions: anonymous access and writes to another user's avatar are rejected.
- [x] Verify signup with email confirmation enabled and disabled; preserve account creation if an optional upload fails.
- [x] Record local checks, runtime results and deployment requirements separately.

## Related work

#15 owns the complete verification/resend/password recovery journey; #8 owns hosted acceptance. This issue covers the user-requested form and picture changes, not a new auth provider or a change to mentorship roles.

## Current status ,  5 November 2026

All seven criteria were verified locally with real browser, Auth, email-sink and Storage evidence. The stale-photo-display correction and repeatable acceptance tooling are now merged through [PR #60](https://github.com/OmarMohammedSiddique/alumniconnect/pull/60), merge commit `b10af572245c874afd6ab3d528ff468d34523962`, after Quality checks, Database permission tests, ML regression tests and CodeQL passed. The linked PR closed this issue on 5 November 2026.

This supersedes earlier unpushed/unmerged status notes. No hosted member-workflow acceptance is implied: hosted release remains #8 and complete email verification/recovery and sender delivery remain #15/#34.

## Follow-up boundary found ,  5 November 2026

Reopened during #15 account-email acceptance: a direct Server Action request with a valid password but no `confirm_password` field was accepted and created an authenticated account in the disposable local project. The action substituted the password for absent confirmation. The fixture was removed immediately. The prior #36 suite covered mismatching confirmation but missed the omitted-field case.

A local correction under #15 now requires exact submitted confirmation and updates the older smoke-test caller to send it. Keep this criterion open until the negative regression passes and the correction is merged. Existing desktop/photo/runtime evidence remains valid.


## #37: Implement and verify Google sign-in through Supabase Auth

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/37

## Problem

The user requested working Google sign-in. The local integration subsequently allowed first-time Google identities to create accounts automatically. On 4 November 2026 the user clarified that Google must sign in existing registered accounts only; new users must complete the normal registration flow first.

## Acceptance criteria

- [x] Add an accessible Google sign-in entry point with pending and actionable error states.
- [x] Use Supabase SSR PKCE, persist the verifier/session cookies and exchange the returned code server-side.
- [x] Constrain redirects to trusted app origins and safe internal destinations; handle cancellation, missing/expired/replayed codes and service failures without leaking provider details.
- [x] Preserve existing profiles/roles, normal registration, password sign-in and sign-out; Google does not verify alumni affiliation.
- [x] Reject unregistered Google identities in Supabase Auth before creating a user/profile, including direct OAuth requests. Base the decision on Auth-controlled provider metadata, not editable user metadata. Show an actionable registration-required message and verify same-email existing-account linking without role changes.
- [x] Configure a Google OAuth web client and Supabase Google provider with matching redirect URLs and minimal identity scopes. Keep secrets outside source/issues/logs.
- [x] Observe a real Google account sign-in, authenticated profile/session persistence, sign-out and subsequent sign-in in the intended environment.
- [x] Record automated/local evidence separately from Google/provider, CI, hosted and user-observed evidence.

## Related work

#15 account-access flows, #23 membership policy, #8 hosted acceptance, #36 responsive auth UI. This request authorizes Google sign-in as its own milestone; it does not replace email/password or alter the one-role-per-account schema.



## Completion evidence ,  4 November 2026

**Merged implementation:** PR #38 (including registration guard `6d615b6`) passed required CI and merged. The current published main also includes the reviewed ML documentation/source records through PR #41 (`36d5838`). No credentials or account identifiers are published here.

**Local automated/runtime evidence:** all 45 Node tests, lint/typecheck and Webpack production build passed. Supabase SDK protocol tests cover PKCE/verifier cookies, session exchange, cancellation, missing codes, fixed errors and safe redirects. Hook SQL/permission tests passed, including resistance to misleading user metadata. Real email registration, requested Mentor profile creation and password sign-in/sign-out passed.

**Local real Google/Safari evidence:** unregistered Google identity rejected with the fixed registration-required message and no account/profile insertion. After ordinary local registration, Google linked to the existing account without duplication and preserved its Mentor role, name and saved headline. Authenticated refresh, sign-out, protected-page denial and repeat Google sign-in passed. The temporary acceptance account/profile was deleted and the exact original nine accounts remain. The two originally requested Google-only accounts/profiles also remain deleted.

**Hosted provider configuration:** the Google client retains its local callback and now includes the exact hosted Supabase callback. Hosted migration `20261104171453` installs the source guard function; Dashboard Before User Created hook is enabled for `auth_hooks.reject_google_signup`. Private invoker-rights function rejects Google creation and is callable by Auth only. Production Vercel SITE_URL is set to the canonical HTTPS origin, and Supabase retains that Site URL plus the exact Next.js callback. The user saved the Google client secret directly in Supabase; Google is enabled, with nonce checks retained and no-email accounts disabled. No SMTP/security protections were weakened.

**Hosted real Google/Safari evidence:** the unregistered controlled identity returned the registration-required message and no profile was created. A deliberately labelled verified-email registered-account fixture was then created through the maintained Auth Admin API; no confirmation email was sent, and this does not certify the separate email-confirmation delivery workflow. Google reused that same account without duplicates, preserved its Mentor profile and saved fields, opened authenticated Discover/Profile pages, persisted after refresh, signed out to login, denied a protected page while signed out, and successfully signed in again. The backend confirmed the sign-out session removal. The fixture and profile were deleted through the Admin API afterward and the exact hosted baseline (zero accounts) was restored.

**Boundaries:** this completes Google existing-account authentication in local and hosted environments. Email confirmation/recovery/SMTP delivery (#15/#34), membership/affiliation policy (#23), research/model readiness (#3/#25/#26), photo acceptance (#36), and the broader final release (#8) retain their own open acceptance criteria. The two pre-existing hosted SECURITY DEFINER advisor warnings concern other functions; the new guard is SECURITY INVOKER and adds no such warning.


## #71: Resolve ONNX export dependency security alerts #48-#58

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/71

## Problem

Live review on 5 November 2026 found 11 open Dependabot alerts (#48-#58), all for `onnx==1.20.1` in `ml/requirements-export.txt`: 3 high, 7 medium and 1 low. No duplicate tracker or open remediation PR was found. Earlier minimatch/deepmerge work remains completed under #13.

## Findings

- #48 high: untrusted hub model warning suppression.
- #49 high: malicious-model object corruption / crash.
- #50 medium: external-data hardlink arbitrary file read.
- #51 medium: external-data symlink traversal.
- #52 high: external-data TOCTOU arbitrary file read/write.
- #53 medium: Upsample converter null-pointer crash.
- #54 low: Gemm converter out-of-bounds read.
- #55 medium: RNN/GRU/LSTM shape-inference out-of-bounds read.
- #56 medium: Scan inference null-pointer crash.
- #57 medium: packed sub-byte tensor expansion denial of service.
- #58 medium: ConvTranspose shape-inference out-of-bounds read.

[Live Dependabot alerts](https://github.com/OmarMohammedSiddique/alumniconnect/security/dependabot)

## Acceptance criteria

- [x] Inventory live alerts, severities, affected manifest and patched ranges.
- [x] Pin `onnx==1.22.0` and update the matching instruction in `ml/export_scratch_pilot.py`. Version 1.21.0 alone leaves #53-#58 affected.
- [x] Install in an isolated compatible Python environment and check dependency consistency.
- [x] Check the existing graph with the patched checker; export the trusted checkpoint to a temporary directory without overwriting published artefacts or retraining.
- [x] Verify opset/runtime compatibility and both-head parity within 1e-5; investigate any changed hash before changing committed artefacts.
- [x] Run appropriate ML/application regression checks and required PR CI.
- [x] Merge through the separately authorized workflow and confirm all 11 Dependabot alerts close on the default branch.

## Evidence and boundaries

This is an inventory and remediation proposal, not an implemented fix. No source edits, commits, pushes, merges, deployments, exports or package installations were performed. Python ONNX is export tooling; application inference uses the distinct `onnxruntime-node` package with a bundled-model hash check. This review does not demonstrate hosted exploitation. Existing CI installs training dependencies but not `requirements-export.txt`, so existing green CI alone cannot verify the upgraded exporter.

Related: #26 model export/runtime, #20 CI, #8 hosted acceptance. Separate secret-scanning fixture finding belongs to #34. Keep open until remediation and scan outcomes are verified.

References: [ONNX 1.22.0 release](https://github.com/onnx/onnx/releases/tag/v1.22.0), [patched advisory](https://github.com/advisories/GHSA-6pwm-x34p-fvj2).



## Verified local remediation ,  5 November 2026

Local commit `ec39597` on `codex/security-onnx-webhook` pins ONNX 1.22.0, replaces the stale exporter version instruction, and extends the ML CI job to install export requirements and run a synthetic exporter regression. All 11 live alert vulnerable ranges and minimum patched versions were checked against the new pin.

- Fresh Python 3.14 environment installed `ml/requirements-export.txt` successfully; `pip check` found no broken requirements. CI remains Python 3.12/Linux and has not run for this unpushed commit.
- 24 audit/preparation tests and 7 training/metric/export tests passed. Synthetic export uses invented weights/inputs, checks opset 17, dynamic batch, embedded tensors, manifest hash and both-head reference parity.
- ONNX 1.22.0 full-checks the existing bundled graph. Trusted-checkpoint re-export went to a temporary directory; model, manifest and parity fixtures are byte-identical to the committed files. No retraining, model replacement or private checkpoint publication.
- Fresh export passes ONNX Runtime Node inference for both heads, batches 1 and 5, including empty/sparse/Unicode/unknown/long inputs; max absolute error 1.1920928955078125e-7 (tolerance 1e-5).
- Lint/typecheck passed; final Node application suite 139/139 passed; npm audit has zero findings. Webpack production build passed (22/22 pages); Turbopack was blocked by the environment's local worker-port permission even on retry.
- Working tree is clean. No push, PR, remote CI, merge or deployment was performed. The 11 alerts remain open on the unchanged GitHub default branch until authorized integration and rescan. Do not close this issue based on local evidence alone.

## Final verified completion, 6 November 2026

PR #72 merged on 5 November. The default branch pins ONNX 1.22.0. GitHub now records every alert #48 through #58 as fixed, and there are zero open Dependabot alerts. Current main CI at `e335ac6704c2cc0dad6c922552be744adf8b58a8` passes ML/export, application quality and database permission checks: https://github.com/OmarMohammedSiddique/alumniconnect/actions/runs/42180791008

This supersedes earlier unpushed/unmerged/pending-rescan statements, which are retained as historical evidence. All acceptance criteria are verified.


## #75: Incorporate cookie consent banner, preferences dialog, and footer navigation with developer attribution

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/75

## Problem

The platform lacks a cookie consent banner and preference customization interface to inform users about local storage and tracking cookies (such as Vercel Analytics and theme preferences). Additionally, the footer lacks accessible controls for Cookie Settings, a link to the Privacy Policy, and an 'About Developer' attribution section/page honoring Omar Siddique as the developer and researcher with a hyperlink to https://omarsiddique.com.

## Acceptance criteria

- [x] Implement a responsive, accessible Cookie Consent Banner positioned at the bottom of the viewport explaining necessary, functional, and analytics storage.
- [x] Provide 'Accept All', 'Reject Non-Essential', and 'Customize Choices' actions that persist preferences in localStorage and dismiss the banner.
- [x] Implement a Cookie Settings modal dialog using native `<dialog>` adhering to modern web guidance (light dismiss, `closedby="any"`, overscroll containment, accessible labelling).
- [x] Allow toggling individual cookie categories (Strictly Necessary locked on, Functional/Preferences optional, Analytics optional) and saving preferences.
- [x] Gate or respect analytics tracking (Vercel Analytics) according to the user's analytics consent preference.
- [x] Update the footer across marketing and platform pages to include: Cookie Settings (reopens preference modal), Privacy Policy link (/privacy), and About Developer link.
- [x] Create an 'About Developer' page (/about-developer) detailing Omar Siddique's role as developer and researcher of AlumniKonneQt with a verified hyperlink to https://omarsiddique.com.
- [x] Update the Privacy Policy (/privacy) with cookie and local storage disclosures and cookie settings trigger.
- [x] Verify functionality, keyboard accessibility, SSR compatibility, and unit tests.

## Completed and verified, 6 November 2026

PR #78 is merged and deployed to [alumnikonneqt.com](https://alumnikonneqt.com).

- Corrective commit: `3dc9d17622410c127a1093de8e4641d0cb7026c2`.
- Production merge commit: `e335ac6704c2cc0dad6c922552be744adf8b58a8`.
- Production deployment: `dpl_AoTC4HUfk4TPSERV5ZR5Uemmhmpi`, READY and assigned to the custom domain.
- All PR checks and merged-main CI passed: [PR #78](https://github.com/OmarMohammedSiddique/alumniconnect/pull/78), [main CI](https://github.com/OmarMohammedSiddique/alumniconnect/actions/runs/42180791008).
- Local verification: 162 tests, ESLint, TypeScript and Webpack production build passed. The local Turbopack worker-port limitation was separate from the successful hosted build.
- All seven browser acceptance groups passed on production, including consent defaults/persistence/revocation, real SDK callback gating with telemetry requests stubbed, theme persistence, native keyboard and dismissal behavior, short/mobile layouts, public footer controls and cross-tab clearing. Axe reported no dialog/banner violations in the tested states; no browser JavaScript or hydration errors occurred.
- An existing fictional demo account verified authenticated dashboard footer controls, saved customization, and necessary login-session survival after rejecting optional storage and reloading. No profiles or database records were changed.
- The developer portfolio hyperlink returned HTTP 200.
- No error or fatal runtime log entries were returned for the new production deployment in the checked 10-minute window after acceptance.

### Release gates

- [x] Complete and commit the corrective implementation and local verification.
- [x] Publish the follow-up branch and PR, then verify CI.
- [x] Merge and verify the deployed corrections, including an authenticated workspace footer check.
- [x] Record hosted evidence and close after all release gates pass.

Repeatable browser checks: `scripts/verify-cookie-consent.mjs`. Local evidence snapshot: `docs/verification/cookie-consent.md`. Final hosted evidence is recorded here and in the completion comment.


## #87: Polish theme switching, homepage member actions, and shared notice alignment

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/87

## Requested scope
Follow-up to #75 and #16 for the requested website quality-of-life changes.

## Acceptance criteria
- [x] Theme controls switch light/dark with one activation, preserving consent-based persistence and keyboard access.
- [x] Shared academic prototype notices are centered.
- [x] Fine-pointer devices receive a subtle static paper-plane cursor with native interactive/text cursors and touch fallback.
- [x] Homepage actions reflect verified signed-in membership without prompting another registration or sign-in.
- [x] Explain the existing skill option source and display limit; leave skill filtering unchanged.
- [x] Verify anonymous/member rendering, responsive layout, keyboard behavior, accessibility and cookie consent regression.
- [x] Record implementation and verification evidence; publication remains subject to current authorization.



## #92: Use the supplied aK flight logo for the browser tab icon

State: CLOSED

Source: https://github.com/OmarMohammedSiddique/alumniconnect/issues/92

## Requested scope
Replace the browser tab icon with the supplied aK flight swoosh logo, with clean edges and readable square framing.

## Acceptance criteria
- [x] Prepare the supplied mark with transparency or a rounded background.
- [x] Verify local page metadata and the served icon, and open the local site in the side browser.
- [x] Commit, push, create a PR, pass required checks and merge as authorized.

## Related work
Follow-up to #87. Delivery evidence contributes to #9 without closing its wider report requirements.

## Completion evidence
PR #93 merged at `1711c16489c93f624a8c4d08ba6d300a63c88a87`, source commit `205083f`. The single-file change retains the original supplied mark on a white rounded tile with transparent outer corners. Local side-browser preview, generated metadata, exact HTTP-served PNG bytes and 256 by 256 RGBA checks passed before publication. Quality, ML, database permission, browser journey, CodeQL and both preview checks passed. The initial browser run failed during disposable database startup before application tests; the retry passed. CI run: https://github.com/OmarMohammedSiddique/alumniconnect/actions/runs/42414076149

Merged and preview-verified. No production deployment or user visual approval is claimed.
