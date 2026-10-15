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
- Red marks priority and selection; most controls and surfaces stay neutral. Blue is reserved for semantic information only.
- Centralize font scale, line heights, spacing, control height, radii, shadows, focus, and motion tokens. Product headings use a fixed rem scale; landing display type can be fluid.
- White and soft-gray surfaces, subtle full borders, modest corners, and restrained shadows. Keep the existing light-first presentation and coherent dark tokens.

## Interface patterns and surfaces

- Marketing: original AlumniConnect identity, mentor/matching utility panel, concise journey explanation, Mentor and Mentee invitations, and visible independence notice.
- Authentication: home link, readable single-column forms, clear pending/error states, and quiet academic identity.
- Product: responsive sidebar/mobile menu, Discover Mentors, Complete Profile, View Requests, and Manage Connections using existing destinations. `/discover` currently serves as the authenticated entry screen; no separate dashboard route exists.
- Discovery: labeled search, clear selection modes, mentor cards with shared skills and contextual request actions.
- Profile: retain current fields, completion calculation, save action, and match-profile update flow.
- Requests/connections: distinguish status with text and semantic treatment; preserve current request and response actions.
- Shared controls: consistent buttons, inputs, select menus, cards, badges, notices, empty states, skeletons, and error recovery. Data and authentication logic remain unchanged.

## Accessibility and motion

Meet WCAG AA text contrast and visible non-text control contrast. Preserve semantic headings, landmarks, labels, keyboard access, and visible focus. Aim for 44px touch targets. Support narrow mobile, tablet, laptop, and wide desktop without horizontal page overflow. Use text as well as color for status. Never hide essential content behind animation. Respect reduced motion; feedback transitions are brief and tokenized. Avoid continuous decoration, layout shifts, hydration differences, and added heavy dependencies.

## Elevated glass exception

Liquid glass is a secondary material only for marketing navigation over the hero, the landing Mentor discovery utility panel, mobile navigation, dropdowns/popovers, and one compact dashboard shortcut bar. Ordinary content, Mentor cards, forms, tables, profiles, and alerts stay solid. The authenticated application remains primarily solid.

Use the shared `glass-surface` class on a positioned surface with the existing radius scale. Central tokens: `--glass-background-light` (82% white), `--glass-background-dark` (84% dark), `--glass-border`, `--glass-highlight`, `--glass-shadow`, `--glass-blur` (20px, 16px on mobile), and `--glass-saturation` (130%). A stable pseudo-element adds an upper-edge inset highlight. Muted text and hover links use glass-specific contrast tokens. Never animate blur, refraction, or shimmer.

Solid theme-aware backgrounds are the default and explicit unsupported-browser fallback. Reduced transparency and forced colors also disable the filter. Verify text contrast after compositing over both black and white backdrops, with or without decoration; retain keyboard focus and reduced-motion rules.

## Anti-patterns

No official-endorsement language, proprietary fonts, fabricated data or functionality, airplane decoration, gradients, glass outside the elevated exception, glow, excessive pills or nested cards, red on every surface, or em dash characters. Keep copy specific and concise. Preserve routes, authentication, Supabase, ML logic, schemas, and unrelated research documentation.
