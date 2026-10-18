# V15.95 — Image to Video Integration

Built from **the complete V15.94 source**, preserving all earlier CallFocus features.

- Homepage quick-action button: **Image to Video** (visible near Live AI Avatar).
- New customer route `/image-to-video`: upload one image, prompt, 10/15s, photo crop 9:16 / 1:1 / 16:9 / 4:5, motion styles, preview/download, retry, job history and gallery.
- New server routes: `/api/image-to-video/config`, `generate`, `status`, `history`, `link`, `file/:id`; admin `/api/admin/image-video`.
- Model `grok-imagine-video-1.5-lite`, 720p; existing `XAI_API_KEY` Cloudflare secret, never exposed to the browser.
- Pricing: 10s=300 credits, 15s=450 credits by default, same existing CallFocus wallet. Admin can change pricing/availability and daily cap, feature disabled by default.
- Charged only after xAI accepts the job; the existing wallet usage ledger records charges and refunds with per-job IDs; failure/expired jobs refund automatically when checked by customer, admin, or the added 5-minute scheduled poll.
- Videos saved privately in xAI Files storage (`storage_options`), and retrieved via an authenticated CallFocus proxy with short-lived access URLs; no new Cloudflare R2/KV namespace created. Gallery metadata in original KV.
- Progress animation displays **estimated** completion percentage, never misrepresents a provider-reported value.
- NEW Cloudflare trigger: `*/5 * * * *`, necessary for unattended failure/refund checks. This is the only Worker deployment configuration change. Existing required secrets, KV ID, routes, deployment command remain unchanged.
- Known limitation: Cloudflare KV has no atomic compare-and-swap. Per-user job exclusivity and idempotent wallet IDs reduce duplicate risk, but absolute exactly-once balance mutation under simultaneous overlapping billing cannot be proven using KV alone. Keep disabled until testing, and consider a Durable Object for strict transactional charging under high concurrency.
- Image-to-video aspect is sourced from cropped uploaded image because xAI currently ignores requested `aspect_ratio` in image-to-video.
- xAI provider URLs/status/storage must be verified during live version-URL testing. No live API funds were spent in local validation.

**Deploy using existing `npx wrangler versions upload`; inspect the Version URL, then manually Promote after tests.**
