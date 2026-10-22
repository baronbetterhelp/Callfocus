# CallFocus V16.19: functional voice cloning on V16.18

This build starts with your exact `CallFocus-V16.18-Credit-Integrity-Complete(2).zip` and adds functional voice cloning with the V16.21 placements. It does not include the later voice tuning or admin-rule changes.

## What is connected

- A **Clone your voice** button below the four existing homepage tools.
- A **Clone your voice** panel in new-call setup, repeat-call setup and voice notes, alongside the existing normal voices and AI voice-style builder.
- A recording/upload dialog, explicit own-voice consent, saved-voice creation and saved-voice selection.
- Cloned live calls using the selected saved voice, the completed call details, the selected language and the existing CallFocus credit system.
- Cloned voice notes using the existing script/reply flow, history and credit system.
- The standalone `/voice-clone` studio.

Your existing saved voice records, including Baron, use the same storage keys. No migration or replacement of those records is required.

## Voice setup is left to you

No ElevenLabs account or agent settings were changed to make this package. The cloned-call connection supplies only the selected voice, the customer-selected language and factual call context. It does not supply a system-prompt override, first-message override, speaking-pace setting, stability, similarity, style, speed or turn-taking preset.

The ElevenLabs agent controls its own greeting, prompt, delivery and conversation behavior. The website's existing call-opening choices and master voice rules continue to work through the original OpenAI path; this build does not copy them into or reconfigure your ElevenLabs agent. Configure the cloned agent's behavior in ElevenLabs yourself, as requested.

Cloned voice-note synthesis sends the text to the selected voice without sound-setting overrides. The existing V16.18 text/reply generation behavior is retained.

## What remains V16.18

The original OpenAI live-call functions, normal voice instructions, normal speech settings, admin pages, configuration defaults, wallet-charge functions, payments, account functions and scheduled jobs are unchanged. The normal voice-note provider request is unchanged when no clone is selected. The only changes inside the existing frontend JavaScript are two optional selected-clone fields for voice-note requests.

No production deployment, account change, key rotation, customer-data update or production wallet/database write was performed while preparing or testing this build.

## Files in the changes-only ZIP

Replace these five files from V16.18:

- `_worker.js`: isolated clone endpoints, standalone studio routing, version label and an optional cloned voice-note synthesis branch.
- `callfocus.js`: pass a selected cloned voice in the two existing voice-note requests.
- `index.html`: homepage placement and clone asset loading.
- `voice-notes.html`: clone asset loading.
- `wrangler.jsonc`: three standalone studio paths added to `run_worker_first`. All existing bindings and variables are retained.

Add these five files:

- `voice-clone-integration.js`
- `voice-clone-integration.css`
- `voice-clone.js`
- `voice-clone.html`
- This README.

## Which ZIP to use

- **Complete**: use this to create a clean preview from the requested V16.18 base, especially if your current files came from V16.21 or another later build. It contains every original V16.18 file plus the changes described here.
- **Changes Only**: overlay this on the exact V16.18 base. It is not a rollback package for later versions and will not remove unrelated later files.

Upload the ZIP contents at the website root, without an extra enclosing folder. Keep your existing Cloudflare bindings and secrets. This package contains no private keys.

## Existing setup needed on the preview

Reuse `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `CALLFOCUS_VOICE_CLONE_ENABLED` and `CALLFOCUS_VOICE_CLONE_PILOT_EMAILS`. The existing key must be able to create/read the saved voices and obtain a signed conversation URL. The agent must permit the voice and language overrides used by the connection.

Keep the pilot email list set to your test account if you want cloning to remain limited to that account. A blank pilot list allows all signed-in accounts when the feature flag is enabled. The feature flag and pilot list must be present on the exact preview version being tested.

This retains the existing 60-second cloned-call test limit and three saved voices per account. Normal calls retain their V16.18 limits and behavior.

## Checks performed

Twenty-one automated test groups passed using synthetic accounts, saved voices, provider responses, audio devices and local wallet data. They cover recording/upload and consent, preservation of an existing Baron record, ownership and pilot access, signed-URL failures and redaction, connection startup and cancellation, audio formats and interruption events, credit settlement, cloned calls, repeat calls and both cloned and normal voice notes.

The checks also compare all existing Worker function bodies with V16.18: only the voice-note function changes, to add the optional clone branch. The existing normal call prompt, configuration defaults, scheduled handler, admin files and primary stylesheet match V16.18 exactly. Removing the two optional clone fields recovers the exact V16.18 `callfocus.js`.

A real microphone conversation from this new package has not yet been tested against your deployed preview. After uploading, test an unpromoted preview with your pilot account: select Baron, complete the usual call details, start and end a short cloned call, then test a cloned voice note and a normal Male/Female call. Review the result before promoting anything to production.

Source archive SHA-256: `03c6b6cda2d9cc7f50f59667f3241ed131723f0f87ca5bea827c62942401d713`.
