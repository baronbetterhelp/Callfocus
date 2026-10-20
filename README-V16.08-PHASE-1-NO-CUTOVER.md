# CallFocus V16.08 Phase 1 — D1 staging foundation (NO LIVE WALLET CUTOVER)

Base: V16.07 complete source.

## What changes
- `wrangler.jsonc`: ADD ONLY a D1 binding `CALLFOCUS_WALLET_DB` for the dedicated `callfocus-wallet` database ID supplied by the site owner.
- `migrations/0001_wallet_schema.sql`: proposed empty wallet, journal, account mapping, funding intents and webhook inbox tables (copied from validated blueprint).
- Existing `_worker.js`, `admin.js`, all customer pages and payment/wallet logic are UNCHANGED. KV remains the sole operational wallet until later reviewed cutover.

## Safe test procedure
1. Backup existing Cloudflare KV and production configuration before any wallet migration.
2. Add only the changed `wrangler.jsonc` and `migrations/0001_wallet_schema.sql` to the V16.07 repo (or the complete ZIP to a V16.07 checkout).
3. In Cloudflare, verify the database ID refers to the newly created `callfocus-wallet` database, not another project.
4. OPTIONAL, once verified, apply the schema to the EMPTY D1 database ONLY: `npx wrangler d1 execute callfocus-wallet --remote --file=./migrations/0001_wallet_schema.sql`. This creates empty tables, it does not import balances or transfer money. NEVER run against production KV or another site's D1.
5. Preview with `npx wrangler versions upload` and test existing app workflows. DO NOT promote based on this staging package alone; it intentionally DOES NOT fix wallet concurrency, failed notifications, or balance discrepancies.

## Remaining implementation before any automatic PocketFi activation
- Inventory and reroute ALL wallet deposits, call/voice/video charges and refunds, referral and admin grants, manual approvals, KoraPay and Paystack postings to one D1 authority.
- Implement transactional debits/credits and unique payment references with replay tests.
- Export, audit and reconcile KV data; seed D1 in a controlled maintenance window; verify 100% balances and operations.
- Implement a durable signed PocketFi inbox, correct header handling, confirmation, and replay/recovery.
- Test double submissions, concurrency, idempotency, insufficient balances, rollback, and late transfers.
- Only then configure PocketFi webhook and switch user funding ON after one verified end-to-end test.

Important: changing D1 bindings for a Cloudflare Worker can produce a new preview version. Do not mistake that for a migration or a wallet repair.
