# CallFocus V16.19 — Isolated ElevenLabs voice cloning

Complete project based on `CallFocus-V16.18-Credit-Integrity-Complete(4).zip`.

## Scope and non-negotiable preservation

The existing `callfocus.js`, `callfocus.css`, `admin.js`, admin settings, existing OpenAI realtime/voice-note code, original OpenAI voice selections, and other provider/API handlers have **not been edited**. OpenAI Male/Female calls and standard voice notes still go through their original code paths. ElevenLabs is a separate, optional path used only after selecting a saved cloned voice.

Only the following changes were made:

- Add `elevenlabs-worker.js`, `elevenlabs.js`, `elevenlabs.css`.
- Add one import and one **new** `/api/elevenlabs/*` route dispatch in `_worker.js`, leaving all pre-existing API handlers and OpenAI code unchanged.
- Add stylesheet/script references to 9 existing customer HTML pages so the cloned-voice controls can appear with the same account session.
- Exclude the server-only `elevenlabs-worker.js` from published static assets via `.assetsignore`.
- Add this README. The site's existing URLs, payment providers, user auth, and OpenAI voice functionality are not replaced.

## Before deploying

1. Make a backup / keep the V16.18 deployment so you can immediately roll back if needed.
2. Confirm that your **existing** Cloudflare Worker has an `ELEVENLABS_API_KEY` secret and an `ELEVENLABS_AGENT_ID` variable or secret, and that the agent actually exists in the same ElevenLabs workspace. The adapter also recognizes `ELEVEN_LABS_API_KEY`/`ELEVENLAB_API_KEY` and `ELEVEN_LABS_AGENT_ID`/`ELEVENLAB_AGENT_ID` if you used those spellings. **Do not put the API key into a JavaScript file or page.**
3. In ElevenLabs, open the linked conversational agent, then **Security → Overrides** and enable **System prompt**, **Voice ID**, and **First message**. This allows CallFocus to inject the existing *About you*, *About caller*, *Conversation dynamics*, *Today's topic*, locations, time zones, language, and opening preference into the ElevenLabs call; otherwise ElevenLabs may reject/ignore these overrides. Make sure the agent's selected model and language support your desired conversation.
4. Deploy this complete ZIP using your normal Cloudflare Workers + GitHub workflow. Keep your current KV (`CALLFOCUS_CONFIG`) and other bindings, secrets, and variables in place. No database migration is required for cloned voice metadata; it is stored under `elevenlabs:voices:<accountId>` in existing KV.
5. On a *preview* Worker deployment, sign into CallFocus. Tap the new **Clone your voice** home control, record or upload your own audio with consent, save it, then find it in **New call** and **Recent calls/Continue previous conversation** after entering the normal call details. Normal Male/Female selection continues to select OpenAI. A saved clone selects ElevenLabs.
6. In the voice-note Create mode, selecting a clone generates an ElevenLabs MP3 with its own player/download link; standard OpenAI voice-note behavior is unchanged when no clone is selected. Reply drafting still uses the original OpenAI route; a cloned-voice scripted note is handled separately.

## URLs (authenticated)

- `GET /api/elevenlabs/voices`: only the signed-in customer's saved clones.
- `POST /api/elevenlabs/clone`: send a self-owned adult voice recording and consent; up to 3 voices/account.
- `POST /api/elevenlabs/session`: check customer balance, create an existing-format CallFocus call-usage record, return a temporary signed agent WebSocket URL.
- `POST /api/elevenlabs/tts`: ElevenLabs cloned voice note, charged through the **existing CallFocus wallet-consume** handler using the returned audio duration.

ElevenLabs conversations reuse the original prepared call data and current CallFocus call usage tracking, timer, end controls, and credit reconciliation. The ElevenLabs third-party service has its **own charges**. The admin's provider dollar-cost metrics cannot be populated reliably from ElevenLabs' WebSocket audio events; cloned calls are identified as `elevenlabs-agent`, and the provider cost is not falsely labeled as an OpenAI charge.

## Important verification limits

- Static JavaScript syntax and isolated mock endpoint tests were run, including clone, authorized voice lookup, signed session, and timed credit charging. No real secret was imported from your Cloudflare account, so **a live ElevenLabs microphone conversation and Cloudflare deployment have NOT been verified** by these tests. Verify with a preview URL and real configured credentials before promoting to production.
- ElevenLabs account eligibility, per-voice verification, Agent security permissions, microphone access, and ElevenLabs plan limits still apply. Your recorded/upstream stored cloned voices are not converted into OpenAI voices.
- This adds voice-note playback/download for generated cloned notes without editing the existing OpenAI voice-note history persistence code. It does not change that history system; if you need cloned notes in the original history, that must be a separate explicitly scoped change.
- Built-in OpenAI-only special in-call controls (such as OpenAI-specific realtime redirection) are not remapped to ElevenLabs. ElevenLabs receives context through its own agent prompt and websocket.

## Changed original file manifest

`.assetsignore`, `_worker.js`, `index.html`, `voice-notes.html`, `avatar.html`, `callers.html`, `recent-calls.html`, `referrals.html`, `profile.html`, `credits.html`, `settings.html`.

**All other original files are byte-for-byte the same as V16.18.**
