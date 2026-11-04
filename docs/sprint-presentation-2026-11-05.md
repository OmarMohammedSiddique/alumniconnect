# AlumniConnect: Graded Sprint Review Presentation Runbook

**Presentation Date:** 5 November 2026  
**Assessment Weight:** 5% of Capstone Assessment  
**Allocated Duration:** 10–12 minutes total (8–9 min presentation/demo + 3 min Q&A)  
**Presenter:** Omar Siddique  
**Repository State:** GitHub `main` branch (verified commit `6394ee8`)  
**Target Environment:** Local Docker Supabase + Local Next.js dev server (`http://localhost:3000`)

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
- **Hook & Motivation:** Professional alumni networks suffer from disengagement when matching relies on rigid keyword search or passive directory browsing. AlumniConnect provides intelligent semantic mentorship pairing based on profile experiences and skills.
- **Core Technology Stack:**
  - Front-end / Edge: Next.js (App Router, Server Components, React 19).
  - Storage & Vector Engine: PostgreSQL 15 with `pgvector` extension and Row-Level Security (RLS).
  - Machine Learning: Pretrained 384-d semantic embedding in production pipeline; custom from-scratch PyTorch character-CNN pilot in Colab/local training pipeline.
- **Sprint 3/4 Milestones Achieved:**
  - Reconciled capstone scope (#7, #35).
  - Implemented client draft resiliency (#18) and API rate limiting (#21).
  - Enhanced connection kickstarters (#14) and admin moderation reliability (#22).
  - Integrated unit, database SQL permission, and ML regression checks into CI (#20).

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
3. **Step 3: Intelligent Discover & Score Transparency (#17)**
   - Navigate to `/discover`. Show ranked mentor recommendations.
   - **Key Explanatory Point:** Emphasize that the card score represents cosine similarity, not an absolute guarantee of mentorship success. Highlight exact shared skills as interpretable contextual rationale.
4. **Step 4: Request Workflow & Connection Kickstarters (#14)**
   - Send mentorship request from Mentee to Mentor.
   - Log into Mentor dashboard at `/requests`. Accept the request.
   - Show the newly unlocked **Connection Kickstarter**: an automated, role-aware intro message generator with one-click copy, direct contact card, and privacy notices.
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
2. **From-Scratch Engineering Implementation:**
   - **Initialization:** Strictly random weight initialization using Xavier/Glorot uniform distributions (`torch.nn.init.xavier_uniform_`). Zero pretrained weights.
   - **Architecture:** Character-level Convolutional Neural Network (CNN) mapping token sequences into 64-dimensional directional embedding space.
   - **Optimization:** Trained with Adam optimizer and contrastive ranking loss (CosineEmbeddingLoss) over synthetic alumni pair batches.
   - **Verification:** Live inspectable learning curves demonstrating loss convergence; verified checkpoint serialization and reload (`scratch_model_pilot.pt`).
3. **Evaluation Honesty & Limitations:**
   - Evaluated on test queries using multi-metric retrieval scoring: NDCG@5, MRR@5, and Precision@5.
   - **Transparent Academic Result:** Acknowledge that the small scratch pilot on a 5-query validation set performed lower than TF-IDF n-gram baselines due to synthetic vocabulary sparsity. Frame this as a documented empirical finding guiding Sprint 4 dataset scaling (#25).

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
| Port 54321 / Docker crash | Switch to hosted preview deployment at `https://alumniconnect-kq.vercel.app` |
| Local Supabase Auth token expiration | Run `scripts/smoke-local.mjs` to refresh session cookies |
| Webpack / Turbopack compilation lag | Use pre-warmed browser tabs with already loaded `/profile`, `/discover`, and `/requests` pages |
| Complete internet / local service failure | Present the recorded video backup (`docs/recordings/sprint-demo-backup.mp4`) and annotated screenshot deck |

---

## 5. Post-Presentation Feedback Capture Log

*To be completed immediately following the 5 November 2026 session:*

- **Assigned Grade / Marks:** `[Pending Supervisor Evaluation]`
- **Supervisory Panel:**
- **Key Questions Raised:**
- **Actionable Adjustments for Final Sprint:**
