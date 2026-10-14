# CallFocus V15.42 Visual Test — Mid-Call Continuation & Purpose Cut-In

Built directly on **V15.41 Visual Test**. Stable V15.16 remains the approved stable base unless a visual-test branch is explicitly promoted.

## What changed

- Corrected the meaning of both live-call redirect controls so neither one ever restarts the call opening, greeting, or time-of-day greeting.
- **Redirect** is now an immediate cut-in that resumes CallFocus from the exact conversational point it had already reached on its own side. It uses the current live session history plus the tail of CallFocus’s own spoken transcript to recover its place, then continues forward without repeating the previous sentence.
- **Interrupt now** is now an immediate cut-in that identifies today’s main call purpose from the current call topic/context and jumps straight into the next useful purpose point. It explicitly skips the opening and does not exchange greetings again.
- Both controls temporarily pause outgoing microphone audio while CallFocus takes the floor, then restore normal listening after CallFocus finishes the interruption turn.
- Both controls use only the GPT-Live session instruction/commentary event family already used by CallFocus, and redirect-control errors remain non-fatal while the live connection is healthy.
- The button copy now makes the distinction clearer: **Redirect — Cut in · continue from here** and **Interrupt now — Cut in · jump to call purpose**.

## Example behavior

Wrong: `Hey, good morning darling, so I wanted to know...`

Correct: `Umm, so I wanted to know...`

The call must continue from its current state rather than restarting its script.

## Unchanged

V15.38 server-authoritative live-call credit charging, payments, referrals, admin tools, notifications, voice notes, Recent Calls, themes and unrelated call controls remain unchanged.

## Build

`15.42-test`
