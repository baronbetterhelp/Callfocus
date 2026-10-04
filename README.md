# CallFocus V1 - Cloudflare Workers Build

This build is configured for Cloudflare Workers + Static Assets.

## GitHub root files
- `index.html`
- `app.css`
- `app.js`
- `_worker.js`
- `wrangler.jsonc`
- `.assetsignore`
- `README.md`

## Cloudflare build settings
- Build command: leave blank
- Deploy command: `npx wrangler deploy`
- Preview command: `npx wrangler preview` can remain as shown by Cloudflare; it is not required for production deployment.

## Runtime secret
After the Worker is created, add this runtime secret in Cloudflare:

`OPENAI_API_KEY`

Do not put the API key in GitHub or client-side JavaScript.

## Architecture
- Static website files are served using Cloudflare Workers Static Assets.
- `_worker.js` handles `/api/session` and forwards the WebRTC SDP session request to OpenAI Realtime.
- Other requests are served through the `ASSETS` binding.
