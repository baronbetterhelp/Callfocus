# CallFocus V16.03 — PocketFi Verified Payment Return + Recovery (test)

Built **strictly** on the complete V16.02 ZIP. No previous build files removed.

## Verified production issue
PocketFi confirmed a real ₦3,000.00 payment `PFI|6010063157` as `completed`, but generated a callback URL with `?pocketfi=return?payment_id=...`. The V16.02 frontend required exactly `?pocketfi=return`, so it never ran backend payment verification. The payment was therefore absent from the customer ledger.

## Scoped changes
- `_worker.js`: New PocketFi checkouts return to query-free `/credits`, allowing PocketFi to append its `?payment_id=...` safely. The payment VERIFY endpoint now returns explicit errors for orphaned/unverified records instead of misleading `ok` + `pending`. Same authenticated customer/account binding, exact amount/credits reconciliation, PocketFi server-side confirm, and existing wallet purchase idempotence logic unchanged.
- `callfocus.js`: Recognize both PocketFi's legacy malformed `?pocketfi=return?payment_id=...` callback and the corrected `/credits?payment_id=...`; send recovered payment ID to existing authenticated `/api/pocketfi/verify`. Add manual customer recovery, including explicit Payment ID if the user left the return flow; cannot credit without PocketFi server confirmation and a pending purchase belonging to that signed-in CallFocus account.
- Nine HTML templates containing the credits page: add an unobtrusive expandable PocketFi payment check form even when new PocketFi sales are disabled, so existing paid transactions can be recovered.
- `callfocus.css`: scoped mobile-friendly recovery form styling.
- Cache/version strings `16.02-test` -> `16.03-test` across existing scripts and pages; no unrelated logic changed.

## Recovery of already-paid ₦3,000 order
1. Add/use existing `POCKETFI_PUBLIC_API_KEY` Cloudflare Secret and matching `POCKETFI_BUSINESS_ID`; keep new PocketFi purchasing disabled for other customers.
2. Upload V16.03 Changes Only to a V16.02 GitHub checkout (or use Complete ZIP for standalone deployment), run `npx wrangler versions upload` and test via version URL. Do not promote to production until verified.
3. **Sign into the same CallFocus account used for the payment**, on the Version URL from which the order was initiated when possible. Open **Credits**. Click **Paid with PocketFi but missing credits? Check payment**. Enter `PFI|6010063157` and tap **Check & reconcile payment**. It calls the existing authenticated Worker endpoint; if the previously created KV pending record is present and PocketFi still confirms the exact ₦3,000 amount as `completed`, existing server wallet logic awards the purchase once, records it, and refreshes balance. Check transaction history and repeat the action to verify idempotence.
4. If `unknown_payment` or 404 appears, do NOT create a new wallet purchase from a screenshot. Inspect the KV pending record for this exact transaction and reconcile securely by account ownership. No replacement credits/ledger can be issued by this build without a matching pending record; contact support/admin for manual audited recovery instead.

## Limits / important
The current branch still lacks a signed PocketFi webhook, so purchases may need the customer to return or press Check payment. Before enabling PocketFi for 2,000+ customers, add documented verified webhook recovery and end-to-end test. A version URL may have a distinct browser sign-in session from production even if it uses the same KV, so sign in there explicitly. Cloudflare KV is eventually consistent and not a transactional lock; stress-test duplicate verification under concurrent requests before broad rollout. Testing here uses mocked provider data; cannot access live PocketFi or Cloudflare settings. Keep secrets out of logs, versioned artifacts and screenshots.
