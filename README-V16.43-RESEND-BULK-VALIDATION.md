# CallFocus V16.43 — Resend bulk recipient validation

Base: V16.40 complete source with V16.42 referral/footer changes preserved. The separate Fish Audio lab is **not** part of this website.

## Scoped changes
- Validate saved customer and manually entered email recipients before sending direct service messages or promotional campaigns.
- Invalid addresses are skipped instead of preventing delivery to valid recipients.
- When Resend explicitly responds HTTP 422 with a recipient-validation error, recursively isolate the rejected address and send only the validated subsets. Each subset has its own stable idempotency key.
- Do not automatically retry rate-limit errors, provider errors other than recipient validation, or network/timeouts, to avoid duplicate sends when the result is unknown.
- Update admin sending results to distinguish Resend-accepted messages, invalid recipients skipped, unsubscribed promotional recipients, and provider failures.
- Increment admin.js asset version so browsers load the corrected client script.

Modified existing files: `_worker.js`, `admin.js`, `admin.html`.

No new SQL, D1 tables, payment changes, voice changes, customer wallet changes, or API keys are required.

## Test results
- JavaScript syntax validation passed.
- Mixed valid / syntactically malformed / provider-rejected recipients: 2 accepted, 2 skipped, 0 provider failures, correct per-subset idempotency keys.
- HTTP 429 and nonrecipient HTTP 422: no automatic retries.
- Direct-email API handler: valid records processed, invalid records skipped and counted; all-invalid audience refused.

**The tests use a simulated Resend API.** A Resend 200 means accepted for processing, not necessarily delivered to an inbox; actual deliverability and bounces are handled by Resend. Test on a Cloudflare preview before production use.

## Install
Upload the three changed website files from the Changes Only ZIP over matching files in your V16.42 repository. Keep the rest of your repository unchanged. Deploy to Cloudflare preview, send a small administrator-controlled test, and review Resend logs.
