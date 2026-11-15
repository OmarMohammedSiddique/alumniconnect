# Window Seat local study

Standalone HTML, compiled Tailwind CSS and vanilla JavaScript. No application routes, real authentication, network dependencies, credential storage or bookings. Use fictional input, or the state buttons to skip the form.

From the repository root:

```sh
node previews/window-seat/build.mjs
python3 -m http.server 4173 --bind 127.0.0.1 --directory previews/window-seat
```

Open http://localhost:4173. Generated Tailwind styles are included, so rebuilding is needed only after changing utility classes.

## Direction and review

Product: a fictional flight doorway that turns login into a boarding pass.
Character: calm, airy, precise.
World: aircraft window light, sky and printed flight information.
Moment: the black login button expands into the paper pass.
Signature: a window shade opens when the login card is hovered or focused.
Concept: entering the experience gives you the window seat.

All four requested phases are represented: layouts, sky/material/radii/shadow treatment, input/logo interactions and the shared surface transition. The paper ticket includes a vertical perforation and actual transparent semicircle cutouts. The boarding pass is explicitly fictional. Reduced-motion preference bypasses animations.

The design uses four layered sky-blue shadows, quiet type and neutral controls. No extra promo sections or unsupported claims. The aircraft-window frame uses nested radii; input and button radii are computed from the card radius minus its padding: 48px minus 32px on desktop and 40px minus 24px on phones, both yielding 16px. The morph animates the actual ticket panels from the measured button bounds using Web Animations, with transform-based geometry and a black-to-paper finish.

Design guidance applied from charles-unslop by Charles Liu, adapted from unslop by Damir Sokolovsky (https://github.com/heydamir/unslop), CC BY 4.0. The local aerial cloud asset `clouds.png` was generated with the built-in imagegen tool.

Generation prompt: Photographic aerial view from cruising altitude over soft white cumulus clouds, pale blue sky, horizon in upper third, gentle blue shadows, natural midday light, central room for a glass login card. No aircraft, people, text, logos or UI.

Local only, intentionally uncommitted pending visual approval. No GitHub issue changes were made under the local-only scope. Existing issues #87 and #37 were reviewed and cover separate application work.

## Login microinteractions

The aircraft window clips a strip of four cloud-image tiles. Alternating mirrored tiles create a continuous pair, duplicated to let a 24-second linear CSS keyframe loop move exactly one pair without a jump. No new image assets or remote requests are needed.

The decorative padlock inside the password input lifts and rotates its shackle on password focus, then closes on blur. Password visibility remains a separate labelled button. Reduced motion keeps the clouds still and changes the lock state instantly. These are visual demo interactions, not authentication or password-strength indicators.

## Final ticket motion

The real ticket starts at the black button's bounds and expands for 820ms. The outgoing login fades over the first 240ms, while the ticket panels change from black to paper. Flight details rise 16px into position starting at 460ms, with the route and seat arriving together as the container settles. The perforation appears during the same finishing interval. State controls are temporarily disabled, outgoing fields become inert and focus moves to the pass on form submission. Resizing or enabling reduced motion settles the transition immediately. Motion effects are removed after completion so the transition can be replayed cleanly.

Nested corner radii use shared CSS variables for the card/controls, window frame/view and switcher/buttons. The password visibility button derives elliptical corner radii from its horizontal and vertical insets. Card shadows layer pale sky blue, atmospheric mid blue and deeper cloud-shadow blue, with a broad pale-blue falloff.

## Fly into the window

Before the boarding pass appears, a decorative copy of the window flies toward the viewer for 1.2 seconds, with its cloud strip moving faster. The window fills the viewport, then the sky dissolves over 280ms into the existing button-to-ticket transition. The pass stays hidden until the flight finishes. The overlay clips to the viewport and is removed after the reveal. Reduced motion skips the flight entirely.
