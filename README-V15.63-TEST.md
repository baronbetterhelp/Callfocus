# CallFocus V15.63 Visual Test — Friendly Rebuild Policy Guidance

Built directly on CallFocus V15.62 Visual Test.

## What changed

- When the Rebuild provider rejects a call-topic prompt as potentially violating usage policy, CallFocus no longer exposes the raw provider error or documentation URL to the customer.
- The Rebuild status now tells the customer: **“Please edit what today’s call is about and try again, or continue without the AI-assisted Rebuild.”**
- The Rebuild feature remains optional, so the customer can continue setting up and start the call without using Rebuild.
- Existing V15.62 response-recovery behavior, V15.61 session authentication fix, and the unified Step 05 layout are preserved.

## Preserved

No changes were made to pricing, credits, Cloudflare bindings, KV/database structure, authentication rules, payments, AI/voice providers, live calls, voice notes, saved callers, Recent Calls, admin features, or deployment settings.

Build/app version: `15.63-test`.
