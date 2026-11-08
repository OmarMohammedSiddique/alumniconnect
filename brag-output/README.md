# AlumniKonneQt launch film

A polished, 25-second, landscape film following profile creation, mentor discovery and a mentorship request. The original product logos, community image, palette and Geist typography establish the identity. The UI is an animated illustration derived from project source, with clearly labelled fictional examples.

## Deliverables

- `brag.mp4`: 1920×1080 H.264, 30 fps, AAC audio, 25 seconds.
- `brag.jpg`: settled opening hero at 2 seconds, also baked into the first video frame.
- `share-copy.txt`: accompanying post caption and music attribution.
- `composition/`: editable HyperFrames project with local assets.
- `brag-plan.md` and `composition-brief.md`: creative direction and production notes.
- `verification.md`: local validation results and limitations.

## Edit and render

Use Node.js 22 or newer, FFmpeg and Chrome. HyperFrames is pinned to 0.9.22 in the project scripts. Inside `composition/`, run `npm run dev` to preview, `npm run check` to validate and `npm run render` to render. Rendering and browser checks need permission to launch Chrome on a sandboxed host.

The existing machine's cached HyperFrames CLI was used directly for this run because npm offline resolution had no registry response cached. No new package was installed and no cloud rendering or publication was used.

After a re-render, extract the chosen poster at 2 seconds, then replace only frame zero with that poster using the overlay method documented by the brag skill. Keep audio, duration and frame count unchanged.

## Credits

Music: “Happy Beats / Business Moves Vol. 1” by Sascha Ende, [ende.app](https://ende.app/en), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Edited to a 25-second excerpt, mixed at reduced gain, with entrance and exit fades. Credit is included in the video and share caption.

Sound effects: Kenney, [CC0](https://kenney.nl/assets), from the brag skill's bundled library.

Community photography: the existing project asset from [Unsplash](https://images.unsplash.com/photo-1521737711867-e3b97375f902), under the [Unsplash license](https://unsplash.com/license). It illustrates collaboration and does not identify members or airline staff.

Logos and Geist font are copied from the existing project assets and locally built font bundle. GSAP 3.15.0 is copied from the cached HyperFrames runtime with its embedded license notice.
