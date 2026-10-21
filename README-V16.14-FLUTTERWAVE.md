# CallFocus V16.14 — Flutterwave V3 hosted checkout (changes only)

Based on the V16.13 CallFocus source snapshot. Only new Flutterwave integration and its required interface/availability wiring were added. PocketFi, KoraPay, Paystack, manual payments, D1 and existing wallet storage and balance math remain unchanged.

## Changed files
- `_worker.js` — initializes Flutterwave V3 Standard hosted checkout, authenticates transactions through Flutterwave's verification-by-reference endpoint, safely matches reference/NGN/amount/customer, credits the existing server-authoritative wallet exactly once, and adds `POST /api/flutterwave/webhook` secured by the independent V3 `verif-hash` secret.
- `callfocus.js` — payment availability flag, Flutterwave checkout launcher, return verification and user payment recovery.
- `credits.html` — Flutterwave checkout and recovery button.
- `index.html` — new cache key for updated `callfocus.js`.
- `admin.html`, `admin.js` — independent Flutterwave checkout availability switch, OFF by default.

## Required Cloudflare bindings (Production; and Previews for preview testing)
1. `FLUTTERWAVE_SECRET_KEY` — Secret; your Flutterwave **V3 live** secret key, stored privately. Already being configured by the account owner.
2. `FLUTTERWAVE_WEBHOOK_HASH` — Secret; separate unpredictable string at least 20 characters. Use EXACT SAME value in Flutterwave Dashboard > Settings > Webhooks > Secret Hash. Do NOT substitute the API Secret Key or encryption key.
3. Existing `CALLFOCUS_CONFIG` KV must remain bound; D1 not changed.

## Deployment
1. Upload the six changed files from this ZIP to the repo root, overwriting those six names only. Keep all other files.
2. `npx wrangler versions upload` creates a preview. Explicitly promote/deploy the new version to Production. If testing preview, select `Previews` for both new secrets as well.
3. Once the new version is deployed, set Flutterwave webhook URL in the V3 dashboard to `https://callfocus.link/api/flutterwave/webhook` and enable webhooks/retries. Save a long random Secret Hash in both Flutterwave and Cloudflare.
4. In CallFocus Admin > Payments, enable **Flutterwave checkout** only when both secrets and webhook are in place and the deployment is verified. Keep it OFF while wiring.
5. Verify `/api/public-config` reports `flutterwaveEnabled:true` after turning on the independent Admin switch. Test a small real transaction only after endpoint setup; ensure a single wallet credit and a successful merchant transaction.
6. Customer return is `https://callfocus.link/credits?flutterwave=return`; the browser or webhook triggers server-side verification before wallet crediting. Paid-but-missing credits can be checked from Credits.

## Operational safeguards
- Never trust browser success/redirect, webhook payload amount, or status alone; independently verify against Flutterwave `GET /v3/transactions/verify_by_reference?tx_ref=...`.
- Reject reference mismatch, currency mismatch, and price mismatch.
- Match every transaction to authenticated user-owned pending records in KV.
- Persist processed reference and use existing wallet ledger idempotency to suppress double credits.
- Rate-limit initialize/verify endpoints; webhook requires V3 `verif-hash`.
- No new KV namespace, D1 migration, or changes to other payment providers.

Checks: JavaScript syntax passed for all modified `.js` files. Mocked V3 checkout + pending + mismatch + credit-once + webhook authentication test passed. No live payment or deployed website test yet.
