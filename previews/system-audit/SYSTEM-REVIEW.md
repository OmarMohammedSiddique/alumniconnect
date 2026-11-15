# Local system design pass

Applied on 8 November 2026 following the user's direction response. Work remains local and uncommitted. No pushes, issue edits or publication.

## What changed

- Shared tokens now use ink-tinted neutral surfaces, lighter borders, a consistent 8px control radius and calmer heading weights. Shared cards derive the outer radius from their content spacing plus the 8px inner radius.
- Empty states use task-focused text and actions without decorative icons or dashed frames. Workspace shortcuts use a quieter inline treatment. Repeated sidebar notices and separators were removed while the footer disclosure remains.
- Signup now shares sign-in's generated cloud asset, translucent surface, layered blue shadows, animated window and concentric controls. It keeps account fields, password validation, roles, optional photo selection, confirmation handling and privacy copy. The disabled identity fields remain available in a labelled expandable preview.
- Shared password fields embed visibility controls and a focus-reactive lock. Account-code, verification and recovery pages adopt the same arrival styling, including unavailable states.
- Discovery and model comparison retain their data, ordering, explanations and request behavior. Routine result entrance animation was removed; the existing login flight remains.
- Profiles, photos, availability, privacy, email preferences, requests, connections and staff pages inherit the shared system. Administration now contains phone-width table scrolling and has visible/accessibility labels that agree.
- Developer, privacy, cookie banner and cookie settings use lighter hierarchy and calmer surfaces. Consent behavior and privacy wording remain intact.

## Verification

- ESLint over app and components, TypeScript and diff whitespace checks passed.
- All 172 existing Node tests passed.
- Public browser checks covered home, login, signup, privacy, developer and the recovery-unavailable state. All fit 320px width, with no axe violations in light or settled dark mode.
- Existing fictional local seed accounts were used for protected read-only UI review. Discovery, profile, requests, email preferences, photos and administration fit phone width and had no axe violations in light or settled dark mode.
- The existing local Mentor fixture rendered four recommendation articles. Its discovery, profile and request screens passed the same responsive and accessibility checks.
- Signup mismatch feedback, role selection, disabled identity fields, embedded password visibility, local photo preview and reduced-motion cloud suppression worked. No registration form or upload was submitted.
- The cookie settings dialog had no axe violations. No browser runtime errors were observed in the reviewed flows.

No production system was accessed for these checks. Existing local fixture sessions were signed out after browser checks. No member profile, role, request or connection records were changed. This is a visual and interaction review, not a new complete authentication, notification, participant-usability or model-quality acceptance run. Enabled email-code/recovery flows were styled in source but remain disabled in the existing local configuration.

The development signup preview is at http://localhost:3000/signup. The original standalone interaction study remains at http://localhost:4173.

The charles-unslop audit and direction are recorded in `AUDIT.md`. No new image-generation prompts were needed in this pass.
