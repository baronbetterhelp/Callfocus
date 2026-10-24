# CallFocus V16.44 — Homepage Clone Button Visibility

Based on the complete V16.43 Resend Validation source.

## Admin

Admin → Voice → Voice cloning availability → **Show “Clone your voice” on homepage**. Toggle OFF to hide the CTA for all visitors and customers, or ON to restore it below **Start a new call**. Click **Save cloning settings**.

The visibility control is **independent** of the existing Enable voice cloning switch. Hiding the homepage button does **not** change the availability of ElevenLabs cloned-voice functions elsewhere; the existing cloning-availability switch is still the control to pause provider usage.

The setting is saved in the existing CALLFOCUS_CONFIG KV record. No new Cloudflare variables or migrations are required. Existing KV configurations default to showing the button until you turn it off. For safety, the button stays hidden when the public configuration cannot be loaded. The site checks the setting on page load, when returning to a tab, and periodically while visible.

Files changed: elevenlabs-worker.js, cf-clone-availability-admin.js, admin.html, elevenlabs.js, and HTML cache references in pages that already load elevenlabs.js. No original OpenAI voice route or voice selection code was modified.
