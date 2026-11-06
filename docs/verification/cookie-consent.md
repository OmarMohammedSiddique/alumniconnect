# Cookie consent acceptance, issue #75

The completion audit of PR #77 found that theme storage ignored functional consent and that the Analytics SDK could retain a callback capturing an old grant. Both optional categories now default off. A live consent check gates every analytics event, including callbacks retained after unmount. Functional rejection removes the saved theme while allowing session-only appearance changes. Startup restores a theme only with valid functional consent.

Consent parsing requires actual booleans. Cross-tab removal and storage clearing reset consent; blocked browser storage retains the current session's decision. The native preferences dialog keeps its header and actions visible on short screens, with a scrolling category section. Its dark-theme badge and action contrast were repaired using the existing palette.

## Repeatable local verification

Run `npm test`, `npm run lint`, and `npm run typecheck`. Build the application, start it on port 3105, then run `node scripts/verify-cookie-consent.mjs`. Set `COOKIE_APP_URL` to use another local port. The browser script requires installed Google Chrome and the existing Playwright and axe dependencies.

The browser suite uses isolated storage, makes no account or database changes, and stubs analytics network requests. It exercises the real SDK injection and its registered `beforeSend` callback, rather than sending telemetry. It verifies:

1. Default-off categories, locked necessary storage, native modal semantics, keyboard focus containment, Escape and focus restoration.
2. Persistent rejection and session-only theme changes.
3. Functional-only customization and theme restoration without analytics injection.
4. Accept All followed by revocation, including the SDK's retained callback and saved-theme removal.
5. Light dismissal discarding drafts, zero axe dialog violations, and layout at 320x480, 375x667, 844x390 and 1366x768.
6. Settings controls and navigation on the landing, login, signup, privacy and developer pages, including the legacy about redirect.
7. Cross-tab clearing restoring the banner and zero axe banner violations in light and dark themes.

Unit tests also cover malformed consent, blocked storage before subscription, cross-tab events, pre-hydration theme behavior, SSR-safe defaults, and dashboard footer wiring. The public browser suite does not exercise an authenticated workspace session.

## Verified results, 6 November 2026

- All 162 unit tests passed.
- ESLint and TypeScript checks passed.
- The Next.js production build using Webpack passed. The default Turbopack build encountered an environment restriction when its CSS worker attempted to bind a port (`Operation not permitted`). This is separate from the successful Webpack production build.
- All seven Chrome browser acceptance groups passed against the local production build, with no browser JavaScript or hydration errors.
- A 320x480 dialog screenshot was visually checked: header, close control and all actions fit; the body scrolls independently.
- `https://omarsiddique.com` returned HTTP 200.

These results prove local completion. The follow-up fixes still require publication, merge and hosted verification before release completion can be recorded on #75. The previously deployed PR #77 does not contain these corrections.
