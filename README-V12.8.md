# CallFocus V12.8 — Stock Avatar Test Mode

This build switches Live AI Avatar into a free-plan-first Tavus test flow.

## What changed
- The Live AI Avatar page now loads the stock Tavus Face library available to the connected account.
- Users choose a stock AI avatar and can start a realtime session immediately.
- No selfie upload or custom Face creation is required for the stock test.
- Custom selfie avatars are intentionally left locked in the UI until you decide a paid Tavus plan is worthwhile.
- Added `/api/avatar/stock-faces`, which reads `GET /v2/faces?face_type=system` server-side with `TAVUS_API_KEY`.
- The selected stock Face ID is validated server-side before a conversation is created.
- Each test session is capped at 5 minutes to protect the included Tavus CVI allowance.
- Existing custom-avatar backend code remains available for a future paid unlock, but it is not part of the customer test flow.

## Required secret
`TAVUS_API_KEY`

The key must remain a Cloudflare Worker secret and must never be exposed in browser JavaScript or GitHub.

## Billing note
Loading the stock-face library does not start a CVI session. Starting a real conversation consumes Tavus CVI minutes. Tavus test_mode is not used for the live test because the PAL does not join in test mode.
