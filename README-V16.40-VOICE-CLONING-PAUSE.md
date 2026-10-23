# CallFocus V16.40 — Voice cloning availability switch

This changes **only** the one-time cloned-voice UI/server and adds a separate Admin → Voice availability panel.

- Default: **paused** for safety after deployment (unless you enable it from Admin).
- Admin → Voice → Voice cloning availability: enable/disable cloning, edit customer-facing unavailable text, save.
- Customer pressing Clone your voice sees an uncluttered branded message instead of recording controls while paused.
- `/api/elevenlabs/session` and `/api/elevenlabs/tts` return 503 with code `voice_cloning_paused`, without creating or charging for clones.
- `/api/elevenlabs/heartbeat` and `/api/elevenlabs/release` continue working for in-progress sessions.
- No settings require D1 changes; existing `CALLFOCUS_CONFIG` KV binding is used.
- Original OpenAI calling files/rates and the referral dashboards are not edited.

New files: `cf-clone-availability-admin.js`.
Changed files: `_worker.js`, `elevenlabs-worker.js`, `elevenlabs.js`, `elevenlabs.css`, `admin.html`, `admin.css`, `index.html`, `voice-notes.html`.

**Note:** Existing active cloned calls can finish when a pause is enabled. The pause blocks *new clone creation*.
