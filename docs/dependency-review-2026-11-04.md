# Remaining dependency alerts and issue review

Reviewed on 4 November 2026, starting from main at `d73d299`.
Work branch: `security/remaining-dependency-alerts`.

## Deepmerge: Dependabot #41

[The advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)
reports prototype poisoning in deepmerge 4.2.0 through 4.3.1 and lists no
patched version. The installed copies came only from shadcn and its registry
helper. Application JavaScript did not import the CLI; the application's only
package reference was `shadcn/tailwind.css`.

Commit `b053783` removes that CLI dependency and 160 package paths. It replaces
the stylesheet import with `app/ui-state-variants.css`, retaining the open,
closed and disabled variants used by the existing Base UI select. Unused CLI
animation and decorative utilities are not copied into the application.
No retained dependency version changed during removal.

Deepmerge is absent from the resulting lockfile. This remediates the dependency
locally; GitHub's alert must be rechecked after the change reaches main. No alert
was dismissed and this review does not claim that the deployed site has changed.

## Minimatch: Dependabot #46

[The advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249)
reports pattern amplification during preprocessing and identifies 11.0.1 as
the first patched release. Before the CLI removal, minimatch was also reachable
through shadcn's ts-morph tooling. The remaining lockfile copies are development
dependencies: 3.1.5 in ESLint's toolchain and 10.2.6 in TypeScript ESLint's parser.
There are no remaining production minimatch dependencies.

Registry metadata checked during this review:

| Package | Latest version | Requested minimatch range |
| --- | --- | --- |
| minimatch | 11.0.4 | Patched package |
| eslint | 10.14.0 | ^10.2.6 |
| @eslint/config-array | 0.23.5 | ^10.2.4 |
| @typescript-eslint/typescript-estree | 8.72.1 | ^10.2.2 |

Even the latest upstream lint toolchain does not yet request version 11 by default.
A blanket override across the whole tree would disrupt legacy version 3 callers.
However, a scoped override targeting `@typescript-eslint/typescript-estree` upgrades
its internal `minimatch` dependency to `^11.0.4` while preserving unaffected version 3
paths.

### Remediation via Scoped Override (4 November 2026)

- Added scoped override in `package.json`:
  ```json
  "overrides": {
    "@typescript-eslint/typescript-estree": {
      "minimatch": "^11.0.4"
    }
  }
  ```
- Resulting `npm audit`: `found 0 vulnerabilities` (down from 8 moderate severity package entries).
- Production build: Next.js Turbopack production build compiled successfully.
- Code quality & regression: `npm run lint`, `npm run typecheck`, and all 65 unit tests passed.

## Verification

- `npm run check` passed lint, route type generation, TypeScript and the default
  Turbopack production build on Next.js 16.4.5.
- All 31 existing unit tests passed.
- Compiled CSS before and after removal has identical declarations for the five
  generated open/closed/disabled utilities. The local variants retain both
  boolean data attributes and data-state selectors.
- Full npm audit after removal: 16 moderate package entries, zero low, high or
  critical entries. These remaining entries trace the minimatch toolchain.
- `npm audit --omit=dev` reports zero vulnerabilities.
- `npm run ml:walkthrough` passed with four finite normalized 384-value vectors;
  the related-meaning software example ranked first at cosine 0.329469.
- Full HTTP/database and authenticated-browser smoke tests were not rerun:
  the local Supabase API was not listening on port 54321 during this review.
  Unit, build and CSS verification do not replace those integration checks.

## Existing issue decisions

Issue bodies, discussions and available repository evidence were inspected.
Only #2 met every acceptance criterion and was closed with verification evidence.
The other issues remain open for the following reasons:

| Issue | Decision and remaining evidence |
| --- | --- |
| #1: final training requirement | Written supervisor decision, permitted initialization/data and updated requirement traceability are not established in the reviewed evidence. |
| #2: ML guide and walkthrough | Completed: existing guide covers exact functions, tokenization, pooling, normalization, cosine ranking, vocabulary mismatch and oral-defense questions; the executable walkthrough passed again. |
| #3: matching evaluation | Raw rankings, independently reviewed judgments, dataset freeze and final verified comparisons remain outstanding. |
| #4: cold-start journey | Local workflow evidence exists; measured signup-to-first-match latency, success rate and coverage, plus automated browser coverage, remain outstanding. |
| #5: usability/SUS | Representative participant sessions and de-identified SUS results are not evidenced in the reviewed files or issue discussion. |
| #6: chapter evidence pack | The ML guide contributes evidence, but the full current diagrams, actual chapters and research-question results are not established here. |
| #7: jobs/cohorts/events scope | Implemented workflows or a documented supervisor-approved scope amendment remain outstanding. |
| #8: deployment/runtime | A live deployment exists; separate hosted environments, measured model cold starts, bundle assessment and full role-specific hosted smoke evidence remain outstanding. |
| #9: GitHub evidence | The worklog records genuine commits, but the agreed-date Insights graph and complete issue/board/sprint evidence package are not established here. |
| #13: dependency follow-up | Deepmerge removal is committed locally. Minimatch remains in development tooling; main/Dependabot recheck and integration acceptance remain open. |

Open status means the complete acceptance criteria were not evidenced in this
review. It does not claim that no related work exists outside the repository.
