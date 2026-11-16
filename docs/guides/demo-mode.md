# Demo mode for presentations

Demo mode lets a presenter move between the fictional demo Mentee and demo Mentors in one click, so an audience can see a mentorship request from both sides: sent by the Mentee, received and accepted by the Mentor, then the shared connection.

Only accounts created as fictional fixtures (`app_metadata.fictional = true`) can be reached. Real member accounts, and staff accounts, cannot be reached, whatever the browser sends.

## Settings

| Variable | Purpose |
| --- | --- |
| `DEMO_SWITCHER_ENABLED` | Must be `true` for demo mode to exist. |
| `DEMO_SWITCHER_KEY` | Presenter key, at least 16 characters. Without it demo mode stays off. Generate one with `openssl rand -base64 24` and keep it out of chats, slides and screenshots. |

Both are server only. Changing them on Vercel needs a redeploy to take effect.

## Before the presentation

1. Set both variables and redeploy (or restart the local dev server).
2. Open `/demo` in the presenting browser and enter the presenter key. This unlocks demo mode in that browser for 12 hours. Other visitors see nothing.
3. Go to `/login`. A **Demo mode** panel lists the demo accounts. Choose the demo Mentee.

## During the presentation

- The **Demo mode** bar at the top of every workspace page shows who you are signed in as and switches to any other demo account, keeping you on the same page.
- A suggested flow: as the Mentee, send a request from Discover. Switch to the Mentor on the Requests page, accept it, then switch back to show the connection and its next steps.

## Afterwards

1. Select **End demo mode** in the bar (or on `/demo`) to remove the presenter cookie from the browser.
2. Sign every demo account out on all devices, so nobody keeps a demo session after the event:

   ```bash
   node --env-file=.env.local scripts/end-demo-sessions.mjs
   ```

   ```bash
   node --env-file=.env.local scripts/end-demo-sessions.mjs --apply
   ```

   The first command is a dry run that lists the accounts. Point the environment file at the hosted project to clean up the live site.
3. Set `DEMO_SWITCHER_ENABLED=false` and redeploy if demo mode is no longer needed.

## Known limitation

Demo accounts share the live database with real members. A real Mentee can send a request to a demo Mentor, and the presenter will see it while signed in as that Mentor. Keeping fictional and real accounts apart at database level is tracked separately.
