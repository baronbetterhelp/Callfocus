# CallFocus V16.15 — Voice Cloning Pilot (Changes Only)

**Base:** V16.14 Flutterwave GitHub source. **Status:** Working code scaffold / pilot; **not production-validated** against a paid ElevenLabs Agent. The new capability is OFF by default.

## Scope

- Adds `voice-clone.html` and `voice-clone.js`: a separate studio for customer-owned voice samples, saving/deleting personal clones, a metered 60-second ElevenLabs Agent live-conversation pilot, and a shortcut to existing Voice Notes.
- Adds authenticated, user-isolated server routes: `GET/POST/DELETE /api/voice-clones`, `POST /api/voice-clones/live/start`, `POST /api/voice-clones/live/meter`.
- Existing Voice Notes accepts a `voiceCloneId` **only if** the signed-in user owns the verified clone. Otherwise the existing GPT-4o mini TTS route remains unchanged. Existing note history and client-side credit usage remain unchanged.
- New-call modal gains an OPTIONAL cloned voice selector and uses the existing saved call context to launch an isolated cloned-voice conversation. Standard GPT-Live runs as before when no clone is chosen. Recent-call repeat flows remain on GPT-Live.
- New public links appear in the Home hero and Voice Notes page. No payment keys, wallet migration, pricing, provider settings, or legacy call path changes.
- Uses existing `CALLFOCUS_CONFIG` KV namespace. No D1 migration.
- Limits customers to three voices each. ElevenLabs subscription and workspace quota are **additional** limits; assess commercial capacity before public release.
- User must declare that the recorded voice is their own and consent to the cloning. Provider-required verification blocks an unverified voice from being used. The UI labels output AI-generated. In a production rollout, add stronger ownership verification, explicit speaker disclosure rules, abuse review, and privacy/legal retention controls.

## GitHub / Cloudflare

Upload these 7 files from the ZIP at the repository root, replacing *only* existing files of the same names:

- `_worker.js`
- `callfocus.js`
- `index.html`
- `voice-notes.html`
- `wrangler.jsonc`
- `voice-clone.html` (new)
- `voice-clone.js` (new)

Read this README before enabling. Use the standard GitHub upload and Cloudflare preview/version promotion workflow; `npx wrangler versions upload` alone does not deploy to production.

## Provider setup **required before testing**

1. Create an ElevenLabs workspace/subscription with API access to Instant Voice Cloning, Text to Speech and ElevenAgents. Review its voice and concurrency limits and prices.
2. In ElevenLabs create a **private Agent**. Enable authentication / signed URLs and **Voice ID** and **System Prompt** conversation overrides in Agent Security. Configure 16 kHz PCM WebSocket input/output and a **maximum conversation duration of 60 seconds** for this pilot. Put CallFocus AI disclosure, no impersonation, no fraud, no sexual content and consent requirements in the Agent's permanent system instructions. Confirm your account permits overrides with your chosen Agent model.
3. In Cloudflare `callfocus` Production secrets/vars, add:
   - `ELEVENLABS_API_KEY` — provider API key (Secret; never GitHub).
   - `ELEVENLABS_AGENT_ID` — private Agent ID, `agent_...`.
   - `CALLFOCUS_VOICE_CLONE_PILOT_EMAILS` — comma-separated CallFocus sign-in emails allowed for early testing. **Set this before enabling.**
   - `CALLFOCUS_VOICE_CLONE_ENABLED` — start with `false`. Set to `true` only after first three items are securely configured and build is deployed. When no pilot email list is supplied, enabling exposes the feature to all signed-in customers, so do not omit the list during testing.
4. For Cloudflare preview testing, also assign the corresponding API key and Agent ID to Previews or use a dedicated test merchant/preview environment.
5. Test ONLY your own consenting adult voice: record 30–120 seconds; create clone; wait for any required provider verification; generate a short Voice Note; start a 60-second private Agent call. Confirm microphone, output audio, transcript, idempotent credit deduction and end-on-credit-exhaustion on an iPhone before any wider launch.

## Important pilot limitations

- **Not live-tested** against ElevenLabs or on the owner's iPhone. Only syntax, integration mocks and file integrity can be checked offline. APIs and Agent security settings can reject requests until configured.
- Live calls run through **ElevenLabs Agents**, not the existing GPT-Live audio path, so naturalness, interruption behavior, voice quality and call context must be validated independently.
- **Billing pilot:** authenticated server timestamps and an existing wallet ledger are used for metered 60-second call segments; no provider-side disconnection enforcement exists in this build. Agent dashboard max-duration setting is essential. Do NOT enable to the full customer base until end-of-call metering, provider duration reconciliation, and long-session/disconnect edge cases are verified in a real call.
- Clone creation itself does not charge CallFocus wallet credits in this pilot. ElevenLabs charges your ElevenLabs account. Determine cloning price, quota and concurrency before commercial activation.
- The existing voice-note flow uses its current audio-duration billing mechanism. Review production-side billing protections as part of later release.
- Generated audio samples are passed to ElevenLabs. CallFocus KV stores only voice IDs, names and customer ownership metadata, not recordings.
- This changes no existing PocketFi, KoraPay, Flutterwave or Paystack logic and is deliberately unrelated to the CAC policy file `terms.html`.

## API sources

ElevenLabs Instant Voice Cloning: https://elevenlabs.io/docs/eleven-api/guides/how-to/voices/instant-voice-cloning
ElevenLabs text-to-speech: https://elevenlabs.io/docs/api-reference/text-to-speech/convert
ElevenAgents WebSocket: https://elevenlabs.io/docs/eleven-agents/libraries/web-sockets
ElevenAgents private authentication: https://elevenlabs.io/docs/eleven-agents/customization/authentication
ElevenAgents permitted conversation overrides: https://elevenlabs.io/docs/eleven-agents/customization/personalization/overrides
