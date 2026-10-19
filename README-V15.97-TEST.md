# CallFocus V15.97 — Image to Video First + Realistic Motion Guidance

**Authoritative base:** the complete V15.96 Emergency Signup Email Quota build, unchanged except for this narrowly requested update and cache/version tokens.

## Changes
- On the homepage, swap the existing `Image to Video` quick-action card with the existing `Create a voice note` card. The first row now shows Image to Video + Generate conversation dynamics; the second row shows Create a voice note + Live AI Avatar. Original IDs/handlers/styles retained.
- Image to Video page: add a short realistic-motion example and a compact realism tip near the prompt field.
- Server xAI video prompt: add grounded physical movement, identity preservation, original-scene consistency, believable camera behavior, lighting and detail guidance; respect the user's action and selected motion style. This improves prompting but **does not guarantee** a photorealistic result from xAI.
- Required `15.97-test` asset/cache/app-version references updated consistently.

## Explicitly unchanged
- xAI model, API key, image upload/storage, requests, pricing (10 sec/300 credits; 15 sec/450 credits), wallet/deduction/refund logic, video history/gallery, admin controls, signup quota relief, Live AI Avatar, KoraPay/manual/Paystack, all Cloudflare binding/secret/cron/deployment configuration, navigation behavior, and all unrelated website UI.

## Release/test instructions
- Keep `npx wrangler versions upload` in Cloudflare GitHub build settings; do not auto-promote.
- Test Version URL `/api/app-version` for `15.97-test`, homepage card ordering, Image to Video prompt field, and admin presence.
- No live xAI generation or Cloudflare deployment is performed as part of local validation; test one controlled video before promoting, and review the result for artifacts.
