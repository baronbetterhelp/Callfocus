# CallFocus V15.62 Visual Test — Rebuild Response Resilience

## What changed

- Fixed the intermittent **“CallFocus could not build the call plan. Please try again.”** failure seen after Rebuild had already worked successfully.
- Root cause: the Rebuild endpoint required strict JSON from the model. An otherwise usable response could occasionally arrive as plain call-plan text or slightly malformed JSON, causing CallFocus to reject it even though a valid plan was present.
- Added tolerant server-side recovery that accepts the intended strict JSON response first, but can safely recover a substantive plan beginning with **“Natural call plan”** when formatting drifts.
- If the first model response genuinely contains no recoverable plan, CallFocus now performs one targeted retry asking for either the strict JSON contract or plain plan text.
- The retry happens only after an unparseable successful provider response. Authentication, quota and rate-limit failures are not blindly duplicated.
- Existing V15.61 customer-session authentication repair and unified Step 05 Rebuild layout are preserved unchanged.

## Unchanged

No changes were made to pricing, credits, account/session rules, Cloudflare bindings, KV/database structure, Paystack/manual payments, voice provider, OpenAI model selection, live-call flow or deployment configuration.

## Build

`15.62-test`
