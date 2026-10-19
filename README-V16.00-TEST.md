# CallFocus V16.00 — PocketFi Required Accept Header & Safe Diagnostic Logs (TEST)

Base: exactly V15.99 PocketFi Payment Integration Complete ZIP.

## Targeted edits

- Added `Accept: application/json` to the existing PocketFi server-to-server POST request, per PocketFi Authentication docs (alongside the existing Authorization Bearer and Content-Type headers).
- Logs only PocketFi endpoint path, HTTP status and a sanitized provider error code on rejected provider requests. No API credentials, personal details, payment payloads or authorizations are logged.
- Updated cache/build references from 15.99-test to 16.00-test; no unrelated flow or styling changes.

## Important limitations

PocketFi's actual Payments documentation confirms the existing `POST /api/v1/checkout/request` and `POST /api/v1/checkout/confirm` endpoints. The unrelated `/api/v1/transaction/initialize` shown within its Authentication examples is not proof that checkout endpoints should change. No endpoint has been changed in this build.

PocketFi's `Unauthorized Error: EP404` still requires a live merchant API re-test after this adjustment, and possibly PocketFi support clarification. A missing Accept header cannot be assumed to be the cause. PocketFi should remain OFF for customers until an end-to-end live payment and wallet confirmation succeeds.

## Deploy

Use `npx wrangler versions upload` unchanged. Test the isolated Version URL, verify PocketFi admin on/off and existing KoraPay, manually promote only when validated. Do not commit API keys; retain Cloudflare secrets and KV data. No migration, binding, pricing, ledger or webhook changes.

## Tests

Local node JavaScript syntax checks, ZIP integrity, static source diff and mocked request/header/error tests; NOT a live PocketFi payment, webhook or Cloudflare production test.
