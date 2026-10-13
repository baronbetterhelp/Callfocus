# CallFocus V15.26 Visual Test — Theme-Locked Home Panels

Built directly on **V15.25 Visual Test**. Stable V15.16 remains the approved stable base unless a visual-test branch is explicitly promoted.

## Changes

- Fixed the **theme separation bug** on the homepage so each theme now keeps its own matching panel styles.
- The **Pearl / light theme** now keeps the light mobile credit dock and light Live continuity stage instead of inheriting the dark-theme panel treatment.
- The **Black / dark theme** keeps the darker premium mobile credit dock and dark Live continuity stage introduced in V15.25.
- Scoped the mobile panel cleanup rules so they apply **only** when the active site theme is dark.
- Kept the V15.24/V15.25 visual work intact, including the elderly caller portrait for Alex and the full **CallFocus** label inside the context orb.

## Unchanged

Calls, credits, payments, referrals, authentication, saved information, Quick Start admin controls, voice notes, Recent Calls and backend behavior are unchanged.

## Build

`15.26-test`
