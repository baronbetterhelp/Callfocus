# CallFocus V15.61 Visual Test — Rebuild Authentication & Unified Topic Panel

## What changed

- Fixed **CallFocus Rebuild** incorrectly returning **“Sign in to rebuild your call plan.”** for customers who were already signed in.
- Root cause: the V15.60 Rebuild request called the authenticated Worker route without the existing customer Bearer session token.
- Rebuild now reads the same `callfocus_server_session_v1` customer session already used by CallFocus and sends it in the `Authorization: Bearer …` header to `/api/call-plan/rebuild`.
- The Worker authentication model is unchanged. Explicit sign-out and account/auth-version revocation continue to invalidate sessions exactly as before.
- Reworked the visual placement of **CallFocus Rebuild** so it reads as part of the existing **What today’s call is about** step rather than as a separate nested panel.
- Removed the extra Rebuild card background, rounded outer border and shadow. A restrained divider now connects the Rebuild action to the call-topic field while preserving the Recommended badge, status feedback and full-width mobile action button.
- The same integrated treatment applies to both completely new calls and repeat calls.

## Unchanged

AI providers/models, live voice, credits/pricing, Paystack, manual payments, referrals, caller auto-fill, authentication/session rules, KV/database structure, Cloudflare bindings, Admin configuration, location search and deployment settings remain unchanged.

## Build

`15.61-test`
