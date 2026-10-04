# CallFocus Worker V7

V7 turns `/admin` into a true global control center instead of a device-only settings page.

## New in V7
- Global Server Online / Offline switch
- Custom customer-facing maintenance message
- Global male/female Realtime voice selection
- Voice preview buttons for every supported CallFocus Realtime voice
- Global natural-speech style instructions to reduce chatbot-like delivery
- Global master call rules and opening behavior
- Admin settings are enforced server-side for every new call
- Customer pages automatically reflect the selected male/female voices
- Server-off mode is enforced by the Worker, not just hidden in the UI

## Required Cloudflare runtime secrets
Existing:
- `OPENAI_API_KEY`

Add:
- `CALLFOCUS_ADMIN_PASSCODE`

Choose the private passcode you want to use at `/admin` and store it as a Secret.

## Required Cloudflare KV binding
Create one Workers KV namespace, for example:
- Namespace name: `callfocus-config`

Bind it to this Worker using the binding/variable name:
- `CALLFOCUS_CONFIG`

This KV namespace stores the global admin configuration. Without the binding, customer calls still use safe defaults, but the admin panel cannot persist global changes.

## Admin URL
- `https://YOUR-DOMAIN/admin`
- Current workers.dev example: `https://callfocus.baronbetterhelp.workers.dev/admin`

## Voice notes
Realtime voice choices in this build:
- alloy
- ash
- ballad
- coral
- echo
- sage
- shimmer
- verse
- marin
- cedar

OpenAI currently recommends `marin` or `cedar` for best Realtime voice quality.

## Important
Voice previews use the OpenAI speech endpoint and consume a small amount of API credit.
