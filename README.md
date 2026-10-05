# CallFocus V8 Update

This is an incremental update for the current V7.1 repository.

## Upload these files to the existing GitHub repository
- `index.html` (replace current)
- `v8-patch.js` (new)
- `v8-patch.css` (new)

Do not delete the existing `app.js`, `app.css`, `_worker.js`, `admin.js`, `wrangler.jsonc`, icons, manifest, or service worker.

## V8 changes
- Realtime connection happens first; the conversation does not begin automatically.
- A prominent **Start Call** button appears after the server is connected.
- Microphone audio is held until Start Call is pressed.
- Call timer starts only when Start Call is pressed.
- New call setup now includes an optional Call Opening selector:
  - Smart natural greeting
  - Hey + caller name
  - Time-based greeting + caller name
  - Custom opening
  - Let the other person speak first
- Opening uses Caller B's selected timezone for morning/afternoon/evening.
- Explicitly blocks AI/service-style openings such as “hey dear” or “it’s nice to connect with you”.
- Adds stronger natural-call delivery rules: slower pacing, less scripted agenda dumping, appropriate laughter/reactions, shorter turns, and more human conversational rhythm.
