# CallFocus V16.31 — Mobile live-call connection reliability

**Base:** Complete V16.30. This is a targeted transport-handshake correction, not a provider, model, API, wallet, or pricing migration.

## Changes
- Wait up to 12 seconds for usable WebRTC ICE candidates (the previous 2.5-second short-circuit could send incomplete SDP from slow iPhone/mobile networks). If no candidates exist, show a network-specific error rather than `connection_error`.
- Bound the call-session POST to 35 seconds and classify offline, network, and timeout failures without exposing tokens or sensitive context. Do not blindly retry POSTs because the provider might have created a billable session before the browser lost the response. Customers can explicitly tap Try again.
- Watch for voice-session readiness after the SDP answer, with a 20-second startup timeout and ICE/peer failure detection. Timers are cleared after `session.started` or cleanup.
- Show microphone-busy and WebRTC-specific troubleshooting instead of the undifferentiated `connection_error` fallback.
- Bust only the `callfocus.js` cache reference in mirrored pages. The voice model and provider session payload, credentials, admin settings, call instructions, and accounting rates are unchanged.

## Testing / limitations
Local syntax, diff, simulated ICE candidate, and error-handling tests should pass before deploying. **No real user call or Cloudflare secret is available in this environment.** This fix cannot guarantee calls during a genuine provider outage, invalid API quota/billing, blocked UDP/firewall, or broken customer Wi-Fi. Admin → Diagnostics → Run diagnostics includes last Live API error code, status, and model access and should be checked if failures continue.

## Deployment
Upload Changes Only over complete V16.30 and test with a real account on a preview Worker with your existing KV. Confirm mobile Safari Wi-Fi and cellular connection, customer-visible error code, first call/continuation, live timer, and unchanged credit deduction. Roll back if any regression is observed.
