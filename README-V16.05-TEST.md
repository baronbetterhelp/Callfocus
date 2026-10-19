# CallFocus V16.05 — Manual payment state and recent-receipt repair (test)

Based on the complete V16.04 build. Narrow scope: Admin manual payments and manual receipt submission reliability; no payment-provider, wallet-calculation, approval-decision, customer-credit, Cloudflare binding, or Resend configuration changes.

- Removes a second immediate write to the *same* manual payment KV record after Resend email, which could fail after the original pending record was saved or race with Admin approval. Notification diagnostics and token nonces are saved to a separate private key; existing email approval links remain supported.
- Adds best-effort newest-first `manual:recent:` index on newly submitted receipts. The Admin endpoint merges up to 100 recent index entries with all canonical KV cursor pages, deduplicating by reference. Old receipts remain discoverable via the canonical list.
- Adds safe wallet-backed reconciliation only when an existing manual_bank_transfer purchase ledger has the exact payment reference, amount and credits. That repairs a stale `pending_confirmation` *status*; it does not add a second credit or approve an unverified transfer.
- Adds authenticated Admin reference lookup to read a known CFM reference directly, bypassing KV `list()` ordering, plus cache-busted requests and a latest-submission time readout.

Security: Admin auth required for both routes. Approved/rejected transitions, referrals, customer wallet arithmetic, and existing provider APIs are unchanged. If a payment shows pending and the wallet has no matching purchase, it stays pending and still requires bank verification and manual approval.

**Validation:** local mocks and JS syntax + ZIP checks only. Cloudflare production KV data cannot be inspected offline. KV is eventually consistent; a fresh write may take time to appear across regions. If the missing reference cannot be looked up directly after propagation, examine the customer submission response / KV binding / logs. No automatic payment approval occurs from a receipt or webhook.

- Preserves an Admin approval/rejection result in the current browser view until an eventual-consistency KV read catches up, so a successful approval does not appear pending again immediately after refreshing.
