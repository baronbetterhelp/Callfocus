# CallFocus V15.8 — Call Cost Monitoring & Persistent Sign-In

Built on CallFocus V15.7, preserving the Recent Calls View all fix and V15.6 admin screenshot controls.

## Admin call monitoring

Open Admin Portal → AI usage → Call usage and cost.

Each new call shows the customer, call title, customer call duration, customer credits used, API billable seconds, calculated voice cost, recorded backend/translation cost and total calculated API cost. Unlimited customers use zero customer credits while API usage is still tracked.

Tracking begins with sessions prepared after deployment. Existing screenshot-analysis usage stays in its own cards. Historical calls lack the API duration needed for exact per-call reporting and are not assigned invented costs.

GPT-Live 1 voice cost uses API-reported cumulative seconds at $0.05 per minute, billed per second. The 15-second WebRTC initialization charge is the initial estimate when duration is not yet available. Reported session duration replaces it; the setup time is never added again. Requests to close a call wait up to 3.5 seconds for final API usage before releasing the transport. Missing final usage is labeled incomplete. Customer credit metering stops before this wait.

Snapshots replace prior duration values instead of adding them. Sequences reject duplicate/stale reports. Failed reporting is queued locally and retried, including after reopening the same signed-in browser. Live translation's measured GPT-6 Luna token usage is recorded separately without storing translated text in the cost log. Per-call costs are calculated estimates, including only recorded billable components. Unpriced delegated models are identified explicitly.

Logs contain metadata only, with a 365-day retention period. The admin list paginates; summary scans are bounded and label partial totals when limits are reached. Cloudflare KV replication can delay visibility of a new report.

## Actual provider-reported billed spend

The OpenAI billed spend panel shows billed today and billed last 30 UTC days, using the official Costs API. These are actual provider-reported totals for a project or organization, not a per-session invoice or an API balance reading. Billing may appear later than live usage.

One-time setup in Cloudflare → CallFocus → Settings → Variables and Secrets:

1. Add **OPENAI_ADMIN_KEY** as a runtime secret containing an OpenAI organization Admin API key with permission to read usage/costs.
2. Optionally add **OPENAI_BILLING_PROJECT_ID** containing the project's `proj_...` identifier. Use the project that owns the existing CallFocus API key. Without this filter, the panel covers the entire organization and may include ChatFocus or other applications.
3. Refresh billed spend in the Admin Portal after saving the runtime settings/deployment.

The existing **OPENAI_API_KEY** continues to run calls. The billing key remains server-side and is not sent to the browser. Call monitoring and remembered logins work without the additional billing key; the billed-spend panel explains when its connection is not configured.

Official references checked on 2026-10-12:
- https://developers.openai.com/api/docs/models/gpt-live-1
- https://developers.openai.com/api/docs/guides/voice-latency-cost
- https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/costs
- https://developers.openai.com/api/docs/models/gpt-6-luna

## Remembered sign-in

Customer sessions now persist in server storage until explicit sign-out or account/credential revocation. Existing valid sessions are upgraded on use. Network errors and temporary server failures retain the saved login and retry validation. An in-flight restoration cannot sign someone back in after they log out.

Admin sign-in stores an opaque, persistent session token on the current browser/device. The admin passcode is not saved persistently. The old tab-only session is upgraded when still available. The Sign out button clears and revokes the token; a passcode change invalidates existing admin sessions. A first sign-in may be needed after deployment if the previous tab-only login was already lost.

## Deploy and verify

Upload Changes Only over V15.7, or deploy the Complete build. Preserve existing Cloudflare bindings and secrets. Customer and admin assets use V15.8 cache references, and `/api/app-version` returns 15.8.

After deployment, make a short test call, end it, refresh Admin → AI usage, then close/reopen the browser to confirm the remembered customer and admin sessions. Test manual Sign out once for each.

## Validation performed

JavaScript syntax, mocked server accounting/authentication, client restoration and usage capture/queueing, and V15.7 Recent Calls navigation/draft regression checks pass. Provider billing, API usage events and authentication responses were mocked. Paid live calls, provider billing access and visual browser layout require deployment verification.
