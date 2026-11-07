# CallFocus V16.67 — Immediate Clone Your Voice Opening

## Customer issue
A tap on the homepage Clone your voice button waited on the `/api/permanent-slots/status` request, sometimes 4–5 seconds, before showing any panel.

## Fix
- Open the voice-cloning modal synchronously on the first tap with a safe checking state.
- Record/upload/save remain disabled until reservation and voice availability have been verified by the server.
- Users without a confirmed voice slot transition to the Buy Slot popup using the same server response rather than waiting for a second status lookup.
- If the user closes the modal during a slow request, the pending result cannot reopen it.
- Repeated taps while open do not create duplicate status requests.
- Unauthenticated users get the sign-in dialog immediately.
- Bump the voice-cloning script URL on all nine customer pages to avoid older cached JavaScript.

## Scope
Only the ElevenLabs UI opening sequence and customer-page asset versions are modified. The original OpenAI calling code, payment/wallet APIs, reservations, backend provider routing, and SQL schema remain unchanged. No SQL migration.

## Deployment
Commit the Changes Only ZIP contents to the current GitHub main branch, verify active Cloudflare deployment, then test the clone button on iPhone Safari with both a booked and a not-yet-booked customer.
