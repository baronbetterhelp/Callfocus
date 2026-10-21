# CallFocus V16.19 — Voice Clone Connection Preview

Base: the exact uploaded `CallFocus-V16.18-Credit-Integrity-Complete(1).zip`.
Source ZIP SHA-256: `03c6b6cda2d9cc7f50f59667f3241ed131723f0f87ca5bea827c62942401d713`.

This is a changes-only **preview candidate**. The missing cloned-voice integration is restored. The original ElevenLabs HTTP 401 reason is still unconfirmed until the new private connection test runs with your actual Cloudflare secrets. No real provider call, deployment, customer wallet write, payment or voice deletion was performed while preparing this ZIP.

## Exactly what changes

| File | Scope |
| --- | --- |
| `_worker.js` | Restore the isolated personal-voice endpoints, existing saved-voice key format, cloned voice-note branch and explicit account-deletion cleanup. Add private signing diagnostics, safe error logs, a confirmed-connection billing start, the studio page route and the preview build marker. |
| `voice-clone.html` | Restore Voice Clone Studio; remove internal provider names from its live-call description; load the updated client. |
| `voice-clone.js` | Restore the separate live client; preserve the selected voice after errors; wait for agent metadata before starting the usage meter; handle PCM sample rates correctly; clean up failed connections. |
| `callfocus.js` | Add only the optional saved-voice field to the two voice-note requests and the gated picker loader. Existing V16.18 code is otherwise identical. The normal live-call start function is not wrapped or replaced. |
| `index.html`, `voice-notes.html` | Add the pilot-gated studio links and saved-voice picker; update the changed script cache reference. Existing language choices remain intact. |
| `admin.html`, `admin.js` | Add a separate **Test cloned voice connection** button to Diagnostics. Existing admin code, including V16.18 credit-grant handling, is unchanged. |
| `wrangler.jsonc` | Add `/voice-clone`, `/voice-clone/` and `/voice-clone.html` to `assets.run_worker_first`. All existing KV/D1 bindings, variables, required secrets, schedules and other settings are unchanged. |

The saved-voice storage prefix remains `voice_clone:v1:`. Existing owned voices, including Baron, are read in place; nothing is migrated or recreated. Voice deletion remains an explicit customer action. No new agents, subscriptions, API keys or database tables are created by this code.

## Upload as a preview

1. Back up your current project. Extract this ZIP and overlay its nine application/configuration files on a copy of the **exact V16.18 complete project**. This ZIP is not a complete website. The README is for reference.
2. Upload to a **separate test branch / Cloudflare preview version**. Do not promote it to production yet. If using Wrangler, `wrangler versions upload` prepares a version; `wrangler deploy` deploys it live.
3. Keep the existing assets and storage bindings. A version URL uses its configured resources; it does not automatically create a separate database or wallet.
4. Check these existing values on the **exact new version** being tested. Do not put API secrets in source files or send them in screenshots:
   - `ELEVENLABS_API_KEY`: keep the existing actual secret key.
   - `ELEVENLABS_AGENT_ID`: `agent_7101m5g1eqkdffss7xfx4y3d7cg0`.
   - `CALLFOCUS_VOICE_CLONE_ENABLED`: `true` for the pilot.
   - `CALLFOCUS_VOICE_CLONE_PILOT_EMAILS`: the existing comma-separated pilot customer emails. Preserve a restricted pilot list while testing.
5. After any saved code/configuration change, use that **new version's URL**. Do not reuse `370abcfe...` or another older fixed version URL.

## First test: no call and no customer credits

1. Open `/admin` on the new preview URL and sign in normally.
2. Open **Diagnostics** and press **Test cloned voice connection**.
3. Confirm **Test build** is `16.19-voice-clone-preview` and the displayed **Agent ID** is the new ID above. The panel also shows the exact tested website origin.
4. Send Ruby a screenshot of this diagnostic result. It contains the actual provider HTTP status and a bounded, sanitized provider error code/message. It never displays the API key or signed conversation URL.

This check makes only the server-side signed-URL request. It does not open a conversation, clone/delete a voice, or read/write a customer wallet. It makes no KV or D1 writes. It requires the existing admin authentication; public callers are rejected.

- **HTTP 200 / Signing successful:** the stored key can sign a conversation for the displayed agent on this Worker version. This alone does not prove microphone/audio or the voice override succeeds.
- **HTTP 401/403/etc.:** the exact sanitized provider response is now visible; use it to identify the actual permission/key/workspace restriction. Do not rotate keys or change subscriptions based solely on the status number.
- **Configuration incomplete:** correct only the reported missing setting on the test version, save a new version, then test its new URL.
- **Old Agent ID or wrong build:** the browser is using a different version/configuration. Copy the correct newly saved version URL before retrying.

## Then test the saved voice

Once signing succeeds, open `/voice-clone` on that same preview URL, sign in as the pilot customer and select the existing Baron voice. Start a short live session and end it using **End call**. A connected call uses the existing CallFocus credits normally; the admin signing check above does not.

The separate ElevenLabs test agent was configured with private authentication, prompt and voice overrides enabled, input and output PCM 16,000 Hz and a 60-second maximum conversation duration. This code sends only the prompt and selected voice overrides. It accepts the agent's metadata before starting microphone streaming and the cloned-call usage meter. A failed startup before that confirmation has zero customer usage charge.

Normal GPT-Live calling, existing voice notes, payments and the V16.18 wallet/receipt safeguards remain in place. The existing KV wallet's concurrency limitations documented in V16.18 also remain; this preview is not a wallet migration or a new concurrency repair.

## Validation performed locally

- JavaScript syntax checks passed for the four changed JavaScript files.
- 16 Worker/preservation test groups and 9 client/admin test groups passed using isolated fixtures and mocked provider responses.
- The original bodies of 360 pre-existing Worker functions and the scheduled handler are byte-identical. Only the two explicit clone hooks in existing functions (`handleVoiceNote`, `handleCustomerDelete`) changed.
- Existing `callfocus.js` code is identical after removing the two added optional payload fields and appended picker loader. Existing `admin.js` is an unchanged prefix before the new diagnostic function.
- Tests cover authentication/pilot/voice ownership gates, retained saved voices, HTTP 401/403/404/422/429/500 responses, non-JSON/network/stream failures, secret/URL redaction, rejection of unsafe signed URLs, zero-write admin signing, failed-handshake zero billing, idempotent existing wallet charging, 60-second cap, preserved voice-note language/provider routing, selected-voice persistence and safe text rendering in Admin.
- ZIP integrity and a file-by-file scope comparison against the supplied complete base were checked before delivery.

Live deployment and a successful real cloned-voice conversation are **not yet verified**. Run the private signing check first.
