# CallFocus Worker V2

Updated browser + Cloudflare Worker build.

## What changed in V2
- Premium dark-glass UI redesign
- Mobile menu closes when tapping outside
- Recent calls redesigned like reusable conversation threads
- Open a previous call and call again from the same thread
- Caller name now uses the actual saved/manual person name
- New one-off caller fields for unsaved calls
- Improved call screen with:
  - Mute
  - Audio toggle
  - Hold
  - Request end
  - End now
- Server status copy now reads like:
  - Connecting to server
  - Connected to server
  - Disconnected from server
- Better error visibility on failed realtime connection

## Deploy notes
This remains a Cloudflare Workers + static assets project.

Required runtime secret:
- `OPENAI_API_KEY`

## Files
- `index.html`
- `app.css`
- `app.js`
- `_worker.js`
- `wrangler.jsonc`
- `.assetsignore`
