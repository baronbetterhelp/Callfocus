# CallFocus V16.20 - Natural Voice Preview

Base: the complete V16.19 build supplied in this conversation, including its V16.18 credit-integrity fixes. This update is limited to the approved first conversation setup.

## What has been applied in ElevenLabs

The owner approved publication of the revised system prompt on the original CallFocus Cloned Voice Agent:
agent_9401m5epp86ceqmb03jgzss0pkyj

The prompt was published to Main and the dashboard returned to a disabled Publish button. Only the system prompt appeared in the publication review.

The approved rules are included in CALLFOCUS-V16.20-CONVERSATION-RULES.txt. They specify warm everyday conversation, normally one to three short sentences, context-aware replies, subtle expression, a clear unhurried pace, no repeated AI introductions, and a brief truthful answer when directly asked about AI identity. Existing protections and speaker consent remain in place.

The existing first message remains blank, allowing the other person to speak first, with the existing 7-second wait. English remains the configured language. Existing V4 Turbo expressive mode, stability 0.50 and similarity 0.75 were retained. The selected saved voice, including Baron, continues to be sent per call. The dashboard's Eric fallback does not replace the explicitly selected saved voice.

V4 Turbo does not offer the usual numeric speed parameter. This setup guides delivery through the prompt rather than adding an unsupported speed override.

## What changes in the website source

Only three application files differ from V16.19:
- voice-clone.js: replace the old per-call system-prompt assignment with the exact approved conversation rules followed by the supplied call context; update its version comment. WebSocket fields, selected voice, audio processing, connection lifecycle and credit metering are unchanged.
- voice-clone.html: show one visible notice about AI, recording and provider processing immediately before Start live voice; update the client script cache reference.
- _worker.js: update only the private diagnostic build marker and /api/app-version response to 16.20-natural-voice-preview. No Worker functions, API routing, wallet handling or provider connection code are changed.

The clear pre-call notice avoids using repeated spoken AI introductions as the disclosure mechanism. It does not add a checkbox or alter the call flow.

The home page, panels, additional languages, payment integrations, account code, voice notes, normal live calling, saved voices, storage bindings and feature gates are unchanged.

## Which ZIP to use

The Changes-Only ZIP contains the three application files plus this README and the conversation-rules reference. Overlay it on the complete V16.19 project.

The Complete ZIP contains the entire website. No older base ZIP is needed.

Do not upload both ZIPs as separate projects. Extract and upload the files using your established deployment workflow.

## Preview test and existing settings

Website production has NOT been deployed or promoted while preparing this update. Upload this source as a new preview, retain all existing resources and secrets, and test that new version's URL.

Keep:
- ELEVENLABS_API_KEY: your existing actual secret key, with ElevenAgents Write already enabled.
- ELEVENLABS_AGENT_ID: agent_9401m5epp86ceqmb03jgzss0pkyj.
- CALLFOCUS_VOICE_CLONE_ENABLED: true for this pilot.
- CALLFOCUS_VOICE_CLONE_PILOT_EMAILS: callfocus.link@gmail.com, or the existing nonblank restricted pilot list.

A blank pilot list allows all customers when enabled. This package does not change the list or any secret. No agent ID or API key is hardcoded into application code.

An older fixed preview URL will continue to load its earlier website code. Publishing the agent prompt alone will not replace the old prompt still sent by an older CallFocus client.

1. Confirm /api/app-version shows 16.20-natural-voice-preview on the new preview.
2. Sign into Admin on that preview. Run Diagnostics > Test cloned voice connection. Confirm the original Agent ID above and HTTP 200.
3. Sign in as the pilot customer on the same preview. Open /voice-clone, select the existing Baron voice and use a short, ordinary conversation context.
4. Start a brief call, speak first, check natural replies and interrupt once. End the call normally. A connected live call uses existing credits.
5. During a separate test, ask directly whether it is AI and confirm a short truthful answer without repeated disclaimers afterward.

A live audio-quality test of this new prompt is still required on the owner's microphone. The cloud browser previously had no usable microphone. Static tests do not prove naturalness, pronunciation, language quality or exact pacing.

## Validation

The existing 16 Worker/preservation groups and 9 client/admin groups were run against this candidate with isolated fixtures and mocked provider responses. Syntax, prompt transport, file preservation, cache references and ZIP integrity were checked before delivery.

The entire Worker is byte-identical to V16.19 after reversing only the two build-string changes. All other website application files are identical apart from the two studio files listed above. No production wallet/database changes, API key rotation, voice deletion or subscription change was performed.

Historical V16.19 README files are retained as source history. Their test-agent references are superseded by the original Agent ID specified in this README.
