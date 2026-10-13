# CallFocus V15.20 Visual Test — Kinetic Content, Lower Lighting

Built on V15.19 Visual Test. This remains an experimental visual branch. Stable V15.16 is unchanged.

## Front-page direction

V15.20 reduces the glow-heavy treatment and moves the visual energy into the actual interface. The first screen now uses lightweight transform-based movement on the headline groups, continuation word/underline, supporting copy, status badge, credit panel, credit action, primary Start a new call CTA, quick-tool cards, quick-tool icons/text and proof area.

The main CTA includes a small animated directional chevron rather than a moving light sweep. The three quick tools gently lift in sequence so the controls themselves feel alive. The credit panel now floats subtly instead of relying on a glint.

## Reduced lighting

- Removed the hero-wide moving light sweep.
- Removed sheen effects from the realtime badge, primary CTA and credit dock.
- Reduced desktop aurora strength substantially.
- On phone widths, the large aurora layers and Pearl hero glow are disabled entirely.
- Mobile geometric architecture remains visible but static and lower-opacity.
- The gold continuation word is now a stable CallFocus gold rather than an animated luminous gradient.

## Performance

All newly-added first-screen motion is based on small transform/opacity animations. Existing V15.19 offscreen animation pausing remains in place, so the hero animation pauses when the hero is outside the active motion zone. Reduced-motion preferences are respected.

## Preserved systems

No intentional changes were made to calls, credits, payments, referrals, authentication, saved information, Quick Start admin controls, voice notes, Recent Calls, or backend behavior.

Build identifier: `15.20-test`.
