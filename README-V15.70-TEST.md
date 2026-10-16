# CallFocus V15.70 Visual Test — Custom Direct Email Recipients

Built directly on CallFocus V15.69.

## Change
Admin → Email → Direct email message can now send non-promotional service/account/support/payment messages to **any valid email address**, not only registered CallFocus customers.

- Added a Recipient email(s) field accepting one or more addresses separated by commas, spaces, semicolons or new lines.
- Saved CallFocus customer selection remains available as an optional expandable section.
- Custom addresses and selected customer addresses are deduplicated server-side.
- A direct send can contain custom recipients, saved customers, or both, up to 100 unique input targets per request.
- Invalid custom addresses are rejected before sending.
- `{name}` continues to personalize registered customers; arbitrary addresses without a stored name fall back to the existing neutral `there` value.
- Direct emails remain non-promotional and continue using the existing Resend sender/admin authentication.
- Promotional Email Studio behavior is unchanged.

## Preserved
No changes to pricing, credits, payments, Cloudflare bindings, KV namespace/structure, authentication model, AI/voice providers, calls or deployment configuration.

Build version: `15.70-test`.
