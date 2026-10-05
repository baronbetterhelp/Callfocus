# CallFocus V11.6 Update

Fixes the Unlimited Credit Users control.

What changed:
- Add unlimited user now saves immediately to Cloudflare KV in one tap.
- Remove also applies immediately.
- No separate Save global settings step is required for unlimited access.
- Admin JS is cache-busted to prevent Safari from running an older admin script.
- Signed-in customer pages re-check unlimited entitlement on load, focus, visibility return, and every 15 seconds while open.

Update these files from V11.5:
- _worker.js
- admin.html
- admin.js
- index.html
- v11.6-patch.js

Your existing CALLFOCUS_CONFIG KV namespace, OpenAI key, admin passcode, saved global rules, theme, callers, and credit system remain unchanged.
