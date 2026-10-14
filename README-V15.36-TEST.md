# CallFocus V15.36 Visual Test — Noticeable Repeat Scroll Reveals

Built directly on **V15.35 Visual Test**. Stable V15.16 remains the approved stable base unless the visual-test branch is explicitly promoted.

## Changes

- Slows Home scroll-entry animations so panels are clearly noticeable instead of flashing into place.
- Reveal panels now reset only after fully leaving the viewport and animate again when they re-enter.
- Re-entry works while scrolling both down and back up.
- Scroll direction affects the entrance direction: panels rise into place while moving down the page and settle downward into place when returning upward.
- Extends the reveal system to additional major Home panels such as the phone continuity stage, trust strip, motion ribbon and recent-thread preview container.
- Keeps animation work limited to opacity and transforms to preserve the V15.22+ smooth-scroll performance work.
- Reduced-motion preferences continue to disable decorative reveal movement.

## Unchanged

Calls, credits, payments, referrals, authentication, saved information, admin controls, customer notifications, Quick Start, voice notes, Recent Calls and backend behavior are unchanged.

Build: `15.37-test`
