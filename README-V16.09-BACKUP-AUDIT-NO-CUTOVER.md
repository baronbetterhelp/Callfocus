# CallFocus V16.09 — Encrypted wallet backup and migration audit (NO CUTOVER)

Date: 20 October 2026
Base: **V16.08 Phase 2 complete archive**, not an older site. The existing D1 schema and database binding are retained **unchanged**.

## What V16.09 actually does

1. Adds a manually-triggered **GitHub Actions** workflow named `CallFocus V16.09 wallet backup (manual, read only)`. It reads wallet-relevant keys from your existing `CALLFOCUS_CONFIG` KV namespace, encrypts every captured raw text value with AES-256-GCM and a key derived from your private backup passphrase with scrypt, then verifies the encrypted archive.
2. Creates an aggregate, identity-free `*-summary.json` report: customer/user keys, customer/data keys, missing records, wallet data shape issues, detected cross-customer duplicate payment references, purchase/usage counts, changed records detected by a second read, and the sum of the observed balance seconds. Flagged per-account audit IDs/issue codes are only inside the encrypted archive.
3. Uses Cloudflare's `GET /keys` to enumerate and its documented **read-only** `POST /bulk/get` to read text keys (up to 40 per batch, splitting batches that exceed the size limit). One-key overflow falls back to GET value. It never sends PUT/PATCH/DELETE, never calls the D1 API, never changes a KV value, and never calls PocketFi, KoraPay or Paystack.
4. Updates only the public `/api/app-version` return value to `16.09-backup-audit-staging`. Other `_worker.js` functions and all existing customer UI are byte-identical to V16.08 Phase 2.
5. Adds `.assetsignore` entries to exclude backend-only scripts, tests, workflows and accidental backup files from public Pages assets, while retaining the existing ignore rules. Adds `.gitignore` entries so backups cannot accidentally be staged as source.
6. Adds tests using a simulated Cloudflare API. No network requests or real customer records are used by tests.

## IMPORTANT LIMITATIONS

- The workflow is **not scheduled**. Merely uploading the files does not read customer records. It only starts when you explicitly choose **Run workflow**.
- It does **not** create a D1 account, seed D1 balances, adjust a wallet, activate a webhook, or fix a historical credit discrepancy.
- Cloudflare KV is **eventually consistent**. A scan while users deposit or spend is **not an atomic point-in-time backup**. The second read flags detectable drift but cannot guarantee no intervening operations, especially if a wallet changed and returned to its original value. Any migration needs a controlled final snapshot and reconciliation.
- Scope is wallet-related KV keys only. It is **not** a full-site disaster recovery backup. Other data, uploaded payment receipts, call history, admin configuration and sessions are outside this scope. Wallet purchase/usage histories may already have been trimmed to 250 records; this scan cannot reconstruct missing older financial records.
- The encrypted archive includes private user records (possibly password hashes and phone/email fields). Never upload a decrypted version or the passphrase to GitHub, a public site or a chat.
- GitHub Actions artifact retention in this workflow is **3 days**. Download the artifact securely promptly, keep the encrypted `.cfw09` file and backup passphrase separately in safe storage; verify it before relying on it. A copied ZIP file is not a substitute for an independently reconciled wallet ledger.
- The audit always reports `safeToCutOver: false`. Only a future reviewed import and provider-wide cutover can change that decision.

## How to install without a computer

**Your repo**: `baronbetterhelp/Callfocus`, branch `main`.

1. Unzip `CallFocus-V16.09-Backup-Audit-Changes-Only.zip` in Files or upload the complete ZIP content through your usual GitHub source upload method. Keep `.github/workflows/...` and `scripts/...` subfolders intact. **Do not upload the ZIP file itself as a new source file.** If V16.08 files are already present on main, only the changes-only contents are necessary. Uploading source will create a fresh Cloudflare build if your deploy connection is enabled; do not promote it as a payment repair.
2. In GitHub, open **Settings → Secrets and variables → Actions**, and add two new repository secrets:
   - `CLOUDFLARE_KV_READ_TOKEN`: a Cloudflare API token with only **Workers KV Storage Read** access to your intended Cloudflare account. Avoid using the existing D1 migration or write-capable token.
   - `CALLFOCUS_BACKUP_PASSPHRASE`: a cryptographically generated random passphrase with at least **32 characters**. Save it separately in a secure password manager. Losing it makes the backup undecryptable. Do not paste it in chat.
3. The workflow also needs an existing `CLOUDFLARE_ACCOUNT_ID` secret (the same name used by your earlier manual D1 workflow). Its KV namespace is hard-bound to `772f9544dbb7486480e876df3a7a7d3d`. The workflow checks this ID against `wrangler.jsonc` before reading anything.
4. In GitHub, open **Actions → CallFocus V16.09 wallet backup (manual, read only) → Run workflow**, choose `READ_ONLY_WALLET_SNAPSHOT`, run on `main`.
5. After success, open that run's **Artifacts**, download the encrypted-wallet-snapshot artifact, keep both the encrypted `.cfw09` and aggregate `.json`, and store them in a secure location before the 3-day expiry.
6. Send **only the aggregate summary** back for review, excluding any private customer IDs, exported records, API keys or passphrase. Do not consider any automatic migration approved because this backup completed.

## File integrity check

Once the encrypted `.cfw09` is on a secure computer with Node.js 22+ and this source file, the owner can verify it without revealing its contents:

```sh
CALLFOCUS_BACKUP_PASSPHRASE='retrieve-from-your-own-password-manager' node scripts/wallet-snapshot-v16.09.mjs verify /path/to/snapshot.cfw09
```

This example uses a placeholder, NOT a real passphrase. The workflow automatically runs this verification before uploading. Store the real secret outside the project folder, CLI history and terminal captures. No decrypt-to-disk command is included in this phase.

## Local validation

```sh
node --check _worker.js
node --check scripts/wallet-snapshot-v16.09.mjs
node --no-warnings tests/wallet-d1-phase2.test.mjs
node --no-warnings tests/wallet-snapshot-v16.09.test.mjs
```

## What comes next (not in V16.09)

- Resolve summary anomalies against authenticated PocketFi and other payment-provider records. Reconcile all currently live KV mutations: card payments, static transfers, manual approvals, credits/gifts/referrals, voice/live/video usage and refunds.
- Add a resumable audited D1 importer and parity checks for every customer, including missing/late records, while preserving historic idempotency markers.
- Design a controlled write freeze or other provably consistent cutover process; use an authoritative post-freeze snapshot for opening balances; test D1 concurrency on Cloudflare before any live routing change.
- Route **all** financial writers and balance readers to D1 together, then enable webhook delivery and replay/recovery only after an end-to-end test.

**No cutover, no PocketFi webhook registration, no payment switch changes in V16.09.**
