# Real arrivals and the night scene

Local implementation on 8 November 2026. No commit, push, issue edit or publication.

Password sign-in and signup now use the existing provider validation and cookie-setting logic, returning an internal destination after success so the UI can play the window flight and button-to-ticket morph. Existing server-action callers retain their immediate redirect contract. The boarding pass stays visible until the member chooses to continue. Errors remain on the form. Controlled login inputs preserve retry values across action resets.

Signup without a provider session produces an email-confirmation arrival rather than claiming access. Its action returns to the existing confirmation instructions. The confirmed-session signup pass continues to profile setup or the existing photo retry destination.

Successful Google callbacks, email-code verification and signup email confirmation now lead to a protected `/arrival` page. The page checks the real server session and sanitizes the onward destination. Failure redirects and provider configuration remain intact. No fresh real Google exchange or delivered email-code/confirmation journey was performed during this local design task; the shared arrival page was checked with a real local session.

## Night asset

Built-in imagegen generated a new image, saved for the app at `public/images/auth/night-sky.webp` (55 KB). The day asset stays separate. Dark mode changes the full-screen background and the moving image inside the aircraft window to this night asset, with matching silver window trim and blue-black surface shadows.

Final generation prompt:

> Use case: photorealistic-natural. Asset type: landscape full-screen website night background 1536x1024. Beautiful realistic night sky seen from above clouds at cruising altitude. Deep midnight navy at top with a scattering of tiny natural stars, slender crescent moon high at upper right, silver blue moonlit cumulus clouds across lower two thirds, layered distant horizon, luminous cloud edges and soft atmospheric depth. A tranquil, believable aerial night photograph with restrained navy, blue and silver palette. Keep center calm for a glass login card and enough cloud detail behind it. This should unmistakably be night, not a darkened daylight sky. No aircraft or wings, no aurora, no nebula, no buildings, no text, no UI, no watermark.

## Verification

- ESLint, TypeScript and diff whitespace checks passed. All 176 Node tests passed, including four new arrival contracts covering confirmation requirements, challenge cookies, safe redirects, legacy behavior and required password confirmation.
- Real local password sign-in: invalid submission stayed on the form; retry succeeded without reload; the actual flight and pass completed; Continue respected `/requests`.
- Real local signup: the provider created the temporary account/session; the actual flight and pass completed; Continue opened `/profile`.
- The protected arrival page accepted a real local session and rejected an external onward destination in favor of `/discover`.
- Disposable accounts were signed out and deleted after checks. Production was not accessed.
- Desktop night login/signup and phone boarding-pass scans returned no axe violations; phone layouts did not overflow. Reduced motion omitted the zoom overlay. No browser runtime errors were observed.
- Confirmation-required and email-code-cookie branches were tested with provider stubs, without changing local confirmation settings or sending email. Those checks are distinct from actual provider/email delivery verification.

The night signup view is open in the side panel at http://localhost:3000/signup. Both forms retain a development-only animation preview for visual review without account creation.
