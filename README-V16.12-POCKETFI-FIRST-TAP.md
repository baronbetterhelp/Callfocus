# CallFocus V16.12 — PocketFi first-tap availability (TEST ONLY)

Based on V16.11 complete source. Scope limited to the customer PocketFi hosted-checkout button.

- When a first tap sees an unavailable/unknown cached state, wait for the existing `/api/public-config` availability check (or run it once) before rejecting payment.
- Disable the button during that check and during checkout initiation to avoid duplicate starts; restore it if no redirect happens.
- Respect the actual server-side PocketFi switch. This patch does not force-enable PocketFi, issue credit, change callback/webhook, admin, pricing, wallet, KoraPay, or D1.
- Bust the `callfocus.js` URL in `index.html` and `credits.html` so Safari loads the changed handler.
- Existing worker and admin version labels remain V16.11 because no backend/admin file changed.

Only `callfocus.js`, `index.html`, `credits.html`, and this README were changed.

Validation: JS syntax check and ZIP integrity. No real live checkout was performed. Upload Changes Only as a new preview, verify the first tap, then consider promotion.
