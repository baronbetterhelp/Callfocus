# ToolCart V1.3 - Cloudflare Password Hash Compatibility

## Fix
- Fixed account registration failing with `NotSupportedError: Pbkdf2 failed: iteration counts above 100000 are not supported (requested 310000)`.
- PBKDF2-SHA256 password derivation now uses 100,000 iterations, the maximum accepted by the current Cloudflare Workers runtime.
- The same compatible derivation is used consistently for signup, sign-in verification, password changes, password reset, and Admin credentials.

## Preserved
- Temporary `ALLOW_UNVERIFIED_SIGNUP = true` remains enabled so signup works without Resend during development.
- D1 database ID remains `ef8f71eb-dd5a-41dd-b049-bfe85066aa98`.
- `APP_ORIGIN` remains `https://toolcart.mgt-toolcart.workers.dev`.
- D1 binding `DB`, database `toolcart`, R2 binding `MEDIA`, and bucket `toolcart-media` are unchanged.
- No D1 migration is required for this version.

## Deployment
Upload the Changes Only files to the root of the existing ToolCart GitHub repository and replace matching files. Cloudflare can keep using:

`npm run db:migrate:remote && npx wrangler deploy`
