# CallFocus V16.06 — PocketFi static account beta (TEST ONLY)

Source: complete V16.05 archive. This is a gated test build, not a production-certified payment release.

## Scope
- New optional PocketFi **fixed** Kuda virtual-account flow on `/pocketfi-bank`. From `/credits`, the customer selects credits (minimum 300) and chooses **Fund with PocketFi Bank Transfer**.
- The account is created through PocketFi `POST https://api.pocketfi.ng/api/v1/virtual-accounts/create` with the user's legal first/last names, phone, registered email, Business ID, and bank `kuda`. The response account is persistently mapped to the authenticated CallFocus account. Not created unless a customer explicitly requests it.
- The bank details are displayed only after the KV mapping is saved. Account remains assigned to the same customer. On each funding request, pricing and any bonus are snapshotted.
- A request remains active for up to 2 hours; a different funding amount cannot replace an outstanding request. Amounts that are different, late, or otherwise unmatched go to review, not automatic credits.
- Webhook endpoint `/api/pocketfi/bank/webhook` verifies HMAC-SHA512 over the **raw body**, keyed by `POCKETFI_SECRET_KEY`. Expected header `HTTP_POCKETFI_SIGNATURE`. Invalid signatures are rejected.
- Signed transfers map `account_number` -> CallFocus user, `order.amount` -> actual gross paid, `transaction.reference` -> unique ledger reference. The merchant Business ID is checked if present. `order.settlement_amount` is recorded for review, not used to calculate purchased credits.
- Uses existing server-authoritative `commitWalletPurchaseCredit` function with reference deduplication. Wallet purchase provider is `pocketfi`, so the existing Transactions & Usage and Admin Total Funded include valid credited deposits.
- A separate signed-event review panel is available in Admin Payments. Unmatched deposits are saved for review, NOT ignored; Admin may recheck only previously signature-verified deposits, never invent verified payments.
- Existing PocketFi hosted checkout, KoraPay, Paystack, manual payment approvals, pricing and wallet schema remain unchanged.
- Dedicated Admin ON/OFF setting: **PocketFi fixed bank account (beta)**, default OFF, separate from PocketFi checkout switch.

## Cloudflare / PocketFi configuration
Use the same existing Worker bindings: `POCKETFI_PUBLIC_API_KEY` (API authentication), `POCKETFI_SECRET_KEY` (HMAC verification), and `POCKETFI_BUSINESS_ID`. All remain server-side. No new KV namespace or secret is required.

In PocketFi merchant dashboard Settings → Webhooks, AFTER the test version is prepared and the URL is reachable, configure the webhook URL for the target environment. Production URL after promotion: `https://callfocus.link/api/pocketfi/bank/webhook`.

**Do not enter a production webhook URL until that version is live and verified**. When testing, prefer the version-specific HTTPS URL if PocketFi supports it. Do not overwrite a different production webhook already used for other transactions without confirming that PocketFi supports multiple destinations.

## Critical live verification steps (not executed here)
1. Upload V16.06 changes with the existing `npx wrangler versions upload` workflow. Do NOT use `wrangler deploy` or auto-promote.
2. Verify the test version's `POCKETFI_PUBLIC_API_KEY`, `POCKETFI_SECRET_KEY`, and `POCKETFI_BUSINESS_ID` bindings. Do not post their values.
3. Set the new separate PocketFi bank transfer toggle ON only for a carefully controlled test; maintain existing working payment providers. Note that global config and KV are shared if your Version URL uses production bindings.
4. From a test customer account, request an assigned Kuda bank account. Check it is a real, correct account and remains stable after refresh.
5. Configure a verified webhook destination. Inspect the response to an actual PocketFi signed webhook. Transfer exact amount for one selected purchase. Confirm ONE credit posting and one purchase history record; verify Admin Total Funded.
6. Retry the SAME signed webhook. Confirm no additional credits. Test incorrect signatures and wrong-amount signed deposits and verify they are not auto-credited.
7. Test that customer session sign-in, KoraPay, Paystack, existing PocketFi hosted checkout, manual payment approvals, and the Admin panel remain functional.
8. Keep OFF for broad customer rollout until end-to-end live verification and a transactionally safe concurrent-wallet design have been reviewed.

## Important operational limitations
- **Cloudflare KV is not a transactional database**. A wallet purchase ledger check protects ordinary retries, but concurrent transfers or regional KV consistency may still create lost-update or race conditions. Do not claim exactly-once settlement at scale without a transactional ledger (e.g., D1 with appropriate atomic constraints or Durable Objects).
- Signed webhook delivery must work. This build does not pull a missing transfer directly from PocketFi's ledger if no webhook arrives. Review that with PocketFi support and add an independent reconciliation endpoint before enabling broadly.
- Static accounts accept arbitrary bank transfer amounts. An exact-amount instruction is not a bank-level hard limit. Unmatched / expired / different-amount deposits are placed in the Admin review feed for manual investigation. Do not tell customers funds are automatically refunded.
- `order.amount` is gross paid. Do not derive customer credits from net settlement.
- Customer legal names and phone numbers are sent only to PocketFi's server API. NIN and BVN are **not** requested or stored here because the Kuda provider is selected.
- Existing already completed PocketFi hosted-checkout transactions are independent and are NOT retroactively converted to virtual-account transactions.

## Local validation
- Node syntax checks: `_worker.js`, `admin.js`, `callfocus.js` passed.
- Mock Worker API test: real route dispatch, Kuda account creation only once, public-key API authentication, 300-credit bonus quote, unsigned/tampered HMAC rejection, exact-amount credit, duplicate notification deduplication, held wrong amount, review indexes, second funding passed.
- Static mobile layout checks: 320 / 375 / 390 / 430 / 768 px, no horizontal overflow.
- No live PocketFi account issuance, bank transaction, real webhook, cloud deployment, or live wallet integration was performed.
