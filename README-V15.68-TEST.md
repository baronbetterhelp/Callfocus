# CallFocus V15.68 Visual Test — Server-Authoritative Credit Repair

Built directly on V15.67.

## Fixes
- General customer-data sync can no longer overwrite the server wallet. Balance, purchase history and wallet usage are now preserved from the server on every normal account/profile sync.
- Manual-payment approval is self-healing. An approved payment whose wallet purchase was lost is re-applied idempotently when Admin Payments or the customer payment-status flow checks it.
- Manual payments can recover to the current email/phone-matched account if an old payment record points at a stale customer ID.
- Admin single-credit grants and Gift All grants now use idempotent ledger IDs plus write verification/retry before success is confirmed.
- Voice-note usage now has a server-authoritative `/api/wallet/consume` path, so normal customer-data sync no longer needs to carry wallet mutations back to KV.
- Voice-note generation now requires the existing signed-in customer session and verifies that server credit is available before generation.
- Admin assets now use the current build version so the portal does not keep serving an older cached JavaScript build.

## Why this was needed
The old full-account sync still carried the browser wallet. With Workers KV replication and multiple devices/locations, an older browser snapshot could overwrite a newer server-side credit write. That could make an approved manual payment or admin gift appear successful while the customer later saw the old balance again. V15.68 removes the browser wallet from normal sync and makes server credit mutations verifiable and recoverable.

No pricing, Paystack credentials/configuration, Cloudflare bindings, AI/voice providers, account authentication model, or KV namespace was changed.
