# CallFocus V16.29 — Direct service-email audience and customer loading

Based on V16.28 complete. Modified only `admin.html`, `admin.css`, `admin.js`, `_worker.js` (direct-email eligibility section only) and cache identifiers. The core calling, payment, wallet, AI integrations, promotional eligibility and unsubscribe rules remain unchanged.

- Added an audience selector for non-promotional direct messages: Selected customers (default) or All active customers.
- Reused existing account list pagination and added a loading summary / refresh. The count reports the accounts in the currently bound CALLFOCUS_CONFIG KV namespace. The UI never claims a full list unless the paginated API reports completion.
- An active customer with an email address is now visible even if its email is unverified because signup verification was paused. Their verification status is shown explicitly, and they may be included in service-message mail. **This does not affect promotional campaign audience logic.**
- Browsing is limited to 80 rendered rows initially with Show More for iPhone performance. Searching and filters cover the loaded list, and the full account list can be loaded through the existing pagination.
- Direct message sending remains protected by the existing server limit of 100 per request, using sequential batches. A confirmation is required and progress is shown. On failure, sending stops and warns against blindly retrying, since delivery status may be ambiguous. Use this only for transactional / service notices.
- If fewer accounts are returned than expected, the deployment may be bound to a different Cloudflare KV namespace or account records may not exist in that namespace. Code cannot merge storage that is not connected. Verify the production CALLFOCUS_CONFIG binding.

Before promoting: inspect account counts in Admin > Customers and Direct email; test a selected service message with one account, check an unverified signup account is visible, and separately test all-active with a controlled recipient set on preview. Never test a bulk send against live production users.
