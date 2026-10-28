# CallFocus V16.50 — Two paid ElevenLabs voice pools

Base: V16.49. Scope: ElevenLabs-only permanent voice slot booking and cloned call/note provider routing. The original OpenAI call provider, prompts, credits, payments and other services are untouched.

## Installation sequence (important)

1. Run `permanent-voice-pool-v1650.sql` ONCE in Cloudflare D1 `callfocus-wallet` (CALLFOCUS_WALLET_DB), BEFORE uploading V16.50. Existing bookings become `primary` and keep their original provider.
2. Deploy V16.50 Changes Only over V16.49 (same paths). See `_worker.js` import of `elevenlabs-worker.js` and the permanent slot module; no new Cloudflare D1 binding or Wrangler variables are required.
3. The existing paid ElevenLabs primary account remains stored under encrypted secrets `ELEVENLABS_PERMANENT_API_KEY` and `ELEVENLABS_PERMANENT_AGENT_ID`. Do not rotate them.
4. For your second independently subscribed, authorized ElevenLabs account, store encrypted Cloudflare Worker secrets `ELEVENLABS_PERMANENT_2_API_KEY` and `ELEVENLABS_PERMANENT_2_AGENT_ID`. On the second account grant User access, Voices Write, ElevenAgents Write, and Text to Speech Access. Never store keys in GitHub.
5. Admin > Voice > Limited permanent voice slots: set Account 1 quota to <= account1's true available provider slots (usually 30 Creator), Account 2 quota to <= second account capacity (usually 30 Creator), total max 60, enable `Account 2 overflow` only after the second account reports CONNECTED and the agent is configured. Save slot settings, then Refresh bookings.
6. When pool 1 reaches capacity, the next eligible booking is automatically stored with `provider_pool='secondary'`. Existing reservations and saved voices never migrate or switch API keys. If account 2 is absent or unverified, no account 2 bookings will be accepted; waitlist message displays.

## Provider safety

- Provider subscription checks are live at booking time: physical voice slots and outstanding reserved voice slots are respected. Admin quotas and global cap limit overbooking; D1 atomic insert checks exact pool count and total again when booking.
- Customers are assigned to a provider at booking. Permanent voice creation uses that provider key, signed conversation URLs use that provider's Agent ID, and voice notes use the same provider key. Existing calls and customers on Account 1 are not re-assigned.
- If a provider is down, new bookings fail closed; existing reservations persist.
- No automatic deletion or transfer of permanent voices. No self-retry on ambiguous provider creation errors; preserve booking for manual review.
- A `secondaryEnabled` false setting cannot be saved if secondary users are already booked.
- ElevenLabs currently allows multiple **paid** workspaces, but forbids coordinated account activity intended to evade limits. Use authorized paid subscriptions and confirm your use is allowed. See ElevenLabs policies.

## Verification checklist

- In Admin, primary reports 13/30 booked if that's the live state; second reports not configured until you add the two secrets.
- Initially cap = 30 active while secondary is OFF, even if total configured cap = 60.
- After SECOND account is configured and enabled, cap = 60 active if both quotas are 30.
- With 30 bookings assigned to primary, booking #31 is assigned secondary, without affecting previous customers.
- Voice create, call and TTS all use the assigned account and never fall back to the wrong account's key.
- JavaScript syntax and simulated D1 tests are required before live launch. No live paid subscription tests are performed by this package.
