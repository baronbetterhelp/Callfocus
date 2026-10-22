# CallFocus V16.18 — Credit Integrity Safeguards (Changes Only)

**Base:** current GitHub `baronbetterhelp/Callfocus`, branch `main`, checked on 2026-10-21; these base blobs are exactly the same as the V16.17 stable-no-voice-cloning source:

- `_worker.js` — `e2715dccd9147245991c8a54217f37e5bcb8e456`
- `callfocus.js` — `d163642e6aa29c3d988d96c242034f543c3c194d`
- `admin.js` — `91de44c410b277c4868265020f66a804d78b3373`

## Changes within the three files

1. KoraPay settlement confirmation verifies with the provider, validates the original quote, and reconciles a previously processed payment if its wallet purchase ledger entry was lost. A full/pruned 250-entry ledger or mismatched receipt is **held for manual review**, not automatically credited. For new checkouts, subsequent account loads also check the latest settled KoraPay receipt for a missing purchase ledger and request fresh provider verification before repairing.
2. Wallet return checks keep pending KoraPay references rather than erasing them, and the server saves an optional last-checkout reference so legitimate return requests can recover from missing browser session state. Verification and webhooks remain provider-authoritative.
3. The shared verified-receipt recovery is also used for PocketFi hosted checkouts and Flutterwave after a provider-verified success, with duplicate protection and review guards.
4. Admin credit grants use a stable request ID across retries (same browser tab/amount/user), preventing accidental double grants from a timeout. After a verified grant, a separate KV receipt is saved; the customer account GET can restore the grant once if a later account write overwrote its wallet ledger entry. A pruned 250-item usage ledger is not repaired automatically.
5. Account-profile syncs refuse to recreate a missing server wallet from an old browser snapshot. The server also refuses to create a new zero wallet inside an existing customer's wallet write when KV temporarily returns nothing. Added a wallet revision re-check to reduce the window for overwriting concurrent changes.
6. Login/session and notification responses reject a missing wallet instead of showing an invented zero balance.

## Deployment

- **Backup current source first.** Upload only `_worker.js`, `callfocus.js`, and `admin.js` to the repository root of the **matching base**. Leave all other files unchanged.
- Upload through Cloudflare as a **preview version** first; `wrangler versions upload` alone does not route it to production. Verify existing logins, account sync, admin credits, existing payment methods, call/voice-note credit usage, and KoraPay return using transaction references already paid. Do not repeat a real charge merely for testing.
- Only promote to production after confirming the preview behaves as intended and that the real production KV binding is preserved. No new D1 schema, bindings, migrations, secrets, or wallet migration are needed.
- On customer support cases, locate the **exact KoraPay reference**, compare provider paid status/amount and customer wallet journal, and resolve any `ledger_pruned_review`, `receipt_mismatch`, or `wallet_unavailable` warning manually. Do not add credits again without confirming the underlying transaction and balance.

## Important limitations

This is a **mitigation**, not a complete transactional replacement. The current Cloudflare KV customer wallet uses read-modify-write without atomic compare-and-swap; a payment, admin grant, account sync, video refund or live-call usage can still overlap across Worker instances. Receipt recovery is conservative to reduce risk of duplicate funds, but cannot guarantee all concurrent debits/credits will be accounted for. **The final durable fix requires a carefully audited D1 authoritative-wallet cutover for ALL balance mutations, with per-customer migration and reconciliation.** The existing D1 staging scaffold is *not* activated by this patch.

Existing historical payments and grants whose KV entries and records were already lost cannot automatically be reconstructed from this release; reconcile those manually using provider receipts and available account logs. This ZIP has no ability to change live balances by itself.

## Validation

- `node --check` passed for all three modified JavaScript files.
- Isolated KV mocked tests passed: lost KoraPay ledger restored after provider confirmation, no double credit on retry, confirmed admin grant receipt recovered once, and missing server-wallet sync refused.
- No live Cloudflare account or live payment was modified/tested here.
