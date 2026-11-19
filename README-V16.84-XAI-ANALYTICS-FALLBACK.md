# CallFocus V16.84 — xAI USD usage analytics fallback

This release changes only the private API Accounts & Billing monitor.

The xAI prepaid ledger reflects posted accounting balance, not necessarily the current spendable balance. Preferred estimate comes from read-only invoice preview. If invoice preview is inaccessible or incomplete, the tracker now additionally queries the xAI Management API `POST /v1/billing/teams/{team_id}/usage` to retrieve USD spend from the first of the UTC calendar month through the refresh time. When that result is valid and compatible with the posted balance, the dashboard shows **an estimated** remaining amount as posted ledger minus period usage, with its source and date range. This is not guaranteed to match xAI Console: billing-cycle boundaries, posting adjustments, and reporting delays can create differences. Any failed response or period mismatch shows no fabricated available balance; the specific preview/analytics status is shown without exposing credentials.

The provider query uses the existing XAI_MANAGEMENT_KEY and XAI_TEAM_ID, makes no credits purchase, and does not alter account settings. All requests use Cloudflare Worker server-side credentials.

OpenAI remains unchanged. OpenAI does not currently expose remaining prepaid credits via the supported organization costs API; its 30-day spending report is separate and the manual balance remains clearly identified as manual.

No SQL or new Cloudflare secrets needed. Root-level upload. No impact on OpenAI realtime voice, xAI inference service, ElevenLabs voices, payments, or customer wallet. Test the new estimate against xAI Console after deployment.
