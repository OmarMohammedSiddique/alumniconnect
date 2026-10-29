# AlumniConnect conversation worklog and handoff

Prepared: 29 October 2026. Coverage: the work discussed and performed in this
chat through commit `e1c604c`, including the earlier design, checkpoint and QoL
milestones. This is a historical work record, not a new test run or a claim that
the whole capstone is complete.

Evidence was reconciled against the conversation, current source, commit history
and the linked verification documents. Existing work checkpointed in this chat
and changes made by parallel sessions are distinguished below. No credentials,
private account details, raw conversation exports or test-user identifiers are
included.

## 1. Current outcome

AlumniConnect now has a coherent public and authenticated interface, seven form
and workflow QoL improvements, guided first-time profile setup, a verified
controlled local mentorship journey, and a reproducible synthetic-data audit.
A request-response authorization defect found during testing was fixed.

The application still uses frozen pretrained MiniLM inference. No project-specific
training, final held-out comparison, hosted acceptance or representative-user
usability study was completed. The new experiment protocol is a draft.

At the start of this documentation task, `main` and `origin/main` both pointed to
`e1c604c`; the working tree and index were clean. Successful pushes had already
included the UI, QoL, security, onboarding and two latest ML milestones. This
document is a separate local documentation milestone; no push is authorized by
the request to write it.

The final product direction is recorded in [PRODUCT.md](../PRODUCT.md).
The active capstone board is [project-checklist.md](project-checklist.md), with
broader evidence in [sprint-review-readiness.md](sprint-review-readiness.md).

## 2. Startup and public-page improvements

- Started the Next.js development server and verified an HTTP 200 response at
  local port 3000. Next.js regenerated its agent-instruction block during startup.
- Reworked the initially sparse front page into a complete mentorship-oriented
  landing page: navigation, mentor preview, onboarding explanation, distinct
  Mentor/Mentee invitations, working signup links and expandable FAQs.
- Checked desktop and narrow mobile presentation. The initial violet treatment
  was later replaced by the requested airline-inspired palette.
- Added a visible Back to home route from both login and signup, so users no
  longer need browser Back navigation to return to the landing page.
- Unified previously separate landing and product palettes through shared tokens.
  Build troubleshooting included a local Turbopack/cache issue; a subsequent
  production build passed. Early offline Supabase findings limited auth testing
  at that time and were not treated as authentication-code defects.

These early public-page/home-link changes were retained in the later cohesive
visual-system commit rather than committed as duplicate milestones.

## 3. Cohesive product design system

Commit `3455d3a` established the shared system after reviewing existing diffs and
preserving the useful landing-page, home-link, palette and profile-completion work.
The commit also includes earlier existing UI changes; it should not be read as
proof that every line in its diff was first authored during the redesign step.

### Product and brand decisions

- Kept AlumniConnect visibly independent and academic, inspired by Kenya Airways
  without an official logo, promotional aircraft imagery or endorsement claims.
- Kept Geist rather than obtaining proprietary display fonts.
- Used brand-reference red `#ED1C24` selectively, deeper accessible action red
  `#C1171E`, ink `#0D0D0D`, supporting gray `#545352`, white, light gray `#EBEBEB`
  and soft surface `#F8F7F7`.
- Centralized reusable color, typography, spacing, radius, shadow, focus and motion
  treatment through the existing Tailwind/shadcn token architecture.
- Made the authenticated product quieter than the more expressive landing page.
  `/discover` remains the authenticated entry point; no fictional dashboard route
  or new booking-style functionality was created.

### Surfaces brought into the system

Marketing layout and utility panel; auth layout and forms; responsive workspace
navigation; discovery/search modes and Mentor cards; profile and completion
states; requests/connections; shared buttons, inputs, cards, badges, selects,
empty/loading states, notices, page headings and error recovery.

Existing routes, Supabase integration, matching behavior and form actions were
preserved during the visual task. No database or ML implementation changes were
used to achieve the redesign. Impeccable guided the interface work, and the
relevant installed Next.js 16 documentation was consulted before Next.js edits.

### Material direction changed during the conversation

`105aac7` implemented the specifically requested restrained liquid-glass exception
on elevated navigation, the landing utility panel, mobile navigation, dropdowns
and one compact quick-action surface. It used shared tokens, solid fallbacks
and restrained highlights; ordinary cards/forms stayed solid.

The later user preference explicitly superseded that treatment. `021e2af`:

- Set the shared radius to zero for square controls, cards and panels.
- Replaced active glass/translucency with opaque surfaces and clear borders.
- Strengthened dark navigation and neutral contrast.
- Kept red primary and reserved supporting Kenyan green `#006B3F` for meaningful
  success/accepted-connection states. Green is an AlumniConnect supporting token,
  not a verified official airline specification.
- Updated PRODUCT.md so future work follows the square, opaque direction.

The earlier glass commit is legitimate historical work, not the current style.
Dark-mode and reduced-motion tokens/source were reviewed, but live emulation was
not comprehensively exercised. Do not turn source checks into browser proof.

## 4. Git checkpoint and permanent working conventions

The requested checkpoint snapshot differed from the actual checkout: the UI and
glass work had already been committed. No duplicate UI commit was fabricated.

Created `codex/checkpoint-design-and-documentation` from the current main commit,
preserved index/working-tree contents, then used `git restore --staged .` only to
unstage. All 90 initial file hashes matched after that transition. The checkpoint
produced three supported logical commits:

| Commit | What was checkpointed |
| --- | --- |
| `28c005d` | Durable AGENTS.md repository conventions |
| `633b292` | Existing ML explanation, Colab guide, walkthrough script and package command |
| `81fab56` | Capstone traceability, project checklist, readiness and environment evidence |

Parallel-session commits `e4a4b9f` and `f619f74` were preserved, including newer
evidence. Related ML source-intake work `75ea756` was also retained. Their presence
in this branch does not make them newly authored checkpoint work in this chat.
The checkpoint was initially left unpushed, then later fast-forwarded into main
and pushed when explicitly requested.

AGENTS.md now requires a verified logical milestone commit before moving on,
Gitmoji-prefixed conventional messages, explicit file/hunk staging, staged-diff
review, appropriate verification and preservation of unrelated work. It forbids
broken/empty/padded/backdated commits and unsolicited pushes. Existing history
was not rewritten to manufacture activity.

The user-reported local signup/logout/login/data-persistence result was recorded
as manual local evidence, excluding automated E2E, database-restart persistence
and hosted verification. This boundary was kept even after later independent
browser observations became available.

## 5. Name formatting and all seven QoL items

The original name-formatting fix, `3746a5f`, trims/collapses whitespace and
capitalizes initials at name/space/hyphen/apostrophe boundaries on signup and
profile save, while preserving intentional internal casing. Existing accounts
apply the formatting when their profile is saved; no bulk data rewrite occurred.

The subsequent seven-item list is separate from the later three-item roadmap:

| Item | Delivered behavior | Commit | Main implementation anchors |
| --- | --- | --- | --- |
| 1. Skills cleanup | Case-insensitive deduplication, normalized whitespace, original spelling retained, unique count, clear error above 20 rather than silent truncation | `45fb13b` | `lib/profile-skills.ts`, profile action/form, skills tests |
| 2. Saved/unsaved feedback | Editing shows Unsaved changes; reverting clears it; saved feedback tracks the version actually saved | `12df269` | Profile form |
| 3. Immediate formatted name | Successful save updates the displayed name while preserving newer edits made during the request | `4ebf4cd` | Profile action/form |
| 4. Password visibility | Shared accessible Show/Hide control on login/signup, hidden by default, preserves input and does not submit the form | `e922e0c` | `components/ui/password-input.tsx`, auth forms |
| 5. Retry match update | Retry without resaving; uses last saved fields, preserves drafts, prevents duplicate retries and handles overlapping updates | `e8235ba` | `lib/profile-match-update.ts`, profile form and tests |
| 6. Request-action feedback | Clear Cancel/Accept/Decline errors, shared pending protection, stale cancellation detected, retryable accessible feedback | `62c6813` | Request actions/UI, `lib/mentorship-request.ts` and tests |
| 7. Counts and guidance | Live counts, accessible limit guidance, year help and shared client/server limits | `03cbb69` | `components/ui/field-guidance.tsx`, `lib/form-limits.ts`, profile/request forms/actions |

The shared limits are 120 headline characters, 2,000 bio characters and 500
introduction characters. The milestone checks grew from four name tests to ten
name/skills tests, fifteen with match-update tests, and finally 26 with request
tests. The character-guidance step also passed 12 rendered boundary checks.

Browser proof varied by milestone: saved/unsaved behavior and password controls
were observed locally; immediate name-display verification was interrupted.
Retry failures were first tested with mocked responses, and request/character
feedback was not initially browser-verified. Later controlled browser evidence
adds specific coverage without retroactively establishing every pending/error
scenario or a real service outage.

## 6. Later roadmap, task 1: verify the mentorship journey

The later recommendation list contained exactly three tasks:

1. Verify the complete mentorship journey, including permissions and recovery.
2. Improve first-time onboarding and the path to first value.
3. Advance ML protocol, label/leakage evidence and reproducible experiments.

There was no fourth task in this list. The requested task 4 was clarified rather
than invented. Earlier QoL item 4 was a different list and was already complete.

### Local workflow and security result, 28 October

Resumed the existing Docker/local Supabase services without resetting databases
or the unrelated SkillSwap stack. Checked that app URL/keys matched the local
instance without exposing their values. Confirmed anonymous profile reads were
correctly denied; permission error 42501 was not an invalid-key diagnosis.

Testing exposed a real authorization defect: `respond_to_request` used a nullable
comparison with `auth.uid()`. An anonymous caller with a known pending request ID
could bypass that rejection. `f8fb640` added an explicit authentication check,
null-safe recipient comparison and revoked PUBLIC/anonymous execution. The
expanded rollback-only SQL tests now use actual known request IDs.

Migration `20261028000001_request_response_auth.sql` was applied locally only.
Earlier migrations were not rewritten. The old visual-task no-schema-change
boundary was respected; this was a separately scoped, later security milestone.
No hosted migration application is claimed.

`1225caa` added `npm run smoke:local` and the reproducible HTTP runner. It exercises
actual Next.js Server Actions using the installed action encoder/build manifest,
real local embedding/matching APIs, RLS/session calls and scoped database checks.

The 12-check run covered unauthorized access, invalid signup roles, signup/profile
formatting, empty-profile recovery, stored normalized 384-value vectors, invalid
year handling, semantic/keyword discovery, hidden-Mentor exclusion, protected
profile columns, duplicate/stale requests, response permissions, acceptance,
connection creation, decline/cancel and logout/login persistence.

Four disposable accounts and dependent rows were removed and cleanup checked.
Normal auth/audit events can remain. The browser bridge failed on 28 October,
including after a reset, so that run proved server/API/database behavior only.
The original harness's wrong keyword argument was corrected as a test error,
not misreported as an application bug.

## 7. Later roadmap, task 2: first-time onboarding

`ff7e26d` delivered:

- Clear audience wording without a claim of employment/affiliation verification.
- Native Mentor/Mentee radio choices, descriptive role copy, keyboard access,
  existing Mentee default and role-specific next-step guidance.
- A role-aware first-time profile guide with real account/save/matching stages.
- Headline and skills before optional context; detailed completeness initially
  collapsed for new users. Reaching 100% is not required to start.
- Ready actions after a successful match update: Mentees discover Mentors;
  Mentors view requests. Loading/failure states do not falsely claim readiness.
- Draft-aware recovery text, an optional Explore first route, different missing-
  profile and genuine no-results states, and keyword exploration before setup.
- Returning profiles skip first-time setup. A boolean readiness flag is sent to
  the client rather than serializing the stored embedding for the guide.

The existing single-role model, auth actions, fields, Supabase data flow and ML
logic remain intact. No affiliation fields, membership verification gate or
Google OAuth were implemented. The unconfirmed eligibility-group choice was
left open rather than encoded as a new product rule.

### Independent local browser evidence, 29 October

Chrome Incognito worked on this date. Using two disposable accounts, observed
both roles signing up, a minimal headline/skills save triggering automatic real
embedding, and a ready state at 50% completeness. A name-only save produced a
real 422 failure; retry preserved an unsaved headline; saving career details
recovered. This was invalid-input recovery, not a simulated service outage.

The Mentee discovered the controlled Mentor, sent an introduction, the Mentor
accepted it, and the Mentee saw the connection after logging in again. Database
checks agreed on roles, fields, finite normalized vectors and one accepted
request/connection. Returning setup was absent. Desktop and 320 × 844 signup
layout plus native keyboard role selection/form traversal were checked. Narrow
mobile inspection was visual, not completion of the entire journey on mobile.

The expanded HTTP runner passed 13 checks. Both browser accounts, the runner's
four accounts and their dependent rows were removed; the temporary browser
credential file was deleted and the logged-out private window closed. No real
account was changed during this controlled acceptance run.

Full dated results and boundaries: [environment-verification.md](environment-verification.md).

## 8. Later roadmap, task 3: ML evidence and experiment preparation

The existing pipeline remains `Xenova/all-MiniLM-L6-v2`, q8 feature extraction,
mean pooling, normalization and 384-value vectors, followed by pgvector cosine
ranking. Saving a profile calculates a vector; it does not update model weights.
The checkpointed guide and walkthrough explain this distinction and the exact
implemented pipeline without requiring Supabase for the walkthrough.

The historical domain-based comparison remains unchanged: recorded semantic-full
P@1 0.833 versus keyword+category 0.917. These are historical synthetic proxy-task
results with known rank/judgment issues, not proof of semantic superiority or
real mentorship suitability. The old evaluation runner was not rerun for the audit.

### Audit milestone

`d18ce0a` introduced a standard-library-only read-only Python audit, 15 regression
tests, sanitized findings and ignore rules for private data/runs/artifacts and
Python caches. It parses fenced JSONL, validates schema/types/IDs/references,
checks duplicate/conflicting pairs and split/role consistency, triages duplicate
text, traverses pairing components and reports review/coverage gaps. Output
directories must be new; source-hash mismatches and overwrites are rejected.

The original private Gemini export was preserved and its recorded hash matched.
Observed findings:

| Finding | Evidence and implication |
| --- | --- |
| Training only | 60 profiles: 40 Mentors, 20 Mentees; 60 pairs; no validation/test records |
| Labels await review | All 60 are machine-generated, not independently human-approved |
| Sparse judgments | 60 of 800 possible training-pool pairs judged; 740 unknown pairs cannot become negatives |
| Corrected generator assertion | Three unused Mentors, not the source prose's claimed six; heading claimed 59 pairs but records contain 60 |
| Metadata shortcut | Ambiguity true for all 22 grades 1/2; false for all 38 grades 0/3; exclude it from features |
| People are connected | Graph components contain 28, 16, 9, 4, 1, 1, 1 people; random pair splitting would reuse people |
| Limited duplicate triage | Zero normalized duplicate pairs and zero token-Jaccard candidates at 0.65; this does not clear conceptual paraphrases/templates |

A separate direct parse/graph calculation checked important counts independently.
Repeated audit output matched; the original source hash was unchanged. The CLI
returned 2 by design: audit completed, research-readiness blockers remain. No
private source transcript, profiles or generated audit output were committed.

### Draft protocol milestone

`e1c604c` added [ml-experiment-protocol.md](ml-experiment-protocol.md), draft v0.1,
and updated the delivery/checklist evidence. It proposes the task and ordinal
rubric, allowed input fields, person/template separation, complete bounded
candidate judgments, baselines, macro nDCG@5 and secondary metrics, rank/empty/
failure rules, train-only preprocessing, raw outputs and versioned run evidence.

Course permission for pretrained initialization remains unanswered. Fine-tuning
and scratch training are alternatives requiring a decision, not implemented
routes. No new training dependencies, notebook execution, model fitting, corpus
re-embedding, new dataset generation or production model swap occurred. M1 and
M2 remain partial; M3 through M7 are not marked complete.

Evidence: [ml-data-audit.md](ml-data-audit.md), [ml/README.md](../ml/README.md),
[ml-delivery-plan.md](ml-delivery-plan.md),
[ml-source-intake.md](ml-source-intake.md),
[ML guide](ml-system-guide.md) and [provisional Colab guide](colab-training-workflow.md).

## 9. Verification record and its limits

These are recorded historical results, not commands rerun just to write this file.

| Command/check | Recorded result | What it establishes |
| --- | --- | --- |
| `npm run lint` | Exit 0 across completed implementation milestones, including the latest ML audit | Static lint only |
| `npm run typecheck` | Exit 0 for implementation milestones | Type checking |
| `npm run build` | Exit 0; Next.js 16.3.6, 12/12 static pages in recorded builds | Local production compilation, not hosted acceptance |
| `npm run check` | Exit 0, including 28/29 October workflow/onboarding work | Lint, typecheck and build; no browser or SQL coverage implied |
| `npm run ml:walkthrough` | Exit 0 during checkpoint; four finite 384-value vectors with norms near 1 | Frozen local inference sanity, not training or compatibility evaluation |
| `node --check scripts/ml-walkthrough.mjs` | Exit 0 | Script syntax |
| `node --experimental-strip-types --test lib/profile-name.test.mjs lib/profile-skills.test.mjs lib/profile-match-update.test.mjs lib/mentorship-request.test.mjs` | 26 passed, zero failed at final implementation checks | Unit/mocked behavior; existing module-type warning retained |
| `npm run smoke:local` | 12 passed on 28 October; fixture cleanup passed | Real local HTTP/actions/API/database journey |
| `SMOKE_APP_URL=http://localhost:3003 npm run smoke:local` | 13 passed on 29 October; fixture cleanup passed | Expanded current onboarding HTTP checks, still not browser automation |
| `docker exec -i supabase_db_alumniconnect psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/rls_tests.sql` | ALL RLS TESTS PASSED, then ROLLBACK | Local SQL permissions and request-response regression tests |
| `python3 -B -m unittest discover -s ml -p 'test_*.py' -v` | 15 passed, exit 0 | Audit corruption/leakage/immutability tests |
| `python3 -B ml/audit_export.py <private-source> --expected-sha256 <recorded-hash> --output-dir <new-private-directory>` | Exit 2, expected blockers recorded | Successful read-only audit; explicitly not readiness approval |
| Diff/staged hygiene checks | Exit 0 for completed milestones | Scoped changes, whitespace, no newly introduced em dashes/secrets/generated output in reviewed changes |

Visual checks included Safari/Chrome, landing/auth/discovery/profile/requests/
connections, mobile/tablet/desktop widths from 320px to 1920px across the design
work, keyboard navigation/focus and 18 calculated text-contrast pairs. Deeper-red
white text measured 6.16:1. These checks are not a blanket WCAG certification.
The older glass material's contrast results are historical, not the final material.

Checks were not broadened into claims about untested live dark mode, reduced-
motion emulation, forced error boundaries, outages, slow pending states, load,
Supabase restart persistence, hosted services or representative-user SUS.

## 10. Remaining work and decisions

- Confirm the model-initialization requirement, rubric and experiment comparisons.
- Perform privacy, human label and conceptual-template review; create independent
  validation/test pools, complete judgments and freeze exact manifests.
- Build and reproduce a baseline/notebook before training, retain real run logs,
  validate metric edge cases, then perform a locked held-out comparison.
- Automate the browser journey and test deliberate service outages/slow feedback,
  broader browser/mobile coverage and database-restart persistence.
- Verify any hosted configuration/migration application only when authorized;
  this chat did not deploy, create a PR or change GitHub Issues/project boards.
- Confirm institutional eligibility and terminology with the supervisor. No
  affiliation onboarding, verification schema or Google OAuth was added.
- Complete actual Chapter 4/5 artifacts, representative-user evaluation and
  retained supporting scope such as jobs/cohorts/events or approved amendments.
- Dependency alerts were reported by GitHub during pushes. No dependency-remediation
  work or claim that those alerts were resolved is included in this chat.

## 11. Commit and file inventory

For this documentation-only task, commit messages/dates and every file list below
were checked programmatically against Git. Local Markdown links resolve; all
seven QoL items are present; no em dashes, account email addresses or credential
patterns were found in this document. Whitespace/staged-diff checks were performed
before its documentation commit. No application tests, model inference, database
operations or new runtime acceptance tests were needed or claimed for writing it.

The ledger below is generated from repository history through `e1c604c`, using
Git's recorded dates. It includes relevant parallel-session commits so another
developer can follow the final state without falsely attributing all work here.
Commit hashes identify durable diffs; path lists identify every file in each
milestone, including files that already contained earlier work.

Attribution key: **Chat** = implemented in this conversation; **Checkpoint** =
existing work inspected/preserved/committed here; **Parallel** = related work
from another session preserved rather than recreated. Later edits to shared
documents are owned by their corresponding later milestone.

### 2026-10-15 · `3455d3a`

✨ feat: establish cohesive AlumniConnect visual system

Attribution: Chat.

Files:

- `PRODUCT.md`
- `app/(auth)/layout.tsx`
- `app/(auth)/login/login-form.tsx`
- `app/(auth)/login/page.tsx`
- `app/(auth)/signup/signup-form.tsx`
- `app/(dashboard)/dashboard-navigation.tsx`
- `app/(dashboard)/discover/discover-client.tsx`
- `app/(dashboard)/discover/mentor-card.tsx`
- `app/(dashboard)/discover/page.tsx`
- `app/(dashboard)/discover/request-button.tsx`
- `app/(dashboard)/error.tsx`
- `app/(dashboard)/layout.tsx`
- `app/(dashboard)/loading.tsx`
- `app/(dashboard)/profile/page.tsx`
- `app/(dashboard)/profile/profile-form.tsx`
- `app/(dashboard)/requests/page.tsx`
- `app/(marketing)/landing.module.css`
- `app/(marketing)/layout.tsx`
- `app/(marketing)/page.tsx`
- `app/globals.css`
- `app/layout.tsx`
- `components/animations/stagger-reveal.tsx`
- `components/brand.tsx`
- `components/quick-actions.tsx`
- `components/three/dot-grid.tsx`
- `components/three/site-background.tsx`
- `components/ui/badge.tsx`
- `components/ui/button.tsx`
- `components/ui/card.tsx`
- `components/ui/empty-state.tsx`
- `components/ui/input.tsx`
- `components/ui/loading-state.tsx`
- `components/ui/page-heading.tsx`
- `components/ui/select.tsx`
- `components/ui/status-message.tsx`

### 2026-10-15 · `105aac7`

✨ feat: add restrained glass to elevated interface surfaces

Attribution: Chat.

Files:

- `PRODUCT.md`
- `app/(dashboard)/dashboard-navigation.tsx`
- `app/(marketing)/landing.module.css`
- `app/(marketing)/page.tsx`
- `app/globals.css`
- `components/quick-actions.tsx`
- `components/ui/select.tsx`

### 2026-10-15 · `28c005d`

🔧 chore: add Codex project conventions

Attribution: Chat.

Files:

- `AGENTS.md`

### 2026-10-15 · `e4a4b9f`

📝 docs: record sprint readiness and profile persistence evidence

Attribution: Parallel.

Files:

- `docs/environment-verification.md`
- `docs/sprint-review-readiness.md`

### 2026-10-15 · `633b292`

📝 docs: document the ML workflow and walkthrough

Attribution: Checkpoint, with scoped evidence updates.

Files:

- `docs/colab-training-workflow.md`
- `docs/ml-system-guide.md`
- `package.json`
- `scripts/ml-walkthrough.mjs`

### 2026-10-15 · `f619f74`

📝 docs: plan ML data audit training and delivery milestones

Attribution: Parallel.

Files:

- `docs/ml-delivery-plan.md`

### 2026-10-15 · `81fab56`

📝 docs: add capstone traceability and readiness tracking

Attribution: Checkpoint, with scoped evidence updates.

Files:

- `docs/environment-verification.md`
- `docs/project-checklist.md`
- `docs/proposal-traceability.md`
- `docs/sprint-review-readiness.md`

### 2026-10-15 · `3746a5f`

🐛 fix: capitalize names on signup and profile save

Attribution: Chat.

Files:

- `app/(auth)/actions.ts`
- `app/(dashboard)/profile/actions.ts`
- `lib/profile-name.test.mjs`
- `lib/profile-name.ts`

### 2026-10-15 · `75ea756`

📝 docs: specify ML tools and inventory synthetic training export

Attribution: Parallel.

Files:

- `docs/ml-delivery-plan.md`
- `docs/ml-source-intake.md`

### 2026-10-15 · `45fb13b`

🐛 fix: deduplicate profile skills and enforce the limit

Attribution: Chat.

Files:

- `app/(dashboard)/profile/actions.ts`
- `app/(dashboard)/profile/profile-form.tsx`
- `lib/profile-skills.test.mjs`
- `lib/profile-skills.ts`

### 2026-10-15 · `12df269`

🐛 fix: keep profile save feedback in sync with edits

Attribution: Chat.

Files:

- `app/(dashboard)/profile/profile-form.tsx`

### 2026-10-15 · `4ebf4cd`

🐛 fix: show the formatted profile name after saving

Attribution: Chat.

Files:

- `app/(dashboard)/profile/actions.ts`
- `app/(dashboard)/profile/profile-form.tsx`

### 2026-10-15 · `e922e0c`

✨ feat: add accessible password visibility controls

Attribution: Chat.

Files:

- `app/(auth)/login/login-form.tsx`
- `app/(auth)/signup/signup-form.tsx`
- `components/ui/password-input.tsx`

### 2026-10-15 · `e8235ba`

🐛 fix: retry match profile updates without resaving

Attribution: Chat.

Files:

- `app/(dashboard)/profile/profile-form.tsx`
- `lib/profile-match-update.test.mjs`
- `lib/profile-match-update.ts`

### 2026-10-15 · `62c6813`

🐛 fix: handle mentorship request failures and pending actions

Attribution: Chat.

Files:

- `app/(dashboard)/requests/actions.ts`
- `app/(dashboard)/requests/page.tsx`
- `app/(dashboard)/requests/request-actions.tsx`
- `lib/mentorship-request.test.mjs`
- `lib/mentorship-request.ts`

### 2026-10-16 · `03cbb69`

✨ feat: add character counts and form guidance

Attribution: Chat.

Files:

- `app/(dashboard)/discover/request-button.tsx`
- `app/(dashboard)/profile/actions.ts`
- `app/(dashboard)/profile/profile-form.tsx`
- `app/(dashboard)/requests/actions.ts`
- `components/ui/field-guidance.tsx`
- `lib/form-limits.ts`

### 2026-10-16 · `021e2af`

🎨 style: adopt square surfaces and stronger contrast

Attribution: Chat.

Files:

- `PRODUCT.md`
- `app/(dashboard)/admin/page.tsx`
- `app/(dashboard)/dashboard-navigation.tsx`
- `app/(dashboard)/profile/profile-form.tsx`
- `app/(marketing)/landing.module.css`
- `app/(marketing)/page.tsx`
- `app/globals.css`
- `components/quick-actions.tsx`
- `components/ui/badge.tsx`
- `components/ui/button.tsx`
- `components/ui/input.tsx`
- `components/ui/label.tsx`
- `components/ui/loading-state.tsx`
- `components/ui/select.tsx`
- `components/ui/status-message.tsx`

### 2026-10-28 · `f8fb640`

🔒 fix: require authentication for mentorship responses

Attribution: Chat.

Files:

- `supabase/migrations/20261028000001_request_response_auth.sql`
- `supabase/tests/rls_tests.sql`

### 2026-10-28 · `1225caa`

✅ test: verify the local mentorship workflow

Attribution: Chat.

Files:

- `README.md`
- `docs/environment-verification.md`
- `docs/project-checklist.md`
- `docs/sprint-review-readiness.md`
- `package.json`
- `scripts/smoke-local.mjs`

### 2026-10-29 · `ff7e26d`

✨ feat: guide first-time mentorship setup

Attribution: Chat.

Files:

- `PRODUCT.md`
- `app/(auth)/signup/signup-form.tsx`
- `app/(dashboard)/discover/discover-client.tsx`
- `app/(dashboard)/discover/page.tsx`
- `app/(dashboard)/profile/page.tsx`
- `app/(dashboard)/profile/profile-form.tsx`
- `app/(dashboard)/profile/profile-setup.tsx`
- `docs/environment-verification.md`
- `docs/project-checklist.md`
- `docs/sprint-review-readiness.md`
- `scripts/smoke-local.mjs`

### 2026-10-29 · `d18ce0a`

🧪 test: audit synthetic ML data and leakage risks

Attribution: Chat.

Files:

- `.gitignore`
- `docs/ml-data-audit.md`
- `docs/ml-source-intake.md`
- `ml/README.md`
- `ml/audit_export.py`
- `ml/test_audit_export.py`

### 2026-10-29 · `e1c604c`

📝 docs: define the mentorship ML experiment protocol

Attribution: Chat.

Files:

- `docs/ml-delivery-plan.md`
- `docs/ml-experiment-protocol.md`
- `docs/project-checklist.md`
- `docs/sprint-review-readiness.md`
