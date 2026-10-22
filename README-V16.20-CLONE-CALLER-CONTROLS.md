# CallFocus V16.20: cloned calls on the existing caller screen

Prepared for preview testing. This package has not been deployed or promoted.

## What changed

Cloned calls started from New call or a saved caller/thread now use the existing full caller screen instead of the separate test-call modal. The screen retains its existing layout, caller name, elapsed timer, credit display, minimized call bar, transcript panel, and failure actions.

The controls are connected to the cloned-call engine:

- Mute stops microphone transmission. Speaker toggles playback audio.
- Hold silences playback and microphone transmission until resumed. Connected time, including hold time, still uses credit.
- Transcript opens the existing movable panel. Non-English transcripts use the existing English translation endpoint.
- Redirect stops local playback and requests continuation from the current conversation. Interrupt now requests the main call purpose. These are per-call commands, not changes to saved voice settings.
- End naturally requests one closing turn, waits for its playback, and closes the call. End now disconnects immediately.
- Minimize/restore and End from the minimized bar work with the cloned call.
- A failed connection offers Try again and Back to call setup. Failed setup does not begin metered credit usage.

## Why the previous message appeared

The previous clone-start route applied an eight-attempts-per-hour limit per IP address. Failed attempts counted too. That limiter produced “Too many attempts. Please wait a little and try again.” It was an application pilot restriction, rather than evidence of a new API-key or voice problem.

The hourly start limit has been removed. A short per-account guard permits 12 connection attempts in one minute and returns a short Retry-After value if repeatedly pressed. Normal call usage has no hourly allowance. Voice-list refresh no longer uses the previous 60-per-hour IP limit. Clone creation and deletion protections are unchanged.

## Call duration and credit

The application no longer cuts cloned calls off at 60 seconds or at the balance captured when a call started. It checks the current server wallet during the call, so a mid-call top-up can extend it. A call stops when available credit is exhausted, the connection fails, the participant ends it, or the speech provider ends its conversation. Existing unlimited-credit accounts remain supported. Session records are renewed while active so their storage expiration is not a one-hour call cutoff.

The existing wallet debit function and rate of 100 credits per minute are unchanged. Only the cloned-call meter's fixed 60-second ceiling was removed. Failed setup is not charged, and repeated meter/end requests do not charge the same elapsed time twice. The existing 15-second minimum balance to begin a metered call remains unchanged.

ElevenLabs has a separate agent conversation limit. Its documentation currently allows a maximum of 7,200 seconds per conversation, with a default of 600 seconds. This package cannot make an ElevenLabs conversation unlimited. In the chosen agent, open Advanced, then Call limits, and set Max conversation duration to 7200 if you want the longest supported conversation. Save and publish that agent version if the dashboard requests publication. No agent setting has been changed by this package.

Official duration documentation: https://elevenlabs.io/docs/eleven-agents/customization/conversation-flow

## Preserved

This update starts from the functional V16.19 package based on your V16.18 files. It does not change the normal OpenAI calling code, master rules, admin settings, opening behavior, selected normal voices, speech style, pace, avatar integration, payment code, database schema, or wallet debit function. `callfocus.js`, `callfocus.css`, `admin.js`, `admin.html`, `admin.css`, `avatar.html`, and `wrangler.jsonc` are byte-identical to V16.19.

The cloned-call connection still passes the selected clone ID, selected language, and factual call context. It does not override the agent's saved system prompt, first message, model, speed, stability, similarity, or expressive settings. Voice notes retain their existing flow. Existing saved voices, accounts, credits, consent requirements, and pilot access remain in place. No API key, agent ID, secret, wallet, or production database was changed.

## Files in the changes-only ZIP

Upload these files over the matching functional V16.19 files, preserving their names:

1. `_worker.js`
2. `index.html`
3. `voice-notes.html`
4. `voice-clone.html`
5. `voice-clone.js`
6. `voice-clone-integration.js`
7. `voice-clone-integration.css`
8. `voice-clone-call-screen.js` (new)
9. `README-V16.20-CLONE-CALLER-CONTROLS.md` (this document)

The complete ZIP includes all 194 files. The two optional complete-upload parts contain 97 files each. Their union is exactly the complete ZIP. The parts are not separate builds: upload Part 1 and then Part 2 into the same repository branch, and preview only the resulting complete build. Do not promote the intermediate build after Part 1. If your current files are the matching functional V16.19, the changes-only ZIP avoids this split entirely.

Keep all existing Cloudflare bindings and environment values. The current agent continues to come from `ELEVENLABS_AGENT_ID`; no agent ID is embedded in this update. Pilot visibility continues to use your existing enabled flag and pilot-email allowlist. Uploading these files does not by itself change which accounts are allowed to use cloning.

## Validation and remaining live check

Local tests use synthetic accounts, wallets, microphone/audio stubs, WebSocket events, and provider responses. They do not call ElevenLabs, spend real credit, edit production data, or compare real voice quality.

Passed: 18 server regression groups and 15 client/full-app regression groups, including a simulated 75-minute call with expiring session storage, cumulative/idempotent charging, exact credit exhaustion, top-ups, unlimited-credit accounts, connection guards, consent/saved voices, all caller controls, failed-start recovery, transcript translation and dragging, and both the home and voice-notes pages. Syntax and package overlay checks also passed.

After you upload to a preview, check `/api/app-version` for `16.20-clone-caller-controls`. Sign in with the permitted pilot account, select your saved voice, and test the controls and a call longer than 60 seconds. Confirm the provider's duration limit separately. A real preview call is still required to validate provider behavior and audio on your phone. Promote only after reviewing the preview and approving the live deployment.
