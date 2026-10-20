# CallFocus V16.08 Phase 2 — Transactional Wallet Engine (STAGING ONLY)

Build directly on **V16.08 Phase 1** (which was built on the complete V16.07 source).
This phase prepares, but does NOT activate, D1 balance accounting.

## What changed

1. `_worker.js`: added an isolated D1 wallet engine with `cfD1WalletPost` and `cfD1WalletSetBalance`. It executes atomic, sequential `D1.batch` insert/update transactions, with:
   - A unique journal entry ID and unique `(provider, provider_reference)` for idempotency.
   - A balance update only if a brand-new journal entry is inserted (`changes() = 1`).
   - An account-migration audit gate: operations require `wallet_migration_audit.import_state='verified'`.
   - Rejection of insufficient-balance debits, conflicting duplicate references, unsafe decimal amounts, and missing accounts.
   - An explicit non-default environment guard (`CALLFOCUS_D1_WALLET_WRITES_ENABLED`) AND no web routes that invoke the mutating functions.
2. `_worker.js`: added **Admin authenticated, GET-only**, read-only `GET /api/admin/d1-wallet/preflight` to report D1 binding and schema presence; with optional `?userId=<existing-user-id>` to compare one stored KV wallet against a seeded D1 account after migration. The endpoint does not import, credit, debit or change anything.
3. `_worker.js`: version route reports `16.08-phase2-staging` to distinguish a new preview.
4. `tests/wallet-d1-phase2.test.mjs`: Node SQLite-backed, local-only tests, no network calls.
5. No customer UI, billing, voice, video, Admin approval, balance, referral, callback, provider, KV, or Worker settings were otherwise changed. The D1 binding and SQL schema from Phase 1 are unchanged.

## Crucial: what has NOT been done

- Not a production wallet fix and NOT a production cutover.
- D1 wallets have not been seeded from the production KV store, audited, or activated.
- Live customer payment/debit/refund/admin actions still run their original KV code. These operations are NOT connected to the new D1 functions yet, even if the database binding appears in Production.
- Do NOT create or set `CALLFOCUS_D1_WALLET_WRITES_ENABLED` in Cloudflare. That guard is intended only for a later, audited migration and routing update; simply enabling it now will not fix payments.
- No PocketFi webhook configuration or replay. Do not enable automatic PocketFi funding based on this phase.

## Safe preview procedure

1. Existing repository contains Phase 1 `wrangler.jsonc` binding and `0001_wallet_schema.sql`. Since the user uploaded their SQL to GitHub's repository root, that path is **valid**. No need to move it. The Complete ZIP retains the original `migrations/` subfolder used by the local source; the schema content is unchanged.
2. Upload only the Phase 2 changed Worker and README if Phase 1 files are already committed (or use the Complete ZIP if starting from scratch); keep Cloudflare's `npx wrangler versions upload` workflow. Do not promote to live traffic.
3. Open the Version URL and verify the existing site still works. `GET /api/app-version` should return `16.08-phase2-staging`.
4. Signed-in Admin can visit `https://<VERSION-URL>/api/admin/d1-wallet/preflight`. Until the EMPTY dedicated D1 schema has been applied, `schemaReady: false` and missing tables are expected. If it is already applied, counts will be zero and `schemaReady: true`.
5. **If later authorized**, apply schema to *the dedicated empty CallFocus D1 only*: from repository root `npx wrangler d1 execute callfocus-wallet --remote --file=./0001_wallet_schema.sql` (or `./migrations/0001_wallet_schema.sql` if that is the actual GitHub path). Do not run on any existing unrelated database. Applying schema does NOT import wallets or make D1 authoritative. Do not run this command until approved, because even an empty schema creation is a live database change.

## Local tests

`node --no-warnings tests/wallet-d1-phase2.test.mjs`

Tests use Node's local SQLite driver with simulated D1 bindings. They cover simultaneous payment posting, duplicate webhook reference, conflicting reference, voice debit, insufficient balance, unverified or absent wallet, atomic rollback after simulated interruption, exact Admin balance reset, read-only preflight and disabled guard.

Test scope limitation: they do not execute against actual Cloudflare D1, real Stripe/Paystack/KoraPay/PocketFi, production KV, or real user balances.

## Next phase required before cutover

1. Create full point-in-time KV backup with customer snapshot (wallet seconds, revision, purchases, usage), and reconcile deposits, spending, gifts, refunds and support corrections.
2. Build throttled, resumable migration/import + conflict audit, with 100% verification of >6,000 customers. Store state as `imported`, then mark `verified` only after parity checks.
3. Wire *every* credit mutation path (purchases, KoraPay/Paystack/PocketFi, manual approvals, referrals, Admin gifts/reset, call/voice/video debits and refunds) to **one** database authority. Do not dual-write money to KV and D1 and do not partially switch providers.
4. Ensure the customer balance and transaction screens read D1 after cutover; address currently missing historical deposits with controlled reconciliation, NOT automatic duplicate awards.
5. Test real Cloudflare D1 concurrency, full-failure rollback, account deletes, idempotency beyond KV 250-row history, transaction replay, and safe rollback strategy.
6. After that, configure and safely replay PocketFi webhook events and activate the fixed-account service gradually.

**NEVER promote this staging phase as a payment repair.**
