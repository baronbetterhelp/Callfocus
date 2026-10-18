# CallFocus V15.93 — Signed-In Credit Bonus Popup and Direct Funding Route

**Authoritative base:** complete V15.92 source, not a rollback or partial patch.

## Intentional scope
- Replaces only the customer-facing bonus promotion popup design, messaging and navigation behavior. No single ₦10,000 offer/example appears in the popup; it describes the editable percentage for all eligible purchase amounts.
- The popup can appear only when both the bonus promotion and popup are enabled **and** a customer session is authenticated/ready on the home view. This includes newly verified signups after the account-ready event; logged-out visitors never see it. The existing admin-configured opening and closing timers remain in effect.
- Deposit now navigates to the existing Call & Voice Credits view, then scrolls directly to the existing `creditPurchaseSection` amount-selection and payment controls instead of reloading `/credits` at the page top.
- Existing customer package-specific bonus amounts remain visible on the purchase page. No changes to any payment, wallet, verification, pricing, login/signup, admin, or other logic.
- Preserves V15.92 admin controls, maintenance mode, KoraPay/manual toggles, Quick Start, provider settings, KV, routes, secrets, and safe Cloudflare `npx wrangler versions upload` deployment.
- Consistent cache/build tokens updated to `15.93-test`.

## Testing and release
- Test the new Cloudflare Version URL on iPhone and desktop before manually promoting.
- Check logged-out home: no offer; authenticated home: offer after configured delay; popup Deposit now: active credits purchase packages visible immediately; dismiss and closing timer; admin payment/maintenance/promo controls still present.
- Preview/admin share production KV: don't change switches in an experimental version; turn on promotions only during a controlled live test after promotion.
- Local JS/ZIP and mocked browser tests are not confirmation of actual production/cloud account behavior.
