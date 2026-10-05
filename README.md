CallFocus V11.17 — Server-backed Accounts

What changed
- Customer accounts now live in the existing Cloudflare Workers KV binding CALLFOCUS_CONFIG instead of being tied only to one browser domain.
- Sign up, sign in, sign out, session restore and account deletion now use secure server endpoints.
- Passwords are stored as salted PBKDF2-SHA256 hashes, never plaintext.
- Caller profiles, Recent Calls, profile data, wallet/credit state and voice-note metadata sync to the server account.
- The same account can now work on callfocus.link, www.callfocus.link and other devices/browsers after sign-in.
- Added a one-time Workers.dev migration flow so an existing local account can be transferred to callfocus.link without losing callers or call threads.
- No new Cloudflare binding is required. The existing CALLFOCUS_CONFIG KV namespace is reused with separate customer key prefixes.

One-time migration for the existing account
1. Deploy V11.17 first.
2. Open https://callfocus.link and choose Sign in.
3. Tap “Transfer my old Workers.dev account”.
4. CallFocus opens the old workers.dev address.
5. If you are still signed in there, transfer happens automatically. If not, sign in once using the old account password.
6. CallFocus redirects back to https://callfocus.link and signs the migrated account in.

Important
- Do not delete the old Workers.dev account/data before migration is complete.
- Keep the CALLFOCUS_CONFIG binding attached to Production deployments.
- This update does not require a new KV namespace.

Files changed from V11.16
- _worker.js
- index.html
- v11.17-patch.js
- v11.17-patch.css
