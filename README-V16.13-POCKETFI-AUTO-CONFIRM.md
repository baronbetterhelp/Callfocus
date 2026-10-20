# CallFocus V16.13 — PocketFi Hosted Checkout: Automatic Server Confirmation

Base: CallFocus V16.12 Complete. Changes scoped to **PocketFi hosted checkout only**.

## What it changes

- Newly created PocketFi hosted checkouts store their current merchant ID and register an expiring follow-up verification record in the *existing* CALLFOCUS_CONFIG KV namespace.
- A new 1-minute Cron Trigger checks outstanding, merchant-matched checkout references automatically using the *existing* authenticated PocketFi `/api/v1/checkout/confirm` and wallet crediting routine. The background check ends after two hours or on successful crediting; retry intervals increase over time.
- Adds `POST /api/pocketfi/checkout/webhook`, which verifies PocketFi's HTTP_POCKETFI_SIGNATURE via HMAC-SHA-512 with the configured POCKETFI_SECRET_KEY, validates a pending checkout/merchant/amount, and then re-verifies with PocketFi before any credit can be applied.
- Keeps the existing `*/5 * * * *` Image-to-Video Cron Trigger and its handler unchanged in frequency.
- Does **not** change KoraPay, Paystack, the existing wallet implementation, credit pricing, D1, user accounts, UI, browser storage, the abandoned permanent-virtual-account webhook or the current PocketFi API credentials.

## Deployment (for the new PocketFi merchant, Business ID 31166)

1. If any PocketFi payments are still pending, reconcile them first. In CallFocus Admin turn **PocketFi Checkout OFF** for new customers during the update; leave KoraPay untouched.
2. Upload the **Changes Only** archive's contents at the GitHub repository root: `_worker.js`, `wrangler.jsonc`, and this README. Produce a Cloudflare preview, then promote the Worker version when ready. Keep the existing `POCKETFI_BUSINESS_ID`, `POCKETFI_PUBLIC_API_KEY`, and `POCKETFI_SECRET_KEY` secrets unchanged.
3. **IMPORTANT CRON SETUP:** Confirm under Cloudflare Worker **Settings > Triggers / Cron Triggers** that `* * * * *` (once per minute) has been added **and** the existing `*/5 * * * *` remains. The GitHub build previously used `npx wrangler versions upload`, which does NOT automatically apply changed triggers. Configure the new Cron Trigger via Cloudflare dashboard or use `npx wrangler triggers deploy` after promoting. Do not run a deployment command that overwrites current secrets or bindings.
4. Only after the new Worker is deployed, on the **new** PocketFi merchant (Business ID 31166) open **Settings > Webhooks > Endpoint Settings** and set:

   https://callfocus.link/api/pocketfi/checkout/webhook

   Do **not** use `/api/pocketfi/bank/webhook` (that handler is for the abandoned static/virtual-account flow).
5. Use PocketFi's **Resend Now** on an existing notification to test endpoint delivery (no new payment needed for a delivery-path check). Already completed/previously-created orders can be ignored by this merchant-scoped handler; it will not credit unrelated payments. New merchant checkouts created after deployment are eligible for automated follow-up.
6. Re-enable PocketFi Checkout and observe the next normal transaction. Check payment confirmation, automatic balance update and checkout behavior. Do not repeat a paid test unnecessarily.

## Important limits

- This fixes CallFocus automatically requesting provider confirmation **without opening CallFocus in another browser**. PocketFi controls its own hosted checkout display and whether its page redirects; if PocketFi continues displaying "Monitoring Active" even after the server confirms and credits the payment, PocketFi must fix the checkout behavior.
- Payments created *before* this build will not receive automatic 1-minute watch records (their customer can still use the existing **Check & reconcile payment** button).
- A webhook notification **alone** never authorizes wallet credit. The existing server verification confirms the payment ID, success status, exact price, account ownership, and idempotency before adding credits.
- KV remains the existing production store; it is eventually consistent. This build does not claim to implement atomic wallet transactions or replace the previous wallet storage; do not expand this change to large concurrent payment volumes without an atomic payment-settlement design.
- All testing here is local static and simulated testing. **No live PocketFi payment or Cloudflare deployment was executed.**

## Rollback

Remove only the new `* * * * *` Cron Trigger, clear the hosted-checkout webhook URL in the new PocketFi merchant, and roll back the Worker to the previous tested version if necessary. Preserve all prior payment references for reconciliation.
