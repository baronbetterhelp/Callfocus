# CallFocus V15.87 — Safe KoraPay Button Polish (Visual Test)

Based strictly on the authoritative CallFocus V15.85 complete archive after the user rolled back from the earlier V15.86 attempt.

## Changes
- Only the customer-facing `Pay with KoraPay` button visual styling was updated to match the preview direction: filled emerald gradient, shield icon, circular arrow, shadow, and refined mobile spacing.
- The styling target is limited to the existing `.korapay-checkout-btn` element used on the public purchase flow pages.
- No admin layout, payment availability toggles, maintenance controls, payment logic, webhook handling, manual transfer flow, KoraPay flow, server logic, or shared button behavior was changed.
- Cache-busting was updated only on the public HTML pages so the revised `callfocus.css` loads immediately after deployment.

## Files changed
- `callfocus.css`
- `index.html`
- `credits.html`
- `callers.html`
- `voice-notes.html`
- `settings.html`
- `avatar.html`
- `referrals.html`
- `recent-calls.html`
- `profile.html`
- `README-V15.87-TEST.md`

## Testing/rollout
- Upload the changed files to GitHub, let Cloudflare build, then hard-refresh the Version URL or production page to pull the new CSS.
- Confirm the KoraPay button appearance on the customer payment dashboard and verify that the Admin payment availability controls still look and behave exactly as before.
- No Cloudflare secrets, bindings, routes, wrangler settings, or Worker code changes are required for this build.

Version: `15.87-test`.
