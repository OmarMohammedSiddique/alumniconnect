# Responsive registration and profile pictures

Implementation: 4 November 2026.

- `/login` pairs email and password from the small breakpoint upwards.
- `/signup` uses account-details and picture/role columns from the medium breakpoint upwards; names pair from the small breakpoint. Narrow layouts stack fields.
- First and last names are required and stored as Auth metadata. The existing profile `full_name` remains the formatted combination for compatibility.
- New registrations require at least eight characters, uppercase/lowercase letters, a number and a symbol. Confirmation must match exactly. Existing sign-in passwords are unaffected.
- Optional JPG/PNG/WebP uploads have a 512 KiB limit, browser preview, server MIME/header checks and a private Storage bucket. Only the authenticated owner can insert/replace their fixed avatar path; signed-in members can read photos.
- `/profile/photo`, linked from the profile form, displays the saved picture and supports replacement. Failed signup uploads continue here without creating another account.
- Confirmation-required signup displays a check-email state. The picture is not retained before authentication; the screen explains that it must be selected again after verification and sign-in. Full verification/resend/recovery remains issue #15.

## Setup

Apply the new migration to the intended environment before testing uploads:

```sh
npx supabase migration up --local
```

Migration: `supabase/migrations/20261104150232_signup_profile_photos.sql`.
This work does not apply migrations to hosted environments or deploy the application.
The 512 KiB file limit fits within the current default 1 MB Server Action request limit.

## Evidence and remaining verification

- Targeted ESLint: passed.
- Node unit suite: 34/34 passed, including password policy, confirmation, upload limits and file signatures.
- Local HTTP: `/signup` and `/login` returned 200; rendered HTML includes the new controls and responsive classes.
- Production build and full typecheck: blocked by a pre-existing user edit in `app/(dashboard)/profile/page.tsx` (`supabase.   .getUser()`). A separate TypeScript compiler check that corrected only that expression in memory reported zero diagnostics; the user file was preserved.
- Live signup/storage/RLS tests: pending. Docker was stopped, so the migration has not been applied locally.
- Visual desktop/mobile, keyboard and live browser interaction: pending; the browser access host was unavailable.
- Hosted, CI, mailbox delivery and participant testing: not established by these local checks.

After Docker is available, apply the migration and verify signup with/without a picture, confirmation-enabled/disabled behavior, reload persistence, replacing an avatar, failed-upload retry, anonymous denial and another user's write denial. Visually check 320/375/768/1440px layouts, password mismatch feedback, visibility toggles, keyboard focus, and image selection/rejection before release.
