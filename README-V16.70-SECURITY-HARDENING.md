# CallFocus V16.70 — Revenue Security Hardening

Base: V16.69 Complete Website archive. This is a staged correction of the code-level risks found in the 8 November 2026 audit. No production databases or payments were modified during preparation.

## Implemented in V16.70

- Server-authoritative voice-note billing: the server reserves estimated credits before synthesis, measures completed MP3 audio, settles surplus/shortfall before sending audio, and includes the settled charge in response headers. Both legacy and current client paths stop submitting a second browser-controlled deduction. Model selection, OpenAI voice prompts and live call behavior remain unchanged.
- D1-backed one-at-a-time customer guard for paid voice-note and Image to Video submissions; no expensive submission is allowed when the safety database is missing.
- Durable voice-note reservation journal, with a five-minute scheduled recovery that refunds abandoned reservations older than 10 minutes. Does not reset balances.
- Image to Video records a job before charging, charges before upstream submission, refunds explicit rejections, and recovers uncertain responses and interrupted charges.
- Per-customer daily D1 quotas for free expensive AI analysis and Live Avatar endpoints; no price changes.
- Admin session age check (180 days, matching existing cookie maximum) and raw admin passcode restricted to login.
- Dedicated rate limits on voice-note/video creation and WebRTC session creation. Calls' prompts/models/connection UX and pricing are untouched.
- Cache-busting on all customer HTML references to callfocus.js and refreshed worker build identification.

## REQUIRED before deploying

1. Make a Cloudflare D1 backup of `callfocus-wallet`.
2. In Cloudflare D1 Console for **callfocus-wallet**, execute the **V16.70 SQL supplied as ready-to-copy text in the ChatGPT response**. Do not run any DROP or wallet-reset operations. The migration creates three independent safety tables and does not alter existing customer tables.
3. Verify three table names appear before deploying V16.70. You can test admin-only `/api/admin/expense-security/preflight` after deploying; it should return `ready: true` when authenticated.
4. Upload the Changes Only ZIP contents to GitHub, preserving relative paths, commit, and activate the new Cloudflare Worker deployment. Refresh Safari tabs to load the new script URL.
5. Test one paid voice note, one short/failed video generation and refund, and the voice-note balance after refresh. Observe Worker logs and compare API bills versus wallet usage.

## Scope/limitations — not complete security clearance

- **KV wallet remains the production source of truth.** The D1 guard serializes the newly hardened paid-generation submissions, but it cannot make unrelated KV-based payment/referral/admin updates atomic. Full transactional wallet cutover remains a separate, high-risk migration requiring live customer-by-customer reconciliation and validation. DO NOT switch the existing `CALLFOCUS_D1_WALLET_WRITES_ENABLED` flag without the audited cutover.
- **OpenAI live-call billing is still based partly on client telemetry.** Do not represent this update as a full live-call usage reconciliation. Provider-side metering and prepaid enforced call limits need an integration test against real provider usage; these were intentionally left unchanged to preserve the established OpenAI voice/calling service.
- The GitHub repository remains public unless the owner changes its visibility. No credentials have been rotated or source-history secrets purged. Review the GitHub/Cloudflare connection before making it private.
- Actual bank settlement, processor fees, chargebacks and API usage by credential must be checked in the connected payment and AI dashboards; source code cannot reveal a missing payout amount.
- Any transient KV failure can still require manual review of a customer wallet. The D1 voice-note journal provides automatic recovery for recorded, pending voice-note reservations, not all wallet transactions.
- A provider-reported successful video request that loses its request ID may be refunded on timeout; that prevents customer overcharging but can leave provider expense. Reconcile provider request IDs after connectivity incidents.

## No changes to

- OpenAI real-time call model, voice names, prompts, tool behavior or session negotiation; payment-gateway verification or prices; saved voice IDs; existing voice-cloning reservation migration; referral amounts; account authentication workflows (except the admin-token validation hardening); site design.

## Test notes

Tests are provided in `test-v1670-security.mjs` (not deployed to public assets). Run via Node and validate SQL using SQLite before deployment. All source-only tests must be followed by a real low-value production canary after the database migration.
