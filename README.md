# CallFocus V1

A first working browser build for the CallFocus realtime AI calling website.

## What is included

- Customer dashboard
- Saved caller profiles
- Caller-specific memory, dynamics and optional rules
- Call-specific regions and time zones for Caller A and Caller B
- Optional new-call topic/details
- Male/Female customer choice mapped to admin-selected OpenAI voices
- Admin page for voice defaults, model and master instructions
- Real WebRTC connection to OpenAI Realtime API
- Assistant can speak immediately after the session is created
- Phone-style live call screen with timer, microphone mute, audio mute and end call
- Local browser call history for V1

## Deploy on Cloudflare Pages

1. Create a GitHub repository and upload the contents of this folder, keeping `functions/api/session.js` in the same path.
2. In Cloudflare: Workers & Pages → Create → Pages → Connect to Git.
3. Choose the repository.
4. Framework preset: None.
5. Build command: leave blank.
6. Build output directory: `/` (or the repository root, depending on the Cloudflare UI).
7. Deploy.
8. Open the project in Cloudflare → Settings → Variables and Secrets.
9. Add a secret named `OPENAI_API_KEY` containing your OpenAI project API key.
10. Redeploy after adding the secret.

The OpenAI key stays in the server-side Pages Function and is never placed in `app.js`.

## Important V1 limitation

Caller profiles, admin settings and call history are stored in `localStorage` for this first test build. That means they are tied to one browser/device. The next database version should move these into Supabase with authentication and separate customer/admin permissions.

## Realtime API

The server endpoint follows the current OpenAI unified WebRTC flow: the browser creates an SDP offer, the server sends it with session configuration to `POST /v1/realtime/calls`, and the SDP answer is returned to the browser.
