# CallFocus V16.02 — PocketFi Authenticated API Key Correction (test build)

Based **strictly** on complete V16.01, retaining all prior features and configuration.

## Evidence / reason
PocketFi's official TRY IT interface successfully returned 200 OK for BOTH POST `/api/v1/checkout/request` and `/api/v1/checkout/confirm` when the merchant's **Public API Key** was used with Bearer authorization. Both failed 401 Unauthenticated with the merchant's Secret API Key. The confirm result was `pending` for an unpaid payment. PocketFi's general docs conflict with these observed live API results; verify with provider before customer rollout.

## Code changes
- `_worker.js`: `pocketfiConfigured` checks `POCKETFI_PUBLIC_API_KEY` and `POCKETFI_BUSINESS_ID`; the PocketFi-only API client uses the former as `Authorization: Bearer ...` for both initialize and confirm. `POCKETFI_SECRET_KEY` remains unchanged in the deployment for potential separate future uses. No fallback to a rejected credential.
- `wrangler.jsonc`: adds `POCKETFI_PUBLIC_API_KEY` to required secrets, retains all preexisting secrets, flags, KV, assets, schedules, domains and build command.
- Version refs/caches changed `16.01-test` to `16.02-test`; no other feature logic changed. The prior 16.01 PocketFi ON/OFF gate is untouched.

## REQUIRED manual configuration before uploading
1. In Cloudflare Worker Settings → Variables and Secrets, add `POCKETFI_PUBLIC_API_KEY` **as Secret**, set to the merchant's Public API Key that worked in PocketFi's official TRY IT. Despite being named public by PocketFi, this key authenticates API requests, so handle it as a sensitive server credential. Never place it in GitHub or browser code.
2. Ensure `POCKETFI_BUSINESS_ID` matches that merchant account. Leave `POCKETFI_SECRET_KEY` as-is, do not overwrite it with a public key.
3. Existing Cloudflare environment and GitHub deploy: `npx wrangler versions upload`, test version URL; do not promote automatically.
4. PocketFi remains OFF in Admin by default (actual runtime config shared across versions): perform controlled test, never expose it to 2,000+ customers before completing an actual low-value payment and refund/reconciliation tests.
5. Validate return to the site, server-side confirm, credited amount only if status paid and amounts agree, idempotence, and referral/bonus handling. NOTE: provider-signed webhook is not present yet: payment may require user return; do not claim production readiness.
6. Because an authenticated API key was visible in screenshots, coordinate rotation with PocketFi before public launch and test the replacement key. Avoid immediately rotating credentials in use without coordinating deployment.

## Limits
Mock unit tests and local JS syntax do not prove live PocketFi auth or verified deposits. PocketFi documentation says Secret Key in its Introduction, conflicting with the user's demonstrated live behavior. Seek PocketFi clarification if results change.
