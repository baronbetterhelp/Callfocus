# CallFocus V15.21 Visual Test — Stretch Dock, Guided CTA & Living Geometry

Built on V15.20 Visual Test. This remains an experimental visual branch.

## What changed

- The Home credit / create-account panel now enters with a stretch-and-fade animation, including staggered icon, copy and action-button settling.
- After that entrance, a decorative cursor cue appears over **Start a new call**, taps/marks the button once, and disappears. It never triggers an actual click.
- The Pearl background geometry now stays subtly alive indefinitely on phone and desktop widths using long-duration transform-only motion.
- The background grid also gets a very slow compositor drift instead of remaining completely static on phones.
- Existing V15.20 kinetic text, CTA and quick-tool motion remains.
- Reduced-motion preferences disable these new animations.

## Performance intent

The new background motion uses transforms and long timings rather than glow, blur, or fast repaints. The visual branch keeps the V15.19/V15.20 offscreen-pausing and reduced-lighting approach.

## Unchanged

Calls, voice notes, credits, payments, referrals, authentication, saved information, Recent Calls, Quick Start admin controls and backend behavior are intentionally unchanged.

Build identifier: `15.21-test`.
