# CallFocus V16.17 — Stable (No ElevenLabs Voice Cloning)

## Base and scope

Prepared from the **complete V16.13 stable source**, overlaid with the **V16.14 Flutterwave changes only**. This intentionally precedes V16.15 ElevenLabs voice cloning and is suitable for a parallel production-stable branch. All V16.14 payment workflows and prior KV/D1 bindings remain as they were.

### Scoped repairs
- Image-to-video daily allowance counts active and completed generations, not failed or refunded attempts. Provider-side failure is NOT guaranteed resolved; the history view now displays available per-job error messages to diagnose failure. Payment/credit/refund logic remains unchanged.
- Voice Notes: exposes the same 32 languages as the live-call selector. Reply mode drafts text in the chosen language; Create mode reads the exact supplied script (write the script in your chosen language). Audio generation uses the language for speech guidance. Existing voice-note credits and storage remain unchanged.
- Normal GPT-Live calls: clearer client errors for expired login, account mismatch, microphone denied/missing, insufficient credits, and general connection failures; a safe support error code for otherwise unknown failures. Server records missing key, upstream network failure and malformed provider responses in the **existing admin Diagnostics** page. Upstream API authorization/quota/provider outages still require reading live diagnostics and cannot be fixed or verified solely by static source.
- Asset query strings bumped only where required to load the changed JavaScript.

### Critical separation from ElevenLabs work
This complete release has **NO V16.15/V16.16 ElevenLabs voice-cloning additions**. Do NOT upload the stable package into your separate `voice-clone-dev` branch, or apply it as a "changes only" patch on top of V16.15. Maintain two different branches/versions:
- `main` or a dedicated `stable-v16.17`: customer production stable updates.
- `voice-clone-dev`: unfinished ElevenLabs integration, fixed and tested separately by ChatGPT Work.
Promote only one known-good stable version to Cloudflare production; do not merge the voice-clone work until it passes tests.

### Before production
1. Back up the current repository/version and Cloudflare settings. The complete ZIP uses historical preclone base V16.14; merging into a newer `main` may overwrite subsequent unrelated changes. Compare branch changes before promoting.
2. Upload the entire stable package to a **separate stable branch** first and create a Cloudflare preview version; test with a pilot user. **Never upload on top of an active voice-clone branch**.
3. Admin > Diagnostics > Run diagnostics: check model access and Last session result/error. Share the result to resolve provider or auth failures. Do not expose API keys.
4. Test normal call from a brand new verified/credited account on iPhone, a returning account, voice notes in two languages, image-to-video after a failed attempt, then KoraPay, PocketFi and Flutterwave checkout.
5. Promote the tested stable version to production only when satisfied.

### Validation and limitations
Local syntax checks, static checks, and ZIP integrity passed. No actual OpenAI, xAI, Cloudflare or payment end-to-end calls were run. This release does not claim to solve unresolved provider errors without diagnostics. No wallet migration or D1 write cutover.
