# CallFocus V11.23

Compact Recent Calls history update built on the stable V11.22 Paystack reconciliation release.

## Changed in V11.23

- call history now uses a compact ChatGPT-style recent list
- full conversation prompts are no longer exposed in the history view
- each call shows only a brief call detail, call date, call time, duration, and call number
- newest calls appear first
- internal-looking placeholders such as `CALLFOCUS_CONFIG` are hidden from the visible history and shown generically as `Call session`
- per-call copy functionality remains available through the small copy icon
- no payment, realtime voice, credit, admin, or backend behavior was changed

## Base

V11.23 includes all V11.22 Paystack reconciliation and Observability fixes.

# CallFocus V11.22

Targeted Paystack wallet reconciliation release built directly on V11.21.

## Fixed in V11.22

- Reconciles a verified Paystack transaction when a `paystack:processed:<reference>` marker exists but the matching purchase is missing from the customer's wallet.
- Verifies every recovery candidate with Paystack before any reconciliation credit is restored.
- Keeps reference-based idempotency so an existing wallet purchase is never added twice.
- Adds a broader recent-successful-transaction fallback when Paystack's customer-filtered transaction listing returns incomplete results.
- Prevents an equal-wallet-revision browser sync from removing Paystack purchase references already present on the server.
- Returns recovery diagnostics (`checked`) and writes a concise recovery summary to Cloudflare Observability.
- Forces one recovery attempt after V11.22 loads, so the existing successful test payment can be repaired without another payment.
- Persists Cloudflare Worker invocation logging through `wrangler.jsonc` so GitHub deployments do not switch Observability back off.

## Existing payment rules retained

- 50 credits = 1 minute
- 100 credits = NGN 1,000 = 2 minutes
- minimum purchase = 300 credits / NGN 3,000
- purchased credit is shared by live calls and voice notes
- Paystack/OpenAI secret keys remain server-side
- Paystack webhook signatures are verified with HMAC-SHA512
- transaction references remain idempotent

## Existing webhook

`https://callfocus.link/api/paystack/webhook`

Do not create another test payment to validate this recovery. Deploy V11.22, sign into the same CallFocus account, and open/refresh Call & Voice Credits. The build will re-check recent successful Paystack transactions and reconcile the wallet when necessary.

## V11.29 note
The opened Recent Calls conversation now always uses the compact V11.23-style call-history list. See `README-V11.29.md`.
