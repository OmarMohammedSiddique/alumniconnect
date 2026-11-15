# AlumniKonneQt system design audit

Local review on 8 November 2026. No application code was changed during this audit. Earlier uncommitted login work is preserved. No commits, pushes, issue edits or publication.

## Coverage and limits

Fresh desktop (1440px) and phone (390px) captures cover home, login, signup, developer/about, privacy and the local recovery-unavailable state. `/about` redirects to the developer page. All tested public pages fit phone width. In the current local configuration, email-code and recovery features are not enabled, so their enabled screens need a separate review.

Discover, profile, requests and administration redirect to login without a session. Their findings below come from current source, not authenticated screenshots. Profile photo, privacy, email preferences, model comparison, connections, safety dialogs and staff actions were included in the source inventory. An authenticated visual pass remains necessary before calling the whole system verified. Historical screenshots under `docs/verification/` are not current evidence.

## Audit: one finding per location

1. **Design language:** `app/globals.css` sets the shared radius to zero, while the local login has a 48px card with 16px controls. Signup visually returns to square fields and frames immediately after the sky login.
2. **Borders:** global border and input colors are strong mixtures of black; cards, footers, fields, tables and nested form sections repeatedly draw outlines. The signup screenshot shows a large enclosing frame plus vertical sections and a boxed footer.
3. **Depth:** the shared `Card` requests border and shadow, although global shadow tokens currently disable shadows. Give each surface one deliberate depth cue instead of contradictory defaults.
4. **Typography:** `.page-heading h1` uses 750, `.section-heading` uses 700 and marketing headings use 750. Heavy weights are spread across navigation, cards and sections, reducing hierarchy.
5. **Landing copy:** the hero note, utility subtitle, context strip, section introductions and final call-to-action repeat variants of shared experience and the next connection. Keep factual audience/context and remove redundant sentences.
6. **Landing composition:** the form-independent hero uses a generic collaboration photograph with a slogan panel. The screenshot reads as a conventional marketing template rather than demonstrating how members find a relevant mentor. Preserve the existing section order while giving the product's actual matching output a stronger role.
7. **Empty states:** `components/ui/empty-state.tsx` applies a dashed frame, centered Users icon and repeated centered layout to every use, irrespective of the empty state's job. No physical perforation exists here.
8. **Profile structure:** multiple cards, readiness/feedback text, privacy settings and account information need one clearer reading order. Keep privacy controls, draft recovery and all action feedback.
9. **Password controls:** the shared `PasswordInput` places a separate Show/Hide button beside the input, while login embeds it. Use one accessible embedded pattern across account flows.
10. **Discovery density:** discovery combines a mode selector, filter controls, notices, result cards and per-card badges. Separate search tasks, profile evidence and request state through spacing and hierarchy. Keep availability, filters, blocked access, ranking and comparison behavior unchanged.
11. **Mentor cards:** shared skills, explanations, similarity details and request actions have genuine value. Make returned profile evidence the main content; reduce repeated containers and secondary metadata. Do not introduce match percentages or inferred suitability.
12. **Requests and connections:** shared Card headers, descriptions, badges and footers can make each introduction look like a separate dashboard widget. Let the actual introduction, status and next action lead. Keep accepted-only contact permissions intact.
13. **Navigation:** the desktop sidebar already has appropriate 256px proportions and real route labels. Preserve that foundation, reduce repeated separators and disclosures where they duplicate the footer, and make subpage active states consistent.
14. **Administration:** repeated boxed tables and inconsistent title casing make review dense. Keep table rules that aid scanning, align headers/row controls, add calmer status treatment and preserve pending/success/error announcements and role boundaries.
15. **Motion:** discovery uses `StaggerReveal` for result lists. Repeated entrance motion does not explain ranking or request state. Remove routine reveal animation; preserve state-changing feedback and the approved login flight.
16. **Public utilities:** developer and privacy pages use the older generic card family. Improve reading width, heading rhythm and grouping with the same system. Retain all truthful privacy, eligibility and prototype notices.

## Direction for review

- **Product:** AlumniKonneQt helps Kenya Airways alumni and eligible participants find mentorship through profiles, relevant mentor discovery and consent-based introductions.
- **Character:** composed, welcoming, precise.
- **World:** aviation arrival and a professional alumni workspace. Preserve the original logo and red brand accent. Use sky material for account doorways and quiet ink-tinted neutral surfaces for sustained work.
- **Moment:** the reviewed window flight at entry; inside the product, the returned mentor context and exact shared skills explain why a member might reach out.
- **Signature:** concentric corners derived from container padding, with a consistent small aircraft-window detail at entry. Physical ticket perforations belong only on the reviewed ticket object.

**Concept:** The doorway feels like arrival; the workspace makes the next relevant introduction clear.

The concept applies when a profile is empty (clear input requirements), results exist (actual evidence leads), no results exist (a useful recovery action), a request is pending (a factual state) and a connection is accepted (the next permitted action).

## Moment candidates considered

1. **Behavior:** the existing login window flight introduces the experience; request-state changes explain progress without decorative loops.
2. **Real content:** exact shared skills and visible mentor context become the center of discovery. Selected for the workspace.
3. **Proportion:** allocate the largest area to profiles and introductions, keeping filters and summaries secondary.
4. **Type:** use the person's name and relevant expertise as the strongest hierarchy, not a giant slogan or fabricated match score.
5. **Object:** retain the window and boarding pass only in the reviewed arrival experience. Do not turn working screens into tickets.

## Proposed system values

| Area | Direction |
| --- | --- |
| Brand | Original logo and red accent retained; existing deeper red for small text |
| Workspace | Ink-tinted neutral page, plain content surfaces, three text roles |
| Login | Existing 48px card, 32px padding, 16px controls; phone 40px, 24px, 16px |
| Other form panels | Start at 32px outer radius, 24px padding, 8px inner radius |
| Workspace panels | Start at 24px outer radius, 16px padding, 8px inner radius |
| Type | Existing Geist family; 400/500 for most content, 600 for limited emphasis |
| Rhythm | 4px spacing grid; 16/24/32px group spacing; 44px minimum action targets |
| Surface depth | Hairline or subtle shadow per workspace surface; requested blue layers retained on the sky login |
| Motion | Short state changes, reduced-motion support, approved entry flight preserved |

These are initial values, not a blanket rule forcing every object into the same shape. Radii must be calculated from actual nesting and verified at each breakpoint.

## Implementation order after the direction checkpoint

1. Shared tokens, controls, headers, empty states and the workspace shell.
2. Public pages and all account/recovery/verification screens, preserving existing section order and required disclosures.
3. Discovery, mentor explanations and model-comparison presentation, without changing ranking or inference.
4. Profile, privacy, photos, email preferences, requests and connections.
5. Safety and staff screens, then complete desktop/mobile, keyboard, dark-mode and reduced-motion review.

Each group is reviewed and verified locally. The user's no-commit/no-push restriction continues to apply.

## Checklist context

Live open issues and relevant closed acceptance criteria were read. Related functional contracts: #14 connections, #16 discovery, #17 explanations, #19 member safety, #22 admin feedback, #36 responsive registration, #37 Google sign-in, #75 consent and utilities, #87 site polish. Open #8 owns hosted acceptance and #5 owns participant usability evidence; neither is satisfied by this design pass. No claims of model-quality improvements, participant outcomes or hosted verification are made.

## Skill checkpoint

The explicitly invoked charles-unslop skill requires: “Show the audit and direction and wait for an answer, because a wrong direction redoes everything.” Broad application edits therefore await a direction response. The audit and captures are already available for review.

Guidance applied from charles-unslop by Charles Liu, adapted from unslop by Damir Sokolovsky (https://github.com/heydamir/unslop), CC BY 4.0. No image-generation prompts were used for this audit.
