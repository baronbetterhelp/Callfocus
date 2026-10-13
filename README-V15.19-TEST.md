# CallFocus V15.19 Visual Test — Alive Hero & Mobile Performance Pass

Built on the V15.18 visual-test branch. Stable V15.16 remains the approved production fallback unless this experimental branch is explicitly accepted.

## What changed

- The first-screen hero now feels more alive without adding heavy canvas/video effects.
- The gold `continuation.` word has a soft animated metallic shimmer and living underline.
- The supporting hero copy gets a subtle pulsing accent rail.
- The realtime status pill receives a low-frequency sheen pass.
- `Start a new call` gets a lightweight breathing transform and periodic sheen.
- The three quick-tool cards have staggered icon breathing and moving top accents.
- The credit dock has a very slow glint and gently animated phone icon.
- The small proof avatars and star line have subtle motion.

## Performance work

- Mobile scroll parallax is disabled entirely.
- Scroll-reveal fallback no longer forces layout checks on every scroll frame when IntersectionObserver is available.
- The manual reveal fallback is throttled for older Safari behavior.
- Long-form motion zones and individual animated cards/stages automatically pause while offscreen and resume near the viewport.
- Phone hero stage animation pauses while it is below the fold even when the main hero is visible.
- Background grid drift is disabled on phones.
- One of the large mobile aurora layers is removed and mobile blur filters are disabled.
- Mobile background/architecture animation rates are reduced while the visible text/buttons receive more purposeful motion.
- Existing blur-free V15.18 reveal behavior remains.

## Preserved

Calls, credits, payments, referrals, authentication, saved information, Quick Start admin controls, voice notes, Recent Calls, live-call behavior and backend logic were intentionally left unchanged.

Build identifier: `15.19-test`.
