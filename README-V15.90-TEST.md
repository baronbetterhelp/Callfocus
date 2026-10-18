# CallFocus V15.90 — Transactions & Usage Close Button (Visual Test)

Strictly based on the complete V15.89 archive.

## Requested change only
- A circular X button is placed in the top-left blank area of the Transactions & Usage view, on every existing customer-page template.
- The X uses existing `data-route="credits"` navigation to close history and return directly to Call & Voice Credits, without touching the browser back stack or adding any JavaScript handler.
- CSS is limited to `#page-history .history-shell` and `#page-history .history-close-btn`.
- Established build/cache tokens updated from 15.89-test to 15.90-test.

## Unchanged
- All payment processing, Paystack/KoraPay/manual transfers, existing history API and rendering, admin payment switches, website maintenance, credits, balances, referrals, AI, voice, customer sessions and all other functionality.
- `wrangler.jsonc`, KV binding, secrets, routes, email sender, `sw.js`, and upload-only deployment configuration are byte-for-byte unchanged.

## Test and deploy
- Use `npx wrangler versions upload`; do not deploy directly.
- Test on a Cloudflare Version URL first. Open Transactions & Usage; confirm X appears in upper-left and opens Call & Voice Credits when tapped.
- Confirm `/api/app-version` reports `15.90-test`, then manually promote only when satisfied.
- Local syntax/archive/static browser tests do not constitute live payment, Cloudflare, or production browser validation.
