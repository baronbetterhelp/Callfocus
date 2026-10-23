# CallFocus V16.21 — Voice-cloning popup reference layout

Base: V16.20 complete.

Requested changes only:
- Restored the longer original popup instructions (30–120 seconds), full adult-voice consent and general voice-processing disclosure; no provider names displayed.
- Restored near-full-viewport height with familiar spacing and button sizing on iPhone, without hiding necessary controls.
- Status notice is blank at rest. It updates only in response to recording, selecting an audio file, saving, success, failures, and validations. The area remains reserved to keep the reference spacing stable.
- Saved voices list remains accessible via the expandable footer.
- Updated cache query only for `elevenlabs.css` and `elevenlabs.js`.

No changes to existing OpenAI scripts, calling setup, voice engines, payment integrations, API handlers or Cloudflare secrets. Test the popup on Cloudflare preview before production.
