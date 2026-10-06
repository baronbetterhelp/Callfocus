# CallFocus V12.7 — Live AI Avatar

## New feature
- Adds a first-class `/avatar` page and Home/Menu entry for Live AI Avatar.
- Signed-in users can upload one selfie, choose a stock avatar voice, and create a realistic realtime AI avatar through Tavus.
- Includes explicit AI-generated disclosure, likeness-rights confirmation, creation progress, Start Session, End Session, mute/unmute, microphone state, loading states, live avatar video/audio, speaking/listening state, and realtime transcript.
- The selfie is temporarily served through an unguessable, expiring CallFocus media URL for Tavus image-to-avatar training. It is removed after completion when possible.
- Tavus credentials remain server-side.

## Cloudflare secret required
Add this secret before the feature can create avatars or start sessions:

`TAVUS_API_KEY`

Optional server variables:
- `TAVUS_PAL_ID` — reuse your own Tavus PAL instead of the CallFocus-managed PAL.
- `TAVUS_DEFAULT_FACE_ID` — default face used when CallFocus creates its shared PAL.

## Provider billing
Live AI Avatar uses Tavus CVI and is billed separately from OpenAI API usage and from CallFocus credits in this build. Custom selfie-based faces/replicas may require a Tavus paid developer plan.

## Security/privacy
- Tavus API key is never exposed in browser JavaScript.
- Avatar profile and session routes require a signed-in CallFocus account.
- Selfie upload requires confirmation that the user is the person shown or has the depicted person’s explicit, informed consent.
- Public temporary selfie URLs use high-entropy tokens and expire automatically.
- Avatar sessions are capped at 10 minutes server-side in this version.
