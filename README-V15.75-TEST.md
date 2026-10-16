# CallFocus V15.75 Visual Test — Dedicated Resend Usage Key

Built directly on CallFocus V15.74.

## Change
The Resend usage dashboard now prefers a separate Cloudflare secret named `RESEND_USAGE_API_KEY` for the official Resend Account Usage API.

- Normal email sending continues to use the existing `RESEND_API_KEY`.
- Usage/quota reads use `RESEND_USAGE_API_KEY` when present.
- If the dedicated usage key is missing, CallFocus temporarily falls back to the existing sending key for compatibility.
- The admin usage panel identifies when the dedicated usage key is active.
- If the dedicated key lacks Full Access permission, the panel reports that specific configuration issue.
- The Resend key remains server-side and is never exposed to the browser.

## Preserved
No changes to sending behavior, recipients, promotional email logic, credits, payments, Cloudflare bindings, KV namespace/structure, authentication model, AI/voice providers, calls or pricing.

Build version: `15.75-test`.
