# CallFocus V16.21: saved cloned voices in the existing call setup

This build adds cloned voices to the current forms and reads CallFocus Admin settings on every cloned live-call start. Website production has not been deployed or promoted.

## The gap corrected

The previous cloned-call client sent a fixed conversation prompt and only a short context. It did not load the owner's master rules, speech style, pace or opening settings. Changing those fields in CallFocus Admin therefore did not control that cloned session.

The cloned-call endpoint now reads the existing `global_config` through the same `getConfig` function used by normal calls. It combines the current Admin Master Rules, Natural Speech Style, Speaking Pace and Default Opening Behaviour with the filled call form, selected language, opening choice and existing call-context builder. The client uses that server-built setup for the selected saved voice.

Admin remains the source of truth. Your pasted rules are not copied into a second independent settings file, and this build does not rewrite your existing Admin settings. When the saved pace is Normal, cloned calls receive the same normal-pace instruction as normal calls. The existing live V4 Turbo model receives pace guidance through the prompt. Cloned voice notes use the Admin pace through their existing model's speed setting.

Ordinary replies do not need repeated AI introductions. The visible pre-call AI/recording notice remains, and a direct question about AI gets a brief truthful answer. Unknown personal details can be deferred naturally. The voice must not claim to be the actual human owner or invent personal history.

## What appears in the interface

- Home: **Clone your voice**, immediately below the existing quick-tool cards.
- New call: a **Clone your voice** panel beside the existing voice choices. Select a saved voice or choose **Create your own voice** without losing the filled call details.
- Repeat calls: the last saved clone is available in the existing thread. Selecting a normal voice switches back to the existing normal call flow.
- Voice Notes: the saved-clone selector and **Create your own voice** button sit beside the existing voice choices. The current AI voice-style designer stays available.
- Voice creation: record or upload your own voice, approve the explicit consent, name it and save it. Saved voices remain account-owned and reusable. The existing three-voice limit remains.
- Standalone `/voice-clone`: remains available and now uses the same current Admin call rules. It also offers the call-language selector.

Recording now satisfies the sample requirement without also requiring an uploaded file. Recorder MIME types are normalized so a WEBM recording with an Opus codec declaration is accepted by the existing upload validation.

The cloned live-call panel uses separate elements and an isolated engine. It records the cloned call in the existing thread and refreshes the authoritative wallet display after the call. Normal voice selections still reach the existing normal calling handlers.

## Exact website files changed from V16.20

| File | Change |
| --- | --- |
| `_worker.js` | Clone-only setup helper and live-start response; Admin pace for cloned-note synthesis; version markers. |
| `voice-clone.js` | Shared clone-only engine for the studio and integrated form; server-provided rules/language/opening; recording fix and call lifecycle events. |
| `voice-clone.html` | Standalone call-language selector, larger context field and matching script version. |
| `index.html` | Home entry and the two isolated clone script references plus scoped stylesheet. |
| `voice-notes.html` | Same isolated assets and home entry for this document. |
| `voice-clone-integration.js` | New opt-in form panels, voice recording modal, saved selection and cloned-call panel. |
| `voice-clone-integration.css` | New styles scoped to cloned-voice elements. |

`callfocus.js`, `callfocus.css`, `admin.js`, `admin.html` and `wrangler.jsonc` are byte-identical to V16.20. Normal call functions, the normal OpenAI session handler, core prompt, existing wallet charging, payment code, account code, storage keys and bindings are preserved. The only change inside the shared voice-note handler is the cloned-provider request's speed setting; the normal OpenAI request is unchanged.

The relevant V16.20 baseline files were compared with GitHub main commit `f0782f2ebe27ee8c519f8b0b0c49d9ea8e961830` and match. No GitHub changes were pushed while preparing these packages.

## ElevenLabs settings already saved

Original agent: `agent_9401m5epp86ceqmb03jgzss0pkyj`.

On its Main branch, **Agent language override** and **First message override** were enabled and published. System prompt and Voice overrides were already enabled. Authentication remains enabled. No API key was exposed, replaced or rotated; no agent, subscription or saved voice was created or deleted during this setup.

The first-message override is blank. For a speak-first call, the client triggers one short opening after connection confirmation, using the current owner opening instructions. For the selected wait-first mode or Admin speak-first disabled, it waits for the other person.

## Files to upload

- **Complete ZIP:** the whole website, based on the exact V16.20 complete build and including the earlier V16.18 credit-integrity fixes. Use this when uploading a complete project.
- **Changes-Only ZIP:** these seven application files plus this README. Overlay it on the current V16.20 source. Do not delete the other project files.

Use one approach. Keep the existing Worker, bindings, secrets and customer storage. Create a new saved preview version without moving production traffic. If a workflow automatically deploys uploads from main, use a preview branch instead. Do not promote this version until the new preview passes the phone check and you approve production promotion.

Historical README files and the V16.20 fixed conversation-rules reference remain in the complete source as history. This README supersedes their agent, prompt and opening descriptions for V16.21.

## Preview check on your phone

Keep the current values:

- `ELEVENLABS_API_KEY`: your existing actual secret key with ElevenAgents Write.
- `ELEVENLABS_AGENT_ID`: `agent_9401m5epp86ceqmb03jgzss0pkyj`.
- `CALLFOCUS_VOICE_CLONE_ENABLED`: `true` for the pilot.
- `CALLFOCUS_VOICE_CLONE_PILOT_EMAILS`: `callfocus.link@gmail.com`, or the current nonblank restricted pilot list.

A nonblank pilot list keeps cloning limited to those accounts, including after production promotion. A blank list allows all enabled customers. This package does not change that list or any environment variable. Sessions are limited to the existing 60-second pilot cap.

1. Open the NEW saved preview URL. Its `/api/app-version` must show `16.21-admin-voice-preview`; older version URLs keep their old code and settings.
2. Sign into Admin on that preview and run **Diagnostics > Test cloned voice connection**. Confirm the original Agent ID above and HTTP 200. This signing check does not start a call or use customer credits.
3. Sign in as `CallFocus.link@gmail.com` on the same preview. Find **Clone your voice** on Home and in the new-call voice section. Your existing **Baron** voice should already appear. Do not recreate or delete it.
4. Fill the existing call form, select Baron, and start a short call. Check the current owner opening, pace, natural speech style, language and interruption behaviour. An actual connected call uses your existing credits.
5. End the call, open the same thread, confirm Baron is still selectable, and check the saved call history and refreshed balance.
6. Check Voice Notes: select Baron there, then switch to Male/Female or an existing AI style and confirm the normal selection still works. Creating an actual note uses existing credits.
7. Test record/upload/consent only if you want another saved voice. You do not need a new voice to test the integrated Baron flow.

## Validation performed

73 automated checks/groups passed using isolated fixtures: 16 Worker/preservation, 15 connection/client, 6 Admin-rule integration, 24 form/recording DOM, and 12 full-app DOM checks. The full-app checks load the unchanged actual `callfocus.js` with both new clone assets and exercise its real form preparation, thread creation and repeat rendering.

Checks cover current settings on successive call starts, full form context, opening/language/voice payloads, single start and single opening, wait-first behaviour, interruptions, cancelled/failed connections without starting the meter, normal-path preservation, consent, recorded-file validation, saved selection, clone transcript isolation, call-history recording, pilot/ownership checks, sanitized provider errors, unchanged wallet charging/idempotence and the 60-second cap. ZIP entry/content and syntax checks were also completed.

No real customer account, wallet or database was modified by these tests. No paid conversation or voice note was started. The cloud browser could not open local preview files and has no usable microphone, so phone layout, real audio quality, exact spoken behaviour and live provider acceptance of this new integrated build still need the preview check. The previous standalone connection was already confirmed working by the owner; that is separate from validating this new interface.
