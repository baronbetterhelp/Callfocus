# CallFocus V16.01 — PocketFi Version-Binding Guard and Checkout Error Clarity (TEST)

Base: EXACT CallFocus V16.00 PocketFi Header Diagnostics Complete ZIP.

## Changes
- Declare `POCKETFI_SECRET_KEY` in `wrangler.jsonc` `secrets.required`, so `wrangler versions upload` checks for a configured PocketFi secret before accepting a new version. This does not confirm that the secret is *correct* or that PocketFi has enabled access. `keep_vars`, all binding IDs and every other Wrangler setting are unchanged.
- Show a specific PocketFi checkout unavailable/authentication message and JSON code instead of the generic CallFocus account-service error when PocketFi's initialization call rejects the request. Provider API URL, Bearer header, body fields, wallet crediting, amount checking, provider verification, and every other flow are unchanged.
- Bump the runtime/cache build strings to `16.01-test` for clear test identification.

## Root-cause uncertainty and deployment
An unauthenticated response using two different PocketFi accounts raises the possibility that the version serving traffic has old/missing credentials or that the provider rejects both tokens. Cloudflare versions snapshot their binding configurations. Confirm Production **Deployments** includes the desired secrets and deploy the credentials into the intended version. Merely saving values without deploying is not evidence that the deployed version changed. Do not put any secret value into GitHub or Wrangler config.

PocketFi remains OFF for customers until the merchant can complete a live checkout and server-side verification. No live provider credentials or account access were used in local tests. Do not accidentally promote the test build. Existing KoraPay, manual, Paystack, wallet, KV and cron are preserved.

## Verification
Local JavaScript syntax checks and ZIP integrity. Live PocketFi authorization, webhook behavior and Cloudflare binding status are **not** tested here.
