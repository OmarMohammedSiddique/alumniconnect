# Membership Eligibility and Affiliation Verification Policy

**Policy Record Date:** 4 November 2026  
**Document Status:** Approved Project Policy  
**Associated Issues:** #23 (Policy & Lifecycle Specification), #36 (Registration Layout), #19 (Privacy & Reporting Controls), #15 (Email Verification), #6 (Chapter 5 Evidence)

---

## 1. Purpose and Governance

AlumniConnect is designed as a secure, professional networking and mentorship platform for Kenya Airways (KQ) alumni, former employees, and current personnel. 

While public registration allows prototype demonstration, self-service email signup or self-declared employer profile entries do not establish airline affiliation. This policy formalizes:
1. Who is eligible to join and participate.
2. How affiliation status is separated from mentorship operational roles (`Mentor` vs. `Mentee`).
3. The member lifecycle states and granular access control matrix.
4. A data-minimization framework under the **Kenya Data Protection Act, 2019**, avoiding unnecessary collection of high-risk national identity documents.
5. Administrative review, audit trails, and appeal workflows.

---

## 2. Participant Eligibility Categories

Membership is governed by institutional relationship to the enterprise:

### 2.1 Eligible Groups
- **Alumni (Former Employees):** Individuals previously employed under permanent or fixed-term contracts with Kenya Airways who separated in good standing.
- **Current Employees:** Active staff members seeking to mentor incoming talent or connect across departments.
- **Retirees:** Retired personnel with institutional history and specialized operational expertise.
- **Former Interns & Attachees:** Individuals who completed an official university industrial attachment or graduate trainee program with the airline.

### 2.2 Ineligible Groups
- **General Public:** Individuals with no past or current employment relationship.
- **Third-Party Contractors & Vendors:** External agency personnel, temporary outsourced labor, and general contractors (unless granted a distinct partner program status by administrative decree).
- **Adverse Separation:** Individuals whose employment was terminated for cause involving gross misconduct or fraud.

---

## 3. Separation of Affiliation from Mentorship Roles

The system strictly decouples **who you are** (affiliation status) from **what you do on the platform** (mentorship role):

- **Mentorship Role (`profiles.role`):** 
  - `mentor`: Offers guidance, shares industry experience, accepts pairing requests.
  - `mentee`: Seeks guidance, initiates mentorship connections.
  - `admin` / `moderator`: Institutional oversight and audit management.
- **Affiliation State (`profiles.affiliation_status`):**
  - Independent status property tracking verification through institutional channels. Mentorship role permissions are conditionally enabled based on active affiliation state.

---

## 4. Affiliation Lifecycle States and Access Matrix

```
       [ Self-Service Signup ]
                  │
                  ▼
          ┌───────────────┐
          │  UNVERIFIED   │ ◄── (Default state; public preview only)
          └───────┬───────┘
                  │ Submit Verification Request
                  ▼
          ┌───────────────┐
          │    PENDING    │ ◄── (Awaiting automated check or admin review)
          └───┬────────┬──┘
  Approved    │        │ Rejected
  ────────────┘        └────────────┐
  ▼                                 ▼
┌───────────────┐          ┌───────────────┐
│   VERIFIED    │          │   REJECTED    │
└───────┬───────┘          └───────┬───────┘
        │ Admin Revocation         │ Appeal / Resubmit
        └──────────────┬───────────┘
                       ▼
               ┌───────────────┐
               │    REVOKED    │
               └───────────────┘
```

### 4.1 Granular Permissions Matrix

| Platform Capability | Unverified | Pending | Verified | Rejected / Revoked |
|---|:---:|:---:|:---:|:---:|
| View Public Landing & `/privacy` | Yes | Yes | Yes | Yes |
| Edit Own Profile & Drafts | Yes | Yes | Yes | No |
| View Mentorship Discovery Cards (Redacted) | Yes | Yes | Yes (Full) | No |
| View Unredacted Full Name & Photo | No | No | Yes | No |
| Initiate Mentorship Request (`/api/requests`) | **No** | **No** | **Yes** | **No** |
| Accept / Decline Mentorship Request | **No** | **No** | **Yes** | **No** |
| Share Contact Details & Starter Messages | **No** | **No** | **Yes** | **No** |
| Administrative Audit Dashboard (`/admin`) | No | No | Staff Only | No |

---

## 5. Evidence Standards and Privacy Minimization (Kenya DPA 2019)

In compliance with Sections 25–31 of the **Kenya Data Protection Act, 2019** (Principles of Data Protection: Purpose Limitation, Data Minimization, and Storage Limitation), AlumniConnect adopts the **least intrusive acceptable evidence standard**:

### 5.1 Prohibited Evidence (High-Risk)
- **No National ID or Passport Document Uploads:** High-resolution scans or numbers of government IDs present unnecessary exposure to identity theft and regulatory liability. They are strictly prohibited from collection and storage.

### 5.2 Approved Verification Tiers
1. **Tier 1 — Corporate Domain Verification (Automated):**
   - Verification via corporate email address confirmation (`@kenya-airways.com`).
   - Single-use cryptographically signed magic link or one-time passcode (OTP).
   - Instant promotion to `verified` upon link confirmation.
2. **Tier 2 — Peer Vouching (Community Validation):**
   - An alumnus without active corporate email provides the verified member IDs of two active, verified alumni peers.
   - System prompts peers to vouch for the applicant's prior employment.
   - Upon dual confirmation, status advances to `verified`.
3. **Tier 3 — Administrative Document Review (Manual Fallback):**
   - For retirees or older alumni without corporate email or peer vouches: submission of historic staff number or retirement letter excerpt to a designated staff administrator.
   - **Retention Rule:** Physical or uploaded evidence must be inspected by the administrator and immediately purged from servers/ephemeral storage within 14 calendar days of decision. Only the boolean verification result and audit record are retained.

---

## 6. Administrative Authority, Auditing, and Appeals

1. **Staff Roles:** Only accounts with `role = 'admin'` or designated institutional moderators possess permissions to review and update `affiliation_status`.
2. **Database Integrity:**
   - PostgreSQL RLS policies bar non-admin users from altering their own `affiliation_status`.
   - Any attempt to bypass the client UI results in a database permission error.
3. **Audit Trail:**
   - Every verification, rejection, and revocation action writes an entry to `public.audit_logs`:
     - `actor_id` (Administrator UUID)
     - `target_id` (Member UUID)
     - `action` (`verify_member`, `reject_member`, `revoke_member`)
     - `timestamp`
4. **Appeals Workflow:**
   - Rejected applicants receive clear notification outlining the rationale (e.g. invalid staff record or unmatched peer vouchers) with an option to resubmit clarification within 30 days.

---

## 7. Honest Prototype Disclosure

As an academic capstone prototype:
- The platform interface and registration screen must explicitly state:
  > *"AlumniConnect is an independent academic research platform developed for evaluation purposes. Registration does not constitute official corporate accreditation or employment certification by Kenya Airways PLC."*
- No representations of official airline sponsorship or commercial endorsement may be made in public release documentation.

---

## 8. Implementation Traceability

| Milestone | Target Issue | Component / Deliverable |
|---|---|---|
| Policy Formulation | #23 | `docs/membership-verification-policy.md` |
| Registration UI Preview & Minimization | #36 | `app/(auth)/signup/signup-form.tsx` (ID fields disabled) |
| Privacy Notice Update | #23 / #19 | `app/privacy/page.tsx` |
| Database Affiliation State Schema | Phase 2 Roadmap | Migration for `affiliation_status` enum and audit trigger |
