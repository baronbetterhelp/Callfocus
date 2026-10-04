# CallFocus Worker V5

Cloudflare Workers + Static Assets build.

## V5 changes

- API quota/credit errors are no longer exposed to customers. The call screen shows: `Server not active. Try again soon.`
- Reworked full-screen call experience for Add to Home Screen / PWA use.
- Added PWA manifest, iOS web-app meta tags, placeholder app icons and a lightweight service worker.
- Call controls now use a 2 x 3 phone-style dial layout:
  - Speaker
  - Mute
  - Hold
  - More
  - Request end
  - End now
- More opens call details instead of showing a keypad.
- Call minimize now works and creates a small active-call bar that can be restored.
- New-call locations have U.S. city autocomplete. Selecting a city automatically selects its matching IANA time zone.
- New calls default to random major U.S. locations instead of Nigeria.
- Location/timezone spacing tightened in the new-call form.
- Account password storage upgraded to salted PBKDF2-SHA256 with legacy SHA-256 account migration on successful sign-in.
- Existing account data/storage keys remain compatible with V4.

## Deployment

Replace the files in your existing CallFocus GitHub repository with the contents of this folder and commit to `main`.
Cloudflare should automatically redeploy.

Keep the existing Cloudflare runtime secret:

`OPENAI_API_KEY`

No API key belongs in GitHub.

## Routes

- `/` customer site
- `/admin` admin portal

## PWA

The customer site includes `manifest.webmanifest`, iOS standalone meta tags, install icons and `sw.js`. When added to the iPhone Home Screen it launches as a standalone web app using the maximum screen area iOS permits.

The current letter-C app icon is a temporary placeholder until the final CallFocus logo is supplied.
