# Registration layout and privacy-claim assessment

Reviewed: 4 November 2026. Related: #36 (form), #23 (eligibility/evidence policy), #19 (member privacy), #15 (account access).

## Result

The requested protections are technically achievable, but compliance and association-only use cannot be verified from this checkout. The registration sentence is displayed as **proposed association privacy wording**, with a link to `/privacy`. It is not presented as an established guarantee.

Staff ID and national ID/passport fields are a disabled, labelled preview. No document upload or identity storage was added. The signup action also rejects submitted identity fields before account creation, including direct requests that bypass the disabled controls. This default permits review of the proposed form without beginning real identity collection.

No answer to the optional real-data-versus-preview question had been received when implementing the preview. Activating real collection requires a separate handling decision and implementation; the existing issue text is project context, not authority overriding the user's request.

## What the law supports

Kenya's Data Protection Act, 2019 requires lawful, transparent, purpose-limited and necessary processing; notice and data rights; proportionate retention; technical and organisational safeguards; and conditions for overseas transfers. Relevant sections: 25–30, 31, 39–43 and 48. Assess controller registration and DPIA applicability rather than assuming either applies universally. A reassurance sentence alone establishes none of these controls. [Act text, government-hosted copy](https://kdic.go.ke/sites/default/files/2021-07/TheDataProtectionAct__No24of2019.pdf).

Source limits: this is the enacted 2019 text. The Kenya Law consolidated page was blocked by bot verification and the ODPC site redirected to maintenance during this review. This is an implementation-gap assessment, not current-law compliance certification; the operator must check current applicable amendments, regulations and guidance before launch.

## Verified source findings

| Area | Evidence in this checkout | What remains before a real association service |
| --- | --- | --- |
| Account access | Supabase Auth, server session checks and existing database RLS | Hosted configuration and independent permission tests |
| Pictures | Private bucket migration, owner-only writes and authenticated-member reads; server file/type/size checks | Apply/test the migration, replacements and denial cases; include pictures in retention/deletion |
| Identity data | Disabled form preview and server rejection; no new ID storage or verification service | Establish necessity first; prefer less intrusive evidence where adequate |
| Verification | Mentorship role and self-declared names only | Approved membership policy, authoritative staff records or authorised human review, audited decisions and appeal handling |
| Privacy notice | New `/privacy` describes prototype limitations | Named controller/contact, lawful purpose/basis, required versus optional fields, recipients and rights procedure |
| Retention/deletion | No dedicated account deletion/data-rights workflow found in app/lib; no identity retention process | Working correction, export/request and deletion procedures, schedules and backup handling |
| Research purpose | Independent academic prototype and ML/research work are documented | Explain any research use separately; association-only wording cannot cover undisclosed additional use |
| Infrastructure | Supabase/Vercel integrations in source | Verify deployment regions, processor agreements, access, secrets, logging, transfer safeguards and applicable registration/DPIA duties |

These are code findings and missing evidence, not a claim that hosted infrastructure is insecure. No production settings were changed or audited, and no national ID/passport/staff-registry API access was established. Format validation cannot prove identity or past employment.

## Form changes

- Auth shell now uses up to 1440px, with brand and home navigation in one row.
- Registration uses account, membership-preview and picture/role columns from the large breakpoint. Shorter spacing, compact requirements and a horizontal footer reduce desktop page height.
- On mobile, short viewports and zoomed layouts, normal page scrolling remains available. Nothing is clipped or hidden to force a one-screen fit. No claim of universal no-scroll behavior is made.
- Picture upload uses a large labelled dashed target with an image/upload icon, preview, change-photo affordance and keyboard focus treatment.
- Names/email remain controlled so service errors do not clear them.

## Verification

- Targeted ESLint passed.
- Node unit suite passed: 37 tests, including direct identity-submission rejection and duplicate-form-field bypass prevention.
- Local `/signup` and `/privacy` returned HTTP 200.
- In-memory baseline-adjusted TypeScript check: zero diagnostics; the pre-existing profile-page syntax error was corrected only inside the compiler read hook, never on disk.
- Full build/typecheck remain blocked by the preserved user edit at `app/(dashboard)/profile/page.tsx:12`.
- Browser connector unavailable; native Safari provided the fallback. Visually checked the complete form at 1366 × 768 with all fields, submit action and footer visible without scrolling. At 320 × 844, checked the stacked layout and scrolled through the upload target and footer without horizontal clipping. The accessible photo target opened the native file picker; cancelled without selecting a file. Full keyboard/screen-reader coverage remains pending.
- No live upload, CI, hosted, mailbox or legal-compliance evidence is asserted here.
