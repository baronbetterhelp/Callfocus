# CallFocus V15.82 — Sender Variable Recovery + Deployment Safety

Built directly on CallFocus V15.81 Deployment Safety Guard.

## Scope
This update is intentionally limited to restoring the previously configured non-secret CallFocus sender variable for safe future GitHub/Cloudflare version uploads.

### Restored variable
- `CALLFOCUS_FROM_EMAIL` = `CallFocus <accounts@callfocus.link>`

The value is stored as a normal Wrangler `vars` entry because it is not a secret. This ensures future `wrangler versions upload` builds carry the sender identity even if the Cloudflare dashboard variable is missing.

### Preserved V15.81 deployment protection
The following existing secret names remain required before a new Worker version can be uploaded:
- `CALLFOCUS_ADMIN_PASSCODE`
- `OPENAI_API_KEY`
- `PAYSTACK_SECRET_KEY`
- `RESEND_API_KEY`
- `RESEND_USAGE_API_KEY`
- `TAVUS_API_KEY`

`keep_vars: true`, the existing `CALLFOCUS_CONFIG` KV namespace, `ASSETS` binding, routes, compatibility date, and all other deployment settings are preserved.

## No product/runtime behavior changes
No changes were made to calling logic, voice/tone, AI prompts or providers, pricing, credits, payments, authentication, customer data, Rebuild behavior, email templates, admin behavior, or unrelated UI.

Build/app/admin version: `15.82-test`.
