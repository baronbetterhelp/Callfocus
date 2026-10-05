# CallFocus V10.9 — Voice Note Studio

V10.9 adds an account-backed Voice Note Studio to the customer site.

## New
- Replaces the Home hero's secondary action with **Create a voice note**.
- New chat-style Voice Note Studio page.
- Customers choose only Male or Female voice, type an intent/prompt, and tap Generate.
- The server uses the current Admin speech style, master rules, opening behavior, pace, and admin-selected male/female voice.
- Natural wording is prepared first, then rendered as MP3 speech.
- Generated result has a premium **Play voice note** control.
- Voice note history appears below in a timeline patterned after call history.
- Voice-note audio is stored locally in IndexedDB on the current device; metadata is stored with the current local CallFocus account.
- Clear AI-generated voice disclosure is shown in the Voice Note Studio.

## Existing Cloudflare configuration preserved
- OPENAI_API_KEY secret
- CALLFOCUS_ADMIN_PASSCODE secret
- CALLFOCUS_CONFIG KV binding in wrangler.jsonc

## Update from V10.8
Replace/add:
- `_worker.js`
- `index.html`
- `v10.9-patch.css`
- `v10.9-patch.js`
