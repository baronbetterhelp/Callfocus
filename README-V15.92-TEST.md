# CallFocus V15.92 — Admin Control Recovery & Release Identification

**Authoritative source:** `CallFocus-V15.91-Bonus-Credits-Promotion-Complete.zip` (not V15.84/V15.85, and not a partial archive).

## Scope

- Retains all original V15.91 administrative screens, handlers and protected API endpoints, including Manual Transfer and KoraPay switches, website maintenance mode, bonus-credit percentages, editable fixed-price packages, popup time controls, customer management, email templates, Quick Start promotions, cost reporting and other admin capabilities.
- Adds three navigation shortcuts on the existing admin Dashboard to *existing* controls: Payment methods; Credit offers & bonus popup; Website maintenance. These shortcuts do not duplicate or change any configuration values.
- Shows the bundled Admin build version and the live Worker `/api/app-version` result within the Dashboard, with a warning if versions disagree. This helps detect incomplete GitHub uploads / mixed production assets.
- Bumps only required build and cache references from `15.91-test` to `15.92-test`.
- No change to payment capture, payment secrets, credit calculations, live call, voice note, AI provider, notification, KV, Cloudflare bindings, routes or deployment workflow.

## Rollout cautions

1. **Deploy a single matched source tree.** Upload/extract the *contents* of the Complete ZIP to GitHub repo **root**, replacing matching files (not the `.zip` itself or a nested folder). The Changes Only ZIP is only for a **confirmed exact V15.91 GitHub source**. Mixing V15.84 Worker assets with V15.91 admin assets is unsafe.
2. Confirm the Cloudflare build uses `npx wrangler versions upload`, **not** automatic production deploy.
3. On the uploaded Worker Version URL, `/api/app-version` must return `15.92-test`; `/admin` must display `Admin 15.92-test · Worker 15.92-test`, and show the three quick links after sign-in. Visit Payments and verify both payment switches and editable offers are present **without saving changes**, because preview and production share KV.
4. Promote manually only after verifying the full admin page, customer credit page and unchanged payment availability. Do not toggle live maintenance or bonus controls during preview testing.
5. If the public site still reports `15.84-test`, the new Worker version has not replaced production. Do not overwrite or delete your KV/secrets. Inspect active Cloudflare versions/rollout first.

Local JavaScript syntax, ZIP, static control presence, mock browser navigation and asset consistency checks do not equal live Cloudflare or live payment tests.
