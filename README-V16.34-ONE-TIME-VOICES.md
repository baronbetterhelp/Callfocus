# CallFocus V16.34 — One-time cloned voices (no permanent saved voice library)

## IMPORTANT

This version does **not** provide unlimited cloning. On the current ElevenLabs Creator plan, custom voice slots are shared by the entire workspace and monthly voice-add/edit operations are limited. Even a clone that is deleted after use consumes a creation operation. This is suitable only for limited testing / low-volume use. For thousands of customers, negotiate suitable provider capacity and a supported commercial arrangement.

## New customer experience

1. Open **Clone your voice** on Home or **Prepare a one-time voice** in the New Call / Voice Note form.
2. Record or upload an adult customer's own voice (with consent). The existing device-side audio conversion remains available.
3. Tap **Use this voice once**. No provider cloning occurs at this point; the sample remains only in the current page's memory.
4. Fill in caller details, dynamics, location, opening, and other existing call fields. Select **Use my prepared voice once**. On starting the call, the server creates the voice, opens the call, then removes the provider voice when the call ends.
5. For voice notes, the server creates the voice, generates the note, then removes the provider voice before returning the result.
6. A new use requires a new preparation step. Refreshing the page loses the temporary audio sample.

### Interrupted calls
The Worker updates a short-lived server-side *lease index* (voice ID only, no sample audio) during active calls. Every five minutes an existing Cloudflare scheduled trigger scans old leases. If no heartbeat is received for more than 20 minutes, it attempts to delete the unused voice. The original `_worker.js` routing and cron setup is otherwise preserved. Provider deletion may be delayed by network or provider failures; the cleanup keeps retrying because lease indexes are not auto-expired.

## DELETE EXISTING CUSTOMER VOICES (manual live admin action)
The new code does **not** delete voices remotely until an authenticated admin deliberately performs cleanup. This is deliberate to avoid executing destructive operations before a deployment is verified.

1. Deploy V16.34 to a preview; verify the no-saved-voice interface and normal OpenAI calls.
2. Promote to the correct production Worker **only if approved**.
3. Go to **Admin → Voice → One-time voice storage**, click **Delete previous customer cloned voices**.
4. Confirm the deletion and type `DELETE ALL CALLFOCUS VOICES` exactly. The Admin page deletes historical customer-created voice IDs in batches, using the ElevenLabs credential configured in the production Worker. The action is **permanent and cannot be reversed**.
5. Check the reported number of deleted and failed voices. Retry the cleanup if needed. Only voices previously indexed under `elevenlabs:voices:<customer ID>` are targeted. Voice IDs from other applications or voices not indexed in CallFocus remain untouched. A full external account may still need manual removal of other voices before cloning can resume.

## Limitations
- The provider's monthly voice creation operations limit remains in force even after deleting each temporary voice.
- Concurrent active calls using temporary voices still occupy provider voice slots until each ends.
- A temporary clone must be created before the call starts; starting may be slower than selecting a saved voice.
- If the provider API is unavailable, one-time creation cannot succeed.
- The existing customer saved voice list disappears in this version. Previous clones are **not** deleted by merely uploading files.
- Live-provider authentication and real calls were **not** exercised from this offline build; the integration was tested with mocked Worker API calls.

## Limited code modifications
- `elevenlabs-worker.js` — one-time voice/lease endpoints, temporary voice cleanup, guarded historical purge
- `elevenlabs.js` — one-time recording / selection / call and note flow
- `elevenlabs.css` — one-time modal layout
- `_worker.js` — routes for authenticated admin purge; cleanup hook on existing 5-minute cron
- `cf-temp-voice-admin.js` — new guarded admin cleanup control
- `admin.html` — cleanup panel and script reference
- HTML cache-bust references for ElevenLabs JavaScript and CSS.

No edits to OpenAI call JavaScript (`callfocus.js`), original OpenAI model prompts/credentials, payment provider handlers, customer wallets, or service pricing calculations.
