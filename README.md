# CallFocus V11.21

Paystack payment integration built on the V11.19 account-reliability release.


## Added in V11.21

- automatic recovery of recent successful Paystack checkout payments when the browser callback/reference was lost
- recovery queries recent successful Paystack transactions server-side and verifies each exact reference before crediting
- authenticated-account matching using CallFocus transaction metadata/pending mapping, with an email fallback only for CallFocus-generated `CF-` references
- existing processed-reference and wallet-purchase checks remain the duplicate-credit protection
- automatic recovery runs after account restoration, so opening/refreshing CallFocus can repair a missed successful payment without paying again

## Added in V11.20

- server-side Paystack checkout initialization using `PAYSTACK_SECRET_KEY`
- signed Paystack webhook at `/api/paystack/webhook`
- HMAC-SHA512 verification of `x-paystack-signature` before any credit is added
- server-side transaction verification and duplicate-payment protection
- automatic conversion at the existing CallFocus rate: ₦1,000 = 100 credits = 2 minutes
- shared purchased balance for live calls and generated voice notes
- stale-wallet protection so an older browser tab cannot overwrite newer Paystack credits
- reusable Paystack Dedicated Virtual Account flow for each signed-in customer
- Paystack transfer-account card with copy button on the credits page
- automatic wallet refresh so DVA transfers can appear without signing out
- Paystack return handling after hosted checkout
- test/live mode detection from the secret key

## Cloudflare requirement

Keep the existing secrets and binding. Add/retain this production secret in Cloudflare:

- `PAYSTACK_SECRET_KEY` = the Paystack `sk_test_...` key while testing

`wrangler.jsonc` uses `"keep_vars": true`, so dashboard-managed secrets are preserved across GitHub deployments.

## Paystack webhook

After this build is deployed, set the Paystack **Test Webhook URL** to:

`https://callfocus.link/api/paystack/webhook`

The callback URL does not need to be set in the dashboard because CallFocus supplies its callback URL when each checkout is initialized.

## Going live

After Paystack approves the business:

1. Replace the Cloudflare `PAYSTACK_SECRET_KEY` value with the Paystack live secret key.
2. Set the Paystack **Live Webhook URL** to `https://callfocus.link/api/paystack/webhook`.
3. Test one small live purchase before opening payments to customers.

Dedicated Virtual Accounts are requested with `test-bank` when a test secret is installed and `titan-paystack` when a live secret is installed. Paystack may keep DVA creation unavailable until the business has completed activation.
