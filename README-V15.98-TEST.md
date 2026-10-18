# CallFocus V15.98 — Total Funded Admin Report

Base: Full V15.97. New read-only Admin Dashboard funding report (all time default, daily, monthly, custom range).

- Includes positive confirmed KoraPay, Paystack, manual-bank-transfer wallet purchases of CURRENT accounts.
- Excludes referral credits, admin credits, bonuses and pending/unapproved deposits.
- Uses existing customer wallet entries (up to 250 purchase records per wallet). Accounts deleted prior to report and old trimmed records cannot be recovered; on-screen caveat and per-scan warning.
- Paginated scans limit 20 customers per request so one Admin API call cannot silently stop at first page.
- Nigeria local time WAT (UTC+1) day/month boundaries; custom end date inclusive.
- Only new /api/admin/funding-report GET and Dashboard UI. No edits to payment settlement, balance code, providers, secrets, binding, cron or other admin settings.
- Retains npx wrangler versions upload safety workflow.

Validation: local JS syntax, ZIP integrity, mocked KV aggregation/date filtering/auth tests, source diff; no live Cloudflare testing.
