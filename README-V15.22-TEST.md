# CallFocus V15.22 Visual Test — Smooth Scroll & Fast Paint Pass

Built on V15.21 Visual Test. V15.16 remains the approved stable base unless this visual branch is explicitly promoted.

## Performance work

- Removed scroll-driven parallax updates so scrolling no longer writes hero transforms every frame.
- Added a lightweight scroll-performance state that temporarily pauses decorative infinite animations while the finger is actively scrolling, then resumes them after scrolling stops.
- Added `content-visibility: auto` and intrinsic size estimates to the long Home sections so distant content is not fully painted until it approaches the viewport.
- Reduced the animation scheduler prewarm margin so fewer offscreen visual systems run simultaneously.
- Deferred desktop pointer-tilt initialization until browser idle time.
- Simplified the mobile hero grid by removing its mask and reducing density/opacity.
- Removed redundant nested animations inside the three mobile quick-tool cards while preserving the card-level motion.
- Removed the floating help ring drop-shadow filter on phones and while scrolling.
- Reduced large mobile card shadows.
- Replaced the Google Fonts request with variable weight ranges and reduced the main transparent logo from 512 px to an optimized 256 px asset.

## Preserved

The V15.21 stretch/fade credit or create-account panel, one-time Start a new call cursor cue, moving Pearl geometry, kinetic hero copy/buttons, long-form visual sections, Quick Start promo manager, referrals, calls, payments, credits, authentication, saved information, voice notes and Recent Calls remain intact.

Build identifier: `15.22-test`.
