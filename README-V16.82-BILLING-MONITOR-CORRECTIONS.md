# CallFocus V16.82 — Billing monitor correction

Changes only the private admin API account tracker. Based on V16.81.

- **xAI prepaid balance**: xAI returns an inverted ledger value in *cents*. Display `-total.val / 100`, not `total.val / 100`. A provider response of `-2200` therefore displays as `$22.00` remaining. A positive ledger value is a genuine negative prepaid balance.
- **OpenAI organization cost API**: HTTP 429 is not enough to distinguish a request rate limit from credit/spending limits. Parse the provider's documented error code and display a safe classification without leaking API credentials or fabricating an available balance. Missing/inaccessible credentials remain distinct.
- **UI**: A temporary provider error no longer means the provider is 'NOT CONNECTED'. Displays 'RATE LIMITED', 'LIMIT REACHED', 'CHECK API LIMIT', or 'UNAVAILABLE' as appropriate.

## Deployment

Upload root-level files from **Changes Only** ZIP to GitHub. Keep the Complete Website ZIP as a backup. No SQL migration, no provider secret changes. Opening / refreshing the dashboard does not spend money or change customer balances. No changes to production voice models, voice cloning, payment processors, or client wallets.

## Verification

On the deployed website, Admin → API Accounts & Billing → Refresh All Accounts. Compare xAI prepaid balance with your xAI Console Billing balance. If OpenAI still returns HTTP 429, use the specific error classification to inspect OpenAI Platform Organization → Usage / Limits; do not rotate an otherwise valid Admin key just because of HTTP 429.
