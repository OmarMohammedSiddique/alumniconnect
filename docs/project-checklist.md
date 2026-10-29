# AlumniConnect Project Checklist

Last updated: 29 October 2026

This is the working checklist for the capstone. The approved proposal is the
source of truth. Detailed evidence and gaps are recorded in
[`proposal-traceability.md`](proposal-traceability.md).

GitHub tracking:

- [Capstone roadmap](https://github.com/users/OmarMohammedSiddique/projects/1)
- [Active issues](https://github.com/OmarMohammedSiddique/alumniconnect/issues)
- [Sprint milestones](https://github.com/OmarMohammedSiddique/alumniconnect/milestones)

## How to use this checklist

- Check an item only when its evidence has been reviewed.
- Link completed work to a commit, pull request, test result, or report.
- Keep research findings even when they do not support the expected result.
- Do not commit participant names, email addresses, signatures, or raw consent
  records.

## Immediate decisions

- [x] Keep Supabase, PostgreSQL, and pgvector as the approved backend stack.
- [x] Use Mentor and Mentee as mentorship roles; document both as alumni
  participants in the report and diagrams.
- [ ] Confirm the Mentor/Mentee terminology with the supervisor in writing.
- [ ] Confirm whether jobs, cohorts, and events must be completed before final
  assessment or may be formally re-scoped.
- [ ] Confirm the final semantic-versus-keyword evaluation protocol before
  rerunning the experiment.

## ML understanding track

These items are complete only when Omar can explain and demonstrate them
without relying on generated text.

- [ ] Explain what a sentence embedding is and why the project uses 384
  dimensions.
- [ ] Explain how `all-MiniLM-L6-v2` turns profile text into an embedding.
- [ ] Trace one profile from form input through embedding generation to the
  stored `pgvector` value.
- [ ] Explain cosine similarity and interpret example scores correctly.
- [ ] Trace one mentor recommendation from query vector to ranked result.
- [ ] Explain the difference between semantic matching, keyword search, and
  category filtering.
- [ ] Explain the cold-start problem and what AlumniConnect does and does not
  solve.
- [ ] Run a small hand-worked example showing similar meaning with different
  vocabulary.
- [ ] Explain Precision@1, Precision@3, Precision@5, MRR, coverage, and the
  limitations of the current ground truth.
- [ ] Reproduce an evaluation run on an isolated local database.
- [ ] Inspect raw rankings for at least five queries and explain successes and
  failures.
- [ ] Present the negative result honestly: the current category-assisted
  baseline performs better overall.
- [ ] Write a short model card covering model choice, inputs, outputs,
  limitations, privacy, and intended use.

## ML evidence and improvements

- [x] Add a read-only reproducible source audit with corruption/leakage regression
  tests. On 29 October, 15 tests passed; source counts, graph and metadata findings
  were independently checked. See [`ml-data-audit.md`](ml-data-audit.md).
- [ ] Approve the draft experiment protocol and permitted initialization route;
  see [`ml-experiment-protocol.md`](ml-experiment-protocol.md).
- [ ] Save raw per-query rankings instead of only aggregate metrics.
- [ ] Correct and independently verify the evaluation calculations identified
  in the traceability audit.
- [ ] Freeze a deterministic evaluation dataset and protocol.
- [ ] Add human relevance judgments using a documented rubric.
- [ ] Report uncertainty and per-domain performance, not only overall means.
- [ ] Compare the current model with at least one justified alternative using
  the same frozen dataset.
- [ ] Test embedding-text ablations: skills only, headline and skills, and full
  profile.
- [ ] Measure real signup-to-first-match success, latency, and coverage.
- [ ] Test cases with no exact shared skill words.
- [ ] Make recommendation explanations distinguish exact shared fields from
  semantic similarity.
- [ ] Document bias, language, synthetic-data, and domain-label limitations.

## Core approved implementation

- [x] Next.js and TypeScript application.
- [x] Supabase authentication and profile creation.
- [x] PostgreSQL schema with `pgvector` and `vector(384)`.
- [x] Server-side MiniLM embedding generation.
- [x] Cosine-similarity mentor ranking.
- [x] PostgreSQL full-text search baseline.
- [x] Database-level row-level security and staff controls.
- [x] Mentorship requests, responses, and connections.
- [x] Audit logging and basic recommendation explanation.
- [x] Verify the local minimum-profile-to-first-match path: a new Mentee saves
  headline and skills, receives the automatic embedding update and discovers a
  Mentor without prior activity. Browser observation recorded on 29 October;
  hosted reliability and measured latency/coverage remain unverified.
- [x] First-time onboarding milestone: clearer audience/role guidance,
  role-specific setup and next actions, optional completeness detail, and
  distinct missing-profile/no-recommendations states. See
  [`environment-verification.md`](environment-verification.md).
- [ ] Add independent free-text semantic search if retained in the approved
  interpretation.
- [ ] Complete or formally re-scope the job referral board.
- [ ] Complete or formally re-scope cohort grouping.
- [ ] Complete or formally re-scope event management.

## Testing and research evidence

- [x] Static checks and production build command.
- [x] Initial RLS test suite.
- [x] Synthetic matching evaluation.
- [x] Add automated unit tests for embedding failure and retry behaviour in
  `lib/profile-match-update.test.mjs`; rerun successfully on 28 October.
- [ ] Verify embedding failure and retry feedback during a live browser outage.
- [x] Verify a real empty-profile 422, retry preserving unsaved text, and recovery
  after a valid browser save, recorded on 29 October.
- [ ] Add an automated browser end-to-end test for signup, profile completion, embedding, and
  first recommendations.
- [x] Manually verify browser signup, automatic match update, recommendations,
  introduction, Mentor acceptance, connection, and re-login persistence on
  disposable local accounts, recorded on 29 October.
- [x] Verify the local HTTP signup, profile, embedding, discovery, request,
  response, connection and re-login path using `npm run smoke:local`.
  Twelve checks and fixture cleanup passed on 28 October. This does not replace
  the browser end-to-end gate above.
- [x] Expand request-response permission regression coverage for anonymous,
  missing-subject and known-ID non-recipient callers; apply the authentication
  fix locally. See `supabase/tests/rls_tests.sql` and migration
  `20261028000001_request_response_auth.sql`.
- [x] Create a module-level functional test matrix in
  [`environment-verification.md`](environment-verification.md), recording HTTP,
  database and browser verification boundaries separately.
- [ ] Prepare a representative-user usability protocol.
- [ ] Obtain any required supervisor or ethics approval before recruitment.
- [ ] Recruit representative Mentor and Mentee participants.
- [ ] Run task-based usability sessions and the ten-item SUS questionnaire.
- [ ] Recalculate and verify all SUS scores from de-identified responses.
- [ ] Record sample size, participant characteristics, task outcomes, and study
  limitations.

## Chapter 4: analysis and design

Chapter allocation follows the current course guide: Chapter 4 covers analysis
and design; Chapter 5 covers implementation and testing. Any final discussion
or conclusion chapter should follow the actual institutional template.

- [ ] Consolidate requirements and link them to approved objectives.
- [ ] Record stakeholder findings and supervisor scope decisions.
- [ ] Create the current ERD, use-case, sequence, activity, and architecture
  diagrams.
- [ ] Explain justified design changes and update the schema specification.

## Chapter 5: implementation and testing

- [ ] Explain how the implementation realises the Chapter 4 architecture.
- [x] Document the implemented embedding and matching pipeline in
  [`ml-system-guide.md`](ml-system-guide.md), with a verified local
  `npm run ml:walkthrough` demonstration.
- [ ] Document deviations from the proposed Edge Function/model API design.
- [ ] Document security and role enforcement.
- [ ] Include functional-test results.
- [ ] Include matching and cold-start results with tables and figures.
- [ ] Include usability and SUS results after the study.
- [ ] Include deployment evidence and screenshots.

## Final discussion and conclusion: placement per institutional template

- [ ] Answer every research question from collected evidence.
- [ ] Compare findings with the literature without overstating causality.
- [ ] Discuss why category-assisted search currently outperforms semantic
  matching overall.
- [ ] Discuss semantic performance under vocabulary mismatch.
- [ ] Document synthetic-data, sample-size, English-only, and model limitations.
- [ ] State which objectives were fully, partially, or not achieved.
- [ ] Give evidence-based recommendations and future work.

## Documentation and project management

- [x] Maintain proposal-to-implementation traceability.
- [x] Persist the Gitmoji commit convention in `AGENTS.md`.
- [x] Create GitHub milestones for the remaining sprints.
- [x] Mirror the priority actionable work as GitHub Issues.
- [x] Create a public GitHub Project for roadmap status tracking.
- [x] Track the commit-history documentation requirement in
  [GitHub Issue #9](https://github.com/OmarMohammedSiddique/alumniconnect/issues/9).
- [ ] Export the repository Insights commit graph and add a chronological
  commit, issue, pull request, CI, and sprint evidence table to Chapter 4.
- [ ] Use issue-linked branches and focused, verified commits for remaining
  work without backdating or padding the history.
- [ ] Record sprint reviews, retrospectives, and supervisor decisions.
- [ ] Complete API/RPC and database-schema documentation.
- [ ] Keep the signed proposal outside the public repository.

## Deployment

- [ ] Create separate hosted development and production Supabase projects.
- [ ] Review production RLS, secrets, redirects, and email configuration.
- [ ] Deploy the Next.js application to Vercel.
- [ ] Run role-specific smoke tests on the hosted application.
- [ ] Add the deployment URL to the repository documentation.
- [ ] Configure a custom domain only after the hosted application is stable.
- [ ] Add monitoring, error reporting, backup, and recovery notes.

## Final release gate

- [ ] `npm run check` passes.
- [ ] Database and RLS tests pass against an isolated test environment.
- [ ] No secrets or personal research data are tracked by Git.
- [ ] Every approved objective has linked evidence or an approved deviation.
- [ ] The deployed application passes the final smoke-test checklist.
- [ ] Chapters 4 and 5 agree with the actual implementation and results.
- [ ] Final supervisor review is recorded.
