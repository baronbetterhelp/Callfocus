# CallFocus V16.66 — Account 5 Admin visibility and control consistency

## Symptom reproduced from the supplied videos
- First recording: Account 5 panel appears, but the switch and Verify button do not update their status.
- Second recording: after refreshing, the same Admin section shows only Account 4; Account 5 is not in the page.

These can occur if different HTML, JavaScript or Worker versions are served during a partial or staggered deployment. The panel is static markup; normal Account 5 settings cannot remove it.

## Changes
1. Route `/permanent-slots-admin.js` through the Worker and return `no-store` plus build-identifying response headers; add it to `assets.run_worker_first`.
2. Serve Admin HTML using a current build-specific cache key instead of the obsolete 16.07-test key; update admin response headers. Admin HTML and this script now use V16.66.
3. Do not allow Account 5 activation or verification clicks until the page controller has initialized and the Admin voice-slot GET endpoint identifies itself as V16.66. A missing or mismatched build produces a visible failure instead of an inert switch.
4. POST activation validates the Worker build response before showing a successful save notification.
5. Preserve the existing Account 5 secrets, account 1-4 routing, saved voice IDs, reservations, payment/wallet rules, 1,000-credit purchase flow and OpenAI calling source.

## No SQL
Existing D1 voice slots already support `pool5`. Do not rerun any migration.

## Deployment
- Upload Changes Only into the current repository and activate the completed Cloudflare Worker deployment (not just its build).
- Open `/admin` in a new browser tab and inspect the Account 5 panel. It should appear and show a verified response after its loading phase.
- If it shows a build mismatch, ensure Cloudflare is serving V16.66 and refresh. Do not edit capacities or account switches until this resolves.
- Verify Account 5. Only turn on purchases after the new secrets and paid subscription are confirmed. Then change the unified total/availability separately.
