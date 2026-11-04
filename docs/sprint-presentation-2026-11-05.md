# AlumniKonneQt: Graded Sprint Review Presentation Runbook

**Presentation Date:** 5 November 2026  
**Assessment Weight:** 5% of Capstone Assessment  
**Allocated Duration:** 10–12 minutes total (8–9 min presentation/demo + 3 min Q&A)  
**Presenter:** Omar Siddique  
**Repository State:** GitHub `main` branch (verified through PR #55 / commit `a640102`)  
**Target Environment:** Local Docker Supabase + Local Next.js dev server (`http://127.0.0.1:3000`)

---

## 1. Executive Summary & Assessment Alignment

This runbook provides the minute-by-minute rehearsal script, visual demonstration pathway, technical talking points, and failure-contingency procedures for the assessed Sprint Review on 5 November 2026.

### Key Assessment Principles
- **Empirical Honesty:** Delineate verified code and live capabilities from roadmap items.
- **Clear ML Distinction:** Explicitly distinguish the current production application's MiniLM feature-extraction pipeline (384-d) from the experimental from-scratch PyTorch pilot (`ml/train_scratch_pilot.py`, 64-d).
- **Verifiable Engineering Quality:** Showcase automated CI regression pipelines, database RLS permission tests, and optimistic concurrency guards.

---

## 2. Minute-by-Minute Rehearsal Script

```
00:00 ────────────────────────────────────────── 02:00
  Introduction, Problem Domain & Architectural Overview
02:00 ────────────────────────────────────────── 05:00
  Live Application Demonstration (End-to-End Workflow)
05:00 ────────────────────────────────────────── 08:00
  Machine Learning System & From-Scratch Training Pilot
08:00 ────────────────────────────────────────── 10:00
  Engineering Rigor: CI Pipeline, Scope & Governance
10:00 ────────────────────────────────────────── 12:00
  Sprint 4 Roadmap & Evaluator Q&A
```

### Minutes 0:00 – 2:00 | Context, Problem & Architecture
- **Hook & Motivation:** Professional alumni networks suffer from disengagement when matching relies on rigid keyword search or passive directory browsing. AlumniKonneQt provides intelligent semantic mentorship pairing based on profile experiences and skills.
- **Core Technology Stack:**
  - Front-end / Edge: Next.js (App Router, Server Components, React 19).
  - Storage & Vector Engine: PostgreSQL 15 with `pgvector` extension and Row-Level Security (RLS).
  - Machine Learning: Pretrained 384-d semantic embedding in production pipeline; custom from-scratch PyTorch character-CNN pilot in Colab/local training pipeline.
- **Sprint 3/4 Milestones Achieved:**
  - Recorded confirmed scratch-training requirements (#1), membership verification policy (#23), secondary module scope decisions (#7), and Cloudflare DNS/hosting evaluation (#35).
  - Implemented client profile draft resiliency (#18) and embedding API rate-limiting/concurrency guards (#21).
  - Enhanced discovery with industry/cohort/skill filters, persistent request states (#16), transparent recommendation explanations (#17), connection starter actions (#14), and reliable admin moderation feedback (#22).
  - Implemented and verified existing-account Google OAuth sign-in (#37) and responsive signup with profile photo uploads (#36).
  - Integrated unit, database SQL permission, and ML regression checks into CI (#20) and resolved all Dependabot alerts (#13).

---

### Minutes 2:00 – 5:00 | Live User Journey Demonstration

*Demo accounts: Disposable local test accounts (`mentee@example.com`, `mentor@example.com`, `admin@example.com`).*

1. **Step 1: Profile Onboarding & Draft Protection (#18)**
   - Open `/profile` as a newly signed-in mentee.
   - Enter updated career bio and skills.
   - Demonstrate browser refresh or navigation interruption: show the **"Restore unsaved draft"** banner restoring input without losing state or auto-submitting.
2. **Step 2: Profile Save & Semantic Embedding Guard (#21)**
   - Click "Save Profile". Explain the two-phase commit: profile data persists first to PostgreSQL, then triggers `/api/embed`.
   - Point out the server-side mutex and rate-limiting guard (`lib/embedding/embed-guard.ts`): rapid edits return cached hashes or HTTP 429 backoff rather than thrashing the embedding model.
3. **Step 3: Intelligent Discovery, Filters & Score Transparency (#16, #17, #7)**
   - Navigate to `/discover`. Show ranked mentor recommendations and switch between Recommended and Keyword search modes.
   - Filter results by **Industry**, **Cohort (Graduation Year)**, and **Skills**, and expand a mentor's full background.
   - **Key Explanatory Point:** Emphasize that recommendations use profile text cosine similarity (`Xenova/all-MiniLM-L6-v2`, 384-d) and exact shared skills rather than a misleading match-probability percentage.
4. **Step 4: Request Workflow & Connection Next Steps (#14, #16)**
   - Send a mentorship request from Mentee to Mentor and show the persistent `Pending request` badge surviving page reload.
   - Log into Mentor dashboard at `/requests`. Accept the request.
   - Show the accepted **Connection Card**: role-aware first-conversation instructions, customizable contact-sharing note, one-click template copy / email launch, and explicit privacy notice that account emails are never auto-exposed to the directory.
5. **Step 5: Admin Moderation with Reliable Feedback (#22)**
   - Navigate to `/admin`.
   - Toggle member profile visibility and role permissions.
   - Demonstrate accessible toast notifications, optimistic UI state updates, and safe error mapping for restricted operations.

---

### Minutes 5:00 – 8:00 | Machine Learning Deep-Dive & Scratch Pilot

*Crucial Presentation Section: Evaluators will closely inspect ML rigor.*

1. **Distinction Between Environments:**
   - **Live App Pipeline:** Uses `@huggingface/transformers` running `Xenova/all-MiniLM-L6-v2` locally inside Next.js server processes to output 384-dimensional dense vectors stored in `public.profiles.embedding`.
   - **From-Scratch Research Pilot (`ml/train_scratch_pilot.py`):** An independent PyTorch neural network built to satisfy academic requirements (#1).
2. **From-Scratch Engineering Implementation (`ml/train_scratch_pilot.py`, `docs/ml-pilot-training.md`):**
   - **Initialization:** Standard PyTorch random parameter initialization (`seed=42`, deterministic CPU algorithms enabled, `11,200` trainable parameters across a `57`-character vocabulary fitted on training profiles only). Zero pretrained weights, tokenizers, or backbones loaded; verified L1 weight movement after optimization.
   - **Architecture:** Character-level `Embedding(57, 32, padding_idx=0)` -> `Conv1d(32, 32, kernel_size=5, padding=2)` -> ReLU + global max pooling -> two directional linear projection heads (`query_head` and `mentor_head`, `Linear(32, 64)`) -> L2 normalization (`512`-character input truncation).
   - **Optimization:** Trained with Adam optimizer (`lr=0.001`, batch size `16`, ceiling `10` epochs, early-stopping patience `3`), minimizing **Mean Squared Error (`F.mse_loss`)** between the dot product of L2-normalized query/mentor vectors and scaled relevance grade (`relevance_score / 3`).
   - **Verification:** Stopped after 4 epochs with best validation loss at `checkpoint-1.pt` (top-3 checkpoints retained as `checkpoint-{epoch}.pt`); verified safe reload via `torch.load(..., weights_only=True)` and reproduced identically in both local CPU and Google Colab (`My Drive/AlumniKonneQt-ML/runs/notebook-20261102T034308433827Z`).
3. **Evaluation Honesty & Limitations:**
   - Evaluated on the 5-query validation split (60 training pairs, 90 synthetic profiles, machine-labelled) using complete-pool ranking metrics:
     - **Char 3–5-gram TF-IDF baseline:** `nDCG@5 = 0.853932`, `P@1 = 0.800000`, `MRR@5 = 0.840000`, `Hit@5 = 1.000000`.
     - **From-scratch neural pilot:** `nDCG@5 = 0.502278`, `P@1 = 0.200000`, `MRR@5 = 0.433333`, `Hit@5 = 0.800000`.
   - **Transparent Academic Result:** Acknowledge that the compact character-CNN pilot on 60 unreviewed machine-labelled training pairs and 5 validation queries underperforms character n-gram TF-IDF. Present this honestly as the verified engineering baseline prior to human-reviewed dataset freeze (#3) and research-ready training/selection (#25).

---

### Minutes 8:00 – 10:00 | Engineering Rigor, CI/CD & Governance

1. **Continuous Integration Pipeline (#20):**
   - Showcase `.github/workflows/ci.yml`.
   - Highlight the 3-pillar validation:
     1. Static quality: ESLint, Next.js route typegen, TypeScript compiler, and 65 unit tests.
     2. Database integrity: Ephemeral local Supabase container executing `rls_tests.sql` and Google sign-up security policy `google_signup_policy.sql`.
     3. ML reproducibility: PyTorch/NumPy/scikit-learn regression tests verifying scratch pilot data generation and metric functions.
2. **Governance & Scope Amendments (#7, #23, #35):**
   - **Scope Discipline (#7):** Secondary job referral board and event management formally deferred to Phase 2; cohorts narrowed to verified graduation year filtering.
   - **Cloudflare Decision (#35):** Evaluated and approved Cloudflare as DNS-only ("Grey Cloud") preserving Vercel edge deployment.
   - **Membership Policy under Kenya DPA 2019 (#23):** Prohibited intrusive national ID uploads in favor of corporate email magic links and peer vouching.

---

### Minutes 10:00 – 12:00 | Next Sprint Roadmap & Questions

1. **Sprint 4 Immediate Priorities:**
   - Scale scratch training data with expanded O*NET skill taxonomy (#25).
   - Export scratch model to ONNX and complete live runtime integration (#26).
   - Execute representative user evaluation study (#5).
   - Final release preparation and Chapter 4–6 dissertation completion (#6, #31).
2. **Evaluator Q&A Preparation:**
   - *Q: Why not use a pretrained model directly for the final submission?*  
     *A:* Pretrained models demonstrate software integration, but capstone ML requirements mandate demonstrating feature learning, random weight initialization, and training dynamics from scratch (#1).
   - *Q: How does the system handle cold-start users with sparse profiles?*  
     *A:* Cold-start users can browse via keyword search and industry/skill filters; when saving a minimal profile (headline + 1 skill), vector generation is triggered without requiring prior interaction history.

---

## 3. Pre-Presentation Setup Checklist

- [ ] Ensure Docker Desktop is running.
- [ ] In terminal 1: `npx supabase status` (confirm local Supabase is healthy on port 54321).
- [ ] In terminal 2: `npm run dev` in `alumniconnect` (confirm `http://localhost:3000` is responsive).
- [ ] Verify test user credentials:
  - Mentee: `mentee@example.com`
  - Mentor: `mentor@example.com`
  - Admin: `admin@example.com`
- [ ] Have slide deck open in presentation mode.
- [ ] Have terminal tab ready with `python3 -m unittest ml/training_tests/test_scratch.py`.

---

## 4. Contingency & Failure Backup Plan

| Failure Mode | Immediate Recovery Action |
|---|---|
| Port 54321 / Docker crash | Switch to hosted deployment at `https://alumniconnect-kq.vercel.app` or run deterministic offline walkthrough `npm run ml:walkthrough` |
| Local Supabase Auth session expiry | Sign in again at `http://127.0.0.1:3000/login` or run `npm run auth:check` to verify local Auth health |
| Dev server compilation lag | Use pre-warmed browser tabs with already loaded `/profile`, `/discover`, `/requests`, and `/admin` pages |
| Complete browser / network failure | Run deterministic terminal verification (`npm run ml:walkthrough`, `npm test`, `python3 -B -m unittest discover -s ml/training_tests -v`) and walk through `docs/ml-pilot-training.md` and `docs/verification/` |

---

## 5. Post-Presentation Feedback Capture Log

*To be completed immediately following the 5 November 2026 session:*

- **Assigned Grade / Marks:** `[Pending Supervisor Evaluation]`
- **Supervisory Panel:**
- **Key Questions Raised:**
- **Actionable Adjustments for Final Sprint:**
