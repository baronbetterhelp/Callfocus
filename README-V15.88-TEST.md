# CallFocus V15.88 — Restore admin payment controls + premium KoraPay button

## Source and scope
This build combines the complete V15.85 payment-availability and maintenance controls with the customer-facing KoraPay button styling previously prepared in V15.87. The confirmed production Worker returned `15.84-test`, so the Changes Only package is computed against the complete V15.84 source to provide the missing admin/server files as well as the latest visual updates. The Complete Build ZIP contains the entire deployable project at ZIP root.

### Functional changes relative to deployed V15.84
- Restore the V15.85 Admin → Payments independent Manual Transfer and KoraPay availability switches, which hide disabled purchase options and reject new initiation requests server-side while preserving existing payment confirmations.
- Restore V15.85 Admin → Dashboard Website Maintenance Mode with dedicated immediate maintenance response and admin recovery access.
- Retain customer-only KoraPay button styling from V15.87, scoped exclusively to `.korapay-checkout-btn`. No shared admin selectors are altered by the styling.
- Keep the V15.85 Worker-first asset path routing additions required for direct visits to receive the maintenance page. All other wrangler settings remain unchanged, including Worker entrypoint, existing KV namespace and binding, static asset binding, `keep_vars`, secret requirements, and sender variable.
- Only update active build/cache identifiers to `15.88-test`. No pricing, existing wallets, AI/voice systems, Paystack, KoraPay payment logic, manual transfer approval logic, or other functionality was intentionally changed beyond the already requested V15.85 availability/maintenance controls.

## Deploy safely
- Upload extracted **Changes Only ZIP** contents to GitHub repository root (`baronbetterhelp/Callfocus`, `main`). The ZIP intentionally includes changed `wrangler.jsonc` for maintenance routing and `admin.js`/`_worker.js` for functional control support.
- Keep Cloudflare build command `npx wrangler versions upload` and do not replace secrets or KV bindings.
- Inspect the Cloudflare **Version URL** and its `/api/app-version` response; it must show `15.88-test`. Verify admin controls appear but do not enable switches during preview because they operate on shared production KV.
- Manually promote only after review; then verify the customer KoraPay design and the admin switches. Test maintenance mode in a controlled low-traffic window, with the admin portal ready to turn it off.

## Testing status
Static syntax, archive and local route/feature presence checks are not live browser or payment-provider tests. Live Cloudflare deployment and API checkout testing must be performed separately.
