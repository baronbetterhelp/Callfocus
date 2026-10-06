# CallFocus V14.0 – Email Payment Approval Route Fix

'
- Fixed the 404 shown when opening Approve payment or Decline payment from the manual-payment notification email.
- Added `/manual-payment-review` and `/manual-payment-review/` to Cloudflare Assets `run_worker_first` so the request reaches the Worker instead of the static 404 page.
- Worker now accepts both the normal and trailing-slash review URL.
- Existing valid 48-hour email approval links can be retried after this deployment; no new payment submission is required.
- No wallet, pricing, payment-credit, or admin-approval logic was changed.
