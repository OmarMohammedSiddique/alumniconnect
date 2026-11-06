# Mentor explanation acceptance, issue #17

PR #42 introduced visible, mode-specific recommendation explanations. This follow-up completes the card accessibility and edge-case review. It does not change candidate retrieval, models, vectors, filters or ranking.

## Changes and local evidence, 6 November 2026

- Cards expose a named article and a visible explanation group. Returned shared-skill labels are trimmed and deduplicated without inventing skills or reasons. Missing/blank evidence produces the explicit no-exact-overlap explanation. Keyword results retain their distinct retrieval explanation.
- The suitability limitation remains visible text without a hover requirement. Model comparison displays rank separately from secondary, decimal profile-text similarity. Missing, non-finite and out-of-range cosine values display `Unavailable`.
- Shared-skill badges use the existing neutral information palette. Measured dark-mode contrast improved from 4.38:1 to 18.38:1. Connected status improved from 1.06:1 to 18.26:1 in light mode. The dark-mode limitation text measured 9.39:1.
- The biography disclosure has unique `aria-controls`, live `aria-expanded`, a 44px target and a visible 2px focus outline. Enter toggled expansion and collapse in the browser. Article names and explanation groups exposed the expected wording through the browser accessibility tree.
- Unbroken names, headlines, skills, explanations and expanded biographies wrap within the card. The same extreme-content fixture had 6,592px document width at a 320px viewport before correction, and 320px afterward. Corrected cases also fit 375, 768 and 1366px viewports.
- All 169 Node tests passed after adding evidence, mode, malformed/empty-label and invalid-score regressions. ESLint and TypeScript passed. A fresh Webpack production fixture build rendered both baseline and corrected cards with zero browser errors. Earlier development hot-reload mismatches were not accepted as production evidence; the clean production rerun passed.

The temporary fixture used only fictional display values: shared Python/SQL skills; no shared evidence and a missing score; keyword retrieval with an invalid score; whitespace/duplicate labels; and long unbroken names, headlines, biographies and skills. The fixture route, its baseline component and its enabling flag are excluded from the release source. Screenshots below retain the rendered results.

## Authenticated hosted baseline and release checks

An isolated loopback read-only proxy established a normal Supabase Auth session for the existing marked fictional Demo Mentee, without exposing credentials in the browser. It forwarded the hosted application's UI/assets and read-only matching requests unchanged, captured returned order privately, and blocked application mutations. It does not substitute synthetic matches for hosted data.

The deployed baseline returned five Recommended Mentors, including shared-skill and no-exact-overlap cases. Python keyword search returned two profiles with the keyword explanation. Both model comparison payloads and the Recommended payload were retained privately for ordered-result comparison after release. No profile, relationship, embedding, schema or notification setting was changed for this review.

After release, compare ordered IDs from the same account and candidate pool, verify the rendered results and keyword order, review desktop/mobile and keyboard behavior, and record the deployed commit and outcome on #17. Local fixtures alone do not prove hosted ordering or release completion.

Accessibility evidence consists of actual keyboard activation, visible focus, native browser accessibility-tree wording/relationships and contrast measurements. No native VoiceOver/NVDA listening session or physical touchscreen study is claimed. These are interface checks, not participant or model-quality evidence.

## Retained screenshots

The baseline is the deployed PR #42 implementation before this follow-up, not a reconstructed screenshot of the older percentage-badge design.

- [Hosted baseline, desktop](evidence/issue17/before-desktop.jpg)
- [Hosted baseline, mobile dark mode](evidence/issue17/before-mobile-dark.jpg)
- [Hosted keyword baseline](evidence/issue17/before-keyword-mobile.jpg)
- [Synthetic baseline, 320px](evidence/issue17/before-edge-320.jpg)
- [Corrected production fixture, 320px](evidence/issue17/after-edge-320.jpg)
- [Corrected production fixture, desktop](evidence/issue17/after-edge-desktop.jpg)
- [Corrected production fixture, expanded long content in mobile dark mode](evidence/issue17/after-edge-mobile-dark.jpg)

The only profile data pictured in hosted screenshots belongs to clearly labelled fictional demo accounts. Credentials and private member profiles are not included.
