# CallFocus V11.29 — Compact Call History Fix

Built on the V11.28 complete build.

## This fix only changes the visible call-history list inside an opened Recent Calls conversation

- restores the approved compact V11.23-style list pattern
- each call shows only a brief call detail, CALL number, date, time, duration, and copy icon
- removes the large per-call cards, voice/status/opening chips, and full conversation details from the list view
- hides internal-looking CALLFOCUS_CONFIG text as `Call session`
- newest calls appear first
- adds a defensive renderer so route restoration or account hydration cannot repaint the old large-card history
- preserves V11.28 multi-route navigation and V11.22 Paystack reconciliation behavior

No payment, realtime-call, voice-note, admin, or account logic was changed.
