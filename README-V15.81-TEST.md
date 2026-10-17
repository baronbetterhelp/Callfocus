# CallFocus V15.81 Visual Test — Deployment Secret Safety Guard

Built directly on the known-good CallFocus V15.80 Complete build.

## Scope
This is a deployment-safety-only update. It does not change CallFocus call behavior, voice, tone, prompts, models/providers, credits, payments, authentication logic, customer data, UI behavior, or any other website feature.

## Change
`wrangler.jsonc` now declares the critical runtime secret names CallFocus requires before a new Worker version may be uploaded:

- `CALLFOCUS_ADMIN_PASSCODE`
- `OPENAI_API_KEY`
- `PAYSTACK_SECRET_KEY`
- `RESEND_API_KEY`
- `RESEND_USAGE_API_KEY`
- `TAVUS_API_KEY`

No secret values are stored in the repository.

With Cloudflare configured to run `npx wrangler versions upload`, Wrangler validates these required secret names before creating the new version. If any are missing from the Worker configuration, the upload fails and reports the missing names instead of creating a version that silently lacks those integrations.

`keep_vars: true` remains unchanged. Existing KV namespace, static asset binding, routes, compatibility date, and deployment configuration are otherwise unchanged.

Build/app/admin version: `15.81-test`.
