# CallFocus V15.84 — Additional KoraPay checkout (prepared for visual testing)

Base: V15.83 Kora Compliance Footer complete archive.

## Scope
- Optional KoraPay hosted checkout appears as a SECOND payment button beside the existing Paystack/manual purchase flow, only when a live `KORAPAY_SECRET_KEY` is present in the running Worker (test keys cannot fund real customer wallets).
- New Worker routes: `POST /api/korapay/initialize`, `GET /api/korapay/verify`, `POST /api/korapay/webhook`. Initiated charges use authenticated CallFocus users, existing minimum/top-up pricing, and a new 30-day pending payment reference.
- Checkout return and signed webhooks verify payment directly with Kora, check original transaction reference, NGN currency and exact expected amount, then credit through the existing server-authoritative purchase ledger. Duplicates and replays are tracked in KV.
- Kora credits count as purchases in customer Transactions & Usage, admin funded summaries, and referral-first-deposit rewards. Existing Paystack and manual payment implementations remain unchanged.
- No new KV namespace or migration, AI or voice adjustments, pricing changes, or payment provider substitutions. Wrangler configuration and its existing required secrets remain unchanged.

## Setup (AFTER visual testing and Kora confirmation of Base Tier checkout permission)
1. Add `KORAPAY_SECRET_KEY` as a **secret** on the existing CallFocus Worker (never a public var; never commit it to GitHub). The built-in checkout deliberately requires the `sk_live_` prefix to avoid granting real customer credits from sandbox transactions. Use mocked API calls or a separate isolated staging Worker/KV for preproduction tests.
2. In Kora merchant dashboard (when approved), set Webhook URL `https://callfocus.link/api/korapay/webhook`. Each initialized charge also specifies this notification URL.
3. Deploy only using `npx wrangler versions upload`; test on Version URL before manually promoting. Confirm the Kora redirect URL and per-request webhook can reach your chosen test Worker version: Kora may send callbacks to the origin used to initialize a version.
4. Run a controlled sandbox payment including callback and signed-webhook replay, then confirm one wallet credit and one referral. Test actual live checkout only after Kora confirms its Base Tier permissions.
5. If a live secret is missing, KoraPay stays hidden, while Paystack and manual payment behavior remains as before.

## Validation limits
Static syntax/archive checks and mock calls do NOT constitute real browser testing or a verified Kora payment. Cloudflare/Kora live API availability, callbacks, transaction settling, and KV concurrent updates require separate staged tests.
