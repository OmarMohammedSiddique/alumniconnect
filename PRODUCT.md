# AlumniConnect product direction

## Register

product

## Purpose and users

A professional mentorship, networking, and communication application for Kenya Airways alumni and eligible participants. Mentors share experience; Mentees find relevant guidance and request connections. Only existing implemented workflows are presented as available.

## Brand relationship

An independent Strathmore University academic prototype inspired by Kenya Airways. It is not an official Kenya Airways product and is not endorsed by the airline. Use the AlumniConnect identity, never the official airline logo, promotional imagery, flight-booking language, or invented affiliation, dataset provenance, or machine-learning requirements.

## Personality and hierarchy

Professional, confident, human, trustworthy, and welcoming. Premium through restraint and clarity. The authenticated application is primary: quiet surfaces, legible forms, clear task hierarchy, and predictable navigation. The landing page can express the brand more strongly while explaining actual product capabilities. Preserve Geist for all interface and display text.

## Visual system

- Reuse Tailwind and shadcn semantic variables in `app/globals.css`.
- Reference red `#ED1C24` for large accents and brand marks; deeper red `#C1171E` for small white-text actions. Ink `#0D0D0D`, supporting gray `#545352`, white `#FFFFFF`, light gray `#EBEBEB`, and soft surface `#F8F7F7`.
- Red marks priority and selection; most controls and surfaces stay neutral. Supporting Kenyan green `#006B3F` is reserved for success, accepted connections, and small meaningful status markers. This is an AlumniConnect supporting token, not a claim about an official airline specification. Blue is reserved for semantic information only.
- Centralize font scale, line heights, spacing, control height, radii, shadows, focus, and motion tokens. Product headings use a fixed rem scale; landing display type can be fluid.
- Square corners throughout, with a shared radius of zero. Solid white and soft-gray content surfaces contrast with dark navigation and neutral secondary actions. Use clear full borders instead of floating shadows. Keep the existing light-first presentation and coherent dark tokens.

## Interface patterns and surfaces

- Marketing: original AlumniConnect identity, mentor/matching utility panel, concise journey explanation, Mentor and Mentee invitations, and visible independence notice.
- Authentication: home link, readable single-column forms, clear pending/error states, and quiet academic identity. Explain the current audience without implying affiliation verification. Native radio choices distinguish seeking guidance as a Mentee from offering it as a Mentor; each account keeps its existing single role.
- Product: responsive sidebar/mobile menu, Discover Mentors, Complete Profile, View Requests, and Manage Connections using existing destinations. `/discover` currently serves as the authenticated entry screen; no separate dashboard route exists.
- Discovery: labeled search, clear selection modes, mentor cards with shared skills and contextual request actions.
- Profile: retain current fields, completion calculation, save action, and match-profile update flow. Before a stored match profile exists, offer a short role-specific setup guide. Headline and skills come first; other context can follow. The detailed completeness checklist starts collapsed for new users, and 100% completeness is not a prerequisite. Offer the next action only after the match update succeeds, with failure/retry and unsaved-draft guidance. Returning profiles do not repeat first-time setup.
- First value: a Mentee proceeds to Discover Mentors and sends an introduction; a Mentor proceeds to incoming requests. Discovery without an embedding explains how to prepare a profile and offers keyword exploration. A valid profile with no available recommendations gets a different empty state. Setup is optional and does not add affiliation fields, a membership verification claim, or a new authentication gate.
- Requests/connections: distinguish status with text and semantic treatment; preserve current request and response actions.
- Shared controls: consistent buttons, inputs, select menus, cards, badges, notices, empty states, skeletons, and error recovery. Data and authentication logic remain unchanged.

## Accessibility and motion

Meet WCAG AA text contrast and visible non-text control contrast. Preserve semantic headings, landmarks, labels, keyboard access, and visible focus. Aim for 44px touch targets. Support narrow mobile, tablet, laptop, and wide desktop without horizontal page overflow. Use text as well as color for status. Never hide essential content behind animation. Respect reduced motion; feedback transitions are brief and tokenized. Avoid continuous decoration, layout shifts, hydration differences, and added heavy dependencies.

## Surface material

All navigation, utility panels, dropdowns, cards, forms, alerts, and profile sections use opaque backgrounds. The current direction replaces the earlier liquid-glass exception. Do not restore backdrop blur, translucent containers, inset highlights, decorative opacity, or pill-shaped surfaces.

Use the shared `solid-surface` class for utility panels and popup menus. Workspace navigation has a scoped dark palette with readable light text, solid hover states, a red current-page treatment, and a white focus outline. Keep feedback states identifiable through text and icons as well as color.

## Anti-patterns

No official-endorsement language, proprietary fonts, fabricated data or functionality, airplane decoration, gradients, glass, glow, rounded containers, decorative translucency, nested cards, green as a competing primary color, red on every surface, or em dash characters. Keep copy specific and concise. Preserve routes, authentication, Supabase, ML logic, schemas, and unrelated research documentation.
