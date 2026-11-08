# CallFocus V16.69 — Image to Video status and background settlement reliability

Base: CallFocus V16.68 Complete Website ZIP. No D1/SQL migration.

## Fixes
- Progress display now shows actual elapsed generation time rather than a fabricated percent that plateaus at 88%.
- Provider status polling now explicitly handles unavailable responses (authentication, throttling, transient 5xx, networking) without reporting success or incorrectly refunding a generation still in progress.
- Explicit failed/expired generation statuses trigger the pre-existing idempotent refund path.
- Failed credit refunds caused by temporary wallet storage issues are retried in the background.
- A lightweight KV active-generation index lets the five-minute background sweep settle current jobs across all users, rather than only the first 60 keys in alphabetical KV order.
- A rotating compatibility scan revisits old in-progress jobs created before the new active index was introduced.
- A customer can resume accepted, submitting and processing jobs; the UI prevents overlapping status requests.
- Video generation, image prompts, provider model, prices, customer authentication, original OpenAI voice calling, customer wallets' existing calculation functions and all other services are unchanged.

## Important operation notes
- This does not prove any particular user's generation failed: check each job's actual status, not the elapsed display.
- The existing wallet charge occurs upon provider acceptance and refunds only after an explicit terminal failure/expiry or unusable completed output; temporary status-check failures keep the job pending.
- Customer history continues to show jobs, including old jobs; background scans progressively reconcile older items.
- Cloudflare secrets are not included in either ZIP.
- After deployment, verify a completed generation and download on an authenticated account, a known provider failure/refund on a test account, cron activation, and old job restoration in production.
