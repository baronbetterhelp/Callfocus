# CallFocus V15.40 Visual Test — Dual Redirect Controls

Built directly on V15.39.

## Changes
- Replaces the single Interrupt control with two custom CallFocus controls: **Redirect naturally** and **Interrupt now**.
- Redirect naturally leaves the speaker uninterrupted and guides the next normal CallFocus reply back to the current call purpose.
- Interrupt now temporarily pauses microphone input to the Realtime session, clears the unfinished incoming speech buffer, cancels/clears any active model output when needed, and creates an immediate redirect response. Normal listening resumes after that forced response completes.
- Uses custom inline SVG icons instead of a platform/iPhone emoji.
- Adds controlled-event error handling and one retry for the forced response so recoverable Realtime control errors do not disconnect the call.
- Keeps V15.38 server-authoritative live call credit enforcement and all V15.39 behavior not related to the interrupt control.

## Build
`15.41-test`
