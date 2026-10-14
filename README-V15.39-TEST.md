# CallFocus V15.39 Visual Test — Live Interrupt & Redirect

Built directly on **V15.38 Visual Test**. Stable V15.16 remains the approved stable base unless a visual-test build is explicitly promoted.

## Changes

- Added a dedicated **Interrupt** control to the live-call screen without disturbing the existing 3 × 2 circular control grid.
- The control appears only after the live conversation has actually started.
- Tapping Interrupt requests an immediate spoken turn that opens with a short natural interjection and redirects the conversation toward the current call topic/purpose.
- The interrupt instruction explicitly avoids mentioning credits, cost, CallFocus, AI, prompts, or the button itself.
- Interjection wording is intentionally varied instead of forcing the same phrase every time.
- A 6-second cooldown prevents accidental repeated taps from creating overlapping interruption turns.
- Interrupt is blocked while the call is on Hold or already ending naturally.
- A rejected interrupt request is handled as a recoverable control error and does not tear down an otherwise healthy call.
- Added matching Pearl and dark-theme styling, including an active waveform state while the interruption is being requested.

## Unchanged

V15.38 server-authoritative live-call credit enforcement, calls, voice notes, payments, referrals, authentication, admin controls, saved information, Recent Calls, translation transcript and all other existing behavior remain unchanged.

## Build

`15.40-test`
