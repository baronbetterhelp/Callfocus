# CallFocus V11.1

Shared credit update.

- Live calls and generated voice notes use the same wallet.
- 50 credits = 1 minute of either live-call time or generated voice-note audio.
- Voice notes deduct credits using their generated audio duration, and generation is length-constrained to the remaining shared balance when possible.
- Starter 75 credits / 1:30 can be spent across either feature.
- Voice-note history records credits used.
- Existing permanent KV binding and Admin configuration are preserved.

This is still a browser-local prototype wallet. Move balances and usage accounting to Supabase/D1 before enabling real payments.
