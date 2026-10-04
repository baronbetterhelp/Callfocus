# CallFocus V1 - Updated

This is the updated browser build of CallFocus with preset conversation dynamics and a root-level Cloudflare `_worker.js` for easier GitHub upload from mobile.

## New dynamics feature

Users can either add their own detailed conversation dynamics (recommended) or choose a preset fallback:

- Romantic Call
- Dating / Getting to Know Each Other
- Friendship Call
- Business Call
- Professional / Client Call
- Family Call
- Supportive / Check-in Call
- Reconnecting Call
- Casual Call
- Formal Call

The UI warns users that custom dynamics provide the best call experience. The selected preset is converted into internal call instructions before the Realtime session starts.

## Important deployment structure

All files in this folder belong at the ROOT of the GitHub repository:

- `index.html`
- `app.css`
- `app.js`
- `_worker.js`
- `README.md`
- `.gitignore`

Do not use the old root `session.js`. The updated build uses Cloudflare Pages Advanced Mode through `_worker.js`, which handles `/api/session` and forwards all other requests to the static site.

## Deploy on Cloudflare Pages

1. Upload the files above to the root of the GitHub repository.
2. In Cloudflare, create/connect a Pages project using GitHub.
3. Framework preset: None.
4. Build command: leave blank.
5. Build output directory: repository root / `.` if Cloudflare requires a value.
6. Deploy.
7. In the Pages project settings, add the secret `OPENAI_API_KEY` with your OpenAI API project key.
8. Redeploy after adding the secret.

The API key stays server-side in `_worker.js` and is never placed in `app.js`.

## V1 storage limitation

Caller profiles, admin settings and call history still use browser `localStorage` for this first test build. Production should move them into Supabase with authentication and separate customer/admin permissions.
