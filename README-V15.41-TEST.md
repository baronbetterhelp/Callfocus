# CallFocus V15.41 Visual Test — GPT-Live-Safe Redirect Controls

Built directly on **V15.40 Visual Test**. Stable V15.16 remains the approved stable base unless a visual-test branch is explicitly promoted.

## Fixes

- Fixed the critical bug where tapping **Redirect naturally** or **Interrupt now** could create a recoverable live-control error that older CallFocus handlers incorrectly treated as a dead server, disconnecting the call and returning the customer to the Recent Calls retry screen.
- Removed the V15.40 redirect controls' generic Realtime control events (`conversation.item.create`, `response.create`, `response.cancel`, `input_audio_buffer.clear`, and `output_audio_buffer.clear`) from the redirect feature.
- Rebuilt both controls using the GPT-Live event family already used successfully by CallFocus natural ending: `session.instructions.append` and `session.commentary.append`.
- **Redirect naturally** now appends a one-turn redirect rule and waits for the next normal spoken reply. It does not cut off the other person.
- **Interrupt now** immediately stops the local microphone feed to the live session, appends an immediate redirect rule, then sends a spoken commentary trigger so CallFocus takes the floor and redirects the conversation. Microphone listening resumes after the interruption response, with a safety timeout if transcript completion is delayed.
- Redirect-control errors are intercepted before legacy fatal error handlers. A rejected redirect now leaves the call connected and shows a recoverable message instead of “Server unavailable.”
- The dual-button design and custom SVG icons are preserved.

## Unchanged

V15.38 server-authoritative live-call credit deduction, calls, payments, referrals, account data, admin controls, voice notes, Recent Calls, themes and other customer behavior remain unchanged.

## Build

`15.41-test`
