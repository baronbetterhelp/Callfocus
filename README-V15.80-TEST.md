# CallFocus V15.80 Visual Test — Customer Transactions & Usage History

Built directly on CallFocus V15.79.

## Requested change only
Added a new **Transactions & Usage** button to the signed-in mobile account menu, directly after **Call & Voice Credits**.

The button opens a protected customer page showing the current shared credit balance, confirmed deposits, account credit adjustments, and separate live-call / voice-note usage history from the existing server-authoritative wallet ledger.

The page includes **Refresh history**, which reads the existing authenticated `/api/account/data` endpoint and refreshes only the authoritative wallet data. No payment, credit, call, voice, authentication, provider, pricing, KV/database or admin behavior was changed.

Build version: `15.80-test`.
