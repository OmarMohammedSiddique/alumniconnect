# AlumniKonneQt local integration review

The concept is integrated into the real local `/login` page. Its cloud background is a locally bundled 63 KB WebP, derived from the existing generated concept image. Login retains AlumniKonneQt branding, Google sign-in, the existing password Server Action and safe next-destination field, feature-flagged email code/recovery links, registration, theme controls, cookie settings and academic-prototype disclosure.

A development-only control previews the window fly-in and mentorship boarding pass without submitting credentials. The pass is labelled as a design preview. Real sign-in continues through the existing server authentication/redirect flow; the preview animation is not wired to successful authentication. No backend, provider, environment or database settings were changed.

The cloud styles use a CSS module. The shared auth layout adopts the sky only when it contains the login marker. Signup and other auth pages retain their existing layouts. Controls derive their radius from the card radius minus padding. The window frame uses the same rule, and shadows use layered sky blues.

Local verification on 8 November 2026:

- Focused ESLint and TypeScript passed.
- All 172 existing Node tests passed.
- Browser checks passed at widths 320, 390, 768 and 1440.
- Axe found no violations in the tested login, boarding-pass and dark-mode views.
- Preview flight, return, replay, reduced motion and password visibility worked.
- Password-reset and Google registration-required notices rendered.
- The next-destination hidden field retained `/discover`.
- Signup did not receive the sky layout.
- Real credentials were not submitted. Fresh successful authentication and provider flows were not retested.

Issues #36 and #37 were read as related context. No issue changes, commits, pushes or publication were performed under the user's local-only review scope.
