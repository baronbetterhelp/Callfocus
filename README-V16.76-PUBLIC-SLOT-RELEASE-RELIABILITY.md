# CallFocus V16.76 — Public voice slot release reliability

- Fix public slots failing to appear after clicking **Update website slots** when KV caches or other settings saves overwrite release quota.
- Booking-critical release quota, total capacity, availability flags, and Account 4–6 activation are now stored authoritatively in `callfocus-wallet` D1. Legacy KV settings are safely imported on first admin write.
- No manual SQL execution is required: the Worker creates `cf_voice_public_release_control` on its first admin settings/release write. The optional SQL is provided directly in chat, not as an upload sub-file.
- Public release request is retained if provider capacity is temporarily unavailable, but the website advertises only **verified** capacity; the remainder opens automatically when connected accounts have room.
- Positive public slot release opens bookings and clears manually-filled override; existing booking window restrictions remain.
- The admin view now distinguishes requested slots vs live availability and explains capacity blockers.
- No changes to OpenAI, original cloning rules, payment processors, wallet charging, other services or existing voice IDs.
- V16.75 monthly subscriptions and the original-booking date logic remain unchanged.
