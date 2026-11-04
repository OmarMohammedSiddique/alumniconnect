# Scope amendment and decision record: jobs, cohorts, and events (#7)

| Field | Value |
| --- | --- |
| Date | 4 November 2026 |
| Owner | Omar Mohammed Siddique (project author & researcher) |
| Status | **Approved Project Scope Amendment** |
| Requirement Sources | Capstone Proposal §§1.6 (S8, S9, S10), 2.5, 3.5.1 |
| Relevant Workstreams | #1 Model training requirements, #16 Discovery filters, #27 Knowledge graph, #28 Chapters 1–3, #6 Chapters 4–6, #31 Final release package |

---

## 1. Context and Problem Statement

The initial capstone proposal (§1.6) included three exploratory secondary modules alongside the core mentorship recommender:
1. **Job referral board (S8)**
2. **Cohort grouping (S9)**
3. **Event management (S10)**

An audit of the implementation (`docs/proposal-traceability.md`, item A2; `docs/sprint-review-readiness.md`, rows 80–82) verified that while the core mentorship matching engine, vector embeddings (`pgvector`), and role-based workflows were implemented, the secondary modules were neither built nor formally amended.

In academic capstone evaluation, silently dropping proposed deliverables as "future work" creates severe assessment risks under requirement traceability. Conversely, attempting to implement three complex, non-trivial CRUD subsystems at this stage would jeopardize the core research deliverables:
- Training and validating the from-scratch PyTorch twin-tower matching model (#25)
- Integrating and benchmarking model inference within production latency constraints (#26, #29)
- Running representative usability evaluations (#5)
- Documenting sprint reviews and verified methodology (#9, #30)

This record establishes an explicit, justified, evidence-based scope decision for each module.

---

## 2. Decision and Justification by Module

### A. Job Referral Board (Proposal §1.6, S8)
* **Decision:** **Formally deferred to post-capstone platform roadmap.**
* **Rationale:**
  - A functional job referral board requires employer tenant models, job posting lifecycles, resume/applicant data storage, and applicant privacy controls.
  - These capabilities are orthogonal to semantic recommendation and similarity matching.
  - Adding a simplistic stub without moderation, application tracking, or access controls would degrade system security without contributing empirical research value.
* **Effect on Release & Assessment:**
  - The empty placeholder directory `app/(dashboard)/network/.gitkeep` is retired.
  - No database migration or UI route will be added for job postings.
  - Documented as an explicit research boundary in Chapter 6 (Limitations and Future Work).

### B. Cohort Grouping (Proposal §1.6, S9)
* **Decision:** **Retained in narrowed, data-grounded scope.**
* **Scope Definition:**
  - Rather than building a separate forum/social-feed entity, cohort affinity is anchored to the existing, verified `graduation_year` field in `profiles`.
  - In discovery and matching (#16), alumni can filter and identify mentors/mentees sharing their graduating cohort or era.
  - In the ML ranking feature set (#25, #27), graduation proximity is incorporated as an affinity signal rather than a rigid boundary.
* **Rationale:**
  - Directly supports the core semantic and attribute-aware matching problem without introducing unnecessary social feed maintenance overhead.
  - Preserves privacy: members can discover cohort peers through existing profile visibility policies.

### C. Event Management (Proposal §1.6, S10)
* **Decision:** **Formally deferred to post-capstone platform roadmap.**
* **Rationale:**
  - Meaningful event management entails event creation, RSVP state tracking, calendar integration (ICS generation), venue/webinar links, and notification reminders.
  - Email infrastructure (#34) is appropriately reserved for account security (OTP/verification) and direct mentorship requests (#33), not mass event broadcast.
  - Event management does not produce comparative evaluation data for the semantic vs keyword retrieval research questions.
* **Effect on Release & Assessment:**
  - Documented in Chapter 1 scope boundaries and Chapter 6 future enhancements.

---

## 3. Impact on Report Chapters and Traceability

| Chapter | Required Text & Artefact Alignment |
| --- | --- |
| **Chapter 1 (Introduction & Objectives)** | Clarify that the primary aim is semantic mentorship matchmaking; jobs and events are explicitly non-core exploratory extensions scoped out to prioritize model training and experimental rigor. |
| **Chapter 4 (Design & Architecture)** | Use cases and ERDs reflect the focused domain model: `profiles`, `mentorship_requests`, `connections`, `audit_logs`, and embedding vectors. No phantom entities for jobs or events. |
| **Chapter 5 (Implementation & Testing)** | Test suites verify real, deployed functionality (RLS, role changes, matching, embedding rate limits, Google sign-in) without leaving missing coverage gaps for secondary features. |
| **Chapter 6 (Evaluation & Future Work)** | Identifies employer-facing referral boards and community events as logical Phase 2 platform extensions following successful mentorship adoption. |

---

## 4. Acceptance Verification and Checkoff

- [x] Record requirement source and decision owner/date for jobs, cohorts, and events.
- [x] Confirm each module is retained, narrowed, or explicitly deferred with rationale.
- [x] Define the narrowed cohort scope grounded in `graduation_year` and discovery filtering.
- [x] Trace effect across Chapters 1, 4, 5, and 6 to eliminate unverified requirements.
- [x] Update `docs/proposal-traceability.md` and `docs/project-checklist.md`.
