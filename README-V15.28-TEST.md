# CallFocus V15.28 Visual Test — Independent Promo Display Scheduling

Built directly on **V15.27 Visual Test**. Stable V15.16 remains the approved stable base unless a visual-test branch is explicitly promoted.

## What changed

- Promo items are now controlled in two stages: first enable the promo itself, then independently allow it in the **Popup panel**, **Floating promotion tab**, or both.
- YouTube and Telegram each have independent **Promo on / Popup / Floating** switches.
- Every custom promo now has the same **Promo on / Popup / Floating** switches.
- The popup panel and floating circle now have separate global enable switches.
- The popup has its own opening delay and optional closing time.
- The floating circle has its own opening delay and optional closing time.
- The popup panel and floating circle can be active at the same time when both schedules overlap.
- Leaving a closing-time field blank (or 0) keeps that display method available instead of automatically hiding it.
- The old 120-second opening-delay cap has been removed from the admin UI, frontend normalization, and server sanitization. Opening delays now have no CallFocus-imposed maximum.
- Existing V15.15-era settings migrate automatically: the old popup delay/auto-hide values become the popup schedule, and the floating button initially follows the old popup completion timing unless new floating timing is saved.
- The floating circle rotates only promos enabled for **Floating**. Tapping it opens only those floating-enabled promos. The automatic popup contains only promos enabled for **Popup**.

## Unchanged

V15.27 dark/light theme isolation, calls, credits, payments, referrals, authentication, saved information, screenshot controls, voice notes, Recent Calls and backend call behavior remain unchanged.

## Build

`15.29-test`
