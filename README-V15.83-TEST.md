# CallFocus V15.83 — Kora Compliance Business Name Footer

Built directly on CallFocus V15.82 Sender Recovery, the confirmed production baseline.

## Scope
This update is intentionally limited to the Kora compliance request to clearly display the exact business profile name in the CallFocus website footer.

### Footer compliance change
The existing CallFocus footer now prominently displays:

- `Business Name: Baron Luxury Services`

The CallFocus product branding remains unchanged. The business-name disclosure is added only to existing premium footer locations, including the public Home/About surfaces and signed-in app surfaces that already use that footer.

## Preserved behavior
No changes were made to calling logic, voice/tone, AI prompts or providers, Rebuild behavior, pricing, credits, payments, authentication, customer data, referrals, email behavior, admin functionality, Cloudflare bindings, required-secret protection, or deployment workflow.

The existing safe deployment command remains `npx wrangler versions upload`. `CALLFOCUS_FROM_EMAIL`, required secrets, `keep_vars`, the existing `CALLFOCUS_CONFIG` KV binding, and all other V15.82 deployment configuration are preserved.

Build/app/admin version: `15.83-test`.
