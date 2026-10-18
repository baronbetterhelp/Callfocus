# CallFocus V15.99 — PocketFi Optional Payment Gateway (test)

Base: V15.98 Complete. PocketFi is OFF by default. Existing payment code and Cloudflare configuration are retained.

## Setup

- Add Cloudflare Worker secret `POCKETFI_SECRET_KEY` (never commit).
- Add Cloudflare Worker variable `POCKETFI_BUSINESS_ID` from PocketFi Dashboard.
- Admin → Payment Methods: toggle PocketFi ON, then Apply payment availability.
- Existing `npx wrangler versions upload` must stay unchanged. First test the new Version URL and manually promote when ready.

The payment flow uses PocketFi official documented POST /api/v1/checkout/request and POST /api/v1/checkout/confirm. A hosted payment redirect only prompts server-side confirmation. The verification checks payment ID and amount, and credits only after confirmed success; repeat requests are marked as duplicates. Existing price/bonus snapshots, wallet purchase ledger, referrals and bonus notifications are reused. There is no webhook handler because PocketFi's signing header and payload schema have not yet been confirmed from the merchant account, so unattended confirmation after customers abandon the browser requires further integration. Do NOT turn the feature ON for customers until a live test and webhook/recovery audit are completed. Cloudflare KV is not transactional: high-concurrency wallet concurrency testing is still required.
