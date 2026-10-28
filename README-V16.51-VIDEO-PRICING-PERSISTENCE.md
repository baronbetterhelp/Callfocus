# CallFocus V16.51 — Image-to-Video pricing persistence

Base: V16.50. Scope: only video pricing storage and the video admin display. No OpenAI/ElevenLabs/booking/payment wallet/referral changes.

## Root cause

Image-to-Video saves its 10/15-second prices in `image_video:settings`. The Payments service-rates panel previously set `imageVideoOverride=true` in `cf:service-rates:v1`. The Worker silently replaced the Image-to-Video saved costs with the unrelated service-rates cost whenever it reloaded, so 20/30 reverted to 300/450.

## Fix

- `image_video:settings` is the authoritative store for actual video duration costs, used by admin config, customer pricing and generation charging.
- Saving Image-to-Video costs persists its own values even when a previous Payments override is present.
- The Payments pricing overview and the public feature-rates overview derive the displayed per-minute estimate from the saved 10s video cost, instead of reporting an outdated override.
- Explicitly changing the Image-to-Video rate in Payments updates the same video settings; saving other rates without changing the Image-to-Video rate preserves both 10s and 15s costs.
- After saving video prices, admin uses the confirmed POST response rather than an immediate KV reread (which can be briefly stale due to Cloudflare KV's eventual consistency).
- Bumped the admin video JS cache version for Safari.

## Deployment

Upload the Changes Only ZIP over V16.50 in GitHub; keep original paths. Cloudflare builds and deploys/promotes the new Worker. No migrations or secret changes. Then Admin → Image to Video: enter 10s and 15s costs → **Save Image to Video settings**. Press Refresh and reload; verify that they persist, and compare with /api/image-to-video/config via the customer page. Existing video jobs retain recorded historical charge amounts.

## Test

Local mocked-KV tests passed (test harness retained outside deployment archives): historical overrides, saving video prices, saving unrelated rates without resetting video, explicitly changing video rate in Payments, and public/admin display parity.
