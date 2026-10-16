# CallFocus V15.73 Visual Test — Resend Usage Dashboard

Built directly on CallFocus V15.72.

## Change
Admin → Email now includes a live **Resend email usage** panel backed by Resend's Account Usage API.

- Shows today's email usage versus the account's daily quota.
- Shows this month's usage versus the monthly quota.
- Shows the number of emails remaining today.
- Shows sent (and, when present, received) email counts and the daily reset time.
- The existing **Refresh email status** button refreshes the quota panel too.
- Successful direct-message and promotional sends trigger a background usage refresh so the displayed quota stays current.
- The Resend API key remains server-side and is never exposed to the browser.
- If the connected Resend key can send email but lacks the Full Access permission required by `GET /usage`, the panel explains that usage access requires a Full Access API key while leaving email sending untouched.

## Preserved
No changes to Resend sender configuration, Cloudflare bindings/secrets, KV structure, pricing, credits, payments, authentication, AI/voice providers, call logic, or promotional consent behavior.

Build version: `15.73-test`.
