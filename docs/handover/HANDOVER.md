# AlumniKonneQt complete assistant handover

Prepared for Omar Mohammed Siddique on 10 November 2026, Africa/Nairobi.

This is a standalone continuation brief for the project at `/Users/omarsiddique/alumniconnect`. Read this document first, then `FILES.md`, `ISSUE-REGISTER.md`, `CHAT-INDEX.md`, the current `AGENTS.md`, and the files relevant to the next task. The accompanying transfer folder also contains `ALL-FILES.tsv`, an exhaustive physical-file inventory including installed dependencies, generated builds and Git metadata.

## Evidence, coverage and authority

The handover used the current checkout, tracked history, uncommitted diff, documentation and verification records; live GitHub issue searches including all open issues and relevant closed issues; comments on #1, #8, #9, #23, #25, #26, #31, #87 and #92; and 272 available turns across 29 relevant Codex project chats (48 turn pages). Active and archived Codex history listings were paginated to their ends, and relevant project chat turns were read across their available pages. The chat index lists the sources. Camera and travel conversations that merely shared the working directory were excluded from project conclusions. Historical ChatGPT conversations, unavailable attachments, other assistants' private conversations and external documents not exposed by those sources cannot be claimed as reviewed. This is the most complete brief supported by the accessible project context, not a guarantee that every conversation on every service was available.

The actual code determines implementation. Current live issue criteria determine checklist state. A dated test record establishes only that revision, environment and scenario. A user decision in a later chat overrides an older design assumption. A policy/specification is not proof that its proposed schema or workflow exists. Do not turn a student-confirmed requirement into supervisor approval. No application, database, production or participant tests were rerun merely to prepare this brief. No live deployment behavior was newly verified during handover preparation.

## 1. Project overview

### Identity, purpose and audience

**AlumniKonneQt** is the public-facing identity. **AlumniConnect** is the repository name and remains in older reports, paths and historical discussion. The repository is `OmarMohammedSiddique/alumniconnect`, at https://github.com/OmarMohammedSiddique/alumniconnect. The correct public domain is **https://alumnikonneqt.com**, with `www` also part of the documented domain setup. Casual references to AlumniConnect.com or alumniconnect.com in chats must not be used as deployment targets.

The product is a professional alumni mentorship, networking and communication web application. Its domain context is Kenya Airways alumni and eligible participants, including former employees, retirees, current personnel and former interns/attachees under the proposed membership policy. It helps a Mentee describe their interests and needs, find Mentors, inspect shared context, request a connection, and continue after acceptance. Mentors offer guidance and respond to requests. Staff manage roles and moderation with database-enforced permissions.

This is an **independent Strathmore University academic capstone prototype inspired by Kenya Airways**. It is not an official Kenya Airways service and has no verified airline endorsement. Never imply that stock-photo subjects are actual members or airline employees, or that a public signup establishes employment affiliation.

### Research purpose and end goal

The approved general objective is to build a professional alumni web platform using semantic vector embeddings for intelligent mentorship matching. Five specific objectives concern analysing existing systems; identifying pairing and institution-to-alumni communication challenges; designing pgvector/RBAC/search architecture; implementing matching and role controls; and evaluating relevance, usability and cold start. `docs/proposal-traceability.md` maps these to proposal sections and requirement IDs.

The end goal is a defensible assessed release whose source, deployed behavior, scratch-trained model, reviewed evaluation, research report and demonstration agree. It requires more than a visually finished site: genuine training from random initialization, live use of the student's model, fair comparative retrieval evaluation, cold-start evidence, bounded performance evidence, representative-user usability evidence, accurate report chapters and verified final submission/access. Negative results must remain visible.

The proposal title found in the latest located proposal text is exactly:

> Optimising Mentorship Matching in Professional Alumni Networks Using Semantic Vector Embeddings for Enhanced Engagement

A later suggested title adds `AlumniKonneQt: ` before that wording. That is a proposal for revision, not an approved replacement title.

## 2. Background and context

### People, organisations and assessment

- Omar Mohammed Siddique is the project author, researcher and owner. Existing external report filenames include student number 152322; do not infer further participant or institutional identities from it.
- Strathmore University supplies the academic capstone context. A supervisor/lecturer provided SMART-objective corrections, required own-model work and asked how cold start is addressed. The supervisor's name was not established by the reviewed source set.
- A marked proposal was previously reported as **38/40 with minor corrections**, particularly SMART objectives. This is proposal-stage evidence, not a final project grade.
- Omar confirmed a sprint-progress presentation on **5 November 2026 worth 5%**. Preparation exists. The actual presentation feedback, resulting decisions and awarded mark remain unrecorded in the live open #30 criteria.
- The official final-report and defence dates remain unconfirmed. **23 November** is a guide/planning reference, not a confirmed appointment. Do not infer a deadline from old relative phrases such as tomorrow.
- The project is substantially solo work. Preserve genuine GitHub development evidence; do not manufacture stand-ups, retrospective notes, stakeholder meetings, review approvals or teamwork history to fit Scrum terminology.

### External documents and private material

The approved 41-page signed proposal was supplied outside the repository. It must remain outside public Git history. The most developed master-report baseline located in prior work is:

`/Users/omarsiddique/Documents/Codex/2026-09-17/referenced-chatgpt-conversation-this-is-an/outputs/AlumniConnect_Revised_Through_5_4.docx`

It contains substantial Chapters 1 through 5, ending at section 5.4.4; Chapter 6 was absent in that inspected baseline. Omar said it should be the latest but asked the assistant to check for a newer version. No later authoritative merged master report has been established. Preserve the September original and nominate the current editable master before major report changes.

The later six-page standalone Chapter 5 Word output is:

`/Users/omarsiddique/.codex/visualizations/2026/11/05/01a1aa9d-be7d-7f33-afec-fa606623e0ba/AlumniConnect_Chapter_5.docx`

The more maintainable repository draft is `docs/report-chapter-5.md`. Later evidence updates reached this Markdown draft, so the older Word output must not be assumed current or already inserted into the master report. Those external paths were recovered from project chats; availability on a receiving machine is not guaranteed.

The 4 November supervisor-style audit is referenced at:

`/Users/omarsiddique/.codex/visualizations/2026/11/04/01a1a5e1-d5d3-7ca1-8918-d217f7cd7db3/alumniconnect-supervisor-audit-2026-11-04.md`

Private source data, review identities, signed documents, actual profile identifiers, credentials, email codes and access-bearing URLs must not be copied into public issues or ordinary AI-transfer attachments. Local `.env.local` and `.env.hosted-demo-access.json` contain sensitive operational access. This brief names their purpose without reading or reproducing their values.

### Environment boundaries and common wrong assumptions

Localhost and the hosted website use different configurations and databases. Deployment does not copy local accounts, profiles, sample mentors or embeddings. `localhost` and `127.0.0.1` can reach the same local process but have separate browser cookies. Use a consistent origin through an authentication flow. Local Docker/Supabase must be running for local database workflows.

An empty mentor catalogue cannot be repaired by changing an embedding model. A name-only profile is insufficient for semantic recommendations. A saved profile and a valid regenerated embedding are separate steps. An eligible result is not proof of suitability. Similarity is not a probability of mentorship success. Shared skills are exact overlap, not a causal explanation of the neural score.

The system has a hosted prototype and bounded verified hosted workflows. Older statements that it has never been deployed are stale. Conversely, a ready deployment does not prove final-model acceptance, quality, usability, all role workflows or current settings.

## 3. Decisions made

### Product scope and roles

1. Keep **Next.js, Supabase, PostgreSQL and pgvector**. Do not replatform merely because another service is mentioned in course examples.
2. Use `mentee` and `mentor` for public mentorship roles. Each account has its existing single role. Both are alumni participants in report explanations. Staff roles are `moderator` and `admin`, never selectable through public signup. Written supervisor confirmation of terminology remains a report-level gap.
3. Separate affiliation eligibility from mentorship role. A proposed affiliation lifecycle includes unverified, pending, verified, rejected and revoked, but **`affiliation_status` and the proposed institutional gates are deferred**, not implemented merely because the policy describes them.
4. No national-ID or passport upload. The policy proposes least-intrusive corporate email, peer-vouching and limited administrator review paths, with retention and appeal rules. Those are design specifications pending implementation/stakeholder acceptance, not an operational verification claim.
5. Jobs and events are explicitly deferred to the post-capstone roadmap under the project scope record (#7). Cohorts are narrowed to existing graduation-year information/discovery context, not a forum or social-feed subsystem. Supervisor/report acceptance of these amendments still needs evidence. The scope record also mentions graduation proximity as a future affinity signal; do not claim it is implemented in the scratch comparison, which excludes graduation year.
6. No unsupported posts/comments/mentions feature. Mention emails are deferred because no such underlying feature exists. Requests, accepted connections and profile-based discovery are the actual communication scope. The connection kickstarter supplies a next step, not a full in-app chat system.

### ML and research

7. The final assessed system must use a model genuinely trained **from scratch**. Omar explicitly confirmed that a separately evaluated scratch model alongside a permanently MiniLM-only app is insufficient. Fine-tuning MiniLM alone does not satisfy that requirement.
8. Keep frozen MiniLM as the working pretrained route and comparison reference while developing the scratch path. Saving profiles performs inference, not training. The app is not learning from request acceptance/rejection.
9. Use the real saved scratch checkpoint for a temporary live side-by-side comparison. Both models rank the same bounded visible mentor pool from the same fields. Keep model identities and timings visible, and label scratch as experimental. Do not compare 64-value scratch outputs with 384-value MiniLM outputs, or treat scores as calibrated across models.
10. The comparison does not overwrite stored MiniLM vectors. Scratch inference is local ONNX in the Node server, with separate query and mentor heads. No Python serving service or schema swap was required for this preview.
11. Human relevance review was explicitly deferred so engineering preparation/training could proceed on machine labels. That authorizes a labelled pilot, not a claim of human-reviewed ground truth. Preserve original inputs and grades, keep proposed corrections separate, and create a new version after review.
12. Fit vocabulary, TF-IDF and other learned preprocessing on training only. Keep related people and conceptual templates from leaking across splits. Metadata, rationales, reviewer fields, IDs and split labels are never model input. The 740 unjudged training combinations remain unknown, not negative labels.
13. Keep final test performance unopened until the model/protocol are locked. Selection uses validation. If test feedback guides another model choice, disclose reuse and arrange a new independent final assessment.
14. More epochs, more machine-generated rows or a larger GPU are not assumed remedies. The pilot's negative result is retained. Better data diversity, judged suitability and controlled validation experiments come first. A larger second training experiment was discussed but not performed.
15. Knowledge-graph scope is **unsettled**. The requirements record proposes a skill/domain taxonomy and co-occurrence relationships, and excludes a dedicated Neo4j/GNN production service. Live #27 still requires a supervisor decision, implementation and measured contribution. Do not treat the document's taxonomy wording as supervisor sign-off or completed graph reasoning. An ERD or graph picture alone is insufficient.
16. The historical synthetic evaluation must be repaired: preserve rank positions and unknown labels, retain raw rankings, use reviewed directional goal/offer relevance, and compare the same candidate pools/fields. Never claim semantic matching beats every lexical baseline when the saved category-assisted baseline is stronger.

### Authentication, email and operations

17. Google sign-in is for **previously registered accounts**. It reuses an existing account; unregistered Google identities are rejected and directed to registration. Google branding is a distinct issue from functional OAuth.
18. Password, email OTP, signup confirmation and password recovery coexist. Registration requires matching password confirmation on the server as well as the UI. First and last names are separate inputs that support the stored full-name contract; profile photo selection is optional.
19. Resend is the chosen email provider. Supabase Auth SMTP handles account confirmation, recovery and OTP. Server-side Resend API delivery handles application activity. Optional activity preferences do not suppress account-security messages.
20. Activity delivery uses a durable outbox, preference/lifecycle rechecks, leases, bounded retries and stable provider idempotency keys. A successful mentorship action must not be rolled back merely because the email provider fails.
21. Pending-request reminders require a **separate default-off opt-in**. Eligible new requests can receive one reminder after three days, expiring at seven days and subject to a rolling weekly receiving-Mentor cap. Withdrawal invalidates queued reminders. Do not silently enable old requests or bulk backfill mail.
22. Keep Vercel hosting, Supabase backend and Porkbun domain/DNS. Cloudflare proxy/WAF/Workers and a Contabo VPS were considered without a measured need; no migration was selected. Revisit only for a concrete requirement. `auth.alumnikonneqt.com` is the sender subdomain, not automatically a custom Supabase Auth hostname.
23. Keep production mutations separate from code releases. Earlier approvals applied to their specified tasks and migrations; they do not authorize this receiving assistant to mutate production for unrelated work.

### Design chronology and the latest override

24. Older violet, green and liquid-glass experiments were superseded by the documented Crimson/ink/white brand system. Keep original AlumniKonneQt assets rather than the official Kenya Airways logo. Geist is the established typography.
25. The October/early-November `PRODUCT.md` direction specifies square opaque surfaces, no gradients/glass and very restrained airplane decoration. **Later explicit user instructions override the conflicting visual rules for the current local experiment.** Do not revert the newer design merely to obey that older document literally.
26. On 8 November Omar first requested a standalone **Window Seat** login/boarding-pass study, then asked to integrate it into AlumniKonneQt, then approved applying the direction across the system and matching signup to login. All remained **local, uncommitted and unpublished pending visual approval**. This restriction is still active for those design changes.
27. Current local direction: lighter heading weights, calmer ink-tinted neutral surfaces, restrained red actions, fewer borders, useful empty-state copy, concentric corners, sky-based auth pages, translucent auth cards and layered sky-color shadows. Cards derive their radius from padding plus the inner control radius. Shared controls use an 8px inner radius in the app; do not blindly apply the standalone study's larger radii everywhere.
28. The small airplane window contains moving clouds; a password lock unlocks on focus; login/signup success flies into the window, then morphs the button into a boarding pass. Dark mode has its **own moonlit sky asset with stars and a crescent**, not merely a darker daylight overlay. Reduced motion skips decorative travel.
29. The latest landing page replaces the generic collaboration photo/slogan panel with a clearly illustrative Mentor profile, preserves factual disclosures and destinations, and uses smooth native anchor scrolling with sticky-header clearance. Reduced-motion users keep immediate scrolling.
30. The compact static paper-plane cursor and matching glove hand were approved and released. Omar requested smaller/balanced visual weight. A subsequent hero flight-trail experiment was **explicitly rejected and removed**. Do not revive it or infer that the newer login flight authorizes a cursor trail.
31. The supplied aK Flight Swoosh logo is used for the browser icon on a rounded white tile with transparent corners. This was a specific user-approved asset choice, not permission to replace the whole brand identity.

## 4. Current status and exact stopping point

### Checkout snapshot

- Working directory: `/Users/omarsiddique/alumniconnect`.
- Branch: **`codex/launch-video`**.
- HEAD when handover research began: **`4e2abeefc458035fd8c6f86998eb1e4edd3979ed`**, `🎬 feat: add polished AlumniKonneQt launch video`, dated 8 November 2026 at 10:07:29 +0300.
- That launch-film commit was recorded as local and unpushed. Remote state was not refreshed by fetching during this handover. Do not assume this checkout equals current remote `main`.
- Approximately 37 tracked app/component files were already modified, with untracked arrival/auth/preview/image/test files. `FILES.md` records the exact per-file state from preparation. These changes belong to the local design work, not this handover. Preserve them and do not stage them with documentation.
- `PRODUCT.md`, README, ML README and several historical report passages have stale status or design wording. Preserve the evidence history and explicitly reconcile it in a later authorized milestone.

### Most recent user-visible work

The last completed development request in **Build Window Seat login and ticket UI** was to make FAQ, See how it works and other landing-section links smoothly autoscroll instead of jumping. Native CSS scrolling was added with a sticky-header offset and a narrow-screen offset adjustment; browser/reduced-motion checks and diff checks passed in that chat. The work remained local and uncommitted.

Immediately before that, login/signup arrivals and the separate night scene were implemented. The record reports **176 Node tests**, lint, TypeScript and browser checks passed. Real local password login and signup were exercised; invalid login stayed on the form and retry worked. Continue respected `/requests`; signup continued to `/profile`. Protected `/arrival` required a real session and rejected an external next destination. Temporary accounts were signed out and deleted. Confirmation-required and code-cookie branches used provider stubs; no delivered email-code/confirmation or fresh real Google exchange was claimed for this new arrival flow.

The earlier all-screen local visual pass reports 172 existing tests, 320px responsiveness and light/dark axe scans across public and protected surfaces, using existing fictional local accounts for read-only review. It did not establish new participant usability, model quality, notification delivery or complete authentication acceptance. See `previews/system-audit/SYSTEM-REVIEW.md`, `LANDING-REVIEW.md`, `ARRIVAL-REVIEW.md` and `previews/window-seat/ALUMNI-INTEGRATION.md`.

### Implemented and supported by dated verification

Authentication/session handling; registration and optional profile photos; profile completion/setup/draft preservation; MiniLM embedding generation and matching; keyword discovery and filters; request sending/cancellation/recipient responses; persisted accepted connections; next-step connection guidance; privacy visibility, reporting and blocking; mentor availability; staff role/moderation feedback; embedding request protections; cookie preferences and analytics consent; theme switching; profile email preferences; application notification outbox/worker; opt-in reminders; and the experimental scratch comparison are present.

Do not describe all these as newly reverified today. Their evidence spans local tests, independent CI and bounded hosted acceptance. The live issue register distinguishes closed engineering work from remaining research obligations.

Notable published milestones:

| Milestone | Recorded evidence and boundary |
| --- | --- |
| Hosted auth/discovery repair | PR #73 fixed origin/error/timeout handling; three approved missing production migrations repaired schema mismatch. #37 was reclosed after hosted login/refresh/logout/relogin and profile access. |
| MiniLM hosted cache | PR #74, merge `8925dc6798fd1e83b11cba76fea0b5ee271e1adb`, moved Vercel downloads into a writable temporary cache. Live embedding generation then returned 384-value vectors. |
| Hosted fictional demo | Five Demo Mentors plus one Demo Mentee, marked fictional. Both comparison columns, Recommended, keyword and request/acceptance/persistence were checked. Later approved personal professional-profile copy was separately verified without changing credentials/role/privacy. |
| Cookie/preferences/footer | PR #78 released #75 after consent lifecycle, authenticated footer, mobile and accessibility checks. |
| Account and application email | #15/#32/#36 and #34 closed after their bounded releases; #34 records six received messages, signed webhook and retry/idempotency evidence. |
| Mentor explanation display | PR #81 released #17, with 169 tests and production ordering/mobile/keyboard checks. Match percentages were replaced with non-misleading explanations. |
| Activity reminders | PR #82 merged at `0126be8c`; #33 closed after controlled owner-inbox delivery, consent/preference/duplicate checks and eligible-member enablement. Reminder age was accelerated on disposable fixtures, not three days of real waiting. |
| Cold start/stale vectors | PRs #84/#85/#86 published isolated browser/CI evidence and hosted migration/acceptance. Source migration `20261106165316_invalidate_stale_profile_embeddings.sql` appears in hosted history as `20261106213149`. Trigger invalidates stale vectors atomically when matching fields change. No backfill. #4 remains open for research/final-model/human requirements. |
| Theme/home actions | PR #88, merge `15a5590`, released one-click theme switching, notices and member-aware homepage destinations. |
| Cursors | PRs #89/#90/#91 released original folded-plane refinement, size adjustment and matching compact hand. The rejected trail removal is a separate local branch history, not deployed behavior. |
| Browser icon | PR #93 merged at `1711c16489c93f624a8c4d08ba6d300a63c88a87`; source `205083f`. #92 closed. Local tab and CI/preview verification exist; distinct final production visual acceptance was not established in that record. |
| Launch film | Local `4e2abee`, not recorded as pushed/published. Illustrative media, not a live product test. |

### Research and model status

The original pretrained pipeline is `Xenova/all-MiniLM-L6-v2`, q8, mean pooling, normalization, **384 dimensions**. The normal Recommended path still stores and searches those vectors.

The scratch pilot genuinely trained from random initialization locally and in Colab. Architecture: character embedding width 32, Conv1d with 32 filters/kernel 5, max pooling, separate 64-value query/mentor projection heads and L2 normalization. It has **11,200 parameters**, a **57-character training-fitted vocabulary**, 512-character input cap, seed 42, batch 16, Adam learning rate 0.001, ten-epoch ceiling and patience three. Four epochs ran; epoch one won on lowest validation loss. Best retained checkpoints correspond to epochs 1, 4 and 3. Checkpoint reload is supported; optimizer/RNG resume is not.

The input bundle has **90 profiles and 160 machine-labelled pairs**, including only **60 training pairs**. Validation/test pools each have only five queries. Human review and template/label adjudication are not complete. Twenty-seven proposed semantic corrections were deliberately left unapplied pending review.

| Five-query machine-labelled validation | TF-IDF | Scratch neural |
| --- | ---: | ---: |
| nDCG@5 | 0.853932 | 0.502278 |
| Precision@1 | 0.800000 | 0.200000 |
| MRR@5 | 0.840000 | 0.433333 |
| Relevant-hit coverage@5 | 1.000000 | 0.800000 |

These are **validation** results. MiniLM was not evaluated in that experiment. Final test performance remains deliberately untouched. The scratch model underperforms TF-IDF on every recorded measure. Do not replace this with an accuracy claim.

The selected checkpoint is exported and **does run in the hosted experimental comparison**. Early statements saying no export/integration exists are stale. That does not complete final selected-model replacement/integration under #26. Scratch and MiniLM remain separate; stored vectors have not been migrated to scratch space.

The historical 5 July synthetic retrieval experiment is a different dataset: **40 synthetic Mentors, 24 synthetic Mentee queries, eight domains**, with generated domain equality as relevance. Its aggregate figures must not be merged with the scratch pilot:

| Historical condition | P@1 | P@5 | MRR | Coverage |
| --- | ---: | ---: | ---: | ---: |
| Semantic full | 0.833 | 0.742 | 0.889 | 1.000 |
| Semantic minimal | 0.708 | 0.650 | 0.782 | 1.000 |
| Keyword and category | 0.917 | 0.842 | 0.951 | 1.000 |
| Keyword skills only | 0.708 | 0.525 | 0.729 | 0.875 |

Its scorer drops unlabelled candidates before scoring; raw ranks and coverage are consequently limited. The category-assisted method wins overall. Vocabulary-mismatch subset observations are preliminary, not proof of general semantic superiority. Retain `docs/eval-results.md` and repair the evaluator under #3 rather than silently rewriting the old result.

### Cold start, performance and usability

Twelve scenario groups passed in two isolated local runs and independent CI. Hosted six-group checks verified minimal profiles, goal preservation, stale-vector clearing after a controlled refresh failure, real Retry recovery, zero-history discovery, write guards and distinct model outputs. Fixture cleanup and zero fixture email sends were read back. These are engineering observations using fictional profiles.

Scripted save-to-first-result observations were **240 ms and 211 ms locally, 555 ms in CI**, against two fictional candidates. They are not human onboarding time, relevance scores or load benchmarks. A no-shared-skills case still returned candidates. Human relevance and no-suitable-Mentor handling remain substantive research questions.

The report target of **95% of matching queries within two seconds at up to 100 concurrent requests** is not established by reviewed measurement. **Mean SUS at least 68** is also a target, not an achieved result. No completed representative-user SUS dataset or valid scored results were established.

## 5. Open questions and next steps

### Current live open issues

There are **13 open issues** in the inspected live checklist. The complete bodies and acceptance checkboxes are preserved in `ISSUE-REGISTER.md`.

| Issue | Remaining outcome |
| --- | --- |
| #3 | Freeze reviewed directional relevance, repair original-rank scoring/metrics, preserve raw results and run fair final comparisons. |
| #4 | Complete human relevance/no-suitable-mentor assessment, any claimed human entry timing, final scratch-model repetition and supervisor graph decision. Current MiniLM engineering correction is already released. |
| #5 | Obtain appropriate study approvals, recruit representative real Mentor/Mentee participants, run tasks and standard ten-item SUS, calculate genuine results and limitations. |
| #6 | Finish Chapters 4 through 6, reconcile earlier chapters/results, create accurate diagrams/screenshots/tables, refresh contents/cross-references and export/review the final report. |
| #8 | Identify final release/deployment/model, verify complete hosted role journeys and reproducible assessor access. Existing demo and Google checks are partial evidence. OAuth branding remains a separate unresolved trust/presentation concern. |
| #9 | Assemble genuine issue/commit/branch/PR/CI/merge/deployment and sprint-review evidence; distinguish actual process from prescribed methodology. |
| #25 | Review/expand/freeze data, perform controlled scratch training and validation selection, preserve failures and reproducibility, choose a defensible final model. |
| #26 | Complete final selected scratch-model live acceptance with preprocessing/vector compatibility, version identity, full request/acceptance flow and relevant deployment tests. Current comparison preview is not final acceptance. |
| #27 | Obtain explicit graph scope decision; implement and evaluate the bounded contribution if retained, with provenance/leakage/failure/explanation limits. |
| #28 | Select authoritative master report, resolve Chapters 1 through 3 feedback, justify SMART targets, correct sources and methods, verify Kathanea citation and dependent comparison claims against original papers. |
| #29 | Agree performance boundaries and justified targets; run bounded authorized retrieval/inference/startup/full-flow benchmarks and recovery tests, retain raw errors/latencies. |
| #30 | Record actual 5 November presentation feedback, decisions and next sprint; record a mark only if genuinely received. Preparation alone cannot close it. |
| #31 | Assemble supervisor-reviewed release/report/user/technical handover, confirm deadlines/access/retention/costs, rehearse final demo, submit only when authorized, reopen exact uploaded artifacts and retain receipt/manifest. |

Closed issue numbers in this snapshot: **#1, #2, #7, #13 through #24 inclusive, #32 through #37 inclusive, #71, #75, #87 and #92**. Their closure does not satisfy downstream final-release dependencies. In particular, #1 is a student-confirmed requirements record; #23 is a policy/disclosure milestone, not completed institutional verification. Reopen a closed issue if verified findings invalidate its acceptance.

### Recommended continuation sequence

1. Preserve the working tree and read the latest local design-review records. Do not commit, push or publish the pending design until Omar grants that specific approval. If continuing visuals, show the existing local result first and request missing preferences only where necessary.
2. Confirm master report, real final deadlines/submission channel, actual 5 November feedback, supervisor graph expectation and acceptance of scope amendments. Continue independent preparation while awaiting decisions.
3. Establish the reviewed relevance protocol/data and fix scoring before spending time on a larger model. Preserve original machine labels and validation history. Confirm whether 0-to-3 pilot grades or the requirements record's 0-to-2 suggested rubric governs the next version; this inconsistency is not resolved by guessing.
4. Run controlled v2 training with train-only preprocessing and validation selection; compare random, lexical/TF-IDF, frozen MiniLM and retained graph variants as agreed. Preserve unsuccessful runs. Do not open final test results prematurely.
5. Package the selected scratch model with explicit versioned preprocessing and correct directional heads. Decide whether the final app retains side-by-side mode, changes the default, or migrates stored vectors. Obtain supervisor acceptance of that final-model behavior rather than assuming the current preview suffices.
6. Repeat final-model cold-start and complete mentorship journeys locally/CI, then on authorized hosted release. Avoid mixed vector spaces. Verify model load recovery, privacy/blocking, timeouts and profile-update invalidation.
7. Run approved usability and bounded performance work. Do not load-test shared production without authorization or invent participants/latencies/SUS scores to fill report gaps.
8. Reconcile report prose, diagrams and media with the exact final release, obtain actual reviews, then finish handover/submission logistics. The current launch film depicts an earlier source-derived illustration and should be reviewed if the assessed interface changes.

### Unresolved operational questions

- Is the Google Cloud project shown in the branding chat the one whose web client ID is configured in hosted Supabase? Compare IDs without revealing secrets. The shown project was in Testing; no settings were changed in that task. Domain verification, branding publication and hosted chooser retest were not completed. Do not replace the working callback while fixing branding.
- Which Vercel project/deployment now owns the domain and what exact source is live? Historical work mentioned two Vercel projects. Inspect current ownership/settings before changing environment variables or redeploying.
- Which report title and master are approved, and which supervisor decisions exist outside GitHub? No approval should be fabricated from a draft's confident wording.
- How long must assessor access remain available, who owns hosting/model/data accounts, and what renewals or costs are expected? These belong to final #31 logistics.
- Do final requirements retain independent semantic free-text peer search or accept the current personalised mentor recommendations plus keyword mentor search? The original traceability audit identifies that distinction.
- Is accepting/declining a mentorship request the approved interpretation of accepting/declining/deferring a recommendation? A distinct recommendation-feedback lifecycle was not established by the current request UI alone.

## 6. Technical details

### Versions and tools

`package.json` version is 0.1.0 and private; package name `alumnikonneqt`. Declared Node minimum is 20.9.0; CI uses Node 22. Use the lockfile for exact installed versions.

| Component | Current declared version or implementation |
| --- | --- |
| Next.js / eslint-config-next | 16.4.5 |
| React / React DOM | 19.2.4 |
| TypeScript / ESLint | ^5 / ^9 |
| Tailwind / PostCSS adapter | ^4 |
| Base UI | @base-ui/react ^1.6.0, with shadcn-style semantic components |
| Transformers.js | @huggingface/transformers ^4.3.0 |
| ONNX Node runtime | onnxruntime-node 1.30.0 |
| Supabase JS / SSR / CLI | ^2.110.0 / ^0.12.0 / ^2.109.0 |
| Browser testing | Playwright 1.64.1; @axe-core/playwright 4.14.0 |
| Icons / analytics | lucide-react ^1.23.0; @vercel/analytics ^2.0.1 |
| Pilot Python direct pins | torch 2.15.0, numpy 2.5.4, scikit-learn 1.9.1, matplotlib 3.11.2, nbformat 5.11.1, nbclient 0.11.0, ipykernel 7.4.0 |
| ONNX exporter | onnx 1.22.0; export requirements include pilot requirements |
| Launch-film tooling | HyperFrames 0.9.22, GSAP 3.15.0, FFmpeg and Chrome; Node 22+ |

These are project declarations, not recommendations about latest packages. Earlier chats mention Next 16.2.10 or 16.3.6; those are historical. Before writing Next.js code, read relevant **installed** guides under `node_modules/next/dist/docs/`. `AGENTS.md` explicitly warns of breaking changes. The generated Next.js instruction block is re-added by the dev server; do not repeatedly delete it.

### Structure, routes and patterns

- `app/(marketing)` serves `/`, `/about`, `/about-developer`; route-group folder names do not appear in URLs.
- `app/(auth)` serves `/login`, `/signup`, `/login/code`, `/verify-email`, `/forgot-password`, `/privacy` and the uncommitted `/arrival`.
- `app/(dashboard)` serves `/discover`, `/profile`, `/profile/photo`, `/profile/email-preferences`, `/requests`, `/admin`, with protected shared navigation/layout. There is no separate `/dashboard` landing route; `/discover` is the workspace entry.
- `app/auth/callback/route.ts` handles the app OAuth callback.
- API handlers are `/api/embed`, `/api/match`, `/api/match/compare`, `/api/notifications/process`, `/api/webhooks/resend`.
- `components/ui` holds shared controls and state presentation; `components/safety` holds blocking/reporting UI. `lib` holds validation, policies, model/runtime, theme/consent, auth and email logic plus Node regression tests.
- `lib/supabase/client.ts`, `server.ts`, `admin.ts`, `auth-fetch.ts` separate browser, request/session and privileged access. Admin credentials never enter client code.
- Server Actions use `"use server"`; database/RPC authorization supplements server checks. Next 16 uses `proxy.ts` rather than legacy `middleware.ts`. Async Next request APIs and generated route types must follow installed documentation.
- Ordinary page/rendering data uses the caller's session/RLS. Profile embeddings are written only through the server service-role path. Guard auth subject explicitly in SQL; the earlier NULL-recipient bug was fixed with null-safe checks.
- Use semantic CSS variables and existing shared components. Scoped `*.module.css` files hold landing/auth/password styling. Import aliases are configured in `tsconfig.json`.

### Matching and model contracts

`lib/embedding/embed.ts` builds normal embedding text from headline, bio, labelled skills, industry and graduation year. It loads the MiniLM extractor once per server process using a shared promise; failures clear that promise so a later request can retry. Vercel's read-only dependency path cannot host downloads, so deployed model cache uses the OS temporary directory `alumnikonneqt-transformers`. The first load requires external model availability. No external generation API or OpenAI API is used for matching.

`POST /api/embed` authenticates, loads the saved profile, validates usable input and resource guards, generates a normalized 384-value vector and persists it with trusted server credentials. Profile save and inference have explicit retry handling. Matching-input edits atomically invalidate the previous vector via the private database trigger; this is not a durable background model queue.

`POST /api/match` calls `match_mentors` using the user's stored vector. Default count ten, positive-integer cap fifty. Signed-out returns 401; absent usable stored embedding returns 422; database failure gets generic recovery guidance. PostgreSQL/pgvector uses cosine distance, converted to similarity by `1 - cosine_distance`. Keyword search uses separate English full-text ranking. Exact shared skills explain overlap only. Staff/availability/visibility/block/request-state rules must remain consistent between paths.

The comparison uses only headline, bio, skills and industry, excluding names and graduation year from inference. It selects at most fifty visible mentors in stable ID order and returns top five per model. It encodes a fresh snapshot for both models, without comparison-vector storage. Query scratch head compares only to mentor scratch head. Resource guards are three requests per user per minute and two active jobs per process; a 55-second overall deadline returns retry guidance. A native timed-out job retains its slot until it finishes. These are process-local, not distributed limits. Responses are private/no-store. Per-model rejection has its own error display; a hung task can trigger the overall timeout.

Scratch identity, preserve exactly:

```text
version: scratch-pilot-v1:1ed9ed95cc33
checkpoint SHA-256: 235d1a1a4ff0c37fd76ec9f2c99c4a3365dc136768e9757f1a3f4f6279486409
ONNX SHA-256: 1ed9ed95cc33cf63e5c3f4db020248975fdd841573b56615b197df58df3a24e7
artifact: ml/models/scratch-pilot-v1/encoder.onnx
dimensions: 64, directional query and mentor heads
input contract: 512-codepoint casefold/truncation/padding, saved vocabulary/casefold mapping
export: ONNX opset 17, dynamic batch, fixed sequence length
parity tolerance: absolute 1e-5 against PyTorch
```

Node verifies the local artifact hash and lazily loads a CPU session with one intra-operation thread. The approximately 46 KiB artifact and invented parity fixtures are committed; original training profiles and checkpoints stay private. `next.config.ts` externalizes native packages and explicitly traces model/runtime files into deployment. To revert only the experimental comparison, the documented approach restores Discover's initial `semantic` mode and removes its comparison button; stored MiniLM vectors do not require a reverse migration. Do this only if requested.

### Database and migrations

Core tables: `profiles`, `mentorship_requests`, `connections`, `audit_logs`; privacy tables `blocks`, `reports`; email tables `email_preferences`, `email_outbox`, `email_suppressions`. Role enum: `mentee`, `mentor`, `moderator`, `admin`. Request statuses: `pending`, `accepted`, `declined`, `cancelled`. The schema stores MiniLM `vector(384)` and a cosine ivfflat index. Inspect actual policies/functions before a migration; the policy document is not a schema reference for affiliation state.

Ordered migration files cover initial schema, match explainability, keyword search, request-recipient authorization, public RPC hardening, profile photos, Google signup restriction, privacy/reporting/blocking, availability, system/index hardening, email notifications, reminders and stale embeddings. `FILES.md` lists every migration. Never reset a shared database to reproduce a test. Local SQL suites use rollback transactions; fixture tools should clean only their own marked rows.

Hosted Supabase project reference: **`edxflusuysnzzbyfrpvs`**. API host: `https://edxflusuysnzzbyfrpvs.supabase.co`. Google's provider redirect is `https://edxflusuysnzzbyfrpvs.supabase.co/auth/v1/callback`; preserve this while dealing with branding. The app's callback is a different step. No secrets are necessary to state these non-secret addresses.

### Configuration and commands

Configuration names, not values: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_URL`, `EMAIL_OTP_ENABLED`, `ACCOUNT_EMAIL_ENABLED`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `EMAIL_FROM`, `EMAIL_DELIVERY_MODE`, `EMAIL_ALLOWED_DOMAINS`, `EMAIL_ALLOWED_RECIPIENTS`, `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`, `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET`, `NOTIFICATION_WORKER_SECRET`. Use `.env.example`; never prefix server credentials with `NEXT_PUBLIC_`.

The template defaults email feature flags off until numeric provider templates and limits are configured. Recorded production account-code settings are **eight digits, 600-second expiry, 60-second resend**. Check current settings rather than assuming local and hosted values match. Account mail templates live in `supabase/templates`. Sender is `AlumniKonneQt <notifications@auth.alumnikonneqt.com>` in the example. Webhook verifies provider signatures and persists normalized address-hash suppression; it does not establish a complete durable delivered/opened/clicked event history.

```sh
cd /Users/omarsiddique/alumniconnect
npm ci
npx supabase start
npm run dev

# Appropriate application verification
npm run lint
npm run typecheck
npm test
npm run build
npm run check

# Local-only functional tools, inspect guards and required configuration first
npm run smoke:local
npm run auth:check
npm run test:registration
npm run test:otp
npm run test:account-email
npm run ml:walkthrough
node scripts/run-cold-start.mjs
python3 -B -m unittest discover -s ml -p 'test_*.py'
python3 -B -m unittest discover -s ml/training_tests -v
```

`typecheck` deliberately runs `next typegen && tsc --noEmit`, because clean CI checkouts previously lacked generated image types. `npm test` uses Node type stripping and `lib/*.test.mjs`. Local app normally uses port 3000; Supabase API 54321, Studio 54323. HTTP smoke expects a freshly built local app and disposable accounts, commonly production server port 3002. Do not run destructive historical evaluation tooling against production.

CI jobs: quality checks (lint/typecheck/tests/build, Node 22), isolated database suites, isolated twelve-group cold-start Chrome journey, and Python 3.12 ML audit/training/export regression. These jobs do not use private final test data. `.github/workflows/notification-emails.yml` separately calls the production worker every five minutes with a server secret, concurrency constrained; scheduled execution time is not a strict real-time guarantee. Do not trigger a sending workflow merely to inspect it.

Dependency history matters: the optional `ts-node` tool chain was removed, the remaining minimatch path was handled with a scoped override, Python ONNX was upgraded from 1.20.1 to 1.22.0, and a static webhook-test key was replaced by a generated fixture key. #13/#71 were closed on dated verification. Do not claim the present dependency tree is vulnerability-free without a current audit.

### Private ML and demonstration access

`ml/data`, `ml/runs`, `ml/artifacts` are ignored local/private paths. Reference run: `ml/runs/scratch-verified-2026-11-02`. Colab source notebook: `ml/notebooks/scratch_pilot.ipynb`. Executed local notebook: `ml/artifacts/scratch_pilot.executed.ipynb`. Drive evidence folder recorded as `My Drive/AlumniKonneQt-ML/runs/notebook-20261102T034308433827Z`. Copy only permitted data via controlled transfer; the public repo alone is not the full reproducibility package.

Colab initially failed with NumPy `_blas_supports_fpe` after dependency installation into a live kernel. The source notebook was changed to run the hash-verified trainer in a fresh subprocess while retaining the mounted Drive/output path. Browser observation verified actual parameter updates, four epochs, checkpoint one, matching validation scores and reading saved history from Drive. Do not confuse a mount message with completed training.

The retained hosted pool consists of clearly fictional Demo Mentors Grace Wanjiku (ML/data platforms), Brian Otieno (law), Fatima Noor (product), David Kimani (cloud), Esther Mwangi (finance/leadership), plus Demo Mentee Career Explorer. These are invented fixtures, not participant identities. `scripts/hosted-demo.mjs` defaults to dry plan and requires explicit apply/phase flags, targets the identified project, refuses unmarked collisions and stores private generated access in the ignored 0600 file. An accepted demo relationship with Grace was retained. This is authorized demonstration history, not general permission to reseed production today.

Individual hosted comparison observations were 1,048 ms MiniLM and 137 ms scratch with a 4,431 ms complete request; a later personal-account browser observation reported 728 ms and 84 ms. They are different single runs, not load results or proof that scratch has better relevance.

## 7. Style and preferences

### Working relationship and reporting

Omar wants the assistant to do authorized work, keep useful progress updates and avoid repeatedly asking for permission already granted. Use plain, non-technical language in ordinary collaboration, explain technical concepts patiently when relevant, and separate what changed, why, verification and remaining limits. Be candid when a visual idea is unsuitable; Omar explicitly invited that judgment during cursor-size discussions.

For substantial project work, inspect live relevant open and closed issues first, tell Omar the issue numbers and scope, then maintain progress/evidence/checkboxes without asking again. Standing permission covers issue maintenance, justified closure/reopening and linked follow-ups within scope. It does **not** cover pushes, merges, deployments, production mutations or messages to others. Keep partial issues open. Never present local, CI, merged, deployed and human evidence as interchangeable.

Use focused Gitmoji-prefixed conventional commits, for example `✨ feat: ...`, `🐛 fix: ...`, `♻️ refactor: ...`, `📝 docs: ...`. Commit completed verified logical milestones, stage explicit relevant files, inspect the staged diff, preserve unrelated work and do not pad history, backdate, fabricate activity, create empty commits or rewrite history. **Do not push unless the current task explicitly authorizes it.** The pending visual experiment has a more specific no-commit restriction that overrides ordinary milestone committing for that work.

A new untracked `CLAUDE.md` appeared during packaging and was read without modification. It additionally prohibits Claude-Session links and generated-by footers or other AI attribution in commit messages, PR titles and PR descriptions. Preserve this file as user-owned work.

Use the configured human author. Do not add AI/Codex/Claude attribution or Co-Authored-By trailers to Omar's commits or teammate prompts. Academic declarations must still disclose material assistance accurately when required by the assessment; commit-attribution preferences do not authorize false declarations.

No em dash or double-hyphen punctuation in prose, UI text, docs, commits, PRs or issue comments. Preserve required syntax such as CSS custom properties, command flags and SQL comments. Do not introduce speculative warnings, invented approvals or unnecessary confirmation flows.

### Visual and content preferences

- Brand bases are Crimson `#ED1C24`, Cod Gray `#0D0D0D`, White `#FFFFFF`; derive interface shades using existing tokens. Red is a priority/identity accent, not every surface or every status.
- Pure Crimson on white was measured at 4.38:1; existing accessible small-text/action treatment mixes Crimson with 12% Cod Gray. Preserve contrast and visible focus while refining visuals.
- Geist remains the interface/display family. Use legible form labels, predictable navigation, roughly 44px targets, reduced-motion handling and narrow-screen layouts without page overflow.
- Do not use green as a competing brand color or fabricate success from color alone. Text and icons identify state.
- The most recent local visual choices are concentric corners, calmer typography, lighter borders, useful empty states, generated day/night cloud scenes and window/boarding-pass auth animation. These override conflicting square/opaque-only PRODUCT.md instructions for this local direction, but retain brand, truthfulness, accessibility and functional contracts.
- Preserve original logo assets. Keep prototype/non-endorsement disclosures. Do not invent affiliation verification, real member testimonials, model quality percentages or unsupported product capabilities.
- Show local visual work before committing/publishing when that is the user's scope. Existing local preview URLs and temporary screenshots are historical; do not assume a server or side panel is still open.
- Never reintroduce the rejected cursor trail. The intentionally fictional SFO/JFK boarding pass belongs to the original Window Seat study; the actual product arrival must remain clearly an app-entry metaphor, not a booking claim.

## 8. Key outputs and exact values to retain

### Main deliverables

| Output | Purpose and current limitation |
| --- | --- |
| Full-stack AlumniKonneQt app | Working prototype with auth, profiles, matching, requests/connections, staff/privacy/availability and email features. Final assessed release remains open. |
| `docs/proposal-traceability.md` | Approved-proposal objectives, requirement mapping, architecture deviations, research gaps and supervisor decisions; several dated rows are historical and need reconciliation. |
| `docs/project-checklist.md`, `docs/sprint-review-readiness.md` | Early checklist/readiness and dated evidence trail. Live GitHub is the operational checklist; do not take old unchecked deployment rows as current absence. |
| `docs/ml-system-guide.md`, `scripts/ml-walkthrough.mjs` | Explain actual profile-to-embedding-to-pgvector flow; executable walkthrough imports production inference and demonstrates dimensions/norms/cosine ranking. Personal understanding still needs genuine demonstration. |
| ML audit/preparation suite | Source/bundle integrity, leakage/label/schema checks, independent machine-pilot derivation and tests. Privacy-pattern scans are triage, not privacy approval. |
| Scratch trainer/notebook | Random-init model, TF-IDF comparison, actual optimizer/checkpoint evidence, local/Colab reproduction and private run artifacts. Machine labels and tiny validation remain limitations. |
| Scratch ONNX bundle | `encoder.onnx`, `manifest.json`, `parity.json`; real trained weights plus preprocessing/version/parity contract for the experimental app comparison. |
| `docs/live-model-comparison.md` | Same-pool serving contract, resource/failure behavior, local verification and limits; its pending-hosted wording must be read with later hosted-demo evidence. |
| `docs/eval-results.md` | Original historical synthetic retrieval figures and limitations. Preserve the negative comparison result. |
| `docs/report-chapter-5.md` and external Word draft | Evidence-bounded implementation/testing/evaluation chapter with tables. Not a complete reviewed final dissertation; Word and Markdown freshness differ. |
| Requirement, scope and membership records | `scratch-model-requirements.md`, `scope-decision-jobs-cohorts-events.md`, `membership-verification-policy.md`; student/project decisions with explicit supervisor/implementation boundaries. |
| Sprint presentation runbook | `docs/sprint-presentation-2026-11-05.md`; planned narrative/demo/rehearsal and review questions, not proof of attendance or feedback. |
| Verification records | `docs/environment-verification.md`, `docs/verification/*`, cold-start raw JSON and sanitized screenshots; dated evidence by scenario/environment. |
| Resend runbook | `docs/verification/resend-delivery.md`; separate account/application mail, credentials/DNS guidance, delivery/retry/webhook/suppression and actual controlled release evidence, especially sections 12 and 14. |
| Hosted-demo utility and record | `scripts/hosted-demo.mjs`, `docs/verification/hosted-demo.md`; guarded fixture reproduction and precise distinctions between local bootstrap, hosted HTTP inference and browser observations. |
| Launch film | `brag-output/brag.mp4`, poster, share copy, editable composition and verification. 25-second illustrative source-derived launch video, local commit only. |
| Standalone Window Seat | `previews/window-seat/`: HTML/compiled Tailwind/vanilla JS study, fictional SFO to JFK/Seat 23A, window/cloud/lock/morph/fly-in interactions, local only. |
| Local app visual integration | Modified auth, landing and shared components; untracked arrival route/night asset/tests; audit/review documents/screenshots in `previews/system-audit`. Not yet committed/published or finally approved. |
| This transfer package | Nine requested handover sections, detailed issue criteria, source chat index, described project/local file list and exhaustive physical-file TSV. It supports #31/#9 without closing them. |

### Exact strings, figures and media contracts

Preserve the approved identity `AlumniKonneQt`, domain `alumnikonneqt.com`, original proposal title above, model IDs/hashes, all reported sample sizes, negative findings and metric precision. Do not round the pilot into a general accuracy statement. Similarity and exact overlap must retain their different meanings.

Launch media: **1920 by 1080, H.264, 30 fps, 750 frames, exactly 25 seconds, AAC audio**, no narration. The poster is the settled opening at two seconds and is baked into frame zero without changing frame count/audio. Verification records zero lint/runtime/layout/contrast/audio errors and 52 passing sampled text-contrast checks. Mean audio -26.3 dB, maximum -5.8 dB, no measured clipping. Two reviewed craft warnings concern aggregate card reading time and a deliberate discovery hold; audio reactivity was omitted because its helper lacked NumPy. These are documented limitations, not a reason to invent a perfect validation record.

Exact saved share caption:

```text
Introducing AlumniKonneQt: shared experience, new horizons. An independent academic prototype for discovering Mentors, exploring common ground and starting a mentorship conversation.
https://alumnikonneqt.com

Music: Sascha Ende, ende.app (CC BY 4.0).
```

Music is Happy Beats / Business Moves Vol. 1 by Sascha Ende, edited with fades/reduced gain, CC BY 4.0. Kenney effects are CC0. The existing collaboration image is licensed Unsplash stock, not an actual member photo. Preserve the licenses/credits in source, film and share copy. GSAP's copied runtime contains its license notice.

```text
brag.mp4 SHA-256: c4905bb7fadc9a78d3701b69a3b79be1435defe0eb642ca7272efab29235c7d8
brag.jpg SHA-256: 6d8c98f327c13d0a8f83ff887c03c9a52f7a9e7c73faead17b91f0f7f61718ef
```

Standalone motion values: seamless cloud loop 24 seconds, fly-into-window 1.2 seconds, sky dissolve 280 ms, button-to-ticket expansion 820 ms, outgoing form fade first 240 ms, ticket details start 460 ms and rise 16px. Reduced motion bypasses these. Standalone desktop 48px card radius minus 32px padding and phone 40px minus 24px both give 16px inner controls. App tokens differ as described above; preserve the geometric rule **inner radius equals outer radius minus padding**.

### Known stale passages that need reconciliation

- `ml/README.md` says no training/Colab happened. Later pilot records and actual artifacts supersede that status.
- `docs/ml-next-steps.md` describes a pre-training sequence. Useful human-review guidance remains, but notebook/training/integration now exist.
- `docs/ml-pilot-training.md` has earlier unchecked export/integration rows; later ONNX/comparison and hosted-demo evidence supersede them for the engineering preview.
- `docs/live-model-comparison.md` says hosted acceptance remains; subsequent hosted demo demonstrates bounded inference/requests, while final-model acceptance still remains.
- `docs/report-chapter-5.md` retains stale references to absent scratch integration and pending account-email acceptance despite later releases. Reconcile by date and evidence, not by deleting limitations wholesale.
- `PRODUCT.md` describes square opaque-only styling; the explicit 8 November local direction permits the new rounded/cloud/glass design under its no-commit scope.
- The membership policy's proposed affiliation fields/gates and taxonomy language in requirements/scope records are not proof of deployed affiliation/graph functionality.
- Older traceability/README/readiness rows saying no hosted app or no expanded CI exist are historical, not current findings.

## 9. Files

The complete one-line descriptions are in **`FILES.md`**, which is an integral part of this brief. It enumerates every project-owned and local-artifact file found outside generated runtime/dependency/Git/bytecode trees, including tracked source, modified files, untracked previews and ignored private ML artifacts. Private files are named and described without contents. `ISSUE-REGISTER.md` supplies every inspected issue's live state and acceptance text. `CHAT-INDEX.md` identifies all relevant available project chats used.

For a literal inventory of **every physical file**, including installed packages, `.next`, `.git` and Python bytecode, use the transfer folder's **`ALL-FILES.tsv`**. It provides relative path, byte size, category and one-line description. Generated dependency/internal files are described by their package/path role; their behavior was not individually audited. Source and binary files are inventoried, not all reproduced inside this document.

The inventories are snapshots, not a portable copy of application dependencies, private credentials, media or training data. Transfer the actual permitted project files separately, keep secrets/signed material in controlled channels and recreate installed dependencies from lockfiles. A recipient who receives only this brief cannot authenticate to services or reproduce private-data experiments without the separately authorized inputs.

The immediately safe restart is to inspect the current working tree, read the local design review and the relevant live issue, retain the local-only restriction, then continue the selected task with its own verification and evidence boundary.
