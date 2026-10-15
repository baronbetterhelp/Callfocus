# CallFocus V15.45 Visual Test — Complete Customer List Restore

Built directly on **V15.43 Visual Test**. Stable V15.16 remains the approved stable base unless a visual-test branch is explicitly promoted.

## Why this build exists

The production Cloudflare account reached the Workers KV Free-plan limit of 1,000 writes in one UTC day. V15.38+ live-call accounting was a major write source because the browser forced a usage snapshot every 4 seconds and the server could write both the customer wallet and call-usage record for each checkpoint. High-frequency rate-limit buckets such as live translation and location search also consumed KV writes. Once the quota was exhausted, some uncaught KV errors escaped as Cloudflare 1101 HTML, which the customer/admin UI displayed as HTTP 500 or raw markup.

## V15.44 changes

- Live-call usage checkpoints are reduced from **every 4 seconds to every 30 seconds** while the local on-screen credit countdown remains smooth in real time.
- Normal non-forced call-usage reports are throttled to at least 25 seconds apart. Start, end, page-close and final snapshots still report immediately.
- The server still performs authoritative wallet charging, but the call telemetry record is persisted at start, finalization and approximately every 2 minutes rather than at every wallet checkpoint. The per-call wallet ledger remains the idempotency source so retries do not intentionally double-charge.
- Call-usage retry traffic now backs off to 30 seconds normally and 60 seconds for 429/503 responses instead of repeatedly hammering a capacity-limited Worker.
- High-frequency rate-limit buckets (100+ allowed requests/window, including live translation and worldwide location search) use a best-effort in-isolate limiter instead of writing a KV counter for every normal request. Security-sensitive low-frequency auth/admin rate limits continue using KV when available.
- KV-backed rate limiting now fails open if the storage quota itself is unavailable instead of crashing signup/sign-in before the real handler runs.
- Signed `session2:` admin login no longer writes an unused `admin:issued:*` record. The signed token remains validated cryptographically and revocation checks remain supported.
- Old customer-session persistence upgrades and admin logout revocation writes are best effort during temporary KV write outages.
- Account-route KV-capacity failures return a clean JSON **503 storage_capacity** response instead of generic HTTP 500.
- A Worker-level safety catch prevents uncaught API exceptions from leaking Cloudflare 1101 HTML into CallFocus forms.
- OpenAI billed-cost caching is best effort, so a failed cache write does not hide an otherwise successful cost response.

## Unchanged

Credits remain **100 credits = 1 minute**. Existing balances are not converted again. Calls, voice notes, payments, referrals, saved information, Quick Start controls, Recent Calls, customer notifications, themes and V15.43 working referral signup links remain intact.

## Important

This build reduces unnecessary KV writes substantially, but a production service with active customers should still use the **Workers Paid** plan rather than relying on the Free plan's 1,000 KV writes/day limit.

## Build

`15.45-test`
