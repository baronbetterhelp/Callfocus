# CallFocus V16.07 — PocketFi Bank Status & Wallet Proof (TEST ONLY)

Base: complete V16.06; no other payment methods or Admin crediting rules changed.

## Fixes
- `Check payment status` uses authenticated POST `/api/pocketfi/bank/recheck`, reprocessing only a previously signed and saved notification mapped to the signed-in customer. A missing PocketFi webhook **cannot** be independently verified from this endpoint.
- Webhook stores each valid signed notification in the customer latest-event pointer **before** wallet processing, allowing recovery of failures during initial settlement.
- Customer recheck accepts an optional older `PFI|...` reference, but only when the signed event belongs to the signed-in customer and receiving account. It does not overwrite the latest-event pointer for other transfers.
- Read-only `/api/pocketfi/bank/status` returns authoritative current wallet balance and confirms the same reference exists in the wallet purchase ledger. The customer sees an explicit confirmation panel and can open Transactions & Usage.
- If a signed event was previously marked credited but no purchase reference exists in the wallet, the UI flags Admin review, NEVER automatically credits again.
- Pending, unmatched, wrong-amount transfers cannot be credited just because the customer taps Check.

## Important limitation — real payment accounting
Cloudflare KV is not transactional and concurrent wallet writes can overwrite a balance. Seeing a PocketFi purchase in Transactions & Usage but not seeing an expected balance change cannot be safely diagnosed or repaired solely from a screenshot. A ledger entry might have already been spent. Do not add money a second time on that basis. At significant volume migrate wallet accounting to a transactional Durable Object or D1 ledger; coordinate schema and binding changes separately.

## Validation and rollout
Perform `node --check` on `_worker.js`, `callfocus.js`, and `admin.js`; test signed event retries and invalid signatures on an isolated KV mock. Check a pending and a credited event. Do NOT promote until live balance and transaction reconciliation passes. Keep PocketFi bank toggle OFF for general users while investigating older events, but note an existing receiving bank account can still accept deposits regardless of the UI toggle. Do not disable webhook processing for outstanding deposits.
