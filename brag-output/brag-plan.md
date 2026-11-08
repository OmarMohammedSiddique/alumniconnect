# Brag Plan: AlumniKonneQt

## Planning rubric
1. App: an independent academic prototype connecting Kenya Airways alumni and eligible participants through profile-based mentor recommendations, search and mentorship requests.
2. Strongest grounded line: “Shared experience. New horizons.” No numerical matching-quality or mentorship-success claim.
3. Visual hook: the real flight-loop wordmark and a bold crimson horizon rule across warm white, with the actual community photo.
4. Product material: source-derived profile fields, MentorCard shared-skill chips, RequestButton and confirmation copy. All demo names and profile content are fictional.
5. Shortest satisfying film: 25 seconds, allowing the recommendation and request to read clearly.
6. Tone: polished, a quiet premium product film about finding common ground.
7. Audio: warm rhythmic music with three soft card accents and one quiet button click. No voiceover.
8. Share caption: Introducing AlumniKonneQt: shared experience, new horizons. An independent academic prototype for discovering Mentors, exploring common ground and starting a mentorship conversation.
9. Flow: profile goals and skills → mentor discovery with shared-skill context → mentorship request confirmation. Request sent is not acceptance.

## The angle
A crimson flight path connects ambition to experience. The middle shows the working flow in enlarged, source-derived UI, rather than a list of marketing promises. A small “Illustrative demo” label distinguishes fictional examples from a live session.

## Hook
“Shared experience.” lands immediately; “New horizons.” appears beneath it by 0.55 s. The real community photo fills the right half and the flight-loop wordmark establishes identity.

## Visual identity
Background #FFFFFF and #F8F8F8; ink #0D0D0D; accent #ED1C24. Small red text uses #CE171F for legibility. Geist variable font copied from the app's own locally built font assets. Original logos and community photo are unchanged.
LOOK: white editorial stage, crimson #ED1C24 rules, #0D0D0D ink, Geist 600/700 at 72–112 px, 2 px borders, 0 px UI corner radius, 96 px margins, 42 px product labels.
BANNED: glass panels, purple gradients, particle fields, invented scores, unverified superiority claims, real member data.

## Format and duration
Landscape, 1920×1080, 30 fps, 25 seconds.

## Music cue guidance
Happy Beats / Business Moves Vol. 1 by Sascha Ende, 120.19 BPM. Preset read from brag/assets/music/cues. Bed starts at source 0. Sequential profile chips at 4.02, 4.53, 5.03; card accents at 8.02 and 9.02; request confirmation at 17.02 is strong-cue locked. Final identity arrives at 20.02. Respect readability ahead of rhythm. Music fades out in final 1.5 seconds. Credit accompanies the deliverable and appears in the end card.

## Storyboard
### 1. Shared experience (0–3.5 s)
Real wordmark, two-line hero, source community photo. The crimson rule extends horizontally. Soft reveal, no typing. Music opens gently.
### 2. Your starting point (3.5–7.5 s)
“Tell us where you want to go” beside enlarged profile UI. Skills: Data analysis, Python. Bio: Growing into an analytics role. Chips enter sequentially at 4.02/4.53/5.03 and hold together. Fictional illustrative inputs. One soft sound per reveal. Camera stays fixed after arrival.
### 3. Common ground (7.5–13.5 s)
“Find people who understand” beside a source-derived mentor card for fictional Demo Mentor Maya. Shared skills are displayed with grounded explanation wording. Primary card enters, then shared-skill chips and Request mentorship action settle. No match percentage, model-quality score or claim of guaranteed suitability.
### 4. Reach out (13.5–19.5 s)
“Start a conversation” beside the same card enlarged into the real Introduction/Send request flow. Simulated pointer clicks Send request at 16.02, confirmation lands at 17.02 and holds. Exact text: “Request sent. Track the response on your requests page.” One click and a soft confirmation accent. No inference that the Mentor accepted.
### 5. New horizons (19.5–25 s)
Crimson brand plane carries the actual white logo. “A conversation can change what comes next.” Then alumnikonneqt.com and “Join the network”. Persistent independent academic prototype disclosure, no official airline endorsement. Music fades and the end card holds.

## Provenance and limits
Sources: app/(marketing)/page.tsx, components/brand.tsx, app/globals.css, app/layout.tsx, app/(dashboard)/discover/mentor-card.tsx, request-button.tsx and lib/mentor-explanation.ts. The flow is a source-derived animated illustration, not a browser test or human evaluation. Supports issue #31 demonstration materials only; all final release and research criteria remain unchanged.

## Build notes
HyperFrames 0.9.22 is already cached locally; use its CLI directly because npm offline resolution has no registry cache. Registry discovery was attempted but DNS access failed, so bespoke product visuals are derived from source. Audio-reactive helper will be attempted; record any unavailable dependency and retain a restrained static art direction if necessary.
